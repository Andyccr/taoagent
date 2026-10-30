import { piText } from './pi.ts'
import { type Model, type PromptMessage } from './store.ts'
import { isGoUrl } from './opencode-go.ts'

const createAgent = {
  name: 'create_agent', description: '申请创建有独立身份、记忆和私聊的 Bot，必须等待用户逐项批准；未批准不能声称创建完成。继承账户 API，不填 Key。joinGroup=true 时批准后加入当前群。先查已有成员避免重复。',
  parameters: { type: 'object', properties: { name: { type: 'string', description: '清晰的助手名称' }, rules: { type: 'string', description: '身份、能力与行为规则' }, joinGroup: { type: 'boolean', description: '是否加入当前群聊' } }, required: ['name', 'rules'] },
}
export const agentTools = [createAgent, {
  name: 'list_agents', description: '查找账户中的 Agent，只返回名字和 ID，不读取任何私聊或凭据。',
  parameters: { type: 'object', properties: {} },
}, {
  name: 'consult_agent', description: '实际向另一个 Agent 请求协作并取得其回答。只传必要的问题和上下文，不传 API Key 或无关的私聊。不能请求自己或递归转交任务。',
  parameters: { type: 'object', properties: { agentId: { type: 'string' }, question: { type: 'string' } }, required: ['agentId', 'question'] },
}, {
  name: 'create_group', description: '创建包含自己及其他 Agent 的群聊。先通过 list_agents 查找成员 ID；创建结果会显示给用户，不自动向新群转发私聊。',
  parameters: { type: 'object', properties: { name: { type: 'string',description:'可留空，自动取显示名称' }, purpose:{type:'string',description:'可留空，无需预设主题或任务'}, discussionMode:{type:'string',enum:['open','brainstorm','directed'],description:'open自由讨论，brainstorm无主题头脑风暴，directed定向协作'},memberIds: { type: 'array', items: { type: 'string' } } }, required: ['memberIds'] },
}, {
  name: 'remember', description: '追加一条确定事实。群聊默认写本群共享记忆，私聊默认写自己的长期记忆。scope=member 写自己在本群的工作笔记，scope=agent 仅用于明确的长期个人偏好。保留备份与来源，不覆盖旧事实。',
  parameters: { type: 'object', properties: { note: { type: 'string' }, scope: { type: 'string', enum: ['agent', 'group', 'member'] }, category: { type: 'string', enum: ['fact', 'decision', 'lesson', 'question'], description: '群体认识的类型：事实、决定、经验或待验证问题。群体模式下此工具提出候选，需独立复核才采用。' }, evidenceIds: { type: 'array', items: { type: 'string' }, description: '依据的本群公开消息 ID；不能引用其他群或私聊。' }, replacesId: { type: 'string', description: '明确纠正已存事实时，先 search_memory 取得该范围的 memoryId，再填写此 ID；原记录保留。' } }, required: ['note'] },
}, {
  name: 'review_memory', description: '在群体讨论模式中独立复核已共享的认识，说明支持依据或具体质疑。复核会更新认识的状态，全部讨论成果在复核前已经共享。另一成员支持且无未解决质疑可标为当前采用，用户确认优先。先从 search_memory 或共同认识列表取得最新 updatedAt 作为 expected。',
  parameters: { type: 'object', properties: { memoryId: { type: 'string' }, expected: { type: 'string' }, verdict: { type: 'string', enum: ['support', 'challenge'] }, reason: { type: 'string' } }, required: ['memoryId', 'expected', 'verdict', 'reason'] },
}, {
  name: 'search_history', description: '检索本次私聊或本群的完整历史，找回上下文窗口之外的原文。不能查询其他群或其他人的私聊。返回消息 ID、作者、时间和原文。',
  parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
}, {
  name: 'search_memory', description: '检索自己有权读取的记忆全文：共享记忆、自己的长期记忆，以及本群记忆和自己在本群的笔记。不读取其他群或其他 Agent 的私有记忆。',
  parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
}]

export async function* streamModel(model: Model, messages: PromptMessage[], signal: AbortSignal, _tools?: undefined, request?: { sessionId: string }): AsyncGenerator<string> {
  yield* piText(model,messages,signal,request?.sessionId || 'probe-'+model.id)
}
