import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,componentKind} from '../store.ts'
import {lifeState,saveLifePolicy} from '../social-state.ts'
import {createLifeScheduler} from '../social.ts'
import {createApp} from '../app.ts'
function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','workgroups-')),store=new Store(root);store.saveAgent({id:'peer',name:'伙伴'},'独立判断','');return {root,store}}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
test('legacy directed groups are tasks for town listing and daily policy',async()=>{
 const {root,store}=fixture(),app=createApp(root,{seed:false})
 try{
  const legacy=store.saveGroup('旧定向组',['main','peer'],undefined,{replyMode:'collective',discussionMode:'directed'})
  assert.equal(componentKind(legacy),'task')
  const base=await listen(app.server),list=await(await fetch(base+'/api/town')).json() as {spaces:{id:string}[]}
  assert(!list.spaces.some(item=>item.id===legacy.id))
  assert.throws(()=>saveLifePolicy(store,legacy.id,{enabled:true}),/只有涌现群聊和 City 支持自主日常/)
 }finally{app.lifeScheduler.stop();await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})
test('one scheduler tick stops daily life after an emergent group becomes a task group',async()=>{
 const {root,store}=fixture();let calls=0
 const upstream=http.createServer(async(req,res)=>{for await(const chunk of req)void chunk;calls++;res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: [DONE]\n\n')})
 const scheduler=createLifeScheduler(store,new Map())
 try{
  store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)})
  const group=store.saveGroup('共同生活',['main','peer'],undefined,{componentKind:'emergent'})
  saveLifePolicy(store,group.id,{expected:lifeState(store,group.id).revision,enabled:true,quietStart:0,quietEnd:0})
  store.saveGroup('转为任务',['main','peer'],group.id,{componentKind:'task'})
  await scheduler.tick(Date.now(),group.id)
  const state=lifeState(store,group.id)
  assert.equal(state.policy.enabled,false);assert.equal(state.pauseReason,'已转为任务组或纯聊天，自主日常已停止');assert.equal(state.runs.length,0);assert.equal(calls,0)
 }finally{scheduler.stop();await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
test('town creation always produces an emergent group',async()=>{
 const {root,store}=fixture(),app=createApp(root,{seed:false})
 try{
  const base=await listen(app.server),response=await fetch(base+'/api/town/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'日常广场',memberIds:['main','peer']})})
  assert.equal(response.status,200)
  const {id}=await response.json() as {id:string}
  assert.equal(store.session(id).componentKind,'emergent');assert.equal(componentKind(store.session(id)),'emergent')
 }finally{app.lifeScheduler.stop();await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})
