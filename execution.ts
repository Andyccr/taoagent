import { cityConfig, saveCity } from './components.ts'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { McpClient, StdioTransport, StreamableHttpTransport } from '@earendil-works/pi-mcp'
import { Store, HttpError, json, atomic, string, object, id, readJsonSafe, runtimeLimits, fileSignature, staleLockDirectory } from './store.ts'
import { readSource, evolve, evolutionHistory, readEvolutionEvidence, rollbackEvolution, automaticCandidate, improvementSession } from './evolution.ts'

export interface Action { id: string; agentId: string; name: string; args: Record<string,unknown>; preview?: {name:string;version:string;notice:string}; sessionRevision?:string; automaticSessionId?:string; target?: Omit<Integration,'token'>; status: 'pending'|'approved'|'running'|'complete'|'failed'|'denied'|'uncertain'; at: string; result?: unknown }
export interface Integration { id: string; command?: string; args?: string[]; url?: string; token?: string }
const waiters = new Map<string,()=>void>()
const effects=new Map<string,Promise<void>>()
async function effectLock(key:string,signal:AbortSignal){
  const previous=effects.get(key)||Promise.resolve()
  let release!:()=>void
  const held=new Promise<void>(resolve=>{release=resolve}),tail=previous.then(()=>held)
  effects.set(key,tail)
  let abort!:()=>void
  try{await Promise.race([previous,new Promise<never>((_,reject)=>{abort=()=>reject(new HttpError(499,'已暂停'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()})])}
  catch(error){release();void tail.then(()=>{if(effects.get(key)===tail)effects.delete(key)});throw error}
  finally{signal.removeEventListener('abort',abort)}
  return ()=>{release();void tail.then(()=>{if(effects.get(key)===tail)effects.delete(key)})}
}
function durableEffectLock(store:Store){
  const directory=store.file('.tool-lock'),owner=path.join(directory,'owner.json')
  if(fs.existsSync(directory)){
    if(!staleLockDirectory(directory,owner))throw new HttpError(409,'另一个服务正在执行外部操作，请完成后重试；尚未执行本操作')
    if(fs.existsSync(owner))fs.unlinkSync(owner);fs.rmdirSync(directory)
  }
  try{fs.mkdirSync(directory)}catch{throw new HttpError(409,'另一个服务已取得外部操作锁，请稍后重试')}
  try{json(owner,{pid:process.pid})}catch(error){fs.rmdirSync(directory);throw error}
  return ()=>{fs.unlinkSync(owner);fs.rmdirSync(directory)}
}
function saveAction(store:Store,key:string,action:Action){
  const latest=actions(store,key),index=latest.findIndex(item=>item.id===action.id)
  if(index<0)latest.push(action);else latest[index]=action
  json(store.file('chats',key,'actions.json'),latest)
}
export function actions(store: Store,key: string): Action[] { return readJsonSafe<Action[]>(store.file('chats',key,'actions.json'),[]) }
export function decide(store: Store,key: string,actionId: string,approve: boolean) {
  const all = actions(store,key), action = all.find(item=>item.id===actionId)
  if (!action || !['pending','uncertain'].includes(action.status)) throw new HttpError(409,'此操作已处理，请刷新')
  action.status=approve?'approved':'denied'; saveAction(store,key,action); waiters.get(store.root+':'+key+':'+action.id)?.()
  return action
}
export function integrations(store: Store): Integration[] { return readJsonSafe<Integration[]>(store.file('integrations.json'),[]) }
export function saveIntegrations(store: Store,value: unknown) {
  if (!Array.isArray(value) || value.length>20) throw new HttpError(400,'最多配置 20 个 MCP 服务')
  const old=integrations(store)
  const result: Integration[]=value.map(raw=>{
    const item=object(raw), key=id(string(item.id)), url=string(item.url), command=string(item.command)
    if (url) { const parsed=new URL(url); if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password) throw new HttpError(400,'MCP 地址应为 HTTP(S)，凭据请填令牌'); }
    if (!url&&!command || item.args!==undefined&&(!Array.isArray(item.args)||item.args.some(arg=>typeof arg!=='string'))) throw new HttpError(400,'MCP 需要地址或命令，参数须为字符串数组')
    return {id:key,...(url?{url}:{command,args:item.args as string[]||[]}),token:string(item.token)||old.find(server=>server.id===key)?.token||''}
  })
  if(new Set(result.map(item=>item.id)).size!==result.length) throw new HttpError(400,'MCP ID 不能重复')
  json(store.file('integrations.json'),result)
}
export function redact(store: Store,value: string) {
  return redactText(value,credentialValues(store))
}
export function createRedactor(store: Store) {
  const secrets = credentialValues(store)
  return (value: string) => redactText(value, secrets)
}
function redactText(value:string,secrets:string[]) {
  const matches:{start:number;end:number}[]=[]
  for(const secret of secrets){let start=value.indexOf(secret);while(start>=0){matches.push({start,end:start+secret.length});start=value.indexOf(secret,start+1)}}
  matches.sort((a,b)=>a.start-b.start||b.end-a.end)
  const merged:{start:number;end:number}[]=[]
  for(const match of matches){const last=merged.at(-1);if(last&&match.start<=last.end)last.end=Math.max(last.end,match.end);else merged.push({...match})}
  let output='',cursor=0
  for(const match of merged){output+=value.slice(cursor,match.start)+'[已隐藏凭据]';cursor=match.end}
  return output+value.slice(cursor)
}
// Redaction runs for every streamed chunk; reread credential files only when one of them changes.
const credentialCache=new Map<string,{signature:string;values:string[]}>()
function credentialValues(store: Store) {
  const signature=['models.json','provider-keys.json','integrations.json'].map(name=>fileSignature(store.file(name))).join('|'),cached=credentialCache.get(store.root)
  if(cached?.signature===signature)return [...cached.values]
  const values=readCredentialValues(store);credentialCache.set(store.root,{signature,values});return [...values]
}
function readCredentialValues(store: Store) {
  return [...new Set([...store.models().map(model=>model.apiKey),...Object.values(store.providerKeys()),...integrations(store).map(item=>item.token||'')].filter(secret=>secret.length>=6))].sort((a,b)=>b.length-a.length)
}
// Hold enough trailing characters to recognize credentials split across output chunks.
export function streamRedactor(store: Store, emit: (text: string)=>void) {
  const secrets=credentialValues(store), tail=Math.max(0,...secrets.map(secret=>secret.length-1))
  let pending=''
  const flush=(final=false)=>{
    let cut=final?pending.length:Math.max(0,pending.length-tail)
    let previous:number
    do {previous=cut;for(const secret of secrets){let start=pending.indexOf(secret);while(start>=0&&start<cut){if(start+secret.length>cut){cut=start;break}start=pending.indexOf(secret,start+1)}}}while(cut!==previous)
    const safe=redactText(pending.slice(0,cut),secrets);pending=pending.slice(cut)
    if(safe)emit(safe)
  }
  return {write(text:string){pending+=text;flush()},end(){flush(true)}}
}
export function toolFailed(result: unknown): boolean {
  if(!result||typeof result!=='object'||Array.isArray(result))return false
  const value=result as Record<string,unknown>
  return value.isError===true || value.error!==undefined || ['failed','denied','uncertain'].includes(String(value.status)) || Object.hasOwn(value,'exitCode')&&value.exitCode!==0 || value.historicalExecution===true&&toolFailed(value.result)
}
function canonical(value: unknown): unknown { return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value }
export function workspace(store: Store,key: string) { const parent=store.file('workspace'), root=store.file('workspace',id(key));if(fs.existsSync(parent)&&fs.lstatSync(parent).isSymbolicLink())throw new HttpError(400,'工作目录父级不能是链接'); fs.mkdirSync(root,{recursive:true});if(fs.lstatSync(root).isSymbolicLink())throw new HttpError(400,'工作目录不能是链接');return root }
export function workspacePath(store: Store,key: string,raw: string) {
  const root=workspace(store,key), target=path.resolve(root,raw||'.'), rel=path.relative(root,target)
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw new HttpError(400,'文件必须位于本对话工作目录内')
  let current=root
  for(const part of rel.split(path.sep).filter(Boolean)) { current=path.join(current,part); if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new HttpError(400,'不允许通过链接访问其他目录') }
  if(fs.lstatSync(root).isSymbolicLink())throw new HttpError(400,'工作目录不能是链接')
  return target
}
async function processRun(command: string,args: string[],cwd: string,signal: AbortSignal,onOutput: (text: string)=>void,shell=false,timeoutMs=120000,env:NodeJS.ProcessEnv=process.env) {
  return await new Promise<{exitCode:number|null;output:string}>((resolve,reject)=>{
    const child=spawn(command,args,{cwd,shell,env,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']}), timer=setTimeout(()=>stop(),timeoutMs)
    let output='',stopped=false,forceKill:ReturnType<typeof setTimeout>|undefined
    function stop() {
      if(stopped)return
      stopped=true
      if(child.pid&&process.platform==='win32') {
        const killer=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/pid',String(child.pid),'/t','/f'],{windowsHide:true,stdio:'ignore'})
        killer.once('error',()=>child.kill('SIGTERM'))
        killer.once('exit',code=>{if(code!==0)child.kill('SIGTERM')})
      } else if(child.pid) {
        // POSIX: the child leads its own process group, so stop the shell and its descendants together.
        try{process.kill(-child.pid,'SIGTERM')}catch{child.kill('SIGTERM')}
        // A command that ignores SIGTERM must not hold the external-operation lock forever.
        const pid=child.pid;forceKill=setTimeout(()=>{try{process.kill(-pid,'SIGKILL')}catch{try{child.kill('SIGKILL')}catch{/* already gone */}}},5000);forceKill.unref()
      } else child.kill('SIGTERM')
    }
    signal.addEventListener('abort',stop,{once:true})
    const cleanup=()=>{clearTimeout(timer);clearTimeout(forceKill);signal.removeEventListener('abort',stop)}
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8')
    const receive=(text: string)=>{output+=text;if(output.length>256000){output=output.slice(0,256000);stop()} onOutput(text)}
    child.stdout.on('data',receive);child.stderr.on('data',receive)
    child.on('error',()=>{cleanup();reject(new HttpError(400,'无法启动命令，请确认对应 CLI 已安装并位于 PATH'))})
    child.on('close',code=>{cleanup();if(stopped)reject(new HttpError(signal.aborted?499:408,signal.aborted?'执行已暂停，副作用可能已发生，请检查工作目录':'执行达到时间或输出上限，副作用可能已发生'));else resolve({exitCode:code,output})})
    if(signal.aborted)stop()
  })
}
export async function executeExternal(store: Store,key: string,agentId: string,turnId: string,eventId: string,name: string,args: Record<string,unknown>,signal: AbortSignal,event: (value:Record<string,unknown>)=>void) {
  const originalSecrets=credentialValues(store),sanitize=(value:string)=>redactText(value,[...originalSecrets,...credentialValues(store)])
  if(name==='self_read')return readSource(string(args.path),undefined,args.offset===undefined?0:Number(args.offset))
  if(name==='self_history')return evolutionHistory(store).map(({validation,...record})=>({...record,checks:(validation as {checks?:{name:string;exitCode:number|null;durationMs:number}[]}|undefined)?.checks?.map(({name,exitCode,durationMs},index)=>({index,name,exitCode,durationMs}))}))
  if(name==='self_inspect')return JSON.parse(sanitize(JSON.stringify(readEvolutionEvidence(store,args)))) as unknown
  if(name==='read_file'){const file=workspacePath(store,key,string(args.path));if(fs.statSync(file).size>256000)throw new HttpError(400,'文件超过 256KB，请指定较小文件');return {text:redact(store,fs.readFileSync(file,'utf8'))}}
  if(name==='list_files'){return fs.readdirSync(workspacePath(store,key,string(args.path)),{withFileTypes:true}).slice(0,200).map(item=>({name:item.name,directory:item.isDirectory(),link:item.isSymbolicLink()}))}
  if(name==='list_mcp_servers')return integrations(store).map(({id,command,url})=>({id,transport:url?'http':'stdio',command,url:url?new URL(url).origin:undefined}))
  if(!['create_group','update_group','configure_city','create_agent','delete_agent','delete_group','self_rollback','self_evolve','write_file','shell','run_cli','mcp'].includes(name))throw new HttpError(400,'未知的操作，未执行')
  if(name==='create_agent'){
    if(!string(args.name).trim()||string(args.name).length>80||!string(args.rules).trim()||string(args.rules).length>80000)throw new HttpError(400,'请提供有效的名称和身份规则')
    if(args.joinGroup===true&&store.session(key).kind==='group'&&store.session(key).componentKind!=='city'&&store.groupMembers(key).length>=12)throw new HttpError(400,'本群成员已满')
  }
  const editedGroup=name==='update_group'?store.requireActiveSession(string(args.groupId)):undefined
  if(editedGroup&&(editedGroup.kind!=='group'||editedGroup.componentKind==='city'))throw new HttpError(400,'请通过 configure_city 管理 City')
  if(['create_group','update_group'].includes(name)&&(!Array.isArray(args.memberIds)||args.memberIds.some(value=>typeof value!=='string')))throw new HttpError(400,'需要成员 ID 数组')
  const deletion=name==='delete_agent'?store.agent(string(args.agentId)):undefined
  if(deletion&&(deletion.id==='main'||deletion.id===agentId))throw new HttpError(403,'不能删除主助手或发起操作的自己')
  if(deletion&&(!string(args.reason).trim()||string(args.reason).length>2000))throw new HttpError(400,'请填写移除原因')
  const deletionVersion=deletion?store.agentVersion(deletion.id):undefined
  const deletedGroup=name==='delete_group'?store.session(string(args.groupId)):undefined
  if(deletedGroup&&deletedGroup.kind!=='group')throw new HttpError(400,'只能删除群聊，不能删除私聊')
  if(deletedGroup&&(!string(args.reason).trim()||string(args.reason).length>2000))throw new HttpError(400,'请说明删除原因')
  const server=name==='mcp'?integrations(store).find(item=>item.id===string(args.serverId)):undefined
  if(name==='mcp'&&!server)throw new HttpError(400,'MCP 服务不存在，请在设置中添加')
  const serverVersion=server?crypto.createHash('sha256').update(JSON.stringify(canonical(server))).digest('hex'):undefined
  const identity:unknown[]=[turnId,eventId,agentId,name,canonical(args)]
  if(serverVersion)identity.push(serverVersion)
  const signature=crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0,32)
  let all=actions(store,key),action=all.find(item=>item.id===signature)
  if(action?.status==='complete'||action?.status==='failed')return {historicalExecution:true,status:action.status,result:action.result,notice:'这是已执行回执，不会自动重复副作用'}
  if(editedGroup&&args.expected!==editedGroup.updatedAt)throw new HttpError(409,'群设置已更新，请重新读取')
  if(name==='configure_city'&&args.expected!==cityConfig(store).revision)throw new HttpError(409,'City 配置已更新，请重新读取')
  const sessionRevision=store.requireActiveSession(key).lifecycleRevision
  if(action&&action.sessionRevision!==sessionRevision)throw new HttpError(409,'群聊已删除或恢复，旧操作审批失效，请重新提出请求')
  if(!action){const target=server?(({token,...target})=>target)(server):undefined;const preview=deletion?{name:deletion.name,version:deletionVersion!,notice:'从活动成员和群协作中移除；完整历史与记忆保留，可恢复。'}:deletedGroup?{name:deletedGroup.title,version:store.groupVersion(deletedGroup.id),notice:'删除该群聊并停止其后续执行，关联例行任务暂停；历史、记忆、文件与审批回执保留，可恢复。'}:undefined;action=JSON.parse(sanitize(JSON.stringify({id:signature,agentId,name,args,sessionRevision,...(preview?{preview}:{}),...(target?{target}:{}),status:'pending',at:new Date().toISOString()}))) as Action;all.push(action);json(store.file('chats',key,'actions.json'),all)}
  if(name==='self_evolve'&&action.status==='pending'&&automaticCandidate(store,key,args)){action.automaticSessionId=improvementSession(store,key)!.id;action.status='approved';saveAction(store,key,action)}
  if(action.status==='running'){action.status='uncertain';json(store.file('chats',key,'actions.json'),all)}
  while(['pending','uncertain'].includes(action.status)){
    event({type:'approval',action:JSON.parse(redact(store,JSON.stringify(action)))})
    await new Promise<void>((resolve,reject)=>{const waiterKey=store.root+':'+key+':'+signature,wake=()=>{signal.removeEventListener('abort',abort);waiters.delete(waiterKey);resolve()},abort=()=>{waiters.delete(waiterKey);reject(new HttpError(499,'已暂停，待审批操作保留'))};waiters.set(waiterKey,wake);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()})
    all=actions(store,key);action=all.find(item=>item.id===signature)!
  }
  if(action.status==='denied')throw new HttpError(403,'用户拒绝了此操作，请调整方案，不要换一种写法重复请求')
  if(signal.aborted)throw new HttpError(499,'已暂停')
  if(!store.groupMembers(key).includes(agentId))throw new HttpError(403,'成员已离群')
  const release=await effectLock(store.root,signal)
  if(signal.aborted){release();throw new HttpError(499,'已暂停')}
  let releaseDurable:(()=>void)|undefined
  try {
    releaseDurable=durableEffectLock(store)
    if(store.requireActiveSession(key).lifecycleRevision!==action.sessionRevision)throw new HttpError(409,'群聊生命周期已更改，旧审批不再执行')
    if(action.automaticSessionId){const session=improvementSession(store,key);if(session?.id!==action.automaticSessionId||session.status!=='active'||Date.now()>=session.expiresAt)throw new HttpError(403,'原自动改进授权已失效，不会重放')}
    if(!store.groupMembers(key).includes(agentId))throw new HttpError(403,'成员已离群')
    action.status='running';saveAction(store,key,action);event({type:'approval',action})
    let result:unknown
    if(name==='create_agent'){
      const childId='child-'+crypto.createHash('sha256').update(JSON.stringify([key,turnId,agentId,string(args.name).trim(),string(args.rules).trim()])).digest('hex').slice(0,24)
      if(!store.agents(true).some(child=>child.id===childId))store.saveAgent({id:childId,name:string(args.name).trim(),createdBy:agentId},string(args.rules).trim(),'')
      const child=store.requireActiveAgent(childId)
      if(args.joinGroup===true&&store.session(key).kind==='group')store.saveGroup(store.session(key).title,[...new Set([...store.groupMembers(key),childId])],key)
      result={agentId:childId,name:child.name,approved:true}
    }
    else if(name==='delete_agent'){
      if(!action.preview?.version)throw new HttpError(409,'删除审批缺少目标版本，请重新申请')
      const archived=store.archiveAgent(string(args.agentId),string(args.reason),agentId,action.preview.version)
      result={agentId:archived.id,name:archived.name,archivedAt:archived.archivedAt,historyPreserved:true,approved:true}
    }
    else if(name==='delete_group'){
      if(!action.preview?.version)throw new HttpError(409,'删除群聊审批缺少目标版本，请重新申请')
      const archived=store.archiveGroup(string(args.groupId),string(args.reason),agentId,action.preview.version)
      result={groupId:archived.id,title:archived.title,archivedAt:archived.archivedAt,historyPreserved:true,approved:true}
    }
    else if(name==='configure_city')result={...saveCity(store,args),approved:true}
    else if(name==='create_group'||name==='update_group'){
      const kind=args.componentKind
      if(kind!==undefined&&!['emergent','chat','task'].includes(String(kind)))throw new HttpError(400,'未知群组类型')
      const groupId=name==='update_group'?string(args.groupId):undefined
      if(groupId&&(store.isRunning(groupId)||groupId===key))throw new HttpError(409,'请在群组空闲时从其他对话修改')
      const members=[...new Set([...(name==='create_group'?[agentId]:[]),...args.memberIds as string[]])]
      const group=store.saveGroup(string(args.name),members,groupId,{componentKind:(kind??(name==='create_group'?(args.discussionMode==='directed'?'task':'emergent'):undefined)) as 'emergent'|'chat'|'task'|undefined,purpose:typeof args.purpose==='string'?args.purpose:undefined,coordinatorId:typeof args.coordinatorId==='string'?args.coordinatorId:undefined,replyMode:name==='create_group'?'collective':undefined,discussionMode:args.discussionMode==='brainstorm'?'brainstorm':args.discussionMode==='open'?'open':args.discussionMode==='directed'?'directed':undefined,memberRoles:args.memberRoles===undefined?undefined:object(args.memberRoles) as Record<string,string>,runtimeLimits:args.runtimeLimits===undefined?undefined:runtimeLimits(args.runtimeLimits)},name==='create_group'?'group-'+signature:undefined,groupId?string(args.expected):undefined)
      result={...group,groupId:group.id,approved:true}
    }
    else if(name==='self_rollback')result=rollbackEvolution(store,string(args.runId))
    else if(name==='self_evolve') {
      result=await evolve(store,args,signal,async(cwd,checkSignal)=>{
        const stream=streamRedactor(store,text=>event({type:'tool_output',agentId,text}))
        const checks:{name:string;exitCode:number|null;durationMs:number;output:string}[]=[]
        const env:NodeJS.ProcessEnv={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,COMSPEC:process.env.COMSPEC,TEMP:path.join(cwd,'.tmp'),TMP:path.join(cwd,'.tmp'),HOME:path.join(cwd,'.home'),USERPROFILE:path.join(cwd,'.home'),TAOAGENT_HOME:path.join(cwd,'.home'),CI:'1'}
        fs.mkdirSync(env.TEMP!,{recursive:true});fs.mkdirSync(env.HOME!,{recursive:true})
        const check=async(parameters:string[])=>{const began=Date.now();const checked=await processRun(process.execPath,parameters,cwd,checkSignal,text=>stream.write(text),false,600000,env);checks.push({name:parameters.join(' '),...checked,output:sanitize(checked.output),durationMs:Date.now()-began});json(path.join(cwd,'..','validation.json'),{checks});return checked}
        try {
          const built=await check(['build.mjs'])
          if(built.exitCode!==0)throw new HttpError(400,'候选版本构建失败，请根据工具输出修正')
          const acceptance=args.acceptanceTests as string[]
          const acceptanceResult=await check(['--experimental-strip-types','--disable-warning=ExperimentalWarning','--test',...acceptance])
          if(acceptanceResult.exitCode!==0)throw new HttpError(400,'候选未通过预先指定的验收测试')
          // Build first so bundled HTTP tests exercise the candidate too.
          for(const parameters of [['--experimental-strip-types','--disable-warning=ExperimentalWarning','--test','--test-concurrency=4','tests/*.test.*']]){
            const checked=await check(parameters)
            if(checked.exitCode!==0)throw new HttpError(400,'候选版本构建或回归测试失败，请根据工具输出修正')
          }
          for(const name of fs.readdirSync(cwd).filter(name=>name.endsWith('.ts'))){
            const checked=await check(['--check','--experimental-strip-types',name])
            if(checked.exitCode!==0)throw new HttpError(400,'候选源码语法验证失败：'+name)
          }
          const checked=await check(['--check','public/client.js'])
          if(checked.exitCode!==0)throw new HttpError(400,'候选界面语法验证失败')
          return {checks}
        }finally{stream.end()}
      })
    }
    else if(name==='write_file') {const file=workspacePath(store,key,string(args.path)),text=string(args.content);if(text.length>200000)throw new HttpError(400,'文件内容过长');atomic(file,text);result={written:true,path:string(args.path),bytes:Buffer.byteLength(text)}}
    else if(name==='shell'||name==='run_cli'){
      const cli=string(args.cli),command=string(args.command),cliArgs=args.args
      if(name==='run_cli'&&(!['git','gh','opencode','codex'].includes(cli)||!Array.isArray(cliArgs)||cliArgs.some(arg=>typeof arg!=='string')))throw new HttpError(400,'CLI 仅支持 git/gh/opencode/codex，参数应为数组')
      if(name==='shell'&&(!command.trim()||command.length>12000))throw new HttpError(400,'Shell 命令不能为空或过长')
      const windowsCli=process.platform==='win32'&&name==='run_cli'
      const quoted=(value:string)=>"'"+value.replace(/'/g,"''")+"'"
      const executable=windowsCli?'powershell.exe':name==='shell'?command:cli
      const parameters=windowsCli?['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',`$ErrorActionPreference = 'Stop'; & ${[cli,...cliArgs as string[]].map(quoted).join(' ')}; if ($LASTEXITCODE) { exit $LASTEXITCODE }`]:name==='shell'?[]:cliArgs as string[]
      const outputStream=streamRedactor(store,text=>event({type:'tool_output',agentId,text}))
      let output:Awaited<ReturnType<typeof processRun>>
      try{output=await processRun(executable,parameters,workspacePath(store,key,string(args.cwd)),signal,text=>outputStream.write(text),name==='shell')}finally{outputStream.end()}
      result={...output,output:sanitize(output.output)}
      if(output.exitCode!==0){action.status='failed';action.result=result;saveAction(store,key,action);return result}
    } else if(name==='mcp'){
      const current=integrations(store).find(item=>item.id===string(args.serverId))
      if(!server||!current||crypto.createHash('sha256').update(JSON.stringify(canonical(current))).digest('hex')!==serverVersion)throw new HttpError(409,'MCP 配置在审批期间已变化，未执行，请按新配置重新申请')
      const transport=server.url?new StreamableHttpTransport({url:server.url,headers:server.token?{Authorization:'Bearer '+server.token}:{}}):new StdioTransport({command:server.command!,args:server.args||[]})
      const client=new McpClient({name:'taoagent',version:'3.0.0',roots:[{uri:pathToFileURL(workspace(store,key)).href,name:'workspace'}]})
      const abort=()=>{client.close().catch(()=>{})};signal.addEventListener('abort',abort,{once:true})
      try {if(signal.aborted)throw new HttpError(499,'已暂停');await client.connect(transport);result=args.tool?await client.callTool(string(args.tool),args.arguments===undefined?{}:object(args.arguments),{signal}):await client.listTools({signal})}finally{signal.removeEventListener('abort',abort);await client.close().catch(()=>{})}
    } else throw new HttpError(400,'工具不存在')
    action.result=JSON.parse(sanitize(JSON.stringify(result)));action.status=toolFailed(result)?'failed':'complete';saveAction(store,key,action);event({type:'approval',action});return action.result
  }catch(error){action.status=signal.aborted || error instanceof HttpError&&error.status===408 ?'uncertain':'failed';action.result={error:error instanceof HttpError?error.message:'执行失败，不能确认成功'};saveAction(store,key,action);event({type:'approval',action});throw error}finally{try{releaseDurable?.()}finally{release()}}
}
