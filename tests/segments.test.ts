import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { once } from 'node:events'
import { gunzipSync } from 'node:zlib'
import { Store, json, type Turn } from '../store.ts'
import { createApp } from '../app.ts'
import { conversationPreview } from '../workspace.ts'

function fixture() {
  fs.mkdirSync('.test-tmp', { recursive: true })
  const root = fs.mkdtempSync(path.resolve('.test-tmp', 'segments-')), store = new Store(root)
  store.saveAgent({ id: 'peer', name: 'Peer', modelId: '' }, 'r', '')
  return { root, store, key: store.saveGroup('segments', ['main', 'peer']).id }
}
const contents = (store: Store, key: string) => store.messages(key).map(message => message.content)
const sealed = (store: Store, key: string) => fs.existsSync(store.file('chats', key, 'history')) ? fs.readdirSync(store.file('chats', key, 'history')).sort() : []

test('message history seals bounded segments, reads back complete and in order from any instance', () => {
  const { root, store, key } = fixture()
  try {
    store.historySegmentBytes = 1500
    const other = new Store(root); other.historySegmentBytes = 1500
    const expected: string[] = []
    let previousBytes = store.historyBytes(key)
    for (let index = 0; index < 60; index++) {
      const writer = index % 3 ? store : other, text = 'segment line ' + index + ' ' + 'x'.repeat(index % 7 * 20)
      writer.append(key, 'user', text); expected.push(text)
      assert.deepEqual(contents(store, key), expected); assert.deepEqual(contents(other, key), expected)
      const bytes = store.historyBytes(key); assert.ok(bytes > previousBytes); previousBytes = bytes
    }
    assert.ok(sealed(store, key).length >= 5)
    for (const file of store.historyFiles(key).slice(0, -1)) assert.ok(fs.statSync(file).size < 1500 + 400, 'segments stay bounded')
    assert.deepEqual(contents(new Store(root), key), expected)
    assert.equal(store.historyBytes(key), store.historyFiles(key).reduce((sum, file) => sum + (fs.existsSync(file) ? fs.statSync(file).size : 0), 0))
    assert.deepEqual(fs.readdirSync(store.file('chats', key)).filter(name => name.endsWith('.tmp')), [])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a large pre-segmentation history is moved intact into the first sealed segment on the next append', () => {
  const { root, store, key } = fixture()
  try {
    const legacy = Array.from({ length: 400 }, (_, index) => JSON.stringify({ id: 'legacy-' + index, role: 'user', content: '旧消息 ' + index, at: new Date(1e12 + index).toISOString(), status: 'complete' })).join('\n') + '\n'
    fs.writeFileSync(store.file('chats', key, 'messages.jsonl'), legacy)
    store.historySegmentBytes = 4096
    assert.equal(store.messages(key).length, 400)
    store.append(key, 'user', 'after migration')
    assert.deepEqual(sealed(store, key), ['000001.jsonl'])
    assert.equal(fs.readFileSync(store.file('chats', key, 'history', '000001.jsonl'), 'utf8'), legacy, 'byte-identical, nothing rewritten')
    assert.deepEqual(contents(store, key), [...Array.from({ length: 400 }, (_, index) => '旧消息 ' + index), 'after migration'])
    store.append(key, 'user', 'second')
    assert.deepEqual(sealed(store, key), ['000001.jsonl'], 'the small new active segment is not sealed again')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a crash right after sealing (no active segment yet) loses and duplicates nothing', () => {
  const { root, store, key } = fixture()
  try {
    for (let index = 0; index < 5; index++) store.append(key, 'user', 'before ' + index)
    const active = store.file('chats', key, 'messages.jsonl')
    fs.mkdirSync(store.file('chats', key, 'history'), { recursive: true })
    fs.renameSync(active, store.file('chats', key, 'history', '000001.jsonl')) // The process stopped here.
    const restarted = new Store(root)
    assert.deepEqual(contents(restarted, key), ['before 0', 'before 1', 'before 2', 'before 3', 'before 4'])
    assert.equal(conversationPreview(restarted, key).preview, 'before 4', 'the preview falls back to the sealed segment')
    restarted.append(key, 'user', 'after')
    assert.deepEqual(contents(restarted, key).slice(-2), ['before 4', 'after'])
    assert.deepEqual(contents(store, key), contents(restarted, key))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('history HTTP paging, revisions, previews and search cover sealed segments', async () => {
  const { root } = fixture(), app = createApp(root, { seed: false }), store = app.store
  try {
    store.historySegmentBytes = 2000
    const key = store.sessions().find(session => session.title === 'segments')!.id
    for (let index = 0; index < 150; index++) store.append(key, 'user', 'paged message ' + index + (index === 3 ? ' needle-in-sealed' : ''))
    assert.ok(sealed(store, key).length > 3)
    app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening')
    const address = app.server.address(), base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
    const first = await (await fetch(`${base}/api/chats/${key}`)).json() as { messages: { id: string; content: string }[]; hasOlder: boolean; total: number; revision: string }
    assert.equal(first.total, 150); assert.equal(first.messages.length, 100); assert.equal(first.hasOlder, true)
    assert.equal(first.revision, store.session(key).updatedAt + ':' + store.historyBytes(key))
    const older = await (await fetch(`${base}/api/chats/${key}?before=${first.messages[0].id}`)).json() as { messages: { content: string }[]; hasOlder: boolean }
    assert.equal(older.messages[0].content, 'paged message 0'); assert.equal(older.hasOlder, false)
    const state = await (await fetch(`${base}/api/state`)).json() as { revisions: Record<string, string>; conversations: { id: string; preview: string }[] }
    assert.equal(state.revisions[key], first.revision)
    assert.equal(state.conversations.find(item => item.id === key)?.preview, 'paged message 149')
    const seen = await fetch(`${base}/api/navigation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: key, seenRevision: first.revision }) })
    assert.equal(seen.status, 200)
    const search = await (await fetch(`${base}/api/search?q=needle-in-sealed`)).json() as { hits: { messageId: string }[] }
    assert.equal(search.hits.length, 1)
  } finally { app.server.closeAllConnections(); app.server.close(); fs.rmSync(root, { recursive: true, force: true }) }
})

function turn(id: string, note = ''): Turn { const at = new Date().toISOString(); return { id, content: 'turn ' + id + note, modelId: '', at, updatedAt: at, speakers: [] } }
function reference(order: string[], id: string) { return [...order.filter(item => item !== id), id] }

test('turns keep the saved-last order across sealed segments; recent turns come from the bounded active file', () => {
  const { root, store, key } = fixture()
  try {
    store.activeTurnLimit = 6
    let order: string[] = []
    const save = (id: string, note = '') => { const value = store.turns(key).find(item => item.id === id) || turn(id); value.content = 'turn ' + id + note; store.saveTurn(key, value); order = reference(order, id) }
    for (let index = 0; index < 25; index++) save('t' + index)
    save('t2', ' revised'); save('t11', ' revised'); save('t24', ' again')
    assert.deepEqual(store.turns(key).map(item => item.id), order)
    assert.equal(store.turns(key).find(item => item.id === 't2')?.content, 'turn t2 revised')
    assert.ok(fs.readdirSync(store.file('chats', key, 'turn-history')).length >= 3)
    assert.ok((JSON.parse(fs.readFileSync(store.file('chats', key, 'turns.json'), 'utf8')) as Turn[]).length <= 6)
    for (const count of [1, 3, 6, 10]) assert.deepEqual(store.recentTurns(key, count).map(item => item.id), order.slice(-count))
    const copy = store.turns(key); copy[0].content = 'mutated'
    assert.notEqual(store.turns(key)[0].content, 'mutated')
    assert.deepEqual(new Store(root).turns(key).map(item => item.id), order)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a legacy turns.json is backed up once, byte for byte, before its first split', () => {
  const { root, store, key } = fixture()
  try {
    const legacy = Array.from({ length: 30 }, (_, index) => turn('old' + index))
    json(store.file('chats', key, 'turns.json'), legacy)
    const original = fs.readFileSync(store.file('chats', key, 'turns.json'))
    assert.deepEqual(store.turns(key).map(item => item.id), legacy.map(item => item.id))
    store.activeTurnLimit = 8
    store.saveTurn(key, turn('new0'))
    const backup = store.file('chats', key, 'backups', 'turns.json.pre-segments.bak')
    assert.deepEqual(fs.readFileSync(backup), original)
    for (let index = 1; index < 20; index++) store.saveTurn(key, turn('new' + index))
    assert.deepEqual(fs.readFileSync(backup), original, 'later splits never touch the backup')
    assert.deepEqual(store.turns(key).map(item => item.id), [...legacy.map(item => item.id), ...Array.from({ length: 20 }, (_, index) => 'new' + index)])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a crash between writing a sealed turn segment and shrinking turns.json leaves no duplicate or reordering', () => {
  const { root, store, key } = fixture()
  try {
    store.activeTurnLimit = 100
    for (let index = 0; index < 10; index++) store.saveTurn(key, turn('c' + index))
    const before = store.turns(key)
    // The sealed segment was written, the process stopped before turns.json was rewritten.
    json(store.file('chats', key, 'turn-history', '000001.json'), before.slice(0, 6))
    assert.deepEqual(new Store(root).turns(key).map(item => item.id), before.map(item => item.id))
    const restarted = new Store(root); restarted.activeTurnLimit = 4
    restarted.saveTurn(key, turn('c10'))
    assert.deepEqual(restarted.turns(key).map(item => item.id), [...before.map(item => item.id), 'c10'])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('older context snapshots are packed losslessly; packing is idempotent and survives an interrupted run', () => {
  const { root, store, key } = fixture()
  try {
    const directory = store.file('chats', key, 'contexts')
    for (let index = 0; index < 30; index++) {
      const dir = path.join(directory, 'turn' + index); fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'event-1.json'), JSON.stringify({ index, text: '上下文 '.repeat(50) }))
      const at = new Date(Date.now() - (30 - index) * 60000); fs.utimesSync(dir, at, at)
    }
    assert.equal(store.rotateContextSnapshots(key), 6)
    assert.equal(store.rotateContextSnapshots(key), 0, 'nothing left to pack')
    const raw = fs.readdirSync(directory).filter(name => name !== 'archive').sort()
    assert.equal(raw.length, 24); assert.ok(!raw.includes('turn0') && raw.includes('turn29'))
    const unpack = (name: string) => (JSON.parse(gunzipSync(fs.readFileSync(path.join(directory, 'archive', name + '.json.gz'))).toString('utf8')) as { files: Record<string, string> }).files
    assert.equal(JSON.parse(unpack('turn3')['event-1.json']).index, 3)
    // An interrupted earlier run (archive written, raw directory still present) plus a new attempt file merge.
    const again = path.join(directory, 'turn3'); fs.mkdirSync(again); fs.writeFileSync(path.join(again, 'event-2.json'), '{"retry":true}')
    const old = new Date(Date.now() - 3600000); fs.utimesSync(again, old, old)
    assert.equal(store.rotateContextSnapshots(key), 1)
    assert.deepEqual(Object.keys(unpack('turn3')).sort(), ['event-1.json', 'event-2.json'])
    assert.equal(fs.existsSync(again), false)
    // A directory still receiving snapshots (recent mtime) is never packed, even beyond the keep count.
    const busy = path.join(directory, 'turn4'); fs.mkdirSync(busy); fs.writeFileSync(path.join(busy, 'event-3.json'), '{}')
    assert.equal(store.rotateContextSnapshots(key, 0), 15, 'only directories quiet for 10 minutes are packed')
    assert.ok(fs.existsSync(busy))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('reading while another process appends and seals never fails, duplicates or reorders', async () => {
  const { root, store, key } = fixture()
  try {
    const { spawn } = await import('node:child_process')
    const script = `const {Store}=await import(${JSON.stringify(path.resolve('store.ts'))});const s=new Store(${JSON.stringify(root)});s.historySegmentBytes=600;for(let i=0;i<300;i++)s.append(${JSON.stringify(key)},'user','concurrent '+i)`
    const child = spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--input-type=module', '-e', script], { stdio: 'inherit' })
    const exited = once(child, 'exit')
    let done = false; void exited.then(() => { done = true })
    let reads = 0
    while (!done) {
      const seen = contents(store, key); reads++
      assert.deepEqual(seen, Array.from({ length: seen.length }, (_, index) => 'concurrent ' + index))
      await new Promise(resolve => setImmediate(resolve))
    }
    const [code] = await exited
    assert.equal(code, 0); assert.ok(reads > 5)
    assert.deepEqual(contents(store, key), Array.from({ length: 300 }, (_, index) => 'concurrent ' + index))
    assert.ok(sealed(store, key).length > 20)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('reading turns while another process saves and seals them never drops, duplicates or reorders', async () => {
  const { root, store, key } = fixture()
  try {
    const { spawn } = await import('node:child_process')
    const script = `const {Store}=await import(${JSON.stringify(path.resolve('store.ts'))});const s=new Store(${JSON.stringify(root)});s.activeTurnLimit=4;for(let i=0;i<200;i++){const at=new Date().toISOString();s.saveTurn(${JSON.stringify(key)},{id:'t'+i,content:'turn '+i,modelId:'',at,updatedAt:at,speakers:[]})}`
    const child = spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--input-type=module', '-e', script], { stdio: 'inherit' })
    const exited = once(child, 'exit')
    let done = false; void exited.then(() => { done = true })
    let reads = 0
    while (!done) {
      const seen = store.turns(key).map(item => item.id); reads++
      assert.deepEqual(seen, Array.from({ length: seen.length }, (_, index) => 't' + index))
      await new Promise(resolve => setImmediate(resolve))
    }
    const [code] = await exited
    assert.equal(code, 0); assert.ok(reads > 5)
    assert.deepEqual(store.turns(key).map(item => item.id), Array.from({ length: 200 }, (_, index) => 't' + index))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
