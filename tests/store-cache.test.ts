import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Store, atomic } from '../store.ts'
import { redact } from '../execution.ts'

function temp() { const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.test-tmp'); fs.mkdirSync(base, { recursive: true }); return fs.mkdtempSync(path.join(base, 'cache-')) }

test('cached history follows every write, including another instance, and callers cannot mutate it', () => {
  const root = temp()
  try {
    const store = new Store(root), other = new Store(root)
    store.saveAgent({ id: 'peer', name: 'Peer', modelId: '' }, 'r', '')
    const session = store.saveGroup('cache', ['main', 'peer'])
    store.append(session.id, 'user', 'first')
    const read = store.messages(session.id)
    assert.deepEqual(read.map(message => message.content), ['first'])
    read[0].content = 'mutated'; read.push({ ...read[0], id: 'fake' })
    assert.deepEqual(store.messages(session.id).map(message => message.content), ['first'])
    other.append(session.id, 'user', 'second')
    assert.deepEqual(store.messages(session.id).map(message => message.content), ['first', 'second'])
    const file = store.file('chats', session.id, 'messages.jsonl'), lines = fs.readFileSync(file, 'utf8')
    atomic(file, lines.replace('"first"', '"FIRST"'))
    assert.deepEqual(store.messages(session.id).map(message => message.content), ['FIRST', 'second'])
    fs.rmSync(file)
    assert.deepEqual(store.messages(session.id), [])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('redaction picks up a credential saved after earlier redactions', () => {
  const root = temp()
  try {
    const store = new Store(root)
    assert.equal(redact(store, 'token cache-first-secret'), 'token cache-first-secret')
    store.saveModel({ name: 'm', model: 'm', baseUrl: 'http://127.0.0.1:1', apiKey: 'cache-first-secret' })
    assert.ok(!redact(store, 'token cache-first-secret').includes('cache-first-secret'))
    store.saveGo('cache-go-shared-secret', ['glm-5'])
    assert.ok(!redact(store, 'x cache-go-shared-secret').includes('cache-go-shared-secret'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('appends keep complete JSONL lines, extend the cached history and leave no temp files', () => {
  const root = temp()
  try {
    const store = new Store(root)
    store.saveAgent({ id: 'peer', name: 'Peer', modelId: '' }, 'r', '')
    const session = store.saveGroup('append', ['main', 'peer']), file = store.file('chats', session.id, 'messages.jsonl')
    for (let index = 0; index < 5; index++) store.append(session.id, 'user', 'line ' + index)
    assert.equal(store.messages(session.id).length, 5)
    const appended = store.append(session.id, 'user', 'line 5')
    appended.content = 'changed by caller'
    assert.deepEqual(store.messages(session.id).map(message => message.content).slice(-2), ['line 4', 'line 5'])
    assert.deepEqual(new Store(root).messages(session.id).map(message => message.content), store.messages(session.id).map(message => message.content))
    assert.ok(fs.readFileSync(file, 'utf8').split('\n').slice(0, -1).every(line => JSON.parse(line)))
    assert.deepEqual(fs.readdirSync(path.dirname(file)).filter(name => name.endsWith('.tmp')), [])
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
