import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { createApp } from '../app.ts'
import { Store } from '../store.ts'
import { runConversation } from '../runtime.ts'
import { decide, type Action } from '../execution.ts'

function fixture() { fs.mkdirSync('.test-tmp', { recursive: true }); return fs.mkdtempSync(path.resolve('.test-tmp', 'emergence-')) }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
interface Body { model: string; messages: { role: string; content: string }[] }
async function body(req: http.IncomingMessage): Promise<Body> { let raw = ''; for await (const chunk of req) raw += chunk; return JSON.parse(raw) as Body }
function reply(res: http.ServerResponse, text: string, call?: { name: string; args: Record<string, unknown> }) {
  const delta = call ? { tool_calls: [{ index: 0, id: 'call', function: { name: call.name, arguments: JSON.stringify(call.args) } }] } : { content: text }
  res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: ' + JSON.stringify({ choices: [{ delta, finish_reason: call ? 'tool_calls' : 'stop' }] }) + '\n\ndata: [DONE]\n\n')
}

test('three distinct agents exchange a proposal, counterexample and revision through live HTTP', async () => {
  const root = fixture(), app = createApp(root, { seed: false }), deliveries: string[] = []
  const upstream = http.createServer(async (req, res) => {
    const request = await body(req), afterTool = request.messages.some(message => message.role === 'tool')
    if (afterTool) { reply(res, '已将本次判断交给相关成员'); return }
    deliveries.push(request.model)
    if (request.model === 'author' && deliveries.length === 1) reply(res, '', { name: 'send_message', args: { agentId: 'critic', content: '方案：按姓名作为唯一标识，请独立找反例。' } })
    else if (request.model === 'critic') {
      assert(request.messages.at(-1)?.content.includes('按姓名作为唯一标识'))
      assert(!request.messages[0].content.includes('方案：按姓名作为唯一标识'))
      reply(res, '', { name: 'send_message', args: { agentId: 'designer', content: '反例：两个用户可以同名，应区分显示名和稳定 ID。' } })
    } else if (request.model === 'designer') {
      assert(request.messages.at(-1)?.content.includes('两个用户可以同名'))
      reply(res, '', { name: 'send_message', args: { agentId: 'main', content: '修正：使用稳定 ID 关联记录，姓名只用于展示；仍需验证迁移。' } })
    } else {
      assert(request.messages.at(-1)?.content.includes('仍需验证迁移'))
      reply(res, '根据同名反例修正原方案：用稳定 ID，迁移仍待验证。')
    }
  })
  try {
    const url = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'author', model: 'author', baseUrl: url })
    for (const id of ['critic', 'designer']) { const model = app.store.saveModel({ name: id, model: id, baseUrl: url }); app.store.saveAgent({ id, name: id, modelId: model.id }, '独立判断并保留分歧', '') }
    const group = app.store.saveGroup('研究', ['main', 'critic', 'designer'], undefined, { replyMode: 'collective' })
    const response = await fetch(base + `/api/chats/${group.id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '设计用户标识方案' }) })
    assert.equal(response.status, 200)
    const reader = response.body!.getReader(), first = await reader.read()
    assert(!first.done); assert(Buffer.from(first.value).toString().includes('accepted'))
    let stream = ''; for (;;) { const chunk = await reader.read(); if (chunk.done) break; stream += Buffer.from(chunk.value).toString() }
    assert(stream.includes('"type":"done"')); assert(stream.includes('迁移仍待验证'))
    assert.deepEqual(deliveries, ['author', 'critic', 'designer', 'author'])
    const turn = app.store.turns(group.id)[0]
    assert(turn.speakers.every(item => item.status === 'complete'), JSON.stringify(turn.speakers.map(item=>({agentId:item.agentId,status:item.status,error:item.error})))); assert.equal(turn.usage?.modelCalls, 7)
    const memories = app.store.memoryItems(group.id, 'main', 'group')
    assert.equal(memories.filter(item => item.category === 'discussion').length, 4)
    assert(memories.some(item => item.note.includes('迁移仍待验证') && item.status === 'proposed'))
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('new specialist can join, appear in the live roster and receive work in the same turn', async () => {
  const root = fixture(), store = new Store(root); let stage = 0, managerStage=0, childId = '', childReceived = false
  const upstream = http.createServer(async (req, res) => {
    const request = await body(req); stage++
    if(childId&&!request.messages.some(message=>message.role==='tool')){childReceived=request.messages.at(-1)!.content.includes('在本轮收到消息');reply(res,'已收到，独立验证完成');return}
    const step=++managerStage
    if (step === 1) reply(res, '', { name: 'create_agent', args: { name: '新专家', rules: '独立核验', joinGroup: true } })
    else if (step === 2) {
      childId = store.agents().find(agent => agent.name === '新专家')!.id
      reply(res, '', { name: 'list_group_members', args: {} })
    } else if (step === 3) {
      const roster = JSON.parse(request.messages.filter(message => message.role === 'tool').at(-1)!.content) as { id: string; role: string }[]
      assert(roster.some(member => member.id === childId)); assert(roster.some(member => member.id === 'other' && member.role === '评审'))
      reply(res, '', { name: 'send_message', args: { agentId: childId, content: '请验证新专家能在本轮收到消息' } })
    } else reply(res, '已发出')
  })
  try {
    store.saveModel({ name: 'mock', model: 'mock', baseUrl: await listen(upstream) }); store.saveAgent({ id: 'other', name: '同事' }, '评审', '')
    const group = store.saveGroup('团队', ['main', 'other'], undefined, { replyMode: 'collective', memberRoles: { other: '评审' } })
    await runConversation(store, group.id, '邀请专家', '', new AbortController().signal, event => {if(event.type==='approval'&&(event.action as Action).status==='pending')queueMicrotask(()=>decide(store,group.id,(event.action as Action).id,true))})
    assert(childReceived); assert.equal(stage, 5)
    assert.deepEqual(store.turns(group.id)[0].speakers.map(item => item.agentId), ['main', childId])
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('removing a queued recipient while another member runs skips delivery', async () => {
  const root = fixture(), store = new Store(root); let calls = 0, key = ''
  const upstream = http.createServer(async (req, res) => {
    await body(req); calls++; store.saveGroup('团队', ['main', 'remaining'], key); reply(res, '已处理')
  })
  try {
    store.saveModel({ name: 'mock', model: 'mock', baseUrl: await listen(upstream) })
    for (const id of ['leaving', 'remaining']) store.saveAgent({ id, name: id }, '成员', '')
    key = store.saveGroup('团队', ['main', 'leaving', 'remaining']).id
    await runConversation(store, key, '处理', '', new AbortController().signal, () => {}, ['main', 'remaining', 'leaving'])
    assert.equal(calls, 2); assert.equal(store.turns(key)[0].speakers[2].status, 'skipped')
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('retry preserves model budget across a new Store and does not dispatch after exhaustion', async () => {
  const root = fixture(), store = new Store(root); let calls = 0
  const upstream = http.createServer(async (req, res) => { await body(req); calls++; res.writeHead(500); res.end() })
  try {
    store.saveModel({ name: 'mock', model: 'mock', baseUrl: await listen(upstream) })
    const key = store.directSession('main').id
    await assert.rejects(runConversation(store, key, '开始', '', new AbortController().signal, () => {}))
    const turn = store.turns(key)[0]; assert.equal(turn.usage?.modelCalls, 1)
    turn.usage = { modelCalls: 24, toolCalls: 4 }; store.saveTurn(key, turn)
    await assert.rejects(runConversation(new Store(root), key, '', '', new AbortController().signal, () => {}, undefined, { retryTurnId: turn.id }))
    assert.equal(calls, 1); assert.deepEqual(store.turns(key)[0].usage, { modelCalls: 24, toolCalls: 4 })
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('delivery context keeps the entire event within budget and never elevates its content to system', () => {
  const root = fixture(), store = new Store(root)
  try {
    const model = store.saveModel({ name: 'mock', model: 'mock', baseUrl: 'http://127.0.0.1:1', contextChars: 8000 })
    const key = store.directSession('main').id
    for (let index = 0; index < 20; index++) store.append(key, 'user', '旧历史'.repeat(200))
    const event = 'OTHER_AGENT_MESSAGE '.repeat(80), system = '队列规则'.repeat(40)
    const context = store.context(key, model, undefined, 'main', { system, event })
    assert(context.chars <= model.contextChars); assert(context.omitted > 0)
    assert(context.messages.at(-1)?.content.endsWith(event)); assert(!context.messages[0].content.includes('OTHER_AGENT_MESSAGE'))
    assert.equal(context.chars, context.messages.reduce((total, message) => total + message.content.length, 0))
    assert.throws(() => store.context(key, model, undefined, 'main', { system, event: 'x'.repeat(8000) }), /上下文预算/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
