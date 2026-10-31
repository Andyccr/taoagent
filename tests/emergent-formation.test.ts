import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {Store} from '../store.ts'
import {lifeState,saveLifePolicy} from '../social-state.ts'
import {createLifeScheduler} from '../social.ts'

function fixture(members=['main','peer','other']){
  fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','emergent-')),store=new Store(root)
  for(const [id,name] of [['peer','伙伴'],['other','同事'],['fourth','第四位']])store.saveAgent({id,name},'独立判断','')
  const group=store.saveGroup('共同生活',members,undefined,{componentKind:'emergent'})
  return {root,store,key:group.id}
}
function enable(store:Store,key:string){saveLifePolicy(store,key,{expected:lifeState(store,key).revision,enabled:true,quietStart:0,quietEnd:0})}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
interface RequestBody {messages:{role:string;content:string}[];model:string}
async function request(req:http.IncomingMessage):Promise<RequestBody>{let text='';for await(const chunk of req)text+=chunk;return JSON.parse(text) as RequestBody}
function respond(res:http.ServerResponse,value:string){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:value},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}})+'\n\ndata: [DONE]\n\n')}
const form=(memberIds:string[],title='深夜研究',contribution='我们把共同问题想深一点。')=>JSON.stringify({action:'form_group',thought:'我们几个正好有共同问题，值得单独深入。',attention:'共同问题',stance:'值得继续',contribution,sourceIds:[],memberIds,title})
function modelServer(forms:string[]){
  let planned=0
  const server=http.createServer(async(req,res)=>{
    const body=await request(req),text=JSON.stringify(body.messages)
    if(text.includes('独立思考阶段没有工具')){respond(res,forms[Math.min(planned,forms.length-1)]);planned++;return}
    if(text.includes('这次是群聊旁听的接话判断')){respond(res,'PASS');return}
    respond(res,'我同意，我们可以先从一个具体分歧开始。')
  })
  return {server,planned:()=>planned}
}
test('a valid form_group creates one emergent group, a source activity and an opening message',async()=>{
  const f=fixture(),events:Record<string,unknown>[]=[],mock=modelServer([form(['peer','ghost'])])
  const scheduler=createLifeScheduler(f.store,new Map(),(_,event)=>events.push(event))
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(mock.server)});enable(f.store,f.key)
    assert((await scheduler.tick(Date.now(),f.key,'main')).started)
    const groups=f.store.sessions().filter(item=>item.originSessionId===f.key)
    assert.equal(groups.length,1)
    const group=groups[0]
    assert.deepEqual(group.memberIds,['main','peer']);assert.equal(group.formedBy,'main');assert.equal(group.componentKind,'emergent');assert.equal(group.title,'深夜研究')
    const activity=f.store.messages(f.key).find(item=>item.kind==='activity')
    assert(activity&&activity.content.includes('助手')&&activity.content.includes('伙伴')&&activity.content.includes('深夜研究'))
    const opening=f.store.messages(group.id).find(item=>item.kind==='activity'&&item.agentId==='main')
    assert.equal(opening?.content,'我们把共同问题想深一点。')
    const state=lifeState(f.store,f.key)
    assert.equal(state.runs[0].status,'complete');assert.equal(state.runs[0].action,'form_group');assert.equal(state.runs[0].formedGroupId,group.id);assert.equal(state.policy.enabled,true)
    const groupTurn=f.store.turns(group.id)[0]
    assert.equal(state.runs[0].actualCalls,1+(groupTurn.usage?.modelCalls||0));assert.equal(state.runs[0].reservedCalls,1+(groupTurn.usage?.modelCalls||0))
    assert(events.some(item=>item.type==='group_created'))
    assert.equal(lifeState(f.store,group.id).policy.enabled,false)
  }finally{scheduler.stop();await close(mock.server);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('out-of-space, full-space and single-member proposals downgrade to reflect without a group or pause',async()=>{
  const f=fixture(),mock=modelServer([form(['ghost']),form(['peer','other'])]),scheduler=createLifeScheduler(f.store,new Map())
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(mock.server)});enable(f.store,f.key)
    assert((await scheduler.tick(Date.now(),f.key,'main')).started)
    assert((await scheduler.tick(Date.now(),f.key,'main')).started)
    assert.equal(f.store.sessions().filter(item=>item.originSessionId===f.key).length,0)
    const state=lifeState(f.store,f.key)
    assert.deepEqual(state.runs.map(item=>item.action),['reflect','reflect'])
    assert(state.runs.every(item=>item.status==='complete'));assert.equal(state.policy.enabled,true)
  }finally{scheduler.stop();await close(mock.server);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('at most two emergent groups form from one space per day',async()=>{
  const f=fixture(['main','peer','other','fourth']),mock=modelServer([form(['peer'],'第一次'),form(['other'],'第二次'),form(['fourth'],'第三次')]),scheduler=createLifeScheduler(f.store,new Map())
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(mock.server)});enable(f.store,f.key)
    for(let index=0;index<3;index++)assert((await scheduler.tick(Date.now(),f.key,'main')).started)
    assert.equal(f.store.sessions().filter(item=>item.originSessionId===f.key).length,2)
    const state=lifeState(f.store,f.key)
    assert.deepEqual(state.runs.map(item=>item.action),['form_group','form_group','reflect']);assert.equal(state.policy.enabled,true)
  }finally{scheduler.stop();await close(mock.server);fs.rmSync(f.root,{recursive:true,force:true})}
})
test('task groups never form emergent groups',async()=>{
  const f=fixture(),task=f.store.saveGroup('任务组',['main','peer','other'],undefined,{componentKind:'task'}),mock=modelServer([form(['peer'])]),scheduler=createLifeScheduler(f.store,new Map())
  try{
    f.store.saveModel({name:'mock',model:'mock',baseUrl:await listen(mock.server)})
    assert.equal((await scheduler.tick(Date.now(),task.id,'main')).started,false)
    assert.equal(mock.planned(),0);assert.equal(f.store.sessions().filter(item=>item.originSessionId===task.id).length,0);assert.equal(lifeState(f.store,task.id).policy.enabled,false)
  }finally{scheduler.stop();await close(mock.server);fs.rmSync(f.root,{recursive:true,force:true})}
})
