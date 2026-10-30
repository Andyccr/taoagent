import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store, json} from '../store.ts'
import {createApp} from '../app.ts'
import {actions, decide, executeExternal, saveIntegrations, streamRedactor, toolFailed, workspace} from '../execution.ts'
import {portableZip} from '../portable.ts'
import {runPi} from '../pi.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','audit-'));return {root,store:new Store(root)}}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const addr=server.address();assert(addr&&typeof addr==='object');return `http://127.0.0.1:${addr.port}`}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}

test('approval must reach the running application instance and cannot silently approve from another instance',async()=>{
  const {root}=fixture(),a=createApp(root,{seed:false}),b=createApp(root,{seed:false}),chat=a.store.directSession('main'),controller=new AbortController(),release=a.store.acquireRun(chat.id)
  a.active.set(chat.id,controller)
  const pending=executeExternal(a.store,chat.id,'main','turn','event','write_file',{path:'approved.txt',content:'once'},controller.signal,()=>{})
  try{
    const baseA=await listen(a.server),baseB=await listen(b.server),headers={'Content-Type':'application/json'},body=JSON.stringify({actionId:actions(a.store,chat.id)[0].id,approve:true})
    const wrong=await fetch(`${baseB}/api/chats/${chat.id}/actions`,{method:'POST',headers,body})
    assert.equal(wrong.status,409);assert.equal(actions(a.store,chat.id)[0].status,'pending')
    const right=await fetch(`${baseA}/api/chats/${chat.id}/actions`,{method:'POST',headers,body})
    assert.equal(right.status,200);await pending
    assert.equal(fs.readFileSync(a.store.file('workspace',chat.id,'approved.txt'),'utf8'),'once')
  }finally{controller.abort();await pending.catch(()=>{});a.active.delete(chat.id);release();await close(a.server);await close(b.server);fs.rmSync(root,{recursive:true,force:true})}
})

test('MCP approval binds command, parameters and credentials; configuration changes require a new action',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main'),signal=new AbortController().signal
  try{
    saveIntegrations(store,[{id:'server',command:process.execPath,args:['-e','process.exit(0)'],token:'SECRET_APPROVAL_TOKEN'}])
    const old=executeExternal(store,chat.id,'main','t','e','mcp',{serverId:'server'},signal,()=>{}),first=actions(store,chat.id)[0]
    assert.equal(first.target?.command,process.execPath);assert(!JSON.stringify(first.target).includes('SECRET_APPROVAL_TOKEN'))
    saveIntegrations(store,[{id:'server',command:process.execPath,args:['-e','process.exit(7)'],token:'NEW_APPROVAL_TOKEN'}])
    decide(store,chat.id,first.id,true);await assert.rejects(old,/配置在审批期间已变化/)
    const next=executeExternal(store,chat.id,'main','t','e','mcp',{serverId:'server'},signal,()=>{}),second=actions(store,chat.id).at(-1)!
    assert.notEqual(first.id,second.id);assert.equal(second.status,'pending');decide(store,chat.id,second.id,false);await assert.rejects(next,/拒绝/)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('MCP error results and cached failed results remain failures rather than becoming successful tool runs',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main')
  const script=`let buffer='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\\n'))>=0){const q=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);if(q.id===undefined)continue;const result=q.method==='initialize'?{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'failed-tool',version:'1'}}:{isError:true,content:[{type:'text',text:'actual MCP failure'}]};process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:q.id,result})+'\\n')}})`
  try{
    saveIntegrations(store,[{id:'failure',command:process.execPath,args:['-e',script]}])
    const args={serverId:'failure',tool:'test'},run=executeExternal(store,chat.id,'main','t','e','mcp',args,new AbortController().signal,()=>{})
    decide(store,chat.id,actions(store,chat.id)[0].id,true)
    assert(toolFailed(await run));assert.equal(actions(store,chat.id)[0].status,'failed')
    const cached=await executeExternal(store,chat.id,'main','t','e','mcp',args,new AbortController().signal,()=>{})
    assert(toolFailed(cached));assert.equal(actions(store,chat.id).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('stream output hides split and overlapping credentials and preserves surrounding Unicode',()=>{
  const {root,store}=fixture()
  try{
    json(store.file('provider-keys.json'),{one:'abcdefghijkl',two:'fghijklmnopqrst'})
    let output='';const stream=streamRedactor(store,text=>{output+=text})
    for(const chunk of ['中文 ','abc','defgh','ijklmnop','qrst',' 安全']){stream.write(chunk);assert(!output.includes('abc'));assert(!output.includes('fghi'))}
    stream.end();assert(output.startsWith('中文 '));assert(output.endsWith(' 安全'));assert(!output.includes('abcdefghijkl'));assert(!output.includes('fghijklmnopqrst'))
    let simple='';const next=streamRedactor(store,text=>{simple+=text});next.write('开始abcdefghijkl结束');next.end();assert.equal(simple,'开始[已隐藏凭据]结束')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('real command streaming decodes UTF-8 across process chunks',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main')
  try{
    const dir=workspace(store,chat.id)
    fs.writeFileSync(path.join(dir,'utf8.cjs'),"const b=Buffer.from('中文🙂');process.stdout.write(b.subarray(0,1));setTimeout(()=>process.stdout.write(b.subarray(1)),30)")
    let output='';const run=executeExternal(store,chat.id,'main','t','utf8','shell',{command:`"${process.execPath}" utf8.cjs`},new AbortController().signal,value=>{if(value.type==='tool_output')output+=String(value.text)})
    decide(store,chat.id,actions(store,chat.id)[0].id,true);const result=await run as {output:string}
    assert.equal(result.output,'中文🙂');assert.equal(output,'中文🙂')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('pausing a running Shell stops its descendant before delayed side effects occur',async()=>{
  const {root,store}=fixture(),chat=store.directSession('main'),controller=new AbortController()
  try{
    const dir=workspace(store,chat.id)
    fs.writeFileSync(path.join(dir,'waiting.cjs'),"process.stdout.write('READY');setTimeout(()=>require('fs').writeFileSync('late.txt','should not happen'),2000)")
    const run=executeExternal(store,chat.id,'main','t','abort','shell',{command:`"${process.execPath}" waiting.cjs`},controller.signal,value=>{if(value.type==='tool_output'&&String(value.text).includes('READY'))controller.abort()})
    decide(store,chat.id,actions(store,chat.id)[0].id,true);await assert.rejects(run,/暂停/)
    await new Promise(resolve=>setTimeout(resolve,2300));assert(!fs.existsSync(path.join(dir,'late.txt')));assert.equal(actions(store,chat.id)[0].status,'uncertain')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('portable exports include work products but omit workspace dependencies, Git and build caches',()=>{
  const {root,store}=fixture()
  try{
    for(const name of ['node_modules','.git','.next','__pycache__','.pytest_cache']){const dir=store.file('workspace','project',name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'CACHE_SENTINEL.txt'),'cache')}
    fs.writeFileSync(store.file('workspace','project','result.md'),'work product')
    const zip=portableZip(root,root)
    assert(zip.includes(Buffer.from('taoagent/home/workspace/project/result.md')))
    assert(!zip.includes(Buffer.from('CACHE_SENTINEL.txt')))
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('Pi emits failed tool lifecycle events when replaying cached failures',async()=>{
  const {root,store}=fixture(),statuses:string[]=[];let count=0
  const server=http.createServer(async(req,res)=>{for await(const part of req)void part;count++;const delta=count===1?{tool_calls:[{index:0,id:'cached',function:{name:'probe',arguments:'{}'}}]}:{content:'该工具失败了'};res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:count===1?'tool_calls':'stop'}]})+'\n\ndata: [DONE]\n\n')})
  try{
    const model=store.saveModel({name:'fixture',model:'mock',baseUrl:await listen(server)})
    await runPi(model,[{role:'user',content:'查看以前操作结果'}],new AbortController().signal,'failure',[{name:'probe',description:'probe',parameters:{type:'object',properties:{}}}],async()=>({historicalExecution:true,result:{exitCode:7,output:'failed'}}),()=>{},(_,status)=>statuses.push(status),()=>{})
    assert.deepEqual(statuses,['running','failed']);assert.equal(count,2)
  }finally{await close(server);fs.rmSync(root,{recursive:true,force:true})}
})
