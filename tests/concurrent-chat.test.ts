import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import vm from 'node:vm'
import {Store} from '../store.ts'
import {runConversation,steerConversation} from '../runtime.ts'
import {executeExternal,actions,decide} from '../execution.ts'
import {offerAudience} from '../audience.ts'

interface Request {model:string;messages:{role:string;content:unknown}[]}
async function body(req:http.IncomingMessage){let text='';for await(const part of req)text+=part;return JSON.parse(text) as Request}
function reply(res:http.ServerResponse,text:string,tool?:{name:string;arguments:Record<string,unknown>}){
  res.writeHead(200,{'Content-Type':'text/event-stream'})
  res.end('data: '+JSON.stringify({choices:[{delta:tool?{tool_calls:[{index:0,id:'call',function:{name:tool.name,arguments:JSON.stringify(tool.arguments)}}]}:{content:text},finish_reason:tool?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')
}
async function setup(handler:(request:Request,res:http.ServerResponse)=>void|Promise<void>,members=['main','peer','third']){
  fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','concurrent-')),store=new Store(root)
  const server=http.createServer(async(req,res)=>handler(await body(req),res));server.listen(0,'127.0.0.1');await once(server,'listening')
  const address=server.address();assert(address&&typeof address==='object')
  for(const member of members){store.saveModel({id:member,name:member,model:member,baseUrl:'http://127.0.0.1:'+address.port});store.saveAgent({id:member,name:member,modelId:member},'独立核验','')}
  const group=store.saveGroup('并发讨论',members,undefined,{discussionMode:'directed',replyMode:'collective'})
  return {store,key:group.id,root,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}}
}

test('two speakers really overlap, third waits, stream IDs and context provenance remain separate',async()=>{
  const held:http.ServerResponse[]=[],events:Record<string,unknown>[]=[],requests:Request[]=[];let active=0,peak=0
  const f=await setup((request,res)=>{
    requests.push(request);active++;peak=Math.max(peak,active)
    if(requests.length<=2){held.push(res);if(held.length===2)for(const [index,item] of held.entries()){active--;reply(item,'ANSWER_'+requests[index].model)}}
    else{active--;reply(res,'ANSWER_'+request.model)}
  })
  try{
    await runConversation(f.store,f.key,'@all 独立提出意见','',AbortSignal.timeout(15000),event=>events.push(event))
    assert.equal(peak,2);assert.equal(requests.length,3)
    const start=events.filter(item=>item.type==='speaker'),finish=events.filter(item=>item.type==='speaker_done')
    assert(events.indexOf(start[1])<events.indexOf(finish[0]))
    for(const item of events.filter(item=>item.type==='delta')){assert(item.eventId);assert.equal(item.text,'ANSWER_'+item.agentId)}
    const messages=f.store.messages(f.key).filter(item=>!item.kind&&item.role==='assistant')
    assert.equal(messages.length,3);assert(messages.some(item=>item.concurrentMessageIds?.length))
    assert(messages.every(item=>item.contextMessageIds?.length))
    assert.equal(f.store.turns(f.key)[0].usage?.modelCalls,3)
  }finally{await f.close()}
})

test('a tool message wakes its recipient before the sender finishes its own model loop',async()=>{
  let senderCalls=0,waiting:http.ServerResponse|undefined,peerReceived=false
  const f=await setup((request,res)=>{
    if(request.model==='main'&&++senderCalls===1){reply(res,'',{name:'send_message',arguments:{agentId:'peer',content:'请独立核验',intent:'question'}});return}
    if(request.model==='peer'){peerReceived=true;reply(res,'核验完成');if(waiting)reply(waiting,'发送者完成');return}
    if(peerReceived)reply(res,'发送者完成');else waiting=res
  },['main','peer'])
  try{
    await runConversation(f.store,f.key,'开始协作','',AbortSignal.timeout(15000),()=>{})
    assert(peerReceived);assert(f.store.turns(f.key)[0].speakers.every(item=>item.status==='complete'))
    assert.equal(f.store.turns(f.key)[0].usage?.modelCalls,3)
  }finally{await f.close()}
})

test('interjection supersedes both in-flight drafts and only the new request enters shared memory',async()=>{
  const held:http.ServerResponse[]=[];let calls=0
  const f=await setup((request,res)=>{
    if(++calls<=2){held.push(res);if(held.length===2){steerConversation(f.store,f.key,'@peer NEW_CONSTRAINT');for(const response of held)reply(response,'OLD_DRAFT')}return}
    assert(JSON.stringify(request).includes('NEW_CONSTRAINT'));reply(res,'NEW_RESULT')
  },['main','peer'])
  try{
    await runConversation(f.store,f.key,'@all 原任务','',AbortSignal.timeout(15000),()=>{})
    const messages=f.store.messages(f.key).filter(item=>item.status==='complete'&&!item.kind&&item.role==='assistant')
    assert.deepEqual(messages.map(item=>item.content),['NEW_RESULT'])
    assert.equal(f.store.turns(f.key)[0].speakers.filter(item=>item.status==='skipped').length,2)
    assert(!f.store.memory(f.key,'main','group').includes('OLD_DRAFT'))
  }finally{await f.close()}
})

test('parallel approvals wake the correct waiter and neither receipt overwrites the other',async()=>{
  const f=await setup((_,res)=>reply(res,'unused'),['main','peer'])
  try{
    const signal=AbortSignal.timeout(10000)
    const a=executeExternal(f.store,f.key,'main','t','a','write_file',{path:'a.txt',content:'A'},signal,()=>{})
    const b=executeExternal(f.store,f.key,'peer','t','b','write_file',{path:'b.txt',content:'B'},signal,()=>{})
    const pending=actions(f.store,f.key);assert.equal(pending.length,2)
    decide(f.store,f.key,pending[1].id,true);await b
    assert.equal(actions(f.store,f.key)[0].status,'pending')
    decide(f.store,f.key,pending[0].id,true);await a
    assert(actions(f.store,f.key).every(item=>item.status==='complete'))
    assert.equal(fs.readFileSync(f.store.file('workspace',f.key,'a.txt'),'utf8'),'A')
    assert.equal(fs.readFileSync(f.store.file('workspace',f.key,'b.txt'),'utf8'),'B')
  }finally{await f.close()}
})

test('client interleaved streams and out-of-order completion never merge speakers',()=>{
  const source=fs.readFileSync('public/client.js','utf8'),streams=new Map()
  const context=vm.createContext({streams})
  vm.runInContext(source.slice(source.indexOf('function updateLiveStream('),source.indexOf('function paintStream(')),context)
  const update=vm.runInContext('updateLiveStream',context) as (key:string,event:Record<string,unknown>)=>{text:string;done:boolean}
  update('room',{type:'speaker',eventId:'a',agentId:'main'});update('room',{type:'speaker',eventId:'b',agentId:'peer'})
  update('room',{type:'delta',eventId:'a',text:'A1'});update('room',{type:'delta',eventId:'b',text:'B1'})
  assert.equal(update('room',{type:'speaker_done',eventId:'b',message:{content:'B1'}}).text,'B1')
  assert.equal(streams.get('room').size,1)
  assert.equal(update('room',{type:'delta',eventId:'a',text:'A2'}).text,'A1A2')
  update('room',{type:'speaker_done',eventId:'a',message:{content:'A1A2'}})
  assert.equal(streams.size,0)
})

test('client paints separate bubbles and ignores frames from a discarded stream after reload',()=>{
  const source=fs.readFileSync('public/client.js','utf8'),streams=new Map(),articles:FakeArticle[]=[]
  interface FakeBody {textContent:string;dataset:Record<string,string>;classList:{remove:()=>void};parentElement:FakeArticle}
  interface FakeArticle {dataset:Record<string,string>;body:FakeBody;who:{textContent:string;title:string};querySelector:(name:string)=>FakeBody|{textContent:string;title:string};remove:()=>void}
  const context=vm.createContext({streams,current:{id:'room'},scrollIfNear:()=>{},$ :()=>({querySelectorAll:()=>articles}),richText:(body:FakeBody,text:string)=>{body.textContent=text},message:(item:{agentName:string})=>{
    const article={} as FakeArticle
    article.dataset={};article.who={textContent:item.agentName,title:''};article.body={textContent:'',dataset:{},classList:{remove:()=>{}},parentElement:article}
    article.querySelector=name=>name==='.body'?article.body:article.who;article.remove=()=>{articles.splice(articles.indexOf(article),1)};articles.push(article);return article.body
  }})
  vm.runInContext(source.slice(source.indexOf('function updateLiveStream('),source.indexOf('function renderTurn(')),context)
  const update=vm.runInContext('updateLiveStream',context) as (key:string,event:Record<string,unknown>)=>unknown
  const paint=vm.runInContext('paintStream',context) as (key:string,entry:unknown)=>void
  paint('room',update('room',{type:'speaker',eventId:'a',agentId:'main',name:'甲'}))
  paint('room',update('room',{type:'speaker',eventId:'b',agentId:'peer',name:'乙'}))
  paint('room',update('room',{type:'delta',eventId:'b',text:'B'}));paint('room',update('room',{type:'delta',eventId:'a',text:'A'}))
  assert.deepEqual(articles.map(item=>item.body.textContent),['A','B'])
  paint('room',update('room',{type:'speaker_done',eventId:'b',message:{id:'saved-b',content:'B'}}))
  assert.equal(articles[1].dataset.messageId,'saved-b')
  const stale=update('room',{type:'delta',eventId:'a',text:'_stale'});streams.delete('room');paint('room',stale)
  assert.equal(articles[0].body.textContent,'A')
})

test('listener opportunities coalesce and fan out to no more than two peers per message',async()=>{
  const f=await setup((_,res)=>reply(res,'unused'),['main','peer','third','fourth'])
  try{
    f.store.saveGroup('开放',f.store.groupMembers(f.key),f.key,{discussionMode:'open'})
    const turn={id:'turn',content:'topic',modelId:'',at:'',updatedAt:'',speakers:[{agentId:'main',eventId:'first',status:'complete' as const}]}
    offerAudience(f.store,f.key,turn,turn.speakers[0],'source1')
    const first=(turn as import('../store.ts').Turn).observations!;assert.equal(first.length,2)
    offerAudience(f.store,f.key,turn,turn.speakers[0],'source2')
    assert(first.length<=3);assert.equal(first.filter(item=>item.agentId==='peer').length,1)
  }finally{await f.close()}
})

test('pause drains all active lanes; resume preserves completed work and cumulative budget',async()=>{
  let resume=false,peerWaiting:http.ServerResponse|undefined,first:http.ServerResponse|undefined
  const calls:string[]=[],controller=new AbortController()
  const f=await setup((request,res)=>{
    calls.push(request.model)
    if(resume){reply(res,'RESUMED_'+request.model);return}
    if(request.model==='main'){first=res;if(peerWaiting)reply(first,'COMPLETED_MAIN')}
    else if(request.model==='peer'){peerWaiting=res;if(first)reply(first,'COMPLETED_MAIN')}
    else assert.fail('third must not start before stop')
  })
  try{
    await assert.rejects(runConversation(f.store,f.key,'@all 开始','',controller.signal,event=>{if(event.type==='speaker_done'&&event.agentId==='main')controller.abort()}),/暂停/)
    const turn=f.store.turns(f.key)[0];assert.equal(turn.usage?.modelCalls,2)
    assert.equal(turn.speakers[0].status,'complete');assert.equal(turn.speakers[1].status,'failed')
    resume=true
    await runConversation(f.store,f.key,'','',AbortSignal.timeout(15000),()=>{},undefined,{retryTurnId:turn.id})
    assert.equal(calls.filter(name=>name==='main').length,1)
    assert.equal(f.store.turns(f.key)[0].usage?.modelCalls,4)
    assert(f.store.turns(f.key)[0].speakers.every(item=>item.status==='complete'))
  }finally{controller.abort();await f.close()}
})

test('natural listeners make concurrent decisions and substantive peers overlap without extra model calls',async()=>{
  const listeners:http.ServerResponse[]=[],speakers:http.ServerResponse[]=[];let checks=0
  const f=await setup((request,res)=>{
    const listening=JSON.stringify(request).includes('这次是群聊旁听的接话判断')
    if(listening){checks++;if(checks<=2){listeners.push(res);if(listeners.length===2)for(const response of listeners)reply(response,'SPEAK')}else reply(res,'PASS');return}
    if(request.model==='main'){reply(res,'初步方案');return}
    speakers.push(res);if(speakers.length===2)for(const [index,response] of speakers.entries())reply(response,'独立贡献'+index)
  })
  try{
    f.store.saveGroup('自然讨论',f.store.groupMembers(f.key),f.key,{discussionMode:'open'})
    await runConversation(f.store,f.key,'讨论方案','',AbortSignal.timeout(15000),()=>{})
    assert.equal(speakers.length,2)
    const turn=f.store.turns(f.key)[0];assert.equal(turn.speakers.length,3)
    assert.equal(turn.usage?.modelCalls,3+checks);assert(checks<=8)
  }finally{await f.close()}
})

test('a member removed while generating cannot publish the draft or create shared memory',async()=>{
  const responses:http.ServerResponse[]=[]
  const f=await setup((_,res)=>{
    responses.push(res)
    if(responses.length===2){f.store.saveGroup('讨论',['main','third'],f.key);reply(responses[0],'MAIN_RESULT');reply(responses[1],'DEPARTED_RESULT')}
  })
  try{
    await runConversation(f.store,f.key,'分别检查','',AbortSignal.timeout(15000),()=>{},['main','peer'])
    assert.equal(f.store.turns(f.key)[0].speakers[1].status,'skipped')
    assert(!f.store.messages(f.key).some(item=>item.agentId==='peer'&&item.status==='complete'&&!item.kind))
    assert(!f.store.memory(f.key,'main','group').includes('DEPARTED_RESULT'))
  }finally{await f.close()}
})

test('concurrent dispatch cannot overspend the last remaining persisted model call',async()=>{
  let calls=0
  const f=await setup((_,res)=>{calls++;reply(res,'last call')},['main','peer'])
  try{
    const user=f.store.append(f.key,'user','预算测试')
    f.store.saveTurn(f.key,{id:user.id,content:user.content,modelId:'',at:user.at,updatedAt:user.at,usage:{modelCalls:23,toolCalls:0},speakers:[{agentId:'main',eventId:'first',status:'pending'},{agentId:'peer',eventId:'second',status:'pending'}]})
    await runConversation(f.store,f.key,'','',AbortSignal.timeout(15000),()=>{},undefined,{retryTurnId:user.id})
    assert.equal(calls,1);assert.equal(f.store.turns(f.key)[0].usage?.modelCalls,24)
    assert.equal(f.store.turns(f.key)[0].speakers.filter(item=>item.status==='failed').length,1)
  }finally{await f.close()}
})


test('configured concurrency of three overlaps three real requests and is saved on the turn',async()=>{
  const held:http.ServerResponse[]=[];let peak=0
  const f=await setup((_,res)=>{held.push(res);peak=held.length;if(held.length===3)for(const response of held)reply(response,'done')})
  try{f.store.saveGroup('three',f.store.groupMembers(f.key),f.key,{runtimeLimits:{concurrency:3,modelCalls:24,toolCalls:80,events:16,depth:6,perAgent:4,listenerFanout:2,listenerChecks:8,listenerDepth:3}});await runConversation(f.store,f.key,'@all work','',AbortSignal.timeout(15000),()=>{});assert.equal(peak,3);assert.equal(f.store.turns(f.key)[0].limits?.concurrency,3)}finally{await f.close()}
})

test('provider usage is accumulated separately from estimates and survives a Store restart',async()=>{
  const f=await setup((_,res)=>{res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:'measured'},finish_reason:'stop'}],usage:{prompt_tokens:17,completion_tokens:3,total_tokens:20}})+'\n\ndata: [DONE]\n\n')},['main','peer'])
  try{await runConversation(f.store,f.key,'@all work','',AbortSignal.timeout(15000),()=>{});const usage=new Store(f.root).turns(f.key)[0].usage!;assert.equal(usage.measuredTotalTokens,40);assert.equal(usage.measuredInputTokens,34);assert.equal(usage.measuredOutputTokens,6);assert.equal(usage.usageReports,2);assert(usage.estimatedInputTokens!>0)}finally{await f.close()}
})

test('user interruption cancels an old approval wait before the replacement request runs',async()=>{
  let calls=0
  const f=await setup((_,res)=>{if(++calls===1)reply(res,'',{name:'write_file',arguments:{path:'obsolete.txt',content:'old'}});else reply(res,'replacement')},['main','peer'])
  try{await runConversation(f.store,f.key,'write a file','',AbortSignal.timeout(15000),event=>{if(event.type==='approval')steerConversation(f.store,f.key,'@peer replacement only')});assert(!fs.existsSync(f.store.file('workspace',f.key,'obsolete.txt')));assert(f.store.messages(f.key).some(message=>message.content==='replacement'&&message.status==='complete'));assert.equal(f.store.turns(f.key)[0].speakers[0].status,'skipped')}finally{await f.close()}
})

test('dependent tasks wait for durable results and receive them in context',async()=>{
  let mainCalls=0,dependency='',peerFinished=false,thirdRan=false
  const f=await setup((request,res)=>{
    if(request.model==='main'){
      mainCalls++
      if(mainCalls===1){reply(res,'',{name:'assign_task',arguments:{agentId:'peer',title:'first',content:'produce evidence'}});return}
      if(mainCalls===2){dependency=JSON.parse(f.store.text('chats',f.key,'tasks.json'))[0].id;reply(res,'',{name:'assign_task',arguments:{agentId:'third',title:'second',content:'use evidence',dependsOnTaskIds:[dependency]}});return}
      reply(res,'waiting');return
    }
    if(request.model==='peer'){
      if(!peerFinished){peerFinished=true;const task=JSON.parse(f.store.text('chats',f.key,'tasks.json'))[0];reply(res,'',{name:'complete_task',arguments:{taskId:task.id,result:'EVIDENCE_42'}})}else reply(res,'evidence submitted');return
    }
    thirdRan=true;assert(peerFinished);assert(JSON.stringify(request).includes('EVIDENCE_42'));const tasks=JSON.parse(f.store.text('chats',f.key,'tasks.json'));assert.equal(tasks[0].status,'complete');reply(res,'used evidence')
  })
  try{await runConversation(f.store,f.key,'start','',AbortSignal.timeout(15000),()=>{});assert(thirdRan);const dependent=f.store.turns(f.key)[0].speakers.find(item=>item.dependsOnTaskIds?.length);assert.equal(dependent?.status,'complete')}finally{await f.close()}
})

test('all group modes isolate private agent memories and acknowledgement needs no listener call',async()=>{
  const f=await setup((_,res)=>reply(res,'同意'),['main','peer'])
  try{fs.writeFileSync(f.store.file('agents','main','MEMORY.md'),'PRIVATE_SENTINEL');f.store.saveGroup('legacy',f.store.groupMembers(f.key),f.key,{replyMode:'coordinated',discussionMode:'open'});assert(!JSON.stringify(f.store.context(f.key,f.store.resolveModel('main'),'work','main')).includes('PRIVATE_SENTINEL'));assert(!JSON.stringify(f.store.searchMemory(f.key,'main','PRIVATE_SENTINEL')).includes('PRIVATE_SENTINEL'));await runConversation(f.store,f.key,'work','',AbortSignal.timeout(15000),()=>{});assert.equal(f.store.turns(f.key)[0].usage?.modelCalls,1)}finally{await f.close()}
})


test('serially drafted messages are not mislabeled concurrent and each attempt retains context',async()=>{
  const f=await setup((_,res)=>reply(res,'checked'))
  try{const group=f.store.session(f.key);f.store.saveGroup(group.title,f.store.groupMembers(f.key),f.key,{runtimeLimits:{...group.runtimeLimits!,concurrency:1}});await runConversation(f.store,f.key,'@all verify','',AbortSignal.timeout(15000),()=>{});const messages=f.store.messages(f.key).filter(item=>item.role==='assistant'&&!item.kind);assert(messages.every(item=>!item.concurrentMessageIds?.length));const turn=f.store.turns(f.key)[0];assert.equal(fs.readdirSync(f.store.file('chats',f.key,'contexts',turn.id)).length,3)}finally{await f.close()}
})

test('external side effects in different conversations sharing one home execute serially',async()=>{
  const f=await setup((_,res)=>reply(res,'unused'),['main','peer'])
  try{
    const other=f.store.directSession('main').id,log=path.join(f.root,'effect-order.jsonl')
    const pending=[] as Promise<unknown>[]
    for(const [index,key] of [f.key,other].entries()){
      const script=f.store.file('workspace',key,'effect.cjs');fs.mkdirSync(path.dirname(script),{recursive:true});fs.writeFileSync(script,'const fs=require("node:fs");const file='+JSON.stringify(log)+';fs.appendFileSync(file,'+JSON.stringify('start'+index+'\n')+');setTimeout(()=>fs.appendFileSync(file,'+JSON.stringify('end'+index+'\n')+'),100);')
      pending.push(executeExternal(f.store,key,'main','turn','event','shell',{command:'"'+process.execPath+'" effect.cjs'},AbortSignal.timeout(15000),()=>{}))
    }
    decide(f.store,f.key,actions(f.store,f.key)[0].id,true);decide(f.store,other,actions(f.store,other)[0].id,true)
    await Promise.all(pending);assert.deepEqual(fs.readFileSync(log,'utf8').trim().split('\n'),['start0','end0','start1','end1'])
  }finally{await f.close()}
})


test('a live durable external-operation lock prevents a competing side effect',async()=>{
  const f=await setup((_,res)=>reply(res,'unused'),['main','peer'])
  try{const lock=f.store.file('.tool-lock');fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid}));const pending=executeExternal(f.store,f.key,'main','turn','event','write_file',{path:'blocked.txt',content:'must not write'},AbortSignal.timeout(15000),()=>{});decide(f.store,f.key,actions(f.store,f.key)[0].id,true);await assert.rejects(pending,/另一个服务/);assert(!fs.existsSync(f.store.file('workspace',f.key,'blocked.txt')))}finally{await f.close()}
})

test('a configured one-call budget cannot be overspent by concurrent lanes',async()=>{
  let calls=0;const f=await setup((_,res)=>{calls++;reply(res,'one call')},['main','peer'])
  try{const group=f.store.session(f.key);f.store.saveGroup(group.title,f.store.groupMembers(f.key),f.key,{runtimeLimits:{...group.runtimeLimits!,modelCalls:1}});await runConversation(f.store,f.key,'@all work','',AbortSignal.timeout(15000),()=>{});assert.equal(calls,1);assert.equal(f.store.turns(f.key)[0].usage?.modelCalls,1);assert.equal(f.store.turns(f.key)[0].speakers.filter(item=>item.status==='failed').length,1)}finally{await f.close()}
})
