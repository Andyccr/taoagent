import fs from 'node:fs'
import crypto from 'node:crypto'
import { Store, HttpError, id, json, string, type Turn } from './store.ts'
import { runConversation } from './runtime.ts'

export interface QueuedMessage {
  id: string; content: string; modelId: string; memberIds?: string[]; lifecycleRevision?: string
  status: 'queued' | 'running' | 'complete' | 'failed' | 'interrupted' | 'cancelled'
  revision: string; createdAt: string; updatedAt: string; pid?: number; turnId?: string; error?: string
}
export interface MessageQueue { revision: string; paused: boolean; reason?: string; items: QueuedMessage[] }
const live = new Set<string>()
const fileName = 'message-queue.json'
function read(store: Store, key: string): MessageQueue {
  const value = store.text('chats', key, fileName)
  return value ? JSON.parse(value) as MessageQueue : { revision: '', paused: false, items: [] }
}
function lock<T>(store: Store, key: string, operation: () => T): T {
  const directory = store.file('chats', key, '.queue-lock'), owner = store.file('chats', key, '.queue-lock', 'owner.json')
  if (fs.existsSync(directory)) {
    let stale = false
    try {
      const record = JSON.parse(fs.readFileSync(owner, 'utf8')) as {pid: number}
      if (Number.isInteger(record.pid) && record.pid > 0) {
        try { process.kill(record.pid, 0) } catch (error) { stale = (error as NodeJS.ErrnoException).code === 'ESRCH' }
      }
    } catch { stale = Date.now() - fs.statSync(directory).mtimeMs > 30000 }
    if (!stale) throw new HttpError(409, '消息队列正在更新，请刷新后重试')
    if (fs.existsSync(owner)) fs.unlinkSync(owner); fs.rmdirSync(directory)
  }
  try { fs.mkdirSync(directory) } catch { throw new HttpError(409, '消息队列正在更新，请刷新后重试') }
  try { json(owner, {pid: process.pid}); return operation() }
  finally { if (fs.existsSync(owner)) fs.unlinkSync(owner); fs.rmdirSync(directory) }
}
function persist(store: Store, key: string, queue: MessageQueue) {
  queue.revision = crypto.randomUUID()
  json(store.file('chats', key, fileName), queue)
}
function touch(item: QueuedMessage) { item.revision = crypto.randomUUID(); item.updatedAt = new Date().toISOString() }
function visibleSession(store: Store, key: string) {
  const session = store.requireActiveSession(id(key))
  if (session.kind === 'consult') throw new HttpError(400, '内部咨询不能使用用户消息队列')
  if (session.kind !== 'group') store.requireActiveAgent(session.agentId)
  return session
}
export function queueSnapshot(store: Store, key: string) {
  visibleSession(store, key)
  const queue = read(store, key), active = queue.items.filter(item => ['queued', 'running'].includes(item.status))
  const history = queue.items.filter(item => !['queued', 'running'].includes(item.status)).slice(-30)
  return {...queue, items: [...active, ...history], total: queue.items.length}
}
export function queueSummary(store: Store, key: string) {
  const queue = read(store, key)
  return {paused: queue.paused, pending: queue.items.filter(item => item.status === 'queued').length, running: queue.items.some(item => item.status === 'running')}
}
export function enqueueMessage(store: Store, key: string, input: Record<string, unknown>) {
  const session = visibleSession(store, key), requestId = id(string(input.requestId))
  if (requestId.length > 94) throw new HttpError(400, '排队提交标识不能超过 94 字符')
  const content = string(input.content).trim(), modelId = string(input.modelId)
  if (!content || content.length > 200000) throw new HttpError(400, '排队消息应为 1–200000 字符，原始草稿仍保留')
  if (modelId && !store.models().some(model => model.id === modelId)) throw new HttpError(400, '模型已不存在，请重新选择')
  const members = store.groupMembers(key)
  if (input.memberIds !== undefined && (session.kind !== 'group' || !Array.isArray(input.memberIds) || !input.memberIds.length || input.memberIds.some(member => typeof member !== 'string' || !members.includes(member)))) throw new HttpError(400, '请选择当前群内成员')
  const memberIds = input.memberIds === undefined ? undefined : [...new Set(input.memberIds as string[])]
  return lock(store, key, () => {
    const queue = read(store, key), previous = queue.items.find(item => item.id === requestId)
    if (previous) {
      if (previous.content !== content || previous.modelId !== modelId || JSON.stringify(previous.memberIds) !== JSON.stringify(memberIds)) throw new HttpError(409, '此提交标识已用于另一条排队消息')
      return previous
    }
    if (queue.items.filter(item => ['queued', 'running'].includes(item.status)).length >= 100) throw new HttpError(400, '每个对话最多 100 条未完成排队消息')
    const now = new Date().toISOString()
    const item: QueuedMessage = {id: requestId, content, modelId, memberIds, lifecycleRevision: session.lifecycleRevision, status: 'queued', revision: crypto.randomUUID(), createdAt: now, updatedAt: now}
    queue.items.push(item); persist(store, key, queue); return item
  })
}
export function changeQueue(store: Store, key: string, input: Record<string, unknown>) {
  visibleSession(store, key)
  return lock(store, key, () => {
    const queue = read(store, key)
    if (input.expected !== queue.revision) throw new HttpError(409, '消息队列已变化，请保留编辑并刷新后对照')
    if (input.operation === 'pause' || input.operation === 'resume') {
      if (input.operation === 'resume' && queue.items.some(item => item.status === 'running')) throw new HttpError(409, '当前消息仍在运行，请等它结束后恢复队列')
      queue.paused = input.operation === 'pause'; queue.reason = queue.paused ? '用户暂停，当前运行中的消息继续' : undefined
    } else {
      const item = queue.items.find(item => item.id === input.itemId)
      if (!item || item.status !== 'queued') throw new HttpError(409, '只能编辑或取消尚未开始的消息')
      if (input.operation === 'cancel') { item.status = 'cancelled'; item.error = '用户取消，原文保留' }
      else if (input.operation === 'edit') {
        if (!queue.paused) throw new HttpError(409, '请先暂停队列再编辑，避免编辑期间开始执行')
        const content = string(input.content).trim()
        if (!content || content.length > 200000) throw new HttpError(400, '消息应为 1–200000 字符')
        json(store.file('chats', key, 'queue-history', item.revision + '.json'), item)
        item.content = content
      } else throw new HttpError(400, '未知队列操作')
      touch(item)
    }
    persist(store, key, queue); return queueSnapshot(store, key)
  })
}
export function pauseQueue(store: Store, key: string, reason: string) {
  if (!fs.existsSync(store.file('chats', key, fileName))) return
  lock(store, key, () => { const queue = read(store, key); queue.paused = true; queue.reason = reason; persist(store, key, queue) })
}
function unfinished(turn: Turn) { return turn.speakers.some(speaker => !['complete', 'skipped'].includes(speaker.status)) || (turn.observations || []).some(item => ['pending', 'checking', 'failed'].includes(item.status)) }

// Claim synchronously under both queue and conversation locks; execution uses the existing engine.
export function createQueueScheduler(store: Store, active: Map<string, AbortController>, onEvent: (key: string, value: Record<string, unknown>) => void = () => {}) {
  let stopped = false, ticking = false
  const owned = new Map<string, AbortController>(), jobs = new Set<Promise<void>>()
  function recover(key: string) {
    lock(store, key, () => {
      const queue = read(store, key); let changed = false
      for (const item of queue.items.filter(item => item.status === 'running')) {
        let alive = !!item.pid
        if (item.pid) try { process.kill(item.pid, 0) } catch (error) { alive = (error as NodeJS.ErrnoException).code !== 'ESRCH' }
        if (alive && !(item.pid === process.pid && !live.has(store.root + ':' + key + ':' + item.id))) continue
        item.status = 'interrupted'; item.error = '服务曾中断，请核对原对话和操作回执；不会自动重放'; touch(item)
        queue.paused = true; queue.reason = item.error; changed = true
      }
      if (changed) persist(store, key, queue)
    })
  }
  async function execute(key: string, item: QueuedMessage, controller: AbortController, release: () => void) {
    const token = store.root + ':' + key + ':' + item.id, signal = AbortSignal.any([controller.signal, AbortSignal.timeout(600000)])
    let status: QueuedMessage['status'] = 'complete', error: string | undefined, turnId: string | undefined
    try {
      await runConversation(store, key, item.content, item.modelId, signal, event => {
        onEvent(key,event)
        if (event.type === 'accepted') turnId = (event.message as {id: string}).id
        if (event.type === 'group_removed') { const removed = string(event.groupId); active.get(removed)?.abort(); pauseQueue(store, removed, '群聊已删除，恢复后需手动核对队列') }
      }, item.memberIds, {requestId: 'queue-' + item.id})
      const turn = store.turns(key).find(turn => turn.requestId === 'queue-' + item.id)
      turnId ||= turn?.id
      if (signal.aborted) throw new HttpError(499, '执行已停止或超过 10 分钟，请核对原对话')
      if (!turn || unfinished(turn)) throw new HttpError(409, '本轮尚未完成，请查看原对话后决定如何继续')
    } catch (cause) {
      status = signal.aborted ? 'interrupted' : 'failed'
      error = cause instanceof HttpError ? cause.message : '执行失败，请检查原对话、模型配置或连接'
    } finally {
      // Keep the conversation locked until its durable completion receipt is committed.
      try {
        lock(store, key, () => {
          const queue = read(store, key), record = queue.items.find(record => record.id === item.id)
          if (!record || record.status !== 'running' || record.pid !== process.pid) throw new HttpError(409, '队列执行回执版本不一致，请核对原对话')
          Object.assign(record, {status, error, turnId}); touch(record)
          if (status !== 'complete') { queue.paused = true; queue.reason = error }
          persist(store, key, queue)
        })
      } finally {
        if (active.get(key) === controller) active.delete(key)
        owned.delete(key); live.delete(token); release()
        onEvent(key,{type:'queue_finished',conversationId:key,status,turnId})
      }
    }
  }
  async function tick() {
    if (stopped || ticking) return
    ticking = true
    try {
      for (const session of store.sessions(true).filter(session => session.kind !== 'consult')) {
        const key = session.id
        if (!fs.existsSync(store.file('chats', key, fileName))) continue
        try {
          recover(key)
          if (session.archivedAt) { if (!read(store, key).paused) pauseQueue(store, key, '目标群聊已删除'); continue }
          if (jobs.size >= 2 || active.has(key) || store.isRunning(key)) continue
          const claimed = lock(store, key, () => {
            const queue = read(store, key)
            if (queue.paused || queue.items.some(item => item.status === 'running')) return
            const item = queue.items.find(item => item.status === 'queued')
            if (!item) return
            const latest = visibleSession(store, key)
            if (latest.lifecycleRevision !== item.lifecycleRevision || item.memberIds?.some(member => !store.groupMembers(key).includes(member))) {
              queue.paused = true; queue.reason = '群聊生命周期或指定成员已变化，请核对并取消失效消息后恢复'; persist(store, key, queue); return
            }
            const release = store.acquireRun(key)
            try { item.status = 'running'; item.pid = process.pid; touch(item); persist(store, key, queue) } catch (error) { release(); throw error }
            const controller = new AbortController(); active.set(key, controller); owned.set(key, controller); live.add(store.root + ':' + key + ':' + item.id)
            return {item, controller, release}
          })
          if (claimed) {
            const job = execute(key, claimed.item, claimed.controller, claimed.release).catch(() => { /* A missing receipt is recovered as interrupted, never replayed. */ })
            jobs.add(job); void job.finally(() => jobs.delete(job))
          }
        } catch (error) {
          if (error instanceof HttpError && error.status === 409) continue
          if (!session.archivedAt) try { pauseQueue(store, key, '队列暂不可执行，请检查成员、记录或目录权限') } catch { /* Retry recovery later. */ }
        }
      }
    } finally { ticking = false }
  }
  let timer: ReturnType<typeof setInterval> | undefined
  return {
    tick,
    async drain() { await Promise.all([...jobs]) },
    start() { if (!timer) { timer = setInterval(() => { void tick().catch(() => {}) }, 1000); timer.unref() } },
    stop() { stopped = true; if (timer) clearInterval(timer); for (const controller of owned.values()) controller.abort() },
  }
}
