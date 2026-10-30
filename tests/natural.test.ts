import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store,json} from '../store.ts'
import {runConversation,steerConversation} from '../runtime.ts'
import {createApp} from '../app.ts'
import {seedTeam,TEAM_PRESETS} from '../defaults.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','natural-')),store=new Store(root);store.saveAgent({id:'peer',name:'伙伴'},'独立判断','PEER_PRIVATE');return {root,store}}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert(a&&typeof a==='object');return 'http://127.0.0.1:'+a.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
interface Body{model:string;max_tokens?:number;messages:{role:string;content:string}[]}
async function body(req:http.IncomingMessage):Promise<Body>{let raw='';for await(const chunk of req)raw+=chunk;return JSON.parse(raw) as Body}
function isListener(request:Body){return request.messages.some(message=>message.role==='system'&&message.content.includes('这次是群聊旁听的接话判断'))}
function reply(res:http.ServerResponse,text:string){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:text},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')}
async function configure(store:Store,url:string,mode:'open'|'directed'='open'){store.saveModel({id:'author',name:'author',model:'author',baseUrl:url});store.saveModel({id:'peer-model',name:'peer',model:'peer',baseUrl:url});store.saveAgent({...store.agent('peer'),modelId:'peer-model'},'独立核验','PEER_PRIVATE');return store.saveGroup('聊天',['main','peer'],undefined,{discussionMode:mode,replyMode:'collective'})}

test('unaddressed peer contributes a counterexample and original speaker revises naturally',async()=>{
  const {root,store}=fixture();let author=0,peer=0;const heard:string[]=[]
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);assert(!JSON.stringify(request).includes('PEER_PRIVATE'))
    if(isListener(request)){reply(res,request.model==='peer'&&peer>0?'PASS':'SPEAK');return}
    heard.push(request.model)
    if(request.model==='author'){author++;if(author===2)assert(JSON.stringify(request).includes('两个用户会同名'));reply(res,author===1?'我建议按姓名关联用户记录。':'这个反例成立，我改用稳定 ID。')}
    else{peer++;reply(res,'两个用户会同名，姓名不能当作唯一标识。')}
  })
  try{const group=await configure(store,await listen(upstream));await runConversation(store,group.id,'一起聊聊标识方案','',new AbortController().signal,()=>{});assert.deepEqual(heard,['author','peer','author']);const turn=store.turns(group.id)[0];assert.equal(turn.speakers.filter(item=>item.spontaneous).length,2);assert(turn.observations?.some(item=>item.status==='silent'));assert.equal(store.memoryItems(group.id,'main','group').filter(item=>item.category==='discussion').length,3)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('silent listeners do not publish filler or create shared memory',async()=>{
  const {root,store}=fixture();let calls=0
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);calls++;reply(res,isListener(request)?'PASS':'一个简单明确的回答。')})
  try{const group=await configure(store,await listen(upstream));await runConversation(store,group.id,'简单问题','',new AbortController().signal,()=>{});assert.equal(calls,2);assert.equal(store.turns(group.id)[0].speakers.length,1);assert.equal(store.turns(group.id)[0].observations?.[0].status,'silent');assert.equal(store.messages(group.id).filter(item=>item.role==='assistant'&&!item.kind).length,1)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('directed mode preserves explicitly addressed collaboration without audience calls',async()=>{
  const {root,store}=fixture();let calls=0
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);assert(!isListener(request));calls++;reply(res,'定向处理完成')})
  try{const group=await configure(store,await listen(upstream),'directed');await runConversation(store,group.id,'定向处理','',new AbortController().signal,()=>{});assert.equal(calls,1);assert.equal(store.turns(group.id)[0].observations,undefined)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('listener providers receive enough output room while respecting the member output limit',async()=>{
  const {root,store}=fixture()
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);if(isListener(request)){assert((request.max_tokens||0)<=768);if((request.max_tokens||0)<512){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n');return}reply(res,'PASS')}else reply(res,'公开回答')})
  try{const url=await listen(upstream),group=await configure(store,url);store.saveModel({id:'peer-model',maxOutputTokens:768});await runConversation(store,group.id,'讨论','',new AbortController().signal,()=>{});assert.equal(store.turns(group.id)[0].observations?.[0].status,'silent')}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('truncated formal replies report output limits and preserve partial text without sharing it as complete',async()=>{
  const {root,store}=fixture()
  const upstream=http.createServer(async(req,res)=>{await body(req);res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: {"choices":[{"delta":{"content":"尚未完成的回复"},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n')})
  try{const group=await configure(store,await listen(upstream),'directed');await runConversation(store,group.id,'一个复杂问题','',new AbortController().signal,()=>{});const turn=store.turns(group.id)[0];assert.equal(turn.speakers[0].status,'failed');assert(turn.speakers[0].error?.includes('输出达到上限'));assert(!turn.speakers[0].error?.includes('Key'));assert(store.messages(group.id).some(item=>item.content==='尚未完成的回复'&&item.status==='interrupted'));assert.equal(store.memoryItems(group.id,'main','group').filter(item=>item.category==='discussion').length,0)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('agents always requesting to speak cannot create endless natural discussion',async()=>{
  const {root,store}=fixture();let calls=0
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);calls++;reply(res,isListener(request)?'SPEAK':'补充一个独立角度 '+calls)})
  try{const group=await configure(store,await listen(upstream));await runConversation(store,group.id,'开放探索','',new AbortController().signal,()=>{});const turn=store.turns(group.id)[0];assert((turn.observations?.length||0)<=8);assert(turn.speakers.length<=16);assert(calls<=24);assert(turn.speakers.every(item=>item.status==='complete'));assert(turn.speakers.every(item=>(item.hop||0)<=turn.limits!.listenerDepth))}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('a member model changed during another speaker applies to its next listener and speech',async()=>{
  const {root,store}=fixture(),app=createApp(root,{seed:false});let base='',changed=false;const calls:string[]=[]
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);calls.push(request.model)
    if(!isListener(request)&&request.model==='author'&&!changed){changed=true;const response=await fetch(base+'/api/agents/peer/model',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelId:'replacement',expectedModelId:'peer-model'})});assert.equal(response.status,200);reply(res,'请大家看看这个方案');return}
    reply(res,isListener(request)?request.model==='replacement'?'SPEAK':'PASS':'我从另一个角度补充。')
  })
  try{const url=await listen(upstream),group=await configure(store,url);store.saveModel({id:'replacement',name:'新模型',model:'replacement',baseUrl:url});base=await listen(app.server);const response=await fetch(base+`/api/chats/${group.id}/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'自然讨论'})});assert((await response.text()).includes('"type":"done"'));assert(!calls.includes('peer'));assert(calls.includes('replacement'));assert.equal(store.turns(group.id)[0].speakers.find(item=>item.agentId==='peer')?.modelId,'replacement');assert.equal(store.text('agents','peer','MEMORY.md'),'PEER_PRIVATE');const stale=await fetch(base+'/api/agents/peer/model',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelId:'peer-model',expectedModelId:'peer-model'})});assert.equal(stale.status,409)}finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('failed audience check resumes without rerunning the completed speaker',async()=>{
  const {root,store}=fixture();let fail=true,speeches=0
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);if(isListener(request)){if(fail){res.writeHead(500);res.end();return}reply(res,'PASS')}else{speeches++;reply(res,'已经完成的公开回复')}})
  try{const group=await configure(store,await listen(upstream));await runConversation(store,group.id,'讨论','',new AbortController().signal,()=>{});const turn=store.turns(group.id)[0];assert.equal(turn.observations?.[0].status,'failed');fail=false;await runConversation(new Store(root),group.id,'','',new AbortController().signal,()=>{},undefined,{retryTurnId:turn.id});assert.equal(speeches,1);assert.equal(store.turns(group.id)[0].observations?.[0].status,'silent')}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('six editable personas upgrade old installation without replacing custom prompts, keys or models',()=>{
  const {root,store}=fixture()
  try{store.saveModel({id:'custom',name:'自己的模型',model:'custom',baseUrl:'http://127.0.0.1:1'});store.saveAgent({id:'personal',name:'私人 AI',modelId:'custom'},'CUSTOM_PROMPT','CUSTOM_MEMORY');store.saveAgent({id:'manager',name:'总经理'},'CUSTOM_MANAGER','');store.saveGroup('我的旧团队',['personal','manager'],undefined,{discussionMode:'directed',memberRoles:{personal:'自定义职责'}},'my-team');json(store.file('team-installed.json'),{version:1});json(store.file('provider-keys.json'),{'opencode-go':'PRIVATE_TEST_KEY'});seedTeam(store);assert.equal(TEAM_PRESETS.length,6);for(const persona of TEAM_PRESETS){assert(store.agent(persona.id).background);assert(store.agent(persona.id).responsibilities)}assert.equal(store.text('agents','personal','RULES.md'),'CUSTOM_PROMPT');assert.equal(store.text('agents','personal','MEMORY.md'),'CUSTOM_MEMORY');assert.equal(store.agent('personal').modelId,'custom');assert.equal(store.session('my-team').discussionMode,'directed');assert.equal(store.session('my-team').memberRoles?.personal,'自定义职责');assert(store.groupMembers('my-team').includes('creative'));assert.equal(store.providerKeys()['opencode-go'],'PRIVATE_TEST_KEY');const before=store.text('agents','personal','agent.json');seedTeam(store);assert.equal(store.text('agents','personal','agent.json'),before)}finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('user interjection during a listener decision takes precedence over the pending spontaneous reply',async()=>{
  const {root,store}=fixture();let key='',checks=0;const speeches:string[]=[]
  const upstream=http.createServer(async(req,res)=>{const request=await body(req);if(isListener(request)){checks++;if(checks===1){steerConversation(store,key,'@伙伴 NEW_REQUEST 优先处理新要求');reply(res,'SPEAK')}else reply(res,'PASS');return}speeches.push(request.model);if(request.model==='peer')assert(JSON.stringify(request).includes('NEW_REQUEST'));reply(res,'已处理当前用户要求')})
  try{key=(await configure(store,await listen(upstream))).id;await runConversation(store,key,'原始问题','',new AbortController().signal,()=>{});assert.deepEqual(speeches,['author','peer']);assert.equal(store.messages(key).filter(item=>item.role==='user').length,2);assert(!store.turns(key)[0].speakers.some(item=>item.spontaneous))}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('agent profile saves model, background and responsibilities with conflict protection',async()=>{
  const {root,store}=fixture(),app=createApp(root,{seed:false})
  try{store.saveModel({id:'choice',name:'模型',model:'choice',baseUrl:'http://127.0.0.1:1'});const base=await listen(app.server);const response=await fetch(base+'/api/agents',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'peer',name:'伙伴',modelId:'choice',background:'独立研究背景',responsibilities:'核验与讨论',rules:'新提示词',expectedModelId:'',expectedBackground:'',expectedResponsibilities:''})});assert.equal(response.status,200);const saved=store.agent('peer');assert.equal(saved.modelId,'choice');assert.equal(saved.background,'独立研究背景');assert.equal(store.text('agents','peer','MEMORY.md'),'PEER_PRIVATE');const context=store.context(store.directSession('peer').id,store.resolveModel('peer'),'你好','peer');assert(JSON.stringify(context).includes('独立研究背景'));const stale=await fetch(base+'/api/agents',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'peer',name:'伙伴',background:'旧编辑覆盖',expectedBackground:''})});assert.equal(stale.status,409);assert.equal(store.agent('peer').background,'独立研究背景')}finally{await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})
