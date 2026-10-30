import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { Store, atomic, json } from '../store.ts'
import { runConversation } from '../runtime.ts'

function fixture() {
  const base = path.resolve('.test-tmp'); fs.mkdirSync(base, { recursive: true })
  const root = fs.mkdtempSync(path.join(base, 'collective-')), store = new Store(root)
  store.saveAgent({ id: 'reviewer', name: '审阅员' }, '检验反例', 'REVIEWER_PRIVATE_MEMORY')
  const group = store.saveGroup('共同研究', ['main', 'reviewer'], undefined, { replyMode: 'collective', coordinatorId: 'main', purpose: '形成可修正的共同认识' })
  return { root, store, group }
}
function reply(res: http.ServerResponse, content: string) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' })
  res.end('data: ' + JSON.stringify({ choices: [{ delta: { content }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n')
}
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }

test('all group members and consultations use shared evolving knowledge without personal memory', () => {
  const { root, store, group } = fixture()
  try {
    const model = store.saveModel({ name: 'mock', model: 'mock', baseUrl: 'http://127.0.0.1:1' })
    atomic(store.file('agents', 'main', 'MEMORY.md'), 'MAIN_PRIVATE_MEMORY')
    store.updateMemory(group.id, 'main', 'member', 'MAIN_PRIVATE_NOTE', 'note1')
    store.updateMemory(group.id, 'reviewer', 'member', 'REVIEWER_PRIVATE_NOTE', 'note2')
    store.append(store.directSession('reviewer').id, 'user', 'PERSONAL_DIRECT_MESSAGE')
    store.append(group.id, 'user', '分析缓存条件')
    const contribution = store.append(group.id, 'assistant', '共同认识候选：需要检查缓存失效条件', 'complete', { agentId: 'main', agentName: '助手', phase: 'discuss' })
    const memory = store.recordDiscussion(group.id, 'main', contribution.id)
    assert.equal(memory.status, 'proposed'); assert.equal(memory.sourceMessageId, contribution.id)
    for (const member of ['main', 'reviewer']) {
      const context = JSON.stringify(store.context(group.id, model, '缓存条件', member))
      assert(context.includes('共同认识候选')); assert(context.includes(memory.id)); assert(context.includes('已共享'))
      for (const secret of ['MAIN_PRIVATE_MEMORY', 'REVIEWER_PRIVATE_MEMORY', 'MAIN_PRIVATE_NOTE', 'REVIEWER_PRIVATE_NOTE', 'PERSONAL_DIRECT_MESSAGE']) assert(!context.includes(secret))
      assert(store.searchMemory(group.id, member, '缓存条件').some(item => item.memoryId === memory.id))
    }
    const consult = store.consultSession('main', 'reviewer', group.id)
    store.append(consult.id, 'user', '检查缓存条件')
    const context = JSON.stringify(store.context(consult.id, model, undefined, 'reviewer'))
    assert(context.includes(memory.id)); assert(!context.includes('REVIEWER_PRIVATE_MEMORY')); assert(!context.includes('REVIEWER_PRIVATE_NOTE'))
    assert(store.searchMemory(consult.id, 'reviewer', '缓存条件').some(item => item.memoryId === memory.id))
    const other = store.saveGroup('其他研究', ['main', 'reviewer'], undefined, { replyMode: 'collective' })
    assert(!JSON.stringify(store.context(other.id, model, '缓存条件', 'reviewer')).includes('共同认识候选'))
    assert(store.text('agents', 'main', 'MEMORY.md').includes('MAIN_PRIVATE_MEMORY'))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('public discussion immediately enters shared memory without automatic scripted rounds', async()=>{
 const {root,store,group}=fixture();let calls=0;const upstream=http.createServer(async(req,res)=>{for await(const part of req)void part;calls++;reply(res,'候选观点：性能仍待验证')})
 try{store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});await runConversation(store,group.id,'分析方案','',new AbortController().signal,()=>{});assert.equal(calls,1);const items=store.memoryItems(group.id,'reviewer','group');assert.equal(items.length,1);assert.equal(items[0].status,'proposed');assert(items[0].note.includes('性能仍待验证'));assert(JSON.stringify(store.context(group.id,store.resolveModel('main'),'继续','reviewer')).includes('性能仍待验证'));assert.equal(store.turns(group.id)[0].speakers[0].phase,undefined)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('shared hypotheses evolve through support, dissent and correction without destroying prior versions', () => {
  const { root, store, group } = fixture()
  try {
    store.saveAgent({ id: 'third', name: '第三位' }, '核实', '')
    store.saveGroup(group.title, ['main', 'reviewer', 'third'], group.id)
    const source = store.append(group.id, 'user', '研究缓存失效策略')
    let first = store.proposeGroupMemory(group.id, 'main', '缓存使用版本号失效', source.id, 'lesson')
    assert.equal(first.status, 'proposed'); assert(store.groupKnowledge(group.id, 'reviewer').includes(first.note))
    first = store.reviewGroupMemory(group.id, 'main', first.id, 'support', '提出者补充理由', source.id, first.updatedAt)
    assert.equal(first.status, 'proposed')
    first = store.reviewGroupMemory(group.id, 'reviewer', first.id, 'support', '版本号能区分新旧缓存', source.id, first.updatedAt)
    assert.equal(first.status, 'active'); assert(store.memory(group.id, 'main', 'group').includes(first.note))
    first = store.reviewGroupMemory(group.id, 'third', first.id, 'challenge', '并发回写场景仍有反例', source.id, first.updatedAt)
    assert.equal(first.status, 'contested'); assert(!store.memory(group.id, 'main', 'group').includes(first.note))
    assert(store.groupKnowledge(group.id, 'reviewer').includes('并发回写场景'))
    let corrected = store.proposeGroupMemory(group.id, 'reviewer', '版本号配合回写检查，处理缓存并发失效', source.id, 'lesson', [], first.id)
    corrected = store.reviewGroupMemory(group.id, 'third', corrected.id, 'support', '补充了并发前提，仍需实测', source.id, corrected.updatedAt)
    assert.equal(corrected.status, 'active')
    assert.equal(store.memoryItems(group.id, 'main', 'group').find(item => item.id === first.id)?.status, 'replaced')
    assert.equal(corrected.replacesId, first.id)
    corrected = store.reviewGroupMemory(group.id, 'main', corrected.id, 'challenge', '尚未测试失败回写', source.id, corrected.updatedAt)
    assert.equal(corrected.status, 'contested')
    assert(!store.memory(group.id, 'main', 'group').includes(first.note))
    corrected = store.reviewGroupMemory(group.id, 'main', corrected.id, 'support', '已检查适用范围，作为有条件经验', source.id, corrected.updatedAt)
    assert.equal(corrected.status, 'active')
    assert.equal(store.proposeGroupMemory(group.id, 'reviewer', corrected.note, source.id, 'lesson', [], first.id).id, corrected.id)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('user facts take priority; sources, stale reviews and foreign group evidence are validated', () => {
  const { root, store, group } = fixture()
  try {
    const source = store.append(group.id, 'user', '保留我的明确约定')
    const manual = store.rememberFact(group.id, 'main', 'group', '当前端口 4821', 'manual-port', undefined, 'manual')
    let proposal = store.proposeGroupMemory(group.id, 'main', '当前端口 4822', source.id, 'fact', [], manual.id)
    const original = proposal.updatedAt
    proposal = store.reviewGroupMemory(group.id, 'reviewer', proposal.id, 'support', '成员推测另一个端口', source.id, original)
    assert.equal(proposal.status, 'proposed'); assert(store.memory(group.id, 'main', 'group').includes(manual.note))
    assert.throws(() => store.reviewGroupMemory(group.id, 'main', proposal.id, 'support', '重复', source.id, original), /已更新/)
    proposal = store.editMemoryItem(group.id, 'main', 'group', proposal.id, 'confirm', proposal.updatedAt)
    assert.equal(proposal.status, 'active'); assert(proposal.confirmedByUserAt)
    proposal = store.reviewGroupMemory(group.id, 'reviewer', proposal.id, 'challenge', '仍然有疑问', source.id, proposal.updatedAt)
    assert.equal(proposal.status, 'active'); assert(store.memory(group.id, 'main', 'group').includes(proposal.note))
    const other = store.saveGroup('别的群', ['main', 'reviewer']), foreign = store.append(other.id, 'user', 'PRIVATE_FOREIGN_EVIDENCE')
    assert.throws(() => store.proposeGroupMemory(group.id, 'main', '不跨群引用', source.id, 'fact', [foreign.id]), /本群/)
    assert.throws(() => store.proposeGroupMemory(group.id, 'main', '错误类型', source.id, 'invalid' as 'fact'), /类型/)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('explicit recipients resume failed events without replaying successful public contributions',async()=>{
 const {root,store,group}=fixture();let calls=0,fail=true;const upstream=http.createServer(async(req,res)=>{for await(const part of req)void part;calls++;if(calls===2&&fail){res.writeHead(503);res.end()}else reply(res,'公开成果 '+calls)})
 try{store.saveModel({name:'mock',model:'mock',baseUrl:await listen(upstream)});await runConversation(store,group.id,'@全体 分析','',new AbortController().signal,()=>{});const turn=store.turns(group.id)[0];assert.deepEqual(turn.speakers.map(item=>item.status),['complete','failed']);fail=false;await runConversation(new Store(root),group.id,turn.content,'',new AbortController().signal,()=>{},undefined,{retryTurnId:turn.id});assert.equal(calls,3);assert.equal(store.messages(group.id).filter(item=>item.role==='user').length,1);assert.equal(store.memoryItems(group.id,'main','group').filter(item=>item.category==='discussion').length,2)}finally{await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('a saved phase reply recovers its missing shared-memory record before progress reconciliation', async () => {
  const { root, store, group } = fixture()
  try {
    const source = store.append(group.id, 'user', '中断恢复')
    const result = store.append(group.id, 'assistant', '已保存的公开讨论成果', 'complete', { agentId: 'main', phase: 'discuss', turnId: source.id })
    store.saveTurn(group.id, { id: source.id, content: source.content, modelId: '', at: source.at, updatedAt: source.at, speakers: [{ agentId: 'main', phase: 'discuss', status: 'running' }] })
    await assert.rejects(runConversation(store, group.id, source.content, '', new AbortController().signal, () => {}, undefined, { retryTurnId: source.id }), /全部完成/)
    assert(store.memoryItems(group.id, 'reviewer', 'group').some(item => item.sourceMessageId === result.id))
    assert.equal(store.turns(group.id)[0].speakers[0].status, 'complete')
    assert.equal(store.recordDiscussion(group.id, 'main', result.id).sourceMessageId, result.id)
    assert.equal(store.memoryItems(group.id, 'main', 'group').length, 1)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('collective memory metadata changes invalidate a derived summary even without changing accepted Markdown', () => {
  const { root, store, group } = fixture()
  try {
    const source = store.append(group.id, 'user', '原始问题')
    json(store.file('chats', group.id, 'summary.json'), { text: 'OLD_SUMMARY', sourceIds: [source.id], throughMessageId: source.id, memoryVersion: store.summaryVersion(group.id), sourceVersion: store.historyVersion(group.id, source.id), at: new Date().toISOString() })
    assert(store.summaryState(group.id).valid)
    store.proposeGroupMemory(group.id, 'main', '新的共同问题', source.id, 'question')
    assert(!store.summaryState(group.id).valid)
    assert.equal(store.memory(group.id, 'main', 'group'), '')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('withdrawing and restoring a shared discussion preserves its unverified state', () => {
  const { root, store, group } = fixture()
  try {
    const source = store.append(group.id, 'assistant', '未验证的共同线索', 'complete', { agentId: 'main', phase: 'discuss' })
    const memory = store.recordDiscussion(group.id, 'main', source.id)
    const withdrawn = store.editMemoryItem(group.id, 'main', 'group', memory.id, 'forget', memory.updatedAt)
    assert(!store.groupKnowledge(group.id, 'reviewer').includes(memory.note))
    assert.equal(store.recordDiscussion(group.id, 'main', source.id).status, 'forgotten')
    const restored = store.editMemoryItem(group.id, 'reviewer', 'group', memory.id, 'restore', withdrawn.updatedAt)
    assert.equal(restored.status, 'proposed'); assert(!store.memory(group.id, 'main', 'group').includes(memory.note))
    assert(store.groupKnowledge(group.id, 'reviewer').includes(memory.note))
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})

test('native memory tools share first, review later and reject private-scope writes in collective discussion', async () => {
  const { root, store, group } = fixture(), results: Record<string, unknown>[] = []
  const upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw) as { model: string; messages: { role: string; content: string }[] }
    const system = body.messages[0].content, toolResults = body.messages.filter(message => message.role === 'tool')
    if (toolResults.length) { results.push(...toolResults.map(message => JSON.parse(message.content) as Record<string, unknown>)); reply(res, '依据公开内容补充本阶段观点'); return }
    let name = '', args: Record<string, unknown> = {}
    if (body.model === 'main' || body.model === 'reviewer') {
      if (body.model === 'main') { name = 'remember'; args = { note: '缓存必须检查失效条件', category: 'lesson' } }
      else { const item = store.memoryItems(group.id, 'reviewer', 'group').find(item => item.note === '缓存必须检查失效条件')!; name = 'review_memory'; args = { memoryId: item.id, expected: item.updatedAt, verdict: 'support', reason: '检查了讨论中提出的失效场景，作为有条件经验采用' } }
    }
    if (!name) { reply(res, '公开的讨论与汇总'); return }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call', function: { name, arguments: JSON.stringify(args) } }] }, finish_reason: 'tool_calls' }] }) + '\n\ndata: [DONE]\n\n')
  })
  try {
    const url = await listen(upstream)
    store.saveModel({ name: 'main', model: 'main', baseUrl: url })
    const model = store.saveModel({ name: 'reviewer', model: 'reviewer', baseUrl: url })
    store.saveAgent({ ...store.agent('reviewer'), modelId: model.id }, '核验', 'PRIVATE_MEMORY_UNCHANGED')
    // Reviewing a particular saved item has a real dependency; parallel @all does not promise it exists yet.
    await runConversation(store, group.id, '@main 讨论缓存失效', '', new AbortController().signal, () => {})
    await runConversation(store, group.id, '@reviewer 核验刚保存的共同记忆', '', new AbortController().signal, () => {})
    assert(results.some(item => item.proposed === true && item.status === 'proposed'))
    assert(results.some(item => item.status === 'active'))
    assert(!store.text('agents','main','MEMORY.md').includes('缓存必须检查失效条件'))
    assert(store.memory(group.id, 'main', 'group').includes('缓存必须检查失效条件'))
    assert(!store.text('agents', 'main', 'MEMORY.md').includes('不得写入私人记忆'))
    assert.equal(store.text('agents', 'reviewer', 'MEMORY.md'), 'PRIVATE_MEMORY_UNCHANGED')
    assert(store.turns(group.id)[0].speakers.every(item => item.status === 'complete'))
  } finally { await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})
