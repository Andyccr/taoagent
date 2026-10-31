import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {once} from 'node:events'
import {Store,json} from '../store.ts'
import {conversationPreview,workspaceConversations} from '../workspace.ts'
import {rosterWidth,conversationTime,rosterPreview,inspectorTaskState} from '../public/workbench.js'
import {buildSidebarSections} from '../public/sidebar.js'
import {createApp} from '../app.ts'
function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','workbench-')),store=new Store(root),session=store.directSession('main');return {root,store,session}}

test('roster widths remain usable, clamp oversized preferences and preserve a chat column across desktop sizes',()=>{
 assert.equal(rosterWidth(undefined,1440),360);assert.equal(rosterWidth(9999,1440),520);assert.equal(rosterWidth(100,1440),300);assert.equal(rosterWidth(520,1000),456);assert.equal(rosterWidth(500,390),338);assert.equal(rosterWidth('broken',1440),360)
 for(const viewport of [1100,1280,1440,1920])assert(viewport-64-rosterWidth(520,viewport)>=480)
})
test('conversation cards format real timestamps safely and identify group excerpt authors',()=>{
 const now=new Date(2026,9,30,18).getTime()
 assert.equal(conversationTime('',now),'');assert.equal(conversationTime('invalid',now),'');assert.equal(conversationTime(new Date(2026,9,29,12).toISOString(),now),'昨天')
 assert.match(conversationTime(new Date(2026,9,30,10,15).toISOString(),now),/10:15/)
 assert.equal(rosterPreview({type:'group',preview:'已完成验收',previewAuthor:'研究员'}),'研究员：已完成验收');assert.equal(rosterPreview({type:'agent',preview:'实际最新消息',responsibilities:'旧职责'}),'实际最新消息')
})
test('roster previews use the last completed speech, exclude tool activity and interrupted drafts, retain full Unicode history',()=>{
 const {root,store,session}=fixture()
 try{
  const text='🙂'.repeat(180)+'完整末尾';store.append(session.id,'assistant',text,'complete',{agentId:'main',agentName:'助手'});store.append(session.id,'assistant','不应展示的审批参数','complete',{kind:'activity'});store.append(session.id,'assistant','未完成草稿','interrupted')
  const before=fs.readFileSync(store.file('chats',session.id,'messages.jsonl')),preview=conversationPreview(store,session.id)
  assert.equal(preview.preview,'🙂'.repeat(140)+'…');assert.equal(preview.previewTruncated,true);assert.equal(preview.previewAuthor,'助手');assert(fs.readFileSync(store.file('chats',session.id,'messages.jsonl')).equals(before));assert.equal(store.messages(session.id)[0].content,text)
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('bounded previews handle oversized records without manufacturing a partial message or changing original bytes',()=>{
 const {root,store,session}=fixture()
 try{
  store.append(session.id,'user','巨量记录'.repeat(30000));const before=fs.readFileSync(store.file('chats',session.id,'messages.jsonl'));assert.equal(conversationPreview(store,session.id).preview,'打开查看完整交流');store.append(session.id,'assistant','之后的正常消息');assert.equal(conversationPreview(store,session.id).preview,'之后的正常消息');assert(fs.readFileSync(store.file('chats',session.id,'messages.jsonl')).subarray(0,before.length).equals(before))
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('group roster filter includes both social modes and City while keeping task groups separate',()=>{
 const state={agents:[],groups:['emergent','chat','city','task'].map(kind=>({id:kind,title:kind,componentKind:kind,memberIds:[]})),conversations:[],navigation:{pinned:[]}}
 assert.deepEqual(new Set(buildSidebarSections(state,{kind:'group'}).sections.flatMap(section=>section.items.map(item=>item.kind))),new Set(['emergent','chat','city']))
 assert.deepEqual(buildSidebarSections(state,{kind:'task'}).sections.flatMap(section=>section.items.map(item=>item.id)),['task'])
})
test('public roster HTTP redacts model credentials from previews and preserves consultation boundaries and new UI assets',async()=>{
 const {root,store,session}=fixture(),app=createApp(root,{seed:false})
 try{
  const secret='workbench-private-fixture-key';store.saveModel({name:'fixture',model:'fixture',baseUrl:'http://127.0.0.1:1',apiKey:secret});store.append(session.id,'assistant','实际消息 '+secret)
  store.saveAgent({id:'peer',name:'同事'},'private rules','private memory');const consult=store.consultSession('main','peer',session.id);store.append(consult.id,'assistant','PRIVATE-CONSULT-DO-NOT-EXPOSE')
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address();assert(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port
  const response=await fetch(base+'/api/state'),raw=await response.text();assert(!raw.includes(secret));assert(!raw.includes('PRIVATE-CONSULT-DO-NOT-EXPOSE'));const body=JSON.parse(raw) as {conversations:{id:string;preview:string}[]};assert(body.conversations.find(item=>item.id===session.id)?.preview.includes('[已隐藏凭据]'))
  for(const asset of ['workbench.css','workbench.js']){const assetResponse=await fetch(base+'/'+asset);assert.equal(assetResponse.status,200);assert(assetResponse.headers.get('content-security-policy')?.includes("default-src 'self'"))}
  assert(!workspaceConversations(store,[]).some(item=>item.id===consult.id))
 }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}
})

test('inspector task counts include pending review and requested changes without presenting registered tasks as running',()=>{
 assert.deepEqual(inspectorTaskState({status:'pending'}),{label:'待推进',finished:false})
 assert.deepEqual(inspectorTaskState({status:'complete',requireReview:true,review:{status:'awaiting_review'}}),{label:'待验收',finished:false})
 assert.deepEqual(inspectorTaskState({status:'complete',requireReview:true,review:{status:'accepted'}}),{label:'已完成',finished:true})
 assert.deepEqual(inspectorTaskState({status:'complete',review:{status:'changes_requested'}}),{label:'待返工',finished:false})
})
