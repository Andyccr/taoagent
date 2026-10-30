import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')

test('old pending, uncertain and running approvals remain visible beyond twelve recent records',()=>{
  const context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function visibleActions('),source.indexOf('function appendReceipt(')),context)
  const visible=vm.runInContext('visibleActions',context) as (actions:{id:number;status:string}[],expanded?:boolean)=>{id:number;status:string}[]
  const actions=Array.from({length:30},(_,id)=>({id,status:id===0?'pending':id===1?'uncertain':id===2?'running':'complete'}))
  assert.deepEqual(Array.from(visible(actions),item=>item.id),[0,1,2,...Array.from({length:12},(_,index)=>index+18)])
  assert.equal(visible(actions,true).length,30);assert.equal(actions.length,30)
})

test('long receipts have an explicit excerpt and can expand to the complete original text',()=>{
  const children:{textContent:string;onclick?:()=>void;remove?:()=>void}[]=[],context=vm.createContext({document:{createElement:()=>({textContent:'',remove(){}})}})
  vm.runInContext(source.slice(source.indexOf('function appendReceipt('),source.indexOf('async function refreshWork(')),context)
  const append=vm.runInContext('appendReceipt',context) as (parent:unknown,text:string,label:string)=>void
  const text='BEGIN\n'+'字'.repeat(14000)+'\nEND';append({append:(node:typeof children[number])=>children.push(node)},text,'回执')
  assert(children[0].textContent.includes('仅显示前12000字符'));assert.equal(children.length,2)
  children[1].onclick?.();assert.equal(children[0].textContent,text)
})

test('API failures handle invalid JSON and null error bodies without exposing parser exceptions',async()=>{
  const context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('async function readApiResponse('),source.indexOf('async function api(')),context)
  const read=vm.runInContext('readApiResponse',context) as (response:unknown)=>Promise<unknown>
  await assert.rejects(read({status:502,ok:false,json:async()=>{throw new SyntaxError('secret html')}}),/无法读取的内容（HTTP 502）/)
  await assert.rejects(read({status:409,ok:false,json:async()=>null}),/请求失败（HTTP 409）/)
  await assert.rejects(read({status:409,ok:false,json:async()=>({error:'编辑冲突'})}),/编辑冲突/)
  await assert.rejects(read({status:200,ok:true,json:async()=>{const error=new Error('timeout');error.name='TimeoutError';throw error}}),/响应中断或超时/)
  assert.equal(await read({status:200,ok:true,json:async()=>({ok:true})}).then(value=>(value as {ok:boolean}).ok),true)
})

test('other-window preference updates invalidate cached keys without replacing unrelated local state',()=>{
  const saved=new Map([['taoagent.theme','light'],['taoagent.newline','true']]),cache=new Map<string,string>();let applied=0
  const context=vm.createContext({volatilePreferences:cache,localStorage:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)},newlineMode:false,applyAppearance:()=>{applied++},applyShellPreferences(){},syncAppearance(){},renderEnterMode(){}})
  vm.runInContext(source.slice(source.indexOf('function preference('),source.indexOf('let newlineMode')),context)
  vm.runInContext(source.slice(source.indexOf('function synchronizePreferences('),source.indexOf("window.addEventListener('storage'")),context)
  const preference=vm.runInContext('preference',context) as (key:string,value?:string)=>string|null,sync=vm.runInContext('synchronizePreferences',context) as (event:{key:string|null})=>void
  preference('theme','dark');preference('visualStyle','paper');saved.set('taoagent.theme','light');sync({key:'taoagent.theme'})
  assert.equal(preference('theme'),'light');assert.equal(preference('visualStyle'),'paper');assert.equal(context.newlineMode,true);assert.equal(applied,1)
  sync({key:'unrelated'});assert.equal(applied,1);saved.clear();sync({key:null});assert.equal(cache.size,0);assert.equal(context.newlineMode,false)
})

test('unsaved draft detection includes background drafts and deliberate clearing, with no warning for saved text',()=>{
  const drafts=new Map([['agent:a','saved']]),bases=new Map([['agent:a','saved'],['group:b','original']]),prompt={value:'saved'}
  const context=vm.createContext({drafts,draftBases:bases,target:{type:'agent',id:'a'},targetKey:(target:{type:string;id:string})=>target.type+':'+target.id,$:()=>prompt})
  vm.runInContext(source.slice(source.indexOf('function hasUnsavedDrafts('),source.indexOf('async function openDraftRecovery(')),context)
  const dirty=vm.runInContext('hasUnsavedDrafts',context) as ()=>boolean
  assert.equal(dirty(),false);drafts.set('group:b','background edit');assert.equal(dirty(),true)
  drafts.set('group:b','original');prompt.value='';assert.equal(dirty(),true);prompt.value='saved';assert.equal(dirty(),false)
})

test('completion never steals focus from a reader, a dialog or a mobile device',()=>{
  let desktop=true,dialog=false,focused=0
  const prompt={focus:()=>{focused++}},send={},stop={},body={},document={activeElement:send,body,querySelector:()=>dialog?{}:null}
  const context=vm.createContext({document,matchMedia:()=>({matches:desktop}),$:(selector:string)=>selector==='#prompt'?prompt:selector==='#send'?send:stop})
  vm.runInContext(source.slice(source.indexOf('function shouldFocusComposer('),source.indexOf('function isBusy(')),context)
  const restore=vm.runInContext('restoreComposerFocus',context) as (allowed?:boolean)=>void
  restore();assert.equal(focused,1);document.activeElement={};restore();assert.equal(focused,1)
  document.activeElement=body;restore(false);assert.equal(focused,1)
  document.activeElement=send;dialog=true;restore();assert.equal(focused,1);dialog=false;desktop=false;restore();assert.equal(focused,1)
})

test('draft conflict recovery compares both copies and refuses an intervening remote edit',async()=>{
  let remote='REMOTE_ONE',closed=false
  const prompt={value:'LOCAL_COPY'},local={value:''},other={value:''},dialog={close:()=>{closed=true}},key='agent:main'
  const draftBases=new Map([[key,'OLD']]),draftProblems=new Map([[key,{conflict:true}]]),drafts=new Map([[key,'LOCAL_COPY']])
  const elements:Record<string,unknown>={'#prompt':prompt,'#draft-local-copy':local,'#draft-remote-copy':other,'#draft-recovery':dialog,'#draft-recovery-description':{textContent:''}}
  const context=vm.createContext({draftWrites:new Map(),draftBases,draftProblems,drafts,draftRecovery:null,target:{type:'agent',id:'main'},current:{title:'Main'},targetKey:(target:{type:string;id:string})=>target.type+':'+target.id,$:(selector:string)=>elements[selector],draftStatus(){},toast(){},markDialogClean(){},loadDialog:async(_dialog:unknown,load:()=>Promise<()=>void>)=>(await load())(),api:async(_url:string,method='GET',data?:{content:string;expected:string})=>{if(method==='GET')return{content:remote};if(data!.expected!==remote)return{saved:false};remote=data!.content;return{saved:true}}})
  vm.runInContext(source.slice(source.indexOf('function saveDraft('),source.indexOf('function isBusy(')),context)
  const open=vm.runInContext('openDraftRecovery',context) as ()=>Promise<void>,save=vm.runInContext('saveRecoveredDraft',context) as ()=>Promise<void>
  await open();assert.equal(local.value,'LOCAL_COPY');assert.equal(other.value,'REMOTE_ONE');assert.equal(prompt.value,'LOCAL_COPY')
  remote='REMOTE_TWO';await assert.rejects(save(),/另一窗口又更新/);assert.equal(other.value,'REMOTE_TWO');assert.equal(local.value,'LOCAL_COPY');assert.equal(closed,false)
  await save();assert.equal(remote,'LOCAL_COPY');assert.equal(draftBases.get(key),'LOCAL_COPY');assert.equal(draftProblems.has(key),false);assert(closed)
})

test('a failed draft save exposes retry state and a successful retry preserves exact whitespace',async()=>{
  const key='agent:main',problems=new Map(),bases=new Map([[key,'']]);let fail=true,saved=''
  const context=vm.createContext({target:{type:'agent',id:'main'},targetKey:()=>key,draftWrites:new Map(),draftBases:bases,draftProblems:problems,$:()=>({value:'  本地草稿\n'}),draftStatus(){},toast(){},api:async(_url:string,_method:string,data:{content:string})=>{if(fail)throw new Error('offline');saved=data.content;return{saved:true}}})
  vm.runInContext(source.slice(source.indexOf('function saveDraft('),source.indexOf('function flushDraft(')),context)
  const save=vm.runInContext('saveDraft',context) as (selected:unknown,text:string)=>Promise<unknown>
  await assert.rejects(save(context.target,'  本地草稿\n'),/offline/);assert(problems.has(key));assert.equal(bases.get(key),'')
  fail=false;await save(context.target,'  本地草稿\n');assert.equal(saved,'  本地草稿\n');assert.equal(problems.has(key),false)
})
