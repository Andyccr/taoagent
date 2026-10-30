import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import http from 'node:http'
import {spawn,spawnSync} from 'node:child_process'
import {once} from 'node:events'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'
import assert from 'node:assert/strict'

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),archive=path.resolve(process.argv[2]||'')
if(!process.argv[2]||!fs.statSync(archive).isFile())throw new Error('Pass a Windows release ZIP to verify.')
fs.mkdirSync(path.join(root,'.test-tmp'),{recursive:true})
const target=fs.mkdtempSync(path.join(root,'.test-tmp','Windows 独立运行 ')),quote=text=>"'"+text.replaceAll("'","''")+"'"
const extracted=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath '+quote(archive)+' -DestinationPath '+quote(target)],{encoding:'utf8',windowsHide:true})
if(extracted.status!==0)throw new Error('ZIP extraction failed: '+extracted.stderr)
const folder=path.join(target,'taoagent'),runtime=path.join(folder,'runtime/node.exe'),home=path.join(target,'verification-home'),checks=[]
const env={...process.env,TAOAGENT_HOME:home,TAOAGENT_NO_OPEN:'1',PORT:'0',PATH:path.join(process.env.SystemRoot||'C:\\Windows','System32')};delete env.NODE_OPTIONS;delete env.NODE_PATH
let executable,record,base,failed=false
const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const autonomous=raw.includes('独立思考阶段没有工具');const answer=autonomous?JSON.stringify({action:'share',thought:'独立观察完成，准备公开交流。',attention:'发布包实际运行',stance:'等待实际结果',contribution:'发布包自主日常实际发起讨论。',sourceIds:[]}):'Windows 发布包实际 HTTP 回复';res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:answer},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n')})
function run(args){const result=spawnSync(runtime,args,{cwd:folder,env,encoding:'utf8',windowsHide:true,timeout:30000});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);return result.stdout}
async function api(route,method='GET',body,headers={}){const response=await fetch(base+route,{method,headers:{...headers,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});assert(response.ok,'HTTP '+response.status+' '+route);return response}
try{
  assert(!fs.existsSync(path.join(folder,'node_modules')));assert(!fs.existsSync(path.join(folder,'.git')));checks.push('no-node_modules-or-git')
  const integrity=JSON.parse(run(['launcher.mjs','--check']));assert(integrity.verified);checks.push('distribution-sha256-and-runtime-licenses')
  executable=spawn(path.join(folder,'Taoagent.exe'),[],{cwd:target,env,windowsHide:true,stdio:'ignore'})
  executable.on('error',()=>{})
  for(let count=0;count<150;count++){try{record=JSON.parse(fs.readFileSync(path.join(home,'.launcher-lock/owner.json'),'utf8'));if(record.port){base='http://127.0.0.1:'+record.port;const health=await (await api('/api/health')).json();assert.equal(health.instanceId,record.instanceId);break}}catch{}await delay(100)}
  assert(base&&record?.port,'Windows .exe did not become ready');checks.push('native-exe-launch-from-unicode-path-without-system-node')
  const second=spawnSync(path.join(folder,'Taoagent.exe'),[],{cwd:target,env,windowsHide:true,timeout:20000});assert.equal(second.status,0)
  assert.equal(JSON.parse(fs.readFileSync(path.join(home,'.launcher-lock/owner.json'),'utf8')).instanceId,record.instanceId);checks.push('second-exe-launch-reuses-own-instance')
  const batch=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/c','call','Start Taoagent.cmd'],{cwd:folder,env,encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(batch.status,0,batch.stdout+'\n'+batch.stderr);checks.push('batch-launcher-reuses-existing-instance')
  const state=await (await api('/api/state')).json();assert.equal(state.version,integrity.version);checks.push('health-and-version')
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');const modelUrl='http://127.0.0.1:'+upstream.address().port
  const model=await (await api('/api/models','PUT',{name:'Windows 验收',model:'fixture',baseUrl:modelUrl,apiKey:'windows-release-fixture-secret'})).json()
  await api('/api/agents/main/model','PUT',{modelId:model.id});const thread=await (await api('/api/agents/main/thread')).json()
  const response=await api('/api/chats/'+thread.id+'/chat','POST',{content:'验证独立发布包',requestId:crypto.randomUUID()}),stream=await response.text();assert(stream.includes('Windows 发布包实际 HTTP 回复'));assert(stream.includes('"type":"done"'));assert(!stream.includes('windows-release-fixture-secret'));checks.push('actual-http-stream-from-packaged-runtime')
  const queued=await (await api('/api/chats/'+thread.id+'/queue','POST',{content:'验证发布包持久消息队列',requestId:crypto.randomUUID()})).json();let complete=false
  for(let count=0;count<60;count++){const queue=await (await api('/api/chats/'+thread.id+'/queue')).json();if(queue.items.some(item=>item.id===queued.id&&item.status==='complete')){complete=true;break}await delay(100)}assert(complete,'Packaged queue did not complete');checks.push('packaged-durable-queue-execution')
  const html=await (await api('/')).text();assert(html.includes('busy-send-mode'));assert(html.includes('message-queue'));checks.push('packaged-ui-assets');const square=await (await api('/square.js')).text();assert(square.includes('mountSquare'));checks.push('packaged-public-square-module')
  assert(html.includes('town-open'));assert((await (await api('/town.js')).text()).includes('town-view'))
  const space=await (await api('/api/town/create','POST',{name:'发布包日常验收',memberIds:['main']})).json()
  let life=await (await api('/api/town/'+space.id)).json()
  await api('/api/town/'+space.id+'/member','PUT',{agentId:'main',interests:'便携独立经历',attention:'验证真实后台执行'})
  life=await (await api('/api/town/'+space.id)).json()
  await api('/api/town/'+space.id+'/policy','PUT',{expected:life.revision,enabled:true,quietStart:0,quietEnd:0,dailyCalls:10,dailyTokens:1000000,episodeCalls:4})
  await api('/api/town/'+space.id+'/wake','POST',{agentId:'main'})
  let dailyComplete=false
  for(let count=0;count<80;count++){life=await (await api('/api/town/'+space.id)).json();if(life.runs.some(item=>item.status==='complete')){dailyComplete=true;break}await delay(100)}
  assert(dailyComplete,'Packaged independent life did not complete');assert(life.entries.some(item=>item.kind==='reflection'));assert(life.entries.some(item=>item.kind==='contribution'));assert(life.today.calls>=2)
  const townChat=await (await api('/api/chats/'+space.id)).json();assert(!townChat.messages.some(item=>item.role==='user'));assert(townChat.messages.some(item=>!item.kind&&item.role==='assistant'))
  await api('/api/town/'+space.id+'/pause','POST',{});assert(!(await (await api('/api/town/'+space.id)).json()).policy.enabled)
  const unified=await (await api('/api/town/'+space.id+'/memory')).json();assert(unified.personal.some(item=>item.kind==='episode'));assert(unified.common.items.length>0);assert(html.includes('space-switch'));assert(html.includes('space-memory-open'));checks.push('packaged-unified-memory-and-episode-continuity');
  const brief=await (await api('/api/town/'+space.id+'/brief')).json();assert(brief.graph.nodes.some(item=>item.kind==='episode'));assert(brief.graph.edges.some(item=>item.kind==='cites'));assert.equal(typeof brief.revision,'string');assert(html.includes('/product.css'));const productCss=await (await api('/product.css')).text();assert(productCss.includes('.space-kanban'));assert(productCss.includes('.space-graph-layout'));checks.push('packaged-space-brief-lineage-and-product-ui');
  checks.push('packaged-independent-life-real-model-loop-and-public-discussion','packaged-life-budget-no-fake-user-and-pause')
  const wrong=await fetch(base+'/api/launcher/stop',{method:'POST',headers:{'Content-Type':'application/json','X-Taoagent-Instance':'wrong'},body:'{}'});assert.equal(wrong.status,403);checks.push('stop-rejects-other-instance')
  const events=await api('/api/chats/'+thread.id+'/events'),eventReader=events.body.getReader();await eventReader.read()
  run(['launcher.mjs','--stop']);await Promise.race([once(executable,'exit'),delay(10000).then(()=>{throw new Error('Native launcher did not exit after stopping')})]);checks.push('graceful-native-launcher-stop')
  await eventReader.cancel();checks.push('graceful-stop-with-live-event-subscriber')
  const report={version:integrity.version,platform:'Windows x64',archive:path.basename(archive),sha256:crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),passed:true,checks,generatedAt:new Date().toISOString()}
  fs.writeFileSync(path.join(root,'artifacts',`Windows-verification-${integrity.version}${archive.includes('-clean')?'-clean':''}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))
}catch(error){failed=true;throw error}
finally{
  if(upstream.listening){upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve))}
  if(executable&&executable.exitCode===null){if(base&&record)try{await fetch(base+'/api/launcher/stop',{method:'POST',headers:{'Content-Type':'application/json','X-Taoagent-Instance':record.instanceId},body:'{}',signal:AbortSignal.timeout(5000)})}catch{};if(executable.exitCode===null)spawnSync('taskkill',['/PID',String(executable.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})}
  if(!path.resolve(target).startsWith(path.join(root,'.test-tmp')+path.sep))throw new Error('Refusing to remove a verification path outside .test-tmp')
  if(!failed)fs.rmSync(target,{recursive:true,force:true});else console.error('Verification files retained under .test-tmp for inspection.')
}
