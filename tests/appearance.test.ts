import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import {once} from 'node:events'
import {createApp} from '../app.ts'

const source=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
const boot=fs.readFileSync(new URL('../public/appearance-boot.js',import.meta.url),'utf8')

test('custom and preset accents keep text readable on every light and dark surface',()=>{
  const context=vm.createContext({})
  vm.runInContext(source.slice(source.indexOf('const visualStyles='),source.indexOf('function applyAppearance()')),context)
  const check=vm.runInContext('({styles:visualStyles,colors:appearanceColors,accent:accessibleAccent,contrast:colorContrast})',context) as {styles:{light:string;dark:string}[];colors:{hex:string}[];accent:(raw:string,bg:string,dark:boolean)=>{accent:string;soft:string;text:string};contrast:(a:string,b:string)=>number}
  for(const style of check.styles)for(const dark of [false,true])for(const raw of [...check.colors.map(color=>color.hex),'#ffffff','#000000','#ffff00','#ff00ff','#00ff00','#abcxyz']){
    const bg=dark?style.dark:style.light,colors=check.accent(raw,bg,dark)
    assert(check.contrast(colors.accent,bg)>=4.5,raw+' on '+bg)
    assert(check.contrast(colors.accent,colors.soft)>=4.5,raw+' on tinted background')
    assert(check.contrast(colors.accent,colors.text)>=4.5,raw+' button label')
    assert.match(colors.accent,/^#[a-f0-9]{6}$/i)
  }
})

test('blocked browser storage still allows appearance changes within the current tab',()=>{
  const context=vm.createContext({volatilePreferences:new Map(),localStorage:{getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}})
  vm.runInContext(source.slice(source.indexOf('function preference('),source.indexOf('let newlineMode')),context)
  const preference=vm.runInContext('preference',context) as (key:string,value?:string)=>string|null
  assert.equal(preference('theme'),null);preference('theme','dark');assert.equal(preference('theme'),'dark')
  preference('visualStyle','paper');assert.equal(preference('visualStyle'),'paper');assert.equal(preference('theme'),'dark')
})

test('early appearance restoration validates saved values and follows system theme safely',()=>{
  const saved:Record<string,string>={'taoagent.theme':'system','taoagent.visualStyle':'terminal','taoagent.readingSize':'large','taoagent.width':'wide','taoagent.motion':'reduce'},dataset:Record<string,string>={}
  const context=vm.createContext({document:{documentElement:{dataset}},localStorage:{getItem:(key:string)=>saved[key]??null},matchMedia:()=>({matches:true})})
  vm.runInContext(boot,context);assert.equal(dataset.theme,'dark');assert.equal(dataset.visualStyle,'terminal');assert.equal(dataset.readingSize,'large');assert.equal(dataset.width,'wide');assert.equal(dataset.motion,'reduce')
  saved['taoagent.theme']='invalid';saved['taoagent.visualStyle']='unknown';vm.runInContext(boot,context);assert.equal(dataset.theme,'dark');assert.equal(dataset.visualStyle,'studio')
  const blocked:Record<string,string>={};vm.runInNewContext(boot,{document:{documentElement:{dataset:blocked}},localStorage:{getItem(){throw new Error('blocked')}},matchMedia:()=>({matches:false})});assert.equal(blocked.theme,'light');assert.equal(blocked.visualStyle,'studio')
})

test('appearance bootstrap is served as a local script without relaxing content security',async()=>{
  fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','appearance-api-')),app=createApp(root,{seed:false})
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address();assert(address&&typeof address==='object')
  try{
    const base='http://127.0.0.1:'+address.port,response=await fetch(base+'/appearance-boot.js')
    assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/javascript/)
    assert.equal(await response.text(),boot);assert.match(response.headers.get('content-security-policy')||'',/script-src 'self'/);assert(!response.headers.get('content-security-policy')?.includes('unsafe-inline'))
    const html=await(await fetch(base)).text();assert(html.indexOf('/appearance-boot.js')<html.indexOf('/style.css'))
  }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}
})
