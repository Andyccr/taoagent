import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import {once} from 'node:events'
import {Store, json} from '../store.ts'
import {enqueueMessage, changeQueue, queueSnapshot, createQueueScheduler, pauseQueue} from '../queue.ts'
import {createApp} from '../app.ts'

function temp(){fs.mkdirSync('.test-tmp',{recursive:true});return fs.mkdtempSync(path.resolve('.test-tmp','queue-'))}
function add(store:Store,key:string,content:string){return enqueueMessage(store,key,{content,requestId:crypto.randomUUID()})}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
function reply(res:http.ServerResponse,text:string){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:text},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')}

test('queue is durable and idempotent; edits preserve originals and stale revisions cannot cancel another update',()=>{
  const root=temp()
  try{
    const store=new Store(root),chat=store.directSession('main'),requestId=crypto.randomUUID(),input={requestId,content:'原始完整消息'}
    const first=enqueueMessage(store,chat.id,input);assert.equal(enqueueMessage(store,chat.id,input).id,first.id)
    assert.throws(()=>enqueueMessage(store,chat.id,{...input,content:'different'}),/另一条/)
    let queue=queueSnapshot(store,chat.id);queue=changeQueue(store,chat.id,{operation:'pause',expected:queue.revision})
    assert.throws(()=>changeQueue(store,chat.id,{operation:'edit',itemId:first.id,content:'bad',expected:'stale'}),/已变化/)
    queue=changeQueue(store,chat.id,{operation:'edit',itemId:first.id,content:'修改后的完整消息',expected:queue.revision})
    assert.equal(JSON.parse(store.text('chats',chat.id,'queue-history',first.revision+'.json')).content,'原始完整消息')
    assert.equal(queueSnapshot(new Store(root),chat.id).items[0].content,'修改后的完整消息')
    queue=changeQueue(store,chat.id,{operation:'cancel',itemId:first.id,expected:queue.revision});assert.equal(queue.items[0].status,'cancelled');assert.equal(queue.items[0].content,'修改后的完整消息')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('FIFO runs through real HTTP, waits behind a running conversation and cannot be claimed twice',async()=>{
  const root=temp(),store=new Store(root),active=new Map<string,AbortController>(),first=createQueueScheduler(store,active),second=createQueueScheduler(new Store(root),new Map()),received:string[]=[]
  const upstream=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body) as {messages:{role:string;content:string}[]};received.push(input.messages.filter(message=>message.role==='user').at(-1)!.content);reply(res,'实际完成')})
  try{
    const base=await listen(upstream);store.saveModel({name:'fixture',model:'fixture',baseUrl:base});const chat=store.directSession('main')
    add(store,chat.id,'第一条');add(store,chat.id,'第二条');const release=store.acquireRun(chat.id)
    await first.tick();assert.equal(queueSnapshot(store,chat.id).items[0].status,'queued');release()
    await first.tick();await second.tick();await first.drain();assert.equal(received.length,1)
    await first.tick();await first.drain();assert.deepEqual(received.map(content=>content.split('\n')[0]),['第一条','第二条']);assert(queueSnapshot(store,chat.id).items.every(item=>item.status==='complete'))
    assert.equal(store.turns(chat.id).length,2);assert.equal(store.messages(chat.id).filter(message=>message.role==='user').length,2)
  }finally{first.stop();second.stop();await first.drain();await second.drain();await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
test('model failure pauses the tail, and orphaned claimed work is interrupted without replay',async()=>{
  const root=temp(),store=new Store(root),scheduler=createQueueScheduler(store,new Map())
  try{
    const chat=store.directSession('main');add(store,chat.id,'没有模型');add(store,chat.id,'不会继续执行')
    await scheduler.tick();await scheduler.drain();let queue=queueSnapshot(store,chat.id);assert(queue.paused);assert.equal(queue.items.find(item=>item.content==='没有模型')?.status,'failed');assert.equal(queue.items.find(item=>item.content==='不会继续执行')?.status,'queued')
    const data=JSON.parse(store.text('chats',chat.id,'message-queue.json'));data.items[1].status='running';data.items[1].pid=process.pid;data.paused=false;json(store.file('chats',chat.id,'message-queue.json'),data)
    await scheduler.tick();queue=queueSnapshot(store,chat.id);assert(queue.paused);assert.equal(queue.items.find(item=>item.content==='不会继续执行')?.status,'interrupted');assert.equal(store.messages(chat.id).length,0)
  }finally{scheduler.stop();await scheduler.drain();fs.rmSync(root,{recursive:true,force:true})}
})
test('pausing preserves in-flight work while safely editing the waiting tail',async()=>{
  const root=temp(),store=new Store(root),scheduler=createQueueScheduler(store,new Map())
  let release:()=>void=()=>{},started:()=>void=()=>{};const held=new Promise<void>(resolve=>{release=resolve}),ready=new Promise<void>(resolve=>{started=resolve});let calls=0
  const upstream=http.createServer(async(req,res)=>{for await(const _chunk of req){};calls++;if(calls===1){started();await held}reply(res,'完成')})
  try{
    store.saveModel({name:'fixture',model:'fixture',baseUrl:await listen(upstream)});const chat=store.directSession('main');add(store,chat.id,'当前工作');const tail=add(store,chat.id,'等待编辑')
    await scheduler.tick();await ready;let queue=queueSnapshot(store,chat.id);assert.equal(queue.items[0].status,'running')
    queue=changeQueue(store,chat.id,{operation:'pause',expected:queue.revision});queue=changeQueue(store,chat.id,{operation:'edit',expected:queue.revision,itemId:tail.id,content:'已经修改'})
    release();await scheduler.drain();await scheduler.tick();assert.equal(calls,1);queue=queueSnapshot(store,chat.id);assert.equal(queue.items.find(item=>item.content==='当前工作')?.status,'complete')
    changeQueue(store,chat.id,{operation:'resume',expected:queue.revision});await scheduler.tick();await scheduler.drain();assert.equal(calls,2);assert.equal(store.messages(chat.id).filter(item=>item.role==='user')[1].content,'已经修改')
  }finally{release();scheduler.stop();await scheduler.drain();await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
test('restoring a deleted group does not reactivate its previously queued work',async()=>{
  const root=temp(),store=new Store(root),scheduler=createQueueScheduler(store,new Map())
  try{
    store.saveAgent({id:'peer',name:'同事'},'','');const group=store.saveGroup('测试',['main','peer']);add(store,group.id,'原生命周期的工作')
    store.archiveGroup(group.id,'test');store.restoreGroup(group.id);await scheduler.tick();const queue=queueSnapshot(store,group.id);assert(queue.paused);assert(queue.reason?.includes('生命周期'));assert.equal(queue.items[0].status,'queued')
  }finally{scheduler.stop();await scheduler.drain();fs.rmSync(root,{recursive:true,force:true})}
})
test('queue HTTP rejects cross-origin writes, returns durable receipts and stop pauses pending work',async()=>{
  const root=temp(),app=createApp(root,{seed:false})
  try{
    const base=await listen(app.server),chat=app.store.directSession('main'),url=base+'/api/chats/'+chat.id+'/queue',headers={'Content-Type':'application/json'}
    pauseQueue(app.store,chat.id,'test');const input={content:'等待',requestId:crypto.randomUUID()}
    assert.equal((await fetch(url,{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:JSON.stringify(input)})).status,403)
    assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(input)})).status,200)
    await fetch(base+'/api/chats/'+chat.id+'/stop',{method:'POST',headers,body:'{}'})
    const value=await (await fetch(url)).json() as {paused:boolean;items:{content:string}[]};assert(value.paused);assert.equal(value.items[0].content,'等待')
  }finally{await close(app.server);await app.queueScheduler.drain();fs.rmSync(root,{recursive:true,force:true})}
})
test('a queued model streams live to a separate subscriber and disconnecting it does not stop execution',async()=>{
  const root=temp(),app=createApp(root,{seed:false});let finish:()=>void=()=>{},deltaSeen:()=>void=()=>{}
  const completed=new Promise<void>(resolve=>{finish=resolve}),seen=new Promise<void>(resolve=>{deltaSeen=resolve})
  const upstream=http.createServer(async(req,res)=>{for await(const _chunk of req){};res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('data: '+JSON.stringify({choices:[{delta:{content:'可见的实时片段'}}]})+'\n\n');await completed;res.end('data: '+JSON.stringify({choices:[{delta:{content:'，最终完成'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')})
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined
  try{
    app.store.saveModel({name:'fixture',model:'fixture',baseUrl:await listen(upstream)});const base=await listen(app.server),chat=app.store.directSession('main')
    const response=await fetch(base+'/api/chats/'+chat.id+'/events');assert.equal(response.headers.get('content-type'),'text/event-stream; charset=utf-8');reader=response.body!.getReader()
    assert.equal((await fetch(base+'/api/chats/'+chat.id+'/events',{headers:{Origin:'https://untrusted.example'}})).status,403)
    let received='';const reading=(async()=>{const decoder=new TextDecoder();while(true){const part=await reader!.read();if(part.done)break;received+=decoder.decode(part.value,{stream:true});if(received.includes('可见的实时片段')){deltaSeen();break}}})()
    const item=add(app.store,chat.id,'观察排队执行');await app.queueScheduler.tick();await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(new Error('live delta not received')),7000))]);assert(!received.includes('"type":"done"'))
    await reading;await reader.cancel();reader=undefined;finish();await app.queueScheduler.drain()
    assert.equal(queueSnapshot(app.store,chat.id).items.find(record=>record.id===item.id)?.status,'complete');assert(app.store.messages(chat.id).some(message=>message.content==='可见的实时片段，最终完成'))
  }finally{finish();await reader?.cancel().catch(()=>{});await close(app.server);await app.queueScheduler.drain();await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
