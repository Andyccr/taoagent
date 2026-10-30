import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { once } from 'node:events'
import { Store, json } from '../store.ts'
import { civilizationSnapshot } from '../civilization.ts'
import { createApp } from '../app.ts'

function home() { fs.mkdirSync('.test-tmp', { recursive: true }); return fs.mkdtempSync(path.resolve('.test-tmp', 'civilization-')) }
function at(now: number, ago: number) { return new Date(now - ago).toISOString() }
function turn(id: string, when: string, speakers: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return { id, content: 'SECRET_PROMPT', modelId: 'secret-model', at: when, updatedAt: when, speakers, ...extra }
}

test('civilization reads real agents and never invents work, quotas, or private text', () => {
  const root = home(), store = new Store(root)
  try {
    store.saveModel({ id: 'secret-model', name: 'secret', model: 'mock', baseUrl: 'http://127.0.0.1:9', apiKey: 'secret-api-key' })
    store.saveAgent({ id: 'leadbot', name: '统筹者', responsibilities: '代码实现也要协调' }, 'SECRET_RULE', 'SECRET_MEMORY')
    store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现、调试和测试' }, '', '')
    store.saveAgent({ id: 'scholar', name: '考证者', responsibilities: '研究论文与证据' }, '', '')
    store.saveAgent({ id: 'signal', name: '监测者', responsibilities: '数据监控与通信指标' }, '', '')
    store.saveAgent({ id: 'blank', name: '无名' }, '', '')
    const group = store.saveGroup('工作组', ['main', 'leadbot', 'coder', 'scholar', 'signal', 'blank'], undefined, { coordinatorId: 'leadbot' })
    const now = Date.parse('2026-10-30T12:00:00.000Z')
    json(store.file('chats', group.id, 'turns.json'), [turn('live', at(now, 1000), [{ agentId: 'coder', eventId: 'run', status: 'running', taskId: 'build' }, { agentId: 'scholar', eventId: 'wait', status: 'pending' }], { usage: { modelCalls: 1, toolCalls: 0, estimatedInputTokens: 99999, measuredTotalTokens: 42, usageReports: 1 } })])
    json(store.file('chats', group.id, 'tasks.json'), [{ id: 'build', title: '公开标题', description: 'SECRET_TASK_BODY', fromAgentId: 'leadbot', assigneeId: 'coder', status: 'pending', at: at(now, 5000) }])
    json(store.file('chats', group.id, 'actions.json'), [{ id: 'approve', agentId: 'signal', status: 'pending', args: { content: 'SECRET_ARGUMENT' }, at: at(now, 1000) }])
    const value = civilizationSnapshot(store, now, [group.id])
    const byId = Object.fromEntries(value.citizens.map(citizen => [citizen.id, citizen]))
    assert.equal(value.llmCalls, 0)
    assert.equal(value.source, 'live')
    assert.equal(value.usage.subscription, 'Unavailable')
    assert.equal(value.usage.remaining, 'Unavailable')
    assert.equal(value.usage.reset, 'Unavailable')
    assert.equal(value.usage.reportedTokens, 42)
    assert.equal(byId.coder.activity, 'working')
    assert.equal(byId.coder.district, 'rome')
    assert.equal(byId.scholar.activity, 'idle')
    assert.equal(byId.scholar.district, 'greece')
    assert.equal(byId.signal.activity, 'waiting')
    assert.equal(byId.signal.district, 'metro')
    assert.equal(byId.leadbot.activity, 'delegating')
    assert.equal(byId.leadbot.district, 'rome', 'without the hall the coordinator is placed by its recorded role')
    assert.equal(byId.leadbot.districtSource, 'role')
    assert.equal(byId.leadbot.lead, false)
    assert.equal(byId.main.lead, true, 'the main assistant holds the central hall by default')
    assert.equal(byId.main.districtSource, 'lead')
    assert.equal(byId.main.plot, -1)
    assert.equal(value.leadSource, 'main')
    assert.equal(byId.blank.roleSource, 'none')
    assert.equal(byId.blank.districtSource, 'fallback')
    assert.equal(byId.blank.colorSource, 'fallback')
    assert.equal(byId.blank.activity, 'idle')
    assert.equal(value.usage.runningTasks, 1)
    assert.equal(value.usage.waitingForUser, 1)
    assert.equal(value.tasks[0].title, '公开标题')
    assert.equal(value.handoffs[0].fromAgentId, 'leadbot')
    const encoded = JSON.stringify(value)
    for (const secret of ['SECRET_PROMPT', 'SECRET_RULE', 'SECRET_MEMORY', 'SECRET_TASK_BODY', 'SECRET_ARGUMENT', 'secret-api-key', '99999']) assert.equal(encoded.includes(secret), false)
    const plots = value.citizens.filter(citizen => citizen.district === byId.coder.district && citizen.plot >= 0).map(citizen => citizen.plot)
    assert.equal(new Set(plots).size, plots.length)
    assert.equal(value.buildings.filter(item => item.kind === 'landmark').length, 4)
    assert.equal(value.buildings.filter(item => item.kind === 'reserved').length, 8)
    assert.equal(value.buildings.filter(item => item.kind === 'workplace').length, value.citizens.length - 1)
    store.saveAgent({ id: 'newcomer', name: '新成员', responsibilities: '资料研究' }, '', '')
    const added = civilizationSnapshot(store, now, [])
    assert.equal(added.citizens.some(citizen => citizen.id === 'newcomer' && citizen.district === 'greece'), true)
    store.archiveAgent('blank', '离开')
    assert.equal(civilizationSnapshot(store, now, []).citizens.some(citizen => citizen.id === 'blank'), false)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('stale work needs a missed heartbeat, and failures are not inferred from silence', () => {
  const root = home(), store = new Store(root), now = Date.parse('2026-10-30T12:00:00.000Z')
  try {
    store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现' }, '', '')
    const group = store.saveGroup('工程', ['main', 'coder'])
    const writeTurn = (value: ReturnType<typeof turn>) => json(store.file('chats', group.id, 'turns.json'), [value])
    writeTurn(turn('old', at(now, 11 * 60 * 1000), [{ agentId: 'coder', eventId: 'run', status: 'running', error: 'SECRET_ERROR' }]))
    assert.equal(civilizationSnapshot(store, now, []).citizens.find(citizen => citizen.id === 'coder')?.activity, 'stale')
    assert.equal(civilizationSnapshot(store, now, [group.id]).citizens.find(citizen => citizen.id === 'coder')?.activity, 'working')
    writeTurn(turn('done', at(now, 5000), [{ agentId: 'coder', eventId: 'done', status: 'complete' }]))
    assert.equal(civilizationSnapshot(store, now, []).citizens.find(citizen => citizen.id === 'coder')?.activity, 'complete')
    writeTurn(turn('older-done', at(now, 30000), [{ agentId: 'coder', eventId: 'done', status: 'complete' }]))
    assert.equal(civilizationSnapshot(store, now, []).citizens.find(citizen => citizen.id === 'coder')?.activity, 'idle')
    writeTurn(turn('paused', at(now, 1000), [{ agentId: 'coder', eventId: 'stop', status: 'failed', error: '已暂停，已执行工具保留' }]))
    assert.equal(civilizationSnapshot(store, now, []).citizens.find(citizen => citizen.id === 'coder')?.activity, 'idle')
    writeTurn(turn('failed', at(now, 1000), [{ agentId: 'coder', eventId: 'bad', status: 'failed', error: 'SECRET_ERROR' }]))
    const failed = civilizationSnapshot(store, now, [])
    assert.equal(failed.citizens.find(citizen => citizen.id === 'coder')?.activity, 'error')
    assert.equal(JSON.stringify(failed).includes('SECRET_ERROR'), false)
    fs.writeFileSync(store.file('chats', group.id, 'tasks.json'), 'NOPE')
    const broken = civilizationSnapshot(store, now, [group.id])
    assert.equal(broken.tasksState, 'unavailable')
    assert.equal(broken.citizens.find(citizen => citizen.id === 'coder')?.activity, 'error')
    assert.equal(broken.citizens.find(citizen => citizen.id === 'main')?.activity === 'working', false)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('civilization route is read only and the view does not call a model', async () => {
  const root = home(), app = createApp(root, { seed: false })
  const ui = fs.readFileSync('public/civilization.js', 'utf8')
  const city = fs.readFileSync('public/city-entry.js', 'utf8')
  try {
    assert.equal(ui.includes('POST'), false)
    assert.equal(ui.includes('streamModel'), false)
    assert.equal(city.includes('streamModel'), false)
    assert.match(ui, /source: 'simulation'/)
    assert.match(ui, /publish\(real\)/)
    app.server.listen(0, '127.0.0.1')
    await once(app.server, 'listening')
    const address = app.server.address()
    assert(address && typeof address === 'object')
    const base = 'http://127.0.0.1:' + address.port
    const live = await fetch(base + '/api/civilization')
    assert.equal(live.status, 200)
    const body = await live.json() as ReturnType<typeof civilizationSnapshot>
    assert.equal(body.llmCalls, 0)
    assert.equal(body.citizens.some(citizen => citizen.id === 'main' && citizen.activity === 'idle'), true)
    const denied = await fetch(base + '/api/civilization', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.example' }, body: '{}' })
    assert.equal(denied.status, 403)
    const missing = await fetch(base + '/api/civilization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(missing.status, 404)
    const html = await (await fetch(base + '/')).text()
    assert.match(html, /id="civ-open"/)
    assert.match(await (await fetch(base + '/civilization.js')).text(), /模拟文明/)
    const bundle = await fetch(base + '/city.bundle.js')
    assert.equal(bundle.status, 200)
    assert.match(await bundle.text(), /civ-canvas/)
  } finally { app.server.closeAllConnections(); await new Promise<void>(resolve => app.server.close(() => resolve())); fs.rmSync(root, { recursive: true, force: true }) }
})
