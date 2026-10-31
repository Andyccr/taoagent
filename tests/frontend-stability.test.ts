import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const civilization=fs.readFileSync(new URL('../public/civilization.js',import.meta.url),'utf8')
const town=fs.readFileSync(new URL('../public/town.js',import.meta.url),'utf8')
const client=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
type Snapshot={id?:string;source?:string}
const between=(source:string,start:string,end:string)=>source.slice(source.indexOf(start),source.indexOf(end))

function refreshFixture(){
  const pending:((value:Snapshot)=>void)[]=[]
  const sandbox:{refreshToken:number;real:Snapshot|null;offline:boolean;replaying:boolean;sim:boolean;simTimer:number;view:{hidden:boolean};published:Snapshot[];renders:number;loadLive:()=>Promise<Snapshot>;publish:(value:Snapshot)=>void;render:()=>void;startSim:()=>void}={
    refreshToken:0,real:null,offline:false,replaying:false,sim:false,simTimer:0,view:{hidden:false},published:[],renders:0,
    loadLive:()=>new Promise<Snapshot>(resolve=>pending.push(resolve)),
    publish:value=>{sandbox.real=value;sandbox.published.push(value)},
    render:()=>{sandbox.renders++},
    startSim:()=>{},
  }
  const context=vm.createContext(sandbox)
  vm.runInContext(between(civilization,'async function refresh()','function fail('),context)
  const refresh=vm.runInContext('refresh',context) as ()=>Promise<void>
  return{sandbox,refresh,pending}
}

test('refresh ignores a slower older response and never publishes while the view is hidden',async()=>{
  const f=refreshFixture(),older=f.refresh(),newer=f.refresh()
  f.pending[1]({id:'newer',source:'live'});await newer
  f.pending[0]({id:'older',source:'live'});await older
  assert.deepEqual(f.sandbox.published.map(value=>value.id),['newer'])
  assert.equal(f.sandbox.real?.id,'newer')
  const hidden=refreshFixture(),request=hidden.refresh()
  hidden.sandbox.view.hidden=true
  hidden.pending[0]({id:'hidden',source:'live'});await request
  assert.equal(hidden.sandbox.published.length,0)
  assert.equal(hidden.sandbox.real?.id,'hidden')
})

test('town date falls back when the policy timezone is invalid',()=>{
  const line=town.slice(town.indexOf('const date='),town.indexOf('\n',town.indexOf('const date=')))
  const sandbox={snapshot:{policy:{timezone:'Invalid/Zone'}}},context=vm.createContext(sandbox)
  vm.runInContext(line+'\nthis.date=date',context)
  const date=vm.runInContext('date',context) as (value:string)=>string
  const formatted=date('2026-10-30T12:00:00.000Z')
  assert.equal(typeof formatted,'string')
  assert.match(formatted,/\d/)
  assert.equal(date(''),'尚未开始')
})

test('stopReplay clears replay timeouts and stale replay callbacks cannot publish',()=>{
  const timeouts=new Map<number,()=>void>(),intervals=new Map<number,()=>void>(),published:Snapshot[]=[]
  let next=1
  const sandbox={real:{source:'live',citizens:[{id:'a',activity:'idle'}],events:[{id:'e1',agentId:'a',kind:'complete',title:'done',at:'2026-10-30T00:00:00.000Z'}],teams:[],tasks:[]},replayTimer:0,replayTimeouts:[] as number[],replayGeneration:0,replaying:false,sim:false,finger:'',
    q:()=>({setAttribute:()=>{}}),publish:(value:Snapshot)=>{published.push(value)},setSim:()=>{},statusNode:{textContent:''},t:()=>({noEvents:'none'}),settings:{speed:1},REPLAY_STATE:{complete:'complete',delivered:'complete'},
    setTimeout:(fn:()=>void)=>{const id=next++;timeouts.set(id,fn);return id},clearTimeout:(id:number)=>{timeouts.delete(id)},setInterval:(fn:()=>void)=>{const id=next++;intervals.set(id,fn);return id},clearInterval:(id:number)=>{intervals.delete(id)}
  }
  const context=vm.createContext(sandbox)
  vm.runInContext(between(civilization,'function stopReplay','async function loadLive'),context)
  const start=vm.runInContext('startReplay',context) as ()=>void,stop=vm.runInContext('stopReplay',context) as (restore:boolean)=>void
  start()
  assert.equal(published.length,1)
  assert.equal(timeouts.size,1)
  const staleTimeout=[...timeouts.values()][0],staleStep=[...intervals.values()][0]
  stop(false)
  assert.equal(timeouts.size,0)
  assert.equal(intervals.size,0)
  staleTimeout();staleStep()
  assert.equal(published.length,1)
})

test('handle disables the clicked button during a non-form action and re-enables it afterwards',async()=>{
  const errors:string[]=[]
  const sandbox={toast:(message:string)=>{errors.push(message)},syncWorkActions:()=>{}}
  const context=vm.createContext(sandbox)
  vm.runInContext(between(client,'function handle(fn)','async function readApiResponse('),context)
  const handle=vm.runInContext('handle',context) as (fn:(event:unknown)=>Promise<void>)=>(event:unknown)=>void
  let release:()=>void=()=>{}
  const pending=new Promise<void>(resolve=>{release=resolve}),button={tagName:'BUTTON',disabled:false},event={type:'click',currentTarget:button}
  let calls=0
  handle(()=>{calls++;return pending})(event)
  assert.equal(button.disabled,true)
  await Promise.resolve()
  assert.equal(calls,1)
  release();await pending
  await new Promise(resolve=>setTimeout(resolve,0))
  assert.equal(button.disabled,false)
  const failing={tagName:'BUTTON',disabled:false}
  handle(()=>Promise.reject(new Error('boom')))({type:'click',currentTarget:failing})
  assert.equal(failing.disabled,true)
  await new Promise(resolve=>setTimeout(resolve,0))
  assert.equal(failing.disabled,false)
  assert.deepEqual(errors,['boom'])
})
