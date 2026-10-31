import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {Store,HttpError} from '../store.ts'
import {tasks} from '../runtime.ts'
import {actions} from '../execution.ts'
import {cityConfig} from '../components.ts'
import {lifeState} from '../social-state.ts'

function fixture(){
  fs.mkdirSync('.test-tmp',{recursive:true})
  const root=fs.mkdtempSync(path.resolve('.test-tmp','resilience-'))
  const store=new Store(root)
  store.saveAgent({id:'peer',name:'Peer'},'hello','')
  return {root,store}
}
function backups(file:string){
  const name=path.basename(file)+'.corrupt-'
  return fs.readdirSync(path.dirname(file)).filter(item=>item.startsWith(name))
}

test('a corrupt message line is skipped, preserved, and append still works',()=>{
  const {root,store}=fixture()
  try{
    const group=store.saveGroup('History',['main','peer'])
    store.append(group.id,'user','first')
    const file=store.file('chats',group.id,'messages.jsonl')
    fs.appendFileSync(file,'{"broken":\n')
    assert.deepEqual(store.messages(group.id).map(message=>message.content),['first'])
    store.append(group.id,'assistant','second')
    assert.deepEqual(store.messages(group.id).map(message=>message.content),['first','second'])
    assert(fs.readFileSync(file,'utf8').includes('{"broken":\n'))
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('corrupt tasks.json returns no tasks and keeps a backup copy',()=>{
  const {root,store}=fixture()
  try{
    const group=store.saveGroup('Tasks',['main','peer'])
    const file=store.file('chats',group.id,'tasks.json')
    fs.writeFileSync(file,'{"broken"')
    assert.deepEqual(tasks(store,group.id),[])
    assert.equal(backups(file).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('corrupt social state returns the default life state and keeps a backup copy',()=>{
  const {root,store}=fixture()
  try{
    const group=store.saveGroup('Living',['main','peer'])
    const file=store.file('chats',group.id,'social','state.json')
    fs.mkdirSync(path.dirname(file),{recursive:true})
    fs.writeFileSync(file,'{bad')
    const state=lifeState(store,group.id)
    assert.equal(state.version,1)
    assert.equal(state.revision,'new')
    assert.deepEqual(state.members,[])
    assert.deepEqual(state.entries,[])
    assert.equal(state.policy.enabled,false)
    assert.equal(backups(file).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('corrupt empire-city.json returns the default city config and keeps a backup copy',()=>{
  const {root,store}=fixture()
  try{
    const file=store.file('empire-city.json')
    fs.writeFileSync(file,'not json')
    const config=cityConfig(store)
    assert.equal(config.name,'City · 共同生活')
    assert.equal(config.leadAgentId,'main')
    assert.equal(backups(file).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('corrupt session actions return an empty list and keep a backup copy',()=>{
  const {root,store}=fixture()
  try{
    const group=store.saveGroup('Actions',['main','peer'])
    const file=store.file('chats',group.id,'actions.json')
    fs.writeFileSync(file,'{"broken"')
    assert.deepEqual(actions(store,group.id),[])
    assert.equal(backups(file).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('profile texts longer than 200000 characters are rejected',()=>{
  const {root,store}=fixture()
  try{
    for(const key of ['profile','rules','memory'] as const){
      assert.throws(()=>store.saveProfile({[key]:'x'.repeat(200001)}),error=>error instanceof HttpError&&error.status===400&&/过长/.test(error.message))
    }
    assert.notEqual(store.text('PROFILE.md'),'x'.repeat(200001))
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
