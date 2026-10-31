import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {once} from 'node:events'
import {Store,json} from '../store.ts'
import {spaceBrief} from '../space.ts'
import {recordLife,changeLife,saveLifeAgenda} from '../social-state.ts'
import {createApp} from '../app.ts'
import vm from 'node:vm'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','space-')),store=new Store(root);store.saveAgent({id:'peer',name:'伙伴'},'PRIVATE_RULE','PRIVATE_MEMORY');const group=store.saveGroup('共同空间',['main','peer']);return{root,store,key:group.id}}
test('space selector synchronizes the underlying target once and approvals open their actual control dialog',async()=>{
  const source=fs.readFileSync('public/client.js','utf8'),handlers=new Map<string,(event:{detail:string})=>Promise<void>|void>(),opened:unknown[]=[],panels:string[]=[]
  const context=vm.createContext({window:{addEventListener:(name:string,callback:(event:{detail:string})=>Promise<void>|void)=>handlers.set(name,callback)},target:{type:'group',id:'old'},current:{id:'old'},openTarget:async(value:{type:string;id:string})=>{opened.push(value);context.target=value;context.current={id:value.id}},openConversationControl:async(panel:string)=>{panels.push(panel)},toast:()=>{}})
  vm.runInContext(source.split('\n').filter(line=>line.startsWith("window.addEventListener('tao-select-group'")||line.startsWith("window.addEventListener('tao-work-open'")).join('\n'),context)
  await handlers.get('tao-select-group')!({detail:'new'});await handlers.get('tao-select-group')!({detail:'new'});assert.equal(opened.length,1);assert.equal(context.current.id,'new')
  await handlers.get('tao-work-open')!({detail:'work-space'});assert.equal(context.current.id,'work-space');assert.deepEqual(panels,['#work-panel'])
})
test('pending task loads in an old space do not block or overwrite a newly selected space',async()=>{
  const source=fs.readFileSync('public/client.js','utf8'),requests=new Map<string,(value:unknown[])=>void>(),box={dataset:{} as Record<string,string>,replaceChildren(){},append(){}},panel={hidden:true},count={textContent:''}
  const inspected:string[]=[]
  const context=vm.createContext({inspectorWork:null,renderInspector:()=>{inspected.push((context.inspectorWork as {key:string}|null)?.key||'none')},current:{id:'old'},workLoading:new Set(),expandedActionChats:new Set(),state:{agents:[]},api:(url:string)=>new Promise(resolve=>requests.set(url,resolve)),document:{createElement:()=>({textContent:'',className:''})},syncAttention:()=>{},$:(selector:string)=>selector==='#work-items'?box:selector==='#work-panel'?panel:count})
  vm.runInContext(source.slice(source.indexOf('function visibleActions('),source.indexOf('let collaborationLoading='))+'\nglobalThis.refresh=refreshWork',context)
  const first=context.refresh() as Promise<void>;context.current={id:'new'};const next=context.refresh() as Promise<void>;assert.equal(requests.size,4)
  requests.get('/api/chats/new/actions')!([]);requests.get('/api/chats/new/tasks')!([]);await next;assert(box.dataset.fingerprint.includes('new'));assert.equal(panel.hidden,false)
  requests.get('/api/chats/old/actions')!([]);requests.get('/api/chats/old/tasks')!([]);await first;assert(box.dataset.fingerprint.includes('new'));assert.deepEqual(inspected,['new']);assert.equal((context.inspectorWork as {key:string}).key,'new')
})
test('space board distinguishes accepted, review, dependencies and departed owners without assuming completion',()=>{
  const f=fixture();try{
    json(f.store.file('chats',f.key,'tasks.json'),[
      {id:'a',title:'基础结果',status:'complete',requireReview:true,review:{status:'changes_requested'},assigneeId:'peer'},
      {id:'b',title:'后续工作',status:'pending',assigneeId:'main',dependsOnTaskIds:['a']},
      {id:'c',title:'等待验收',status:'complete',requireReview:true,review:{status:'awaiting_review'},assigneeId:'peer'},
      {id:'d',title:'已验收',status:'complete',requireReview:true,review:{status:'accepted'},assigneeId:'peer'},
      {id:'e',title:'无人负责',status:'pending',assigneeId:'departed'}
    ])
    const value=spaceBrief(f.store,f.key);assert.deepEqual(value.work.map(item=>item.stage),['ready','blocked','review','done','ready']);assert.deepEqual(value.work[1].blockedBy,['a']);assert(value.attention.some(item=>item.kind==='assignment'));assert(value.attention.some(item=>item.kind==='review'))
    const revision=value.revision;json(f.store.file('chats',f.key,'tasks.json'),[]);assert.notEqual(spaceBrief(f.store,f.key).revision,revision)
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('lineage connects only explicit public citations and preserves private context boundaries',()=>{
  const f=fixture();try{
    const publicMessage=f.store.append(f.key,'assistant','公开证据'),partial=f.store.append(f.key,'assistant','未完成秘密','interrupted')
    const other=f.store.saveGroup('其他空间',['main','peer']),foreign=f.store.append(other.id,'assistant','FOREIGN_SECRET')
    const original=recordLife(f.store,f.key,'main',{text:'先前解释',sourceIds:[publicMessage.id]})
    changeLife(f.store,f.key,state=>{state.entries.push({id:'new-explanation',agentId:'main',at:new Date().toISOString(),kind:'reflection',text:'已修正的解释',sourceIds:[publicMessage.id,partial.id,foreign.id],supersedes:original.id})})
    saveLifeAgenda(f.store,f.key,'peer',{title:'继续追问',question:'如何核对解释？'})
    const value=spaceBrief(f.store,f.key),encoded=JSON.stringify(value);assert(value.graph.edges.some(item=>item.to==='source:'+publicMessage.id));assert(!value.graph.nodes.some(item=>item.id==='entry:'+original.id));assert(!value.graph.nodes.some(item=>item.id==='source:'+partial.id||item.id==='source:'+foreign.id));for(const secret of ['PRIVATE_RULE','PRIVATE_MEMORY','FOREIGN_SECRET','未完成秘密'])assert(!encoded.includes(secret));assert.equal(f.store.messages(f.key).length,2)
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('attention exposes approval identity without returning arguments, credentials or executing anything',()=>{
  const f=fixture();try{
    f.store.saveModel({id:'connected',name:'连接',model:'mock',baseUrl:'http://127.0.0.1:1',apiKey:'secret-api-key'})
    json(f.store.file('chats',f.key,'actions.json'),[{id:'action',agentId:'main',name:'write_file',status:'pending',args:{content:'SECRET_ARGUMENT'},at:new Date().toISOString()}])
    const value=spaceBrief(f.store,f.key);assert(value.members.every(item=>item.configured));assert(value.attention.some(item=>item.id==='action'));assert(!JSON.stringify(value).includes('SECRET_ARGUMENT'));assert(!JSON.stringify(value).includes('secret-api-key'));assert.equal(JSON.parse(f.store.text('chats',f.key,'actions.json'))[0].status,'pending')
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('space brief HTTP endpoint is read only, rejects private chats, and serves the shared product stylesheet',async()=>{
  fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','space-http-')),app=createApp(root,{seed:false})
  try{
    app.store.saveAgent({id:'peer',name:'伙伴'},'','');const group=app.store.saveGroup('空间',['main','peer']),direct=app.store.createSession('main','')
    app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address();assert(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port
    const response=await fetch(base+'/api/town/'+group.id+'/brief');assert.equal(response.status,200);const value=await response.json() as ReturnType<typeof spaceBrief>;assert.equal(value.members.length,2);assert(!app.store.text('chats',group.id,'social','state.json'));assert.equal((await fetch(base+'/api/town/'+direct.id+'/brief')).status,400);assert.equal((await fetch(base+'/product.css')).status,200)
    const denied=await fetch(base+'/api/town/'+group.id+'/brief',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403)
  }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}
})
