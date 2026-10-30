import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {createApp} from '../release/server.mjs'

test('portable bundle reports a missing Windows CLI as failed, rather than a successful empty command',async()=>{
  if(process.platform!=='win32')return
  const root=fs.mkdtempSync(path.resolve('.cli-check-')),app=createApp(root,{seed:false}),oldPath=process.env.PATH
  const upstream=http.createServer(async(req,res)=>{
    let raw='';for await(const part of req)raw+=part
    const body=JSON.parse(raw),afterTool=body.messages.some(message=>message.role==='tool')
    const delta=afterTool?{content:'命令未能执行，不能声称安装或验证成功。'}:{tool_calls:[{index:0,id:'cli',function:{name:'run_cli',arguments:JSON.stringify({cli:'git',args:['--version']})}}]}
    res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta,finish_reason:afterTool?'stop':'tool_calls'}]})+'\n\ndata: [DONE]\n\n')
  })
  const listen=async(server)=>{server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port}
  const close=async(server)=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
  try{
    const modelUrl=await listen(upstream),base=await listen(app.server)
    app.store.saveModel({name:'fixture',model:'mock',baseUrl:modelUrl})
    const chat=app.store.directSession('main'),headers={'Content-Type':'application/json'}
    process.env.PATH=process.env.SystemRoot+'\\System32;'+process.env.SystemRoot+'\\System32\\WindowsPowerShell\\v1.0'
    const response=await fetch(base+'/api/chats/'+chat.id+'/chat',{method:'POST',headers,body:JSON.stringify({content:'验证 CLI 是否可用'})}),completion=response.text()
    let action
    for(let step=0;step<100&&!action;step++){const all=await(await fetch(base+'/api/chats/'+chat.id+'/actions')).json();action=all.find(item=>item.status==='pending');if(!action)await new Promise(resolve=>setTimeout(resolve,10))}
    assert(action,'CLI approval was not emitted')
    await fetch(base+'/api/chats/'+chat.id+'/actions',{method:'POST',headers,body:JSON.stringify({actionId:action.id,approve:true})})
    assert((await completion).includes('"type":"done"'))
    const all=await(await fetch(base+'/api/chats/'+chat.id+'/actions')).json()
    assert.equal(all[0].status,'failed');assert.notEqual(all[0].result.exitCode,0)
  }finally{process.env.PATH=oldPath;for(const controller of app.active.values())controller.abort();await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
