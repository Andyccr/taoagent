import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {createApp} from '../app.ts'
import {json} from '../store.ts'
import {collaborationHealth,type CollaborativeTask} from '../collaboration.ts'

function temp(){fs.mkdirSync('.test-tmp',{recursive:true});return fs.mkdtempSync(path.resolve('.test-tmp','task-controls-'))}
async function listen(server:http.Server){server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address==='object');return `http://127.0.0.1:${address.port}`}
async function close(server:http.Server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
async function request(base:string,route:string,method='GET',body?:unknown){return fetch(base+route,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})}

test('users create, reassign, cancel, reopen and review task group work over HTTP',async()=>{
 const root=temp(),app=createApp(root,{seed:false})
 try{
  app.store.saveAgent({id:'peer',name:'同事'},'','')
  app.store.saveAgent({id:'outsider',name:'外部'},'','')
  const base=await listen(app.server)
  const createdGroup=await request(base,'/api/groups','POST',{name:'工作组',memberIds:['main','peer'],componentKind:'task'})
  assert.equal(createdGroup.status,201)
  const group=await createdGroup.json() as {id:string}
  const collection=`/api/chats/${group.id}/tasks`,file=app.store.file('chats',group.id,'tasks.json')
  const create=async(title:string,assigneeId:string,extra:Record<string,unknown>={})=>{
    const response=await request(base,collection,'POST',{action:'create',title,assigneeId,...extra})
    assert.equal(response.status,200)
    return await response.json() as {task:CollaborativeTask;tasks:CollaborativeTask[]}
  }
  const first=await create('准备报告','peer',{description:'整理结果',acceptanceCriteria:'包含结论',requireReview:true})
  assert.equal(first.task.status,'pending');assert.equal(first.task.fromAgentId,'user');assert.equal(first.task.assigneeId,'peer')
  assert.equal(first.task.description,'整理结果');assert.equal(first.task.acceptanceCriteria,'包含结论');assert.equal(first.task.requireReview,true)
  assert.deepEqual(first.task.assignmentHistory,[])
  const taskId=first.task.id
  assert.equal((await request(base,collection,'POST',{action:'create',title:'外部任务',assigneeId:'outsider'})).status,400)

  json(file,[...first.tasks,{id:'dependent',title:'后续工作',fromAgentId:'user',assigneeId:'main',status:'pending',dependsOnTaskIds:[taskId],at:new Date().toISOString()}])
  let all=JSON.parse(app.store.text('chats',group.id,'tasks.json')) as CollaborativeTask[]
  let health=collaborationHealth(app.store,group.id,undefined,all)
  assert.deepEqual(health.pendingTasks.find(item=>item.id==='dependent')?.blockedBy,[taskId])

  let response=await request(base,`${collection}/${taskId}`,'POST',{action:'reassign',assigneeId:'main',reason:'换人',expectedStatus:'pending'})
  assert.equal(response.status,200)
  let payload=await response.json() as {task:CollaborativeTask;tasks:CollaborativeTask[]}
  assert.equal(payload.task.assigneeId,'main')
  assert.equal(payload.task.assignmentHistory?.[0].assigneeId,'peer');assert.equal(payload.task.assignmentHistory?.[0].reason,'换人')

  response=await request(base,`${collection}/${taskId}`,'POST',{action:'reassign',assigneeId:'peer',reason:'再换',expectedStatus:'complete'})
  assert.equal(response.status,409);assert.equal((await response.json() as {error:string}).error,'任务已被更新，请刷新')

  response=await request(base,`${collection}/${taskId}`,'POST',{action:'cancel',reason:'不再需要',expectedStatus:'pending'})
  assert.equal(response.status,200)
  payload=await response.json() as {task:CollaborativeTask;tasks:CollaborativeTask[]}
  assert.equal(payload.task.status,'cancelled');assert.equal(payload.task.cancelledReason,'不再需要')
  all=JSON.parse(app.store.text('chats',group.id,'tasks.json')) as CollaborativeTask[]
  health=collaborationHealth(app.store,group.id,undefined,all)
  assert(!health.pendingTasks.some(item=>item.id===taskId))
  assert.deepEqual(health.pendingTasks.find(item=>item.id==='dependent')?.blockedBy,[])

  response=await request(base,`${collection}/${taskId}`,'POST',{action:'reopen',expectedStatus:'cancelled'})
  assert.equal(response.status,200)
  payload=await response.json() as {task:CollaborativeTask;tasks:CollaborativeTask[]}
  assert.equal(payload.task.status,'pending');assert(!('cancelledReason' in payload.task))
  health=collaborationHealth(app.store,group.id,undefined,payload.tasks)
  assert.deepEqual(health.pendingTasks.find(item=>item.id==='dependent')?.blockedBy,[taskId])

  all=JSON.parse(app.store.text('chats',group.id,'tasks.json')) as CollaborativeTask[]
  let target=all.find(item=>item.id===taskId)!
  target.status='complete';target.result='GOOD_RESULT';target.review={status:'awaiting_review',at:new Date().toISOString()}
  json(file,all)
  response=await request(base,`${collection}/${taskId}`,'POST',{action:'review',decision:'changes_requested',reason:'缺少证据',expectedStatus:'complete'})
  assert.equal(response.status,200)
  payload=await response.json() as {task:CollaborativeTask;tasks:CollaborativeTask[]}
  assert.equal(payload.task.status,'pending');assert.equal(payload.task.result,undefined)
  assert.equal(payload.task.review?.status,'changes_requested');assert.equal(payload.task.review?.reviewerId,'user')
  assert.equal(payload.task.resultHistory?.[0].result,'GOOD_RESULT');assert.equal(payload.task.resultHistory?.[0].review?.status,'awaiting_review')

  all=JSON.parse(app.store.text('chats',group.id,'tasks.json')) as CollaborativeTask[]
  target=all.find(item=>item.id===taskId)!
  target.status='complete';target.result='GOOD_RESULT';target.review={status:'awaiting_review',at:new Date().toISOString()}
  json(file,all)
  response=await request(base,`${collection}/${taskId}`,'POST',{action:'review',decision:'accepted',reason:'已核对',expectedStatus:'complete'})
  assert.equal(response.status,200)
  payload=await response.json() as {task:CollaborativeTask;tasks:CollaborativeTask[]}
  assert.equal(payload.task.status,'complete');assert.equal(payload.task.result,'GOOD_RESULT')
  assert.equal(payload.task.review?.status,'accepted');assert.equal(payload.task.review?.reviewerId,'user')

  const emergentGroup=await request(base,'/api/groups','POST',{name:'涌现群',memberIds:['main','peer'],componentKind:'emergent'})
  assert.equal(emergentGroup.status,201)
  const emergent=await emergentGroup.json() as {id:string}
  const denied=await request(base,`/api/chats/${emergent.id}/tasks`,'POST',{action:'create',title:'任务',assigneeId:'peer'})
  assert.equal(denied.status,400)
 }finally{await close(app.server);fs.rmSync(root,{recursive:true,force:true})}
})
