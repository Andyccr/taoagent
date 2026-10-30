import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createApp } from '../app.ts'
import { Store, atomic, json } from '../store.ts'
import { portableZip } from '../portable.ts'
import { migrate } from '../migrate.ts'
import { saveSkill, saveRoutine, readSkill, workOverview } from '../work.ts'
import {enqueueMessage, queueSnapshot} from '../queue.ts'

async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
function temp() { const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.test-tmp'); fs.mkdirSync(base, { recursive: true }); return fs.mkdtempSync(path.join(base, 'run-')) }
async function request(base: string, route: string, method = 'GET', body?: unknown) {
  return fetch(base + route, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
}

test('history survives restart; context includes rules and keeps history intact', () => {
  const root = temp()
  try {
    const store = new Store(root)
    const model = store.saveModel({ name: 'test', model: 'test', baseUrl: 'http://localhost:1/v1', contextChars: 2000 })
    atomic(store.file('PROFILE.md'), 'owner-fact'); atomic(store.file('RULES.md'), 'global-rule')
    store.saveAgent({ id: 'writer', name: 'Writer', modelId: model.id }, 'agent-rule', 'agent-memory')
    const chat = store.createSession('writer', model.id)
    atomic(store.file('chats', chat.id, 'context.md'), 'summary-fact')
    store.append(chat.id, 'user', 'A'.repeat(1400)); store.append(chat.id, 'assistant', 'B'.repeat(700)); store.append(chat.id, 'assistant', 'broken', 'interrupted')
    const context = store.context(chat.id, model, 'new-question')
    assert(context.omitted > 0); assert.equal(context.messages.at(-1)?.content, 'new-question')
    for (const fact of ['owner-fact', 'global-rule', 'agent-rule', 'agent-memory', 'summary-fact']) assert(context.messages[0].content.includes(fact))
    assert(!context.messages.some(m => m.content === 'broken'))
    assert.throws(() => store.context(chat.id, model, 'X'.repeat(2100)), /超过上下文预算/)
    const reopened = new Store(root); assert.equal(reopened.messages(chat.id).length, 3)
    assert.throws(() => reopened.session('../escape'), /无效 ID/)
    assert.throws(() => store.saveModel({ name: 'bad', model: 'x', baseUrl: 'file:///etc' }), /HTTP/)
    store.saveModel({ ...model, apiKey: 'secret-key' }); store.saveModel({ ...model, apiKey: '' })
    assert.equal(store.models()[0].apiKey, 'secret-key')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

for (const protocol of ['openai', 'anthropic', 'gemini']) test(`${protocol}: live HTTP streaming chat, persistence, secrets and request format`, async () => {
  const root = temp(); const app = createApp(root, {seed:false})
  let requestBody: Record<string, unknown> = {}; let upstreamPath = ''; let headers: http.IncomingHttpHeaders = {}
  const upstream = http.createServer(async (req, res) => {
    headers = req.headers; upstreamPath = req.url || ''
    let body = ''; for await (const part of req) body += part; requestBody = JSON.parse(body)
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    const events = protocol === 'anthropic'
      ? [{type:'message_start',message:{id:'mock',model:'fixture',usage:{input_tokens:1,output_tokens:0}}},{type:'content_block_start',index:0,content_block:{type:'text',text:''}},{ type: 'content_block_delta', index:0, delta: { type: 'text_delta', text: '你好' } },{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:1}}, { type: 'message_stop' }]
      : protocol === 'gemini' ? [{ candidates: [{ content: { parts: [{ text: '你好' }] }, finishReason: 'STOP' }] }]
      : [{ choices: [{ delta: { content: '你好' }, finish_reason: 'stop' }] }, '[DONE]']
    for (const item of events) {
      const bytes = Buffer.from((typeof item==='object'&&'type' in item?'event: '+item.type+'\n':'')+'data: ' + (typeof item === 'string' ? item : JSON.stringify(item)) + '\r\n\r\n')
      res.write(bytes.subarray(0, bytes.length - 4)); res.write(bytes.subarray(bytes.length - 4))
    }
    res.end()
  })
  try {
    const upstreamUrl = await listen(upstream); const base = await listen(app.server)
    const model = app.store.saveModel({ name: protocol, protocol, model: 'fixture', baseUrl: upstreamUrl + '/v1', apiKey: 'private-secret' })
    const chat = app.store.createSession('main', model.id)
    const response = await request(base, `/api/chats/${chat.id}/chat`, 'POST', { content: '你好' })
    assert.equal(response.status, 200); const events = (await response.text()).trim().split('\n').map(line => JSON.parse(line))
    assert(events.some(e => e.type === 'delta' && e.text === '你好')); assert.equal(events.at(-1).type, 'done')
    assert.equal(app.store.messages(chat.id).at(-1)?.content, '你好')
    assert.equal(app.store.messages(chat.id).length, 2)
    assert(app.store.text('chats', chat.id, 'context.json').includes('你好'))
    const state = await (await request(base, '/api/state')).text(); assert(!state.includes('private-secret')); assert(state.includes('hasKey'))
    assert(!app.store.text('chats', chat.id, 'context.json').includes('private-secret'))
    if (protocol === 'openai') { assert.equal(headers.authorization, 'Bearer private-secret'); assert(upstreamPath.endsWith('/chat/completions')); assert(Array.isArray(requestBody.messages)) }
    if (protocol === 'anthropic') { assert.equal(headers['x-api-key'], 'private-secret'); assert(new URL(upstreamPath,'http://localhost').pathname.endsWith('/messages')); assert(typeof requestBody.system === 'string' || Array.isArray(requestBody.system)) }
    if (protocol === 'gemini') { assert.equal(headers['x-goog-api-key'], 'private-secret'); assert(upstreamPath.includes(':streamGenerateContent')); assert(Array.isArray(requestBody.contents)) }
    const forbidden = await fetch(base + '/api/profile', { headers: { Origin: 'https://evil.example' } }); assert.equal(forbidden.status, 403)
    const crossPost = await fetch(base + '/api/profile', { method: 'PUT', body: '{}' }); assert.equal(crossPost.status, 415)
    const broken = await fetch(base + '/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{' }); assert.equal(broken.status, 400)
    const exported = await request(base, '/api/export'); assert.equal(exported.status, 200)
    assert.equal(Buffer.from(await exported.arrayBuffer()).readUInt32LE(0), 0x04034b50)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('busy session rejects duplicates; stopping persists partial output and unlocks export', async () => {
  const root = temp(); const app = createApp(root, {seed:false})
  const upstream = http.createServer(async (req, res) => {
    for await (const part of req) { void part }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.write('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')
  })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    const model = app.store.saveModel({ name: 'slow', model: 'slow', baseUrl: upstreamUrl })
    const chat = app.store.createSession('main', model.id)
    const first = await request(base, `/api/chats/${chat.id}/chat`, 'POST', { content: 'hello' })
    assert.equal((await request(base, `/api/chats/${chat.id}/chat`, 'POST', { content: 'duplicate' })).status, 409)
    assert.equal((await request(base, '/api/export')).status, 409)
    await request(base, `/api/chats/${chat.id}/stop`, 'POST', {})
    assert((await first.text()).includes('error')); assert.equal(app.active.size, 0)
    assert.equal(app.store.messages(chat.id)[0].content, 'hello')
    assert.equal((await request(base, '/api/export')).status, 200)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('abrupt upstream close preserves partial answer and does not mark it complete', async () => {
  const root = temp(); const app = createApp(root, {seed:false})
  const upstream = http.createServer(async (req, res) => { for await (const chunk of req) { void chunk }; res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n') })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    const model = app.store.saveModel({ name: 'broken', model: 'broken', baseUrl: upstreamUrl })
    const chat = app.store.createSession('main', model.id)
    const response = await request(base, `/api/chats/${chat.id}/chat`, 'POST', { content: 'hello' })
    assert((await response.text()).includes('error')); assert.equal(app.store.messages(chat.id).at(-1)?.status, 'interrupted')
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('portable ZIP restores source, credentials and history into another location', () => {
  const root = temp(), restored = temp()
  try {
    const store = new Store(root); const model = store.saveModel({ name: 'portable', model: 'test', baseUrl: 'http://localhost:1234', apiKey: 'portable-key' })
    const chat = store.createSession('main', model.id); store.append(chat.id, 'user', '完整历史')
    store.saveAgent({ id: 'created-agent', name: '研究员', createdBy: 'main' }, '核实事实', '独立记忆')
    const group = store.saveGroup('一起工作', ['main', 'created-agent'])
    store.append(group.id, 'assistant', '群内意见', 'complete', { agentId: 'created-agent', agentName: '研究员' })
    atomic(store.file('files', '中文.txt'), '个人文件')
    atomic(store.file('files', 'work.tmp'), '用户自己的临时文件也必须迁移')
    store.saveDraft('agent', 'main', '尚未发送的草稿')
      store.saveNavigation({targetKey:'agent:main',pinned:true,expectedPinned:false})
      const navigationSession=store.session(chat.id),navigationFile=store.file('chats',chat.id,'messages.jsonl')
      store.saveNavigation({sessionId:chat.id,seenRevision:navigationSession.updatedAt+':'+fs.statSync(navigationFile).size})
      const queued=enqueueMessage(store,chat.id,{content:'迁移后仍需处理的排队消息',requestId:crypto.randomUUID()})
    const skill = saveSkill(store, {name:'迁移核验',description:'迁移后检查工作库',instructions:'核验历史、技能和例行任务都已保留。',enabled:true})
    const routine = saveRoutine(store, {name:'本地核验',sessionId:chat.id,instruction:'检查工作目录',intervalMinutes:60,enabled:false})
    store.saveAgent({id:'retired',name:'已移除成员'},'original rules','original memory');const retiredChat=store.directSession('retired');store.append(retiredChat.id,'user','archived history');store.archiveAgent('retired','user approved removal')
    const retiredGroup=store.saveGroup('',['main','created-agent'],undefined,{discussionMode:'brainstorm',purpose:''});store.append(retiredGroup.id,'user','无主题的联想');atomic(store.file('chats',retiredGroup.id,'MEMORY.md'),'群记忆保留');store.archiveGroup(retiredGroup.id,'用户确认删除')
    const zip = portableZip(root)
    // Independently parse ZIP local entries; verify central directory and names exist.
    let offset = 0; let count = 0
    while (zip.readUInt32LE(offset) === 0x04034b50) {
      const size = zip.readUInt32LE(offset + 18), nameSize = zip.readUInt16LE(offset + 26), extraSize = zip.readUInt16LE(offset + 28)
      const name = zip.subarray(offset + 30, offset + 30 + nameSize).toString('utf8'); assert(!name.includes('..'))
      const start = offset + 30 + nameSize + extraSize, file = path.join(restored, name)
      fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, zip.subarray(start, start + size))
      offset = start + size; count++
    }
    assert.equal(zip.readUInt32LE(offset), 0x02014b50); assert(count > 10)
    const next = new Store(path.join(restored, 'taoagent', 'home'))
    assert.equal(next.models()[0].apiKey, 'portable-key'); assert.equal(next.messages(chat.id)[0].content, '完整历史')
    assert.equal(next.account().defaultModelId, model.id); assert.equal(next.agent('created-agent').createdBy, 'main')
    assert.deepEqual(next.groupMembers(group.id), ['main', 'created-agent']); assert.equal(next.messages(group.id)[0].agentName, '研究员')
    assert.equal(next.text('files', '中文.txt'), '个人文件'); assert(fs.existsSync(path.join(restored, 'taoagent', 'app.ts')))
    assert.equal(next.text('files', 'work.tmp'), '用户自己的临时文件也必须迁移')
    assert.equal(next.draft('agent', 'main'), '尚未发送的草稿')
      assert.deepEqual(next.navigation(),store.navigation())
      assert.equal(queueSnapshot(next,chat.id).items[0].id,queued.id)
      assert.equal(queueSnapshot(next,chat.id).items[0].content,'迁移后仍需处理的排队消息')
      assert(fs.existsSync(path.join(restored,'taoagent','workspace.ts')))
    assert.equal(readSkill(next, skill.id).instructions, skill.instructions)
    assert.equal(workOverview(next).routines.find(item=>item.id===routine.id)?.enabled, false)
    assert(fs.existsSync(path.join(restored, 'taoagent', 'work.ts')))
    assert(fs.existsSync(path.join(restored, 'taoagent', 'collaboration.ts')))
    assert(!next.agents().some(agent=>agent.id==='retired'));assert.equal(next.text('agents','retired','MEMORY.md'),'original memory');assert.equal(next.messages(retiredChat.id)[0].content,'archived history');next.restoreAgent('retired');assert(next.agents().some(agent=>agent.id==='retired'))
    assert(!next.sessions().some(session=>session.id===retiredGroup.id));assert.equal(next.messages(retiredGroup.id)[0].content,'无主题的联想');const revivedGroup=next.restoreGroup(retiredGroup.id);assert.equal(revivedGroup.discussionMode,'brainstorm');assert.equal(revivedGroup.purpose,'');assert.equal(next.text('chats',retiredGroup.id,'MEMORY.md'),'群记忆保留')
  } finally { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(restored, { recursive: true, force: true }) }
})

test('migration decrypts credentials and retains relational history and all legacy tables', () => {
  const root = temp(); const legacy = path.join(root, 'legacy'), home = path.join(root, 'home')
  fs.mkdirSync(path.join(legacy, 'data'), { recursive: true })
  const secret = crypto.randomBytes(32), iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', secret, iv)
  const encrypted = cipher.update('migrated-key', 'utf8', 'hex') + cipher.final('hex')
  atomic(path.join(legacy, 'data', 'credential-secret'), secret.toString('hex'))
  const db = new DatabaseSync(path.join(legacy, 'data', 'taoagent.db'))
  db.exec('CREATE TABLE agents(id TEXT, data TEXT); CREATE TABLE credentials(id TEXT, data TEXT); CREATE TABLE sessions(id TEXT,data TEXT); CREATE TABLE session_messages(session_id TEXT, seq INTEGER, data TEXT); CREATE TABLE unknown_feature(data TEXT)')
  db.prepare('INSERT INTO credentials VALUES(?,?)').run('cred', JSON.stringify({ id: 'cred', provider: 'openai', encryptedKey: iv.toString('hex') + ':' + cipher.getAuthTag().toString('hex') + ':' + encrypted }))
  db.prepare('INSERT INTO agents VALUES(?,?)').run('a', JSON.stringify({ id: 'a', name: 'Agent', systemPrompt: 'old rule', provider: 'openai', model: 'old-model', credentialId: 'cred' }))
  db.prepare('INSERT INTO sessions VALUES(?,?)').run('s', JSON.stringify({ id: 's', agentId: 'a', name: 'Old chat', messages: [], provider: 'openai', model: 'old-model', credentialId: 'cred' }))
  db.prepare('INSERT INTO session_messages VALUES(?,?,?)').run('s', 1, JSON.stringify({ role: 'user', text: '旧消息' }))
  db.prepare('INSERT INTO unknown_feature VALUES(?)').run('preserved'); db.close()
  try {
    const report = migrate(legacy, home, path.join(root, 'empty'))
    assert.equal(report.agents, 1); assert.equal(report.chats, 1); assert.equal(report.warnings.length, 0)
    const store = new Store(home); assert.equal(store.models()[0].apiKey, 'migrated-key')
    assert.equal(store.messages(store.sessions()[0].id)[0].content, '旧消息')
    assert(store.text('archive', 'original', 'taoagent.db.json').includes('preserved'))
    assert(store.text('agents', 'original-a', 'RULES.md').includes('old rule'))
    assert.throws(() => migrate(legacy, home), /已经迁移过/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
