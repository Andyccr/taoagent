import fs from 'node:fs'
import readline from 'node:readline'
import crypto from 'node:crypto'
import { setImmediate } from 'node:timers/promises'
import { Store, HttpError, type Message } from './store.ts'

export function workspaceConversations(store: Store, running: string[]) {
  const agents = new Map(store.agents().map(agent => [agent.id, agent]))
  return store.sessions().filter(session => session.kind !== 'consult' && (session.kind === 'group' || agents.has(session.agentId))).map(session => {
    const file = store.file('chats', session.id, 'messages.jsonl')
    const bytes = fs.existsSync(file) ? fs.statSync(file).size : 0
    const revision = session.updatedAt + ':' + bytes
    const actions = JSON.parse(store.text('chats', session.id, 'actions.json') || '[]') as {status: string}[]
    const latest = store.turns(session.id).at(-1)
    const waiting = actions.filter(action => ['pending', 'uncertain'].includes(action.status)).length
    const working = running.includes(session.id)
    const failed = !working && latest?.speakers.some(speaker => speaker.status === 'failed')
    return { id: session.id, target: { type: session.kind === 'group' ? 'group' : 'agent', id: session.kind === 'group' ? session.id : session.agentId }, title: session.kind === 'group' ? session.title : agents.get(session.agentId)?.name || session.title, updatedAt: session.updatedAt, revision, hasMessages: bytes > 0, status: waiting ? 'waiting' : working ? 'running' : failed ? 'failed' : 'idle', waiting }
  })
}

interface SearchHit { sessionId: string; messageId: string; title: string; target: {type: string; id: string}; at: string; author: string; excerpt: string; status?: string }
const hitKey = (hit: SearchHit) => [hit.at, hit.sessionId, hit.messageId].join('|')

// Scan JSONL incrementally: no persisted index, private memory, or whole-history allocation.
export async function searchWorkspace(store: Store, params: URLSearchParams, signal?: AbortSignal, sanitize: (content: string) => string = content => content) {
  const query = (params.get('q') || '').trim()
  if (!query || query.length > 200) throw new HttpError(400, '请输入 1–200 个字符的搜索词')
  const scope = params.get('session') || ''
  const rawLimit = params.get('limit') || '30', limit = Number(rawLimit)
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, '分页数量应为 1–100')
  const signature = crypto.createHash('sha256').update(JSON.stringify([query, scope])).digest('hex')
  let before = ''
  if (params.has('cursor')) {
    try {
      const cursor = JSON.parse(Buffer.from(params.get('cursor') || '', 'base64url').toString('utf8')) as {signature: string; before: string}
      if (cursor.signature !== signature || typeof cursor.before !== 'string' || !cursor.before || cursor.before.length > 400) throw new Error('cursor')
      before = cursor.before
    } catch { throw new HttpError(400, '搜索游标已失效，请重新搜索') }
  }
  const conversations = workspaceConversations(store, []).filter(session => !scope || session.id === scope)
  if (scope && !conversations.length) throw new HttpError(404, '可搜索的对话不存在')
  const hits: SearchHit[] = [], needles = query.toLocaleLowerCase().split(/\s+/u)
  let scanned = 0
  for (const session of conversations) {
    signal?.throwIfAborted()
    const file = store.file('chats', session.id, 'messages.jsonl')
    if (!fs.existsSync(file)) continue
    const stream = fs.createReadStream(file, {encoding: 'utf8', signal})
    const lines = readline.createInterface({input: stream, crlfDelay: Infinity})
    try {
      for await (const line of lines) {
        signal?.throwIfAborted()
        if (++scanned % 256 === 0) await setImmediate(undefined, {signal})
        if (!line.trim()) continue
        let message: Message
        try { message = JSON.parse(line) as Message } catch { throw new HttpError(409, '历史记录格式异常，请先检查原始数据') }
        if (message.kind || typeof message.content !== 'string') continue
        const content = sanitize(message.content), text = content.toLocaleLowerCase()
        if (!needles.every(needle => text.includes(needle))) continue
        const start = Math.max(0, text.indexOf(needles[0]) - 70)
        const hit: SearchHit = {sessionId: session.id, messageId: message.id, title: session.title, target: session.target, at: message.at, author: message.role === 'user' ? '你' : message.agentName || '助手', status: message.status, excerpt: (start ? '…' : '') + content.slice(start, start + 320) + (content.length > start + 320 ? '…' : '')}
        if (before && hitKey(hit) >= before) continue
        hits.push(hit); hits.sort((a, b) => hitKey(a) < hitKey(b) ? 1 : hitKey(a) > hitKey(b) ? -1 : 0)
        if (hits.length > limit + 1) hits.pop()
      }
    } finally { lines.close(); stream.destroy() }
  }
  const hasMore = hits.length > limit
  if (hasMore) hits.pop()
  return {query, hits, hasMore, cursor: hasMore ? Buffer.from(JSON.stringify({signature, before: hitKey(hits[hits.length - 1])})).toString('base64url') : null}
}
