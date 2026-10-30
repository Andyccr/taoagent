import crypto from 'node:crypto'
import {Store,HttpError} from './store.ts'
import {lifeState} from './social-state.ts'
import {type CollaborativeTask,taskSatisfied} from './collaboration.ts'
import {actions} from './execution.ts'
import {queueSummary} from './queue.ts'

/** User inspection only. Never injected into an agent's private context. */
export function spaceBrief(store:Store,key:string) {
  const session=store.requireActiveSession(key)
  if(session.kind!=='group')throw new HttpError(400,'请选择共同空间')
  const memberIds=store.groupMembers(key),state=lifeState(store,key)
  const messages=store.messages(key).filter(item=>item.status==='complete'&&!item.kind)
  const messageIds=new Set(messages.map(item=>item.id))
  const allTasks=JSON.parse(store.text('chats',key,'tasks.json')||'[]') as CollaborativeTask[]
  const work=allTasks.map(task=>{
    const blockedBy=(task.dependsOnTaskIds||[]).filter(id=>!allTasks.some(other=>other.id===id&&taskSatisfied(other)))
    const stage=taskSatisfied(task)?'done':task.review?.status==='awaiting_review'?'review':blockedBy.length?'blocked':'ready'
    return {id:task.id,title:task.title,description:task.description||'',assigneeId:task.assigneeId,assigneeActive:memberIds.includes(task.assigneeId),stage,blockedBy,acceptanceCriteria:task.acceptanceCriteria||'',result:task.result||'',review:task.review,at:task.at}
  })
  const pending=actions(store,key).filter(item=>item.status==='pending'||item.status==='uncertain').map(item=>({id:item.id,agentId:item.agentId,name:item.name,status:item.status,at:item.at}))
  const queue=queueSummary(store,key)
  const members=memberIds.map(agentId=>{
    const agent=store.agent(agentId),personal=state.members.find(item=>item.agentId===agentId)
    const modelId=agent.modelId||store.account().defaultModelId||store.models()[0]?.id
    return {agentId,name:agent.name,configured:store.models().some(model=>model.id===modelId),interests:personal?.interests||'',attention:personal?.attention||'',stance:personal?.stance||'',lastAt:personal?.lastAt}
  })
  // Links record explicit ownership and citations, never inferred friendship or consensus.
  const superseded=new Set(state.entries.flatMap(item=>item.supersedes?[item.supersedes]:[]))
  const currentEntries=state.entries.filter(entry=>memberIds.includes(entry.agentId)&&!superseded.has(entry.id)).slice(-24)
  const activeAgendas=state.agendas.filter(item=>item.status!=='done')
  const nodes:{id:string;kind:'member'|'episode'|'idea'|'agenda'|'source';label:string;agentId?:string;recordId?:string;text:string;at?:string}[]=members.map(member=>({id:'member:'+member.agentId,kind:'member',label:member.name,agentId:member.agentId,text:member.attention||member.interests||'还没有设置关注'}))
  const edges:{from:string;to:string;kind:'owns'|'cites'}[]=[]
  for(const entry of currentEntries){
    const nodeId='entry:'+entry.id
    nodes.push({id:nodeId,kind:entry.kind==='episode'?'episode':'idea',label:entry.text.slice(0,35),agentId:entry.agentId,recordId:entry.id,text:entry.text,at:entry.at})
    edges.push({from:'member:'+entry.agentId,to:nodeId,kind:'owns'})
    for(const sourceId of entry.sourceIds.filter(id=>messageIds.has(id))){
      const source=messages.find(item=>item.id===sourceId)!
      if(!nodes.some(item=>item.id==='source:'+sourceId))nodes.push({id:'source:'+sourceId,kind:'source',label:source.content.slice(0,35),recordId:sourceId,text:source.content,at:source.at})
      edges.push({from:nodeId,to:'source:'+sourceId,kind:'cites'})
    }
  }
  for(const agenda of activeAgendas.slice(-12)){
    const nodeId='agenda:'+agenda.id
    nodes.push({id:nodeId,kind:'agenda',label:agenda.title,agentId:agenda.ownerId,recordId:agenda.id,text:agenda.question,at:agenda.updatedAt})
    if(memberIds.includes(agenda.ownerId))edges.push({from:'member:'+agenda.ownerId,to:nodeId,kind:'owns'})
  }
  const attention=[
    ...pending.map(item=>({kind:'approval',id:item.id,title:item.status==='uncertain'?'需要核对执行结果':'有操作等待审批',detail:item.name})),
    ...work.filter(item=>item.stage==='review').map(item=>({kind:'review',id:item.id,title:'有成果等待验收',detail:item.title})),
    ...work.filter(item=>item.stage!=='done'&&!item.assigneeActive).map(item=>({kind:'assignment',id:item.id,title:'任务负责人已离开空间',detail:item.title})),
    ...members.filter(item=>!item.configured).map(item=>({kind:'model',id:item.agentId,title:'成员尚未连接模型',detail:item.name})),
    ...(queue.paused&&queue.pending?[{kind:'queue',id:key,title:'后续消息已暂停',detail:queue.pending+' 条排队消息等待核对'}]:[])
  ]
  const value={purpose:session.purpose||'',running:store.isRunning(key),members,attention,work,queue,
    recent:messages.slice(-8).map(item=>({id:item.id,agentId:item.agentId,author:item.agentName||'你',text:item.content.slice(0,420),excerpted:item.content.length>420,at:item.at})),
    graph:{nodes,edges,notice:'用户观察视角。连线仅表示记录归属与明确引用，不代表认同、友谊或已经发生的涌现。最近 24 条有效经历及 12 个持续议题；完整记录保留在记忆与历史中。'},
    counts:{messages:messages.length,agendas:activeAgendas.length,ready:work.filter(item=>item.stage==='ready').length,blocked:work.filter(item=>item.stage==='blocked').length,review:work.filter(item=>item.stage==='review').length,done:work.filter(item=>item.stage==='done').length}}
  return {revision:crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),...value}
}
