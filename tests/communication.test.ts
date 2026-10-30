import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { Store, type Turn } from '../store.ts'
import { createApp } from '../app.ts'
import { runConversation, steerConversation } from '../runtime.ts'
import { envelope, duplicateDelivery, discussionView } from '../communication.ts'

function fixture() { fs.mkdirSync('.test-tmp', { recursive: true }); const root = fs.mkdtempSync(path.resolve('.test-tmp', 'communication-')); const store = new Store(root); for (const id of ['critic', 'other']) store.saveAgent({ id, name: id }, '独立判断', 'PRIVATE_MEMORY'); const key = store.saveGroup('协作', ['main', 'critic', 'other'], undefined, { replyMode: 'collective' }).id; return { root, store, key } }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
interface Body { model: string; messages: { role: string; content: string }[] }
async function body(req: http.IncomingMessage): Promise<Body> { let raw = ''; for await (const part of req) raw += part; return JSON.parse(raw) as Body }
function reply(res: http.ServerResponse, text: string, call?: { name: string; args: Record<string, unknown> }) { const delta = call ? { tool_calls: [{ index: 0, id: 'call', function: { name: call.name, arguments: JSON.stringify(call.args) } }] } : { content: text }; res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: ' + JSON.stringify({ choices: [{ delta, finish_reason: call ? 'tool_calls' : 'stop' }] }) + '\n\ndata: [DONE]\n\n') }
function turn(): Turn { return { id: 'turn', content: '原始目标', at: '', updatedAt: '', modelId: '', speakers: [{ agentId: 'main', eventId: 'root', status: 'complete' }, { agentId: 'critic', fromAgentId: 'main', eventId: 'q1', parentEventId: 'root', topic: '标识', intent: 'question', body: '姓名能否作唯一标识？', status: 'complete' }] } }

test('envelopes reject forged replies and foreign evidence while preserving public provenance', () => {
  const { root, store, key } = fixture()
  try {
    const input = store.append(key, 'user', '两个用户可以同名'), foreign = store.append(store.directSession('critic').id, 'user', 'PRIVATE_CHAT')
    const current = turn(), parent = current.speakers[1]
    const meta = envelope(store, key, current, 'critic', 'main', parent, { intent: 'answer', replyTo: 'q1', evidenceIds: [input.id] })
    assert.equal(meta.topic, '标识'); assert.equal(meta.parentEventId, 'q1'); assert.deepEqual(meta.evidenceIds, [input.id])
    assert.throws(() => envelope(store, key, current, 'other', 'main', parent, { replyTo: 'q1' }), /回复必须/)
    assert.throws(() => envelope(store, key, current, 'critic', 'other', parent, { replyTo: 'q1' }), /回复必须/)
    assert.throws(() => envelope(store, key, current, 'critic', 'main', parent, { replyTo: 'missing' }), /回复必须/)
    assert.throws(() => envelope(store, key, current, 'critic', 'main', parent, { replyTo: 'q1', topic: '其他议题' }), /原议题/)
    assert.throws(() => envelope(store, key, current, 'critic', 'main', parent, { evidenceIds: [foreign.id] }), /公开消息/)
    assert.throws(() => envelope(store, key, current, 'critic', 'main', parent, { intent: 'truth' }), /意图/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('deduplication spans parent events but preserves new evidence, intent and topic', () => {
  const { root, store, key } = fixture()
  try {
    const current = turn(), parent = current.speakers[0]
    const meta = envelope(store, key, current, 'main', 'critic', parent, { intent: 'question', topic: '标识' })
    assert(duplicateDelivery(current, 'main', 'critic', '姓名能否作唯一标识？', meta))
    assert(!duplicateDelivery(current, 'main', 'critic', ' 姓名能否作唯一标识？ ', meta))
    assert(!duplicateDelivery(current, 'main', 'critic', '姓名能否作唯一标识？', { ...meta, topic: '数据库迁移' }))
    assert(!duplicateDelivery(current, 'main', 'critic', '姓名能否作唯一标识？', { ...meta, intent: 'challenge' }))
    assert(!duplicateDelivery(current, 'main', 'critic', '姓名能否作唯一标识？', { ...meta, evidenceIds: ['new-source'] }))
    assert(!duplicateDelivery(current, 'main', 'critic', '姓名不能作唯一标识。', meta))
    // Identical answers to distinct questions must still correlate with each question.
    current.speakers.push({agentId:'main',fromAgentId:'critic',eventId:'answer-1',replyTo:'q1',topic:'标识',intent:'answer',body:'不能',status:'complete'})
    const answerMeta={...meta,intent:'answer' as const,replyTo:'q2'}
    assert(!duplicateDelivery(current,'critic','main','不能',answerMeta))
    assert(duplicateDelivery(current,'critic','main','不能',{...answerMeta,replyTo:'q1'}))
    current.speakers.push({agentId:'critic',fromAgentId:'main',topic:'标识',intent:'question',body:'if x:\n  y()\nz()',status:'pending'})
    assert(!duplicateDelivery(current,'main','critic','if x:\n  y()\n  z()',meta))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a completed speech or queued answer cannot silently close a question', () => {
  const current = turn()
  assert.equal(discussionView(current).questions[0].status, 'open')
  current.speakers.push({ agentId: 'main', fromAgentId: 'critic', eventId: 'a1', replyTo: 'q1', topic: '标识', intent: 'answer', body: '不能', status: 'pending' })
  assert.equal(discussionView(current).questions[0].status, 'open')
  current.speakers[2].status = 'failed'; assert.equal(discussionView(current).questions[0].status, 'open')
  current.speakers[2].status = 'complete'
  assert.equal(discussionView(current).questions[0].status, 'responded')
  assert(discussionView(current).questions[0].notice.includes('不代表事实已验证'))
  assert.equal(discussionView(current, '其他议题').events.length, 0)
})

test('live tools reply with correlated evidence, expose unresolved questions and persist across restart', async () => {
  const { root, store, key } = fixture(), app = createApp(root, { seed: false }); let author = 0, critic = 0
  const source = store.append(key, 'user', 'PUBLIC_EVIDENCE：已有两个同名用户')
  const upstream = http.createServer(async (req, res) => {
    const request = await body(req), serialized = JSON.stringify(request); assert(!serialized.includes('PRIVATE_MEMORY'))
    if (request.model === 'author' && ++author === 1) reply(res, '', { name: 'send_message', args: { agentId: 'critic', content: '请核验姓名是否唯一', intent: 'question', topic: '标识设计', evidenceIds: [source.id] } })
    else if (request.model === 'critic' && ++critic === 1) {
      assert(request.messages.at(-1)?.content.includes(source.id)); assert(request.messages.at(-1)?.content.includes('PUBLIC_EVIDENCE'))
      reply(res, '', { name: 'reply_message', args: { content: '反例：同名存在。修正为稳定 ID。', intent: 'revision', evidenceIds: [source.id] } })
    } else if (request.model === 'author' && author === 3) reply(res, '', { name: 'read_discussion', args: { topic: '标识设计' } })
    else reply(res, '保留修正和未验证事项')
  })
  try {
    const url = await listen(upstream), base = await listen(app.server)
    store.saveModel({ name: 'author', model: 'author', baseUrl: url }); const model = store.saveModel({ name: 'critic', model: 'critic', baseUrl: url })
    store.saveAgent({ id: 'critic', name: 'critic', modelId: model.id }, '独立核验', 'PRIVATE_MEMORY')
    const response = await fetch(base + `/api/chats/${key}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: '设计用户标识' }) })
    assert((await response.text()).includes('"type":"done"'))
    const restored = new Store(root).turns(key)[0], view = discussionView(restored)
    assert.equal(view.events.length, 3); assert.equal(view.questions[0].status, 'responded')
    assert.equal(restored.speakers[2].replyTo, restored.speakers[1].eventId)
    assert.deepEqual(restored.speakers[2].evidenceIds, [source.id])
    const api = await fetch(base + `/api/chats/${key}/communication?topic=${encodeURIComponent('标识设计')}`)
    assert.equal(api.status, 200); const apiView = await api.json() as ReturnType<typeof discussionView>
    assert.equal(apiView.events.length, 2); assert.equal(apiView.questions[0].status, 'responded')
    const foreign = store.directSession('other')
    assert.equal((await fetch(base + `/api/chats/${foreign.id}/communication?turnId=${restored.id}`)).status, 404)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('repeated content sent again from a later event wakes the recipient only once', async () => {
  const { root, store, key } = fixture(); let author = 0, critic = 0
  const upstream = http.createServer(async (req, res) => {
    const request = await body(req)
    if (request.model === 'author' && ++author % 2 === 1) reply(res, '', { name: 'send_message', args: { agentId: 'critic', content: '请检查同一个问题', intent: 'question', topic: '去重实验' } })
    else if (request.model === 'critic' && ++critic === 1) reply(res, '', { name: 'reply_message', args: { content: '已给出具体反例', intent: 'answer' } })
    else reply(res, '结束')
  })
  try {
    const url = await listen(upstream); store.saveModel({ name: 'author', model: 'author', baseUrl: url }); const model = store.saveModel({ name: 'critic', model: 'critic', baseUrl: url }); store.saveAgent({ id: 'critic', name: 'critic', modelId: model.id }, '核验', '')
    await runConversation(store, key, '开始去重实验', '', new AbortController().signal, () => {})
    const current = store.turns(key)[0]
    assert.equal(current.speakers.length, 3); assert.equal(critic, 2); assert.equal(current.usage?.suppressedMessages, 1)
    assert.equal(current.usage?.modelCalls, 6)
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('user interjections supersede in-flight drafts without dropping delivered message history', async () => {
  const { root, store, key } = fixture(), calls: string[] = []; let main = 0
  const upstream = http.createServer(async (req, res) => {
    const request = await body(req); calls.push(request.model)
    if (request.model === 'author' && ++main === 1) reply(res, '', { name: 'send_message', args: { agentId: 'critic', content: '旧协作问题' } })
    else if (request.model === 'author') { steerConversation(store, key, '@other 优先处理新约束'); reply(res, '完成当前事件') }
    else reply(res, '已收到')
  })
  try {
    const url = await listen(upstream); store.saveModel({ name: 'author', model: 'author', baseUrl: url })
    for (const member of ['critic', 'other']) { const model = store.saveModel({ name: member, model: member, baseUrl: url }); store.saveAgent({ id: member, name: member, modelId: model.id }, '核验', '') }
    await runConversation(store, key, '原始任务', '', new AbortController().signal, () => {})
    assert.equal(calls[0],'author');assert.equal(calls.filter(name=>name==='author').length,2);assert(calls.includes('other'));assert(calls.includes('critic'))
    const current = store.turns(key)[0]; assert.equal(current.speakers.length, 3)
    assert.equal(current.speakers.find(item=>item.agentId==='main')?.status,'skipped')
    assert.equal(current.speakers.find(item=>item.agentId==='other')?.status,'complete')
    assert(current.speakers.every(item => ['complete','skipped'].includes(item.status))); assert(store.messages(key).some(item => item.content === '@other 优先处理新约束'))
    assert(store.messages(key).some(item=>item.kind==='activity'&&item.content.includes('旧协作问题')))
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('resume repairs a durable envelope missing its activity record without duplicate deliveries', async () => {
  const { root, store, key } = fixture()
  const upstream = http.createServer(async (req, res) => { await body(req); reply(res, '已处理恢复的消息') })
  try {
    store.saveModel({ name: 'mock', model: 'mock', baseUrl: await listen(upstream) })
    const user = store.append(key, 'user', '恢复协作'), current = turn()
    current.id = user.id; current.content = user.content; current.speakers[1].status = 'pending'; current.speakers[1].deliveryMessageId = 'delivery-recovery'
    store.saveTurn(key, current)
    await runConversation(new Store(root), key, '', '', new AbortController().signal, () => {}, undefined, { retryTurnId: user.id })
    assert.equal(store.messages(key).filter(item => item.id === 'delivery-recovery').length, 1)
    assert.equal(store.turns(key)[0].speakers[1].status, 'complete')
    await assert.rejects(runConversation(new Store(root), key, '', '', new AbortController().signal, () => {}, undefined, { retryTurnId: user.id }), /全部完成/)
    assert.equal(store.messages(key).filter(item => item.id === 'delivery-recovery').length, 1)
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})
