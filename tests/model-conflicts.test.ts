import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {once} from 'node:events'
import {Store,json,HttpError} from '../store.ts'
import {createApp} from '../app.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','models-')),store=new Store(root);const model=store.saveModel({id:'one',name:'One',model:'one',baseUrl:'http://127.0.0.1:1',apiKey:'original-secret'});return{root,store,model}}

test('stale model forms cannot overwrite newer credentials or model budgets',()=>{
  const {root,store,model}=fixture()
  try{
    const newer=new Store(root).saveModel({id:model.id,apiKey:'new-secret',maxOutputTokens:2048,expectedRevision:model.revision})
    assert.notEqual(newer.revision,model.revision)
    const before=store.text('models.json')
    assert.throws(()=>store.saveModel({...model,apiKey:'',clearKey:true,expectedRevision:model.revision}),error=>error instanceof HttpError&&error.status===409)
    assert.equal(store.text('models.json'),before)
    const saved=store.saveModel({id:model.id,name:'Renamed',apiKey:'',expectedRevision:newer.revision})
    assert.equal(saved.apiKey,'new-secret');assert.equal(saved.maxOutputTokens,2048)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('legacy models acquire a revision on first edit and stale legacy editors are rejected',()=>{
  const {root,store,model}=fixture()
  try{
    const {revision,...legacy}=model;json(store.file('models.json'),[legacy])
    const saved=store.saveModel({id:model.id,name:'New',expectedRevision:''});assert(saved.revision)
    assert.throws(()=>store.saveModel({id:model.id,name:'Stale',expectedRevision:''}),/其他窗口/)
    assert.throws(()=>store.saveModel({id:model.id,expectedRevision:123}),/其他窗口/)
    assert.equal(store.models()[0].name,'New')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('account and Go configuration writes respect the shared configuration lock',()=>{
  const {root,store,model}=fixture()
  try{
    store.saveModel({id:'two',name:'Two',model:'two',baseUrl:'http://127.0.0.1:1'})
    store.saveAccount('two',model.id)
    assert.throws(()=>store.saveAccount(model.id,model.id),/其他窗口/)
    assert.equal(store.account().defaultModelId,'two')
    fs.mkdirSync(store.file('.memory-lock'));json(store.file('.memory-lock','owner.json'),{pid:process.pid})
    const before=store.text('models.json'),keys=store.text('provider-keys.json')
    for(const operation of [()=>store.saveModel({id:model.id,name:'Bad'}),()=>store.saveAccount(model.id),()=>store.saveGo('blocked-secret',['test'])])assert.throws(operation,error=>error instanceof HttpError&&error.status===409)
    assert.equal(store.text('models.json'),before);assert.equal(store.text('provider-keys.json'),keys)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('HTTP model conflict responses preserve secrets and public revisions survive restart',async()=>{
  const {root,store,model}=fixture(),app=createApp(root,{seed:false})
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address();assert(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}`
  const put=(route:string,body:unknown)=>fetch(base+route,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  try{
    const first=await put('/api/models',{id:model.id,apiKey:'replacement-secret',expectedRevision:model.revision});assert.equal(first.status,200)
    const body=await first.text();assert(!body.includes('replacement-secret'));assert(!body.includes('original-secret'))
    const saved=JSON.parse(body) as {revision:string;apiKey:string;hasKey:boolean};assert(saved.revision);assert.equal(saved.apiKey,'');assert(saved.hasKey)
    const stale=await put('/api/models',{id:model.id,name:'Stale',expectedRevision:model.revision});assert.equal(stale.status,409)
    const account=await put('/api/account',{defaultModelId:'',expectedModelId:'stale'});assert.equal(account.status,409)
    const state=await (await fetch(base+'/api/state')).text();assert(!state.includes('replacement-secret'));assert(state.includes(saved.revision))
    assert.equal(new Store(root).models()[0].revision,saved.revision);assert.equal(store.models()[0].apiKey,'replacement-secret')
  }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}
})
