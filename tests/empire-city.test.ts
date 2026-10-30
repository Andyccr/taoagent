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
import { computeCity, PER_RING, CORE_RINGS, STYLE_ANGLE } from '../public/city/layout.js'
import { computeMetropolis, assignClaims, circleHitsBox, CANAL, CITY_EDGE, OUTER_EDGE, HARBOUR } from '../public/city/metropolis-plan.js'
import { makeRoadIndex, distanceToRoads, pointSegmentDistance } from '../public/city/metropolis-streets.js'
import { CANAL_HALF } from '../public/city/metropolis-roads.js'

interface Plot { ring: number; angle: number; bot: { id: string } | null }
interface Lot { id: string; x: number; z: number; r: number; angle: number; style: string; kind: string; district: string; claimable: boolean }
interface Claimed extends Lot { bot: { id: string; style: string } }
interface Layout { lead: { id: string } | null; plots: Plot[]; rings: number; claimed: Claimed[]; unplaced: unknown[] }
interface Wonder { id: string; kind: string; x0: number; x1: number; z0: number; z1: number }
interface Plan { lots: Lot[]; wonders: Wonder[] }
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

test('core layout keeps 18 plots in 3 rings and overflows deterministically into claimable city lots', () => {
  const make = (count: number) => [{ id: 'lead', style: 'chinese', lead: true }, ...Array.from({ length: count }, (_, index) => ({ id: 'agent-' + String(index).padStart(2, '0'), style: ['roman', 'greek', 'modern', 'chinese'][index % 4] }))]
  const claim = (bots: { id: string; style: string }[]) => assignClaims(bots)
  for (const count of [0, 1, 5, 17, 18, 19, 30, 60]) {
    const layout = computeCity(make(count), { claim }) as Layout
    const taken = layout.plots.filter(plot => plot.bot)
    assert.equal(layout.lead?.id, 'lead')
    assert.equal(layout.rings, CORE_RINGS)
    assert.equal(layout.plots.length, CORE_RINGS * PER_RING)
    assert.equal(taken.length, Math.min(count, 18))
    assert.equal(layout.claimed.length, Math.max(0, count - 18))
    const ids = [...taken.map(plot => plot.bot?.id), ...layout.claimed.map(plot => plot.bot.id)]
    assert.equal(new Set(ids).size, count, 'every agent has exactly one building')
    assert.equal(new Set(layout.claimed.map(plot => plot.id)).size, layout.claimed.length, 'no lot is claimed twice')
    assert(layout.claimed.every(plot => plot.claimable), 'agents only claim claimable lots')
    if (count < 18) assert(layout.plots.some(plot => !plot.bot), 'a 待建 plot stays free in the core')
  }
  const first = (computeCity(make(30), { claim }) as Layout).claimed.map(plot => plot.bot.id + '@' + plot.id)
  const again = (computeCity(make(30), { claim }) as Layout).claimed.map(plot => plot.bot.id + '@' + plot.id)
  assert.deepEqual(first, again, 'claims are deterministic')
  const roman = (computeCity(make(30), { claim }) as Layout).claimed.find(plot => plot.bot.style === 'roman')
  assert.equal(roman?.style, 'roman', 'claims prefer a lot of the agent\'s own style')
  assert.equal((computeCity(make(1)) as Layout).plots.find(plot => plot.bot?.id === 'agent-00')?.angle, 90, 'roman agents prefer the Roman quarter')
  assert.equal((computeCity(make(25)) as Layout).unplaced.length, 7, 'without a claim function overflow is reported, not invented')
})

test('the metropolis is an organic city with a mixed outer ring, collision free and anchored by wonders', () => {
  const plan = computeMetropolis() as any
  const lots = plan.lots as any[]
  assert(lots.length >= 1200, 'hundreds of buildings: ' + lots.length)
  assert(lots.filter((lot: any) => lot.claimable).length >= 450, 'plenty of claimable lots')
  assert(lots.filter((lot: any) => lot.zone === 'inner').length >= 380, 'a dense inner city')
  assert(lots.filter((lot: any) => lot.zone === 'blend').length >= 250, 'a mixed outer blend')

  const zones = new Set(lots.map((lot: any) => lot.zone))
  for (const zone of ['inner', 'blend', 'suburb', 'industrial', 'harbour', 'country']) assert(zones.has(zone), zone)
  const innerDistricts = new Set(lots.filter((lot: any) => lot.zone === 'inner').map((lot: any) => lot.district))
  assert.deepEqual([...innerDistricts].sort(), ['chinese', 'greek', 'mixed', 'modern', 'roman'])

  const blend = lots.filter((lot: any) => lot.zone === 'blend')
  const blendStyles = new Set(blend.filter((lot: any) => lot.style !== 'common').map((lot: any) => lot.style))
  assert(blendStyles.size >= 4, 'the blend mixes styles: ' + [...blendStyles].join(','))
  const gap = (a: number, b: number) => { const d = Math.abs((((a - b) % 360) + 360) % 360); return Math.min(d, 360 - d) }
  const styleAngles = STYLE_ANGLE as Record<string, number>
  const stray = blend.filter((lot: any) => {
    let nearest = '', distance = Infinity
    for (const style of Object.keys(styleAngles)) {
      const d = gap(lot.angle, styleAngles[style])
      if (d < distance) { distance = d; nearest = style }
    }
    return lot.style !== 'common' && lot.style !== nearest
  }).length
  assert(stray >= 30, 'the blend strays from the quarters: ' + stray)

  const sizes = lots.map((lot: any) => lot.size)
  assert(Math.max(...sizes) - Math.min(...sizes) >= 1.5, 'lot sizes are organic')
  const offRadial = lots.filter((lot: any) => gap(lot.rotY * 180 / Math.PI, Math.atan2(-lot.x, -lot.z) * 180 / Math.PI) > 0.1 * 180 / Math.PI).length
  assert(offRadial / lots.length >= 0.3, 'buildings face streets, not only the centre: ' + offRadial)
  const firstBand = lots.filter((lot: any) => lot.zone === 'inner' && lot.band === 3)
  assert(firstBand.length > 0)
  assert(new Set(firstBand.map((lot: any) => Math.round(lot.r * 10) / 10)).size >= 20, 'the inner row is not a perfect circle')

  const roads = makeRoadIndex(plan.roads)
  const canalPoints = plan.canal.pts as number[][]
  const canalDistance = (x: number, z: number) => {
    let best = Infinity
    for (let i = 0; i < canalPoints.length; i++) {
      const a = canalPoints[i], b = canalPoints[(i + 1) % canalPoints.length]
      const d = pointSegmentDistance(x, z, a[0], a[1], b[0], b[1])
      if (d < best) best = d
    }
    return best
  }
  const CELL = 16
  const buckets = new Map<string, any[]>()
  for (const lot of lots) {
    const key = Math.floor(lot.x / CELL) + ':' + Math.floor(lot.z / CELL)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(lot); else buckets.set(key, [lot])
  }
  for (const lot of lots) {
    const half = lot.size / 2
    assert(distanceToRoads(roads, lot.x, lot.z) >= half + 0.39, lot.id + ' is off the roads')
    assert(canalDistance(lot.x, lot.z) >= CANAL_HALF + half + 0.79, lot.id + ' is off the canal')
    for (const wonder of plan.wonders) assert(!circleHitsBox(lot.x, lot.z, half, wonder, 1.1), lot.id + ' overlaps ' + wonder.id)
    const cx = Math.floor(lot.x / CELL), cz = Math.floor(lot.z / CELL)
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const bucket = buckets.get(ix + ':' + iz)
      if (!bucket) continue
      for (const other of bucket) {
        if (other === lot) continue
        assert((lot.size + other.size) / 2 + 0.29 <= Math.hypot(lot.x - other.x, lot.z - other.z), lot.id + ' overlaps ' + other.id)
      }
    }
  }

  assert.equal(plan.wonders.length, 8)
  assert.deepEqual(plan.wonders.map((wonder: any) => wonder.id).sort(), ['acropolis', 'arch', 'colosseum', 'pagoda', 'palace', 'pantheon', 'supertall', 'wall'])
  for (const a of plan.wonders) {
    assert(Math.hypot(a.x, a.z) > CANAL.outer, a.id + ' stays outside the canal')
    for (const b of plan.wonders) if (a !== b) assert(!(a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1), a.id + ' overlaps ' + b.id)
  }
  assert.equal(plan.cityEdge, CITY_EDGE)
  assert.equal(plan.outerEdge, OUTER_EDGE)
  assert.deepEqual(plan.sea, HARBOUR)
  assert(plan.fields.length >= 40, 'farms surround the city: ' + plan.fields.length)
  assert(plan.parks.length >= 10, 'parks dot the city: ' + plan.parks.length)

  assert.equal(computeMetropolis(), plan, 'the plan is computed once and is static')
  assert.equal(new Set(lots.map((lot: any) => lot.id)).size, lots.length, 'lot ids are unique')
  const bots = Array.from({ length: 30 }, (_, index) => ({ id: 'bot-' + String(index).padStart(2, '0'), style: ['chinese', 'greek', 'roman', 'modern'][index % 4] }))
  const first = assignClaims(bots as any, plan)
  const again = assignClaims(bots as any, plan)
  const firstIds = bots.map(bot => first.get(bot.id)?.id)
  const againIds = bots.map(bot => again.get(bot.id)?.id)
  assert.deepEqual(firstIds, againIds, 'claims are deterministic')
  assert.equal(new Set(firstIds).size, bots.length, 'every bot gets its own lot')
  for (const bot of bots) { const lot = first.get(bot.id); assert(lot && lot.claimable, 'agents only claim claimable lots') }
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
    assert.equal(value.leadSource, 'main')
    assert.deepEqual(value.teams.map(team => [team.name, team.coordinatorId, team.memberIds.length]), [['工程组', 'lead', 3]])
    const encoded = JSON.stringify(value)
    for (const secret of ['SECRET_RULE', 'SECRET_PROMPT', 'SECRET_BODY', 'SECRET_ERROR', 'SECRET_TASK', 'SECRET_RESULT', 'SECRET_ARG']) assert.equal(encoded.includes(secret), false, secret)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('lead: main by default, an explicit home/empire-city.json choice wins, invalid choices fall back to main', () => {
  const root = home(), store = new Store(root)
  try {
    store.saveAgent({ id: 'lead', name: '统筹者', responsibilities: '协调' }, '', '')
    store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现' }, '', '')
    store.saveGroup('工程组', ['main', 'lead', 'coder'], undefined, { coordinatorId: 'lead' })
    const leadOf = () => { const value = civilizationSnapshot(store, Date.now(), []); return [value.leadSource, value.citizens.filter(item => item.lead).map(item => item.id)] }
    assert.deepEqual(leadOf(), ['main', ['main']])
    fs.writeFileSync(store.file('empire-city.json'), JSON.stringify({ leadAgentId: 'coder' }))
    assert.deepEqual(leadOf(), ['configured', ['coder']])
    fs.writeFileSync(store.file('empire-city.json'), JSON.stringify({ leadAgentId: 'nobody' }))
    assert.deepEqual(leadOf(), ['main', ['main']], 'an unknown configured agent falls back to main')
    fs.writeFileSync(store.file('empire-city.json'), 'NOT JSON')
    assert.deepEqual(leadOf(), ['main', ['main']])
    assert.throws(() => store.archiveAgent('main', '测试'), /主助手受保护/, 'main cannot leave, so it keeps the hall')
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
    const icon = await fetch(base + '/favicon.ico')
    assert.equal(icon.status, 200)
    assert.match(icon.headers.get('content-type') || '', /image\/svg\+xml/)
    assert.match(html, /rel="icon" href="\/favicon.svg"/)
    const bundle = await (await fetch(base + '/city.bundle.js')).text()
    assert.match(bundle, /待建/)
    assert.equal(/https?:\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}\/[^\s'"]*\.(?:js|json|png|jpg|glb|gltf|woff2?)/i.test(bundle), false, 'the city loads no remote assets')
  } finally { app.server.closeAllConnections(); await new Promise<void>(resolve => app.server.close(() => resolve())); fs.rmSync(root, { recursive: true, force: true }) }
})
