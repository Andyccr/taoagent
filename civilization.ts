import { Store, type Agent, type Session, type Turn } from './store.ts'
import type { CollaborativeTask } from './collaboration.ts'

export const DISTRICTS = ['china', 'rome', 'greece', 'metro'] as const
export type DistrictId = (typeof DISTRICTS)[number]
export type CitizenActivity = 'idle' | 'working' | 'waiting' | 'delegating' | 'complete' | 'error' | 'stale' | 'unknown'
const STALE_MS = 10 * 60 * 1000
const COMPLETE_MS = 20 * 1000
const HANDOFF_MS = 60 * 1000
const EVENT_LIMIT = 60
const EVENT_TURNS = 12
const PRIORITY: CitizenActivity[] = ['waiting', 'error', 'stale', 'working', 'delegating', 'complete', 'unknown', 'idle']
const TONE_COLORS = ['#c45c4a', '#3d6b8c', '#6b7c3a', '#8a6232']
const KEYWORDS: Record<DistrictId, string[]> = {
  china: ['协调', '派工', '总经理', '编排', '统筹', 'orchestrat', 'coordinator', 'delegat'],
  rome: ['代码', '编程', '程序员', '调试', '测试', '实现', '工程', 'program', 'engineer', 'debug', 'implement'],
  greece: ['研究', '资料', '论文', '知识', '证据', '推理', '文档', '核验', '风险', '评审', '故事', '剧', '角色扮演', 'research', 'academ', 'library', 'story', 'review'],
  metro: ['数据', '监控', '通信', '指标', 'analytics', 'monitor', 'dashboard', 'metric'],
}

export interface CitizenView {
  id: string
  name: string
  role: string
  roleSource: 'profile' | 'group' | 'none'
  district: DistrictId
  districtSource: 'lead' | 'role' | 'fallback'
  lead: boolean
  color: string
  colorSource: 'fallback'
  accessory: 'seal' | 'tablet' | 'scroll' | 'antenna'
  plot: number
  activity: CitizenActivity
  freshness: 'fresh' | 'stale'
  availability: 'available'
  connectivity: 'local'
  since: string | null
  sessionId: string | null
  taskId: string | null
  taskTitle: string | null
  detail: string
}

export interface CivilizationSnapshot {
  generatedAt: string
  source: 'live'
  llmCalls: 0
  connected: true
  usage: {
    subscription: 'Unavailable'
    remaining: 'Unavailable'
    reset: 'Unavailable'
    reportedTokens: number | null
    reportedNote: string
    activeAgents: number
    runningTasks: number
    waitingTasks: number
    waitingForUser: number
    lastUpdate: string
  }
  districts: { id: DistrictId; name: string; purpose: string; landmark: string }[]
  citizens: CitizenView[]
  buildings: { id: string; district: DistrictId; kind: 'landmark' | 'workplace' | 'reserved'; plot: number; agentIds: string[]; label: string }[]
  tasks: { id: string; sessionId: string; title: string; assigneeId: string; fromAgentId: string; status: 'pending' | 'review' | 'complete'; at: string }[]
  tasksState: 'ok' | 'unavailable'
  handoffs: { id: string; fromAgentId: string; toAgentId: string; taskId: string; at: string }[]
  /** Recent real events derived from turns, tasks and approvals (newest first). Never includes prompts, bodies or arguments. */
  events: CityEvent[]
  /** Teams are the existing group chats; members keep their own quarter, the team only groups them. */
  teams: { id: string; name: string; memberIds: string[]; coordinatorId: string | null; updatedAt: string }[]
  leadSource: 'coordinator' | 'main' | 'none'
}

export interface CityEvent {
  id: string
  at: string
  kind: 'working' | 'complete' | 'error' | 'waiting' | 'handoff' | 'delivered'
  agentId: string
  toAgentId: string | null
  sessionId: string
  title: string | null
}

interface Signal { activity: CitizenActivity; freshness: 'fresh' | 'stale'; since: string | null; sessionId: string | null; taskId: string | null; taskTitle: string | null }
const DETAILS: Record<CitizenActivity, string> = {
  idle: '空闲', working: '正在执行', waiting: '等待你的批准', delegating: '正在移交任务', complete: '刚刚完成', error: '执行失败', stale: '工作状态已过期', unknown: '无法确认',
}

export function toneColor(id: string) { return TONE_COLORS[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONE_COLORS.length] }
export function hashDistrict(id: string): DistrictId { return DISTRICTS[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % DISTRICTS.length] }

export function classifyRole(text: string): { district: DistrictId; source: 'role' } | null {
  const haystack = text.toLocaleLowerCase()
  let best: DistrictId | null = null, score = 0
  for (const district of DISTRICTS) {
    const hits = KEYWORDS[district].filter(word => haystack.includes(word)).length
    if (hits > score) { score = hits; best = district }
  }
  return best ? { district: best, source: 'role' } : null
}

function clip(value: string, max: number) { const clean = value.replace(/\s+/g, ' ').trim(); return clean.length > max ? clean.slice(0, max - 1) + '…' : clean }
function rank(activity: CitizenActivity) { return PRIORITY.indexOf(activity) }
function readList<T>(store: Store, ...parts: string[]): { ok: true; value: T[] } | { ok: false } {
  const text = store.text(...parts)
  if (!text.trim()) return { ok: true, value: [] }
  try { const value = JSON.parse(text); return Array.isArray(value) ? { ok: true, value } : { ok: false } }
  catch { return { ok: false } }
}
function live(store: Store, sessionId: string, running: ReadonlySet<string>, cache: Map<string, boolean>) {
  const known = cache.get(sessionId)
  if (known !== undefined) return known
  const value = running.has(sessionId) || store.isRunning(sessionId)
  cache.set(sessionId, value)
  return value
}
function consider(current: Signal | null, next: Signal) {
  if (!current || rank(next.activity) < rank(current.activity)) return next
  return current
}
function quietFailure(error?: string) { return !!error && /已暂停|中断|已被用户新要求取代/.test(error) }

function memberIds(store: Store, session: Session) {
  if (session.kind === 'consult' || session.archivedAt) return []
  return session.kind === 'group' ? store.groupMembers(session.id) : [session.agentId].filter(Boolean)
}

export function civilizationSnapshot(store: Store, now = Date.now(), runningIds: readonly string[] = []): CivilizationSnapshot {
  const running = new Set(runningIds), heartbeats = new Map<string, boolean>()
  const agents = store.agents().filter(agent => !agent.archivedAt)
  const sessions = store.sessions().filter(session => session.kind !== 'consult' && !session.archivedAt)
  const groups = sessions.filter(session => session.kind === 'group')
  const coordinators = new Map<string, number>()
  for (const group of groups) if (group.coordinatorId && agents.some(agent => agent.id === group.coordinatorId)) coordinators.set(group.coordinatorId, (coordinators.get(group.coordinatorId) || 0) + 1)
  const coordinatorLead = [...coordinators.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null
  // Without any group coordinator the built-in main assistant holds the central hall (it is the default agent of every direct chat).
  const leadId = coordinatorLead || (agents.some(agent => agent.id === 'main') ? 'main' : null)
  const leadSource: CivilizationSnapshot['leadSource'] = coordinatorLead ? 'coordinator' : leadId ? 'main' : 'none'
  const events: CityEvent[] = []
  const pushEvent = (event: CityEvent) => { if (Number.isFinite(Date.parse(event.at))) events.push(event) }
  const signals = new Map<string, Signal>()
  const tasks: CivilizationSnapshot['tasks'] = []
  const handoffs: CivilizationSnapshot['handoffs'] = []
  let tasksState: CivilizationSnapshot['tasksState'] = 'ok'
  let reportedTokens: number | null = null
  let waitingForUser = 0
  const roleText = new Map<string, { profile: string; group: string }>()
  for (const agent of agents) roleText.set(agent.id, { profile: [agent.responsibilities, agent.background].filter(Boolean).join('\n'), group: '' })
  for (const group of groups) for (const [agentId, role] of Object.entries(group.memberRoles || {})) {
    const entry = roleText.get(agentId); if (entry && role.trim()) entry.group = entry.group ? entry.group + '\n' + role : role
  }

  for (const session of sessions) {
    const members = new Set(memberIds(store, session))
    let turns: Turn[] | null = null
    try { turns = store.turns(session.id) } catch { turns = null }
    if (!turns) { for (const agentId of members) signals.set(agentId, consider(signals.get(agentId) || null, { activity: 'unknown', freshness: 'fresh', since: null, sessionId: session.id, taskId: null, taskTitle: null })); continue }
    for (const item of turns) if (item.usage?.usageReports && Number.isFinite(item.usage.measuredTotalTokens)) reportedTokens = (reportedTokens || 0) + (item.usage.measuredTotalTokens || 0)
    for (const item of turns.slice(-EVENT_TURNS)) for (const speaker of item.speakers) {
      if (!members.has(speaker.agentId)) continue
      const kind = speaker.status === 'running' ? 'working' : speaker.status === 'complete' ? 'complete' : speaker.status === 'failed' && !quietFailure(speaker.error) ? 'error' : null
      if (kind) pushEvent({ id: session.id + ':' + item.id + ':' + (speaker.eventId || speaker.agentId) + ':' + kind, at: kind === 'working' ? item.at : item.updatedAt, kind, agentId: speaker.agentId, toAgentId: null, sessionId: session.id, title: null })
    }
    const turn = turns.at(-1)
    const age = turn ? now - Date.parse(turn.updatedAt) : Number.POSITIVE_INFINITY
    const heartbeat = live(store, session.id, running, heartbeats)
    if (turn) {
      for (const speaker of turn.speakers) {
        if (!members.has(speaker.agentId)) continue
        let signal: Signal | null = null
        if (speaker.status === 'running') {
          const fresh = heartbeat || age <= STALE_MS
          signal = { activity: fresh ? 'working' : 'stale', freshness: fresh ? 'fresh' : 'stale', since: turn.updatedAt, sessionId: session.id, taskId: speaker.taskId || null, taskTitle: null }
        } else if (speaker.status === 'failed' && !quietFailure(speaker.error)) signal = { activity: 'error', freshness: age <= STALE_MS ? 'fresh' : 'stale', since: turn.updatedAt, sessionId: session.id, taskId: speaker.taskId || null, taskTitle: null }
        else if (speaker.status === 'complete' && age <= COMPLETE_MS) signal = { activity: 'complete', freshness: 'fresh', since: turn.updatedAt, sessionId: session.id, taskId: speaker.taskId || null, taskTitle: null }
        if (signal) signals.set(speaker.agentId, consider(signals.get(speaker.agentId) || null, signal))
      }
      for (const observation of turn.observations || []) {
        if (!members.has(observation.agentId)) continue
        if (observation.status === 'checking') {
          const fresh = heartbeat || age <= STALE_MS
          signals.set(observation.agentId, consider(signals.get(observation.agentId) || null, { activity: fresh ? 'working' : 'stale', freshness: fresh ? 'fresh' : 'stale', since: turn.updatedAt, sessionId: session.id, taskId: null, taskTitle: null }))
        } else if (observation.status === 'failed' && !quietFailure(observation.error)) signals.set(observation.agentId, consider(signals.get(observation.agentId) || null, { activity: 'error', freshness: age <= STALE_MS ? 'fresh' : 'stale', since: turn.updatedAt, sessionId: session.id, taskId: null, taskTitle: null }))
      }
    }
    const actionFile = readList<{ id?: string; agentId?: string; status?: string; at?: string }>(store, 'chats', session.id, 'actions.json')
    if (!actionFile.ok) { for (const agentId of members) signals.set(agentId, consider(signals.get(agentId) || null, { activity: 'unknown', freshness: 'fresh', since: null, sessionId: session.id, taskId: null, taskTitle: null })) }
    for (const action of actionFile.ok ? actionFile.value : []) {
      if (action.agentId && members.has(action.agentId) && action.at) pushEvent({ id: session.id + ':action:' + (action.id || action.at), at: action.at, kind: 'waiting', agentId: action.agentId, toAgentId: null, sessionId: session.id, title: null })
      if (action.status !== 'pending' || !action.agentId || !members.has(action.agentId)) continue
      waitingForUser++
      signals.set(action.agentId, consider(signals.get(action.agentId) || null, { activity: 'waiting', freshness: 'fresh', since: action.at || null, sessionId: session.id, taskId: null, taskTitle: null }))
    }
    const taskFile = readList<CollaborativeTask>(store, 'chats', session.id, 'tasks.json')
    if (!taskFile.ok) { tasksState = 'unavailable'; continue }
    for (const task of taskFile.value) {
      if (!task || typeof task.id !== 'string') continue
      const review = task.requireReview && task.status === 'complete' && task.review?.status === 'awaiting_review'
      const status = task.status === 'pending' ? 'pending' : review ? 'review' : 'complete'
      tasks.push({ id: task.id, sessionId: session.id, title: clip(task.title || task.id, 80), assigneeId: task.assigneeId, fromAgentId: task.fromAgentId, status, at: task.at })
      if (task.fromAgentId && task.assigneeId && task.fromAgentId !== task.assigneeId) pushEvent({ id: session.id + ':task:' + task.id, at: task.at, kind: 'handoff', agentId: task.fromAgentId, toAgentId: task.assigneeId, sessionId: session.id, title: clip(task.title || task.id, 80) })
      const delivered = task.status === 'complete' ? task.resultHistory?.at(-1)?.at : undefined
      if (delivered && task.assigneeId) pushEvent({ id: session.id + ':task:' + task.id + ':done', at: delivered, kind: 'delivered', agentId: task.assigneeId, toAgentId: task.fromAgentId || null, sessionId: session.id, title: clip(task.title || task.id, 80) })
      const handed = Date.parse(task.at), recent = Number.isFinite(handed) && now - handed <= HANDOFF_MS
      if (recent && task.fromAgentId !== task.assigneeId && task.status === 'pending') {
        handoffs.push({ id: session.id + ':' + task.id, fromAgentId: task.fromAgentId, toAgentId: task.assigneeId, taskId: task.id, at: task.at })
        if (members.has(task.fromAgentId)) signals.set(task.fromAgentId, consider(signals.get(task.fromAgentId) || null, { activity: 'delegating', freshness: 'fresh', since: task.at, sessionId: session.id, taskId: task.id, taskTitle: clip(task.title || task.id, 80) }))
      }
    }
  }

  const placed = new Map<DistrictId, number>()
  const citizens: CitizenView[] = agents.sort((a, b) => a.id.localeCompare(b.id)).map(agent => citizen(agent, leadId, roleText.get(agent.id) || { profile: '', group: '' }, signals.get(agent.id) || null, placed, tasks))
  const buildings: CivilizationSnapshot['buildings'] = DISTRICTS.flatMap(district => {
    const names = { china: ['政令殿', '宫城工位'], rome: ['工程广场', '工坊'], greece: ['学园', '研究席'], metro: ['数据塔', '技术席'] }[district]
    const local = citizens.filter(item => item.district === district)
    const rows: CivilizationSnapshot['buildings'] = [{ id: 'landmark:' + district, district, kind: 'landmark', plot: -1, agentIds: local.filter(item => item.lead || item.plot < 0).map(item => item.id), label: names[0] }]
    for (const item of local.filter(citizen => citizen.plot >= 0)) rows.push({ id: 'workplace:' + item.id, district, kind: 'workplace', plot: item.plot, agentIds: [item.id], label: item.name })
    const used = local.filter(item => item.plot >= 0).length
    for (let index = 0; index < 2; index++) rows.push({ id: 'reserved:' + district + ':' + index, district, kind: 'reserved', plot: used + index, agentIds: [], label: '预留用地' })
    return rows
  })
  const waitingTasks = tasks.filter(task => task.status !== 'complete').length
  const known = new Set(citizens.map(item => item.id))
  return {
    generatedAt: new Date(now).toISOString(), source: 'live', llmCalls: 0, connected: true,
    usage: { subscription: 'Unavailable', remaining: 'Unavailable', reset: 'Unavailable', reportedTokens, reportedNote: reportedTokens === null ? 'Unavailable' : '模型已回报的 token，不是订阅剩余额度', activeAgents: citizens.length, runningTasks: citizens.filter(item => item.activity === 'working' && item.freshness === 'fresh').length, waitingTasks, waitingForUser, lastUpdate: new Date(now).toISOString() },
    districts: [
      { id: 'china', name: '宫城', purpose: '统筹、协调与委托', landmark: '政令殿' },
      { id: 'rome', name: '罗马工程区', purpose: '实现、工具与验证', landmark: '工程广场' },
      { id: 'greece', name: '希腊学园', purpose: '研究、推理与记录', landmark: '学园' },
      { id: 'metro', name: '现代都会', purpose: '数据、监测与通信', landmark: '数据塔' },
    ],
    citizens, buildings, tasks: tasks.filter(task => task.status !== 'complete').slice(0, 40), tasksState, handoffs,
    events: events.filter(event => known.has(event.agentId)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)).slice(0, EVENT_LIMIT),
    teams: groups.map(group => ({ id: group.id, name: clip(group.title || group.id, 40), memberIds: store.groupMembers(group.id).filter(id => known.has(id)), coordinatorId: group.coordinatorId && known.has(group.coordinatorId) ? group.coordinatorId : null, updatedAt: group.updatedAt })).filter(team => team.memberIds.length).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    leadSource,
  }
}

function citizen(agent: Agent, leadId: string | null, roles: { profile: string; group: string }, signal: Signal | null, placed: Map<DistrictId, number>, tasks: CivilizationSnapshot['tasks']): CitizenView {
  const lead = agent.id === leadId
  const classified = classifyRole(roles.profile + '\n' + roles.group)
  const district = lead ? 'china' : classified?.district || hashDistrict(agent.id)
  const districtSource = lead ? 'lead' : classified ? 'role' : 'fallback'
  const plot = lead ? -1 : placed.get(district) ?? 0
  if (!lead) placed.set(district, plot + 1)
  const role = clip(roles.profile || roles.group, 160)
  const task = signal?.taskId ? tasks.find(item => item.id === signal.taskId && item.sessionId === signal.sessionId) : undefined
  const activity = signal?.activity || 'idle'
  return {
    id: agent.id, name: agent.name || agent.id, role, roleSource: roles.profile ? 'profile' : roles.group ? 'group' : 'none', district, districtSource, lead,
    color: toneColor(agent.id), colorSource: 'fallback', accessory: { china: 'seal', rome: 'tablet', greece: 'scroll', metro: 'antenna' }[district] as CitizenView['accessory'],
    plot, activity, freshness: signal?.freshness || 'fresh', availability: 'available', connectivity: 'local', since: signal?.since || null, sessionId: signal?.sessionId || null,
    taskId: signal?.taskId || null, taskTitle: signal?.taskTitle || task?.title || null, detail: DETAILS[activity],
  }
}
