import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import { Store, json } from '../store.ts'
import {createApp} from '../app.ts'
import {seedTeam} from '../defaults.ts'
import {runConversation,tasks,steerConversation} from '../runtime.ts'
import {executeExternal,actions,decide,workspacePath,saveIntegrations} from '../execution.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','pi-'));return {root,store:new Store(root)}}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
function reply(res:http.ServerResponse,content:string,calls?:{name:string;args:Record<string,unknown>}[]){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:calls?{tool_calls:calls.map((call,index)=>({index,id:'call-'+index,function:{name:call.name,arguments:JSON.stringify(call.args)}}))}:{content},finish_reason:calls?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')}
test('six Go defaults are installed once and never overwrite existing identities or keys',()=>{
  const {root,store}=fixture()
  try{store.saveAgent({id:'personal',name:'我的名字'},'我的规则','我的记忆');json(store.file('provider-keys.json'),{'opencode-go':'FAKE_TEST_KEY'});seedTeam(store);seedTeam(store);assert.equal(store.agent('personal').name,'我的名字');assert.equal(store.text('agents','personal','MEMORY.md'),'我的记忆');assert.equal(store.session('my-team').memberIds?.length,6);for(const id of ['personal','manager','programmer','advisor'])assert(store.agent(id));assert.equal(store.models().filter(model=>model.id.startsWith('team-')).length,6);assert.equal(store.providerKeys()['opencode-go'],'FAKE_TEST_KEY')}finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('manager dispatches actual work, programmer submits result and manager receives it directly',async()=>{
  const {root,store}=fixture(),calls:string[]=[];let manager=0,programmer=0
  const upstream=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw) as {model:string};calls.push(body.model)
    if(body.model==='manager'&&++manager===1)reply(res,'',[{name:'assign_task',args:{agentId:'programmer',title:'独立计算',content:'计算 2+2 并汇报'}}])
    else if(body.model==='programmer'&&++programmer===1){const task=tasks(store,store.sessions().find(item=>item.kind==='group')!.id)[0];assert(task);reply(res,'',[{name:'complete_task',args:{taskId:task.id,result:'计算结果为4；文字分析，无外部执行'}}])}
    else reply(res,'已处理本次事件')
  })
  try{const url=await listen(upstream);store.saveModel({name:'manager',model:'manager',baseUrl:url});const model=store.saveModel({name:'programmer',model:'programmer',baseUrl:url});store.saveAgent({id:'programmer',name:'程序员',modelId:model.id},'执行任务','');const group=store.saveGroup('协作',['main','programmer'],undefined,{replyMode:'collective'});await runConversation(store,group.id,'安排任务','',new AbortController().signal,()=>{});assert.equal(calls[0],'manager');assert.equal(calls.at(-1),'manager');assert.equal(calls.filter(name=>name==='manager').length,3);assert.equal(calls.filter(name=>name==='programmer').length,2);assert.equal(tasks(store,group.id)[0].status,'complete');assert.deepEqual(store.turns(group.id)[0].speakers.map(item=>item.agentId),['main','programmer','main']);assert.equal(store.memoryItems(group.id,'main','group').filter(item=>item.category==='discussion').length,3)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
test('file and real Shell operations wait for approval, cache receipts and report failures honestly',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main'),signal=new AbortController().signal
  try{
    const args={path:'hello.txt',content:'真实文件'},pending=executeExternal(store,chat.id,'main','turn','event','write_file',args,signal,()=>{})
    assert(!fs.existsSync(store.file('workspace',chat.id,'hello.txt')));assert.equal(actions(store,chat.id)[0].status,'pending');decide(store,chat.id,actions(store,chat.id)[0].id,true);await pending
    assert.equal(fs.readFileSync(store.file('workspace',chat.id,'hello.txt'),'utf8'),'真实文件');fs.writeFileSync(store.file('workspace',chat.id,'hello.txt'),'用户后来修改')
    await executeExternal(store,chat.id,'main','turn','event','write_file',args,signal,()=>{});assert.equal(fs.readFileSync(store.file('workspace',chat.id,'hello.txt'),'utf8'),'用户后来修改')
    const shell=executeExternal(store,chat.id,'main','turn','shell','shell',{command:process.platform==='win32'?'echo ACTUAL_SHELL_OUTPUT':'printf ACTUAL_SHELL_OUTPUT'},signal,()=>{});decide(store,chat.id,actions(store,chat.id).at(-1)!.id,true);const output=await shell as {exitCode:number;output:string};assert.equal(output.exitCode,0);assert(output.output.includes('ACTUAL_SHELL_OUTPUT'))
    const failed=executeExternal(store,chat.id,'main','turn','bad','shell',{command:process.platform==='win32'?'exit /b 7':'exit 7'},signal,()=>{});decide(store,chat.id,actions(store,chat.id).at(-1)!.id,true);assert.equal((await failed as {exitCode:number}).exitCode,7);assert.equal(actions(store,chat.id).at(-1)!.status,'failed')
    const denied=executeExternal(store,chat.id,'main','turn','deny','write_file',{path:'denied.txt',content:'no'},signal,()=>{});decide(store,chat.id,actions(store,chat.id).at(-1)!.id,false);await assert.rejects(denied,/拒绝/);assert(!fs.existsSync(store.file('workspace',chat.id,'denied.txt')))
    assert.throws(()=>workspacePath(store,chat.id,'../../provider-keys.json'),/工作目录/)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('pausing approval preserves pending action; resuming runs it once; uncertain execution needs fresh approval',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main'),controller=new AbortController(),args={path:'resume.txt',content:'resumed'}
  try{const first=executeExternal(store,chat.id,'main','t','e','write_file',args,controller.signal,()=>{});controller.abort();await assert.rejects(first,/暂停/);assert.equal(actions(store,chat.id)[0].status,'pending');const second=executeExternal(store,chat.id,'main','t','e','write_file',args,new AbortController().signal,()=>{});decide(store,chat.id,actions(store,chat.id)[0].id,true);await second;assert.equal(actions(store,chat.id).length,1);const all=actions(store,chat.id);all[0].status='running';json(store.file('chats',chat.id,'actions.json'),all);const third=executeExternal(store,chat.id,'main','t','e','write_file',args,new AbortController().signal,()=>{});assert.equal(actions(store,chat.id)[0].status,'uncertain');decide(store,chat.id,all[0].id,false);await assert.rejects(third,/拒绝/)}finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('real MCP stdio handshake and call execute only after approval and redact configured tokens',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main')
  const script=`let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{input+=chunk;let i;while((i=input.indexOf('\\n'))>=0){const line=input.slice(0,i);input=input.slice(i+1);if(!line.trim())continue;const q=JSON.parse(line);if(q.id===undefined)continue;let result=q.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'test',version:'1'}}:q.method==='tools/list'?{tools:[{name:'echo',description:'echo',inputSchema:{type:'object'}}]}:{content:[{type:'text',text:'MCP_ACTUAL_RESULT PRIVATE_MCP_TOKEN'}]};process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:q.id,result})+'\\n')}})`
  try{saveIntegrations(store,[{id:'fixture',command:process.execPath,args:['-e',script],token:'PRIVATE_MCP_TOKEN'}]);const call=executeExternal(store,chat.id,'main','t','mcp','mcp',{serverId:'fixture',tool:'echo',arguments:{}},new AbortController().signal,()=>{});assert.equal(actions(store,chat.id)[0].status,'pending');decide(store,chat.id,actions(store,chat.id)[0].id,true);const result=JSON.stringify(await call);assert(result.includes('MCP_ACTUAL_RESULT'));assert(!result.includes('PRIVATE_MCP_TOKEN'))}finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('API approvals are same-origin and credentials never appear in integration responses',async()=>{
  const {root}=fixture(),app=createApp(root,{seed:false})
  try{saveIntegrations(app.store,[{id:'sample',url:'http://127.0.0.1:1/mcp',token:'PRIVATE_MCP_TOKEN'}]);const base=await listen(app.server);const config=await (await fetch(base+'/api/integrations')).text();assert(!config.includes('PRIVATE_MCP_TOKEN'));assert(config.includes('hasToken'));const denied=await fetch(base+'/api/integrations',{method:'PUT',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{"servers":[]}'});assert.equal(denied.status,403)}finally{await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})
test('user interjection is persisted and delivered while a group is running',async()=>{
  const {root,store}=fixture();let calls=0
  const upstream=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;calls++;if(calls===1){steerConversation(store,store.sessions().find(item=>item.kind==='group')!.id,'@审阅员 优先核对新要求');reply(res,'原始事件处理完成')}else{assert(raw.includes('优先核对新要求'));reply(res,'已收到插话')}})
  try{store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});store.saveAgent({id:'reviewer',name:'审阅员'},'核对','');const group=store.saveGroup('群',['main','reviewer'],undefined,{replyMode:'collective'});await runConversation(store,group.id,'开始','',new AbortController().signal,()=>{});assert.equal(calls,2);assert.equal(store.messages(group.id).filter(message=>message.role==='user').length,2);assert.deepEqual(store.turns(group.id)[0].speakers.map(item=>item.agentId),['main','reviewer'])}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
test('repeated Bot ping-pong is stopped by persisted hop and participant budgets',async()=>{
  const {root,store}=fixture();let calls=0
  const upstream=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw) as {model:string;messages:{role:string}[]};calls++;if(!body.messages.some(message=>message.role==='tool'))reply(res,'',[{name:'send_message',args:{agentId:body.model==='main'?'other':'main',content:'检查 '+calls}}]);else reply(res,'等待对方')})
  try{const url=await listen(upstream);store.saveModel({name:'main',model:'main',baseUrl:url});const model=store.saveModel({name:'other',model:'other',baseUrl:url});store.saveAgent({id:'other',name:'其他',modelId:model.id},'协作','');const group=store.saveGroup('群',['main','other'],undefined,{replyMode:'collective'});await runConversation(store,group.id,'开始','',new AbortController().signal,()=>{});const turn=store.turns(group.id)[0];assert(turn.speakers.length<=8);assert(turn.speakers.every(item=>(item.hop||0)<=6));assert(calls<=16);assert(turn.speakers.every(item=>item.status==='complete'))}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
