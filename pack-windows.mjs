import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {portableZip, sources} from './portable.ts'
import {Store} from './store.ts'

const root=path.dirname(fileURLToPath(import.meta.url))
if(process.argv.some((arg,index)=>index>1&&!['--clean'].includes(arg)))throw new Error('Usage: node --experimental-strip-types pack-windows.mjs [--clean]')
if(process.platform!=='win32')throw new Error('Build the Windows launcher on Windows with the bundled runtime.')
const meta=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),build=JSON.parse(fs.readFileSync(path.join(root,'release/build.json'),'utf8'))
if(meta.version!==build.version)throw new Error('Run npm run build first; release version differs.')
const runtime=path.join(root,'runtime/node.exe'),bytes=fs.readFileSync(runtime),pe=bytes.readUInt32LE(0x3c)
if(bytes.toString('ascii',0,2)!=='MZ'||bytes.toString('ascii',pe,pe+4)!=='PE\0\0'||bytes.readUInt16LE(pe+4)!==0x8664)throw new Error('The bundled Node runtime must be a Windows x64 executable.')
const compiler=path.join(process.env.SystemRoot||'C:\\Windows','Microsoft.NET','Framework64','v4.0.30319','csc.exe')
if(!fs.readFileSync(path.join(root,'windows/Launcher.cs'),'utf8').includes('AssemblyFileVersion("'+meta.version+'.0")'))throw new Error('Windows launcher source version differs from package.json.')
const compile=spawnSync(compiler,['/nologo','/target:winexe','/platform:x64','/optimize+','/reference:System.Windows.Forms.dll','/out:'+path.join(root,'Taoagent.exe'),path.join(root,'windows/Launcher.cs')],{encoding:'utf8',windowsHide:true})
if(compile.status!==0)throw new Error('Windows launcher compilation failed: '+(compile.stderr||compile.stdout||compile.error?.message))
const executable=fs.readFileSync(path.join(root,'Taoagent.exe')),exePe=executable.readUInt32LE(0x3c)
if(executable.readUInt16LE(exePe+4)!==0x8664)throw new Error('Launcher architecture must be x64.')
const checks=[]
function inspect(file,name){const stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw new Error('Release rejects symbolic links: '+name);if(stat.isDirectory()){for(const entry of fs.readdirSync(file).sort())inspect(path.join(file,entry),name+'/'+entry)}else if(stat.isFile()){if(name.startsWith('release/')&&!['server.mjs','build.json'].includes(path.basename(name)))return;const bytes=fs.readFileSync(file);checks.push({path:name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')})}}
for(const source of sources)if(source!=='windows-release.json'&&fs.existsSync(path.join(root,source)))inspect(path.join(root,source),source)
checks.sort((a,b)=>a.path.localeCompare(b.path))
const manifest={version:meta.version,platform:'win32',arch:'x64',builtAt:new Date().toISOString(),node:spawnSync(runtime,['--version'],{encoding:'utf8',windowsHide:true}).stdout.trim(),files:checks}
fs.writeFileSync(path.join(root,'windows-release.json'),JSON.stringify(manifest,null,2)+'\n')
const out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true})
const clean=process.argv.includes('--clean'),staging=path.join(root,'.test-tmp','package-'+crypto.randomUUID()),home=clean?path.join(staging,'home'):path.resolve(process.env.TAOAGENT_HOME||path.join(root,'home'))
if(clean)new Store(home)
function save(name,data){const file=path.join(out,name),temporary=file+'.tmp';fs.writeFileSync(temporary,data);fs.renameSync(temporary,file);const hash=crypto.createHash('sha256').update(data).digest('hex');console.log(JSON.stringify({file:name,bytes:data.length,sha256:hash}));return{file:name,bytes:data.length,sha256:hash}}
const results=[]
try{
  results.push(save(`Taoagent-${meta.version}-Windows-x64${clean?'-clean':''}.zip`,portableZip(home,root)))
  if(!clean)results.push(save(`Taoagent-${meta.version}-source.zip`,portableZip(home,root,true)))
  fs.writeFileSync(path.join(out,`Taoagent-${meta.version}${clean?'-clean':''}-SHA256SUMS.txt`),results.map(item=>item.sha256+'  '+item.file).join('\n')+'\n')
}finally{if(!path.resolve(staging).startsWith(path.join(root,'.test-tmp')+path.sep))throw new Error('Refusing to remove staging outside .test-tmp');if(clean&&fs.existsSync(staging))fs.rmSync(staging,{recursive:true,force:true})}
