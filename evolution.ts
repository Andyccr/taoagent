import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Store, HttpError, atomic, json, string, id } from './store.ts'
import { ROOT, sources } from './portable.ts'

// The verifier, approval boundary and tests cannot be rewritten by a candidate.
export const evolvable = ['public/workbench.js','public/workbench.css','public/sidebar.js','public/sidebar.css','components.ts','civilization.ts','public/civilization.js','public/civilization.css','public/components.css','public/product.css','public/town.js','public/town.css','public/square.js','public/city-entry.js','build-city.mjs',...(fs.existsSync(path.join(ROOT,'public','city'))?fs.readdirSync(path.join(ROOT,'public','city')):[]).filter(name=>name.endsWith('.js')).map(name=>'public/city/'+name),'context.ts','audience.ts','communication.ts','reasoning.ts','defaults.ts','public/client.js','public/index.html','public/style.css','app.ts','runtime.ts','store.ts','pi.ts','models.ts','opencode-go.ts','portable.ts','migrate.ts']
const protectedReadableFiles=['execution.ts','evolution.ts','build.mjs','package.json','package-lock.json','README.md','AGENTS.md','CLAUDE.md']
const testPath=(name:string)=>/^tests\/[a-zA-Z0-9_-]+\.test\.(ts|mjs)$/.test(name)
const digest=(text:string)=>crypto.createHash('sha256').update(text).digest('hex')
function fingerprint(root:string) {
  const hash=crypto.createHash('sha256')
  const visit=(name:string)=>{
    const file=path.join(root,name)
    if(!fs.existsSync(file))return
    const stat=fs.lstatSync(file)
    if(stat.isSymbolicLink())throw new HttpError(400,'程序目录不接受链接')
    if(stat.isDirectory()){for(const child of fs.readdirSync(file).sort())visit(name+'/'+child)}
    else {hash.update(name);hash.update(fs.readFileSync(file))}
  }
  for(const name of sources.filter(name=>name!=='runtime'))visit(name)
  return hash.digest('hex')
}
function source(root:string,name:string,readOnly=false) {
  if(!evolvable.includes(name)&&!(readOnly&&(protectedReadableFiles.includes(name)||testPath(name))))throw new HttpError(400,'此路径不属于可进化源码')
  let current=root
  for(const part of name.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw new HttpError(400,'源码不能是链接')}
  return current
}
export function readSource(name:string,root=ROOT,offset=0) {
  if(!name)return {files:evolvable,protectedReadableFiles,acceptanceTests:fs.existsSync(path.join(root,'tests'))?fs.readdirSync(path.join(root,'tests')).map(name=>'tests/'+name).filter(testPath).sort():[],maxChangedFiles:evolvable.length,workflow:'读取完整源码和 sha256 → 读取相关验收测试 → self_evolve 提交完整文件 → 审批或范围授权后构建、验收和回归，通过才应用。失败用 self_inspect 分页读取日志和候选源码，修正后重新提交。重启后生效；不可将应用等同于运行版本已更新。'}
  const content=fs.readFileSync(source(root,name,true),'utf8')
  if(!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'offset必须为非负整数')
  return {path:name,content:content.slice(offset,offset+6000),sha256:digest(content),offset,nextOffset:offset+6000<content.length?offset+6000:null,totalChars:content.length}
}
// Bounded file copies avoid serial per-file latency while keeping preparation cancellable.
async function copyProgramTree(from:string,to:string,signal:AbortSignal){
  const files:{from:string;to:string}[]=[]
  const scan=async(source:string,target:string)=>{
    if(signal.aborted)throw new HttpError(499,'已暂停')
    const stat=await fs.promises.lstat(source)
    if(stat.isSymbolicLink())throw new HttpError(400,'验证目录不接受链接')
    if(stat.isDirectory()){
      await fs.promises.mkdir(target,{recursive:true})
      for(const entry of await fs.promises.readdir(source))await scan(path.join(source,entry),path.join(target,entry))
    }else if(stat.isFile())files.push({from:source,to:target})
  }
  await scan(from,to)
  let cursor=0,failure:unknown
  const copy=async()=>{
    try{while(cursor<files.length&&!failure){if(signal.aborted)throw new HttpError(499,'已暂停');const file=files[cursor++];if((await fs.promises.lstat(file.from)).isSymbolicLink())throw new HttpError(400,'验证目录不接受链接');await fs.promises.copyFile(file.from,file.to)}}catch(error){failure=error}
  }
  await Promise.all(Array.from({length:Math.min(8,files.length)},copy))
  if(failure)throw failure
  if(signal.aborted)throw new HttpError(499,'已暂停')
}
export interface ValidationEvidence {checks:{name:string;exitCode:number|null;durationMs:number;output:string}[]}
type Verify=(cwd:string,signal:AbortSignal)=>Promise<void|ValidationEvidence>
const busy=new Set<string>()
export async function evolve(store:Store,args:Record<string,unknown>,signal:AbortSignal,verify:Verify,root=ROOT) {
  const reason=string(args.reason), expectedBenefit=string(args.expectedBenefit), acceptanceCriteria=string(args.acceptanceCriteria)
  if(!expectedBenefit.trim()||!acceptanceCriteria.trim()||expectedBenefit.length>4000||acceptanceCriteria.length>8000)throw new HttpError(400,'提交前必须定义预期收益和验收标准')
  if(!reason.trim()||reason.length>4000||!Array.isArray(args.changes)||!args.changes.length||args.changes.length>evolvable.length)throw new HttpError(400,'需要修改理由和1–'+evolvable.length+'个文件')
  const acceptanceTests=args.acceptanceTests
  if(!Array.isArray(acceptanceTests)||!acceptanceTests.length||acceptanceTests.length>8||acceptanceTests.some(name=>typeof name!=='string'||!/^tests\/[a-zA-Z0-9_-]+\.test\.(ts|mjs)$/.test(name)||!fs.existsSync(path.join(root,name))))throw new HttpError(400,'需要1–8个已存在的受保护验收测试文件')
  const changes=args.changes.map(raw=>{
    if(!raw||typeof raw!=='object')throw new HttpError(400,'无效修改')
    const value=raw as Record<string,unknown>,name=string(value.path),file=source(root,name)
    let content:string
    if(value.edits!==undefined){
      if(value.content!==undefined||!Array.isArray(value.edits)||!value.edits.length||value.edits.length>32)throw new HttpError(400,'请选择完整content或1–32个精确edits，不能混用')
      content=fs.readFileSync(file,'utf8')
      if(digest(content)!==string(value.sha256))throw new HttpError(409,'源码已变化，请重新读取：'+name)
      for(const rawEdit of value.edits){
        if(!rawEdit||typeof rawEdit!=='object')throw new HttpError(400,'无效源码编辑')
        const edit=rawEdit as Record<string,unknown>
        if(typeof edit.before!=='string'||!edit.before.length||typeof edit.after!=='string')throw new HttpError(400,'编辑需要非空before和字符串after')
        const index=content.indexOf(edit.before)
        if(index<0||content.indexOf(edit.before,index+1)>=0)throw new HttpError(409,'编辑片段必须唯一匹配，请读取更多上下文：'+name)
        content=content.slice(0,index)+edit.after+content.slice(index+edit.before.length)
        if(content.length>200000)throw new HttpError(400,'文件过大')
      }
    }else{
      if(typeof value.content!=='string')throw new HttpError(400,'需要完整content或精确edits')
      content=value.content
    }
    const change={path:name,content,sha256:string(value.sha256)}
    if(change.content.length>200000)throw new HttpError(400,'文件过大')
    source(root,change.path);return change
  })
  if(new Set(changes.map(c=>c.path)).size!==changes.length)throw new HttpError(400,'重复文件')
  if(busy.has(root))throw new HttpError(409,'已有进化任务在验证')
  busy.add(root)
  const runId=crypto.randomUUID(),record=store.file('evolution',runId,'record.json'),candidate=store.file('evolution',runId,'candidate')
  const originals:Record<string,string>={}
  const check=()=>{for(const c of changes)if(digest(fs.readFileSync(source(root,c.path),'utf8'))!==c.sha256)throw new HttpError(409,'源码已变化，请重新读取：'+c.path)}
  const at=new Date().toISOString()
  let validation:void|ValidationEvidence=undefined, baselineHash='', applied=false
  const lock=store.file('evolution','.lock'),sourceLock=path.join(root,'.evolution-lock')
  let locked=false,sourceLocked=false
  try {
    try{fs.mkdirSync(sourceLock);sourceLocked=true;json(path.join(sourceLock,'owner.json'),{pid:process.pid,runId})}catch{throw new HttpError(409,'源码进化锁存在，请检查中断版本记录')}
    fs.mkdirSync(path.dirname(lock),{recursive:true})
    try{fs.mkdirSync(lock);locked=true}catch{throw new HttpError(409,'进化锁存在；如进程曾中断，请先检查 evolution 中的恢复记录')}
    check()
    const baseline=fingerprint(root);baselineHash=baseline
    for(const c of changes)originals[c.path]=fs.readFileSync(source(root,c.path),'utf8')
    if(changes.every(c=>c.content===originals[c.path]))throw new HttpError(400,'候选没有实际源码变化，请先定位问题再提交')
    json(record,{runId,reason,expectedBenefit,acceptanceCriteria,acceptanceTests,status:'validating',changes,originals,at,baselineHash})
    fs.mkdirSync(candidate,{recursive:true})
    if(signal.aborted)throw new HttpError(499,'已暂停')
    // Copy asynchronously so stop/expiry can interrupt preparation; never copy personal home data.
    for(const entry of [...sources, 'node_modules']){
      if(!fs.existsSync(path.join(root,entry)))continue
      await copyProgramTree(path.join(root,entry),path.join(candidate,entry),signal)
    }
    for(const c of changes)atomic(path.join(candidate,c.path),c.content)
    if(signal.aborted)throw new HttpError(499,'已暂停')
    const protectedFiles=sources.filter(name=>!['release','runtime'].includes(name)&&!changes.some(change=>change.path===name))
    const protectedHash=()=>{const hash=crypto.createHash('sha256');for(const name of protectedFiles){const visit=(file:string)=>{if(!fs.existsSync(file))return;const stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw new HttpError(400,'验证文件不能是链接');if(stat.isDirectory()){for(const child of fs.readdirSync(file).sort())visit(path.join(file,child))}else if(path.relative(candidate,file).replaceAll(path.sep,'/')!=='public/city.bundle.js')hash.update(path.relative(candidate,file)).update(fs.readFileSync(file))};visit(path.join(candidate,name))}return hash.digest('hex')}
    const beforeValidation=protectedHash()
    validation=await verify(candidate,signal)
    if(beforeValidation!==protectedHash())throw new HttpError(409,'候选验证期间修改了受保护验证文件')
    for(const change of changes)if(fs.readFileSync(path.join(candidate,change.path),'utf8')!==change.content)throw new HttpError(409,'候选源码在验证期间变化')
    if(signal.aborted)throw new HttpError(499,'已暂停')
    check()
    if(fingerprint(root)!==baseline)throw new HttpError(409,'验证期间程序文件已变化，请重新生成候选版本')
    // Persist the recovery journal before touching installed files.
    const outputs:Record<string,string>={...Object.fromEntries(changes.map(c=>[c.path,c.content]))}
    for(const name of ['server.mjs','build.json']){
      const relative='release/'+name
      originals[relative]=fs.readFileSync(path.join(root,relative),'utf8')
      outputs[relative]=fs.readFileSync(path.join(candidate,relative),'utf8')
    }
    // Deploy the renderer produced by the validated City source, together with its recovery copy.
    const cityBundle='public/city.bundle.js'
    if(fs.existsSync(path.join(root,cityBundle))&&fs.existsSync(path.join(candidate,cityBundle))){
      originals[cityBundle]=fs.readFileSync(path.join(root,cityBundle),'utf8')
      outputs[cityBundle]=fs.readFileSync(path.join(candidate,cityBundle),'utf8')
    }
    const manifestFile=path.join(root,'windows-release.json')
    if(fs.existsSync(manifestFile)){
      originals['windows-release.json']=fs.readFileSync(manifestFile,'utf8')
      const manifest=JSON.parse(originals['windows-release.json']) as {files:{path:string;bytes:number;sha256:string}[]}
      for(const [name,content] of Object.entries(outputs)){
        const bytes=Buffer.from(content),entry=manifest.files.find(item=>item.path===name)
        if(entry){entry.bytes=bytes.length;entry.sha256=digest(content)}
      }
      outputs['windows-release.json']=JSON.stringify(manifest,null,2)+'\n'
    }
    json(record,{runId,reason,expectedBenefit,acceptanceCriteria,acceptanceTests,at,baselineHash,validation,status:'applying',changes,originals,outputs})
    applied=true
    for(const [name,content] of Object.entries(outputs))atomic(path.join(root,name),content)
    json(record,{runId,reason,expectedBenefit,acceptanceCriteria,acceptanceTests,at,baselineHash,validation,status:'applied',changes,originals,outputs,restartRequired:true,improvement:'requires task-relevant evidence; regression success alone is compatibility'})
    return {runId,status:'applied',files:changes.map(c=>c.path),restartRequired:true,notice:'测试和构建通过；重启服务后加载新版本。通过测试不等于能力必然提升。'}
  } catch(error) {
    if(applied)for(const [name,content] of Object.entries(originals))atomic(path.join(root,name),content)
    json(record,{runId,reason,expectedBenefit,acceptanceCriteria,acceptanceTests,at,baselineHash,validation:validation||(fs.existsSync(path.join(candidate,'..','validation.json'))?JSON.parse(fs.readFileSync(path.join(candidate,'..','validation.json'),'utf8')):undefined),changes,status:applied?'rolled_back':'failed',originals,error:error instanceof Error?error.message:'验证失败'})
    throw error
  } finally {busy.delete(root);if(locked)fs.rmdirSync(lock);if(sourceLocked){const owner=path.join(sourceLock,'owner.json');if(fs.existsSync(owner))fs.unlinkSync(owner);fs.rmdirSync(sourceLock)}}
}

export function evolutionHistory(store:Store) {
  const directory=store.file('evolution')
  if(!fs.existsSync(directory))return []
  return fs.readdirSync(directory).filter(name=>name!=='.lock').flatMap(name=>{
    const file=path.join(directory,name,'record.json')
    if(!fs.existsSync(file))return []
    const record=JSON.parse(fs.readFileSync(file,'utf8')) as Record<string,unknown>
    return [{runId:name,status:record.status,reason:record.reason,error:record.error,expectedBenefit:record.expectedBenefit,acceptanceCriteria:record.acceptanceCriteria,acceptanceTests:record.acceptanceTests,validation:record.validation,at:record.at}]
  })
}

// Read the journal rather than executable candidate files: failed validation may
// have modified its working tree. Keep every output page reachable by offset.
export function readEvolutionEvidence(store:Store,args:Record<string,unknown>) {
  const runId=id(string(args.runId)),file=store.file('evolution',runId,'record.json')
  if(!fs.existsSync(file))throw new HttpError(404,'进化记录不存在')
  if(fs.lstatSync(file).isSymbolicLink()||fs.lstatSync(path.dirname(file)).isSymbolicLink())throw new HttpError(400,'进化记录不能是链接')
  const record=JSON.parse(fs.readFileSync(file,'utf8')) as {status:string;reason:string;error?:string;restartRequired?:boolean;changes?:{path:string;content:string}[];validation?:ValidationEvidence}
  const checks=record.validation?.checks||[],offset=args.offset===undefined?0:Number(args.offset)
  if(!Number.isSafeInteger(offset)||offset<0)throw new HttpError(400,'offset必须为非负整数')
  let content:string|undefined
  if(args.path!==undefined){
    const change=record.changes?.find(change=>change.path===string(args.path))
    if(!change)throw new HttpError(404,'该版本没有此候选文件')
    content=change.content
  }else if(args.checkIndex!==undefined){
    const index=Number(args.checkIndex)
    if(!Number.isSafeInteger(index)||index<0||index>=checks.length)throw new HttpError(400,'无效验证步骤')
    content=checks[index].output
  }
  return {runId,status:record.status,reason:record.reason,error:record.error,restartRequired:record.restartRequired,files:record.changes?.map(change=>change.path)||[],checks:checks.map(({output,...check},index)=>({...check,index,totalChars:output.length})),...(content===undefined?{}:{content:content.slice(offset,offset+6000),offset,nextOffset:offset+6000<content.length?offset+6000:null,totalChars:content.length})}
}

export function rollbackEvolution(store:Store,runId:string,root=ROOT) {
  if(busy.has(root)||fs.existsSync(store.file('evolution','.lock')))throw new HttpError(409,'进化任务正在执行或需要检查中断记录')
  const sourceLock=path.join(root,'.evolution-lock'),owner=path.join(sourceLock,'owner.json')
  try{fs.mkdirSync(sourceLock)}catch{throw new HttpError(409,'源码进化锁存在，请先检查中断记录')}
  try{
    json(owner,{pid:process.pid,runId})
    const file=store.file('evolution',id(runId),'record.json')
    const record=JSON.parse(fs.readFileSync(file,'utf8')) as {status:string;originals:Record<string,string>;outputs:Record<string,string>}
    if(record.status!=='applied')throw new HttpError(409,'只能回滚已成功应用的版本')
    for(const [name,output] of Object.entries(record.outputs)){
      if(!evolvable.includes(name)&&!['public/city.bundle.js','windows-release.json','release/server.mjs','release/build.json'].includes(name))throw new HttpError(400,'无效恢复路径')
      let current=root
      for(const part of name.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw new HttpError(400,'恢复路径不能为链接')}
      if(fs.readFileSync(current,'utf8')!==output)throw new HttpError(409,'版本之后已有修改，不能覆盖：'+name)
    }
    json(file,{...record,status:'recovering'})
    for(const name of Object.keys(record.outputs))atomic(path.join(root,name),record.originals[name])
    json(file,{...record,status:'rolled_back'})
    return {status:'rolled_back',runId,restartRequired:true}
  }finally{if(fs.existsSync(owner))fs.unlinkSync(owner);fs.rmdirSync(sourceLock)}
}

export interface ImprovementSession {
  id:string;status:'active'|'stopped'|'exhausted';scope:string[];objective:string;acceptanceCriteria:string;acceptanceTests:string[];
  maxIterations:number;maxModelCalls:number;maxToolCalls:number;maxTokens:number;expiresAt:number;
  iterations:number;modelCalls:number;toolCalls:number;reservedTokens:number;at:string
}
export function improvementSession(store:Store,key:string):ImprovementSession|undefined {const text=store.text('chats',id(key),'improvement.json');return text?JSON.parse(text) as ImprovementSession:undefined}
export function authorizeImprovement(store:Store,key:string,args:Record<string,unknown>){
  store.session(key)
  if(improvementSession(store,key)?.status==='active')throw new HttpError(409,'请先停止当前改进授权')
  if(!Array.isArray(args.scope)||!args.scope.length||args.scope.some(name=>typeof name!=='string'||!evolvable.includes(name)))throw new HttpError(400,'请选择允许修改的源码范围')
  const bounded=(name:string,max:number)=>{const value=Number(args[name]);if(!Number.isSafeInteger(value)||value<1||value>max)throw new HttpError(400,'无效预算：'+name);return value}
  const objective=string(args.objective),acceptanceCriteria=string(args.acceptanceCriteria)
  if(!objective.trim()||!acceptanceCriteria.trim()||objective.length>4000||acceptanceCriteria.length>8000)throw new HttpError(400,'需要目标和验收标准')
  if(!Array.isArray(args.acceptanceTests)||!args.acceptanceTests.length||args.acceptanceTests.length>8||args.acceptanceTests.some(name=>typeof name!=='string'||!/^tests\/[a-zA-Z0-9_-]+\.test\.(ts|mjs)$/.test(name)||!fs.existsSync(path.join(ROOT,name))))throw new HttpError(400,'请选择已存在的受保护验收测试文件')
  const session:ImprovementSession={id:crypto.randomUUID(),status:'active',scope:[...new Set(args.scope as string[])],objective,acceptanceCriteria,acceptanceTests:args.acceptanceTests as string[],maxIterations:bounded('maxIterations',10),maxModelCalls:bounded('maxModelCalls',200),maxToolCalls:bounded('maxToolCalls',500),maxTokens:bounded('maxTokens',2000000),expiresAt:Date.now()+bounded('maxMinutes',120)*60000,iterations:0,modelCalls:0,toolCalls:0,reservedTokens:0,at:new Date().toISOString()}
  json(store.file('chats',key,'improvement.json'),session);return session
}
export function stopImprovement(store:Store,key:string){const session=improvementSession(store,key);if(session){session.status='stopped';json(store.file('chats',key,'improvement.json'),session)}return session}
export function spendImprovement(store:Store,key:string,kind:'modelCalls'|'toolCalls'|'iterations',tokens=0){
  const session=improvementSession(store,key);if(!session)return
  const max=kind==='iterations'?session.maxIterations:kind==='modelCalls'?session.maxModelCalls:session.maxToolCalls
  if(session.status!=='active'||Date.now()>=session.expiresAt||session[kind]>=max||session.reservedTokens+tokens>session.maxTokens){session.status='exhausted';json(store.file('chats',key,'improvement.json'),session);throw new HttpError(409,'自动改进授权已停止、到期或达到累计预算')}
  session[kind]++;session.reservedTokens+=tokens;json(store.file('chats',key,'improvement.json'),session)
}
export function automaticCandidate(store:Store,key:string,args:Record<string,unknown>){
  const session=improvementSession(store,key)
  if(!session||session.status!=='active')return false
  if(!Array.isArray(args.changes)||!args.changes.length||args.changes.some(raw=>!raw||typeof raw!=='object'||!session.scope.includes(string((raw as Record<string,unknown>).path))))throw new HttpError(403,'候选修改超出用户授权范围')
  if(string(args.acceptanceCriteria)!==session.acceptanceCriteria||JSON.stringify(args.acceptanceTests)!==JSON.stringify(session.acceptanceTests))throw new HttpError(403,'候选不能改变用户的验收标准')
  spendImprovement(store,key,'iterations');return true
}

// Explicit recovery only; do not guess whether an external operation already happened.
export function recoverEvolution(store:Store,runId:string,root=ROOT){
  if(busy.has(root))throw new HttpError(409,'进化任务仍在运行')
  const sourceLock=path.join(root,'.evolution-lock'),ownerFile=path.join(sourceLock,'owner.json')
  if(fs.existsSync(ownerFile)){
    const owner=JSON.parse(fs.readFileSync(ownerFile,'utf8')) as {pid:number;runId:string}
    if(owner.runId!==runId)throw new HttpError(409,'进化锁属于其他版本')
    let alive=true;try{process.kill(owner.pid,0)}catch(error){alive=(error as NodeJS.ErrnoException).code!=='ESRCH'}
    if(alive)throw new HttpError(409,'进化锁所属进程仍在运行，不能恢复')
  }
  const file=store.file('evolution',id(runId),'record.json')
  const record=JSON.parse(fs.readFileSync(file,'utf8')) as {status:string;originals:Record<string,string>;outputs?:Record<string,string>}
  if(!['applying','recovering','validating','applied','rolled_back'].includes(record.status))throw new HttpError(409,'此版本不需要恢复')
  const allowed=[...evolvable,'public/city.bundle.js','windows-release.json','release/server.mjs','release/build.json']
  for(const [name,original] of Object.entries(record.originals)){
    if(!allowed.includes(name))throw new HttpError(400,'无效恢复路径')
    const target=path.join(root,name);if(fs.lstatSync(target).isSymbolicLink())throw new HttpError(400,'恢复路径不能为链接')
    const content=fs.readFileSync(target,'utf8');if(content!==original&&content!==record.outputs?.[name])throw new HttpError(409,'恢复遇到外部修改：'+name)
  }
  if(record.status==='applied'||record.status==='rolled_back'){if(fs.existsSync(ownerFile))fs.unlinkSync(ownerFile);if(fs.existsSync(sourceLock))fs.rmdirSync(sourceLock);const lock=store.file('evolution','.lock');if(fs.existsSync(lock))fs.rmdirSync(lock);return {status:record.status,runId,restartRequired:true}}
  json(file,{...record,status:'recovering'})
  for(const [name,content] of Object.entries(record.originals))atomic(path.join(root,name),content)
  json(file,{...record,status:'rolled_back',recoveredAt:new Date().toISOString()})
  const lock=store.file('evolution','.lock');if(fs.existsSync(lock))fs.rmdirSync(lock)
  if(fs.existsSync(ownerFile))fs.unlinkSync(ownerFile);if(fs.existsSync(sourceLock))fs.rmdirSync(sourceLock)
  return {status:'rolled_back',runId,restartRequired:true}
}
