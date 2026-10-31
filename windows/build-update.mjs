import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {sources} from '../portable.ts'

// Build beside the installed program: existing launchers and home/ stay untouched.
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)))
if(process.platform!=='win32')throw new Error('Windows release builds require Windows.')
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version
const out=path.resolve(root,'artifacts'),destination=path.resolve(out,`Taoagent-${version}-Windows-x64`)
if(!destination.startsWith(out+path.sep)||fs.existsSync(destination))throw new Error('Release folder already exists or is outside artifacts; choose a new version before building.')
const stage=process.env.TAOAGENT_BUILD_STAGE?path.resolve(process.env.TAOAGENT_BUILD_STAGE):path.resolve(root,'.test-tmp','windows-update-'+crypto.randomUUID())
if(!stage.startsWith(path.resolve(root,'.test-tmp')+path.sep)||!path.basename(stage).startsWith('windows-update-'))throw new Error('Build staging must stay under .test-tmp/windows-update-*.')
const reusable=fs.existsSync(path.join(stage,'node_modules'))&&fs.existsSync(path.join(stage,'package-lock.json'))&&fs.readFileSync(path.join(stage,'package-lock.json')).equals(fs.readFileSync(path.join(root,'package-lock.json')))
fs.mkdirSync(stage,{recursive:true});fs.mkdirSync(out,{recursive:true})
function copy(source,target){fs.cpSync(source,target,{recursive:true,filter:file=>{if(fs.lstatSync(file).isSymbolicLink())throw new Error('Release rejects symbolic links: '+path.basename(file));return true}})}
for(const name of sources)if(fs.existsSync(path.join(root,name)))copy(path.join(root,name),path.join(stage,name))
const modules=path.join(root,'node_modules')
if(fs.readdirSync(modules,{recursive:true,withFileTypes:true}).some(entry=>entry.isSymbolicLink()))throw new Error('Build dependencies must not contain symbolic links.')
const dependencyCopy=reusable?{status:0,stderr:''}:spawnSync('robocopy.exe',[modules,path.join(stage,'node_modules'),'/E','/XJ','/MT:16','/R:0','/W:0','/NFL','/NDL','/NJH','/NJS','/NP'],{windowsHide:true,encoding:'utf8'})
if(dependencyCopy.status===null||dependencyCopy.status>=8)throw new Error('Dependency copy failed: '+dependencyCopy.stderr)
const runtime=path.join(stage,'runtime/node.exe')
function run(args){const result=spawnSync(runtime,args,{cwd:stage,windowsHide:true,encoding:'utf8',env:{...process.env,TAOAGENT_HOME:path.resolve(process.env.TAOAGENT_HOME||path.join(root,'home'))},maxBuffer:8*1024*1024});if(result.status!==0)throw new Error(result.stderr||result.stdout||result.error?.message||'Build failed');if(result.stdout)process.stdout.write(result.stdout)}
run(['build-city.mjs']);run(['build.mjs']);run(['--experimental-strip-types','pack-windows.mjs'])
const zipName=`Taoagent-${version}-Windows-x64.zip`,zip=path.join(stage,'artifacts',zipName),unpacked=path.join(stage,'unpacked')
// Restore our STORE ZIP using the bundled runtime; no PowerShell modules or external unzip are required.
const bytes=fs.readFileSync(zip),seen=new Set(),crcTable=Uint32Array.from({length:256},(_,value)=>{let crc=value;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);return crc>>>0})
let offset=0
while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),length=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+length+extra,end=start+size
  const name=bytes.subarray(offset+30,offset+30+length).toString('utf8'),parts=name.split('/')
  if(end>bytes.length||bytes.readUInt16LE(offset+8)!==0||(bytes.readUInt16LE(offset+6)&9)!==0||!name.startsWith('taoagent/')||parts.some(part=>!part||part==='.'||part==='..'||/[:\\]/.test(part))||seen.has(name.toLowerCase()))throw new Error('Invalid portable ZIP entry')
  seen.add(name.toLowerCase())
  const target=path.resolve(unpacked,...parts)
  if(!target.startsWith(path.resolve(unpacked)+path.sep))throw new Error('ZIP path escapes restoration folder')
  const data=bytes.subarray(start,end);let crc=0xffffffff
  for(const byte of data)crc=(crc>>>8)^crcTable[(crc^byte)&255]
  if(((crc^0xffffffff)>>>0)!==bytes.readUInt32LE(offset+14))throw new Error('ZIP entry checksum mismatch: '+name)
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);offset=end
}
if(!seen.size)throw new Error('Portable ZIP is empty')
const extracted=path.resolve(unpacked,'taoagent')
if(!extracted.startsWith(stage+path.sep)||!destination.startsWith(out+path.sep))throw new Error('Invalid release move paths')
fs.renameSync(extracted,destination)
for(const name of fs.readdirSync(path.join(stage,'artifacts')))fs.copyFileSync(path.join(stage,'artifacts',name),path.join(out,name))
console.log(JSON.stringify({folder:destination,zip:path.join(out,zipName),source:path.join(out,`Taoagent-${version}-source.zip`)}))
