// 帝国之城 renderer entry. Bundled to public/city.bundle.js (npm run build:city).
// Turns the live /api/civilization snapshot into the procedural Empire City scene (public/city/*).
// Pure presentation: it never writes data and never calls a model.
import { createCity as createScene } from './city/city.js'

export const STYLE_OF = { china: 'chinese', rome: 'roman', greece: 'greek', metro: 'modern' }
const DISTRICT_OF = { chinese: 'china', roman: 'rome', greek: 'greece', modern: 'metro' }
const ACCESSORY_OF = { china: 'briefcase', rome: 'laptop', greece: 'scroll', metro: 'magnifier' }
const QUARTERS = {
  zh: { chinese: '宫城', roman: '罗马工程区', greek: '希腊学园', modern: '现代都会' },
  en: { chinese: 'Palace', roman: 'Roman works', greek: 'Greek academy', modern: 'Metropolis' },
}
const USAGE = {
  zh: (u) => ['帝国之城 · 实时', `成员 ${u.activeAgents ?? '—'} · 执行 ${u.runningTasks ?? '—'}`, `待批 ${u.waitingForUser ?? '—'} · 待办 ${u.waitingTasks ?? '—'}`],
  en: (u) => ['Empire City · live', `Agents ${u.activeAgents ?? '—'} · Running ${u.runningTasks ?? '—'}`, `Approvals ${u.waitingForUser ?? '—'} · Open ${u.waitingTasks ?? '—'}`],
}

// TaoAgent activity -> scene state. Only what the snapshot reports; nothing is inferred here.
export function visualState(citizen, connected = true) {
  if (!connected) return 'disconnected'
  switch (citizen.activity) {
    case 'working': case 'delegating': return 'working'
    case 'waiting': return 'waiting'
    case 'error': return 'error'
    case 'complete': return 'completed'
    case 'stale': case 'unknown': return 'stale'
    default: return citizen.freshness === 'stale' ? 'stale' : 'idle'
  }
}

// Roster for the layout: one building per real agent, style from its quarter, lead in the central hall.
export function rosterFrom(snapshot) {
  return (snapshot?.citizens || []).map((citizen) => ({
    id: citizen.id,
    name: citizen.name,
    dept: citizen.role || '',
    color: citizen.color || '#8a6232',
    accessory: citizen.lead ? 'gavel' : ACCESSORY_OF[citizen.district] || 'scroll',
    style: STYLE_OF[citizen.district] || 'roman',
    lead: !!citizen.lead,
  }))
}
export function rosterKey(roster) { return JSON.stringify(roster.map((b) => [b.id, b.name, b.style, b.lead, b.color])) }
export function districtOfStyle(style) { return DISTRICT_OF[style] || null }

export function createCity(stage, hooks = {}) {
  let scene = null, key = '', settings = {}, snapshot = null, visible = true, selected = [], followId = null, minimapOn = false, minimapCanvas = null
  const animated = new Set()
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  const language = () => (settings.language === 'en' ? 'en' : 'zh')

  function build(roster) {
    scene?.dispose()
    scene = createScene(stage, roster, {
      lowPower: settings.quality === 'low' || (settings.quality !== 'high' && coarse),
      emperor: { name: language() === 'en' ? 'You' : '你', color: '#d9a520' },
      quarters: QUARTERS[language()],
      quality: settings.quality,
      onPick: (hit) => hooks.onPick?.(hit.type === 'agent' ? { type: 'agent', id: hit.id } : hit.type === 'wonder' ? { type: 'wonder', id: hit.id, name: hit.name } : { type: 'reserved', id: 'reserved' }),
      onAdaptive: hooks.onAdaptive,
    })
    scene.setOptions(settings)
    scene.setVisible(visible)
    scene.select(selected)
    if (minimapOn && minimapCanvas) { scene.bindMinimap?.(minimapCanvas); scene.setMinimap?.(true) }
    if (typeof window !== 'undefined') window.__empireCity = scene
  }
  function apply() {
    if (!snapshot) return
    const roster = rosterFrom(snapshot)
    const next = rosterKey(roster) + '|' + (settings.quality || '') + '|' + language()
    if (next !== key) { key = next; build(roster) }
    const connected = snapshot.connected !== false
    scene.setSnapshot?.(snapshot)
    scene.setBots(snapshot.citizens.map((citizen) => ({ id: citizen.id, state: visualState(citizen, connected), label: citizen.taskTitle || citizen.detail || '' })))
    scene.setUsageLines(connected ? USAGE[language()](snapshot.usage || {}) : [language() === 'en' ? 'Local service unreachable' : '本机服务未连接'])
    // Each real handoff walks once; replay snapshots carry their own ids.
    for (const handoff of snapshot.handoffs || []) {
      if (animated.has(handoff.id)) continue
      animated.add(handoff.id)
      if (connected) scene.handoff(handoff.fromAgentId, handoff.toAgentId)
    }
    if (animated.size > 500) for (const id of [...animated].slice(0, 250)) animated.delete(id)
    if (followId) scene.focus(followId)
  }
  return {
    setSnapshot(next) { snapshot = next; apply() },
    setSettings(next) { const rebuild = scene && (next.quality !== settings.quality || next.language !== settings.language); settings = { ...next }; if (rebuild) { key = ''; apply() } else scene?.setOptions(settings) },
    setVisible(next) { visible = !!next; scene?.setVisible(visible) },
    select(ids) {
      const next = Array.isArray(ids) ? ids : ids ? [ids] : []
      const changed = next.join() !== selected.join()
      selected = next; scene?.select(selected)
      // A newly picked single agent is small in a city-scale view: glide to it once (polls re-select without moving).
      if (changed && next.length === 1 && !followId) scene?.focus(next[0], 34)
    },
    follow(id) { followId = id || null; if (followId) scene?.focus(followId); else scene?.resetCamera() },
    focusDistrict(id) { followId = null; scene?.focusQuarter(id === 'overview' || id === 'core' ? id : STYLE_OF[id] || id) },
    resetCamera() { followId = null; scene?.resetCamera() },
    focusWonder(id) { followId = null; return scene?.focusWonder(id) || false },
    tourWonders() { scene?.tourWonders?.() },
    tourAgents() { scene?.tourAgents?.() },
    stopTour() { scene?.stopTour?.() },
    setMinimap(on) { minimapOn = !!on; if (minimapOn && minimapCanvas) scene?.bindMinimap?.(minimapCanvas); scene?.setMinimap?.(minimapOn) },
    bindMinimap(canvas) { minimapCanvas = canvas; if (minimapOn) scene?.bindMinimap?.(canvas) },
    focusLead() { followId = null; scene?.focusLead?.() },
    focusWonderByIndex(index) { followId = null; scene?.focusWonderByIndex?.(index) },
    setShortcuts(on) { scene?.setShortcuts?.(on) },
    view() { return scene?.view?.() },
    wonders() { return scene?.wonders() || [] },
    perf() { return scene?.perf() || null },
    debug() { return scene?.debug() || null },
    dispose() { scene?.dispose(); scene = null },
  }
}
