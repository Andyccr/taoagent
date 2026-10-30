import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,json} from '../store.ts'
import {seedTeam} from '../defaults.ts'
import {runConversation,tasks} from '../runtime.ts'
import {executeExternal,decide,type Action} from '../execution.ts'
import {discussionUpdates,publicMessage,taskSatisfied} from '../collaboration.ts'
import {recordReasoning,reasoningView} from '../reasoning.ts'
import {discussionView} from '../communication.ts'
import {type Turn} from '../store.ts'
import {createApp} from '../app.ts'

function temp(){fs.mkdirSync('.test-tmp',{recursive:true});return fs.mkdtempSync(path.resolve('.test-tmp','collaboration-'))}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return `http://127.0.0.1:${address.port}`}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
interface Body{model:string;messages:{role:string;content:string}[]}
async function body(req:http.IncomingMessage){let raw='';for await(const chunk of req)raw+=chunk;return JSON.parse(raw) as Body}
function reply(res:http.ServerResponse,text:string,tool?:{name:string;args:Record<string,unknown>}){const delta=tool?{tool_calls:[{index:0,id:'call',function:{name:tool.name,arguments:JSON.stringify(tool.args)}}]}:{content:text};res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:tool?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')}

test('public follow-up questions stay open until the addressed speaker actually answers the corresponding message',()=>{
 const turn:Turn={id:'turn',content:'discuss',modelId:'',at:new Date().toISOString(),updatedAt:new Date().toISOString(),speakers:[{eventId:'question',agentId:'peer',fromAgentId:'main',responseIntent:'question',publicMessageId:'public-question',status:'complete'},{eventId:'unrelated',agentId:'main',fromAgentId:'peer',sourceMessageId:'somewhere-else',responseIntent:'answer',status:'complete'}]}
 assert.equal(discussionView(turn).questions[0].status,'open')
 turn.speakers.push({eventId:'actual-answer',agentId:'main',fromAgentId:'peer',sourceMessageId:'public-question',responseIntent:'answer',status:'pending'})
 assert.equal(discussionView(turn).questions[0].status,'open');turn.speakers.at(-1)!.status='complete'
 assert.equal(discussionView(turn).questions[0].status,'responded')
})

test('removed bots stay out of routing and seeding, preserve history, reject stale edits and restore explicitly',()=>{
 const home=temp(),store=new Store(home)
 try{
  seedTeam(store);const chat=store.directSession('creative');store.append(chat.id,'user','preserved user history');const version=store.agentVersion('creative')
  store.saveAgent({...store.agent('creative'),name:'创意伙伴新版'},'new rules','memory')
  assert.throws(()=>store.archiveAgent('creative','cleanup','user',version),/已更改/)
  store.archiveAgent('creative','user confirmed curation');assert(!store.agents().some(agent=>agent.id==='creative'));assert(!store.groupMembers('my-team').includes('creative'))
  assert.throws(()=>store.resolveModel('creative'),/已移除/);assert.throws(()=>store.directSession('creative'),/已移除/)
  assert.throws(()=>store.saveAgent({id:'creative',name:'recreated'},'rules',''),/已移除/);assert.throws(()=>store.archiveAgent('main','cleanup'),/受保护/)
  seedTeam(new Store(home));assert(!store.agents().some(agent=>agent.id==='creative'));assert.equal(store.messages(chat.id)[0].content,'preserved user history')
  store.restoreAgent('creative');assert(store.agents().some(agent=>agent.id==='creative'));assert.equal(store.agent('creative').name,'创意伙伴新版');assert.equal(store.text('agents','creative','MEMORY.md'),'memory')
 }finally{fs.rmSync(home,{recursive:true,force:true})}
})

test('create and delete tools do nothing before approval; denied creation and changed deletion target remain safe',async()=>{
 const home=temp(),store=new Store(home),chat=store.directSession('main')
 try{
  const events:Action[]=[]
  const created=await executeExternal(store,chat.id,'main','turn','create','create_agent',{name:'临时专家',rules:'分析'},new AbortController().signal,event=>{
   if(event.type==='approval'&&(event.action as Action).status==='pending'){assert(!store.agents().some(agent=>agent.name==='临时专家'));events.push(event.action as Action);queueMicrotask(()=>decide(store,chat.id,(event.action as Action).id,true))}
  }) as {agentId:string}
  assert(created.agentId);assert.equal(events.length,1)
  await assert.rejects(executeExternal(store,chat.id,'main','turn','denied','create_agent',{name:'拒绝的专家',rules:'分析'},new AbortController().signal,event=>{if(event.type==='approval'&&(event.action as Action).status==='pending')queueMicrotask(()=>decide(store,chat.id,(event.action as Action).id,false))}),/拒绝/)
  assert(!store.agents().some(agent=>agent.name==='拒绝的专家'))
  await assert.rejects(executeExternal(store,chat.id,'main','turn','stale-delete','delete_agent',{agentId:created.agentId,reason:'不再需要'},new AbortController().signal,event=>{
   if(event.type==='approval'&&(event.action as Action).status==='pending')queueMicrotask(()=>{store.saveAgent({...store.agent(created.agentId),name:'新名字'},'changed rules','changed memory');decide(store,chat.id,(event.action as Action).id,true)})
  }),/已更改/)
  assert(store.agents().some(agent=>agent.id===created.agentId))
  await executeExternal(store,chat.id,'main','turn','approved-delete','delete_agent',{agentId:created.agentId,reason:'用户同意移除'},new AbortController().signal,event=>{if(event.type==='approval'&&(event.action as Action).status==='pending'){assert(store.agents().some(agent=>agent.id===created.agentId));queueMicrotask(()=>decide(store,chat.id,(event.action as Action).id,true))}})
  assert(store.agent(created.agentId).archivedAt)
 }finally{fs.rmSync(home,{recursive:true,force:true})}
})

test('new public messages can be read during a turn with explicit excerpt and full-text pagination; other conversations remain private',()=>{
 const home=temp(),store=new Store(home)
 try{
  const chat=store.directSession('main');store.saveAgent({id:'peer',name:'同事'},'rules','')
  const foreign=store.directSession('peer'),secret=store.append(foreign.id,'assistant','PRIVATE','complete')
  const initial=store.append(chat.id,'user','start'),turn={id:initial.id,at:initial.at,updatedAt:initial.at,content:'start',modelId:'',speakers:[]}
  const message=store.append(chat.id,'assistant','NEW_EVIDENCE_'.repeat(500),'complete',{agentId:'peer',agentName:'同事',turnId:turn.id})
  const seen=new Set([initial.id]),updates=discussionUpdates(store,chat.id,turn,seen,undefined,1200)
  assert.equal(updates.messages[0].id,message.id);assert(updates.messages[0].excerpted);assert(!seen.has(message.id));assert(!JSON.stringify(updates).includes('PRIVATE'))
  let offset=0,content='';while(true){const {page}=publicMessage(store,chat.id,{messageId:message.id,offset},127);content+=page.content;if(page.nextOffset===null)break;offset=page.nextOffset}
  assert.equal(content,message.content);assert.throws(()=>publicMessage(store,chat.id,{messageId:secret.id},100),/本对话/)
 }finally{fs.rmSync(home,{recursive:true,force:true})}
})

test('synthesis candidates require different contributors, retain novelty and test plan, and invalidate when a premise changes',()=>{
 const home=temp(),store=new Store(home)
 try{
  store.saveAgent({id:'peer',name:'同事'},'rules','');const group=store.saveGroup('讨论',['main','peer'])
  const record=(agent:string,key:string,args:Record<string,unknown>)=>recordReasoning(store,group.id,agent,'turn','event',key,{topic:'设计',rationale:'公开依据',...args})
  record('main','a',{kind:'hypothesis',claim:'隔离不同租户的记录'})
  record('main','c',{kind:'finding',claim:'同一作者的第二个观点'})
  record('peer','b',{kind:'finding',claim:'稳定ID解决重名'})
  assert.throws(()=>record('main','same-author',{kind:'synthesis',claim:'综合',dependsOn:['a','c'],novelty:'组合',validation:'测试'}),/至少两位/)
  assert.throws(()=>record('main','copy',{kind:'synthesis',claim:'稳定ID解决重名',dependsOn:['a','b'],novelty:'组合',validation:'测试'}),/直接复制/)
  const synthesis=record('peer','combined',{kind:'synthesis',claim:'使用租户ID与稳定记录ID构成联合标识',dependsOn:['a','b'],novelty:'同时约束租户隔离和同名冲突',validation:'覆盖跨租户和同租户重名样例'})
  assert.equal(synthesis.dependsOn.length,2);assert(synthesis.novelty);assert(synthesis.validation)
  record('main','a-revised',{kind:'revision',claim:'租户可共享记录，需要显式授权边界',revisesId:'a'})
  assert.equal(reasoningView(store,group.id).records.find(item=>item.id==='combined')?.status,'needs_review')
  assert.throws(()=>record('peer','obsolete',{kind:'synthesis',claim:'旧组合',dependsOn:['a','b'],novelty:'组合',validation:'测试'}),/前提已被修正/)
 }finally{fs.rmSync(home,{recursive:true,force:true})}
})

test('private consultation calls another model with the necessary question, excludes both bots private memory and private transcript',async()=>{
 const home=temp(),store=new Store(home);let managerCalls=0,peerCalls=0
 const upstream=http.createServer(async(req,res)=>{const request=await body(req)
  if(request.model==='peer'){peerCalls++;const prompt=JSON.stringify(request);assert(prompt.includes('必要问题'));assert(!prompt.includes('MANAGER_SECRET'));assert(!prompt.includes('PEER_SECRET'));assert(!prompt.includes('PEER_CHAT'));reply(res,'独立分析结果')}
  else if(++managerCalls===1)reply(res,'',{name:'consult_agent',args:{agentId:'peer',question:'必要问题：核验这个假设'}})
  else{assert(JSON.stringify(request).includes('独立分析结果'));reply(res,'已收到同事的独立分析')}
 })
 try{
  const url=await listen(upstream);store.saveModel({id:'main-model',name:'main',model:'main',baseUrl:url});store.saveModel({id:'peer-model',name:'peer',model:'peer',baseUrl:url})
  store.saveAgent({...store.agent('main'),modelId:'main-model'},'rules','MANAGER_SECRET');store.saveAgent({id:'peer',name:'同事',modelId:'peer-model'},'rules','PEER_SECRET');store.append(store.directSession('peer').id,'user','PEER_CHAT')
  const chat=store.directSession('main');await runConversation(store,chat.id,'请独立讨论这个假设','',AbortSignal.timeout(15000),()=>{})
  assert.equal(peerCalls,1);assert.equal(managerCalls,2);assert.equal(store.turns(chat.id)[0].usage?.modelCalls,3)
 }finally{await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})

test('model-requested removal uses the approval ledger and preserves the removed bots private history',async()=>{
 const home=temp(),app=createApp(home,{seed:false});let calls=0
 const upstream=http.createServer(async(req,res)=>{await body(req);if(++calls===1)reply(res,'',{name:'delete_agent',args:{agentId:'peer',reason:'用户同意精简'}});else reply(res,'已按批准移除并保留历史')})
 try{
  const url=await listen(upstream),base=await listen(app.server);app.store.saveModel({name:'mock',model:'mock',baseUrl:url});app.store.saveAgent({id:'peer',name:'同事'},'rules','retained memory');const oldChat=app.store.directSession('peer');app.store.append(oldChat.id,'user','retained history')
  const chat=app.store.directSession('main')
  await runConversation(app.store,chat.id,'请移除不需要的同事','',AbortSignal.timeout(15000),event=>{if(event.type==='approval'&&(event.action as Action).status==='pending'){assert(app.store.agents().some(agent=>agent.id==='peer'));queueMicrotask(()=>decide(app.store,chat.id,(event.action as Action).id,true))}})
  const state=await (await fetch(base+'/api/state')).json() as {agents:{id:string}[]};assert(!state.agents.some(agent=>agent.id==='peer'));assert.equal(app.store.messages(oldChat.id)[0].content,'retained history')
  const removed=await (await fetch(base+'/api/agents/archived')).json() as {id:string}[];assert(removed.some(agent=>agent.id==='peer'))
  const restored=await fetch(base+'/api/agents/peer/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(restored.status,200);assert(app.store.agents().some(agent=>agent.id==='peer'))
 }finally{await close(app.server);await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})

test('review loop requests rework, rejects self-acceptance, and releases dependent work only after an independent acceptance',async()=>{
 const home=temp(),store=new Store(home);let main=0,worker=0,down=0,groupId='',taskId='',selfRejected=false
 const upstream=http.createServer(async(req,res)=>{const request=await body(req)
  if(request.model==='main'){
   const step=++main
   if(step===1)reply(res,'',{name:'assign_task',args:{agentId:'worker',title:'produce',content:'produce result',acceptanceCriteria:'result must equal GOOD_RESULT'}})
   else if(step===2){taskId=tasks(store,groupId)[0].id;reply(res,'',{name:'assign_task',args:{agentId:'down',title:'consume',content:'use accepted result',dependsOnTaskIds:[taskId]}})}
   else if(step===4)reply(res,'',{name:'review_task',args:{taskId,verdict:'request_changes',reason:'BAD_RESULT does not match acceptance criteria'}})
   else if(step===6)reply(res,'',{name:'review_task',args:{taskId,verdict:'accept',reason:'verified actual result equals GOOD_RESULT'}})
   else reply(res,'等待真实结果或完成验收')
  }else if(request.model==='worker'){
   const step=++worker
   if(step===1)reply(res,'',{name:'complete_task',args:{taskId:tasks(store,groupId)[0].id,result:'BAD_RESULT'}})
   else if(step===2)reply(res,'',{name:'review_task',args:{taskId,verdict:'accept',reason:'self accepted'}})
   else if(step===3){selfRejected=JSON.stringify(request).includes('执行者不能自验收');reply(res,'已提交，等待验收')}
   else if(step===4)reply(res,'',{name:'complete_task',args:{taskId,result:'GOOD_RESULT'}})
   else reply(res,'已按要求返工')
  }else{down++;assert(taskSatisfied(tasks(store,groupId)[0]));assert(JSON.stringify(request).includes('GOOD_RESULT'));reply(res,'使用通过验收的结果')}
 })
 try{
  const url=await listen(upstream);for(const id of ['main','worker','down']){store.saveModel({id:'model-'+id,name:id,model:id,baseUrl:url});store.saveAgent({id,name:id,modelId:'model-'+id},'rules','')}
  const group=store.saveGroup('验收团队',['main','worker','down'],undefined,{discussionMode:'directed',coordinatorId:'main'});groupId=group.id
  await runConversation(store,group.id,'开始协作','',AbortSignal.timeout(20000),()=>{})
  assert.equal(down,1);assert(selfRejected);const task=tasks(store,groupId)[0];assert.equal(task.review?.status,'accepted');assert.equal(task.result,'GOOD_RESULT');assert.equal(task.resultHistory?.[0].result,'BAD_RESULT')
 }finally{await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})

test('reassignment preserves original instructions and dependency barriers, and cancels the old queued delivery',async()=>{
 const home=temp(),store=new Store(home);let calls=0,groupId='',targetId=''
 const upstream=http.createServer(async(req,res)=>{await body(req);calls++
  if(calls===1)reply(res,'',{name:'assign_task',args:{agentId:'worker',title:'handoff',content:'ORIGINAL_INSTRUCTIONS',dependsOnTaskIds:['blocker']}})
  else if(calls===2){targetId=tasks(store,groupId).find(task=>task.title==='handoff')!.id;reply(res,'',{name:'reassign_task',args:{taskId:targetId,agentId:'peer',reason:'调整负责人'}})}
  else reply(res,'交接完成，仍等待前置任务')
 })
 try{
  const url=await listen(upstream);store.saveModel({name:'main',model:'main',baseUrl:url});for(const id of ['worker','peer'])store.saveAgent({id,name:id},'rules','')
  const group=store.saveGroup('交接',['main','worker','peer'],undefined,{discussionMode:'directed'});groupId=group.id
  json(store.file('chats',group.id,'tasks.json'),[{id:'blocker',title:'blocking prerequisite',fromAgentId:'main',assigneeId:'worker',status:'pending',at:new Date().toISOString()}])
  await runConversation(store,group.id,'调整未开始的工作','',AbortSignal.timeout(15000),()=>{})
  const target=tasks(store,groupId).find(task=>task.id===targetId)!;assert.equal(target.assigneeId,'peer');assert.equal(target.assignmentHistory?.[0].assigneeId,'worker')
  const turn=store.turns(group.id)[0],old=turn.speakers.find(item=>item.taskId===targetId&&item.agentId==='worker'),next=turn.speakers.find(item=>item.taskId===targetId&&item.agentId==='peer')
  assert.equal(old?.status,'skipped');assert.equal(next?.status,'pending');assert(next?.body?.includes('ORIGINAL_INSTRUCTIONS'));assert.deepEqual(next?.dependsOnTaskIds,['blocker']);assert.equal(calls,3)
 }finally{await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})
