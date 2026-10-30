import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,json,runtimeDefaults,type Turn,type Observation} from '../store.ts'
import {offerAudience,listenDecision} from '../audience.ts'
import {runConversation} from '../runtime.ts'
import {seedTeam} from '../defaults.ts'

interface Request {model:string;messages:{role:string;content:string}[]}
function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','conversation-')),store=new Store(root);return {root,store,clean:()=>fs.rmSync(root,{recursive:true,force:true})}}
function reply(res:http.ServerResponse,text:string){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:text},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')}
async function upstream(handler:(request:Request,res:http.ServerResponse)=>void){const server=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;handler(JSON.parse(raw) as Request,res)});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return {url:'http://127.0.0.1:'+address.port,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}}}
function group(store:Store,url:string,members=['main','peer','researcher']){for(const member of members){store.saveModel({id:member,name:member,model:member,baseUrl:url});store.saveAgent({id:member,name:member,modelId:member},'自主讨论、核验、回应具体问题','PRIVATE_'+member)}return store.saveGroup('自然讨论',members,undefined,{replyMode:'collective',discussionMode:'open',runtimeLimits:{...runtimeDefaults,listenerFanout:1}}).id}
function observation(source:string,agentId='peer'):Observation{return {id:'listen-'+source,agentId,sourceMessageId:source,parentEventId:'parent',hop:1,topic:'主议题',status:'pending'}}

test('three bots sustain seven content-linked turns and combine ideas without messaging tools or fixed rounds',async()=>{
  const f=fixture(),moves=[
    {agent:'main',intent:'proposal',text:'先用缓存提速。@peer 你觉得哪里需要再想想？'},
    {agent:'peer',intent:'question',text:'更新后怎样防止缓存继续返回旧值？@researcher 有什么办法？'},
    {agent:'researcher',intent:'answer',text:'可以给数据加版本号，让缓存键包含版本。@main 能和你的提速方案合并吗？'},
    {agent:'main',intent:'proposal',text:'把缓存提速和版本键组合起来；但读版本可能也有成本。@peer 这样解决你的顾虑了吗？'},
    {agent:'peer',intent:'question',text:'还要看高频更新时版本检查是否抵消收益。@researcher 怎么验证？'},
    {agent:'researcher',intent:'proposal',text:'用低更新和高更新两组负载对比延迟与旧值率。@main 据此怎样修正选择？'},
    {agent:'main',intent:'revision',text:'我把最初的全量缓存方案改为：低更新数据使用版本键缓存，高更新数据先直读，再用两组负载验证取舍。'},
  ]
  let speeches=0,checks=0
  const server=await upstream((request,res)=>{
    assert(!JSON.stringify(request).includes('PRIVATE_'))
    const listening=request.messages.some(message=>message.role==='system'&&message.content.includes('这次是群聊旁听的接话判断'))
    if(listening){checks++;const next=moves[speeches];assert(next);assert.equal(request.model,next.agent);reply(res,JSON.stringify({decision:'SPEAK',intent:next.intent,reason:'回应上一位成员留下的具体问题',contribution:next.text}));return}
    const move=moves[speeches];assert(move);assert.equal(request.model,move.agent)
    if(speeches>0){const context=JSON.stringify(request);assert(context.includes(moves[speeches-1].text));assert(context.includes('你在旁听时准备推进的内容'))}
    speeches++;reply(res,move.text)
  })
  try{
    const key=group(f.store,server.url)
    await runConversation(f.store,key,'一起把缓存方案聊清楚','',AbortSignal.timeout(60000),()=>{})
    const turn=f.store.turns(key)[0],messages=f.store.messages(key).filter(message=>message.turnId===turn.id&&!message.kind)
    assert.equal(speeches,7);assert.equal(checks,6);assert.equal(turn.usage?.toolCalls,0)
    assert.equal(messages.length,7);assert(turn.speakers.every(item=>item.status==='complete'))
    for(let index=1;index<messages.length;index++){assert.equal(messages[index].replyToMessageId,messages[index-1].id);assert.equal(messages[index].responseIntent,moves[index].intent)}
    assert.equal(turn.observations?.filter(item=>item.contribution&&item.reason).length,6)
    assert.equal(new Store(f.root).messages(key).find(message=>message.id===messages[6].id)?.responseIntent,'revision')
  }finally{await server.close();f.clean()}
})

test('messages arriving during a listener decision remain pending and coalesce without the old two-check cap',()=>{
  const f=fixture()
  try{
    const key=group(f.store,'http://127.0.0.1:1'),parent={agentId:'main',fromAgentId:'peer',eventId:'parent',status:'complete' as const}
    const turn:Turn={id:'turn',content:'聊聊',modelId:'',at:'',updatedAt:'',speakers:[parent],observations:[{...observation('old'),status:'checking',consideredMessageIds:['old']}]}
    const first=f.store.append(key,'assistant','@peer 新问题一','complete',{agentId:'main'})
    offerAudience(f.store,key,turn,parent,first.id)
    assert.equal(turn.observations?.filter(item=>item.agentId==='peer'&&item.status==='pending').length,1)
    const second=f.store.append(key,'assistant','@peer 最新问题二','complete',{agentId:'main'})
    offerAudience(f.store,key,turn,parent,second.id)
    assert.equal(turn.observations?.find(item=>item.agentId==='peer'&&item.status==='pending')?.sourceMessageId,second.id)
    assert.equal(turn.observations?.find(item=>item.status==='checking')?.sourceMessageId,'old')
    for(const item of turn.observations||[])item.status='joined'
    const third=f.store.append(key,'assistant','@peer 再追问一个条件','complete',{agentId:'main'})
    offerAudience(f.store,key,turn,parent,third.id)
    assert(turn.observations?.some(item=>item.agentId==='peer'&&item.sourceMessageId===third.id&&item.status==='pending'))
  }finally{f.clean()}
})

test('configured event budget above sixteen permits further natural conversation on resume',async()=>{
  const f=fixture();let speeches=0
  const server=await upstream((request,res)=>{if(request.messages.some(message=>message.role==='system'&&message.content.includes('这次是群聊旁听的接话判断')))reply(res,'SPEAK');else{speeches++;reply(res,'第十七个事件仍能讨论具体内容')}})
  try{
    const key=group(f.store,server.url,['main','peer']),user=f.store.append(key,'user','继续讨论'),source=f.store.append(key,'assistant','还有一个条件','complete',{agentId:'main',turnId:user.id})
    f.store.saveTurn(key,{id:user.id,content:user.content,modelId:'',at:user.at,updatedAt:user.at,limits:{...runtimeDefaults,events:20,listenerDepth:1},speakers:Array.from({length:16},(_,index)=>({agentId:'main',eventId:'historical-'+index,status:'complete' as const})),observations:[observation(source.id)]})
    await runConversation(f.store,key,'','',AbortSignal.timeout(30000),()=>{},undefined,{retryTurnId:user.id})
    const turn=f.store.turns(key)[0];assert.equal(speeches,1);assert.equal(turn.speakers.length,17);assert.equal(turn.speakers[16].status,'complete')
  }finally{await server.close();f.clean()}
})

test('a listener rechecks a newer concurrent message after passing on the old snapshot',async()=>{
  const f=fixture();let researchReply:http.ServerResponse|undefined,firstCheck:http.ServerResponse|undefined,checks=0,peerSpeeches=0
  const server=await upstream((request,res)=>{
    const listening=request.messages.some(message=>message.role==='system'&&message.content.includes('这次是群聊旁听的接话判断'))
    if(listening){
      assert.equal(request.model,'peer');checks++
      if(checks===1){firstCheck=res;if(researchReply)reply(researchReply,'@peer NEW_CONSTRAINT 刚发现预算更紧')}
      else{assert(JSON.stringify(request).includes('NEW_CONSTRAINT'));reply(res,JSON.stringify({decision:'SPEAK',intent:'revision',reason:'出现了之前未见的新约束',contribution:'根据新预算缩小方案'}))}
    }else if(request.model==='main')reply(res,'@peer 先看看原方案')
    else if(request.model==='researcher'){researchReply=res;if(firstCheck)reply(res,'@peer NEW_CONSTRAINT 刚发现预算更紧')}
    else{peerSpeeches++;assert(JSON.stringify(request).includes('NEW_CONSTRAINT'));reply(res,'根据新预算，我建议缩小方案')}
  })
  try{
    const key=group(f.store,server.url)
    f.store.saveGroup('并发讨论',f.store.groupMembers(key),key,{runtimeLimits:{...runtimeDefaults,listenerFanout:1,listenerDepth:1}})
    await runConversation(f.store,key,'分别提出方案和约束','',AbortSignal.timeout(30000),event=>{if(event.type==='speaker_done'&&event.agentId==='researcher'&&firstCheck)reply(firstCheck,'PASS')},['main','researcher'])
    const turn=f.store.turns(key)[0]
    assert.equal(checks,2);assert.equal(peerSpeeches,1)
    assert(turn.observations?.some(item=>item.agentId==='peer'&&item.status==='silent'))
    assert(turn.observations?.some(item=>item.agentId==='peer'&&item.status==='joined'&&item.contribution==='根据新预算缩小方案'))
  }finally{await server.close();f.clean()}
})

test('listener cannot claim a substantive contribution with an empty structured plan',async()=>{
  const f=fixture(),server=await upstream((_request,res)=>reply(res,JSON.stringify({decision:'SPEAK',intent:'question',reason:' ',contribution:''})))
  try{const key=group(f.store,server.url),source=f.store.append(key,'assistant','讨论具体问题','complete',{agentId:'main'});await assert.rejects(listenDecision(f.store,key,observation(source.id),'',AbortSignal.timeout(10000),()=>{}),/有效的接话决定/)}finally{await server.close();f.clean()}
})

test('discussion upgrade adjusts only untouched old defaults and retains customized budgets',()=>{
  const f=fixture()
  try{
    f.store.saveAgent({id:'peer',name:'伙伴'},'独立讨论','')
    const original=f.store.saveGroup('旧默认',['main','peer'],undefined,{discussionMode:'open',runtimeLimits:{...runtimeDefaults,listenerDepth:3}})
    const custom=f.store.saveGroup('用户配置',['main','peer'],undefined,{discussionMode:'open',runtimeLimits:{...runtimeDefaults,listenerDepth:3,perAgent:7}})
    json(f.store.file('team-installed.json'),{version:2});seedTeam(f.store)
    assert.equal(f.store.session(original.id).runtimeLimits?.listenerDepth,6);assert.equal(f.store.session(original.id).runtimeLimits?.modelCalls,24)
    assert.equal(f.store.session(custom.id).runtimeLimits?.listenerDepth,3);assert.equal(f.store.session(custom.id).runtimeLimits?.perAgent,7)
  }finally{f.clean()}
})
