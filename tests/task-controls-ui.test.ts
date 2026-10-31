import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const client=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
const between=(start:string,end:string)=>client.slice(client.indexOf(start),client.indexOf(end))

test('work panel task actions post to the task endpoint with the current status and refresh around the fingerprint cache',()=>{
 const source=between('async function taskRequest(','function appendTaskCreateForm(')
 assert.match(source,/\/api\/chats\/\$\{key\}\/tasks\/\$\{task\.id\}/)
 assert.match(source,/expectedStatus:task\.status/)
 for(const action of ['reassign','cancel','reopen','review'])assert.match(source,new RegExp("action:'"+action+"'"))
 for(const decision of ['accepted','changes_requested'])assert.match(source,new RegExp("decision:'"+decision+"'"))
 assert.match(source,/delete box\.dataset\.fingerprint/)
 assert.match(source,/await refreshWork\(\)/)
 assert.match(source,/isBusy\(\)/)
})

test('cancelled tasks are excluded from the pending count while review work stays pending',()=>{
 const line=client.split('\n').find(value=>value.includes('待办'))
 assert(line)
 const declaration=line.slice(line.indexOf('const pendingTasks='),line.indexOf("$('#work-count')"))
 assert.match(declaration,/task\.status!=='cancelled'/)
 const sandbox={tasks:[
  {status:'pending'},
  {status:'cancelled'},
  {status:'complete',requireReview:true,review:{status:'awaiting_review'}},
  {status:'complete',requireReview:true,review:{status:'accepted'}},
  {status:'complete'},
  {status:'complete',requireReview:true,review:{status:'changes_requested'}},
 ]}
 vm.runInNewContext(declaration+'\nthis.count=pendingTasks.length',sandbox)
 assert.equal((sandbox as {count:number}).count,3)
})

test('task groups render a create form that posts to the tasks collection',()=>{
 const source=between('function appendTaskCreateForm(','async function refreshWork(')
 assert.match(source,/\/api\/chats\/\$\{key\}\/tasks/)
 assert.match(source,/,'POST',data\)/)
 assert.match(source,/maxLength=200/)
 assert.match(source,/name='acceptanceCriteria'/)
 assert.match(source,/name='requireReview'/)
 assert.match(source,/current\.memberIds/)
 assert.match(source,/delete box\.dataset\.fingerprint/)
 assert.match(source,/await refreshWork\(\)/)
 const work=between('async function refreshWork(','let collaborationLoading')
 assert.match(work,/componentType\(current\)==='task'/)
 assert.match(work,/if\(taskGroup\)appendTaskCreateForm\(box,key\)/)
 assert.match(work,/if\(taskGroup\)appendTaskControls\(row,task,key\)/)
})
