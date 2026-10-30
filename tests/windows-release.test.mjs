import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {portableZip,zipFiles} from '../portable.ts'

function temporary(){fs.mkdirSync('.test-tmp',{recursive:true});return fs.mkdtempSync(path.resolve('.test-tmp','windows-release-'))}
function write(root,name,content){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content)}
test('source archive preserves Windows sources and lockfile while excluding personal data and compiled binaries',()=>{
  const root=temporary()
  try{
    for(const name of ['app.ts','launcher.mjs','package-lock.json','windows/Launcher.cs'])write(root,name,'source-'+name)
    for(const name of ['home/models.json','home/chats/demo/messages.jsonl','runtime/node.exe','release/server.mjs','Taoagent.exe','windows-release.json'])write(root,name,'must-not-ship-in-source-'+name)
    const archive=portableZip(path.join(root,'home'),root,true),names=[];let offset=0
    while(archive.readUInt32LE(offset)===0x04034b50){const size=archive.readUInt32LE(offset+18),length=archive.readUInt16LE(offset+26),extra=archive.readUInt16LE(offset+28);names.push(archive.subarray(offset+30,offset+30+length).toString('utf8'));offset+=30+length+extra+size}
    assert(names.includes('taoagent/windows/Launcher.cs'));assert(names.includes('taoagent/package-lock.json'));assert(!names.some(name=>/\/(home|release|runtime)\//.test(name)));assert(!archive.includes(Buffer.from('must-not-ship-in-source')))
    for(const name of ['../escape','/absolute','C:/outside','folder/../escape','folder\\escape'])assert.throws(()=>zipFiles([{name,data:Buffer.alloc(0)}]),/ZIP/)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('Windows launcher integrity check rejects tampered program files without exposing personal data',()=>{
  const root=temporary()
  try{
    write(root,'launcher.mjs',fs.readFileSync(new URL('../launcher.mjs',import.meta.url)))
    write(root,'package.json',JSON.stringify({version:'3.14.0'}));write(root,'release/build.json',JSON.stringify({version:'3.14.0'}))
    for(const name of ['release/server.mjs','public/index.html','public/client.js','public/style.css','public/appearance-boot.js','runtime/node.exe','runtime/LICENSE.txt','release/THIRD-PARTY-NOTICES.txt'])write(root,name,'fixture')
    const manifest={files:[{path:'public/client.js',sha256:crypto.createHash('sha256').update('fixture').digest('hex')}]};write(root,'windows-release.json',JSON.stringify(manifest))
    const clean=spawnSync(process.execPath,[path.join(root,'launcher.mjs'),'--check'],{encoding:'utf8',windowsHide:true});assert.equal(clean.status,0,clean.stderr);assert(JSON.parse(clean.stdout).verified)
    write(root,'public/client.js','changed-program');const tampered=spawnSync(process.execPath,[path.join(root,'launcher.mjs'),'--check'],{encoding:'utf8',windowsHide:true});assert.equal(tampered.status,1);assert(tampered.stderr.includes('integrity mismatch'))
    manifest.files[0].path='home/models.json';write(root,'windows-release.json',JSON.stringify(manifest));const privatePath=spawnSync(process.execPath,[path.join(root,'launcher.mjs'),'--check'],{encoding:'utf8',windowsHide:true});assert.equal(privatePath.status,1);assert(privatePath.stderr.includes('Invalid release manifest'))
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
