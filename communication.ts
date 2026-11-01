import { Store, HttpError, string, type Turn, type MessageIntent } from './store.ts'
import { validateReasoningIds } from './reasoning.ts'

export type Delivery = Turn['speakers'][number]
export const intents: MessageIntent[] = ['inform', 'question', 'challenge', 'proposal', 'answer', 'revision']
export const intentLabels: Record<MessageIntent, string> = { inform: '告知', question: '提问', challenge: '质疑', proposal: '提案', answer: '回答', revision: '修正' }

export function envelope(store: Store, key: string, turn: Turn, sender: string, receiver: string, parent: Delivery, args: Record<string, unknown>) {
  const intent = string(args.intent, 'inform') as MessageIntent
  if (!intents.includes(intent)) throw new HttpError(400, '未知的通讯意图')
  const replyTo = string(args.replyTo) || undefined
  const target = replyTo ? turn.speakers.find(item => item.eventId === replyTo) : undefined
  if (replyTo && (!target || target.agentId !== sender || target.fromAgentId !== receiver)) throw new HttpError(400, '回复必须关联本轮发给自己的消息，并发回原发送者')
  const topic = string(args.topic, target?.topic || parent.topic || '主议题').trim()
  if (!topic || topic.length > 120) throw new HttpError(400, '议题应为1–120字符')
  if (target && topic !== (target.topic || '主议题')) throw new HttpError(400, '回复必须保留原议题')
  if (args.evidenceIds !== undefined && (!Array.isArray(args.evidenceIds) || args.evidenceIds.length > 8 || args.evidenceIds.some(item => typeof item !== 'string'))) throw new HttpError(400, '证据应为最多8个本群公开消息ID')
  const evidenceIds = [...new Set((args.evidenceIds || []) as string[])]
  const publicMessages = store.messages(key).filter(item => item.status === 'complete' && !item.kind)
  if (evidenceIds.some(id => !publicMessages.some(item => item.id === id))) throw new HttpError(400, '证据必须引用本群已完成的公开消息，不能引用其他群或私聊')
  const reason=string(args.reason).trim()
  if(reason.length>800)throw new HttpError(400,'联系原因最多800字符')
  const reasoningIds=validateReasoningIds(store,key,args.reasoningIds)
  return { intent, replyTo, topic, evidenceIds, reasoningIds, reason, parentEventId: parent.eventId }
}

// Exact content deduplication only: new evidence and distinct intents remain deliverable.
export function duplicateDelivery(turn: Turn, sender: string, receiver: string, body: string, meta: ReturnType<typeof envelope>, taskId?: string) {
  return turn.speakers.find(item => item.fromAgentId === sender && item.agentId === receiver && item.taskId === taskId && item.replyTo === meta.replyTo && (item.topic || '主议题') === meta.topic && (item.intent || 'inform') === meta.intent && item.body === body && JSON.stringify([...(item.evidenceIds || [])].sort()) === JSON.stringify([...meta.evidenceIds].sort()) && JSON.stringify([...(item.reasoningIds || [])].sort()) === JSON.stringify([...meta.reasoningIds].sort()))
}

export function discussionView(turn: Turn, topic?: string) {
  const entries = turn.speakers.filter(item => !topic || (item.topic || '主议题') === topic)
  const questions = entries.filter(item => item.intent === 'question' || item.intent === 'challenge').map(item => {
    const responses = turn.speakers.filter(reply => reply.replyTo === item.eventId && reply.agentId === item.fromAgentId && reply.fromAgentId === item.agentId && ['answer', 'revision'].includes(reply.intent || '') && reply.status === 'complete')
    return { eventId: item.eventId, topic: item.topic || '主议题', askedBy: item.fromAgentId, askedOf: item.agentId, status: item.status === 'skipped' ? 'undeliverable' : responses.length ? 'responded' : 'open', responseIds: responses.map(reply => reply.eventId), notice: '已回应只表示回答已送达，不代表事实已验证或分歧已解决' }
  })
  for(const item of entries.filter(item=>item.publicMessageId&&item.fromAgentId&&['question','challenge'].includes(item.responseIntent||''))){
    const responses=turn.speakers.filter(reply=>reply.sourceMessageId===item.publicMessageId&&reply.agentId===item.fromAgentId&&reply.fromAgentId===item.agentId&&['answer','revision'].includes(reply.responseIntent||reply.intent||'')&&reply.status==='complete')
    questions.push({eventId:item.eventId,topic:item.topic||'主议题',askedBy:item.agentId,askedOf:item.fromAgentId!,status:responses.length?'responded':'open',responseIds:responses.map(reply=>reply.eventId),notice:'公开追问的关联回应；已经回应不代表争议已解决'})
  }
  return { turnId: turn.id, topics: [...new Set(entries.map(item => item.topic || '主议题'))], usage: turn.usage,
    events: entries.map(item => ({ eventId: item.eventId, from: item.fromAgentId || 'user', to: item.agentId, parentEventId: item.parentEventId, replyTo: item.replyTo, sourceMessageId:item.sourceMessageId,responseIntent:item.responseIntent,topic: item.topic || '主议题', intent: item.intent || 'inform', evidenceIds: item.evidenceIds || [], reasoningIds:item.reasoningIds||[],reason:item.reason||'', status: item.status, content: (item.body || turn.content).slice(0, 600), excerpted: (item.body || turn.content).length > 600 })), questions }
}

export function relationshipView(store: Store,key: string){
  const session=store.session(key),members=store.groupMembers(key),turns=store.recentTurns(key,20)
  const edges=new Map<string,{from:string;to:string;delivered:number;failed:number;pending:number;openQuestions:number}>()
  for(const turn of turns){
    const questions=discussionView(turn).questions
    for(const entry of turn.speakers){
      if(!entry.fromAgentId)continue
      const pair=entry.fromAgentId+':'+entry.agentId
      const edge=edges.get(pair)||{from:entry.fromAgentId,to:entry.agentId,delivered:0,failed:0,pending:0,openQuestions:0}
      if(entry.status==='complete')edge.delivered++
      else if(['failed','skipped'].includes(entry.status))edge.failed++
      else edge.pending++
      if(questions.some(item=>item.eventId===entry.eventId&&item.status==='open'))edge.openQuestions++
      edges.set(pair,edge)
    }
  }
  return {windowTurns:turns.length,nodes:members.map(member=>({id:member,name:store.agent(member).name,role:session.memberRoles?.[member]||'',coordinator:session.coordinatorId===member})),edges:[...edges.values()],notice:'最近20轮的投递关系；成功送达不等于回答正确，不作为成员可信度评分。'}
}

export function recommendAgents(store:Store,key:string,sender:string,query:string){
  if(!query.trim()||query.length>2000)throw new HttpError(400,'协作需求应为1–2000字符')
  const tokens=(value:string)=>new Set((value.toLowerCase().match(/[a-z0-9_]+|[\p{Script=Han}]+/gu)||[]).flatMap(word=>/\p{Script=Han}/u.test(word)?word.length===1?[word]:[...word].slice(0,120).flatMap((_,index,chars)=>index+1<chars.length?[chars[index]+chars[index+1]]:[]):[word]))
  const terms=tokens(query),relations=relationshipView(store,key)
  return {candidates:relations.nodes.filter(member=>member.id!==sender).map(member=>{
    const roleTokens=tokens(member.name+' '+member.role),matched=[...terms].filter(term=>roleTokens.has(term))
    const incoming=relations.edges.filter(edge=>edge.to===member.id)
    return {...member,matchedTerms:matched,score:matched.length,pending:incoming.reduce((sum,edge)=>sum+edge.pending,0),openQuestions:incoming.reduce((sum,edge)=>sum+edge.openQuestions,0)}
  }).sort((a,b)=>b.score-a.score||a.pending-b.pending||a.id.localeCompare(b.id)),notice:'按公开名称与群内职责的字词匹配、待处理投递排序；零分表示未知匹配，不推断专长或可信度。模型自主选择收件人。'}
}
