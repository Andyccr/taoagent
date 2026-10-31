import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Store, atomic } from '../store.ts'
import { evolve, evolvable, readSource, readEvolutionEvidence, rollbackEvolution, evolutionHistory, authorizeImprovement, improvementSession, spendImprovement, stopImprovement, automaticCandidate, recoverEvolution } from '../evolution.ts'
import { executeExternal, actions, decide } from '../execution.ts'

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'tao-evolution-')),store=new Store(path.join(root,'home'))
  atomic(path.join(root,'context.ts'),'export const version = 1\n')
  for(const name of ['server.mjs','build.json'])atomic(path.join(root,'release',name),'old')
  atomic(path.join(root,'tests/check.test.ts'),'// trusted acceptance fixture')
  const change=()=>({path:'context.ts',content:'export const version = 2\n',sha256:readSource('context.ts',root).sha256})
  return {root,store,change,signal:new AbortController().signal,clean:()=>fs.rmSync(root,{recursive:true,force:true})}
}
test('candidate validation is isolated, applied with history, and reversible',async()=>{
  const f=fixture()
  try{
    const result=await evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'regression fix',changes:[f.change()]},f.signal,async cwd=>{
      assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'export const version = 1\n')
      assert.equal(fs.readFileSync(path.join(cwd,'context.ts'),'utf8'),'export const version = 2\n')
      assert(!fs.existsSync(path.join(cwd,'home')))
      atomic(path.join(cwd,'release/server.mjs'),'new')
    },f.root)
    assert.equal(result.status,'applied');assert.equal(evolutionHistory(f.store)[0].status,'applied')
    assert.equal(fs.readFileSync(path.join(f.root,'release/server.mjs'),'utf8'),'new')
    rollbackEvolution(f.store,result.runId,f.root)
    assert.equal(fs.readFileSync(path.join(f.root,'release/server.mjs'),'utf8'),'old')
    assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'export const version = 1\n')
  }finally{f.clean()}
})
test('failed verification preserves installed source and release',async()=>{
  const f=fixture()
  try{
    await assert.rejects(evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'bad candidate',changes:[f.change()]},f.signal,async()=>{throw new Error('regression')},f.root),/regression/)
    assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'export const version = 1\n')
    assert.equal(evolutionHistory(f.store)[0].status,'failed')
  }finally{f.clean()}
})
test('reject stale input and concurrent edits, protected paths and duplicate files',async()=>{
  const f=fixture(),verify=async()=>{}
  try{
    await assert.rejects(evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'stale',changes:[{...f.change(),sha256:'old'}]},f.signal,verify,f.root),/变化/)
    await assert.rejects(evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'path',changes:[{...f.change(),path:'../secret'}]},f.signal,verify,f.root),/可进化/)
    await assert.rejects(evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'duplicate',changes:[f.change(),f.change()]},f.signal,verify,f.root),/重复/)
    await assert.rejects(evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'concurrent',changes:[f.change()]},f.signal,async()=>{atomic(path.join(f.root,'context.ts'),'user edit')},f.root),/变化/)
    assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'user edit')
  }finally{f.clean()}
})
test('rollback refuses to overwrite newer user changes',async()=>{
  const f=fixture()
  try{
    const result=await evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'update',changes:[f.change()]},f.signal,async()=>{},f.root)
    atomic(path.join(f.root,'context.ts'),'newer change')
    assert.throws(()=>rollbackEvolution(f.store,result.runId,f.root),/已有修改/)
  }finally{f.clean()}
})
test('source paging retains full-file hash and cancellation never promotes',async()=>{
  const f=fixture()
  try{
    atomic(path.join(f.root,'context.ts'),'x'.repeat(7000))
    const first=readSource('context.ts',f.root),second=readSource('context.ts',f.root,6000)
    assert.equal(first.content?.length,6000);assert.equal(second.content?.length,1000);assert.equal(first.sha256,second.sha256)
    const controller=new AbortController();controller.abort()
    await assert.rejects(evolve(f.store,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'cancel',changes:[f.change()]},controller.signal,async()=>{assert.fail('must not verify')},f.root),/暂停/)
  }finally{f.clean()}
})
test('runtime exposes source reading but requires approval for evolution and rollback',async()=>{
  const f=fixture()
  try{
    const chat=f.store.directSession('main')
    const read=await executeExternal(f.store,chat.id,'main','t','r','self_read',{path:'runtime.ts'},f.signal,()=>{}) as {sha256:string;nextOffset:number}
    assert.match(read.sha256,/^[a-f0-9]{64}$/);assert(read.nextOffset>0)
    for(const name of ['self_evolve','self_rollback']){
      const pending=executeExternal(f.store,chat.id,'main','t',name,name,{acceptanceTests:['tests/check.test.ts'],expectedBenefit:'Fix observed version mismatch',acceptanceCriteria:'Candidate exports version 2 and passes the trusted regression suite',reason:'test',changes:[],runId:'test'},f.signal,()=>{})
      const action=actions(f.store,chat.id).at(-1)!
      assert.equal(action.status,'pending');decide(f.store,chat.id,action.id,false)
      await assert.rejects(pending,/拒绝/)
    }
    assert.deepEqual(evolutionHistory(f.store),[])
  }finally{f.clean()}
})


test('automatic grants persist spending, enforce scope and criteria, and stop without resetting budget',()=>{
  const f=fixture();try{
    const key=f.store.directSession('main').id
    const args={acceptanceTests:['tests/concurrent-chat.test.ts'],scope:['context.ts'],objective:'fix context',acceptanceCriteria:'preserve complete user instruction',maxIterations:1,maxModelCalls:2,maxToolCalls:3,maxTokens:100,maxMinutes:1}
    authorizeImprovement(f.store,key,args)
    spendImprovement(f.store,key,'modelCalls',40)
    assert.equal(improvementSession(new Store(f.store.root),key)?.reservedTokens,40)
    assert.throws(()=>automaticCandidate(f.store,key,{changes:[{path:'runtime.ts'}],acceptanceCriteria:args.acceptanceCriteria}),/范围/)
    assert.throws(()=>automaticCandidate(f.store,key,{changes:[f.change()],acceptanceTests:args.acceptanceTests,acceptanceCriteria:'weaker'}),/验收/)
    assert(automaticCandidate(f.store,key,{changes:[f.change()],acceptanceTests:args.acceptanceTests,acceptanceCriteria:args.acceptanceCriteria}))
    assert.throws(()=>automaticCandidate(f.store,key,{changes:[f.change()],acceptanceTests:args.acceptanceTests,acceptanceCriteria:args.acceptanceCriteria}),/预算/)
    assert.equal(improvementSession(f.store,key)?.iterations,1)
    stopImprovement(f.store,key);assert.throws(()=>spendImprovement(f.store,key,'modelCalls'),/停止/)
    assert.equal(improvementSession(f.store,key)?.modelCalls,1)
  }finally{f.clean()}
})

test('candidate cannot silently edit trusted tests and retains acceptance evidence on rejection',async()=>{
  const f=fixture();try{
    atomic(path.join(f.root,'tests/check.test.ts'),'original trusted test')
    await assert.rejects(evolve(f.store,{reason:'test',acceptanceTests:['tests/check.test.ts'],expectedBenefit:'better context',acceptanceCriteria:'keep required inputs',changes:[f.change()]},f.signal,async cwd=>{atomic(path.join(cwd,'tests/check.test.ts'),'weakened')},f.root),/受保护/)
    const history=evolutionHistory(f.store);assert.equal(history[0].acceptanceCriteria,'keep required inputs');assert.equal(history[0].status,'failed');assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'export const version = 1\n')
  }finally{f.clean()}
})

test('recovery restores a partially promoted journal but never overwrites a conflicting edit',()=>{
  const f=fixture();try{
    const runId='interrupted',original='export const version = 1\n',output='export const version = 2\n'
    atomic(f.store.file('evolution',runId,'record.json'),JSON.stringify({status:'applying',originals:{'context.ts':original},outputs:{'context.ts':output}}))
    atomic(path.join(f.root,'context.ts'),'user edit');assert.throws(()=>recoverEvolution(f.store,runId,f.root),/外部修改/)
    atomic(path.join(f.root,'context.ts'),output);fs.mkdirSync(f.store.file('evolution','.lock'))
    assert.equal(recoverEvolution(f.store,runId,f.root).status,'rolled_back');assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),original);assert(!fs.existsSync(f.store.file('evolution','.lock')))
  }finally{f.clean()}
})


test('stop interrupts asynchronous candidate preparation before validation or promotion',async()=>{
  const f=fixture(),controller=new AbortController();let verified=false
  try{queueMicrotask(()=>controller.abort());await assert.rejects(evolve(f.store,{reason:'cancel preparation',expectedBenefit:'test responsiveness',acceptanceCriteria:'stop before validation',acceptanceTests:['tests/check.test.ts'],changes:[f.change()]},controller.signal,async()=>{verified=true},f.root),/暂停/);assert.equal(verified,false);assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'export const version = 1\n')}finally{f.clean()}
})

test('core runtime evolution supports coordinated edits beyond eight files and complete rollback',async()=>{
  const f=fixture()
  try{
    const names=evolvable.filter(name=>name.endsWith('.ts'))
    const changes=names.map(name=>{atomic(path.join(f.root,name),'export const value = 1\n');return {path:name,content:'export const value = 2\n',sha256:readSource(name,f.root).sha256}})
    assert(changes.length>8)
    const result=await evolve(f.store,{reason:'repair core',expectedBenefit:'coordinated runtime and storage repair',acceptanceCriteria:'all modules export version 2',acceptanceTests:['tests/check.test.ts'],changes},f.signal,async cwd=>{
      for(const name of names)assert.equal(fs.readFileSync(path.join(cwd,name),'utf8'),'export const value = 2\n')
    },f.root)
    for(const name of names)assert.equal(fs.readFileSync(path.join(f.root,name),'utf8'),'export const value = 2\n')
    rollbackEvolution(f.store,result.runId,f.root)
    for(const name of names)assert.equal(fs.readFileSync(path.join(f.root,name),'utf8'),'export const value = 1\n')
  }finally{f.clean()}
})

test('source catalog discovers trusted tests and keeps approval, verifier and build rules protected',async()=>{
  const f=fixture()
  try{
    const catalog=readSource('',f.root)
    assert.deepEqual(catalog.acceptanceTests,['tests/check.test.ts'])
    for(const name of ['runtime.ts','store.ts','app.ts','pi.ts','models.ts'])assert(catalog.files?.includes(name))
    for(const name of ['execution.ts','evolution.ts','build.mjs','package.json','tests/check.test.ts']){
      assert(!catalog.files?.includes(name))
      await assert.rejects(evolve(f.store,{reason:'rewrite gate',expectedBenefit:'bypass',acceptanceCriteria:'none',acceptanceTests:['tests/check.test.ts'],changes:[{path:name,content:'',sha256:''}]},f.signal,async()=>assert.fail('must not validate'),f.root),/可进化/)
    }
    await assert.rejects(evolve(f.store,{reason:'no-op',expectedBenefit:'none',acceptanceCriteria:'none',acceptanceTests:['tests/check.test.ts'],changes:[{...f.change(),content:fs.readFileSync(path.join(f.root,'context.ts'),'utf8')}]},f.signal,async()=>assert.fail('must not validate'),f.root),/没有实际/)
  }finally{f.clean()}
})

test('failed candidates expose every diagnostic page and submitted source without another approval',async()=>{
  const f=fixture()
  try{
    const output='a'.repeat(6500)+'failure at the end',content='// '+ 'b'.repeat(7000)
    await assert.rejects(evolve(f.store,{reason:'diagnostics',expectedBenefit:'repair',acceptanceCriteria:'pass',acceptanceTests:['tests/check.test.ts'],changes:[{...f.change(),content}]},f.signal,async cwd=>{
      atomic(path.join(cwd,'..','validation.json'),JSON.stringify({checks:[{name:'acceptance',exitCode:1,durationMs:1,output}]}));throw new Error('acceptance failed')
    },f.root),/acceptance failed/)
    const runId=evolutionHistory(f.store)[0].runId,summary=readEvolutionEvidence(f.store,{runId})
    assert.equal(summary.checks[0].totalChars,output.length);assert.equal(summary.content,undefined)
    const first=readEvolutionEvidence(f.store,{runId,checkIndex:0}),last=readEvolutionEvidence(f.store,{runId,checkIndex:0,offset:first.nextOffset})
    assert.equal(first.content!+last.content!,output);assert.equal(last.nextOffset,null)
    assert.equal(readEvolutionEvidence(f.store,{runId,path:'context.ts',offset:6000}).content,content.slice(6000))
    assert.throws(()=>readEvolutionEvidence(f.store,{runId,checkIndex:-1}),/无效/)
    assert.throws(()=>readEvolutionEvidence(f.store,{runId,path:'../record.json'}),/没有/)
    assert.throws(()=>readEvolutionEvidence(f.store,{runId,offset:-1}),/offset/)
    const key=f.store.directSession('main').id
    const result=await executeExternal(f.store,key,'main','t','i','self_inspect',{runId,checkIndex:0,offset:6000},f.signal,()=>{}) as {content:string}
    assert.equal(result.content,output.slice(6000));assert.equal(actions(f.store,key).length,0)
  }finally{f.clean()}
})

test('exact edits compose against the hashed source, retain full journal content and roll back',async()=>{
  const f=fixture()
  try{
    const change=f.change()
    const result=await evolve(f.store,{reason:'focused repair',expectedBenefit:'avoid rewriting large modules',acceptanceCriteria:'version is 3',acceptanceTests:['tests/check.test.ts'],changes:[{path:change.path,sha256:change.sha256,edits:[{before:'version = 1',after:'version = 2'},{before:'version = 2',after:'version = 3'}]}]},f.signal,async cwd=>{
      assert.equal(fs.readFileSync(path.join(cwd,'context.ts'),'utf8'),'export const version = 3\n')
    },f.root)
    assert.equal(readEvolutionEvidence(f.store,{runId:result.runId,path:'context.ts'}).content,'export const version = 3\n')
    rollbackEvolution(f.store,result.runId,f.root)
    assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'export const version = 1\n')
  }finally{f.clean()}
})

test('exact edits reject ambiguity, absent matches, stale sources and mixed formats before validation',async()=>{
  const f=fixture()
  try{
    const args={reason:'repair',expectedBenefit:'test',acceptanceCriteria:'test',acceptanceTests:['tests/check.test.ts']},verify=async()=>assert.fail('must not validate')
    const run=(change:Record<string,unknown>)=>evolve(f.store,{...args,changes:[change]},f.signal,verify,f.root)
    await assert.rejects(run({...f.change(),edits:[{before:'version',after:'changed'}]}),/混用/)
    const {content,...change}=f.change()
    await assert.rejects(run({...change,edits:[{before:'missing',after:''}]}),/唯一匹配/)
    await assert.rejects(run({...change,edits:[{before:'',after:'x'}]}),/非空/)
    await assert.rejects(run({...change,sha256:'stale',edits:[{before:'version',after:'other'}]}),/源码已变化/)
    atomic(path.join(f.root,'context.ts'),'same same')
    await assert.rejects(run({...change,sha256:readSource('context.ts',f.root).sha256,edits:[{before:'same',after:'other'}]}),/唯一匹配/)
    assert.equal(fs.readFileSync(path.join(f.root,'context.ts'),'utf8'),'same same')
  }finally{f.clean()}
})

test('validated City bundle and Windows integrity hashes deploy and roll back with their source',async()=>{
 const f=fixture()
 try{
  atomic(path.join(f.root,'public/city.bundle.js'),'old renderer')
  atomic(path.join(f.root,'windows-release.json'),JSON.stringify({files:[{path:'public/city.bundle.js',bytes:12,sha256:'old'},{path:'context.ts',bytes:1,sha256:'old'}]}))
  const manifest=fs.readFileSync(path.join(f.root,'windows-release.json'),'utf8')
  const result=await evolve(f.store,{reason:'City renderer repair',expectedBenefit:'visible updated scene',acceptanceCriteria:'validated bundle is installed',acceptanceTests:['tests/check.test.ts'],changes:[f.change()]},f.signal,async cwd=>{
   atomic(path.join(cwd,'public/city.bundle.js'),'new validated renderer');atomic(path.join(cwd,'release/server.mjs'),'new server')
  },f.root)
  assert.equal(fs.readFileSync(path.join(f.root,'public/city.bundle.js'),'utf8'),'new validated renderer')
  const installed=JSON.parse(fs.readFileSync(path.join(f.root,'windows-release.json'),'utf8')) as {files:{path:string;bytes:number;sha256:string}[]}
  assert.equal(installed.files[0].bytes,22);assert.equal(installed.files[0].sha256.length,64)
  rollbackEvolution(f.store,result.runId,f.root)
  assert.equal(fs.readFileSync(path.join(f.root,'public/city.bundle.js'),'utf8'),'old renderer');assert.equal(fs.readFileSync(path.join(f.root,'windows-release.json'),'utf8'),manifest)
 }finally{f.clean()}
})
