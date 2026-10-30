import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { createApp } from '../app.ts'
import { Store, atomic, json } from '../store.ts'

function temp() { const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.test-tmp'); fs.mkdirSync(base, { recursive: true }); return fs.mkdtempSync(path.join(base, 'review-')) }
async function listen(server: http.Server) { server.listen(0, '127.0.0.1'); await once(server, 'listening'); const address = server.address(); assert(address && typeof address === 'object'); return `http://127.0.0.1:${address.port}` }
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
async function api(base: string, route: string, method = 'GET', value?: unknown) { return fetch(base + route, { method, ...(value === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }) }) }
function reply(res: http.ServerResponse, text: string) { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n') }
function tools(res: http.ServerResponse, calls: { name: string; args: unknown }[]) { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: calls.map((call, index) => ({ index, id: `call_${index}`, function: { name: call.name, arguments: JSON.stringify(call.args) } })) }, finish_reason: 'tool_calls' }] }) + '\n\ndata: [DONE]\n\n') }

test('Bots directly exchange queued messages in a group without disclosing private chat',async()=>{
 const root=temp(),app=createApp(root,{seed:false});const calls:string[]=[];let managerCalls=0,reviewerCalls=0;
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw) as {model:string};calls.push(body.model);assert(!raw.includes('OWNER_PRIVATE_DO_NOT_FORWARD'));if(body.model==='manager'&&++managerCalls===1)tools(res,[{name:'send_message',args:{agentId:'reviewer',content:'请独立审阅'}}]);else if(body.model==='reviewer'&&++reviewerCalls===1)tools(res,[{name:'send_message',args:{agentId:'main',content:'建议缩小范围，存在风险'}}]);else reply(res,'已完成本次判断')})
 try{const url=await listen(upstream),base=await listen(app.server);app.store.saveModel({name:'manager',model:'manager',baseUrl:url});const m=app.store.saveModel({name:'reviewer',model:'reviewer',baseUrl:url});app.store.saveAgent({id:'reviewer',name:'参谋',modelId:m.id},'独立判断','私有经验');app.store.append(app.store.directSession('reviewer').id,'user','OWNER_PRIVATE_DO_NOT_FORWARD');const group=app.store.saveGroup('协作',['main','reviewer'],undefined,{replyMode:'collective'});const response=await api(base,'/api/chats/'+group.id+'/chat','POST',{content:'评审'});const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));assert.equal(events.at(-1).type,'done');assert.equal(calls[0],'manager');assert.equal(calls.at(-1),'manager');assert.equal(calls.filter(name=>name==='manager').length,3);assert.equal(calls.filter(name=>name==='reviewer').length,2);assert.equal(events.filter(item=>item.type==='collaboration').length,2);assert.deepEqual(app.store.turns(group.id)[0].speakers.map(item=>item.agentId),['main','reviewer','main']);assert.equal(app.store.memoryItems(group.id,'main','group').filter(item=>item.category==='discussion').length,3)}finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})

test('agent tools create a group, list colleagues and append visible backed-up memory only once', async () => {
  const root = temp(), app = createApp(root, {seed:false}); let call = 0
  const upstream = http.createServer(async (req, res) => {
    for await (const chunk of req) { void chunk }; call++
    if (call === 1) tools(res, [{ name: 'list_agents', args: {} }, { name: 'remember', args: { note: '用户偏好中文回答' } }])
    else if (call === 2) tools(res, [{ name: 'create_group', args: { name: '工作室', memberIds: ['reviewer'] } }, { name: 'remember', args: { note: '用户偏好中文回答' } }])
    else reply(res, '群已创建，偏好已记住。')
  })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'model', model: 'model', baseUrl: upstreamUrl }); app.store.saveAgent({ id: 'reviewer', name: '审阅员' }, 'review', '')
    atomic(app.store.file('agents', 'main', 'MEMORY.md'), 'ORIGINAL_MEMORY')
    const dm = app.store.directSession('main'), result = await api(base, `/api/chats/${dm.id}/chat`, 'POST', { content: '记住中文偏好，并和审阅员建群' })
    const events = (await result.text()).trim().split('\n').map(line => JSON.parse(line))
    assert.equal(events.at(-1).type, 'done'); assert.equal(events.filter(event => event.type === 'memory_updated').length, 1)
    assert.equal(events.filter(event => event.type === 'group_created').length, 1)
    const group = app.store.sessions().find(session => session.kind === 'group'); assert(group); assert.deepEqual(group.memberIds, ['main', 'reviewer'])
    const memory = app.store.text('agents', 'main', 'MEMORY.md'); assert(memory.includes('ORIGINAL_MEMORY')); assert.equal(memory.split('用户偏好中文回答').length, 2)
    const backups = fs.readdirSync(app.store.file('agents', 'main', 'memory-history')); assert.equal(backups.length, 1); assert.equal(app.store.text('agents', 'main', 'memory-history', backups[0]), 'ORIGINAL_MEMORY')
    assert(app.store.text('chats', dm.id, 'context.json').includes('toolExchanges'))
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('group @mentions route correctly; a missing model no longer blocks a healthy member', async () => {
  const root = temp(), app = createApp(root, {seed:false}); let calls = 0
  const upstream = http.createServer(async (req, res) => { for await (const chunk of req) { void chunk }; calls++; reply(res, '健康成员回复') })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    app.store.saveModel({ name: 'good', model: 'good', baseUrl: upstreamUrl })
    app.store.saveAgent({ id: 'good', name: '乙' }, 'rules', ''); app.store.saveAgent({ id: 'bad', name: '甲' }, 'rules', '')
    json(app.store.file('agents', 'bad', 'agent.json'), { id: 'bad', name: '甲', modelId: 'missing-model' })
    const group = app.store.saveGroup('讨论', ['bad', 'good'])
    const first = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '@全体 请各位回应' }), text = await first.text()
    assert(text.includes('warning')); assert(text.includes('健康成员回复')); assert.equal(calls, 1)
    const mentioned = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '@乙 请核对' }); assert((await mentioned.text()).includes('done')); assert.equal(calls, 2)
    const missing = await api(base, `/api/chats/${group.id}/chat`, 'POST', { content: '@不存在 请核对' }); assert.equal(missing.status, 400); assert.equal(calls, 2)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('drafts persist and conditional clearing cannot destroy a newer draft', async () => {
  const root = temp(), app = createApp(root, {seed:false})
  try {
    const base = await listen(app.server)
    assert.equal((await api(base, '/api/drafts/agent/main', 'PUT', { content: '  old draft  ' })).status, 200)
    const restored = new Store(root); assert.equal(restored.draft('agent', 'main'), '  old draft  ')
    await api(base, '/api/drafts/agent/main', 'PUT', { content: 'new draft' })
    const stale = await (await api(base, '/api/drafts/agent/main', 'PUT', { content: '', expected: '  old draft  ' })).json() as { saved: boolean; ok: boolean }
    assert.equal(stale.saved, false); assert.equal(stale.ok, false)
    assert.equal((await (await api(base, '/api/drafts/agent/main')).json() as { content: string }).content, 'new draft')
    assert.equal((await api(base, '/api/drafts/agent/unknown', 'PUT', { content: 'x' })).status, 404)
  } finally { await close(app.server); fs.rmSync(root, { recursive: true, force: true }) }
})

test('text-only APIs omit tools and support max_completion_tokens; connection test writes no chat', async () => {
  const root = temp(), app = createApp(root, {seed:false}); const bodies: Record<string, unknown>[] = []
  const upstream = http.createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; bodies.push(JSON.parse(raw)); reply(res, 'OK') })
  try {
    const upstreamUrl = await listen(upstream), base = await listen(app.server)
    const model = app.store.saveModel({ name: 'plain', model: 'plain', baseUrl: upstreamUrl, toolsEnabled: false, tokenParameter: 'max_completion_tokens' })
    const dm = app.store.directSession('main'), result = await api(base, `/api/chats/${dm.id}/chat`, 'POST', { content: 'text only' }); assert((await result.text()).includes('done'))
    assert.equal(bodies[0].tools, undefined); assert.equal(bodies[0].max_tokens, undefined); assert.equal(bodies[0].max_completion_tokens, 4096)
    const count = app.store.messages(dm.id).length
    const check = await api(base, `/api/models/${model.id}/test`, 'POST', {}); assert.equal(check.status, 200); assert.equal((await check.json() as { ok: boolean }).ok, true)
    assert.equal(app.store.messages(dm.id).length, count); assert.equal(bodies[1].max_completion_tokens, 1024)
  } finally { await close(app.server); await close(upstream); fs.rmSync(root, { recursive: true, force: true }) }
})

test('connection probes leave reasoning output room and respect the configured model limit',async()=>{
  const root=temp(),app=createApp(root,{seed:false})
  const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw) as {max_tokens:number};assert.equal(body.max_tokens,768);reply(res,'OK')})
  try{const base=await listen(app.server),url=await listen(upstream);const model=app.store.saveModel({name:'reasoning probe',model:'probe',baseUrl:url,maxOutputTokens:768});const response=await api(base,`/api/models/${model.id}/test`,'POST',{});assert.equal(response.status,200);assert.equal(app.store.sessions().length,0)}finally{await close(app.server);await close(upstream);fs.rmSync(root,{recursive:true,force:true})}
})
