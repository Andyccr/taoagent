import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {once} from 'node:events'
import {createApp} from '../app.ts'

test('HTTP improvement authorization requires explicit bounded criteria and stop persists revocation',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tao-improvement-api-')),app=createApp(root,{seed:false})
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address();assert(address&&typeof address==='object')
  const key=app.store.directSession('main').id,url='http://127.0.0.1:'+address.port+'/api/chats/'+key+'/improvement'
  const post=(body:unknown)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  try{
    assert.equal((await post({})).status,400)
    const idleStop=await post({operation:'stop'});assert.equal(idleStop.status,200);assert.equal((await idleStop.json()).status,'stopped')
    const catalog=await(await fetch(url)).json()
    assert(catalog.scope.includes('runtime.ts'));assert(catalog.scope.includes('store.ts'))
    assert(!catalog.scope.includes('execution.ts'));assert(catalog.acceptanceTests.includes('tests/evolution.test.ts'))
    const grant=await post({objective:'improve context',acceptanceCriteria:'retain instructions',acceptanceTests:['tests/concurrent-chat.test.ts'],scope:['context.ts'],maxIterations:2,maxModelCalls:4,maxToolCalls:6,maxTokens:10000,maxMinutes:1});assert.equal(grant.status,200)
    const saved=await grant.json();assert.equal(saved.status,'active');assert.equal(saved.iterations,0)
    assert.equal((await post({operation:'stop'})).status,200)
    const state=await (await fetch(url)).json();assert.equal(state.session.status,'stopped');assert.deepEqual(state.session.scope,['context.ts']);assert.equal(state.session.maxModelCalls,4)
    const foreign=await fetch(url,{method:'POST',headers:{Origin:'https://foreign.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(foreign.status,403)
  }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}
})
