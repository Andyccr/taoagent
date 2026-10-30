import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done});return{promise,resolve}}
function dialogFixture(){
  const loader={textContent:'',hidden:true,replaceChildren(){this.textContent=''},append(){}}
  const dialog={id:'test-dialog',dataset:{} as Record<string,string>,open:false,querySelector:()=>loader,showModal(){this.open=true}}
  let cleaned=0;const loads=new Map()
  const context=vm.createContext({dialogLoads:loads,toast:()=>{},markDialogClean:()=>{cleaned++}})
  vm.runInContext(source.slice(source.indexOf('async function loadDialog('),source.indexOf('function preference(')),context)
  const load=vm.runInContext('loadDialog',context) as (target:typeof dialog,work:()=>Promise<()=>void>)=>Promise<void>
  return{dialog,loader,loads,load,cleaned:()=>cleaned}
}
test('closed modal ignores a late loading response and cannot reopen or overwrite fields',async()=>{
  const f=dialogFixture(),request=deferred<()=>void>();let applied=false
  const pending=f.load(f.dialog,()=>request.promise);assert(f.dialog.open);assert.equal(f.dialog.dataset.loading,'true')
  f.dialog.open=false;f.loads.delete(f.dialog.id);request.resolve(()=>{applied=true});await pending
  assert.equal(applied,false);assert.equal(f.dialog.open,false);assert.equal(f.cleaned(),0)
})
test('latest modal loading request wins when responses arrive in reverse order',async()=>{
  const f=dialogFixture(),old=deferred<()=>void>(),latest=deferred<()=>void>();const applied:string[]=[]
  const first=f.load(f.dialog,()=>old.promise),second=f.load(f.dialog,()=>latest.promise)
  latest.resolve(()=>applied.push('latest'));await second;old.resolve(()=>applied.push('old'));await first
  assert.deepEqual(applied,['latest']);assert.equal(f.dialog.dataset.loading,undefined);assert(f.loader.hidden)
})
test('form values are captured before disabling controls and duplicate submissions are blocked',async()=>{
  const pending=deferred<void>(),input={disabled:false,value:'original'},button={disabled:false,textContent:'保存'}
  const dialog={dataset:{} as Record<string,string>,querySelectorAll:()=>[input,button]}
  const form={dataset:{} as Record<string,string>,closest:()=>dialog,querySelectorAll:()=>[button],setAttribute(){},removeAttribute(){}}
  const context=vm.createContext({toast:()=>{}});vm.runInContext(source.slice(source.indexOf('function handle('),source.indexOf('async function api(')),context)
  const wrap=vm.runInContext('handle',context) as (callback:()=>Promise<void>)=>(event:unknown)=>void
  let count=0,captured='';const handler=wrap(async()=>{count++;assert.equal(input.disabled,false);captured=input.value;await pending.promise})
  const event={type:'submit',target:form,preventDefault(){}};handler(event);handler(event);await new Promise(resolve=>setImmediate(resolve))
  assert.equal(count,1);assert.equal(captured,'original');assert(input.disabled);assert(button.disabled);assert.equal(dialog.dataset.saving,'true')
  pending.resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(input.disabled,false);assert.equal(button.disabled,false);assert.equal(button.textContent,'保存');assert.equal(dialog.dataset.saving,undefined)
})
test('older member context response cannot replace the currently selected member statistics',async()=>{
  const a=deferred<unknown>(),b=deferred<unknown>(),agent={value:'a'},dialog={dataset:{thread:'group'}},rendered:unknown[]=[]
  const context=vm.createContext({contextLoadVersion:0,$:(selector:string)=>selector==='#context-agent'?agent:dialog,api:(url:string)=>url.endsWith('=a')?a.promise:b.promise,renderContext:(value:unknown)=>rendered.push(value)})
  vm.runInContext(source.slice(source.indexOf('async function loadContext('),source.indexOf('function renderContext(')),context)
  const load=vm.runInContext('loadContext',context) as ()=>Promise<void>;const first=load();agent.value='b';const second=load();b.resolve({member:'b'});await second;a.resolve({member:'a'});await first
  assert.deepEqual(rendered,[{member:'b'}])
})

test('modal loading failure offers retry and then renders the successful response',async()=>{
  const children:{onclick?:()=>Promise<void>}[]=[],loader={textContent:'',hidden:true,replaceChildren(){children.length=0},append(node:{onclick?:()=>Promise<void>}){children.push(node)}}
  const dialog={id:'retry',dataset:{} as Record<string,string>,open:false,querySelector:()=>loader,showModal(){this.open=true}}
  const context=vm.createContext({dialogLoads:new Map(),toast:()=>{},markDialogClean:()=>{},document:{createElement:()=>({})}})
  vm.runInContext(source.slice(source.indexOf('async function loadDialog('),source.indexOf('function preference(')),context)
  const load=vm.runInContext('loadDialog',context) as (target:typeof dialog,work:()=>Promise<()=>void>)=>Promise<void>
  let attempts=0,applied=false;const work=async()=>{if(++attempts===1)throw new Error('temporary failure');return()=>{applied=true}}
  await load(dialog,work);assert.equal(loader.textContent,'temporary failure');assert.equal(children.length,1);assert.equal(dialog.dataset.loading,'true')
  await children[0].onclick?.();assert.equal(attempts,2);assert(applied);assert(loader.hidden);assert.equal(dialog.dataset.loading,undefined)
})

test('in-app discard confirmation defaults to keeping edits and resolves from explicit choice',async()=>{
  const dialog={showModal(){},close(){},oncancel:undefined as unknown},cancel={textContent:'',focus(){},onclick:undefined as unknown},accept={textContent:'',onclick:undefined as unknown},message={textContent:''}
  const context=vm.createContext({confirmationPending:false,$:(selector:string)=>selector==='#confirm-dialog'?dialog:selector==='#confirm-cancel'?cancel:selector==='#confirm-accept'?accept:message})
  vm.runInContext(source.slice(source.indexOf('function confirmAction('),source.indexOf('async function loadDialog(')),context)
  const ask=vm.runInContext('confirmAction',context) as (message:string)=>Promise<boolean>
  const first=ask('discard?');(cancel.onclick as ()=>void)();assert.equal(await first,false)
  const second=ask('discard again?');(accept.onclick as ()=>void)();assert.equal(await second,true)
  const third=ask('Escape keeps edits');(dialog.oncancel as (event:{preventDefault:()=>void})=>void)({preventDefault(){}});assert.equal(await third,false)
})

test('failed memory scope loading restores the last valid selection and re-enables editors',async()=>{
  const agent={value:'new'},scope={value:'member'},dialog={dataset:{thread:'group'}},area={inert:false,setAttribute(){},removeAttribute(){}}
  const context=vm.createContext({memoryLoadVersion:0,memoryEditor:{thread:'group',agentId:'old',scope:'group'},$:(selector:string)=>selector==='#context-agent'?agent:selector==='#memory-scope'?scope:selector==='#context-dialog'?dialog:area,api:async()=>{throw new Error('temporary failure')},applyMemory:()=>{throw new Error('must not render failure')}})
  vm.runInContext(source.slice(source.indexOf('async function loadMemory('),source.indexOf('function applyMemory(')),context)
  const load=vm.runInContext('loadMemory',context) as ()=>Promise<void>;await assert.rejects(load,/temporary failure/)
  assert.equal(agent.value,'old');assert.equal(scope.value,'group');assert.equal(area.inert,false)
})

test('history search result from a closed conversation cannot populate a newly opened one',async()=>{
  const response=deferred<unknown[]>(),dialog={dataset:{thread:'original'}},form={elements:{namedItem:()=>({value:'query'})},onsubmit:undefined as unknown};let cleared=false
  const context=vm.createContext({historyLoadVersion:0,handle:(fn:()=>Promise<void>)=>fn,$:(selector:string)=>selector==='#history-search'?form:selector==='#context-dialog'?dialog:{replaceChildren(){cleared=true}},api:()=>response.promise})
  vm.runInContext(source.slice(source.indexOf("$('#history-search').onsubmit"),source.indexOf("$('#summarize').onclick")),context)
  const pending=(form.onsubmit as ()=>Promise<void>)();dialog.dataset.thread='other';response.resolve([]);await pending;assert.equal(cleared,false)
})
