import { Store, HttpError, string, id, json } from './store.ts'

export interface ReasoningRecord {
  id: string; turnId: string; eventId: string; agentId: string; topic: string
  kind: 'hypothesis' | 'finding' | 'decision' | 'challenge' | 'revision' | 'synthesis'
  claim: string; rationale: string; uncertainty: string; evidenceIds: string[]
  dependsOn: string[]; challenges: string[]; revisesId?: string; at: string
  novelty?: string; validation?: string
}
export function reasoningRecords(store: Store, key: string): ReasoningRecord[] { store.session(key); return JSON.parse(store.text('chats', key, 'reasoning.json') || '[]') as ReasoningRecord[] }
export function recordIds(value: unknown, label: string): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 8 || value.some(item => typeof item !== 'string' || !item)) throw new HttpError(400, label + '须为最多8个ID')
  return [...new Set(value as string[])]
}
export function validateReasoningIds(store: Store, key: string, value: unknown) {
  const ids = recordIds(value, '论证引用'), all = reasoningRecords(store, key)
  if (ids.some(source => !all.some(item => item.id === source))) throw new HttpError(400, '论证引用必须来自本对话')
  return ids
}
export function recordReasoning(store: Store, key: string, agentId: string, turnId: string, eventId: string, recordId: string, args: Record<string, unknown>) {
  if (!store.groupMembers(key).includes(agentId)) throw new HttpError(403, '只能记录当前成员的公开论证')
  const all = reasoningRecords(store, key), existing = all.find(item => item.id === recordId)
  if (existing) return existing
  const kind = string(args.kind) as ReasoningRecord['kind']
  if (!['hypothesis', 'finding', 'decision', 'challenge', 'revision', 'synthesis'].includes(kind)) throw new HttpError(400, '请选择假设、发现、决定、质疑、修正或综合候选')
  const topic = string(args.topic, '主议题').trim(), claim = string(args.claim).trim(), rationale = string(args.rationale).trim(), uncertainty = string(args.uncertainty).trim()
  if (!topic || topic.length > 120 || !claim || claim.length > 1200 || !rationale || rationale.length > 1200 || uncertainty.length > 800) throw new HttpError(400, '议题最多120字符，结论与简短依据须为1–1200字符，不确定事项最多800字符')
  const evidenceIds = recordIds(args.evidenceIds, '公开证据'), dependsOn = recordIds(args.dependsOn, '前提'), challenges = recordIds(args.challenges, '质疑目标'), revisesId = string(args.revisesId) || undefined
  const publicMessages = store.messages(key).filter(item => item.status === 'complete' && !item.kind)
  if (evidenceIds.some(source => !publicMessages.some(item => item.id === source))) throw new HttpError(400, '证据必须是本对话已完成的公开消息')
  if ([...dependsOn, ...challenges, ...(revisesId ? [revisesId] : [])].some(source => !all.some(item => item.id === source))) throw new HttpError(400, '论证关系只能指向本对话已存在记录，不能引用自身、未来记录或其他对话')
  if (kind === 'revision') {
    const target = all.find(item => item.id === revisesId)
    if (!target || target.agentId !== agentId) throw new HttpError(403, '只能修正自己的记录；反驳其他成员请记录质疑')
    if (target.topic !== topic) throw new HttpError(400, '修正必须保留原议题')
    if (all.some(item => item.revisesId === revisesId)) throw new HttpError(409, '该记录已有新版本，请读取最新论证后修正')
  } else if (revisesId) throw new HttpError(400, '只有revision可取代旧记录')
  if (kind === 'challenge' && !challenges.length || kind !== 'challenge' && challenges.length) throw new HttpError(400, '质疑需要明确目标，其他类型不使用challenges')
  const novelty=string(args.novelty).trim(),validation=string(args.validation).trim()
  if(kind==='synthesis'){
    const premises=dependsOn.map(source=>all.find(item=>item.id===source)!)
    const view=reasoningView(store,key,{limit:Number.MAX_SAFE_INTEGER}).records
    if(new Set(premises.map(item=>item.agentId)).size<2)throw new HttpError(400,'综合候选须关联至少两位成员的公开前提')
    if(premises.some(item=>view.find(record=>record.id===item.id)?.status==='superseded'))throw new HttpError(409,'前提已被修正，请读取最新版本后组合')
    if(!novelty||novelty.length>1200||!validation||validation.length>1200)throw new HttpError(400,'请说明新组合带来的变化和具体可检验方法，各1–1200字符')
    if(premises.some(item=>item.claim.trim()===claim))throw new HttpError(400,'综合候选不能直接复制某个前提')
  }
  const item: ReasoningRecord = { id: id(recordId), turnId, eventId, agentId, topic, kind, claim, rationale, uncertainty, evidenceIds, dependsOn, challenges, revisesId,...(kind==='synthesis'?{novelty,validation}:{}), at: new Date().toISOString() }
  all.push(item); json(store.file('chats', key, 'reasoning.json'), all); return item
}

export function reasoningView(store: Store, key: string, options: { topic?: string; recordId?: string; before?: string; limit?: number } = {}) {
  const all = reasoningRecords(store, key), replaced = new Set(all.flatMap(item => item.revisesId ? [item.revisesId] : []))
  const contested = new Set(all.filter(item => !replaced.has(item.id)).flatMap(item => item.challenges))
  const statuses = new Map<string, 'proposed' | 'superseded' | 'contested' | 'needs_review'>()
  for (const item of all) statuses.set(item.id, replaced.has(item.id) ? 'superseded' : contested.has(item.id) ? 'contested' : 'proposed')
  // Dependencies point to earlier records; propagate changed premises through all descendants.
  for (const item of all) if (statuses.get(item.id) === 'proposed' && item.dependsOn.some(source => statuses.get(source) !== 'proposed')) statuses.set(item.id, 'needs_review')
  let selected = all.filter(item => (!options.topic || item.topic === options.topic) && (!options.recordId || item.id === options.recordId))
  if (options.recordId && !selected.length) throw new HttpError(404, '本对话没有此论证记录')
  const total=selected.length
  if(options.before){const cursor=selected.findIndex(item=>item.id===options.before);if(cursor<0)throw new HttpError(404,'论证历史游标不属于当前查询');selected=selected.slice(0,cursor)}
  const limit = options.limit ?? 50
  const page=selected.slice(-limit),omitted=Math.max(0, selected.length - limit)
  return { total, omitted,nextBefore:omitted?page[0]?.id:undefined, records: page.map(item => ({ ...item, status: statuses.get(item.id)! })), notice: '这是成员公开的结论、简短依据和修正关系，不是模型隐藏思考；所有记录的事实真实性仍需验证。needs_review表示依赖的前提已变化或存在质疑。' }
}

export function reasoningContext(store: Store, key: string, topic: string, budget: number, referenced: string[] = []) {
  const notice='公开论证摘要；完整依据、不确定事项及证据请用read_reasoning读取。superseded为旧版本，contested有质疑，needs_review的前提已变化，均不能当作已验证事实。'
  const all = reasoningView(store, key, { limit: Number.MAX_SAFE_INTEGER }).records
  const candidates = [...all].reverse().sort((a, b) => Number(referenced.includes(b.id)) - Number(referenced.includes(a.id)) || Number(b.topic === topic) - Number(a.topic === topic))
  const selected: { id: string; agentId: string; topic: string; claim: string; status: string; dependsOn: string[]; revisesId?: string }[] = []
  for (const item of candidates) {
    const entry = { id: item.id, agentId: item.agentId, topic: item.topic, claim: item.claim, status: item.status, dependsOn: item.dependsOn, revisesId: item.revisesId }
    if (JSON.stringify({ records: [...selected, entry], omitted: all.length - selected.length - 1,notice }).length <= budget) selected.push(entry)
    if (selected.length >= 6) break
  }
  return JSON.stringify({ records: selected, omitted: all.length - selected.length, notice })
}
