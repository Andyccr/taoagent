import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {Store,json} from '../store.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','integrity-')),store=new Store(root);store.saveModel({id:'first',name:'first',model:'first',baseUrl:'http://127.0.0.1:1'});store.saveModel({id:'second',name:'second',model:'second',baseUrl:'http://127.0.0.1:1'});store.saveAgent({id:'peer',name:'同事',modelId:'first',background:'新背景',responsibilities:'新职责'},'当前提示词','当前记忆');return {root,store}}

test('model-only updates preserve current identity, prompt and memory and reject stale or invalid choices',()=>{
  const {root,store}=fixture()
  try{
    const other=new Store(root);other.saveAgent({...other.agent('peer'),name:'新名字',background:'另一个窗口的背景'},'另一个窗口的提示词','另一个窗口的记忆')
    store.saveAgentModel('peer','second','first')
    assert.equal(store.agent('peer').name,'新名字');assert.equal(store.agent('peer').background,'另一个窗口的背景');assert.equal(store.agent('peer').responsibilities,'新职责')
    assert.equal(store.text('agents','peer','RULES.md'),'另一个窗口的提示词');assert.equal(store.text('agents','peer','MEMORY.md'),'另一个窗口的记忆')
    const before=store.text('agents','peer','agent.json'),memory=store.text('agents','peer','MEMORY.md')
    assert.throws(()=>store.saveAgentModel('peer','first','first'),/其他窗口/)
    assert.throws(()=>store.saveAgentModel('peer','missing','second'),/模型不存在/)
    assert.equal(store.text('agents','peer','agent.json'),before);assert.equal(store.text('agents','peer','MEMORY.md'),memory)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('storage-level optimistic checks protect model and profile fields before changing prompt or memory',()=>{
  const {root,store}=fixture()
  try{
    const stale=store.agent('peer'),beforeRules=store.text('agents','peer','RULES.md'),beforeMemory=store.text('agents','peer','MEMORY.md')
    new Store(root).saveAgentModel('peer','second','first')
    assert.throws(()=>store.saveAgent(stale,'旧编辑覆盖提示词','旧编辑覆盖记忆',{modelId:'first'}),/已更新/)
    assert.throws(()=>store.saveAgent({...store.agent('peer'),background:'错误覆盖'},'坏提示词','坏记忆',{background:'旧背景'}),/已更新/)
    assert.throws(()=>store.saveAgent({...store.agent('peer'),responsibilities:'错误覆盖'},'坏提示词','坏记忆',{responsibilities:'旧职责'}),/已更新/)
    assert.equal(store.agent('peer').modelId,'second');assert.equal(store.agent('peer').background,'新背景');assert.equal(store.agent('peer').responsibilities,'新职责')
    assert.equal(store.text('agents','peer','RULES.md'),beforeRules);assert.equal(store.text('agents','peer','MEMORY.md'),beforeMemory)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('global profile validates all expected fields before writing and preserves original backups',()=>{
  const {root,store}=fixture()
  try{
    const before={profile:store.text('PROFILE.md'),rules:store.text('RULES.md'),memory:store.text('MEMORY.md')}
    new Store(root).saveProfile({memory:'另一窗口的新记忆'},before)
    assert.throws(()=>store.saveProfile({profile:'不应覆盖',rules:'不应覆盖',memory:'旧记忆'},before),/其他窗口/)
    assert.equal(store.text('PROFILE.md'),before.profile);assert.equal(store.text('RULES.md'),before.rules);assert.equal(store.text('MEMORY.md'),'另一窗口的新记忆')
    const backups=fs.readdirSync(store.file('profile-history'));assert.equal(backups.length,1);assert.equal(fs.readFileSync(store.file('profile-history',backups[0]),'utf8'),before.memory)
    store.saveProfile({memory:'另一窗口的新记忆'});assert.equal(fs.readdirSync(store.file('profile-history')).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('group model changes preserve current group fields, advance revision and reject stale editors',()=>{
  const {root,store}=fixture()
  try{
    const group=store.saveGroup('讨论',['main','peer'],undefined,{purpose:'原目标',discussionMode:'open'})
    const other=new Store(root);other.saveGroup('新名称',['main','peer'],group.id,{purpose:'新目标',memberRoles:{peer:'新职责'}})
    const current=store.session(group.id),updated=store.saveGroupModel(group.id,'second','')
    assert.equal(updated.title,'新名称');assert.equal(updated.purpose,'新目标');assert.equal(updated.memberRoles?.peer,'新职责');assert(Date.parse(updated.updatedAt)>Date.parse(current.updatedAt))
    assert.throws(()=>store.saveGroupModel(group.id,'first',''),/其他窗口/)
    assert.throws(()=>store.saveGroupModel(group.id,'missing','second'),/有效的群模型/)
    assert.throws(()=>store.saveGroup('旧名称',['main','peer'],group.id,{},undefined,current.updatedAt),/群设置/)
    assert.equal(store.saveGroupModel(group.id,'second','second').updatedAt,updated.updatedAt)
    assert.equal(store.session(group.id).modelId,'second')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})

test('global profile and group preference updates honor another writer lock without partial changes',()=>{
  const {root,store}=fixture()
  try{
    const group=store.saveGroup('讨论',['main','peer']),profile=store.text('PROFILE.md')
    for(const dir of [root,store.file('chats',group.id)]){
      const lock=path.join(dir,'.memory-lock');fs.mkdirSync(lock);json(path.join(lock,'owner.json'),{pid:process.pid})
      try{if(dir===root)assert.throws(()=>store.saveProfile({profile:'不应写入'}),/另一窗口/);else assert.throws(()=>store.saveGroupModel(group.id,'second'),/另一窗口/)}finally{fs.rmSync(lock,{recursive:true})}
    }
    assert.equal(store.text('PROFILE.md'),profile);assert.equal(store.session(group.id).modelId,'')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
