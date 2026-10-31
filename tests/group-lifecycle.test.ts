import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,atomic,json,type Session} from '../store.ts'
import {createApp} from '../app.ts'
import {seedTeam} from '../defaults.ts'
import {actions,decide,executeExternal,type Action} from '../execution.ts'
import {runConversation} from '../runtime.ts'
import {saveRoutine,workOverview,createRoutineScheduler} from '../work.ts'
import {discussionGuidance,openDiscussion} from '../audience.ts'

function temp(){fs.mkdirSync('.test-tmp',{recursive:true});return fs.mkdtempSync(path.resolve('.test-tmp','groups-'))}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return `http://127.0.0.1:${address.port}`}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
function fixture(home:string){const store=new Store(home);store.saveAgent({id:'peer',name:'同事'},'独立联想','');return store}
function group(store:Store,mode:Session['discussionMode']='open'){return store.saveGroup('',['main','peer'],undefined,{discussionMode:mode,purpose:'',replyMode:'collective'})}
async function api(base:string,route:string,method='GET',value?:unknown){return fetch(base+route,{method,...(value===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})})}
function reply(res:http.ServerResponse,text:string,tool?:{name:string;args:Record<string,unknown>}){const delta=tool?{tool_calls:[{index:0,id:'call',function:{name:tool.name,arguments:JSON.stringify(tool.args)}}]}:{content:text};res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:tool?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')}
interface Body{messages:{role:string;content:string}[];max_tokens?:number}
async function body(req:http.IncomingMessage){let raw='';for await(const chunk of req)raw+=chunk;return JSON.parse(raw) as Body}

test('group deletion preserves records, invalidates old approvals, prevents writes and cannot be reversed by editing or seeding',()=>{
 const home=temp(),store=fixture(home)
 try{
  const target=group(store),originalVersion=store.groupVersion(target.id);store.append(target.id,'user','original history')
  atomic(store.file('chats',target.id,'MEMORY.md'),'original memory');atomic(store.file('workspace',target.id,'report.txt'),'original file')
  json(store.file('chats',target.id,'actions.json'),[{id:'pending',status:'pending'},{id:'approved',status:'approved'},{id:'done',status:'complete',result:'receipt'}])
  assert.equal(store.groupVersion(target.id),originalVersion,'new chat messages must not invalidate a deletion decision')
  store.archiveGroup(target.id,'用户确认删除','user',originalVersion)
  assert(!store.sessions().some(session=>session.id===target.id));assert.equal(store.groupMembers(target.id).length,0)
  assert.equal(actions(store,target.id)[0].status,'denied');assert.equal(actions(store,target.id)[1].status,'denied');assert.equal(actions(store,target.id)[2].result,'receipt')
  assert.throws(()=>store.append(target.id,'user','new input'),/已删除/);assert.throws(()=>store.acquireRun(target.id),/已删除/);assert.throws(()=>store.saveGroup('revived',['main','peer'],target.id),/已删除/)
  store.append(target.id,'assistant','partial draft','interrupted');assert(store.session(target.id).archivedAt)
  store.restoreGroup(target.id);assert.notEqual(store.groupVersion(target.id),originalVersion);assert.throws(()=>store.archiveGroup(target.id,'stale confirmation','user',originalVersion),/已更改/)
  assert.equal(store.messages(target.id)[0].content,'original history');assert.equal(store.text('chats',target.id,'MEMORY.md'),'original memory');assert.equal(store.text('workspace',target.id,'report.txt'),'original file')
  seedTeam(store);store.archiveGroup('my-team','移除默认群');json(store.file('team-installed.json'),{version:1});seedTeam(new Store(home));assert(store.session('my-team').archivedAt)
 }finally{fs.rmSync(home,{recursive:true,force:true})}
})

test('manual DELETE hides group, preserves readable history, rejects new chat, pauses routines and restores explicitly',async()=>{
 const home=temp(),app=createApp(home,{seed:false});app.store.saveAgent({id:'peer',name:'同事'},'rules','')
 try{
  const base=await listen(app.server),target=group(app.store,'brainstorm');app.store.append(target.id,'user','hello')
  saveRoutine(app.store,{name:'例行',sessionId:target.id,instruction:'check',intervalMinutes:60,enabled:true})
  const response=await api(base,'/api/groups/'+target.id,'DELETE',{expected:app.store.groupVersion(target.id),reason:'用户确认删除'});assert.equal(response.status,200)
  const state=await(await api(base,'/api/state')).json() as {groups:{id:string}[]};assert(!state.groups.some(item=>item.id===target.id))
  assert.equal((await api(base,`/api/chats/${target.id}/chat`,'POST',{content:'revive'})).status,410)
  assert.equal((await api(base,`/api/groups/${target.id}`,'PUT',{name:'revive',memberIds:['main','peer']})).status,410)
  const history=await(await api(base,'/api/chats/'+target.id)).json() as {archivedAt:string;messages:{content:string}[]};assert(history.archivedAt);assert.equal(history.messages[0].content,'hello')
  assert.equal(workOverview(app.store).routines[0].enabled,false)
  const archived=await(await api(base,'/api/groups/archived')).json() as {id:string}[];assert(archived.some(item=>item.id===target.id))
  assert.equal((await fetch(base+'/api/groups/archived',{headers:{Origin:'https://untrusted.example'}})).status,403)
  assert.equal((await api(base,'/api/groups/'+target.id+'/restore','POST',{})).status,200);assert(!app.store.session(target.id).archivedAt);assert.equal(workOverview(app.store).routines[0].enabled,false)
  const direct=app.store.directSession('main');assert.equal((await api(base,'/api/groups/'+direct.id,'DELETE',{})).status,400)
 }finally{await close(app.server);fs.rmSync(home,{recursive:true,force:true})}
})

test('Bot group deletion requires a group target and explicit approval, rejects changed target and preserves idempotent receipt',async()=>{
 const home=temp(),store=fixture(home),target=group(store),origin=store.directSession('main'),controller=new AbortController()
 try{
  store.saveAgent({id:'outsider',name:'外部成员'},'rules','');const foreign=store.directSession('outsider')
  await assert.rejects(executeExternal(store,origin.id,'main','turn','foreign','delete_group',{groupId:foreign.id,reason:'delete'},controller.signal,()=>{}),/不能删除私聊/)
  const oldGroup=store.saveGroup('未加入的旧群',['peer','outsider'])
  await executeExternal(store,origin.id,'main','turn','old-group','delete_group',{groupId:oldGroup.id,reason:'用户要求清理旧群'},controller.signal,event=>{if(event.type==='approval'&&(event.action as Action).status==='pending'){assert(!store.session(oldGroup.id).archivedAt);queueMicrotask(()=>decide(store,origin.id,(event.action as Action).id,true))}})
  assert(store.session(oldGroup.id).archivedAt)
  const execute=(eventId:string,accept:boolean,mutate=false)=>executeExternal(store,origin.id,'main','turn',eventId,'delete_group',{groupId:target.id,reason:'清理群聊'},controller.signal,event=>{
   if(event.type==='approval'&&(event.action as Action).status==='pending'){assert(!store.session(target.id).archivedAt);assert.equal((event.action as Action).preview?.name,store.session(target.id).title);queueMicrotask(()=>{if(mutate)store.saveGroup('new name',['main','peer'],target.id);decide(store,origin.id,(event.action as Action).id,accept)})}
  })
  await assert.rejects(execute('deny',false),/拒绝/);assert(!store.session(target.id).archivedAt)
  await assert.rejects(execute('stale',true,true),/已更改/);assert(!store.session(target.id).archivedAt)
  await execute('approved',true);assert(store.session(target.id).archivedAt);store.restoreGroup(target.id)
  const replay=await execute('approved',true) as {historicalExecution:boolean};assert(replay.historicalExecution);assert(!store.session(target.id).archivedAt)
 }finally{controller.abort();fs.rmSync(home,{recursive:true,force:true})}
})

test('pending effects from a deleted and restored group cannot be approved or replayed',async()=>{
 const home=temp(),store=fixture(home),target=group(store),controller=new AbortController()
 try{
  const pending=executeExternal(store,target.id,'main','turn','write','write_file',{path:'unsafe.txt',content:'old request'},controller.signal,event=>{
   if(event.type==='approval'&&(event.action as Action).status==='pending')queueMicrotask(()=>{store.archiveGroup(target.id,'delete');store.restoreGroup(target.id);assert.throws(()=>decide(store,target.id,(event.action as Action).id,true),/已处理/);controller.abort()})
  })
  await assert.rejects(pending,/暂停/)
  await assert.rejects(executeExternal(store,target.id,'main','turn','write','write_file',{path:'unsafe.txt',content:'old request'},new AbortController().signal,()=>{}),/旧操作审批失效/)
  assert.equal(store.text('workspace',target.id,'unsafe.txt'),'')
 }finally{controller.abort();fs.rmSync(home,{recursive:true,force:true})}
})

test('Bot can delete its current group after approval while preserving the completed deletion receipt',async()=>{
 const home=temp(),store=fixture(home);let targetId='',removed=false
 const upstream=http.createServer(async(req,res)=>{await body(req);reply(res,'',{name:'delete_group',args:{groupId:targetId,reason:'用户批准结束这个群'}})})
 try{
  store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});const target=group(store);targetId=target.id
  await runConversation(store,target.id,'请删除当前群','',AbortSignal.timeout(15000),event=>{if(event.type==='approval'&&(event.action as Action).status==='pending')queueMicrotask(()=>decide(store,target.id,(event.action as Action).id,true));if(event.type==='group_removed')removed=true})
  assert(removed);assert(store.session(target.id).archivedAt);assert.equal(actions(store,target.id).find(action=>action.name==='delete_group')?.status,'complete')
 }finally{await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})

test('blank title and purpose support casual chat and brainstorm; brainstorm starts two independent members and bounds further turns',async()=>{
 const home=temp(),store=fixture(home);let speeches=0,listeners=0
 const upstream=http.createServer(async(req,res)=>{const request=await body(req),prompt=JSON.stringify(request)
  assert(prompt.includes('没有任何预设主题'));assert(!prompt.includes('共同解决用户提出的问题'))
  if(prompt.includes('这次是群聊旁听的接话判断')){assert.equal(request.max_tokens,4096,'reasoning listeners need the configured output room for open-ended ideas');listeners++;reply(res,'PASS')}else{speeches++;reply(res,'从一个小观察出发，联想到另一种可能。')}
 })
 try{
  const casual=group(store);assert.equal(casual.title,'随便聊聊');assert.equal(casual.purpose,'');assert(openDiscussion(store,casual.id));assert(discussionGuidance(store,casual.id).includes('自由交流'))
  store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream),maxOutputTokens:4096});const target=group(store,'brainstorm');assert.equal(target.title,'头脑风暴')
  await runConversation(store,target.id,'随便聊聊，没有主题','',AbortSignal.timeout(15000),event=>{if(event.type==='approval'&&(event.action as Action).status==='pending')setImmediate(()=>decide(store,origin.id,(event.action as Action).id,true))})
  assert.equal(speeches,2);assert(listeners<=2);assert.equal(store.turns(target.id)[0].speakers.filter(item=>item.status==='complete').length,2)
 }finally{await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})

test('Bot can create an untitled brainstorm group without a purpose or predefined topic',async()=>{
 const home=temp(),store=fixture(home);let calls=0
 const upstream=http.createServer(async(req,res)=>{await body(req);if(++calls===1)reply(res,'',{name:'create_group',args:{memberIds:['peer'],discussionMode:'brainstorm'}});else reply(res,'群已创建，可以随便聊聊')})
 try{
  store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});const origin=store.directSession('main')
  await runConversation(store,origin.id,'建个没有主题的头脑风暴群','',AbortSignal.timeout(15000),event=>{if(event.type==='approval'&&(event.action as Action).status==='pending')setImmediate(()=>decide(store,origin.id,(event.action as Action).id,true))})
  const target=store.sessions().find(item=>item.kind==='group');assert(target);assert.equal(target.title,'头脑风暴');assert.equal(target.purpose,'');assert.equal(target.discussionMode,'brainstorm');assert.equal(target.componentKind,'emergent')
 }finally{await close(upstream);fs.rmSync(home,{recursive:true,force:true})}
})

test('scheduler pauses deleted group routines before any model call even when deletion bypasses the HTTP handler',async()=>{
 const home=temp(),store=fixture(home),scheduler=createRoutineScheduler(store,new Map())
 try{
  const target=group(store),routine=saveRoutine(store,{name:'scheduled',sessionId:target.id,instruction:'check',intervalMinutes:5,enabled:true})
  store.archiveGroup(target.id,'delete');await scheduler.tick(Date.parse(routine.nextAt)+1)
  const snapshot=workOverview(store);assert.equal(snapshot.runs.length,0);assert.equal(snapshot.routines[0].enabled,false);assert(snapshot.routines[0].pauseReason)
  store.restoreGroup(target.id);await scheduler.tick(Date.parse(routine.nextAt)+600000);assert.equal(workOverview(store).runs.length,0)
 }finally{scheduler.stop();fs.rmSync(home,{recursive:true,force:true})}
})
