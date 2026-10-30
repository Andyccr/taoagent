import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {Store} from '../store.ts'
import {installRoleplay} from '../roleplay.ts'

test('explicit roleplay setup creates two performers and a shared stage without changing other model capabilities',()=>{
  fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','roleplay-')),store=new Store(root)
  try{
    store.saveModel({id:'source',name:'原模型',model:'mock',baseUrl:'http://127.0.0.1:1',toolsEnabled:true,apiKey:'fixture-key'})
    const value=installRoleplay(store,'source');assert.equal(value.agents.length,2);assert.equal(store.models().find(item=>item.id==='source')?.toolsEnabled,true);assert.equal(store.models().find(item=>item.id===value.modelId)?.toolsEnabled,false);assert.deepEqual(store.groupMembers(value.groupId),value.agents);assert.equal(store.session(value.groupId).replyMode,'round');assert(!store.text('chats',value.groupId,'social','state.json'))
    const own=store.directSession(value.agents[0]),peer=store.directSession(value.agents[1]);store.append(own.id,'user','只属于绮月的故事');assert(!JSON.stringify(store.messages(peer.id)).includes('只属于绮月的故事'))
    const agent=store.agent(value.agents[0]);store.saveAgent({...agent,name:'我修改的角色'},'用户修改的设定','用户自己的故事记忆');store.append(value.groupId,'user','已经开始的故事')
    const again=installRoleplay(store,'source');assert.equal(again.groupId,value.groupId);assert.equal(store.agent(agent.id).name,'我修改的角色');assert.equal(store.text('agents',agent.id,'RULES.md'),'用户修改的设定');assert.equal(store.text('agents',agent.id,'MEMORY.md'),'用户自己的故事记忆');assert.equal(store.messages(value.groupId).length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
