import { Agent, type AgentTool, type StreamFn } from '@earendil-works/pi-agent-core'
import { Type, normalizeContext, lazyStream, type Api, type Model as PiModel, type Message as PiMessage } from '@earendil-works/pi-ai'
import { opencodeGoProvider } from '@earendil-works/pi-ai/providers/opencode-go'
import { streamSimple as completions } from '@earendil-works/pi-ai/api/openai-completions'
import { streamSimple as responses } from '@earendil-works/pi-ai/api/openai-responses'
import { streamSimple as anthropic } from '@earendil-works/pi-ai/api/anthropic-messages'
import { streamSimple as gemini } from '@earendil-works/pi-ai/api/google-generative-ai'
import { HttpError, object, type Model, type PromptMessage } from './store.ts'
import { toolFailed } from './execution.ts'

const go = opencodeGoProvider()
export function piModel(model: Model): PiModel<Api> {
  const catalog = model.provider === 'opencode-go' ? go.getModels().find(item => item.id === model.model) : undefined
  return { ...(catalog || { id: model.model, name: model.name, provider: 'taoagent', api: ({openai:'openai-completions',responses:'openai-responses',anthropic:'anthropic-messages',gemini:'google-generative-ai'} as const)[model.protocol], reasoning: false, input: ['text'], contextWindow: Math.max(4096, model.contextChars), cost: {input:0,output:0,cacheRead:0,cacheWrite:0} }), baseUrl: model.baseUrl, maxTokens: model.maxOutputTokens, ...(model.protocol === 'openai' ? { compat: { ...(catalog?.compat || {}), maxTokensField: model.tokenParameter || 'max_tokens' } } : {}) }
}
export function piStream(model: Model, sessionId: string): StreamFn {
  const stream: StreamFn = (resolved, context, options) => {
    const settings = { ...options, apiKey: model.apiKey || 'local', maxTokens: model.maxOutputTokens, temperature: model.temperature, sessionId, headers: { ...options?.headers, 'User-Agent': 'Taoagent/3.0', ...(model.provider === 'opencode-go' ? { 'x-opencode-session': sessionId } : {}) }, timeoutMs: 180000, maxRetries: 0 }
    if (model.provider === 'opencode-go') return go.streamSimple(resolved as PiModel<'openai-completions'|'openai-responses'|'anthropic-messages'|'google-generative-ai'>, context, settings)
    if (resolved.api === 'openai-responses') return responses(resolved as PiModel<'openai-responses'>, context, settings)
    if (resolved.api === 'anthropic-messages') return anthropic(resolved as PiModel<'anthropic-messages'>, context, settings)
    if (resolved.api === 'google-generative-ai') return gemini(resolved as PiModel<'google-generative-ai'>, context, settings)
    return completions(resolved as PiModel<'openai-completions'>, context, settings)
  }
  return stream
}
export interface ProviderUsage {input:number;output:number;cacheRead:number;cacheWrite:number;totalTokens:number}
export type UsageReporter=(usage:ProviderUsage)=>void
export interface ToolDefinition { name: string; description: string; parameters: Record<string, unknown> }
export function serializeToolResult(result:unknown,limit:number):string {
  const serialized=JSON.stringify(result??null)
  if(serialized.length<=limit)return serialized
  if(result&&typeof result==='object'&&!Array.isArray(result)){
    const value=result as Record<string,unknown>
    if(typeof value.content==='string'&&Number.isSafeInteger(value.offset)&&typeof value.totalChars==='number'){
      // Keep the cursor and full-file hash intact even for small model contexts.
      // JSON escaping can expand content, so measure the actual serialized page.
      const offset=value.offset as number,content=value.content,totalChars=value.totalChars
      const page=(length:number)=>JSON.stringify({path:value.path,sha256:value.sha256,runId:value.runId,status:value.status,messageId:value.messageId,author:value.author,content:content.slice(0,length),offset,nextOffset:offset+length<totalChars?offset+length:null,totalChars})
      let low=0,high=content.length
      while(low<high){const middle=Math.ceil((low+high)/2);if(page(middle).length<=limit)low=middle;else high=middle-1}
      if(low>0)return page(low)
    }
  }
  return JSON.stringify({excerpt:serialized.slice(0,limit),excerpted:true,notice:'结果已节选，完整操作回执保存在本机审批记录'})
}
export async function runPi(model: Model, messages: PromptMessage[], signal: AbortSignal, sessionId: string, definitions: ToolDefinition[], execute: (name: string, args: Record<string, unknown>, callId: string) => Promise<unknown>, delta: (text: string) => void, activity: (name: string, state: string) => void, consume: (reservedTokens:number) => void, checkpoint: (messages: PiMessage[])=>void = ()=>{}, reportUsage:UsageReporter = ()=>{}) {
  const tools: AgentTool[] = definitions.map(definition => ({ ...definition, label: definition.name, parameters: Type.Unsafe<Record<string, unknown>>(definition.parameters), execute: async (callId, args) => {
    try { const result = await execute(definition.name, object(args), callId);const limit=Math.max(1000,Math.min(12000,Math.floor(model.contextChars/4)));return {content:[{type:'text',text:serializeToolResult(result,limit)}],details:undefined,isError:toolFailed(result)} }
    catch (error) { return {content:[{type:'text',text:JSON.stringify({error:error instanceof HttpError ? error.message : '工具执行失败，未确认成功'})}],details:undefined,isError:true} }
  }}))
  const resolved = piModel(model), now = Date.now()
  const history: PiMessage[] = messages.filter(message => message.role !== 'system').map(message => message.role === 'user' ? {role:'user',content:message.content,timestamp:now} : {role:'assistant',content:[{type:'text',text:message.content}],api:resolved.api,provider:resolved.provider,model:resolved.id,stopReason:'stop',timestamp:now,usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}})
  const agent = new Agent({initialState:{systemPrompt:messages.filter(message => message.role === 'system').map(message => message.content).join('\n\n'),model:resolved,tools,messages:[],thinkingLevel:'off'}, streamFn:(...args) => lazyStream(args[0],async()=>{ consume(Buffer.byteLength(JSON.stringify(args[1]),'utf8')+model.maxOutputTokens); return await piStream(model,sessionId)(...args) }),toolExecution:'sequential',sessionId})
  let calls = 0
  agent.beforeToolCall = async () => {
    if (signal.aborted || ++calls > 24) return {block:true,terminate:true,reason:signal.aborted?'用户暂停':'本次工具调用已达上限'}
    return undefined
  }
  agent.subscribe(value => {
    if (value.type === 'message_update' && value.assistantMessageEvent.type === 'text_delta') delta(value.assistantMessageEvent.delta)
    if (value.type === 'tool_execution_start') activity(value.toolName, 'running')
    if (value.type === 'tool_execution_end') activity(value.toolName, value.isError ? 'failed' : 'complete')
    if(value.type==='message_end'){if(value.message.role==='assistant')reportUsage(value.message.usage);checkpoint(agent.state.messages as PiMessage[])}
  })
  const stop = () => agent.abort(); signal.addEventListener('abort',stop,{once:true})
  try {
    if (signal.aborted) throw new HttpError(499,'已暂停')
    await agent.prompt(history)
    if(calls>24)throw new HttpError(400,'本成员工具调用已达24次上限，请缩小任务后继续')
    if (signal.aborted) throw new HttpError(499,'已暂停')
    const last = [...agent.state.messages].reverse().find(message => message.role === 'assistant')
    if(last?.role==='assistant'&&last.stopReason==='length')throw new HttpError(502,'模型输出达到上限，回复未完成；请增加此成员的输出预算或缩小问题后继续，已执行工具保留')
    if (agent.state.errorMessage || last?.role === 'assistant' && ['error','aborted'].includes(last.stopReason)) throw new HttpError(502,'模型回复未完成，请检查账户 Key、模型权限和网络后继续；已执行的工具结果已保存')
  } finally { signal.removeEventListener('abort',stop) }
}

export async function* piText(model: Model, messages: PromptMessage[], signal: AbortSignal, sessionId: string, reportUsage:UsageReporter=()=>{}) {
  const resolved = piModel(model)
  const context = normalizeContext({systemPrompt:messages.filter(message=>message.role==='system').map(message=>message.content).join('\n'),messages:messages.filter(message=>message.role!=='system').map(message=>({role:'user' as const,content:`${message.role}: ${message.content}`,timestamp:Date.now()}))})
  for await (const value of await piStream(model,sessionId)(resolved,context,{signal})) {
    if(value.type==='done')reportUsage(value.message.usage)
    if(value.type==='error')reportUsage(value.error.usage)
    if (value.type === 'text_delta') yield value.delta
    if (value.type === 'error') throw new HttpError(502,'模型连接或生成失败，请检查 Key、模型权限、协议与网络')
    if (value.type === 'done' && value.reason === 'length') throw new HttpError(502,'模型输出达到上限，回复未完成')
  }
}
