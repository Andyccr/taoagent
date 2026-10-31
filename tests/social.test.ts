import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,type Model} from '../store.ts'
import {lifeState,saveLifePolicy,saveLifeMember,recordLife,ownLife,saveLifeAgenda,lifeContext,changeLife,chargeLifeCall,lifeDay} from '../social-state.ts'
import {createLifeScheduler} from '../social.ts'
import {createApp} from '../app.ts'
import {runConversation} from '../runtime.ts'
import {portableZip} from '../portable.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','social-')),store=new Store(root);store.saveAgent({id:'peer',name:'伙伴'},'独立判断','PRIVATE_PEER_MEMORY');const group=store.saveGroup('共同生活',['main','peer'],undefined,{replyMode:'collective',discussionMode:'open'});return {root,store,key:group.id}}
function enable(store:Store,key:string,extra:Record<string,unknown>={}){saveLifePolicy(store,key,{expected:lifeState(store,key).revision,enabled:true,quietStart:0,quietEnd:0,...extra})}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
interface RequestBody {messages:{role:string;content:string}[];model:string}
async function request(req:http.IncomingMessage):Promise<RequestBody>{let text='';for await(const chunk of req)text+=chunk;return JSON.parse(text) as RequestBody}
function respond(res:http.ServerResponse,value:string){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:value},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}})+'\n\ndata: [DONE]\n\n')}
const thought=(action='reflect',contribution='')=>JSON.stringify({action,thought:'我仍想理解这个问题，先保留两种解释。',attention:'研究不同解释',stance:'尚未确定',contribution,sourceIds:[]})
test('members retain distinct group experiences, revisions and sources without importing private memories',()=>{
  const f=fixture()
  try{
    enable(f.store,f.key);saveLifeMember(f.store,f.key,'main',{interests:'MAIN_INTEREST',attention:'主张待核验'});saveLifeMember(f.store,f.key,'peer',{interests:'PEER_INTEREST'})
    const publicMessage=f.store.append(f.key,'user','公开证据'),entry=recordLife(f.store,f.key,'main',{text:'MAIN_SUBJECTIVE_VIEW',sourceIds:[publicMessage.id]})
    recordLife(f.store,f.key,'main',{text:'MAIN_REVISED_VIEW',supersedes:entry.id,sourceIds:[publicMessage.id]})
    const model={contextChars:32000,maxOutputTokens:4096} as Model
    const own=JSON.stringify(f.store.context(f.key,model,undefined,'main').messages),peer=JSON.stringify(f.store.context(f.key,model,undefined,'peer').messages)
    assert(own.includes('MAIN_REVISED_VIEW'));assert(!own.includes('PEER_INTEREST'));assert(!peer.includes('MAIN_SUBJECTIVE_VIEW'));assert(!peer.includes('PRIVATE_PEER_MEMORY'));assert(!lifeContext(f.store,f.key,'main',6000).includes('MAIN_SUBJECTIVE_VIEW'))
    assert.equal(ownLife(f.store,f.key,'main').entries.find(item=>item.id===entry.id)?.status,'superseded')
    assert.throws(()=>recordLife(f.store,f.key,'peer',{text:'覆写',supersedes:entry.id}),/只能修正自己/)
    assert.throws(()=>recordLife(f.store,f.key,'peer',{text:'未知来源',sourceIds:['foreign']}),/公开消息/)
    const reopened=new Store(f.root);assert(ownLife(reopened,f.key,'main').entries.some(item=>item.text==='MAIN_REVISED_VIEW'))
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('agendas keep ownership and history; policy rejects stale writes and quiet hours are respected',async()=>{
  const f=fixture(),active=new Map<string,AbortController>(),scheduler=createLifeScheduler(f.store,active)
  try{
    const agenda=saveLifeAgenda(f.store,f.key,'main',{title:'一个悬念',question:'等待实际结果'})
    assert.throws(()=>saveLifeAgenda(f.store,f.key,'peer',{agendaId:agenda.id,status:'done'}),/自己的/)
    saveLifeAgenda(f.store,f.key,'main',{agendaId:agenda.id,status:'waiting'});assert.equal(lifeState(f.store,f.key).agendaHistory.length,1)
    assert.throws(()=>saveLifePolicy(f.store,f.key,{expected:'old',enabled:true}),/已更新/)
    enable(f.store,f.key,{quietStart:0,quietEnd:23});const now=Date.parse('2026-10-28T12:00:00Z');assert.equal((await scheduler.tick(now,f.key)).started,false);assert.equal(lifeState(f.store,f.key).runs.length,0)
  }finally{scheduler.stop();fs.rmSync(f.root,{recursive:true,force:true})}
})
test('independent reflection uses an actual model, leaves no fake user message and persists its budget',async()=>{
  const f=fixture();let calls=0;const upstream=http.createServer(async(req,res)=>{const body=await request(req);assert(!JSON.stringify(body).includes('PRIVATE_PEER_MEMORY'));calls++;respond(res,thought())}),scheduler=createLifeScheduler(f.store,new Map())
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});enable(f.store,f.key)
    const result=await scheduler.tick(Date.now(),f.key,'main');assert(result.started);assert.equal(calls,1);assert.equal(f.store.messages(f.key).length,0)
    const state=lifeState(f.store,f.key);assert.equal(state.runs[0].status,'complete');assert.equal(state.runs[0].action,'reflect');assert.equal(state.entries[0].agentId,'main');assert(state.daily[lifeDay(state.policy,Date.now())].calls===1);assert(!f.store.isRunning(f.key));assert(!ownLife(f.store,f.key,'peer').entries.length)
  }finally{scheduler.stop();await close(upstream);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('a spontaneous idea enters real discussion, allows peers to pass and stores each contribution',async()=>{
  const f=fixture();let calls=0;const events:Record<string,unknown>[]=[]
  const upstream=http.createServer(async(req,res)=>{const body=await request(req),text=JSON.stringify(body.messages);calls++;respond(res,text.includes('独立思考阶段没有工具')?thought('share','我想聊聊共同记忆是否应该保留不同解释。'):text.includes('这次是群聊旁听的接话判断')?'PASS':'我暂时认为共同事实与个人解释应该分开，你怎么看？')})
  const scheduler=createLifeScheduler(f.store,new Map(),(_,event)=>events.push(event))
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});enable(f.store,f.key)
    assert((await scheduler.tick(Date.now(),f.key,'main')).started)
    const messages=f.store.messages(f.key);assert(!messages.some(item=>item.role==='user'));assert(messages.some(item=>item.agentId==='main'&&!item.kind&&item.status==='complete'));assert(events.some(item=>item.type==='delta'))
    const state=lifeState(f.store,f.key);assert.equal(state.runs[0].status,'complete');assert(state.entries.some(item=>item.kind==='contribution'));assert.equal(state.runs[0].reservedCalls,calls);assert.equal(f.store.turns(f.key)[0].lifeRunId,state.runs[0].id)
  }finally{scheduler.stop();await close(upstream);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('autonomous budgets are charged before requests, survive restart and cannot be bypassed by more episodes',async()=>{
  const f=fixture();let calls=0;const upstream=http.createServer(async(req,res)=>{await request(req);calls++;respond(res,thought())});let scheduler=createLifeScheduler(f.store,new Map())
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});enable(f.store,f.key,{dailyCalls:1})
    assert((await scheduler.tick(Date.now(),f.key)).started);assert(!(await scheduler.tick(Date.now(),f.key)).started);assert.equal(calls,1)
    scheduler.stop();const reopened=new Store(f.root);scheduler=createLifeScheduler(reopened,new Map());assert(!(await scheduler.tick(Date.now(),f.key)).started);assert.equal(calls,1)
    assert.throws(()=>chargeLifeCall(reopened,f.key,lifeState(reopened,f.key).runs[0].id,100),/暂停或结束/)
  }finally{scheduler.stop();await close(upstream);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('an interrupted operation is not replayed and restoring an archived space never resumes it silently',async()=>{
  const f=fixture(),scheduler=createLifeScheduler(f.store,new Map())
  try{
    enable(f.store,f.key);changeLife(f.store,f.key,state=>{state.runs.push({id:'orphan',agentId:'main',pid:process.pid,at:new Date().toISOString(),status:'running',trigger:'旧任务',reservedCalls:1,actualCalls:0,estimatedTokens:100,measuredTokens:0,policyRevision:state.revision})})
    await scheduler.tick(Date.now(),f.key);assert.equal(lifeState(f.store,f.key).runs[0].status,'interrupted');assert(!lifeState(f.store,f.key).policy.enabled)
    enable(f.store,f.key);f.store.archiveGroup(f.key,"测试恢复");f.store.restoreGroup(f.key);await scheduler.tick(Date.now(),f.key);assert(!lifeState(f.store,f.key).policy.enabled);assert.equal(lifeState(f.store,f.key).runs.length,1)
  }finally{scheduler.stop();fs.rmSync(f.root,{recursive:true,force:true})}
})
test('daily HTTP routes use same origin protection and portable restoration retains independent life state',async()=>{
  const f=fixture(),app=createApp(f.root,{seed:false})
  try{
    const base=await listen(app.server),list=await (await fetch(base+'/api/town')).json() as {spaces:{id:string}[]};assert(list.spaces.some(item=>item.id===f.key))
    const denied=await fetch(base+'/api/town/'+f.key+'/policy',{method:'PUT',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:JSON.stringify({expected:'new',enabled:true})});assert.equal(denied.status,403)
    const response=await fetch(base+'/api/town/'+f.key+'/member',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:'main',interests:'RESTORED_INTEREST'})});assert.equal(response.status,200)
    const archive=portableZip(f.root),dest=path.join(f.root,'restored');let offset=0
    while(archive.readUInt32LE(offset)===0x04034b50){const size=archive.readUInt32LE(offset+18),length=archive.readUInt16LE(offset+26),extra=archive.readUInt16LE(offset+28),name=archive.subarray(offset+30,offset+30+length).toString('utf8'),start=offset+30+length+extra;if(name.startsWith('taoagent/home/')){const target=path.join(dest,name.slice('taoagent/home/'.length));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,archive.subarray(start,start+size))}offset=start+size}
    assert.equal(ownLife(new Store(dest),f.key,'main').member.interests,'RESTORED_INTEREST');assert(archive.includes(Buffer.from('taoagent/social.ts')));assert(archive.includes(Buffer.from('taoagent/public/town.js')))
    const townAsset=await fetch(base+'/town.js');assert.equal(townAsset.status,200)
  }finally{app.lifeScheduler.stop();await close(app.server);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('independent observations expose source IDs and retain the actual context for causal inspection',async()=>{
  const f=fixture(),source=f.store.append(f.key,'user','一条可追溯的公开事实'),upstream=http.createServer(async(req,res)=>{
    const body=await request(req);assert(JSON.stringify(body.messages).includes(source.id));assert(JSON.stringify(body.messages).includes('一条可追溯的公开事实'))
    respond(res,JSON.stringify({action:'reflect',thought:'根据公开材料保留一个待验证判断。',attention:'核对来源',stance:'未验证',contribution:'',sourceIds:[source.id]}))
  }),scheduler=createLifeScheduler(f.store,new Map())
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});enable(f.store,f.key);assert((await scheduler.tick(Date.now(),f.key,'main')).started)
    const state=lifeState(f.store,f.key),entry=state.entries.find(item=>item.kind==='reflection');assert.deepEqual(entry?.sourceIds,[source.id]);assert(f.store.text('chats',f.key,'social','contexts',state.runs[0].id+'.json').includes(source.id))
  }finally{scheduler.stop();await close(upstream);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('unexecuted model tool markup remains an interrupted draft and never becomes shared knowledge',async()=>{
  const f=fixture(),raw='<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name="read_discussion">\n</｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>',upstream=http.createServer(async(req,res)=>{await request(req);respond(res,raw)})
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream),toolsEnabled:false});enable(f.store,f.key)
    await runConversation(f.store,f.key,'实际检查工具协议','',new AbortController().signal,()=>{},['main'])
    assert(f.store.messages(f.key).some(item=>item.content===raw&&item.status==='interrupted'));assert(!f.store.messages(f.key).some(item=>item.content===raw&&item.status==='complete'));assert(!lifeState(f.store,f.key).entries.some(item=>item.kind==='contribution'));assert(f.store.turns(f.key)[0].speakers[0].error?.includes('未执行的工具标记'))
  }finally{await close(upstream);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('daily spaces support one independent bot without weakening the ordinary group minimum',async()=>{
  const f=fixture(),app=createApp(f.root,{seed:false})
  try{
    const base=await listen(app.server),response=await fetch(base+'/api/town/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'独立研究室',memberIds:['peer']})})
    assert.equal(response.status,200);const {id}=await response.json() as {id:string},group=f.store.session(id);assert.equal(group.spaceKind,'solo');assert.deepEqual(f.store.groupMembers(id),['peer'])
    assert.equal(lifeState(f.store,id).policy.enabled,false);assert.throws(()=>f.store.saveGroup('普通群',['peer']),/2–12/)
    f.store.saveGroup('独立研究室更新',['peer'],id);assert.equal(f.store.session(id).spaceKind,'solo')
  }finally{app.lifeScheduler.stop();await close(app.server);fs.rmSync(f.root,{recursive:true,force:true})}
})
