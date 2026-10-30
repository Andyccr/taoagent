import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { createApp } from '../app.ts'
import { Store } from '../store.ts'
import { actions,decide } from '../execution.ts'

function temp() { const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.test-tmp'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'agents-')) }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
async function api(base: string, route: string, method = 'GET', body?: unknown) { return fetch(base + route, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }) }
async function approveCreation(store:Store,key:string,response:Response){const timer=setInterval(()=>{for(const action of actions(store,key).filter(action=>action.name==='create_agent'&&action.status==='pending'))decide(store,key,action.id,true)},10);try{return await response.text()}finally{clearInterval(timer)}}
function sse(res: http.ServerResponse, events: unknown[]) {
  if(events.some(value=>value && typeof value==='object' && 'type' in value && String(value.type).startsWith('content_block'))){
    const first=events.find(value=>value && typeof value==='object' && 'type' in value) as {type:string}
    events=[{type:'message_start',message:{id:'mock',model:'fixture',usage:{input_tokens:1,output_tokens:0}}},...(first?.type==='content_block_delta'?[{type:'content_block_start',index:0,content_block:{type:'text',text:''}}]:[]),...events.filter(value=>!(value && typeof value==='object' && 'type' in value && value.type==='message_stop')),{type:'message_delta',delta:{stop_reason:first?.type==='content_block_start'?'tool_use':'end_turn'},usage:{output_tokens:1}},{type:'message_stop'}].map(value=>value && typeof value==='object' && 'type' in value && value.type==='content_block_delta'?{...value,index:0}:value)
  }
 res.writeHead(200, { 'Content-Type': 'text/event-stream' }); for (const event of events) res.write((event && typeof event==='object' && 'type' in event ? 'event: '+event.type+'\n' : '')+'data: ' + (typeof event === 'string' ? event : JSON.stringify(event)) + '\n\n'); res.end() }
function reply(res: http.ServerResponse, text: string) { sse(res, [{ choices: [{ delta: { content: text }, finish_reason: 'stop' }] }, '[DONE]']) }

test('one persistent thread per Agent; account inheritance changes without editing Agent', () => {
  const root = temp()
  try {
    const store = new Store(root)
    const first = store.saveModel({ name: 'first', model: 'a', baseUrl: 'http://127.0.0.1:1' })
    const second = store.saveModel({ name: 'second', model: 'b', baseUrl: 'http://127.0.0.1:2' })
    store.saveAgent({ id: 'writer', name: 'writer' }, 'rules', '')
    assert(!Object.hasOwn(store.agent('writer'), 'modelId'))
    const thread = store.directSession('writer'); store.append(thread.id, 'user', 'remember')
    assert.equal(store.directSession('writer').id, thread.id); assert.equal(store.resolveModel('writer').id, first.id)
    store.saveAccount(second.id); assert.equal(store.resolveModel('writer').id, second.id)
    store.saveAgent({ ...store.agent('writer'), modelId: first.id }, 'rules', '')
    assert.equal(store.resolveModel('writer').id, first.id)
    const restored = new Store(root); assert.equal(restored.directSession('writer').id, thread.id); assert.equal(restored.messages(thread.id)[0].content, 'remember')
    assert.throws(() => store.saveGroup('bad', ['writer', 'writer']), /2–12/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('API creates Agent without API fields, preserves its override on edits, and returns failed drafts as 400', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  try {
    const base = await listen(app.server)
    const result = await api(base, '/api/agents', 'PUT', { name: '设计师', rules: '设计', memory: '简洁' })
    const agent = await result.json() as { id: string }; assert.equal(result.status, 200)
    assert.equal(app.store.agent(agent.id).modelId, undefined)
    const thread = await (await api(base, `/api/agents/${agent.id}/thread`)).json() as { id: string }
    const invalid = await api(base, `/api/chats/${thread.id}/chat`, 'POST', { content: 'draft remains' })
    assert.equal(invalid.status, 400); assert((await invalid.json() as { error: string }).error.includes('API')); assert.equal(app.store.messages(thread.id).length, 0)
    assert.equal(app.active.size, 0)
    const model = app.store.saveModel({ name: 'test', model: 'test', baseUrl: 'http://127.0.0.1:1' })
    await api(base, `/api/agents/${agent.id}/model`, 'PUT', { modelId: model.id })
    await api(base, '/api/agents', 'PUT', { id: agent.id, name: '设计师新版' })
    assert.equal(app.store.agent(agent.id).modelId, model.id); assert.equal(app.store.text('agents', agent.id, 'RULES.md'), '设计')
    assert.equal((await api(base, '/api/chats', 'POST', {})).status, 404)
  } finally { await close(app.server); fs.rmSync(root, { recursive: true, force: true }) }
})

test('group members use different account APIs, see each other, and cannot see another Agent private chat or memory', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  const requests: { model: string; prompt: string }[] = []
  const upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw) as { model: string; messages: unknown[] }
    requests.push({ model: body.model, prompt: JSON.stringify(body.messages) }); reply(res, body.model === 'a' ? 'A 的公开意见' : 'B 的公开意见')
  })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    const a = app.store.saveModel({ name: 'a', model: 'a', baseUrl: upstreamUrl }), b = app.store.saveModel({ name: 'b', model: 'b', baseUrl: upstreamUrl })
    app.store.saveAgent({ id: 'a', name: '甲' }, '甲规则', '甲私密记忆')
    app.store.saveAgent({ id: 'b', name: '乙', modelId: b.id }, '乙规则', '乙私密记忆')
    const dm = app.store.directSession('a'); app.store.append(dm.id, 'user', '甲的私聊内容')
    const group = app.store.saveGroup('讨论', ['a', 'b'])
    const response = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '@全体 讨论方案' })
    const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line))
    assert.deepEqual(requests.map(item => item.model), ['a', 'b'])
    // Parallel first replies share the initial context; neither invents knowledge of an unfinished peer.
    assert(!requests[1].prompt.includes('A 的公开意见')); assert(requests[1].prompt.includes('甲'))
    assert(!requests[1].prompt.includes('甲私密记忆')); assert(!requests[1].prompt.includes('甲的私聊内容'))
    assert(!requests[0].prompt.includes('乙私密记忆')); assert.equal(app.store.messages(group.id).length, 3)
    assert.deepEqual(app.store.messages(group.id).filter(item=>item.role==='assistant').map(item=>item.agentId).sort(),['a','b'])
    assert.deepEqual(events.filter(item => item.type === 'speaker').map(item => item.name), ['甲', '乙'])
    requests.length = 0
    const only = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '乙单独说', memberIds: ['b'] }); await only.text()
    assert.equal(requests.length, 1); assert.equal(requests[0].model, 'b')
    assert(requests[0].prompt.includes('A 的公开意见'));assert(requests[0].prompt.includes('B 的公开意见'))
    assert.equal(app.store.resolveModel('a').id, a.id)
    const invalid = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: 'outsider', memberIds: ['main'] }); assert.equal(invalid.status, 400)
    const stable = new Store(root); assert.equal(stable.session(group.id).kind, 'group'); assert.equal(stable.groupMembers(group.id).length, 2)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

for (const protocol of ['openai', 'anthropic', 'gemini']) test(`${protocol} native tool creates Agent, returns tool result to model, preserves Gemini signature`, async () => {
  const root = temp(), app = createApp(root, {seed:false}); const bodies: Record<string, unknown>[] = []
  const upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk; bodies.push(JSON.parse(raw) as Record<string, unknown>)
    const args = { name: '研究员', rules: '调查、核实事实', joinGroup: true }
    if (bodies.length === 1) {
      if (protocol === 'openai') sse(res, [
        { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'create_agent', arguments: '{"name":"研究员",' } }] } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"rules":"调查、核实事实","joinGroup":true}' } }] }, finish_reason: 'tool_calls' }] }, '[DONE]',
      ])
      else if (protocol === 'anthropic') sse(res, [
        { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'call_1', name: 'create_agent', input: {} } },
        { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(args) } }, { type: 'message_stop' },
      ])
      else sse(res, [{ candidates: [{ content: { parts: [{ functionCall: { id: 'gemini_call_1', name: 'create_agent', args }, thoughtSignature: 'b3BhcXVlLXNpZ25hdHVyZQ==' }] }, finishReason: 'STOP' }] }])
    } else if (protocol === 'anthropic') sse(res, [{ type: 'content_block_delta', delta: { type: 'text_delta', text: '创建完成' } }, { type: 'message_stop' }])
    else if (protocol === 'gemini') sse(res, [{ candidates: [{ content: { parts: [{ text: '创建完成' }] }, finishReason: 'STOP' }] }])
    else reply(res, '创建完成')
  })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'tools', model: 'fixture', protocol, baseUrl: upstreamUrl })
    const dm = app.store.directSession('main')
    const response = await api(base, `/api/chats/${dm.id}/chat`, 'POST', { content: '创建一个研究员' })
    const events = (await approveCreation(app.store,dm.id,response)).trim().split('\n').map(line => JSON.parse(line))
    assert.equal(events.at(-1).type, 'done'); assert.equal(bodies.length, 2)
    const child = app.store.agents().find(agent => agent.name === '研究员'); assert(child); assert.equal(child.createdBy, 'main'); assert.equal(child.modelId, undefined)
    assert(app.store.text('agents', child.id, 'RULES.md').includes('核实'))
    assert.equal(app.store.directSession(child.id).id, app.store.directSession(child.id).id)
    assert(events.some(item => item.type === 'agent_created')); assert(JSON.stringify(bodies[1]).includes(child.id))
    if (protocol === 'gemini') { assert(JSON.stringify(bodies[1]).includes('b3BhcXVlLXNpZ25hdHVyZQ==')); assert(JSON.stringify(bodies[1]).includes('functionResponse')); assert(JSON.stringify(bodies[1]).includes('create_agent')) }
    const next = new Store(root); assert.equal(next.agent(child.id).createdBy, 'main'); assert(next.messages(dm.id).some(message => message.kind === 'activity'))
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('group continues when one model fails; failed reply is persisted as an activity', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  const upstream = http.createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; if ((JSON.parse(raw) as { model: string }).model === 'bad') { res.writeHead(401); res.end('private credential echo') } else reply(res, '我还能回答') })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    const bad = app.store.saveModel({ name: 'bad', model: 'bad', baseUrl: upstreamUrl }), good = app.store.saveModel({ name: 'good', model: 'good', baseUrl: upstreamUrl })
    app.store.saveAgent({ id: 'bad', name: '失效', modelId: bad.id }, 'rules', ''); app.store.saveAgent({ id: 'good', name: '正常', modelId: good.id }, 'rules', '')
    const group = app.store.saveGroup('失败恢复', ['bad', 'good']), response = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '@全体 hello' })
    const text = await response.text(); assert(text.includes('warning')); assert(text.includes('我还能回答')); assert(!text.includes('private credential echo'))
    assert(app.store.messages(group.id).some(message => message.kind === 'activity' && message.status === 'interrupted'))
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('tool-created Agent joins group for the next turn; repeated tool calls do not duplicate it', async () => {
  const root = temp(), app = createApp(root, {seed:false}); let count = 0
  const upstream = http.createServer(async (req, res) => {
    for await (const chunk of req) { void chunk }
    count++
    if (count <= 2) sse(res, [{ choices: [{ delta: { tool_calls: [{ index: 0, id: `call_${count}`, function: { name: 'create_agent', arguments: JSON.stringify({ name: '新同事', rules: '提供专业意见', joinGroup: true }) } }] }, finish_reason: 'tool_calls' }] }, '[DONE]'])
    else reply(res, '已加入')
  })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'test', model: 'test', baseUrl: upstreamUrl })
    app.store.saveAgent({ id: 'reviewer', name: '审阅员' }, 'review', '')
    const group = app.store.saveGroup('工作群', ['main', 'reviewer'])
    const response = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '创建一个新同事加入群聊', memberIds: ['main'] })
    const events = (await approveCreation(app.store,group.id,response)).trim().split('\n').map(line => JSON.parse(line))
    assert.equal(events.at(-1).type, 'done'); assert.equal(events.filter(item => item.type === 'agent_created').length, 1)
    const children = app.store.agents().filter(agent => agent.name === '新同事'); assert.equal(children.length, 1)
    assert(app.store.groupMembers(group.id).includes(children[0].id)); assert.equal(events.filter(item => item.type === 'speaker').length, 1)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('invalid tool JSON never creates an Agent', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  const upstream = http.createServer(async (req, res) => {
    for await (const chunk of req) { void chunk }
    sse(res, [{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'invalid', function: { name: 'create_agent', arguments: '{"name":' } }] }, finish_reason: 'tool_calls' }] }, '[DONE]'])
  })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'test', model: 'test', baseUrl: upstreamUrl })
    const dm = app.store.directSession('main'), response = await api(base, `/api/chats/${dm.id}/chat`, 'POST', { content: 'create' })
    assert((await response.text()).includes('error')); assert.equal(app.store.agents().length, 1)
    assert.equal(app.active.size, 0)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})
