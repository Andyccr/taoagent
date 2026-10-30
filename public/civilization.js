const defaults = { quality: 'medium', speed: 1, sensitivity: 1, night: false, language: 'zh', labels: true, citizens: true, buildings: true, paused: false }
const copy = {
  zh: { title: 'AI 文明', back: '返回交流', sim: '模拟文明', simOn: '模拟中 · 不会写入真实成员或任务', live: '本机实时状态 · 不调用模型', unavailable: '无法读取实时状态', usage: '使用情况', agents: '活跃成员', running: '执行中', waiting: '等待中的任务', approval: '等待你批准', quota: '订阅额度', remaining: '剩余额度', reset: '重置时间', reported: '模型回报', roster: '成员', tasks: '任务', none: '没有进行中的任务', empty: '还没有成员', settings: '显示设置', quality: '画面质量', speed: '动画速度', sensitivity: '镜头灵敏度', night: '夜晚', labels: '名字与状态', people: '显示成员', places: '显示建筑', pause: '暂停动画', districts: '城区', follow: '跟随', clear: '取消跟随', reset: '重置镜头', roleMissing: '资料中没有职责', fallback: '区划按标识分配，不是已记录职责', color: '颜色按标识生成，不是成员资料', lead: '统筹位置', selected: '选中', building: '建筑', district: '城区', adaptive: '已自动降低画面质量', language: '界面语言',
    quotaReset: '重置时间', cameraReset: '重置镜头',
    activity: { idle: '空闲', working: '正在执行', waiting: '等待你的批准', delegating: '正在移交', complete: '刚刚完成', error: '执行失败', stale: '状态已过期', unknown: '无法确认' },
    district: { china: '宫城', rome: '罗马工程区', greece: '希腊学园', metro: '现代都会' }, preset: { overview: '全城', china: '宫城', rome: '工程', greece: '学园', metro: '都会' } },
  en: { title: 'AI Civilization', back: 'Back to chat', sim: 'Simulate Civilization', simOn: 'Simulation · real agent records are not changed', live: 'Live local status · no model calls', unavailable: 'Unavailable', usage: 'Usage', agents: 'Active agents', running: 'Running', waiting: 'Waiting tasks', approval: 'Waiting for you', quota: 'Subscription', remaining: 'Remaining', reset: 'Reset', reported: 'Reported tokens', roster: 'Agents', tasks: 'Tasks', none: 'No active tasks', empty: 'No agents yet', settings: 'Display', quality: 'Quality', speed: 'Animation speed', sensitivity: 'Camera sensitivity', night: 'Night', labels: 'Labels', people: 'Show citizens', places: 'Show buildings', pause: 'Pause animation', districts: 'Districts', follow: 'Follow', clear: 'Stop following', reset: 'Reset camera', roleMissing: 'No role on record', fallback: 'District is an id fallback, not recorded role data', color: 'Color is derived from the id, not profile data', lead: 'Command post', selected: 'Selected', building: 'Building', district: 'District', adaptive: 'Quality was lowered automatically', language: 'Language',
    quotaReset: 'Reset', cameraReset: 'Reset camera',
    activity: { idle: 'Idle', working: 'Working', waiting: 'Waiting for you', delegating: 'Handing off', complete: 'Just completed', error: 'Error', stale: 'Stale', unknown: 'Unknown' },
    district: { china: 'Command palace', rome: 'Roman works', greece: 'Greek academy', metro: 'Metropolis' }, preset: { overview: 'City', china: 'Palace', rome: 'Works', greece: 'Academy', metro: 'Metro' } },
}
const q = selector => document.querySelector(selector)
const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text) element.textContent = text; return element }
let view, stage, banner, statusNode, usageNode, rosterNode, taskNode, detailNode, presetNode, settingsNode
let city, real = null, shown = null, sim = false, settings = loadSettings(), selection = null, poll = 0, simTimer = 0, previousHash = '', finger = ''

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('taoagent.civilization') || '{}')
    const next = { ...defaults, ...saved }
    if (!['low', 'medium', 'high'].includes(next.quality)) next.quality = defaults.quality
    if (!['zh', 'en'].includes(next.language)) next.language = 'zh'
    next.speed = Math.min(3, Math.max(0.25, Number(next.speed) || 1))
    next.sensitivity = Math.min(2.5, Math.max(0.4, Number(next.sensitivity) || 1))
    for (const key of ['night', 'labels', 'citizens', 'buildings', 'paused']) next[key] = !!next[key]
    return next
  } catch { return { ...defaults } }
}
function saveSettings() { try { localStorage.setItem('taoagent.civilization', JSON.stringify(settings)) } catch {} }
function t() { return copy[settings.language] || copy.zh }
function syncNavigation() { const sidebar = q('#sidebar'), rect = sidebar.getBoundingClientRect(); view.style.setProperty('--town-nav-width', innerWidth > 760 && getComputedStyle(sidebar).display !== 'none' ? rect.right + 'px' : '0px') }
function statusText(citizen) {
  const labels = t().activity
  return (labels[citizen.activity] || citizen.activity) + (citizen.freshness === 'stale' && citizen.activity !== 'stale' ? ' · ' + labels.stale : '')
}
function present(snapshot) {
  return { ...snapshot, citizens: snapshot.citizens.map(citizen => ({ ...citizen, detail: statusText(citizen) })) }
}
function simulate(snapshot, now) {
  const citizens = snapshot.citizens.map((citizen, index) => {
    const phase = (now / 1000 + index * 2.2) % 14
    const activity = phase < 4 ? 'working' : phase < 6.5 ? 'delegating' : phase < 8 ? 'complete' : phase < 10 ? 'waiting' : 'idle'
    return { ...citizen, activity, freshness: 'fresh', taskTitle: activity === 'idle' ? null : '模拟', since: new Date(now).toISOString() }
  })
  const handoffs = citizens.filter(citizen => citizen.activity === 'delegating').map(citizen => {
    const index = citizens.findIndex(item => item.id === citizen.id)
    return { id: 'sim:' + citizen.id + ':' + Math.floor(now / 2500), fromAgentId: citizen.id, toAgentId: citizens[(index + 1) % citizens.length].id, taskId: 'sim', at: new Date(now).toISOString() }
  })
  const tasks = citizens.filter(citizen => citizen.activity !== 'idle').map(citizen => ({ id: 'sim-' + citizen.id, sessionId: 'simulation', title: '模拟', assigneeId: citizen.id, fromAgentId: citizen.id, status: 'pending', at: new Date(now).toISOString() }))
  return { ...snapshot, source: 'simulation', citizens, handoffs, tasks, tasksState: 'ok' }
}
async function loadLive() {
  const response = await fetch('/api/civilization', { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Unavailable')
  const body = await response.json()
  if (body.source !== 'live' || body.llmCalls !== 0 || !Array.isArray(body.citizens)) throw new Error('Unavailable')
  return body
}
function render() {
  if (!shown) return
  const text = t(), live = real || shown
  const nextFinger = JSON.stringify([shown.source, shown.tasksState, shown.citizens.map(citizen => [citizen.id, citizen.name, citizen.activity, citizen.detail, citizen.district, citizen.role]), shown.tasks, live.usage, settings.language, selection])
  if (nextFinger === finger) return
  finger = nextFinger
  banner.hidden = shown.source !== 'simulation'
  banner.textContent = text.simOn
  statusNode.classList.remove('error')
  statusNode.textContent = shown.source === 'simulation' ? text.simOn : text.live
  const usage = live.usage || {}
  usageNode.replaceChildren()
  for (const [label, value] of [[text.quota, usage.subscription || 'Unavailable'], [text.remaining, usage.remaining || 'Unavailable'], [text.quotaReset, usage.reset || 'Unavailable'], [text.reported, usage.reportedTokens === null || usage.reportedTokens === undefined ? 'Unavailable' : String(usage.reportedTokens)], [text.agents, String(usage.activeAgents ?? 'Unavailable')], [text.running, String(usage.runningTasks ?? 'Unavailable')], [text.waiting, String(usage.waitingTasks ?? 'Unavailable')], [text.approval, String(usage.waitingForUser ?? 'Unavailable')]]) {
    const card = node('div'); card.append(node('span', '', label), node('strong', '', value)); usageNode.append(card)
  }
  presetNode.replaceChildren()
  for (const id of ['overview', 'china', 'rome', 'greece', 'metro']) presetNode.append(button(text.preset[id], () => city?.focusDistrict(id)))
  rosterNode.replaceChildren()
  if (!shown.citizens.length) rosterNode.append(node('p', 'civ-note', text.empty))
  for (const citizen of shown.citizens) {
    const button = node('button')
    button.type = 'button'
    button.setAttribute('aria-pressed', String(selection?.type === 'agent' && selection.id === citizen.id))
    const title = node('strong', '', citizen.name)
    const districtName = text.district[citizen.district] || citizen.district
    const meta = node('small', '', districtName + (citizen.districtSource === 'fallback' ? (settings.language === 'zh' ? ' · 标识分配' : ' · id fallback') : '') + ' · ' + statusText(citizen))
    button.append(title, meta)
    button.onclick = () => choose({ type: 'agent', id: citizen.id })
    rosterNode.append(button)
  }
  taskNode.replaceChildren()
  if (shown.tasksState === 'unavailable') taskNode.append(node('p', 'civ-note', 'Unavailable'))
  else if (!shown.tasks.length) taskNode.append(node('p', 'civ-note', text.none))
  else for (const task of shown.tasks) taskNode.append(node('p', 'civ-card', task.title + ' · ' + (shown.citizens.find(citizen => citizen.id === task.assigneeId)?.name || task.assigneeId)))
  const titles = view.querySelectorAll('.civ-side > h2')
  ;[text.usage, text.districts, text.roster, text.tasks].forEach((label, index) => { if (titles[index]) titles[index].textContent = label })
  renderDetail()
}
function renderDetail() {
  const text = t()
  detailNode.replaceChildren(node('h2', '', text.selected))
  if (!shown || !selection) { detailNode.append(node('p', 'civ-note', text.roster)); return }
  if (selection.type === 'agent') {
    const citizen = shown.citizens.find(item => item.id === selection.id)
    if (!citizen) { detailNode.append(node('p', 'civ-note', text.empty)); return }
    detailNode.append(node('strong', '', citizen.name), node('p', 'civ-note', statusText(citizen)))
    detailNode.append(node('p', '', citizen.role || text.roleMissing))
    if (citizen.roleSource === 'none') detailNode.append(node('p', 'civ-note', text.roleMissing))
    if (citizen.districtSource === 'fallback') detailNode.append(node('p', 'civ-note', text.fallback))
    if (citizen.districtSource === 'lead') detailNode.append(node('p', 'civ-note', text.lead))
    detailNode.append(node('p', 'civ-note', text.color))
    if (citizen.taskTitle && shown.source !== 'simulation') detailNode.append(node('p', '', citizen.taskTitle))
    const follow = button(text.follow, () => city?.follow(citizen.id))
    const stop = button(text.clear, () => city?.follow(null))
    detailNode.append(follow, stop)
    city?.select(citizen.id)
    return
  }
  const ids = selection.type === 'building' ? shown.buildings.find(item => item.id === selection.id)?.agentIds || [] : shown.citizens.filter(item => item.district === selection.id).map(item => item.id)
  detailNode.append(node('strong', '', selection.type === 'building' ? text.building : text.district[selection.id] || text.district))
  if (!ids.length) detailNode.append(node('p', 'civ-note', text.empty))
  for (const id of ids) { const citizen = shown.citizens.find(item => item.id === id); if (citizen) detailNode.append(button(citizen.name + ' · ' + citizen.detail, () => choose({ type: 'agent', id }))) }
}
function paintSettings() {
  const text = t()
  settingsNode.replaceChildren(node('h2', '', text.settings))
  const quality = node('select'); for (const value of ['low', 'medium', 'high']) quality.add(new Option(value, value)); quality.value = settings.quality; quality.onchange = () => update({ quality: quality.value })
  const speed = range(settings.speed, 0.25, 3, 0.25, value => update({ speed: value }))
  const sensitivity = range(settings.sensitivity, 0.4, 2.5, 0.1, value => update({ sensitivity: value }))
  const language = node('select'); language.add(new Option('中文', 'zh')); language.add(new Option('English', 'en')); language.value = settings.language; language.onchange = () => update({ language: language.value })
  settingsNode.append(field(text.quality, quality), field(text.speed, speed), field(text.sensitivity, sensitivity), field(text.language, language), check(text.night, settings.night, value => update({ night: value })), check(text.labels, settings.labels, value => update({ labels: value })), check(text.people, settings.citizens, value => update({ citizens: value })), check(text.places, settings.buildings, value => update({ buildings: value })), check(text.pause, settings.paused, value => update({ paused: value })))
}
function field(label, control) { const row = node('label'); row.append(node('span', '', label), control); return row }
function check(label, value, change) { const row = node('label'), input = node('input'); input.type = 'checkbox'; input.checked = value; input.onchange = () => change(input.checked); row.append(node('span', '', label), input); return row }
function range(value, min, max, step, change) { const input = node('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value); input.oninput = () => change(Number(input.value)); return input }
function button(text, action) { const element = node('button', '', text); element.type = 'button'; element.onclick = action; return element }
function update(patch) { settings = { ...settings, ...patch }; saveSettings(); city?.setSettings(settings); finger = ''; paintChrome(); if (patch.language) paintSettings(); render() }
function choose(next) { selection = next; finger = ''; if (next?.type === 'district') city?.focusDistrict(next.id); if (shown) render(); else renderDetail() }
function paintChrome() { const text = t(); q('#civ-back').textContent = text.back; q('#civ-sim').textContent = text.sim; q('#civ-reset').textContent = text.cameraReset }
function publish(snapshot) { shown = snapshot; if (city) city.setSnapshot(present(snapshot)); render() }
function startSim() { clearInterval(simTimer); if (!real) return; publish(simulate(real, Date.now())); simTimer = setInterval(() => { if (real && sim && !view.hidden && !document.hidden) publish(simulate(real, Date.now())) }, 400) }
async function refresh() {
  const body = await loadLive()
  real = body
  if (sim) { if (!simTimer) startSim(); else render() }
  else publish(body)
}
function fail(error) { statusNode.classList.add('error'); statusNode.textContent = t().unavailable + (error?.message ? ' · ' + error.message : '') }
async function ensureCity() {
  if (city) return
  const mod = await import('/city.bundle.js')
  city = mod.createCity(stage, { onPick: choose, onAdaptive: () => { settings = { ...settings, quality: 'low' }; saveSettings(); paintSettings(); statusNode.textContent = t().adaptive } })
  city.setSettings(settings)
  city.setVisible(!view.hidden && !document.hidden)
  if (shown) city.setSnapshot(present(shown))
}
function watch() {
  clearInterval(poll)
  const active = !view.hidden && !document.hidden
  city?.setVisible(active)
  if (!active) { clearInterval(simTimer); simTimer = 0; return }
  poll = setInterval(() => refresh().catch(fail), 2500)
  if (sim && !simTimer) startSim()
}
function setSim(enabled) {
  sim = enabled
  q('#civ-sim').setAttribute('aria-pressed', String(enabled))
  clearInterval(simTimer)
  simTimer = 0
  finger = ''
  if (enabled) startSim()
  else if (real) publish(real)
}
async function openView() {
  previousHash = location.hash.startsWith('#civilization') ? previousHash : location.hash
  window.dispatchEvent(new CustomEvent('tao-civ-open'))
  document.body.classList.add('civ-active')
  view.hidden = false
  q('main').inert = true
  history.replaceState(null, '', '#civilization')
  syncNavigation()
  try { await ensureCity(); city.setVisible(true); await refresh() } catch (error) { fail(error) }
  watch()
}
function closeView(restore) {
  clearInterval(poll); clearInterval(simTimer); sim = false; q('#civ-sim')?.setAttribute('aria-pressed', 'false')
  city?.setVisible(false)
  document.body.classList.remove('civ-active')
  view.hidden = true
  q('main').inert = false
  if (restore) history.replaceState(null, '', previousHash && previousHash !== '#civilization' ? previousHash : location.pathname + location.search)
}
function init() {
  view = node('section', 'civ-view')
  view.id = 'civ-view'
  view.hidden = true
  view.setAttribute('aria-label', 'AI Civilization')
  const bar = node('div', 'civ-bar')
  const actions = node('div', 'civ-actions')
  const back = button(copy.zh.back, () => closeView(true))
  back.id = 'civ-back'
  const simButton = button(copy.zh.sim, () => setSim(!sim))
  simButton.id = 'civ-sim'
  simButton.setAttribute('aria-pressed', 'false')
  const reset = button(copy.zh.cameraReset, () => city?.resetCamera())
  reset.id = 'civ-reset'
  actions.append(button('☰', () => q('#menu').click()), back, simButton, reset)
  bar.append(node('strong', '', 'AI 文明'), actions)
  statusNode = node('p', 'civ-status', copy.zh.live)
  statusNode.setAttribute('role', 'status')
  const body = node('div', 'civ-body')
  stage = node('div', 'civ-stage')
  banner = node('div', 'civ-banner', copy.zh.simOn)
  banner.hidden = true
  stage.append(banner)
  const side = node('aside', 'civ-side')
  usageNode = node('div', 'civ-metrics')
  presetNode = node('div', 'civ-presets')
  rosterNode = node('div', 'civ-list')
  taskNode = node('div', 'civ-list')
  detailNode = node('div', 'civ-person')
  settingsNode = node('div', 'civ-settings')
  side.append(node('h2', '', copy.zh.usage), usageNode, node('h2', '', copy.zh.districts), presetNode, node('h2', '', copy.zh.roster), rosterNode, node('h2', '', copy.zh.tasks), taskNode, detailNode, settingsNode)
  body.append(stage, side)
  view.append(bar, statusNode, body)
  document.body.append(view)
  q('#civ-open').onclick = () => openView()
  q('#settings-civ').onclick = () => { q('#settings').close(); openView() }
  window.addEventListener('hashchange', () => { if (location.hash === '#civilization' && view.hidden) openView() })
  window.addEventListener('tao-town-open', () => { if (!view.hidden) closeView(false) })
  window.addEventListener('tao-target-changed', () => { if (!view.hidden) closeView(false) })
  window.addEventListener('resize', syncNavigation)
  document.addEventListener('visibilitychange', () => { if (!view.hidden) watch() })
  window.addEventListener('pagehide', () => city?.dispose())
  try { paintChrome(); paintSettings() } catch (error) { statusNode.textContent = error.message }
  if (location.hash === '#civilization') openView()
}
init()
