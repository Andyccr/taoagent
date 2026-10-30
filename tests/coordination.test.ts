import { runPi } from '../pi.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { createApp } from '../app.ts'
import { Store, atomic } from '../store.ts'
import { goProfile } from '../opencode-go.ts'
import { streamModel, agentTools } from '../models.ts'
import { summarize } from '../context.ts'

function temp() { const base = path.resolve('.test-tmp'); fs.mkdirSync(base, { recursive: true }); return fs.mkdtempSync(path.join(base, 'v23-')) }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
async function api(base: string, route: string, method = 'GET', value?: unknown) { return fetch(base + route, { method, ...(value === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }) }) }

test('Go shared key stays out of API responses and cannot be redirected to another host', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  try {
    const base = await listen(app.server)
    const response = await api(base, '/api/providers/opencode-go', 'PUT', { apiKey: 'PRIVATE_GO_KEY', modelIds: ['glm-5.3', 'gpt-6-luna', 'qwen3.8-max'], makeDefault: true })
    assert.equal(response.status, 200); const models = await response.json() as { id: string; hasKey: boolean; apiKey: string }[]
    assert(models.every(model => model.hasKey && !model.apiKey)); assert.equal(models.length, 3)
    assert(!JSON.stringify(app.store.models()).includes('PRIVATE_GO_KEY'))
    assert.equal(app.store.resolveModel('main').apiKey, 'PRIVATE_GO_KEY')
    assert(!(await (await api(base, '/api/state')).text()).includes('PRIVATE_GO_KEY'))
    assert.throws(() => app.store.saveModel({ id: models[0].id, baseUrl: 'https://example.com/v1' }), /官方/)
    assert.equal(goProfile('opencode-go/gpt-6-luna').protocol, 'responses'); assert.equal(goProfile('qwen3.8-max').protocol, 'anthropic')
  } finally { await close(app.server); fs.rmSync(root, { recursive: true, force: true }) }
})

test('group goals, memory scopes, stable collaboration and current request remain isolated', () => {
  const root = temp(), store = new Store(root)
  try {
    const model = store.saveModel({ name: 'mock', model: 'mock', baseUrl: 'http://127.0.0.1:1', contextChars: 5000 })
    store.saveAgent({ id: 'reviewer', name: '审阅员' }, '审查', 'REVIEWER_PRIVATE')
    const group = store.saveGroup('工作室', ['main', 'reviewer'], undefined, { purpose: '发布计划', memberRoles: { main: '整合', reviewer: '核验' }, replyMode: 'coordinated', coordinatorId: 'reviewer' })
    const other = store.saveGroup('别的群', ['main', 'reviewer'])
    store.updateMemory(group.id, 'main', 'group', 'GROUP_FACT', 'event1')
    store.updateMemory(group.id, 'main', 'member', 'MAIN_NOTE', 'event2')
    store.updateMemory(group.id, 'reviewer', 'member', 'REVIEWER_NOTE', 'event3')
    const dm = store.directSession('reviewer'); store.append(dm.id, 'user', 'PERSONAL_DM')
    const request = store.append(group.id, 'user', 'CURRENT_TASK')
    for (let i = 0; i < 10; i++) store.append(group.id, 'assistant', 'LONG_RESPONSE '.repeat(40), 'complete', { agentId: 'reviewer', agentName: '审阅员' })
    const context = store.context(group.id, model, undefined, 'main'), serialized = JSON.stringify(context)
    assert(context.chars <= 5000); assert(context.includedMessageIds.includes(request.id)); assert(context.includedMessageIds.length > 1); assert(context.omitted > 0)
    assert(serialized.includes('CURRENT_TASK')); assert(serialized.includes('GROUP_FACT')); assert(serialized.includes('MAIN_NOTE')); assert(serialized.includes('核验'))
    assert(!serialized.includes('REVIEWER_NOTE')); assert(!serialized.includes('REVIEWER_PRIVATE')); assert(!serialized.includes('PERSONAL_DM'))
    assert(!JSON.stringify(store.context(other.id, model, 'hello', 'main')).includes('GROUP_FACT'))
    assert.equal(store.searchMemory(group.id, 'main', 'REVIEWER_NOTE').length, 0)
    const consult = store.consultSession('main', 'reviewer', group.id); store.append(consult.id, 'user', 'PRIOR_CONSULT')
    assert.equal(store.consultSession('main', 'reviewer', group.id).id, consult.id)
    assert.notEqual(store.consultSession('main', 'reviewer', other.id).id, consult.id)
    assert.equal(store.directSession('reviewer').id, dm.id)
    const consulted = JSON.stringify(store.context(consult.id, model, 'check', 'reviewer'))
    assert(consulted.includes('GROUP_FACT')); assert(consulted.includes('REVIEWER_NOTE')); assert(!consulted.includes('MAIN_NOTE')); assert(!consulted.includes('PERSONAL_DM'))
    store.saveAgent({ id: 'third', name: '第三位' }, 'help', '')
    assert.equal(store.saveGroup('工作室', ['main', 'third'], group.id).coordinatorId, 'main')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('Pi Responses loop preserves encrypted reasoning and exact call IDs',async()=>{
 const root=temp(),store=new Store(root),bodies:Record<string,unknown>[]=[];
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;bodies.push(JSON.parse(raw));res.writeHead(200,{'Content-Type':'text/event-stream'});const events=bodies.length===1?[
 {type:'response.output_item.added',output_index:0,item:{type:'reasoning',id:'r1',summary:[]}},
 {type:'response.output_item.done',output_index:0,item:{type:'reasoning',id:'r1',encrypted_content:'opaque',summary:[]}},
 {type:'response.output_item.added',output_index:1,item:{type:'function_call',id:'fc_1',call_id:'exact-call',name:'list_agents',arguments:''}},
 {type:'response.function_call_arguments.delta',output_index:1,delta:'{}'},
 {type:'response.output_item.done',output_index:1,item:{type:'function_call',id:'fc_1',call_id:'exact-call',name:'list_agents',arguments:'{}'}},
 ]:[{type:'response.output_item.added',output_index:0,item:{type:'message',id:'msg1',role:'assistant',content:[]}},{type:'response.output_text.delta',output_index:0,delta:'完成'},{type:'response.output_item.done',output_index:0,item:{type:'message',id:'msg1',role:'assistant',content:[{type:'output_text',text:'完成',annotations:[]}]}}];res.end([...events,{type:'response.completed',response:{status:'completed',output:[],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}}].map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''))})
 try{const model=store.saveModel({name:'mock',model:'mock',protocol:'responses',baseUrl:await listen(upstream)});let answer='';await runPi(model,[{role:'user',content:'查看同事'}],new AbortController().signal,'test',agentTools,async()=>[{id:'main'}],text=>{answer+=text},()=>{},()=>{});assert.equal(answer,'完成');assert.equal(bodies.length,2);const replay=JSON.stringify(bodies[1]);assert(replay.includes('opaque'));assert(replay.includes('exact-call'));assert(replay.includes('function_call_output'));assert.equal(bodies[1].store,false)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('summary checkpoints preserve originals; failure leaves previous summary intact; history pages have no gaps', async () => {
  const root = temp(), app = createApp(root, {seed:false}); let fail = false
  const upstream = http.createServer(async (req, res) => { for await (const chunk of req) void chunk; if (fail) { res.writeHead(500); res.end(); return }; res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: {"choices":[{"delta":{"content":"旧事实摘要"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n') })
  try {
    const url = await listen(upstream), base = await listen(app.server)
    const model = app.store.saveModel({ name: 'mock', model: 'mock', baseUrl: url })
    const dm = app.store.directSession('main')
    for (let i = 0; i < 115; i++) app.store.append(dm.id, i % 2 ? 'assistant' : 'user', `RECORD_${i}`)
    const before = app.store.text('chats', dm.id, 'messages.jsonl')
    const summary = await summarize(app.store, dm.id, 'main', new AbortController().signal)
    assert.equal(summary.sourceIds.length, 109); assert.equal(app.store.text('chats', dm.id, 'messages.jsonl'), before)
    assert(JSON.stringify(app.store.context(dm.id, model, '继续')).includes('旧事实摘要'))
    for (let i = 0; i < 8; i++) app.store.append(dm.id, 'user', 'MORE_' + i)
    fail = true; await assert.rejects(summarize(app.store, dm.id, 'main', new AbortController().signal)); assert.deepEqual(app.store.summary(dm.id), summary)
    const latest = await (await api(base, `/api/chats/${dm.id}`)).json() as { messages: { id: string }[]; hasOlder: boolean }
    const earlier = await (await api(base, `/api/chats/${dm.id}?before=${latest.messages[0].id}`)).json() as typeof latest
    assert.equal(latest.messages.length, 100); assert(latest.hasOlder); assert.equal(earlier.messages.length, 23); assert.equal(new Set([...earlier.messages, ...latest.messages].map(message => message.id)).size, 123)
    assert.equal((await api(base, `/api/chats/${dm.id}/search?q=RECORD_0`)).status, 200)
    atomic(app.store.file('chats', dm.id, 'context.md'), 'manual')
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('coordinated groups call only leader unless @all; chat reasoning is replayed but never shown', async () => {
  const root = temp(), app = createApp(root, {seed:false}); const requested: { model: string; messages: { role: string; reasoning_content?: string }[] }[] = []
  const upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk; const body = JSON.parse(raw); requested.push(body)
    const toolRound = body.messages.some((message: { role: string }) => message.role === 'tool')
    const event = body.model === 'leader' && !toolRound ? { choices: [{ delta: { reasoning_content: 'HIDDEN_REASONING', tool_calls: [{ index: 0, id: 'lookup', function: { name: 'search_history', arguments: '{"query":"TASK"}' } }] }, finish_reason: 'tool_calls' }] } : { choices: [{ delta: { content: '已核实' }, finish_reason: 'stop' }] }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: ' + JSON.stringify(event) + '\n\ndata: [DONE]\n\n')
  })
  try {
    const url = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'leader', model: 'leader', baseUrl: url }); const member = app.store.saveModel({ name: 'member', model: 'member', baseUrl: url })
    app.store.saveAgent({ id: 'reviewer', name: '审阅员', modelId: member.id }, 'review', '')
    const group = app.store.saveGroup('协作', ['main', 'reviewer'], undefined, { replyMode: 'coordinated', coordinatorId: 'main' })
    let response = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: 'TASK' }); const result = await response.text()
    assert(!result.includes('HIDDEN_REASONING')); assert.deepEqual(requested.map(body => body.model), ['leader', 'leader'])
    assert(requested[1].messages.some(message => message.reasoning_content === 'HIDDEN_REASONING'))
    requested.length = 0; response = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '@全体 TASK' }); await response.text()
    assert(requested.some(body => body.model === 'member'))
    assert(!app.store.text('chats', group.id, 'messages.jsonl').includes('HIDDEN_REASONING'))
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('Go adapter uses honest client identity and stable conversation headers across tool rounds', async () => {
  const root = temp(), store = new Store(root), originalFetch = globalThis.fetch
  const headers: Headers[] = []; let rounds = 0
  globalThis.fetch = async (_input, init) => { headers.push(new Headers(init?.headers || (_input instanceof Request ? _input.headers : undefined))); rounds++; return new Response('data: {"choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } }) }
  try {
    const model = store.saveGo('PRIVATE_GO_KEY', ['glm-5.3'])[0]
    for (let i = 0; i < 2; i++) for await (const chunk of streamModel(store.withCredentials(model), [{role:'user',content:'hello'}], new AbortController().signal, undefined, {sessionId:'stable-group:main'})) assert.equal(chunk,'OK')
    assert.equal(rounds, 2); assert(headers.every(header => header.get('x-opencode-session') === 'stable-group:main'))
    assert(headers.every(header => header.get('user-agent') === 'Taoagent/3.0')); assert(headers.every(header => header.get('authorization') === 'Bearer PRIVATE_GO_KEY'))
  } finally { globalThis.fetch = originalFetch; fs.rmSync(root,{recursive:true,force:true}) }
})
