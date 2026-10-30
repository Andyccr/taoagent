import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,type Turn} from '../store.ts'
import {createApp} from '../app.ts'
import {recordReasoning,reasoningRecords,reasoningView,reasoningContext} from '../reasoning.ts'
import {envelope,duplicateDelivery,recommendAgents,relationshipView} from '../communication.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','reasoning-')),store=new Store(root);store.saveAgent({id:'critic',name:'审阅员'},'核验','PRIVATE_CRITIC');store.saveAgent({id:'coder',name:'程序员'},'实现','PRIVATE_CODER');const key=store.saveGroup('团队',['main','critic','coder'],undefined,{replyMode:'collective',memberRoles:{critic:'程序审查 证据核验',coder:'编程实现'}}).id;return {root,store,key}}
function record(store:Store,key:string,recordId:string,args:Record<string,unknown>={},agent='main'){return recordReasoning(store,key,agent,'turn','event',recordId,{kind:'hypothesis',claim:'姓名唯一',rationale:'暂时假设，尚需核验',uncertainty:'可能同名',...args})}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert(a&&typeof a==='object');return 'http://127.0.0.1:'+a.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}

test('public reasoning preserves versions and propagates changed premises through descendants',()=>{
  const {root,store,key}=fixture()
  try{
    record(store,key,'r1');record(store,key,'r2',{kind:'decision',claim:'以姓名关联记录',dependsOn:['r1']});record(store,key,'r3',{claim:'迁移可直接按姓名匹配',dependsOn:['r2']})
    const before=store.text('chats',key,'reasoning.json')
    record(store,key,'c1',{kind:'challenge',claim:'存在同名反例',challenges:['r1']},'critic')
    let view=reasoningView(store,key);assert.equal(view.records.find(r=>r.id==='r1')?.status,'contested');assert.equal(view.records.find(r=>r.id==='r3')?.status,'needs_review')
    record(store,key,'r4',{kind:'revision',claim:'以稳定ID关联',revisesId:'r1',uncertainty:'迁移仍需测试'})
    view=reasoningView(new Store(root),key)
    assert.equal(view.records.find(r=>r.id==='r1')?.status,'superseded');assert.equal(view.records.find(r=>r.id==='r4')?.status,'proposed');assert.equal(view.records.find(r=>r.id==='r2')?.status,'needs_review')
    assert.equal(JSON.parse(before)[0].claim,reasoningRecords(store,key)[0].claim)
    assert.equal(reasoningView(store,key,{recordId:'r1'}).records[0].claim,'姓名唯一')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('reasoning rejects foreign evidence, future dependencies, rewriting peers and stale revisions',()=>{
  const {root,store,key}=fixture()
  try{
    record(store,key,'r1')
    const foreign=store.append(store.directSession('critic').id,'user','PRIVATE_CHAT')
    assert.throws(()=>record(store,key,'bad',{evidenceIds:[foreign.id]}),/本对话/)
    assert.throws(()=>record(store,key,'future',{dependsOn:['future']}),/已存在/)
    assert.throws(()=>record(store,key,'peer',{kind:'revision',revisesId:'r1'},'critic'),/自己的/)
    assert.throws(()=>record(store,key,'bad-topic',{kind:'revision',revisesId:'r1',topic:'其他议题'}),/原议题/)
    record(store,key,'r2',{kind:'revision',revisesId:'r1'})
    assert.throws(()=>record(store,key,'stale',{kind:'revision',revisesId:'r1'}),/新版本/)
    assert.throws(()=>record(store,key,'empty-challenge',{kind:'challenge'}),/明确目标/)
    assert.equal(reasoningRecords(store,key).length,2)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('reasoning idempotency does not restore a superseded claim and context stays bounded',()=>{
  const {root,store,key}=fixture()
  try{
    record(store,key,'r1');record(store,key,'r2',{kind:'revision',revisesId:'r1',claim:'姓名不唯一'})
    record(store,key,'r1')
    assert.equal(reasoningRecords(store,key).length,2);assert.equal(reasoningView(store,key,{recordId:'r1'}).records[0].status,'superseded')
    for(let i=0;i<10;i++)record(store,key,'new-'+i,{claim:'一个较长的候选论断'.repeat(30),topic:'另一个议题'})
    const snapshot=reasoningContext(store,key,'主议题',900,['r2'])
    assert(snapshot.length<=900);assert(snapshot.includes('姓名不唯一'));assert(JSON.parse(snapshot).omitted>0)
    assert(!snapshot.includes('PRIVATE_CRITIC'));assert.equal(reasoningView(store,key,{limit:2}).omitted,10)
    let page=reasoningView(store,key,{limit:3}),ids=page.records.map(item=>item.id)
    while(page.nextBefore){page=reasoningView(store,key,{limit:3,before:page.nextBefore});ids.push(...page.records.map(item=>item.id))}
    assert.equal(ids.length,12);assert.equal(new Set(ids).size,12)
    assert.throws(()=>reasoningView(store,key,{before:'foreign-cursor'}),/当前查询/)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('new reasoning references remain deliverable and cannot cross dialogue boundaries',()=>{
  const {root,store,key}=fixture()
  try{
    record(store,key,'r1');record(store,key,'r2',{claim:'另一种解释'})
    const turn:Turn={id:'turn',content:'任务',modelId:'',at:'',updatedAt:'',speakers:[{agentId:'main',eventId:'initial',status:'running'},{agentId:'critic',fromAgentId:'main',eventId:'old',status:'complete',body:'请复核',topic:'主议题',intent:'inform',reasoningIds:['r1']}]}
    const meta=envelope(store,key,turn,'main','critic',turn.speakers[0],{reason:'需要独立核验',reasoningIds:['r2']})
    assert(!duplicateDelivery(turn,'main','critic','请复核',meta));assert.equal(meta.reason,'需要独立核验')
    assert.throws(()=>envelope(store,store.directSession('main').id,turn,'main','critic',turn.speakers[0],{reasoningIds:['r1']}),/本对话/)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('routing recommends public role matches and reports measured contacts without trust scores',()=>{
  const {root,store,key}=fixture()
  try{
    assert.equal(recommendAgents(store,key,'main','程序审查 证据核验').candidates[0].id,'critic')
    assert.equal(recommendAgents(store,key,'main','编程实现').candidates[0].id,'coder')
    assert(!JSON.stringify(recommendAgents(store,key,'main','程序')).includes('PRIVATE_CRITIC'))
    store.saveTurn(key,{id:'turn',content:'任务',modelId:'',at:'',updatedAt:'',speakers:[{agentId:'critic',fromAgentId:'main',eventId:'question',intent:'question',status:'complete'},{agentId:'coder',fromAgentId:'critic',eventId:'failed',status:'failed'}]})
    const graph=relationshipView(store,key);assert.equal(graph.edges[0].delivered,1);assert.equal(graph.edges[0].openQuestions,1);assert.equal(graph.edges[1].failed,1)
    assert(graph.notice.includes('不等于回答正确'))
    assert.throws(()=>recommendAgents(store,key,'main',''),/协作需求/)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('live agents select a reviewer, exchange public reasoning and revise the original claim',async()=>{
  const {root,store,key}=fixture(),app=createApp(root,{seed:false});let author=0,critic=0
  const upstream=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk
    const body=JSON.parse(raw) as {model:string;messages:{role:string;content:string}[]};assert(!raw.includes('PRIVATE_CRITIC'))
    let call:{name:string;args:Record<string,unknown>}|undefined
    if(body.model==='author'){
      author++
      if(author===1)call={name:'record_reasoning',args:{kind:'hypothesis',claim:'姓名唯一',rationale:'初始方案尚需独立复核',topic:'标识'}}
      if(author===2)call={name:'recommend_agents',args:{query:'程序审查 证据核验'}}
      if(author===3){assert(body.messages.at(-1)?.content.includes('critic'));call={name:'send_message',args:{agentId:'critic',content:'请给出同名反例',intent:'question',topic:'标识',reason:'需要独立核验唯一性',reasoningIds:[reasoningRecords(store,key)[0].id]}}}
      if(author===5){assert(body.messages.at(-1)?.content.includes('contested'));call={name:'record_reasoning',args:{kind:'revision',claim:'改用稳定ID',rationale:'同名反例否定了原先前提',topic:'标识',revisesId:reasoningRecords(store,key)[0].id,uncertainty:'迁移尚需验证'}}}
    }else{
      critic++
      if(critic===1){assert(body.messages.at(-1)?.content.includes('姓名唯一'));call={name:'record_reasoning',args:{kind:'challenge',claim:'两个用户可能同名',rationale:'姓名没有唯一约束',topic:'标识',challenges:[reasoningRecords(store,key)[0].id]}}}
      if(critic===2)call={name:'reply_message',args:{content:'请根据同名反例修正',intent:'revision',reasoningIds:[reasoningRecords(store,key)[1].id]}}
    }
    const delta=call?{tool_calls:[{index:0,id:'call',function:{name:call.name,arguments:JSON.stringify(call.args)}}]}:{content:'公开结论与待验证事项已保留'}
    res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:call?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')
  })
  try{
    const url=await listen(upstream),base=await listen(app.server);store.saveModel({name:'author',model:'author',baseUrl:url});const model=store.saveModel({name:'critic',model:'critic',baseUrl:url});store.saveAgent({id:'critic',name:'审阅员',modelId:model.id},'独立核验','PRIVATE_CRITIC')
    const response=await fetch(base+`/api/chats/${key}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'核验并改进用户标识'})});const stream=await response.text();assert(stream.includes('"type":"done"'));assert.equal((stream.match(/"type":"reasoning_updated"/g)||[]).length,3)
    const restored=reasoningView(new Store(root),key);assert.equal(restored.records.length,3);assert.equal(restored.records[0].status,'superseded');assert.equal(restored.records[2].claim,'改用稳定ID')
    const view=await(await fetch(base+`/api/chats/${key}/reasoning`)).json() as ReturnType<typeof reasoningView>;assert.equal(view.total,3)
    const foreign=store.directSession('coder');assert.equal((await fetch(base+`/api/chats/${foreign.id}/reasoning?recordId=${view.records[0].id}`)).status,404)
    assert.equal((await fetch(base+`/api/chats/${key}/relations`)).status,200)
  }finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
