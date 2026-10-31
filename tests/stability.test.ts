import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { Store, json, staleLockDirectory } from '../store.ts'
import { actions, decide, executeExternal } from '../execution.ts'
import { saveRoutine, createRoutineScheduler, workOverview } from '../work.ts'
import { changeLife, lifeState } from '../social-state.ts'

function fixture() { fs.mkdirSync('.test-tmp', { recursive: true }); const root = fs.mkdtempSync(path.resolve('.test-tmp', 'stability-')); return { root, store: new Store(root) } }

test('lock directories orphaned before their owner record was written recover after 30 seconds, live owners stay protected', () => {
  const { root } = fixture()
  try {
    const lock = path.join(root, '.some-lock'), owner = path.join(lock, 'owner.json')
    fs.mkdirSync(lock)
    assert.equal(staleLockDirectory(lock, owner), false, 'a fresh lock without an owner may still be in creation')
    const old = new Date(Date.now() - 60000); fs.utimesSync(lock, old, old)
    assert.equal(staleLockDirectory(lock, owner), true)
    json(owner, { pid: process.pid }); fs.utimesSync(lock, old, old)
    assert.equal(staleLockDirectory(lock, owner), false, 'a live owner is never taken over')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('an orphaned work, social or external-operation lock no longer blocks forever', async () => {
  const { root, store } = fixture()
  try {
    store.saveAgent({ id: 'peer', name: 'Peer', modelId: '' }, 'r', '')
    const group = store.saveGroup('space', ['main', 'peer'])
    const old = new Date(Date.now() - 60000)
    for (const lock of [store.file('.work-lock'), store.file('chats', group.id, 'social', '.social-lock'), store.file('.tool-lock')]) { fs.mkdirSync(lock, { recursive: true }); fs.utimesSync(lock, old, old) }
    saveRoutine(store, { sessionId: group.id, name: 'r', instruction: 'x', intervalMinutes: 60, enabled: false })
    changeLife(store, group.id, state => { state.pauseReason = 'touched' })
    assert.equal(lifeState(store, group.id).pauseReason, 'touched')
    const chat = store.directSession('main'), controller = new AbortController()
    const run = executeExternal(store, chat.id, 'main', 't', 'e', 'write_file', { path: 'a.txt', content: 'ok' }, controller.signal, () => {})
    decide(store, chat.id, actions(store, chat.id)[0].id, true)
    await run
    assert.equal(fs.readFileSync(store.file('workspace', chat.id, 'a.txt'), 'utf8'), 'ok')
    assert.equal(fs.existsSync(store.file('.tool-lock')), false)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a routine whose conversation directory disappeared pauses alone instead of stalling every routine', async () => {
  const { root, store } = fixture()
  try {
    store.saveAgent({ id: 'peer', name: 'Peer', modelId: '' }, 'r', '')
    const gone = store.saveGroup('gone', ['main', 'peer'])
    saveRoutine(store, { sessionId: gone.id, name: 'r', instruction: 'x', intervalMinutes: 60, enabled: true })
    fs.rmSync(store.file('chats', gone.id), { recursive: true })
    await createRoutineScheduler(store, new Map(), () => true).tick()
    const routine = workOverview(store).routines.find(item => item.sessionId === gone.id)
    assert.equal(routine?.enabled, false)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('a shell command that ignores SIGTERM is force-stopped and releases the external-operation lock', { skip: process.platform === 'win32' }, async () => {
  const { root, store } = fixture()
  try {
    const chat = store.directSession('main'), controller = new AbortController()
    const run = executeExternal(store, chat.id, 'main', 't', 'e', 'shell', { command: "trap '' TERM; sleep 30 & wait; sleep 30" }, controller.signal, () => {})
    decide(store, chat.id, actions(store, chat.id)[0].id, true)
    await new Promise(resolve => setTimeout(resolve, 500))
    const began = Date.now(); controller.abort()
    await assert.rejects(run)
    assert.ok(Date.now() - began < 12000, 'stopped by the SIGKILL escalation, not by the command finishing')
    assert.equal(fs.existsSync(store.file('.tool-lock')), false)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
