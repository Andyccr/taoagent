import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
import { Store, atomic, json, normalizedNote } from '../store.ts'
import { runConversation } from '../runtime.ts'
import { portableZip } from '../portable.ts'

function fixture() {
  const base = path.resolve('.test-tmp'); fs.mkdirSync(base, { recursive: true })
  const root = fs.mkdtempSync(path.join(base, 'recovery-')), store = new Store(root), dm = store.directSession('main')
  return { root, store, dm }
}

test('two independent processes append shared agent facts without lost updates', async () => {
  const { root, store, dm } = fixture()
  store.saveAgent({ id: 'race-dm', name: 'One persistent DM' }, 'help', '')
  const code = `import { Store } from './store.ts';
    const store = new Store(process.argv[1]);
    for (let i = 0; i < 12; i++) {
      for (let attempt = 0; ; attempt++) {
        try { store.directSession('race-dm'); store.rememberFact(process.argv[2], 'main', 'agent', process.argv[3] + i, 'manual-' + process.argv[3] + i, undefined, 'manual'); break }
        catch (error) { if (error.status !== 409 || attempt > 300) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5) }
      }
    }`
  try {
    await Promise.all(['process-a-', 'process-b-'].map(prefix => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--input-type=module', '-e', code, root, dm.id, prefix], { cwd: path.resolve('.'), stdio: ['ignore', 'ignore', 'pipe'] })
      let errors = ''; child.stderr.on('data', chunk => { errors += String(chunk) }); child.on('error', reject)
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(errors)))
    })))
    const items = store.memoryItems(dm.id, 'main', 'agent')
    assert.equal(items.filter(item => item.status === 'active').length, 24)
    assert.equal(store.sessions().filter(session => session.agentId === 'race-dm' && session.kind === 'direct').length, 1)
    for (const prefix of ['process-a-', 'process-b-']) for (let i = 0; i < 12; i++) assert(store.memory(dm.id, 'main', 'agent').includes('- ' + prefix + i + '\n'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('stale group edits cannot overwrite current membership, purpose or responsibilities', () => {
  const { root, store } = fixture()
  try {
    store.saveAgent({ id: 'reviewer', name: 'Reviewer' }, 'help', '')
    const group = store.saveGroup('Original', ['main', 'reviewer'])
    const updated = store.saveGroup('Current', ['main', 'reviewer'], group.id, { purpose: 'Current purpose', memberRoles: { reviewer: 'Current role' } }, undefined, group.updatedAt)
    assert.notEqual(updated.updatedAt, group.updatedAt)
    assert.throws(() => store.saveGroup('Stale', ['reviewer', 'main'], group.id, { purpose: 'Stale purpose' }, undefined, group.updatedAt), /另一窗口/)
    assert.equal(store.session(group.id).purpose, 'Current purpose')
    assert.equal(store.session(group.id).memberRoles?.reviewer, 'Current role')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('deduplication preserves identifiers, case, punctuation and Unicode distinctions', () => {
  for (const [a, b] of [['v1.', 'v1'], ['URL /Foo', 'URL /foo'], ['https://x/a?', 'https://x/a'], ['Ａ', 'A'], ['key:', 'key'], ['C++', 'C+']]) assert.notEqual(normalizedNote(a), normalizedNote(b))
  assert.equal(normalizedNote('  same   fact '), normalizedNote('same fact'))
})

test('metadata failure after Markdown commit recovers correction lineage on next access', (t) => {
  const { root, store, dm } = fixture()
  try {
    const first = store.rememberFact(dm.id, 'main', 'agent', 'Release v1.', 'manual-first', undefined, 'manual')
    const metadata = store.file('agents', 'main', 'memory-items.json'), rename = fs.renameSync
    t.mock.method(fs, 'renameSync', (from: fs.PathLike, to: fs.PathLike) => {
      if (String(to) === metadata) throw new Error('injected metadata rename failure')
      rename(from, to)
    })
    assert.throws(() => store.rememberFact(dm.id, 'main', 'agent', 'Release v2.', 'manual-second', first.id, 'manual'))
    assert(fs.readFileSync(store.file('agents', 'main', 'MEMORY.md'), 'utf8').includes('Release v2.'))
    assert(fs.existsSync(store.file('agents', 'main', 'memory-pending.json')))
    t.mock.restoreAll()
    const next = new Store(root), items = next.memoryItems(dm.id, 'main', 'agent')
    assert.equal(items.find(item => item.id === first.id)?.status, 'replaced')
    assert.equal(items.find(item => item.note === 'Release v2.')?.replacesId, first.id)
    assert(!fs.existsSync(store.file('agents', 'main', 'memory-pending.json')))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('withdrawal is reversible with provenance and stale restoration is rejected', () => {
  const { root, store, dm } = fixture()
  try {
    const fact = store.rememberFact(dm.id, 'main', 'agent', 'Keep this fact', 'manual-first', undefined, 'manual')
    const gone = store.editMemoryItem(dm.id, 'main', 'agent', fact.id, 'forget', fact.updatedAt)
    assert(!store.memory(dm.id, 'main', 'agent').includes(fact.note))
    assert.throws(() => store.editMemoryItem(dm.id, 'main', 'agent', fact.id, 'restore', fact.updatedAt), /其他窗口/)
    const restored = store.editMemoryItem(dm.id, 'main', 'agent', fact.id, 'restore', gone.updatedAt)
    assert.equal(restored.status, 'active'); assert.equal(restored.sourceMessageId, fact.sourceMessageId)
    assert(store.memory(dm.id, 'main', 'agent').includes(fact.note))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('repeated correction recovers its completed result without restoring a withdrawn successor', () => {
  const { root, store, dm } = fixture()
  try {
    const old = store.rememberFact(dm.id, 'main', 'agent', 'old fact', 'manual-old', undefined, 'manual')
    const corrected = store.rememberFact(dm.id, 'main', 'agent', 'new fact', 'manual-new', old.id, 'manual')
    assert.equal(store.rememberFact(dm.id, 'main', 'agent', 'new fact', 'manual-retry', old.id, 'manual').id, corrected.id)
    store.editMemoryItem(dm.id, 'main', 'agent', corrected.id, 'forget', corrected.updatedAt)
    assert.throws(() => store.rememberFact(dm.id, 'main', 'agent', 'new fact', 'manual-again', old.id, 'manual'), /失效/)
    assert.throws(() => store.rememberFact(dm.id, 'main', 'agent', 'new fact', 'manual-again', undefined, 'manual'), /显式恢复/)
    assert.throws(() => store.rememberFact(dm.id, 'main', 'agent', 'old fact', 'manual-again', undefined, 'manual'), /显式恢复/)
    assert(!store.memory(dm.id, 'main', 'agent').includes('new fact'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('memory lock rejects competing writers and export; stale owners can be recovered', () => {
  const { root, store, dm } = fixture()
  try {
    const lock = store.file('agents', 'main', '.memory-lock'); fs.mkdirSync(lock); json(path.join(lock, 'owner.json'), { pid: process.pid })
    assert.throws(() => store.rememberFact(dm.id, 'main', 'agent', 'fact', 'manual-first', undefined, 'manual'), /另一窗口/)
    assert.throws(() => portableZip(root), /仍有对话/)
    json(path.join(lock, 'owner.json'), { pid: 2000000000 })
    const fact = store.rememberFact(dm.id, 'main', 'agent', 'fact', 'manual-first', undefined, 'manual')
    assert.equal(fact.note, 'fact'); assert(!fs.existsSync(lock))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('an interrupted journal never overwrites later manual edits', () => {
  const { root, store, dm } = fixture()
  try {
    const file = store.file('agents', 'main', 'MEMORY.md')
    json(store.file('agents', 'main', 'memory-pending.json'), { before: '', after: '- automatic\n', items: [] })
    atomic(file, 'handwritten changes')
    assert.equal(store.memory(dm.id, 'main', 'agent'), 'handwritten changes')
    assert.equal(fs.readFileSync(file, 'utf8'), 'handwritten changes')
    assert(!fs.existsSync(store.file('agents', 'main', 'memory-pending.json')))
    assert(fs.readdirSync(store.file('agents', 'main', 'memory-history')).some(name => name.startsWith('recovered-')))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('ambiguous names reject before sending; exact IDs address one member', async () => {
  const { root, store } = fixture()
  try {
    store.saveModel({ name: 'mock', model: 'mock', baseUrl: 'http://127.0.0.1:1' })
    store.saveAgent({ id: 'a', name: 'Same' }, '', ''); store.saveAgent({ id: 'b', name: 'Same' }, '', '')
    const group = store.saveGroup('test', ['a', 'b'])
    await assert.rejects(runConversation(store, group.id, '@Same task', '', new AbortController().signal, () => {}), /同名/)
    assert.equal(store.messages(group.id).length, 0)
    await runConversation(store, group.id, '@a task', '', new AbortController().signal, () => {})
    assert.deepEqual(store.turns(group.id)[0].speakers.map(item => item.agentId), ['a'])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('retry recovers a saved answer when progress checkpoint was not saved', async () => {
  const { root, store, dm } = fixture()
  try {
    const input = store.append(dm.id, 'user', 'task')
    store.saveTurn(dm.id, { id: input.id, content: 'task', modelId: '', at: input.at, updatedAt: input.at, speakers: [{ agentId: 'main', status: 'running' }] })
    store.append(dm.id, 'assistant', 'saved result', 'complete', { agentId: 'main', turnId: input.id })
    await assert.rejects(runConversation(store, dm.id, 'task', '', new AbortController().signal, () => {}, undefined, { retryTurnId: input.id }), /全部完成/)
    assert.equal(store.turns(dm.id)[0].speakers[0].status, 'complete')
    assert.equal(store.messages(dm.id).length, 2)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('summary checkpoints reject changed source text, missing source IDs and updated personal facts', () => {
  const { root, store, dm } = fixture()
  try {
    const model = store.saveModel({ name: 'mock', model: 'mock', baseUrl: 'http://127.0.0.1:1' })
    const source = store.append(dm.id, 'user', 'original source')
    const summary = { text: 'DERIVED_SUMMARY', sourceIds: [source.id], throughMessageId: source.id, memoryVersion: store.summaryVersion(dm.id), sourceVersion: store.historyVersion(dm.id, source.id), at: new Date().toISOString() }
    const file = store.file('chats', dm.id, 'summary.json'); json(file, summary)
    assert(store.summaryState(dm.id).valid)
    atomic(store.file('PROFILE.md'), 'new personal fact')
    assert(!store.summaryState(dm.id).valid)
    summary.memoryVersion = store.summaryVersion(dm.id); json(file, summary)
    assert(store.summaryState(dm.id).valid)
    atomic(store.file('chats', dm.id, 'messages.jsonl'), JSON.stringify({ ...source, content: 'changed original' }) + '\n')
    assert(!store.summaryState(dm.id).valid)
    const context = store.context(dm.id, model, 'continue')
    assert(context.messages.some(message => message.content.includes('changed original')))
    assert(!context.messages.some(message => message.content.includes('DERIVED_SUMMARY')))
    json(file, { ...summary, sourceVersion: store.historyVersion(dm.id, source.id), sourceIds: [] })
    assert(!store.summaryState(dm.id).valid)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('group creation survives loss of tool receipt without repeating side effects', async () => {
  const { root, store, dm } = fixture(); let fail = true
  const upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw) as { messages: { role: string }[] }
    if (body.messages.some(message => message.role === 'tool')) {
      if (fail) { res.writeHead(503); res.end(); return }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: {"choices":[{"delta":{"content":"done"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'); return
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call', function: { name: 'create_group', arguments: JSON.stringify(fail ? { name: 'created', memberIds: ['other'] } : { memberIds: ['other'], name: 'created' }) } }] }, finish_reason: 'tool_calls' }] }) + '\n\ndata: [DONE]\n\n')
  })
  try {
    upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening'); const address = upstream.address(); assert(address && typeof address === 'object')
    store.saveModel({ name: 'mock', model: 'mock', baseUrl: `http://127.0.0.1:${address.port}` }); store.saveAgent({ id: 'other', name: 'Other' }, '', '')
    await assert.rejects(runConversation(store, dm.id, 'create', '', new AbortController().signal, () => {}))
    const turn = store.turns(dm.id)[0], receipt = store.file('chats', dm.id, 'tool-results', turn.id + '.json')
    fs.unlinkSync(receipt); fail = false // operation succeeded, receipt was lost in a crash
    await runConversation(store, dm.id, 'create', '', new AbortController().signal, () => {}, undefined, { retryTurnId: turn.id })
    assert.equal(store.sessions().filter(session => session.kind === 'group').length, 1)
  } finally { upstream.closeAllConnections(); await new Promise<void>(resolve => upstream.close(() => resolve())); fs.rmSync(root, { recursive: true, force: true }) }
})
