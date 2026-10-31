import {saveLifePolicy,lifeState} from '../social-state.ts'
import {createLifeScheduler} from '../social.ts'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,componentKind,type Session} from '../store.ts'
import {cityConfig,cityOverview,cityRoom,saveCity} from '../components.ts'
import {executeExternal,decide,type Action} from '../execution.ts'
import {runConversation} from '../runtime.ts'
import {openDiscussion} from '../audience.ts'
import {createApp} from '../app.ts'
import {evolvable} from '../evolution.ts'
function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','components-'));const store=new Store(root);store.saveAgent({id:'peer',name:'Peer'},'hello','');return {root,store}}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}

test('component types have distinct policies while legacy records and history remain intact',()=>{
 const {root,store}=fixture()
 try{
  const emergent=store.saveGroup('E',['main','peer'],undefined,{componentKind:'emergent'}),chat=store.saveGroup('C',['main','peer'],undefined,{componentKind:'chat',discussionMode:'brainstorm'}),task=store.saveGroup('T',['main','peer'],undefined,{componentKind:'task'})
  assert(openDiscussion(store,emergent.id));assert(!openDiscussion(store,chat.id));assert(!openDiscussion(store,task.id));assert.equal(task.replyMode,'coordinated');assert.equal(chat.discussionMode,'directed')
  store.append(chat.id,'user','keep full history');store.saveGroup('renamed',['main','peer'],chat.id,{componentKind:'emergent'});assert.equal(store.messages(chat.id)[0].content,'keep full history')
  const legacy=store.saveGroup('legacy',['main','peer'],undefined,{replyMode:'collective',discussionMode:'open'});assert.equal(componentKind(legacy),'emergent');assert.equal(store.session(legacy.id).componentKind,undefined)
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('City automatically includes new bots beyond group limit and excludes archived residents',()=>{
 const {root,store}=fixture()
 try{
  const room=cityRoom(store);store.append(room.id,'user','city history')
  for(let i=0;i<15;i++)store.saveAgent({id:'resident-'+i,name:'R'+i},'rules','')
  assert.equal(cityRoom(store).memberIds?.length,17);assert.equal(store.groupMembers(room.id).length,17);assert.equal(store.session(room.id).memberIds?.length,17)
  store.archiveAgent('resident-0','removed');assert.equal(cityOverview(store).memberIds.length,16);assert.equal(store.messages(room.id)[0].content,'city history')
  assert.throws(()=>store.saveGroup('fake',['main','peer'],undefined,{componentKind:'city'}),/唯一/)
  assert.throws(()=>store.saveGroup('convert',['main','peer'],room.id,{componentKind:'chat'}),/不能转换/)
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('AI group and city mutations require concrete approval and reject stale configuration',async()=>{
 const {root,store}=fixture(),key=store.directSession('main').id,signal=AbortSignal.timeout(10000)
 try{
  let pending:Action|undefined
  const execute=(name:string,args:Record<string,unknown>,approve=true)=>executeExternal(store,key,'main','turn',name+JSON.stringify(args),name,args,signal,event=>{const action=event.action as Action|undefined;if(event.type==='approval'&&action?.status==='pending'){pending=action;setImmediate(()=>decide(store,key,action.id,approve))}})
  const created=await execute('create_group',{name:'Approved',memberIds:['peer'],componentKind:'task'}) as Session
  assert(pending);assert.equal(created.componentKind,'task');assert.equal(store.sessions().filter(item=>item.kind==='group').length,1)
  await assert.rejects(execute('create_group',{name:'Denied',memberIds:['peer']},false),/拒绝/);assert.equal(store.sessions().filter(item=>item.kind==='group').length,1)
  const before=store.session(created.id)
  const changed=await execute('update_group',{groupId:before.id,expected:before.updatedAt,name:'Changed',memberIds:['main','peer'],componentKind:'chat'}) as Session
  assert.equal(changed.componentKind,'chat');assert((await execute('update_group',{groupId:before.id,expected:before.updatedAt,name:'Changed',memberIds:['main','peer'],componentKind:'chat'}) as {historicalExecution:boolean}).historicalExecution);await assert.rejects(execute('update_group',{groupId:before.id,expected:before.updatedAt,name:'Stale',memberIds:['main','peer']}),/更新/)
  const config=cityConfig(store);await execute('configure_city',{expected:config.revision,name:'New city',description:'Visible world',leadAgentId:'peer'});assert.equal(cityConfig(store).name,'New city')
  assert.throws(()=>saveCity(store,{expected:config.revision,name:'stale',description:'',leadAgentId:'main'}),/更新/)
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('plain chat runs one real streamed reply per selected bot without tools or autonomous listeners',async()=>{
 const {root,store}=fixture(),bodies:Record<string,unknown>[]=[]
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;bodies.push(JSON.parse(raw));res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:'hello'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')})
 try{
  store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)})
  const group=store.saveGroup('Chat',['main','peer'],undefined,{componentKind:'chat'}),events:Record<string,unknown>[]=[]
  await runConversation(store,group.id,'hello','',AbortSignal.timeout(10000),event=>events.push(event))
  assert.equal(bodies.length,2);assert(bodies.every(body=>!body.tools||Array.isArray(body.tools)&&body.tools.length===0));assert.equal(store.messages(group.id).filter(item=>item.role==='assistant'&&!item.kind).length,2);assert.equal(store.turns(group.id)[0].observations,undefined);assert(events.some(event=>event.type==='delta'))
  await runConversation(store,group.id,'@peer hi','',AbortSignal.timeout(10000),()=>{});assert.equal(bodies.length,3)
 }finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
test('component HTTP endpoints preserve origin checks, version conflicts and city membership',async()=>{
 const {root}=fixture(),app=createApp(root,{seed:false})
 try{
  const base=await listen(app.server),post=(route:string,body:unknown,origin?:string)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)})
  assert.equal((await post('/api/city/room',{},'https://foreign.invalid')).status,403)
  const room=await(await post('/api/city/room',{})).json();assert.equal(room.componentKind,'city')
  for(const kind of ['emergent','chat','task']){const response=await post('/api/groups',{name:kind,memberIds:['main','peer'],componentKind:kind});assert.equal(response.status,201);assert.equal((await response.json()).componentKind,kind)}
  assert.equal((await post('/api/groups',{name:'bad',memberIds:['main','peer'],componentKind:'invalid'})).status,400)
  const state=await(await fetch(base+'/api/state')).json();assert.equal(state.groups.length,4)
  for(const file of ['/','/components.css'])assert.equal((await fetch(base+file)).status,200)
 }finally{await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})
test('authorized source evolution covers the City renderer, layout and component interface',()=>{
 for(const file of ['components.ts','civilization.ts','public/civilization.js','public/components.css','public/city/city.js','public/city/layout.js','public/city/characters.js'])assert(evolvable.includes(file),file)
 assert(!evolvable.includes('execution.ts'));assert(!evolvable.includes('evolution.ts'))
})


test('converting a living space to plain chat prevents further autonomous model work',async()=>{
 const {root,store}=fixture(),scheduler=createLifeScheduler(store,new Map())
 try{
  const group=store.saveGroup('Living',['main','peer'],undefined,{componentKind:'emergent'})
  saveLifePolicy(store,group.id,{expected:lifeState(store,group.id).revision,enabled:true,quietStart:0,quietEnd:0})
  store.saveGroup('Plain',['main','peer'],group.id,{componentKind:'chat'})
  assert.throws(()=>saveLifePolicy(store,group.id,{expected:lifeState(store,group.id).revision,enabled:true}),/纯聊天/)
  assert.equal((await scheduler.tick(Date.now(),group.id)).started,false);assert.equal(lifeState(store,group.id).runs.length,0)
 }finally{scheduler.stop();fs.rmSync(root,{recursive:true,force:true})}
})
