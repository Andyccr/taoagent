import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {spawn} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {setTimeout as delay} from 'node:timers/promises'

const root=path.dirname(fileURLToPath(import.meta.url)),home=path.resolve(process.env.TAOAGENT_HOME||path.join(root,'home'))
const lock=path.join(home,'.launcher-lock'),ownerFile=path.join(lock,'owner.json')
const atomic=(file,value)=>{const tmp=file+'.'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,file)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}}
function alive(pid){try{if(!Number.isInteger(pid)||pid<1)return false;process.kill(pid,0);return true}catch(error){return error.code!=='ESRCH'}}
function owner(){try{return JSON.parse(fs.readFileSync(ownerFile,'utf8'))}catch{return null}}
function check(){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),build=JSON.parse(fs.readFileSync(path.join(root,'release/build.json'),'utf8'))
  const [major,minor]=process.versions.node.split('.').map(Number)
  if(major<22||major===22&&minor<19)throw new Error('Node.js 22.19 or newer is required. Use the bundled runtime.')
  if(meta.version!==build.version)throw new Error('Program and release versions differ. Extract the complete Windows package into a new folder.')
  for(const name of ['release/server.mjs','public/index.html','public/client.js','public/style.css','public/appearance-boot.js','runtime/node.exe'])if(!fs.statSync(path.join(root,name)).isFile())throw new Error('Missing file: '+name)
  return meta
}
function verifyDistribution(){
  const file=path.join(root,'windows-release.json')
  if(!fs.existsSync(file))return {verified:false,reason:'No distribution manifest in this source checkout'}
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'))
  for(const entry of manifest.files){
    if(typeof entry.path!=='string'||entry.path.split('/').some(part=>!part||part==='..'||part==='.')||path.isAbsolute(entry.path)||/[\\:\x00]/.test(entry.path)||entry.path.startsWith('home/'))throw new Error('Invalid release manifest path')
    const bytes=fs.readFileSync(path.join(root,entry.path))
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Release integrity mismatch: '+entry.path)
  }
  return {verified:true,files:manifest.files.length}
}
async function healthy(record){
  if(!record?.port||typeof record.instanceId!=='string'||!alive(record.pid))return false
  try{const response=await fetch('http://127.0.0.1:'+record.port+'/api/health',{signal:AbortSignal.timeout(1500)}),health=await response.json();return response.ok&&health.app==='taoagent'&&health.instanceId===record.instanceId}catch{return false}
}
function openBrowser(port){if(process.env.TAOAGENT_NO_OPEN)return;if(process.platform==='win32'){const child=spawn('explorer.exe',['http://127.0.0.1:'+port],{windowsHide:true,stdio:'ignore'});child.on('error',()=>{});child.unref()}}
async function main(){
  const meta=check()
  if(process.argv.includes('--check')){console.log(JSON.stringify({app:'taoagent',version:meta.version,node:process.versions.node,...verifyDistribution()}));return}
  fs.mkdirSync(home,{recursive:true})
  if(process.argv.includes('--stop')){
    const record=owner();if(!await healthy(record))throw new Error('No matching Taoagent service is running for this data folder.')
    const response=await fetch('http://127.0.0.1:'+record.port+'/api/launcher/stop',{method:'POST',headers:{'Content-Type':'application/json','X-Taoagent-Instance':record.instanceId},body:'{}',signal:AbortSignal.timeout(5000)})
    if(!response.ok)throw new Error('The local service refused the stop request.')
    console.log('Taoagent is stopping. Pending queue messages are paused.');return
  }
  if(fs.existsSync(lock)){
    const previous=owner()
    if(previous&&alive(previous.pid)){
      for(let attempt=0;attempt<20;attempt++){const current=owner();if(await healthy(current)){openBrowser(current.port);console.log('Opened the running Taoagent instance.');return}await delay(500)}
      throw new Error('Another launcher is starting or unresponsive. Check home/logs; the existing process was not stopped.')
    }
    if(!previous&&Date.now()-fs.statSync(lock).mtimeMs<30000)throw new Error('Another launcher is starting. Try again shortly.')
    if(fs.existsSync(ownerFile))fs.unlinkSync(ownerFile);fs.rmdirSync(lock)
  }
  fs.mkdirSync(lock)
  const instanceId=crypto.randomUUID(),record={pid:process.pid,instanceId,port:null,version:meta.version}
  let child,exitCode=1
  try{
    atomic(ownerFile,record)
    fs.mkdirSync(path.join(home,'logs'),{recursive:true})
    const log=fs.createWriteStream(path.join(home,'logs','launcher-'+new Date().toISOString().replace(/[:.]/g,'-')+'.log'),{flags:'a',mode:0o600})
    log.on('error',()=>{})
    const environment={...process.env,TAOAGENT_HOME:home,TAOAGENT_LAUNCHER:'1',TAOAGENT_INSTANCE_ID:instanceId,TAOAGENT_NO_OPEN:'1'};delete environment.NODE_OPTIONS;delete environment.NODE_PATH
    child=spawn(process.execPath,[path.join(root,'release/server.mjs')],{cwd:root,env:environment,windowsHide:true,stdio:['ignore','pipe','pipe']})
    let buffer='',ready=false
    child.stdout.on('data',chunk=>{
      log.write(chunk);process.stdout.write(chunk);buffer+=chunk.toString('utf8')
      let end
      while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);if(line.startsWith('TAOAGENT_READY ')){try{const value=JSON.parse(line.slice(15));if(Number.isInteger(value.port)&&value.port>0&&value.port<65536){record.port=value.port;atomic(ownerFile,record);ready=true;openBrowser(record.port)}}catch{}}}
      if(buffer.length>16000)buffer=buffer.slice(-16000)
    })
    child.stderr.on('data',chunk=>{log.write(chunk);process.stderr.write(chunk)})
    const watchdog=setTimeout(()=>{if(!ready){console.error('Taoagent did not become ready. See home/logs for details.');child.kill()}},30000);watchdog.unref()
    const forward=()=>child?.kill();process.once('SIGINT',forward);process.once('SIGTERM',forward)
    exitCode=await new Promise(resolve=>{child.once('error',()=>resolve(1));child.once('exit',code=>resolve(code??1))})
    clearTimeout(watchdog);log.end();process.off('SIGINT',forward);process.off('SIGTERM',forward)
  }finally{if(owner()?.instanceId===instanceId){if(fs.existsSync(ownerFile))fs.unlinkSync(ownerFile);if(fs.existsSync(lock))fs.rmdirSync(lock)}}
  process.exitCode=exitCode
}
main().catch(error=>{console.error(error.message||'Taoagent failed to start.');process.exitCode=1})
