import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import {Store,type Model,type Turn} from '../store.ts'
import {lifeState,changeLife,recordLife,saveLifeMember,lifeContext,touchLife,rememberLifeEpisode,unifiedMemory,saveLifePolicy,observeContribution} from '../social-state.ts'

function fixture(){fs.mkdirSync('.test-tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.test-tmp','unified-')),store=new Store(root);store.saveAgent({id:'peer',name:'伙伴'},'独立判断','PRIVATE_NOTE');const group=store.saveGroup('统一空间',['main','peer'],undefined,{replyMode:'collective'});return {root,store,key:group.id}}
test('large read cursors and oversized memories never erase independent identity or smaller relevant experiences',()=>{
  const f=fixture()
  try{
    saveLifeMember(f.store,f.key,'main',{interests:'独立兴趣',attention:'风速实验',stance:'保留两种解释'})
    changeLife(f.store,f.key,state=>{state.members[0].readIds=Array.from({length:5000},(_,i)=>'message-'+i);state.entries.push({id:'large',agentId:'main',at:new Date().toISOString(),kind:'contribution',text:'很长的内容'.repeat(50000),importance:9,sourceIds:[]})})
    recordLife(f.store,f.key,'main',{text:'风速实验的短小反例',importance:9})
    const context=lifeContext(f.store,f.key,'main',2400,'风速实验');assert(context.length<=2400);assert(context.includes('独立兴趣'));assert(context.includes('风速实验的短小反例'));assert(!context.includes('message-4999'));assert(lifeState(f.store,f.key).entries.find(item=>item.id==='large')!.text.length>100000)
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('recall access changes only for actually used own entries and is throttled',()=>{
  const f=fixture()
  try{
    const own=recordLife(f.store,f.key,'main',{text:'自己的认识'}),peer=recordLife(f.store,f.key,'peer',{text:'对方未分享的认识'})
    lifeContext(f.store,f.key,'main',3000);assert(!lifeState(f.store,f.key).entries[0].lastAccess)
    touchLife(f.store,f.key,'main',[own.id,peer.id]);let state=lifeState(f.store,f.key);const at=state.entries.find(item=>item.id===own.id)!.lastAccess,revision=state.revision;assert(at);assert(!state.entries.find(item=>item.id===peer.id)!.lastAccess)
    touchLife(f.store,f.key,'main',[own.id]);state=lifeState(f.store,f.key);assert.equal(state.revision,revision)
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('work and daily recall the same episode while unseen peer drafts and private notes remain absent',()=>{
  const f=fixture()
  try{
    const user=f.store.append(f.key,'user','共同问题'),unseen=f.store.append(f.key,'assistant','尚未读到的并行观点','complete',{agentId:'peer',agentName:'伙伴',turnId:'turn'})
    const own=f.store.append(f.key,'assistant','我提出一个可以检验的方案','complete',{agentId:'main',agentName:'助手',turnId:'turn',contextMessageIds:[user.id]});observeContribution(f.store,f.key,'main',own.id)
    const turn={id:'turn'} as Turn;rememberLifeEpisode(f.store,f.key,turn);rememberLifeEpisode(f.store,f.key,turn)
    const episodes=lifeState(f.store,f.key).entries.filter(item=>item.kind==='episode'&&item.agentId==='main');assert.equal(episodes.length,1);assert(episodes[0].sourceIds.includes(user.id));assert(!episodes[0].sourceIds.includes(unseen.id));assert(!lifeState(f.store,f.key).policy.enabled)
    const model={contextChars:30000,maxOutputTokens:2000} as Model,context=JSON.stringify(f.store.context(f.key,model,'回想上次方案','main').messages);assert(context.includes('我在这次交流中实际读过'));assert(!context.includes('PRIVATE_NOTE'));assert(unifiedMemory(f.store,f.key).personal.some(item=>item.kind==='episode'))
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('memory inspection links actual public memory to personal views without promoting subjective claims',()=>{
  const f=fixture()
  try{
    f.store.rememberFact(f.key,'main','group','用户确认的共同事实','manual-test',undefined,'manual');recordLife(f.store,f.key,'main',{text:'尚未验证的个人解释'});recordLife(f.store,f.key,'peer',{text:'另一种解释'})
    const all=unifiedMemory(f.store,f.key),own=unifiedMemory(f.store,f.key,'main');assert(all.common.text.includes('用户确认的共同事实'));assert(!all.common.text.includes('尚未验证的个人解释'));assert(!JSON.stringify(own.personal).includes('另一种解释'));assert.throws(()=>unifiedMemory(f.store,f.key,'foreign'),/成员/)
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('background memory updates do not invalidate policy editing but concurrent policy changes do',()=>{
  const f=fixture()
  try{
    saveLifePolicy(f.store,f.key,{expected:'new',enabled:false});const version=lifeState(f.store,f.key).policyRevision
    recordLife(f.store,f.key,'main',{text:'后台独立认识变化'});saveLifePolicy(f.store,f.key,{expectedPolicy:version,intervalMinutes:12});assert.equal(lifeState(f.store,f.key).policy.intervalMinutes,12)
    assert.throws(()=>saveLifePolicy(f.store,f.key,{expectedPolicy:version,enabled:true}),/已更新/)
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
test('closing daily view invalidates late responses before they can rewrite navigation',async()=>{
  const source=fs.readFileSync('public/town.js','utf8'),history:string[]=[]
  let resolve:(value:unknown)=>void=()=>{};const deferred=new Promise(done=>{resolve=done})
  const context=vm.createContext({view:{hidden:false},generation:0,api:()=>deferred,document:{body:{classList:{remove(){}}}},q:()=>({inert:true}),history:{replaceState:(_a:unknown,_b:unknown,url:string)=>history.push(url)}})
  vm.runInContext(source.slice(source.indexOf('function close(){'),source.indexOf('function openChat(){'))+source.slice(source.indexOf('async function load('),source.indexOf('async function open('))+'\nglobalThis.start=load;globalThis.leave=close',context)
  const pending=context.start() as Promise<void>;context.leave();resolve({spaces:[{id:'old'}],agents:[]});await pending;assert.deepEqual(history,[]);assert.equal(context.view.hidden,true)
})
test('daily bookmarks resolve the same group for the underlying chat',()=>{
  const source=fs.readFileSync('public/client.js','utf8'),context=vm.createContext({location:{hash:'#town=second'},state:{groups:[{id:'my-team'},{id:'second'}],agents:[]}})
  vm.runInContext(source.slice(source.indexOf('function initialTarget()'),source.indexOf('async function openInitialTarget()'))+'\nglobalThis.selected=initialTarget()',context);assert.equal(context.selected.id,'second');assert.equal(context.selected.type,'group')
})
test('withdrawn public sources flag personal recall without deleting original experiences',()=>{
  const f=fixture()
  try{
    const source=f.store.append(f.key,'user','待纠正的旧条件'),item=f.store.rememberFact(f.key,'main','group','旧条件成立',source.id),entry=recordLife(f.store,f.key,'main',{text:'根据旧条件形成的解释',sourceIds:[source.id]})
    f.store.editMemoryItem(f.key,'main','group',item.id,'forget',item.updatedAt,'')
    assert.equal(unifiedMemory(f.store,f.key).personal.find(value=>value.id===entry.id)?.status,'needs_review');assert(lifeContext(f.store,f.key,'main',4000).includes('来源公共记忆已纠正或撤回'));assert.equal(lifeState(f.store,f.key).entries.find(value=>value.id===entry.id)?.text,'根据旧条件形成的解释')
  }finally{fs.rmSync(f.root,{recursive:true,force:true})}
})
