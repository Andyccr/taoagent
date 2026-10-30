import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

// Execute the real submission handlers with deferred transport, without a DOM framework.
const client=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
const handlers=client.slice(client.indexOf('function clearSubmittedDraft('),client.indexOf("$('#composer').onsubmit"))
function fixture(busy=true){
  let release:()=>void=()=>{};const deferred=new Promise<void>(resolve=>{release=resolve})
  const prompt={value:'原始消息',focus(){}},recipients={value:'peer'},model={value:'group-model'}
  const saved:{selected:unknown;content:string;expected:string}[]=[],requests:{url:string;data:unknown}[]=[]
  const drafts=new Map([['group:original','原始消息']]),draftTimers=new Map([['group:original',99]])
  const context=vm.createContext({current:{id:'original',kind:'group'},target:{type:'group',id:'original'},state:{models:[{}]},drafts,draftTimers,submittingThreads:new Set(),submissionControllers:new Map(),AbortController,DOMException,sendingIds:new Map(),pending:new Set(),streams:new Map(),crypto:{randomUUID:()=>'submission'},
    $:(selector:string)=>selector==='#prompt'?prompt:selector==='#recipients'?recipients:selector==='#model'?model:{textContent:'',focus:()=>{}},
    targetKey:(value:{type:string;id:string}|null)=>value?value.type+':'+value.id:'',isBusy:()=>busy,controls:()=>{},updateSendControl:()=>{},resizePrompt:()=>{},clearTimeout:()=>{},toast:()=>{},refresh:async()=>{},loadCurrent:async()=>{},shouldFocusComposer:()=>false,restoreComposerFocus:()=>{},
    api:async(url:string,_method:string,data:unknown)=>{requests.push({url,data});await deferred},flushDraft:()=>deferred,
    saveDraft:async(selected:unknown,content:string,expected:string)=>{saved.push({selected,content,expected})},
    fetch:async(url:string,options:{body:string})=>{requests.push({url,data:JSON.parse(options.body)});return{ok:false,json:async()=>({error:'synthetic transport failure'})}}
  })
  vm.runInContext(client.slice(client.indexOf('async function readApiResponse('),client.indexOf('async function api(')),context)
  vm.runInContext(handlers,context)
  const send=vm.runInContext('sendMessage',context) as ()=>Promise<void>
  return{context,prompt,drafts,draftTimers,saved,requests,send,release}
}
test('interjection acknowledgement preserves text typed during the request and its autosave timer',async()=>{
  const f=fixture(),request=f.send();f.prompt.value='后来输入';f.drafts.set('group:original','后来输入');f.release();await request
  assert.equal(f.prompt.value,'后来输入');assert.equal(f.drafts.get('group:original'),'后来输入');assert(f.draftTimers.has('group:original'))
  assert.equal(f.saved[0].expected,'原始消息')
})
test('interjection acknowledgement cannot clear a different conversation after navigation',async()=>{
  const f=fixture(),request=f.send();f.context.current={id:'other',kind:'direct'};f.context.target={type:'agent',id:'other'};f.prompt.value='另一对话草稿';f.drafts.set('agent:other','另一对话草稿');f.release();await request
  assert.equal(f.prompt.value,'另一对话草稿');assert.equal(f.drafts.get('agent:other'),'另一对话草稿');assert.equal(JSON.stringify(f.saved[0].selected),JSON.stringify({type:'group',id:'original'}))
})
test('repeated interjection clicks while transport is pending dispatch only once',async()=>{
  const f=fixture(),first=f.send();await f.send();assert.equal(f.requests.length,1);f.release();await first;assert.equal(f.prompt.value,'')
})
test('normal send keeps original group recipients after draft flush and preserves newer cached text on failure',async()=>{
  const f=fixture(false),request=f.send();f.drafts.set('group:original','原群更新后的草稿');f.context.current={id:'other',kind:'direct'};f.context.target={type:'agent',id:'other'};f.prompt.value='另一对话';f.release();await request
  const sent=f.requests[0];assert.equal(sent.url,'/api/chats/original/chat');assert.equal(JSON.stringify(sent.data),JSON.stringify({content:'原始消息',modelId:'group-model',requestId:'submission',memberIds:['peer']}));assert.equal(f.drafts.get('group:original'),'原群更新后的草稿');assert.equal(f.prompt.value,'另一对话')
})

test('switching conversations clears previous tool output and hides old member and approval controls',async()=>{
  const elements=new Map<string,{value:string;textContent:string;hidden:boolean;open:boolean;dataset:Record<string,string>;replaceChildren:()=>void;setAttribute:()=>void;removeAttribute:()=>void}>()
  for(const selector of ['#messages','#welcome','#prompt','#tool-output','#work-items','#work-panel','#member-models','#mention-list','#conversation','#contact-name','#contact-description'])elements.set(selector,{value:'',textContent:'上一对话输出',hidden:false,open:true,dataset:{fingerprint:'previous'},replaceChildren(){this.textContent=''},setAttribute(){},removeAttribute(){}})
  const sandbox=vm.createContext({target:null,current:null,followLatest:true,state:{agents:[],groups:[]},syncAttention:()=>{},renderContacts:()=>{},controls:()=>{},drafts:new Map(),draftBases:new Map([['agent:other','']]),$:(selector:string)=>elements.get(selector),resizePrompt:()=>{},draftStatus:()=>{},history:{replaceState:()=>{}},sidebar:()=>{},targetKey:(value:{type:string;id:string})=>value.type+':'+value.id,loadCurrent:async()=>{},matchMedia:()=>({matches:false})})
  vm.runInContext(client.slice(client.indexOf('async function openTarget('),client.indexOf("\n$('#older-messages').onclick")),sandbox)
  const open=vm.runInContext('openTarget',sandbox) as (target:{type:string;id:string})=>Promise<void>
  await open({type:'agent',id:'other'})
  assert.equal(elements.get('#tool-output')?.textContent,'');assert.equal(elements.get('#tool-output')?.hidden,true);assert.equal(elements.get('#work-panel')?.open,false);assert.equal(elements.get('#work-panel')?.hidden,true);assert.equal(elements.get('#member-models')?.hidden,true)
  assert.equal(elements.get('#mention-list')?.hidden,true);assert.equal(elements.get('#mention-list')?.textContent,'')
})

test('stopping during draft flush cancels the pending send without dispatching or erasing its draft',async()=>{
  const f=fixture(false),request=f.send();const controller=f.context.submissionControllers.get('original') as AbortController;controller.abort();f.release();await request
  assert.equal(f.requests.length,0);assert.equal(f.prompt.value,'原始消息');assert.equal(f.drafts.get('group:original'),'原始消息');assert.equal(f.context.submissionControllers.size,0)
})
