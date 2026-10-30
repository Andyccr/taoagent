import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { createApp } from '../app.ts'
import { Store, atomic } from '../store.ts'
import { summarize } from '../context.ts'
import { portableZip } from '../portable.ts'

function temp() { const base = path.resolve('.test-tmp'); fs.mkdirSync(base, { recursive: true }); return fs.mkdtempSync(path.join(base, 'continuity-')) }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
async function api(base: string, route: string, method = 'GET', value?: unknown) { return fetch(base + route, { method, ...(value === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }) }) }
function reply(res: http.ServerResponse, content: string) { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: ' + JSON.stringify({ choices: [{ delta: { content }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n') }

test('manual memory entries can be added before chatting and corrected with explicit provenance and conflict protection', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  try {
    const base = await listen(app.server), dm = app.store.directSession('main')
    let response = await api(base, `/api/chats/${dm.id}/memory-item`, 'PUT', { action: 'add', note: '周五发布', scope: 'agent', agentId: 'main' })
    assert.equal(response.status, 200); const first = await response.json() as { id: string; updatedAt: string; sourceType: string }
    assert.equal(first.sourceType, 'manual'); assert.equal(app.store.messages(dm.id).length, 0)
    response = await api(base, `/api/chats/${dm.id}/memory-item`, 'PUT', { action: 'correct', itemId: first.id, expected: first.updatedAt, note: '周四发布', scope: 'agent', agentId: 'main' })
    assert.equal(response.status, 200); const corrected = await response.json() as { id: string; replacesId: string; sourceType: string }
    assert.equal(corrected.replacesId, first.id); assert.equal(corrected.sourceType, 'manual')
    assert.equal(app.store.memoryItems(dm.id, 'main', 'agent').find(item => item.id === first.id)?.status, 'replaced')
    assert(app.store.memory(dm.id, 'main', 'agent').includes('周四发布')); assert(!app.store.memory(dm.id, 'main', 'agent').includes('周五发布'))
    response = await api(base, `/api/chats/${dm.id}/memory-item`, 'PUT', { action: 'correct', itemId: corrected.id, expected: 'stale', note: '覆盖', scope: 'agent', agentId: 'main' })
    assert.equal(response.status, 409); assert(!app.store.memory(dm.id, 'main', 'agent').includes('覆盖'))
    assert.equal(app.store.searchMemory(dm.id, 'main', '发布')[0].sourceType, 'manual')
  } finally { await close(app.server); fs.rmSync(root, { recursive: true, force: true }) }
})

test('memory changes invalidate old summary checkpoints; regeneration uses current public facts and retains old versions', async () => {
  const root = temp(), store = new Store(root), requests: string[] = []
  const upstream = http.createServer(async (req, res) => { let body = ''; for await (const chunk of req) body += chunk; requests.push(body); reply(res, requests.length === 1 ? 'OLD_SUMMARY 周五发布' : 'NEW_SUMMARY 周四发布') })
  try {
    const url = await listen(upstream), model = store.saveModel({ name: 'mock', model: 'mock', baseUrl: url })
    store.saveAgent({ id: 'reviewer', name: '审阅员' }, 'review', 'PRIVATE_REVIEWER')
    atomic(store.file('agents', 'main', 'MEMORY.md'), 'PRIVATE_MAIN')
    const group = store.saveGroup('计划', ['main', 'reviewer'])
    const fact = store.rememberFact(group.id, 'main', 'group', '周五发布', 'manual-initial', undefined, 'manual')
    for (let i = 0; i < 14; i++) store.append(group.id, i % 2 ? 'assistant' : 'user', `历史 ${i} 周五发布`)
    const first = await summarize(store, group.id, 'main', new AbortController().signal)
    assert(store.summaryState(group.id, 'main').valid); assert.equal(first.sourceIds.length, 8)
    assert(!requests[0].includes('PRIVATE_MAIN')); assert(!requests[0].includes('PRIVATE_REVIEWER'))
    store.editMemoryItem(group.id, 'main', 'group', fact.id, 'correct', fact.updatedAt, '周四发布')
    const state = store.summaryState(group.id, 'main'); assert(!state.valid); assert(state.reason.includes('已更新'))
    const context = store.context(group.id, model, '继续计划', 'main'); assert(!context.messages[0].content.includes('OLD_SUMMARY')); assert(context.messages[0].content.includes('周四发布'))
    assert(context.includedMessageIds.includes(store.messages(group.id)[0].id))
    const second = await summarize(store, group.id, 'main', new AbortController().signal)
    assert(store.summaryState(group.id, 'main').valid); assert.equal(second.sourceIds.length, 8)
    assert(requests[1].includes('周四发布')); assert(!requests[1].includes('OLD_SUMMARY'))
    assert.equal(fs.readdirSync(store.file('chats', group.id, 'summary-history')).length, 1)
    assert.equal(store.messages(group.id).length, 14)
    atomic(store.file('agents', 'main', 'MEMORY.md'), 'PRIVATE_MAIN_CHANGED')
    fs.utimesSync(store.file('agents', 'main', 'MEMORY.md'), new Date(), new Date(Date.parse(second.at) + 1000))
    assert(!store.summaryState(group.id, 'main').valid); assert(store.summaryState(group.id, 'reviewer').valid)
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('summary does not commit if shared facts change during the model request', async () => {
  const root = temp(), store = new Store(root); let start!: () => void, release!: () => void
  const started = new Promise<void>(resolve => { start = resolve }), blocked = new Promise<void>(resolve => { release = resolve })
  const upstream = http.createServer(async (req, res) => { for await (const chunk of req) void chunk; start(); await blocked; reply(res, 'STALE_RESULT') })
  try {
    const url = await listen(upstream); store.saveModel({ name: 'mock', model: 'mock', baseUrl: url }); const dm = store.directSession('main')
    for (let i = 0; i < 10; i++) store.append(dm.id, 'user', '消息 ' + i)
    const pending = summarize(store, dm.id, 'main', AbortSignal.timeout(10000)); await started
    atomic(store.file('MEMORY.md'), '同时编辑了全局事实'); release()
    await assert.rejects(pending, /记忆发生变化/); assert.equal(store.summary(dm.id), undefined)
  } finally { release(); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('consulted members receive bounded current group material while other groups and private notes remain isolated', () => {
  const root = temp(), store = new Store(root)
  try {
    const model = store.saveModel({ name: 'mock', model: 'mock', baseUrl: 'http://127.0.0.1:1', contextChars: 8000 })
    store.saveAgent({ id: 'reviewer', name: '审阅员' }, 'review', '')
    const group = store.saveGroup('计划', ['main', 'reviewer']), other = store.saveGroup('另一群', ['main', 'reviewer'])
    store.append(group.id, 'user', 'CURRENT_TASK：检查部署回滚方案')
    store.append(group.id, 'assistant', 'PUBLIC_FINDING：发现回滚缺口', 'complete', { agentId: 'main', agentName: '助手' })
    store.updateMemory(group.id, 'main', 'member', 'PRIVATE_MAIN_NOTE', 'private1')
    store.updateMemory(other.id, 'reviewer', 'group', 'OTHER_GROUP_FACT', 'private2')
    store.append(store.directSession('reviewer').id, 'user', 'OWNER_PRIVATE_DM')
    const consultation = store.consultSession('main', 'reviewer', group.id); store.append(consultation.id, 'user', '请核验')
    const context = store.context(consultation.id, model, undefined, 'reviewer'), raw = JSON.stringify(context)
    assert(raw.includes('CURRENT_TASK')); assert(raw.includes('PUBLIC_FINDING')); assert(raw.includes('请核验'))
    for (const secret of ['PRIVATE_MAIN_NOTE', 'OTHER_GROUP_FACT', 'OWNER_PRIVATE_DM']) assert(!raw.includes(secret))
    assert(context.chars <= model.contextChars); assert(store.groupBrief(group.id, 'reviewer', 500).length <= 500)
    store.saveAgent({ id: 'outsider', name: '群外成员' }, 'help', '')
    assert.throws(() => store.groupBrief(group.id, 'outsider', 1000), /不能读取/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('removed failed members are skipped and retry follows the newly selected model without re-running completed members', async () => {
  const root = temp(), app = createApp(root, {seed:false}), calls: string[] = []
  const upstream = http.createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; const body = JSON.parse(raw) as { model: string }; calls.push(body.model); if (body.model === 'bad') { res.writeHead(503); res.end() } else reply(res, '完成') })
  try {
    const url = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'main', model: 'main', baseUrl: url }); const bad = app.store.saveModel({ name: 'bad', model: 'bad', baseUrl: url }), fixed = app.store.saveModel({ name: 'fixed', model: 'fixed', baseUrl: url })
    app.store.saveAgent({ id: 'leaver', name: '离群者', modelId: bad.id }, 'help', ''); app.store.saveAgent({ id: 'reviewer', name: '审阅员', modelId: bad.id }, 'review', '')
    const group = app.store.saveGroup('协作', ['main', 'leaver', 'reviewer']), content = '@助手 @离群者 @审阅员 检查任务'
    await (await api(base, `/api/chats/${group.id}/chat`, 'POST', { content, requestId: 'stable-request' })).text()
    const turn = app.store.turns(group.id).at(-1)!
    app.store.saveGroup('协作', ['main', 'reviewer'], group.id)
    assert.equal(app.store.turns(group.id).at(-1)!.speakers.find(item => item.agentId === 'leaver')?.status, 'skipped')
    await api(base, `/api/chats/${group.id}/preferences`, 'PUT', { modelId: fixed.id })
    const response = await api(base, `/api/chats/${group.id}/retry`, 'POST', { turnId: turn.id, modelId: fixed.id }); assert.equal(response.status, 200); await response.text()
    assert.deepEqual(calls, ['main', 'bad', 'bad', 'fixed'])
    const completed = app.store.turns(group.id).at(-1)!.speakers.find(item => item.agentId === 'reviewer')!; assert.equal(completed.status, 'complete'); assert.equal(completed.attempts, 2); assert.equal(completed.modelId, fixed.id)
    const repeated = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content, requestId: 'stable-request' }); assert((await repeated.text()).includes('"duplicate":true')); assert.equal(calls.length, 4)
    assert.equal(app.store.messages(group.id).filter(message => message.role === 'user').length, 1)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('state revisions change for fast private messages even when no run is currently active', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  try {
    const base = await listen(app.server), dm = app.store.directSession('main')
    const before = await (await api(base, '/api/state')).json() as { revisions: Record<string, string>; running: string[] }
    app.store.append(dm.id, 'user', 'OTHER_WINDOW_MESSAGE')
    const after = await (await api(base, '/api/state')).json() as typeof before
    assert.notEqual(before.revisions[dm.id], after.revisions[dm.id]); assert.deepEqual(after.running, [])
  } finally { await close(app.server); fs.rmSync(root, { recursive: true, force: true }) }
})


test('portable export refuses an active conversation even when invoked directly, and excludes expired process locks', () => {
  const root = temp(), store = new Store(root)
  try {
    const dm = store.directSession('main'), release = store.acquireRun(dm.id)
    try { assert.throws(() => portableZip(root), /仍有对话在运行/) } finally { release() }
    const lock = store.file('chats', dm.id, '.run-lock'); fs.mkdirSync(lock); fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: 2000000000, token: 'stale' }))
    const zip = portableZip(root), names: string[] = []
    let offset = 0
    while (zip.readUInt32LE(offset) === 0x04034b50) {
      const nameLength = zip.readUInt16LE(offset + 26), extraLength = zip.readUInt16LE(offset + 28), size = zip.readUInt32LE(offset + 18)
      names.push(zip.subarray(offset + 30, offset + 30 + nameLength).toString('utf8'))
      offset += 30 + nameLength + extraLength + size
    }
    assert(!names.some(name => name.includes('/.run-lock/'))); assert(names.some(name => name.endsWith('/messages.jsonl')))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
