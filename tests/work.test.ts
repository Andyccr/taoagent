import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { Store, json } from '../store.ts'
import { createApp } from '../app.ts'
import { saveSkill, readSkill, skills, saveRoutine, workOverview, createRoutineScheduler } from '../work.ts'
import { actions, decide } from '../execution.ts'

function temp() { const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.test-tmp'); fs.mkdirSync(base, {recursive:true}); return fs.mkdtempSync(path.join(base, 'work-')) }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
const skillInput = { name:'来源核验', description:'整理资料时核验一手来源', instructions:'读取原始材料，逐项核对日期与结论，列出未验证事项。', enabled:true }

test('shared skills persist, reject stale editors and traversal, preserve original revisions, and disable model access', () => {
  const home = temp()
  try {
    const store = new Store(home), first = saveSkill(store, skillInput)
    assert.equal(readSkill(new Store(home), first.id).instructions, skillInput.instructions)
    assert.throws(() => saveSkill(store, {...first, name:'stale'}), /已更改/)
    assert.throws(() => saveSkill(store, {...skillInput, id:'../escape'}), /无效 ID/)
    assert.throws(() => saveSkill(store, {...skillInput, instructions:'x'.repeat(16001)}), /16000/)
    const second = saveSkill(store, {...first, expected:first.revision, enabled:false})
    assert.notEqual(first.revision, second.revision); assert.equal(skills(store,true).length, 0)
    assert.throws(() => readSkill(store, first.id), /停用/)
    assert.equal(JSON.parse(store.text('work-history', first.revision+'.json')).instructions, first.instructions)
    assert.throws(() => saveSkill(store, {...first, expected:first.revision}), /已更改/)
  } finally { fs.rmSync(home,{recursive:true,force:true}) }
})

test('work API retains origin checks and revision conflicts without leaking account keys', async () => {
  const home=temp(), app=createApp(home,{seed:false})
  try {
    const base=await listen(app.server)
    app.store.saveModel({name:'fixture',model:'fixture',baseUrl:'http://127.0.0.1:1',apiKey:'work-secret-key'})
    const response=await fetch(base+'/api/skills',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(skillInput)})
    assert.equal(response.status,200)
    const first=await response.json() as {id:string;revision:string}
    const conflict=await fetch(base+'/api/skills',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...skillInput,id:first.id})})
    assert.equal(conflict.status,409)
    assert.equal((await fetch(base+'/api/work',{headers:{Origin:'https://untrusted.example'}})).status,403)
    const snapshot=await (await fetch(base+'/api/work')).text(); assert(snapshot.includes(first.id)); assert(!snapshot.includes('work-secret-key'))
  } finally { await close(app.server); fs.rmSync(home,{recursive:true,force:true}) }
})

test('live HTTP tool loop discovers and reads enabled skills without injecting unused full instructions', async () => {
  const home=temp(), app=createApp(home,{seed:false}), bodies:Record<string,unknown>[]=[]
  const first=saveSkill(app.store,skillInput)
  const upstream=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk
    bodies.push(JSON.parse(raw) as Record<string,unknown>)
    res.writeHead(200,{'Content-Type':'text/event-stream'})
    const name=bodies.length===1?'list_skills':'read_skill', args=bodies.length===1?{}:{skillId:first.id}
    const delta=bodies.length<3?{tool_calls:[{index:0,id:'work-call-'+bodies.length,function:{name,arguments:JSON.stringify(args)}}]}:{content:'已根据来源核验技能检查材料。'}
    res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:bodies.length<3?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')
  })
  try {
    const upstreamUrl=await listen(upstream), base=await listen(app.server)
    app.store.saveModel({name:'fixture',model:'fixture',baseUrl:upstreamUrl})
    const chat=app.store.directSession('main')
    const response=await fetch(base+`/api/chats/${chat.id}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'请使用核验技能'})})
    const stream=await response.text(); assert(stream.includes('已根据来源核验技能')); assert.equal(bodies.length,3)
    assert(!JSON.stringify(bodies[0]).includes(first.instructions)); assert(JSON.stringify(bodies[1]).includes(first.id)); assert(JSON.stringify(bodies[2]).includes(first.instructions))
    assert(app.store.messages(chat.id).some(message=>message.role==='assistant'&&message.status==='complete'))
  } finally { await close(app.server); await close(upstream); fs.rmSync(home,{recursive:true,force:true}) }
})

test('routine claims coalesce missed intervals and serialize servers, wait for busy threads, persist results across restart', async () => {
  const home=temp(), store=new Store(home), active=new Map<string,AbortController>(), scheduler=createRoutineScheduler(store,active), other=createRoutineScheduler(new Store(home),new Map())
  let calls=0
  const upstream=http.createServer(async(req,res)=>{
    for await(const _chunk of req){ /* drain request */ }
    calls++;res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:'已完成检查'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')
  })
  try {
    const url=await listen(upstream);store.saveModel({name:'fixture',model:'fixture',baseUrl:url});const chat=store.directSession('main')
    const input={name:'项目检查',instruction:'检查并报告',sessionId:chat.id,enabled:true,intervalMinutes:5}
    assert.throws(()=>saveRoutine(store,{...input,intervalMinutes:1}),/5–43200/)
    assert.throws(()=>saveRoutine(store,{...input,enabled:undefined}),/明确/)
    const routine=saveRoutine(store,input), now=Date.parse(routine.nextAt)+3600000
    await scheduler.tick(Date.parse(routine.nextAt)-1);assert.equal(calls,0)
    const release=store.acquireRun(chat.id)
    await scheduler.tick(now);assert.equal(calls,0);release()
    await Promise.all([scheduler.tick(now),other.tick(now)]);assert.equal(calls,1)
    const snapshot=workOverview(new Store(home));assert.equal(snapshot.runs.length,1);assert.equal(snapshot.runs[0].status,'complete')
    assert(Date.parse(snapshot.routines[0].nextAt)>now);assert.equal(store.messages(chat.id).filter(message=>message.role==='user').length,1)
    await other.tick(now);assert.equal(calls,1)
    const changed=saveRoutine(store,{...snapshot.routines[0],expected:routine.revision,enabled:false})
    assert.throws(()=>saveRoutine(store,{...routine,expected:routine.revision}),/已更改/)
    await scheduler.tick(Date.parse(changed.nextAt)+1);assert.equal(calls,1)
  } finally { scheduler.stop();other.stop();await close(upstream);fs.rmSync(home,{recursive:true,force:true}) }
})

test('failed scheduled work pauses; a dead process claim is marked interrupted rather than replayed', async () => {
  const home=temp(),store=new Store(home),scheduler=createRoutineScheduler(store,new Map())
  try {
    const chat=store.directSession('main'),routine=saveRoutine(store,{name:'无模型',instruction:'检查',sessionId:chat.id,enabled:true,intervalMinutes:5})
    await scheduler.tick(Date.parse(routine.nextAt)+1)
    let snapshot=workOverview(store);assert.equal(snapshot.runs[0].status,'failed');assert.equal(snapshot.routines[0].enabled,false)
    const enabled=saveRoutine(store,{...snapshot.routines[0],expected:snapshot.routines[0].revision,enabled:true})
    const data=JSON.parse(store.text('work.json')) as {runs:unknown[]}
    data.runs.push({id:'dead-run',routineId:enabled.id,sessionId:chat.id,status:'running',pid:2147483647,at:new Date().toISOString()});json(store.file('work.json'),data)
    await scheduler.tick(Date.parse(enabled.nextAt)+1)
    snapshot=workOverview(store);assert.equal(snapshot.runs.find(run=>run.id==='dead-run')?.status,'interrupted');assert.equal(snapshot.routines[0].enabled,false);assert.equal(snapshot.runs.length,2)
  } finally { scheduler.stop();fs.rmSync(home,{recursive:true,force:true}) }
})

test('scheduled file writes still wait for user approval and preserve a real execution receipt', async () => {
  const home=temp(), store=new Store(home), scheduler=createRoutineScheduler(store,new Map())
  let calls=0
  const upstream=http.createServer(async(req,res)=>{
    for await(const _chunk of req){ /* drain request */ }
    calls++
    const delta=calls===1?{tool_calls:[{index:0,id:'write-report',function:{name:'write_file',arguments:JSON.stringify({path:'report.txt',content:'verified report'})}}]}:{content:'报告已保存'}
    res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:calls===1?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')
  })
  try {
    const url=await listen(upstream);store.saveModel({name:'fixture',model:'fixture',baseUrl:url});const chat=store.directSession('main')
    const routine=saveRoutine(store,{name:'报告',instruction:'保存报告',sessionId:chat.id,enabled:true,intervalMinutes:5})
    const pending=scheduler.tick(Date.parse(routine.nextAt)+1)
    try {
      const deadline=Date.now()+15000
      while (!actions(store,chat.id).some(action=>action.status==='pending') && Date.now()<deadline) await new Promise<void>(resolve=>setTimeout(resolve,20))
      const approval=actions(store,chat.id).find(action=>action.status==='pending');assert(approval)
      assert.equal(calls,1);assert(workOverview(store).inbox.some(item=>item.kind==='approval'))
      assert.equal(store.text('workspace',chat.id,'report.txt'),'')
      decide(store,chat.id,approval.id,true)
      await pending
      assert.equal(actions(store,chat.id).find(action=>action.id===approval.id)?.status,'complete')
      assert.equal(store.text('workspace',chat.id,'report.txt'),'verified report')
      assert.equal(workOverview(store).runs[0].status,'complete');assert.equal(calls,2)
    } finally { scheduler.stop();await pending }
  } finally { scheduler.stop();await close(upstream);fs.rmSync(home,{recursive:true,force:true}) }
})
