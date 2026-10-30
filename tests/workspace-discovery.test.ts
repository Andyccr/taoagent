import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {once} from 'node:events'
import {createApp} from '../app.ts'
import {Store} from '../store.ts'
import {searchWorkspace, workspaceConversations} from '../workspace.ts'
import vm from 'node:vm'

function temporary(){const parent=path.resolve('.test-tmp');fs.mkdirSync(parent,{recursive:true});return fs.mkdtempSync(path.join(parent,'discovery-'))}
function seed(root:string){const store=new Store(root),agent={id:'researcher',name:'研究员'};store.saveAgent(agent,'','');store.saveAgent({id:'writer',name:'程序员'},'','');const session=store.directSession(agent.id);return{store,agent,session}}
test('workspace UI has unique element IDs and sidebar prioritizes approvals over running and unread',()=>{
  const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size)
  const source=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8'),info={id:'thread',target:{type:'agent',id:'main'},status:'waiting',waiting:2,hasMessages:true,revision:'new'}
  const context=vm.createContext({state:{conversations:[info],navigation:{seen:{thread:'old'}}},current:null})
  vm.runInContext(source.slice(source.indexOf('function contactState('),source.indexOf('function matchesContactFilter(')),context)
  const state=vm.runInContext('contactState',context) as (type:string,id:string)=>{status:string;label:string}
  assert.equal(state('agent','main').status,'waiting');info.status='running';assert.equal(state('agent','main').status,'running');info.status='idle';assert.equal(state('agent','main').status,'unread');info.hasMessages=false;assert.equal(state('agent','main').status,'idle')
})
test('search paginates same-time messages without duplicates, matches all terms and retains full originals',async()=>{
  const root=temporary()
  try{
    const {store,session}=seed(root)
    const ids=[]
    for(let index=0;index<7;index++)ids.push(store.append(session.id,'user',`量子 search ${index} `+'完整原文'.repeat(150)).id)
    store.append(session.id,'assistant','量子 search 内部活动','complete',{kind:'activity'})
    store.append(session.id,'user','只有量子')
    let cursor:string|null=null;const found:string[]=[]
    do{const params=new URLSearchParams({q:'量子 search',limit:'2',...(cursor?{cursor}:{})});const page=await searchWorkspace(store,params);found.push(...page.hits.map(hit=>hit.messageId));assert(page.hits.every(hit=>hit.excerpt.length<330));cursor=page.cursor}while(cursor)
    assert.equal(new Set(found).size,7);assert.deepEqual(found.sort(),ids.sort());assert(store.messages(session.id)[0].content.length>600)
    const first=await searchWorkspace(store,new URLSearchParams({q:'量子',limit:'1'}))
    await assert.rejects(searchWorkspace(store,new URLSearchParams({q:'other',cursor:first.cursor!})),/游标/)
    await assert.rejects(searchWorkspace(store,new URLSearchParams({q:'量子',limit:'0'})),/分页/)
    const controller=new AbortController();controller.abort();await assert.rejects(searchWorkspace(store,new URLSearchParams({q:'量子'}),controller.signal),{name:'AbortError'})
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('search excludes archived groups and private consultations and reflects lifecycle changes',async()=>{
  const root=temporary()
  try{
    const {store,agent}=seed(root),group=store.saveGroup('历史组',[agent.id,'writer']);store.append(group.id,'user','唯一历史关键词')
    const consultation=store.consultSession('main',agent.id,group.id);store.append(consultation.id,'assistant','唯一历史关键词 内部咨询')
    assert.equal((await searchWorkspace(store,new URLSearchParams({q:'唯一历史关键词'}))).hits.length,1)
    await assert.rejects(searchWorkspace(store,new URLSearchParams({q:'唯一历史关键词',session:consultation.id})),/不存在/)
    store.archiveGroup(group.id,'test','user',store.groupVersion(group.id))
    assert.equal((await searchWorkspace(store,new URLSearchParams({q:'唯一历史关键词'}))).hits.length,0)
    await assert.rejects(searchWorkspace(store,new URLSearchParams({q:'唯一历史关键词',session:group.id})),/不存在/)
    store.restoreGroup(group.id);assert.equal((await searchWorkspace(store,new URLSearchParams({q:'唯一历史关键词'}))).hits.length,1)
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('navigation merges independent updates, rejects stale pins and never marks unseen revisions read',()=>{
  const root=temporary()
  try{
    const {store,agent,session}=seed(root),other=new Store(root),key='agent:'+agent.id
    store.saveNavigation({targetKey:key,pinned:true,expectedPinned:false});assert.throws(()=>other.saveNavigation({targetKey:key,pinned:false,expectedPinned:false}),/另一窗口/)
    store.append(session.id,'assistant','第一条');const revision=workspaceConversations(store,[])[0].revision
    store.append(session.id,'assistant','后来的一条');assert.throws(()=>store.saveNavigation({sessionId:session.id,seenRevision:revision}),/新消息/)
    const latest=workspaceConversations(store,[])[0].revision;other.saveNavigation({sessionId:session.id,seenRevision:latest})
    assert.deepEqual(new Store(root).navigation(),{pinned:[key],seen:{[session.id]:latest}})
  }finally{fs.rmSync(root,{recursive:true,force:true})}
})
test('discovery HTTP keeps same-origin protection, redacts credentials and negotiates cached assets',async()=>{
  const root=temporary(),app=createApp(root,{seed:false});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const address=app.server.address();assert(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port
  try{
    const agent={id:'main',name:'助手'};app.store.saveAgent(agent,'','');const session=app.store.directSession(agent.id)
    app.store.saveModel({name:'secret',model:'fixture',baseUrl:'https://private-provider.example/v1',apiKey:'private-key-discovery-test'})
    const message=app.store.append(session.id,'assistant','检索 private-key-discovery-test')
    app.store.append(session.id,'assistant','检索 '+'.'.repeat(305)+'private-key-discovery-test')
    const response=await fetch(base+'/api/search?q='+encodeURIComponent('检索')),result=await response.text();assert.equal(response.status,200);assert(!result.includes('private-key-discovery-test'))
    const full=await fetch(base+'/api/search/message?session='+session.id+'&message='+message.id);assert(!(await full.text()).includes('private-key-discovery-test'))
    const diagnostic=await (await fetch(base+'/api/diagnostics')).text();assert(!diagnostic.includes(root));assert(!diagnostic.includes('private-provider'));assert(!diagnostic.includes('private-key'))
    assert.equal((await fetch(base+'/api/search?q=x',{headers:{Origin:'https://untrusted.example'}})).status,403)
    const asset=await fetch(base+'/client.js',{headers:{'Accept-Encoding':'gzip'}});assert.equal(asset.headers.get('content-encoding'),'gzip');assert((await asset.text()).includes('searchHistory'))
    const etag=asset.headers.get('etag');assert(etag);assert.equal((await fetch(base+'/client.js',{headers:{'If-None-Match':etag}})).status,304)
    assert.equal((await fetch(base+'/client.js',{headers:{'Accept-Encoding':'gzip;q=0'}})).headers.get('content-encoding'),null)
  }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true})}
})
