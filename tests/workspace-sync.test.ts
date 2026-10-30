import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
test('out-of-order state responses cannot restore obsolete configuration',async()=>{
  const replies:((value:unknown)=>void)[]=[]
  const context=vm.createContext({api:()=>new Promise(resolve=>replies.push(resolve)),stateFingerprint:'',state:{},current:null,pending:new Set(),renderContacts(){},renderHeader(){}})
  vm.runInContext(source.slice(source.indexOf('let refreshVersion ='),source.indexOf('function scrollIfNear(')),context)
  const refresh=vm.runInContext('refresh',context) as ()=>Promise<void>
  const first=refresh(),second=refresh();replies[1]({version:'new'});await second;replies[0]({version:'old'});await first
  assert.equal(vm.runInContext('state.version',context),'new')
})
test('background reconciliation serializes slow requests and permits retry after failure',async()=>{
  let calls=0,release!:()=>void
  const context=vm.createContext({document:{hidden:false,querySelectorAll:()=>[]},pending:new Set(),current:null,target:{id:'selected'},state:{running:[]},refresh:()=>{calls++;return new Promise<void>(resolve=>{release=resolve})}})
  vm.runInContext(source.slice(source.indexOf('let reconciling ='),source.indexOf('function initialTarget(')),context)
  const reconcile=vm.runInContext('reconcile',context) as ()=>Promise<void>
  const first=reconcile();await reconcile();assert.equal(calls,1);release();await first
  const next=reconcile();assert.equal(calls,2);release();await next
})
test('invalid bookmarks and empty workspaces have safe startup destinations',()=>{
  const context=vm.createContext({location:{hash:'#agent=%ZZ'},state:{agents:[],groups:[]}})
  vm.runInContext(source.slice(source.indexOf('function initialTarget('),source.indexOf('async function openInitialTarget(')),context)
  assert.equal(vm.runInContext('initialTarget()',context),null)
  vm.runInContext("state.agents=[{id:'main'}]",context)
  assert.equal(vm.runInContext('initialTarget().id',context),'main')
})
