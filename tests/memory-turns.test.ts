import {actions,decide} from '../execution.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { Store, atomic, json, relevantMemory, normalizedNote } from '../store.ts'
import { createApp } from '../app.ts'

function temp() { const base=path.resolve('.test-tmp');fs.mkdirSync(base,{recursive:true});return fs.mkdtempSync(path.join(base,'memory-turns-')) }
async function listen(server:http.Server) { server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return `http://127.0.0.1:${address.port}` }
async function close(server:http.Server) { server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve())) }
async function api(base:string,route:string,method='GET',value?:unknown) {return fetch(base+route,{method,...(value===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})})}
function reply(res:http.ServerResponse,text='完成') {res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:text},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')}
function tool(res:http.ServerResponse,name:string,args:unknown) {res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{tool_calls:[{index:0,id:'call-1',function:{name,arguments:JSON.stringify(args)}}]},finish_reason:'tool_calls'}]})+'\n\ndata: [DONE]\n\n')}

test('memory facts deduplicate, retain correction lineage, expose sources and stop recalling withdrawn records',()=>{
 const root=temp(),store=new Store(root)
 try {
  const model=store.saveModel({name:'mock',model:'mock',baseUrl:'http://127.0.0.1:1'}),dm=store.directSession('main'),source=store.append(dm.id,'user','以后周五发布')
  atomic(store.file('agents','main','MEMORY.md'),'# 人工核心记忆\n不喝咖啡\n')
  const first=store.rememberFact(dm.id,'main','agent','周五发布。',source.id)
  assert.equal(store.rememberFact(dm.id,'main','agent','周五发布。',source.id).id,first.id)
  assert.notEqual(normalizedNote('版本 1.2'),normalizedNote('版本 12'));assert.notEqual(normalizedNote('模型 a-b'),normalizedNote('模型 ab'))
  const nextSource=store.append(dm.id,'user','更正，改成周四发布')
  const second=store.rememberFact(dm.id,'main','agent','周四发布',nextSource.id,first.id)
  assert.equal(second.replacesId,first.id);assert.equal(store.memoryItems(dm.id,'main','agent').find(item=>item.id===first.id)?.status,'replaced')
  assert(!store.memory(dm.id,'main','agent').includes('周五'));assert(store.memory(dm.id,'main','agent').includes('不喝咖啡'))
  const found=store.searchMemory(dm.id,'main','发布安排');assert.equal(found[0].memoryId,second.id);assert.equal(found[0].sourceMessageId,nextSource.id)
  const pinned=store.editMemoryItem(dm.id,'main','agent',second.id,'pin',second.updatedAt);assert(pinned.pinned)
  assert.throws(()=>store.editMemoryItem(dm.id,'main','agent',second.id,'forget','stale'),/其他窗口/)
  store.editMemoryItem(dm.id,'main','agent',second.id,'forget',pinned.updatedAt)
  assert(!store.context(dm.id,model,'发布安排').messages[0].content.includes('周四发布'))
  assert.equal(store.memoryItems(dm.id,'main','agent').find(item=>item.id===second.id)?.status,'forgotten')
  assert(store.text('chats',dm.id,'messages.jsonl').includes('周五发布'))
  assert(fs.readdirSync(store.file('agents','main','memory-history')).length>=2)
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('relevant Chinese memory survives a long recent tail; manual edits remain authoritative',()=>{
 const root=temp(),store=new Store(root)
 try {
  const model=store.saveModel({name:'mock',model:'mock',baseUrl:'http://127.0.0.1:1',contextChars:8000}),dm=store.directSession('main'),source=store.append(dm.id,'user','项目部署约定')
  const fact=store.rememberFact(dm.id,'main','agent','部署端口是 4821',source.id)
  store.updateMemory(dm.id,'main','agent',store.memory(dm.id,'main','agent')+Array.from({length:200},(_,i)=>`无关笔记 ${i} 明天再讨论细节`).join('\n'),'manual-change')
  const context=store.context(dm.id,model,'部署端口是多少？');assert(context.messages[0].content.includes('4821'));assert(context.chars<=8000)
  assert(relevantMemory('旧约定：部署端口 4821\n'+'无关笔记\n'.repeat(500),'部署端口',300).includes('4821'))
  atomic(store.file('agents','main','MEMORY.md'),'# 已人工清理\n')
  assert.equal(store.memoryItems(dm.id,'main','agent').find(item=>item.id===fact.id)?.status,'forgotten')
  assert(!store.context(dm.id,model,'端口').messages[0].content.includes('4821'))
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('retry resumes only failed group members after restart and never appends another user message',async()=>{
 const root=temp();let app=createApp(root, {seed:false}),fail=true;const calls:string[]=[]
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw) as {model:string};calls.push(body.model);if(body.model==='reviewer'&&fail){res.writeHead(503);res.end();return};reply(res)})
 try {
  const url=await listen(upstream);let base=await listen(app.server)
  app.store.saveModel({name:'main',model:'main',baseUrl:url});const other=app.store.saveModel({name:'reviewer',model:'reviewer',baseUrl:url});app.store.saveAgent({id:'reviewer',name:'审阅员',modelId:other.id},'核验','')
  const group=app.store.saveGroup('工作室',['main','reviewer'])
  const response=await api(base,`/api/chats/${group.id}/chat`,'POST',{content:'@全体 安排发布',requestId:'request1'});await response.text()
  const turn=app.store.turns(group.id).at(-1)!;assert.deepEqual(turn.speakers.map(item=>item.status),['complete','failed']);assert.deepEqual(calls,['main','reviewer'])
  await close(app.server);app=createApp(root, {seed:false});base=await listen(app.server);fail=false
  const retried=await api(base,`/api/chats/${group.id}/retry`,'POST',{turnId:turn.id});assert.equal(retried.status,200);assert((await retried.text()).includes('done'))
  assert.deepEqual(calls,['main','reviewer','reviewer']);assert(app.store.turns(group.id).at(-1)!.speakers.every(item=>item.status==='complete'))
  assert.equal(app.store.messages(group.id).filter(item=>item.role==='user').length,1)
  const duplicate=await api(base,`/api/chats/${group.id}/chat`,'POST',{content:'@全体 安排发布',requestId:'request1'});assert((await duplicate.text()).includes('"duplicate":true'));assert.equal(calls.length,3)
  const conflict=await api(base,`/api/chats/${group.id}/chat`,'POST',{content:'其他内容',requestId:'request1'});assert.equal(conflict.status,409)
 }finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('retry reuses persisted tool receipts instead of creating a second group',async()=>{
 const root=temp(),app=createApp(root, {seed:false});let fail=true
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw) as {messages:{role:string}[]};if(!body.messages.some(item=>item.role==='tool'))tool(res,'create_group',{name:'工具创建',memberIds:['reviewer']});else if(fail){res.writeHead(500);res.end()}else reply(res)})
 try{
  const url=await listen(upstream),base=await listen(app.server);app.store.saveModel({name:'main',model:'main',baseUrl:url});app.store.saveAgent({id:'reviewer',name:'审阅员'},'review','')
  const dm=app.store.directSession('main');const approvalTimer=setInterval(()=>{for(const action of actions(app.store,dm.id))if(action.status==='pending')decide(app.store,dm.id,action.id,true)},10);approvalTimer.unref();try{await(await api(base,`/api/chats/${dm.id}/chat`,'POST',{content:'建群'})).text()
  const turn=app.store.turns(dm.id).at(-1)!;assert.equal(turn.speakers[0].status,'failed');assert.equal(app.store.sessions().filter(item=>item.kind==='group').length,1)
  fail=false;await(await api(base,`/api/chats/${dm.id}/retry`,'POST',{turnId:turn.id})).text()
  assert.equal(app.store.sessions().filter(item=>item.kind==='group').length,1);assert.equal(app.store.turns(dm.id).at(-1)!.speakers[0].status,'complete')}finally{clearInterval(approvalTimer)}
 }finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('memory optimistic edits reject stale writes; group model preference survives group edits',async()=>{
 const root=temp(),app=createApp(root, {seed:false})
 try{
  const base=await listen(app.server),model=app.store.saveModel({name:'m',model:'m',baseUrl:'http://127.0.0.1:1'});app.store.saveAgent({id:'reviewer',name:'审阅员'},'review','')
  const group=app.store.saveGroup('协作',['main','reviewer'])
  assert.equal((await api(base,`/api/chats/${group.id}/preferences`,'PUT',{modelId:model.id})).status,200)
  assert.equal(app.store.saveGroup('新名字',['main','reviewer'],group.id).modelId,model.id)
  let response=await api(base,`/api/chats/${group.id}/memory`,'PUT',{scope:'group',agentId:'main',content:'FIRST',expected:''});assert.equal(response.status,200)
  response=await api(base,`/api/chats/${group.id}/memory`,'PUT',{scope:'group',agentId:'main',content:'STALE',expected:''});assert.equal(response.status,409);assert.equal(app.store.memory(group.id,'main','group'),'FIRST')
  response=await api(base,`/api/chats/${group.id}/memory`,'GET');assert(!JSON.stringify(await response.json()).includes('STALE'))
 }finally{await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})

test('another app instance cannot start a concurrent turn or export a running conversation',async()=>{
 const root=temp(),first=createApp(root, {seed:false}),second=createApp(root, {seed:false})
 try{
  const base=await listen(second.server),dm=first.store.directSession('main'),release=first.store.acquireRun(dm.id)
  try{
   assert.throws(()=>second.store.acquireRun(dm.id),/另一个窗口/)
   assert.equal((await api(base,`/api/chats/${dm.id}/chat`,'POST',{content:'重复'})).status,409)
   assert.equal((await api(base,'/api/export')).status,409)
   assert.equal((await api(base,`/api/chats/${dm.id}/stop`,'POST',{})).status,409)
  }finally{release()}
  const releaseAgain=second.store.acquireRun(dm.id);releaseAgain();assert(!first.store.isRunning(dm.id))
  fs.mkdirSync(first.store.file('chats',dm.id,'.run-lock'));json(first.store.file('chats',dm.id,'.run-lock','owner.json'),{pid:2000000000,token:'stale'})
  assert(!first.store.isRunning(dm.id));const recover=first.store.acquireRun(dm.id);recover()
 }finally{await close(first.server);await close(second.server);fs.rmSync(root,{recursive:true,force:true})}
})

test('stale Agent and profile editors cannot overwrite new memory or partially change profile fields',async()=>{
 const root=temp(),app=createApp(root, {seed:false})
 try{
  const base=await listen(app.server),dm=app.store.directSession('main'),oldMemory=app.store.text('agents','main','MEMORY.md'),oldRules=app.store.text('agents','main','RULES.md'),source=app.store.append(dm.id,'user','记住新偏好')
  app.store.rememberFact(dm.id,'main','agent','最新偏好',source.id)
  const response=await api(base,'/api/agents','PUT',{id:'main',name:'修改名字',rules:oldRules,memory:oldMemory,expectedMemory:oldMemory,expectedRules:oldRules});assert.equal(response.status,409);assert.equal(app.store.agent('main').name,'助手');assert(app.store.memory(dm.id,'main','agent').includes('最新偏好'))
  const profile=await(await api(base,'/api/profile')).json() as {profile:string;rules:string;memory:string}
  atomic(app.store.file('MEMORY.md'),'另一窗口的共享记忆')
  const edit=await api(base,'/api/profile','PUT',{profile:'不应写入',rules:'不应写入',memory:'旧版本',expected:profile});assert.equal(edit.status,409);assert.equal(app.store.text('PROFILE.md'),profile.profile);assert.equal(app.store.text('RULES.md'),profile.rules)
 }finally{await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})

test('explicit @mentions override a previously selected reply target',async()=>{
 const root=temp(),app=createApp(root, {seed:false}),calls:string[]=[]
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;calls.push((JSON.parse(raw) as {model:string}).model);reply(res)})
 try{
  const url=await listen(upstream),base=await listen(app.server);app.store.saveModel({name:'main',model:'main',baseUrl:url});const other=app.store.saveModel({name:'reviewer',model:'reviewer',baseUrl:url});app.store.saveAgent({id:'reviewer',name:'审阅员',modelId:other.id},'review','');const group=app.store.saveGroup('群',['main','reviewer'])
  await(await api(base,`/api/chats/${group.id}/chat`,'POST',{content:'@审阅员 核验',memberIds:['main']})).text();assert.deepEqual(calls,['reviewer'])
 }finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
