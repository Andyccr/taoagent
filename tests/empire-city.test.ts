import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { once } from 'node:events'
import { Store, json } from '../store.ts'
import { civilizationSnapshot, type CitizenView, type CivilizationSnapshot } from '../civilization.ts'
import { createApp } from '../app.ts'
// Browser modules are plain ESM JavaScript; their pure helpers run in Node without a DOM.
import { visualState, rosterFrom } from '../public/city-entry.js'
import { computeCity, PER_RING } from '../public/city/layout.js'

interface Plot { ring: number; angle: number; bot: { id: string } | null }
interface Layout { lead: { id: string } | null; plots: Plot[]; rings: number }
interface RosterEntry { id: string; name: string; style: string; lead: boolean; accessory: string }

function home() { fs.mkdirSync('.test-tmp', { recursive: true }); return fs.mkdtempSync(path.resolve('.test-tmp', 'empire-')) }
const citizen = (activity: CitizenView['activity'], freshness: CitizenView['freshness'] = 'fresh') => ({ activity, freshness }) as CitizenView

test('every TaoAgent activity maps to exactly one city state, and offline closes the gates', () => {
  const expected: Record<CitizenView['activity'], string> = { working: 'working', delegating: 'working', waiting: 'waiting', error: 'error', complete: 'completed', stale: 'stale', unknown: 'stale', idle: 'idle' }
  for (const [activity, state] of Object.entries(expected)) assert.equal(visualState(citizen(activity as CitizenView['activity'])), state, activity)
  assert.equal(visualState(citizen('idle', 'stale')), 'stale')
  for (const activity of Object.keys(expected)) assert.equal(visualState(citizen(activity as CitizenView['activity']), false), 'disconnected')
})

test('the roster comes from snapshot citizens: style by quarter, one lead in the hall', () => {
  const snapshot = { citizens: [
    { id: 'a', name: '统筹', district: 'china', lead: true, color: '#111111', role: '' },
    { id: 'b', name: '工程', district: 'rome', lead: false, color: '#222222', role: '代码' },
    { id: 'c', name: '学者', district: 'greece', lead: false, color: '#333333', role: '' },
    { id: 'd', name: '数据', district: 'metro', lead: false, color: '#444444', role: '' },
  ] } as unknown as CivilizationSnapshot
  const roster = rosterFrom(snapshot) as RosterEntry[]
  assert.deepEqual(roster.map(item => item.style), ['chinese', 'roman', 'greek', 'modern'])
  assert.equal(roster.filter(item => item.lead).length, 1)
  assert.equal(roster[0].accessory, 'gavel')
  assert.deepEqual(rosterFrom({ citizens: [] } as unknown as CivilizationSnapshot), [])
})

test('layout gives each agent its own plot, keeps reserved plots and grows rings automatically', () => {
  const make = (count: number) => [{ id: 'lead', style: 'chinese', lead: true }, ...Array.from({ length: count }, (_, index) => ({ id: 'agent-' + index, style: ['roman', 'greek', 'modern', 'chinese'][index % 4] }))]
  for (const count of [0, 1, 5, 6, 11, 12, 30]) {
    const layout = computeCity(make(count)) as Layout
    const taken = layout.plots.filter(plot => plot.bot)
    assert.equal(layout.lead?.id, 'lead')
    assert.equal(taken.length, count)
    assert.equal(new Set(taken.map(plot => plot.bot?.id)).size, count)
    const outer = layout.plots.filter(plot => plot.ring === layout.rings)
    assert.equal(outer.length, PER_RING)
    assert(outer.some(plot => !plot.bot), 'outer ring keeps a 待建 plot for the next agent')
    assert(layout.rings >= 2)
  }
  assert(((computeCity(make(30)) as Layout).rings) > ((computeCity(make(5)) as Layout).rings))
  const roman = (computeCity(make(1)) as Layout).plots.find(plot => plot.bot?.id === 'agent-0')
  assert.equal(roman?.angle, 90, 'roman agents prefer the Roman quarter')
})

test('snapshot events and teams are real, ordered and free of private text', () => {
  const root = home(), store = new Store(root), now = Date.parse('2026-10-30T12:00:00.000Z')
  try {
    store.saveAgent({ id: 'lead', name: '统筹者', responsibilities: '协调与派工' }, 'SECRET_RULE', '')
    store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现' }, '', '')
    const group = store.saveGroup('工程组', ['main', 'lead', 'coder'], undefined, { coordinatorId: 'lead' })
    const iso = (ago: number) => new Date(now - ago).toISOString()
    json(store.file('chats', group.id, 'turns.json'), [
      { id: 't1', content: 'SECRET_PROMPT', modelId: 'm', at: iso(9000), updatedAt: iso(8000), speakers: [{ agentId: 'coder', eventId: 'e1', status: 'complete', body: 'SECRET_BODY' }] },
      { id: 't2', content: 'SECRET_PROMPT', modelId: 'm', at: iso(3000), updatedAt: iso(2000), speakers: [{ agentId: 'coder', eventId: 'e2', status: 'failed', error: 'SECRET_ERROR' }] },
    ])
    json(store.file('chats', group.id, 'tasks.json'), [{ id: 'k', title: '公开任务', description: 'SECRET_TASK', fromAgentId: 'lead', assigneeId: 'coder', status: 'complete', at: iso(7000), result: 'SECRET_RESULT', resultHistory: [{ result: 'SECRET_RESULT', at: iso(5000) }] }])
    json(store.file('chats', group.id, 'actions.json'), [{ id: 'act', agentId: 'coder', name: 'shell', status: 'approved', args: { command: 'SECRET_ARG' }, at: iso(4000) }])
    const value = civilizationSnapshot(store, now, [])
    assert.deepEqual(value.events.map(event => event.kind), ['error', 'waiting', 'delivered', 'handoff', 'complete'])
    const handoff = value.events.find(event => event.kind === 'handoff')
    assert.equal(handoff?.agentId, 'lead'); assert.equal(handoff?.toAgentId, 'coder'); assert.equal(handoff?.title, '公开任务')
    assert.equal(value.leadSource, 'coordinator')
    assert.deepEqual(value.teams.map(team => [team.name, team.coordinatorId, team.memberIds.length]), [['工程组', 'lead', 3]])
    const encoded = JSON.stringify(value)
    for (const secret of ['SECRET_RULE', 'SECRET_PROMPT', 'SECRET_BODY', 'SECRET_ERROR', 'SECRET_TASK', 'SECRET_RESULT', 'SECRET_ARG']) assert.equal(encoded.includes(secret), false, secret)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('without a coordinator the main assistant holds the hall; with no agents nothing is invented', () => {
  const root = home(), store = new Store(root)
  try {
    store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现' }, '', '')
    const empty = civilizationSnapshot(store, Date.now(), [])
    assert.deepEqual(empty.events, [])
    assert.deepEqual(empty.teams, [])
    assert.equal(empty.citizens.every(item => item.activity === 'idle'), true)
    if (empty.citizens.some(item => item.id === 'main')) {
      assert.equal(empty.leadSource, 'main')
      assert.equal(empty.citizens.find(item => item.id === 'main')?.lead, true)
    } else assert.equal(empty.leadSource, 'none')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('the live route reflects a real state change on the next poll and the page ships the city', async () => {
  const root = home(), app = createApp(root, { seed: false })
  try {
    app.store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现' }, '', '')
    const group = app.store.saveGroup('工程组', ['main', 'coder'])
    app.server.listen(0, '127.0.0.1')
    await once(app.server, 'listening')
    const address = app.server.address()
    assert(address && typeof address === 'object')
    const base = 'http://127.0.0.1:' + address.port
    const read = async () => await (await fetch(base + '/api/civilization')).json() as CivilizationSnapshot
    assert.equal((await read()).citizens.find(item => item.id === 'coder')?.activity, 'idle')
    const now = new Date().toISOString()
    json(app.store.file('chats', group.id, 'turns.json'), [{ id: 'live', content: '', modelId: group.modelId, at: now, updatedAt: now, speakers: [{ agentId: 'coder', eventId: 'run', status: 'running' }] }])
    const after = await read()
    assert.equal(after.citizens.find(item => item.id === 'coder')?.activity, 'working')
    assert.equal(after.events[0]?.kind, 'working')
    const html = await (await fetch(base + '/')).text()
    assert.match(html, /帝国之城/)
    const ui = await (await fetch(base + '/civilization.js')).text()
    assert.match(ui, /回放/)
    const bundle = await (await fetch(base + '/city.bundle.js')).text()
    assert.match(bundle, /待建/)
    assert.equal(/https?:\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}\/[^\s'"]*\.(?:js|json|png|jpg|glb|gltf|woff2?)/i.test(bundle), false, 'the city loads no remote assets')
  } finally { app.server.closeAllConnections(); await new Promise<void>(resolve => app.server.close(() => resolve())); fs.rmSync(root, { recursive: true, force: true }) }
})
