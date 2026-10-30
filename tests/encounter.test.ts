import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {Store} from '../store.ts'
import {lifeState} from '../social-state.ts'
import {chooseLifeActor} from '../social.ts'
test('daily attention follows explicit public invitations and due agendas while equal conditions rotate',()=>{
  fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','encounter-')),store=new Store(root)
  try{store.saveAgent({id:'peer',name:'同伴'},'','');const group=store.saveGroup('空间',['main','peer']),state=lifeState(store,group.id),members=['main','peer'],now=Date.now(),name=(id:string)=>id==='peer'?'同伴':'助手';const message={id:'m',at:new Date(now).toISOString(),content:'@同伴 你怎么看这个问题？'}
    assert.equal(chooseLifeActor(members,state,[message],now,name),'peer');state.members.push({agentId:'peer',interests:'',attention:'',stance:'',readIds:['m']});assert.equal(chooseLifeActor(members,state,[],now,name),'main');state.cursor=1;assert.equal(chooseLifeActor(members,state,[],now,name),'peer');state.agendas.push({id:'agenda',ownerId:'main',title:'等待的问题',question:'核对结果',status:'waiting',wakeAt:new Date(now-1).toISOString(),sourceIds:[],createdAt:message.at,updatedAt:message.at});assert.equal(chooseLifeActor(members,state,[message],now,name),'main')
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
