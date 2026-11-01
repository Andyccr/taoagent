import { cityOverview, cityRoom, saveCity } from './components.ts'
import {authorizeImprovement,improvementSession,stopImprovement,evolutionHistory,recoverEvolution,rollbackEvolution,evolvable,readSource} from './evolution.ts'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { workspaceConversations, searchWorkspace } from './workspace.ts'
import { enqueueMessage, changeQueue, queueSnapshot, queueSummary, pauseQueue, createQueueScheduler } from './queue.ts'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Store, HttpError, object, string, id, atomic, json, componentKind, type Session, runtimeLimits } from './store.ts'
import { runConversation, steerConversation, tasks, userTaskAction } from './runtime.ts'
import { actions, decide, integrations, saveIntegrations, redact, createRedactor } from './execution.ts'
import { seedTeam } from './defaults.ts'
import { streamModel } from './models.ts'
import { ROOT, portableZip } from './portable.ts'
import { GO_MODELS } from './opencode-go.ts'
import { summarize } from './context.ts'
import { discussionView, relationshipView } from './communication.ts'
import { reasoningView } from './reasoning.ts'
import { collaborationHealth } from './collaboration.ts'
import { workOverview, saveSkill, saveRoutine, createRoutineScheduler, pauseGroupRoutines } from './work.ts'
import { createLifeScheduler } from './social.ts'
import { spaceBrief } from './space.ts'
import { lifeState, lifeOverview, ownLife, saveLifePolicy, saveLifeMember, saveLifeAgenda, recordLife, pauseLife, unifiedMemory } from './social-state.ts'
import { civilizationSnapshot } from './civilization.ts'

function groupDetails(input: Record<string, unknown>): Pick<Session, 'purpose' | 'memberRoles' | 'replyMode' | 'coordinatorId' | 'discussionMode' | 'runtimeLimits'> {
  const roles = input.memberRoles === undefined ? undefined : object(input.memberRoles)
  if (roles && Object.values(roles).some(value => typeof value !== 'string')) throw new HttpError(400, '成员职责应为文本')
  const mode = input.replyMode
  if (mode !== undefined && mode !== 'round' && mode !== 'coordinated' && mode !== 'collective') throw new HttpError(400, '未知协作模式')
  if(input.discussionMode!==undefined&&!['open','directed','brainstorm'].includes(String(input.discussionMode)))throw new HttpError(400,'请选择自然讨论、头脑风暴或定向协作')
  if(input.componentKind!==undefined&&!['emergent','chat','task','city'].includes(String(input.componentKind)))throw new HttpError(400,'未知组件类型')
  return { ...(input.componentKind===undefined?{}:{componentKind:input.componentKind as import('./store.ts').ComponentKind}), ...(input.runtimeLimits===undefined?{}:{runtimeLimits:runtimeLimits(input.runtimeLimits)}), ...(input.purpose === undefined ? {} : { purpose: string(input.purpose) }), ...(roles ? { memberRoles: roles as Record<string, string> } : {}), ...(mode ? { replyMode: mode } : {}), ...(input.discussionMode===undefined?{}:{discussionMode:input.discussionMode as 'open'|'directed'|'brainstorm'}), ...(input.coordinatorId === undefined ? {} : { coordinatorId: string(input.coordinatorId) }) }
}

export function logFailure(store: Store, where: string, error: unknown) {
  let text = error instanceof Error ? error.stack || error.message : String(error)
  try { text = redact(store, text) } catch { text = error instanceof Error ? error.name : 'error' }
  console.error(`[${new Date().toISOString()}] ${where}: ${text}`)
}

export function createApp(home = path.join(ROOT, 'home'), options: {seed?: boolean} = {}) {
  const store = new Store(home)
  if(options.seed!==false)seedTeam(store)
  const assets = new Map(['index.html', 'client.js', 'style.css', 'appearance-boot.js', 'town.js', 'town.css', 'product.css', 'square.js', 'civilization.js', 'civilization.css', 'city.bundle.js', 'components.css', 'sidebar.css', 'sidebar.js', 'workbench.css', 'workbench.js', 'favicon.svg'].map(file => [file, fs.readFileSync(path.join(ROOT, 'public', file))]))
  const version = string(object(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))).version)
  const assetVersions = new Map([...assets].map(([name, bytes]) => [name, {etag: 'W/"' + crypto.createHash('sha256').update(bytes).digest('hex') + '"', gzip: gzipSync(bytes)}]))
  const startedAt = Date.now()
  const instanceId = process.env.TAOAGENT_INSTANCE_ID || crypto.randomUUID()
  let searches = 0
  const safeModel = (model: ReturnType<Store['models']>[number]) => ({ ...model, apiKey: '', hasKey: !!store.withCredentials(model).apiKey })
  const active = new Map<string, AbortController>()
  const subscribers = new Map<string, Set<http.ServerResponse>>()
  const publish = (key: string, event: Record<string, unknown>) => {
    const text = 'data: ' + redact(store, JSON.stringify(event)) + '\n\n'
    for (const response of subscribers.get(key) || []) {
      if (response.destroyed || response.writableEnded) continue
      if (response.writableLength > 262144) { response.end(); continue }
      response.write(text)
    }
  }
  const closeSubscribers = () => { for (const listeners of subscribers.values()) for (const response of listeners) response.end() }
  const scheduler = createRoutineScheduler(store, active, key => { const queue = queueSummary(store, key); return queue.paused || !queue.pending })
  const queueScheduler = createQueueScheduler(store, active, publish)
  const lifeScheduler=createLifeScheduler(store,active,publish,key=>{const queue=queueSummary(store,key);return queue.paused||!queue.pending})
  const busy = (key: string) => active.has(key) || store.isRunning(key)
  function historyPage(key: string, before?: string | null) {
    const all = store.messages(key), end = before ? all.findIndex(message => message.id === before) : all.length
    if (end < 0) throw new HttpError(400, '历史游标不存在，请刷新后重试')
    const start = Math.max(0, end - 100)
    const session = store.session(key)
    return { messages: all.slice(start, end), hasOlder: start > 0, total: all.length, turns: store.recentTurns(key, 10), revision: session.updatedAt + ':' + store.historyBytes(key) }
  }
  const send = (res: http.ServerResponse, value: unknown, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify(value))
  }
  const server = http.createServer(async (req, res) => {
    try {
      // Local host + same-origin checks prevent DNS rebinding and cross-site writes.
      const host = req.headers.host || ''
      if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host)) throw new HttpError(403, '仅允许本机访问')
      const origin = req.headers.origin
      if (origin && origin !== `http://${host}`) throw new HttpError(403, '拒绝跨站请求')
      const url = new URL(req.url || '/', `http://${host}`)
      const route = url.pathname
      const method = req.method || 'GET'
      if (route === '/api/health' && method === 'GET') { send(res, {app:'taoagent', version, instanceId, node:process.versions.node}); return }
      const eventsRoute = route.match(/^\/api\/chats\/([a-zA-Z0-9_-]+)\/events$/)
      if (eventsRoute && method === 'GET') {
        const key=eventsRoute[1],session=store.requireActiveSession(key)
        if(session.kind==='consult')throw new HttpError(400,'内部咨询不提供用户事件流')
        if([...subscribers.values()].reduce((sum,listeners)=>sum+listeners.size,0)>=32)throw new HttpError(429,'实时连接过多，请关闭重复窗口')
        const listeners=subscribers.get(key)||new Set<http.ServerResponse>();subscribers.set(key,listeners);listeners.add(res)
        res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'})
        res.write(': connected\n\n')
        const heartbeat=setInterval(()=>{if(res.destroyed||res.writableEnded)return;if(res.writableLength>262144){res.end();return}res.write(': keepalive\n\n')},15000);heartbeat.unref()
        res.once('close',()=>{clearInterval(heartbeat);listeners.delete(res);if(!listeners.size)subscribers.delete(key)});return
      }
      if (method === 'GET' && (route === '/' || route === '/favicon.ico' || assets.has(route.slice(1)))) {
        const file = route === '/' ? 'index.html' : route === '/favicon.ico' ? 'favicon.svg' : route.slice(1)
        const mime = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/css'
        const cached = assetVersions.get(file)!
        const compressed = /\bgzip\b(?!\s*;\s*q=0(?:\.0*)?(?:\s*[,;]|\s*$))/i.test(req.headers['accept-encoding'] || '')
        if (req.headers['if-none-match'] === cached.etag) { res.writeHead(304, {'ETag': cached.etag, 'Cache-Control': 'no-cache', 'Vary': 'Accept-Encoding'}); res.end(); return }
        res.writeHead(200, {
          'ETag': cached.etag, 'Vary': 'Accept-Encoding', ...(compressed ? {'Content-Encoding': 'gzip'} : {}),
          'Content-Type': mime + '; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'",
        })
        res.end(compressed ? cached.gzip : assets.get(file)); return
      }
      let input: Record<string, unknown> = {}
      if (['POST', 'PUT', 'PATCH','DELETE'].includes(method)) {
        if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, '请使用 JSON 请求')
        const chunks: Buffer[] = []; let size = 0
        for await (const chunk of req) {
          size += chunk.length
          if (size > 2000000) throw new HttpError(413, '消息不能超过 2MB')
          chunks.push(chunk as Buffer)
        }
        try { input = object(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
        catch { throw new HttpError(400, 'JSON 格式无效') }
      }
      if(route==='/api/city'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(cityOverview(store)))));return}
      if(route==='/api/city'&&method==='PUT'){send(res,saveCity(store,input));return}
      if(route==='/api/city/room'&&method==='POST'){send(res,cityRoom(store));return}
      if(route==='/api/town'&&method==='GET'){
        send(res,{spaces:store.sessions().filter(item=>item.kind==='group'&&!item.archivedAt&&componentKind(item)==='emergent').map(item=>({id:item.id,title:item.title,memberIds:store.groupMembers(item.id),adopted:!!store.text('chats',item.id,'social','state.json'),enabled:lifeState(store,item.id).policy.enabled,running:busy(item.id)})),agents:store.agents().filter(item=>!item.archivedAt).map(item=>({id:item.id,name:item.name,background:item.background,responsibilities:item.responsibilities}))});return
      }
      if(route==='/api/town/create'&&method==='POST'){
        if(!Array.isArray(input.memberIds)||!input.memberIds.length||input.memberIds.some(value=>typeof value!=='string'))throw new HttpError(400,'请选择至少一位成员')
        const group=store.saveGroup(string(input.name)||'日常广场',input.memberIds as string[],undefined,{replyMode:'collective',discussionMode:'open',componentKind:'emergent',spaceKind:input.memberIds.length===1?'solo':'social',purpose:string(input.purpose)})
        saveLifePolicy(store,group.id,{expected:'new',enabled:false});send(res,{id:group.id});return
      }
      const townRoute=route.match(/^\/api\/town\/([a-zA-Z0-9_-]+)(?:\/(policy|member|agenda|note|life|wake|pause|memory|brief))?$/)
      if(townRoute){
        const key=townRoute[1],action=townRoute[2];store.requireActiveSession(key)
        if(!action&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(lifeOverview(store,key)))));return}
        if(action==='brief'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(spaceBrief(store,key)))));return}
        if(action==='memory'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(unifiedMemory(store,key,url.searchParams.get('agentId')||undefined)))));return}
        if(action==='life'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(ownLife(store,key,url.searchParams.get('agentId')||'',url.searchParams.get('before')||undefined)))));return}
        if(action==='policy'&&method==='PUT'){saveLifePolicy(store,key,input);if(input.enabled===false)lifeScheduler.pause(key);send(res,lifeOverview(store,key));return}
        if(action==='pause'&&method==='POST'){pauseLife(store,key);lifeScheduler.pause(key);send(res,lifeOverview(store,key));return}
        if(action==='member'&&method==='PUT'){send(res,saveLifeMember(store,key,string(input.agentId),input));return}
        if(action==='agenda'&&method==='POST'){send(res,saveLifeAgenda(store,key,string(input.agentId),input));return}
        if(action==='note'&&method==='POST'){send(res,recordLife(store,key,string(input.agentId),input));return}
        if(action==='wake'&&method==='POST'){
          if(!lifeState(store,key).policy.enabled)throw new HttpError(409,'请先启用空间日常活动，并设置预算与安静时段')
          if(busy(key))throw new HttpError(409,'空间正在聊天或工作，请等当前活动结束')
          const agentId=string(input.agentId)||undefined
          if(agentId&&!store.groupMembers(key).includes(agentId))throw new HttpError(400,'请选择空间内成员')
          void lifeScheduler.tick(Date.now(),key,agentId).catch(()=>{});send(res,{accepted:true});return
        }
      }
      if (route === '/api/search' && method === 'GET') {
        if (searches >= 2) throw new HttpError(429, '已有搜索正在进行，请稍后重试')
        const controller = new AbortController(), cancel = () => controller.abort()
        res.on('close', cancel); searches++
        try { const result = await searchWorkspace(store, url.searchParams, controller.signal, createRedactor(store)); if (!res.destroyed) send(res, JSON.parse(redact(store, JSON.stringify(result)))) }
        finally { searches--; res.off('close', cancel) }
        return
      }
      if (route === '/api/launcher/stop' && method === 'POST' && process.env.TAOAGENT_LAUNCHER === '1') {
        if (!process.env.TAOAGENT_INSTANCE_ID || req.headers['x-taoagent-instance'] !== instanceId) throw new HttpError(403, '此停止请求不属于当前启动实例')
        for (const session of store.sessions()) pauseQueue(store, session.id, '用户关闭本地服务，后续消息已暂停')
        send(res,{ok:true})
        setImmediate(()=>{queueScheduler.stop();scheduler.stop();lifeScheduler.stop();for(const controller of active.values())controller.abort();closeSubscribers();server.close();server.closeIdleConnections()});return
      }
      if (route === '/api/search/message' && method === 'GET') {
        const key = id(url.searchParams.get('session') || ''), messageId = id(url.searchParams.get('message') || '')
        if (!workspaceConversations(store, []).some(session => session.id === key)) throw new HttpError(404, '可搜索的对话不存在')
        const message = store.messages(key).find(message => message.id === messageId && !message.kind)
        if (!message) throw new HttpError(404, '消息不存在')
        send(res, JSON.parse(redact(store, JSON.stringify(message)))); return
      }
      if (route === '/api/civilization' && method === 'GET') { send(res, civilizationSnapshot(store, Date.now(), [...active.keys()])); return }
      if (route === '/api/diagnostics' && method === 'GET') {
        const sessions = store.sessions(), memory = process.memoryUsage()
        send(res, {version, node: process.versions.node, platform: process.platform, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), memory: {rssBytes: memory.rss, heapUsedBytes: memory.heapUsed}, counts: {agents: store.agents().length, conversations: sessions.filter(session => session.kind !== 'consult').length, models: store.models().length, running: sessions.filter(session => busy(session.id)).length}, protections: {loopbackOnly: true, sameOrigin: true, approvalRequired: true}, storage: '本机 Markdown / JSON / JSONL', generatedAt: new Date().toISOString()}); return
      }
      const queueRoute = route.match(/^\/api\/chats\/([a-zA-Z0-9_-]+)\/queue$/)
      if (queueRoute) {
        const key = queueRoute[1]
        if (method === 'GET') { send(res, JSON.parse(redact(store, JSON.stringify(queueSnapshot(store, key))))); return }
        if (method === 'POST') { send(res, JSON.parse(redact(store, JSON.stringify(enqueueMessage(store, key, input))))); return }
        if (method === 'PATCH') { send(res, JSON.parse(redact(store, JSON.stringify(changeQueue(store, key, input))))); return }
      }
      if (route === '/api/work' && method === 'GET') { send(res, workOverview(store)); return }
      if (route === '/api/navigation' && method === 'POST') { send(res, store.saveNavigation(input)); return }
      if (route === '/api/skills' && method === 'PUT') { send(res, saveSkill(store, input)); return }
      if (route === '/api/routines' && method === 'PUT') { send(res, saveRoutine(store, input)); return }
      if (route === '/api/state' && method === 'GET') {
        const sessions = store.sessions().map(session=>({...store.session(session.id),...(session.componentKind==='city'?{memberIds:store.groupMembers(session.id)}:{})}))
        const revisions = Object.fromEntries(sessions.filter(session => session.kind !== 'consult').map(session => {
          return [session.id, session.updatedAt + ':' + store.historyBytes(session.id)]
        }))
        const running = [...new Set([...active.keys(), ...sessions.filter(session => store.isRunning(session.id)).map(session => session.id)])]
        send(res, { version, models: store.models().map(safeModel), account: store.account(), agents: store.agents(), groups: sessions.filter(s => s.kind === 'group').map(group=>({...group,groupVersion:store.groupVersion(group.id)})), revisions, running, conversations: workspaceConversations(store, running, createRedactor(store)).map(item=>({...item,queue:queueSummary(store,item.id)})), navigation: store.navigation() }); return
      }
      if (route === '/api/account' && method === 'PUT') { send(res, store.saveAccount(string(input.defaultModelId), typeof input.expectedModelId === 'string' ? input.expectedModelId : undefined)); return }
      if(route==='/api/integrations'&&method==='GET'){send(res,integrations(store).map(({token,...server})=>({...server,hasToken:!!token})));return}
      if(route==='/api/integrations'&&method==='PUT'){saveIntegrations(store,input.servers);send(res,{ok:true});return}
      if (route === '/api/providers/opencode-go' && method === 'GET') { send(res, { hasKey: !!store.providerKeys()['opencode-go'], presets: GO_MODELS }); return }
      if (route === '/api/providers/opencode-go' && method === 'PUT') {
        if (!Array.isArray(input.modelIds) || input.modelIds.some(value => typeof value !== 'string')) throw new HttpError(400, '请选择模型')
        const models = store.saveGo(string(input.apiKey), input.modelIds as string[])
        if (input.makeDefault === true) store.saveAccount(models[0].id)
        send(res, models.map(safeModel)); return
      }
      const draftMatch = route.match(/^\/api\/drafts\/(agent|group)\/([a-zA-Z0-9_-]+)$/)
      if (draftMatch && method === 'GET') { send(res, { content: store.draft(draftMatch[1], draftMatch[2]) }); return }
      if (draftMatch && method === 'PUT') { const saved = store.saveDraft(draftMatch[1], draftMatch[2], string(input.content), typeof input.expected === 'string' ? input.expected : undefined); send(res, { ok: saved, saved }); return }
      if (route === '/api/profile' && method === 'GET') {
        send(res, { profile: store.text('PROFILE.md'), rules: store.text('RULES.md'), memory: store.text('MEMORY.md') }); return
      }
      if (route === '/api/profile' && method === 'PUT') {
        const expected = input.expected === undefined ? {} : object(input.expected)
        const fields = ['profile','rules','memory'] as const
        const values = Object.fromEntries(fields.filter(key=>typeof input[key]==='string').map(key=>[key,string(input[key])]))
        const previous = Object.fromEntries(fields.filter(key=>typeof expected[key]==='string').map(key=>[key,string(expected[key])]))
        send(res,store.saveProfile(values,previous));return
      }
      if (route === '/api/models' && method === 'PUT') { send(res, safeModel(store.saveModel(input))); return }
      const testMatch = route.match(/^\/api\/models\/([a-zA-Z0-9_-]+)\/test$/)
      if (testMatch && method === 'POST') {
        const model = store.models().find(model => model.id === testMatch[1])
        if (!model) throw new HttpError(404, '模型不存在')
        const runId = `test-${model.id}`
        if (active.has(runId)) throw new HttpError(409, '正在检查这个模型')
        const controller = new AbortController(); active.set(runId, controller)
        const began = Date.now()
        try {
          let answer = ''
          for await (const chunk of streamModel({ ...store.withCredentials(model), maxOutputTokens: Math.min(1024,model.maxOutputTokens) }, [{ role: 'user', content: 'Reply with OK.' }], AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]), undefined, { sessionId: runId })) answer += chunk
          if (!answer.trim()) throw new HttpError(502, '接口没有返回文字')
          send(res, { ok: true, elapsedMs: Date.now() - began })
        } catch (error) { throw new HttpError(502, error instanceof HttpError ? error.message : '连接检查失败，请检查 API 地址、网络、Key 与模型 ID') }
        finally { active.delete(runId) }
        return
      }
      if (route === '/api/agents' && method === 'PUT') {
        const key = id(string(input.id) || crypto.randomUUID())
        const old = store.agents().find(agent => agent.id === key)
        if (old && ((typeof input.expectedMemory === 'string' && input.expectedMemory !== store.text('agents', key, 'MEMORY.md')) || (typeof input.expectedRules === 'string' && input.expectedRules !== store.text('agents', key, 'RULES.md')) || (typeof input.expectedName === 'string' && input.expectedName !== old.name))) throw new HttpError(409, '这位 Agent 已更新，请先保留你的编辑再重新载入，避免覆盖新记忆')
        if(old&&typeof input.expectedModelId==='string'&&input.expectedModelId!==(old.modelId||''))throw new HttpError(409,'此成员模型已在其他窗口更改，请重新载入')
        if(old&&((typeof input.expectedBackground==='string'&&input.expectedBackground!==(old.background||''))||(typeof input.expectedResponsibilities==='string'&&input.expectedResponsibilities!==(old.responsibilities||''))))throw new HttpError(409,'此成员背景或职责已更新，请重新载入对照')
        const agent = { ...old, id: key, name: string(input.name, old?.name).trim(),...(input.modelId===undefined?{}:{modelId:string(input.modelId)}),...(input.background===undefined?{}:{background:string(input.background)}),...(input.responsibilities===undefined?{}:{responsibilities:string(input.responsibilities)}) }
        store.saveAgent(agent, typeof input.rules === 'string' ? input.rules : store.text('agents', key, 'RULES.md'), typeof input.memory === 'string' ? input.memory : store.text('agents', key, 'MEMORY.md'), { ...(typeof input.expectedMemory === 'string' ? { memory: input.expectedMemory } : {}), ...(typeof input.expectedRules === 'string' ? { rules: input.expectedRules } : {}), ...(typeof input.expectedName === 'string' ? { name: input.expectedName } : {}),...(typeof input.expectedModelId==='string'?{modelId:input.expectedModelId}:{}),...(typeof input.expectedBackground==='string'?{background:input.expectedBackground}:{}),...(typeof input.expectedResponsibilities==='string'?{responsibilities:input.expectedResponsibilities}:{}) }); send(res, agent); return
      }
      if(route==='/api/agents/archived'&&method==='GET'){send(res,store.agents(true).filter(agent=>agent.archivedAt));return}
      const lifecycle=route.match(/^\/api\/agents\/([a-zA-Z0-9_-]+)\/(archive|restore)$/)
      if(lifecycle&&method==='POST'){
        const target=lifecycle[1]
        if(lifecycle[2]==='archive'&&store.sessions().some(session=>store.isRunning(session.id)&&(session.agentId===target||session.memberIds?.includes(target))))throw new HttpError(409,'此成员正在参与运行，请停止或等待结束后移除')
        send(res,lifecycle[2]==='archive'?store.archiveAgent(target,string(input.reason),'user',string(input.expected)||undefined):store.restoreAgent(target));return
      }
      const direct = route.match(/^\/api\/agents\/([a-zA-Z0-9_-]+)\/(thread|model)$/)
      if (direct && direct[2] === 'thread' && method === 'GET') {
        const session = store.directSession(direct[1]); send(res, { ...session, ...historyPage(session.id, url.searchParams.get('before')), context: store.text('chats', session.id, 'context.md'), running: busy(session.id) }); return
      }
      if (direct && direct[2] === 'model' && method === 'PUT') {
        send(res,store.saveAgentModel(direct[1],string(input.modelId),typeof input.expectedModelId==='string'?input.expectedModelId:undefined));return
      }
      const agentMatch = route.match(/^\/api\/agents\/([a-zA-Z0-9_-]+)$/)
      if (agentMatch && method === 'GET') {
        const agent = store.agent(agentMatch[1]); send(res, { ...agent, rules: store.text('agents', agent.id, 'RULES.md'), memory: store.text('agents', agent.id, 'MEMORY.md') }); return
      }
      if(route==='/api/groups/archived'&&method==='GET'){send(res,store.sessions(true).filter(group=>group.kind==='group'&&group.archivedAt));return}
      const groupLifecycle=route.match(/^\/api\/groups\/([a-zA-Z0-9_-]+)\/(archive|restore)$/)
      const groupDelete=route.match(/^\/api\/groups\/([a-zA-Z0-9_-]+)$/)
      if(groupLifecycle&&method==='POST'||groupDelete&&method==='DELETE'){
        const key=groupLifecycle?.[1]||groupDelete![1]
        if(groupLifecycle?.[2]==='restore'){pauseGroupRoutines(store,key);send(res,store.restoreGroup(key));return}
        const archived=store.archiveGroup(key,string(input.reason,'用户确认删除群聊'),'user',string(input.expected)||undefined)
        active.get(key)?.abort();pauseGroupRoutines(store,key);pauseQueue(store,key,'群聊已删除，恢复后需手动核对队列');send(res,{...archived,historyPreserved:true});return
      }
      if (route === '/api/groups' && method === 'POST') {
        if (!Array.isArray(input.memberIds) || input.memberIds.some(value => typeof value !== 'string')) throw new HttpError(400, '请选择群成员')
        send(res, store.saveGroup(string(input.name), input.memberIds as string[], undefined, groupDetails({ ...input, replyMode: input.replyMode ?? 'collective',discussionMode:input.discussionMode??'open' })), 201); return
      }
      const groupMatch = route.match(/^\/api\/groups\/([a-zA-Z0-9_-]+)$/)
      if(groupMatch&&method==='GET'){const group=store.session(groupMatch[1]);if(group.kind!=='group')throw new HttpError(400,'这不是群聊');send(res,{...group,groupVersion:store.groupVersion(group.id)});return}
      if (groupMatch && method === 'PUT') {
        if (busy(groupMatch[1])) throw new HttpError(409, '请等本轮群聊结束后修改成员')
        if (!Array.isArray(input.memberIds) || input.memberIds.some(value => typeof value !== 'string')) throw new HttpError(400, '请选择群成员')
        send(res, store.saveGroup(string(input.name), input.memberIds as string[], groupMatch[1], groupDetails(input), undefined, typeof input.expected === 'string' ? input.expected : undefined)); return
      }
      const userTasks=route.match(/^\/api\/chats\/([a-zA-Z0-9_-]+)\/tasks(?:\/([a-zA-Z0-9_-]+))?$/)
      if(userTasks&&method==='POST'){
        const key=userTasks[1],taskId=userTasks[2]
        if(busy(key))throw new HttpError(409,'请等本轮协作结束后再修改任务')
        const result=userTaskAction(store,key,taskId?{...input,taskId}:{...input,action:input.action===undefined?'create':input.action})
        publish(key,{type:'tasks',tasks:result.tasks});send(res,result);return
      }
      const match = route.match(/^\/api\/chats\/([a-zA-Z0-9_-]+)(?:\/(chat|retry|stop|steer|actions|tasks|context|memory|memory-item|search|message|summarize|preferences|communication|reasoning|relations|improvement))?$/)
      if (match) {
        const key = match[1]; const action = match[2]; const storedSession = store.session(key); const session = {...storedSession,...(storedSession.componentKind==='city'?{memberIds:store.groupMembers(key)}:{})}
        if(session.archivedAt&&method!=='GET'&&action!=='stop')throw new HttpError(410,'群聊已删除，请先恢复')
        const agentId = string(input.agentId) || url.searchParams.get('agentId') || session.agentId
        if(action==='improvement'){
          if(method==='GET'){send(res,{session:improvementSession(store,key),history:evolutionHistory(store),scope:evolvable,acceptanceTests:readSource('').acceptanceTests});return}
          if(method==='POST'){
            if(input.operation==='stop'){active.get(key)?.abort();send(res,stopImprovement(store,key)||{status:'stopped',notice:'当前没有自动改进授权'});return}
            if(input.operation==='rollback'){if(busy(key))throw new HttpError(409,'请先停止本轮');send(res,rollbackEvolution(store,string(input.runId)));return}
            if(input.operation==='recover'){if(busy(key))throw new HttpError(409,'请先停止本轮');send(res,recoverEvolution(store,string(input.runId)));return}
            if(busy(key))throw new HttpError(409,'请先停止本轮再授权自动改进')
            send(res,authorizeImprovement(store,key,input));return
          }
        }
        if(action==='relations'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify({...relationshipView(store,key),health:collaborationHealth(store,key,store.recentTurns(key,1)[0],tasks(store,key))}))));return}
        if(action==='reasoning'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(reasoningView(store,key,{topic:url.searchParams.get('topic')||undefined,recordId:url.searchParams.get('recordId')||undefined,before:url.searchParams.get('before')||undefined})))));return}
        if(action==='communication'&&method==='GET'){
          const turnId=url.searchParams.get('turnId'),turn=turnId?store.turns(key).find(item=>item.id===turnId):store.recentTurns(key,1)[0]
          if(!turn)throw new HttpError(404,'没有找到本对话的讨论轮次')
          send(res,JSON.parse(redact(store,JSON.stringify(discussionView(turn,url.searchParams.get('topic')||undefined)))));return
        }
        if(action==='actions'&&method==='GET'){send(res,JSON.parse(redact(store,JSON.stringify(actions(store,key)))));return}
        if(action==='actions'&&method==='POST'){
          if(!active.has(key)&&store.isRunning(key))throw new HttpError(409,'此对话在另一个应用实例运行，请到发起回复的地址审批')
          if(typeof input.approve!=='boolean')throw new HttpError(400,'请选择批准或拒绝')
          send(res,JSON.parse(redact(store,JSON.stringify(decide(store,key,string(input.actionId),input.approve)))));return
        }
        if(action==='tasks'&&method==='GET'){send(res,tasks(store,key));return}
        if(action==='steer'&&method==='POST'){steerConversation(store,key,string(input.content),input.memberIds);pauseQueue(store,key,'用户插话，请核对后恢复后续排队消息');send(res,{ok:true});return}
        if (action === 'message' && method === 'GET') {
          const message = store.messages(key).find(message => message.id === url.searchParams.get('id'))
          if (!message) throw new HttpError(404, '来源消息不存在')
          send(res, message); return
        }
        if (['memory', 'memory-item', 'context', 'summarize'].includes(action) && !store.groupMembers(key).includes(agentId)) throw new HttpError(400, '请选择本次交流中的 Agent')
        if (action === 'preferences' && method === 'PUT') {
          if (busy(key)) throw new HttpError(409, '本轮结束后再切换群模型')
          send(res,store.saveGroupModel(key,string(input.modelId),typeof input.expectedModelId==='string'?input.expectedModelId:undefined));return
        }
        if (action === 'search' && method === 'GET') {
          send(res, store.searchHistory(key, url.searchParams.get('q') || '', 30).map(message => ({ ...message, content: message.content.slice(0, 4000), excerpted: message.content.length > 4000 }))); return
        }
        if (action === 'context' && method === 'GET') {
          let plan, error = ''
          try { const model = store.resolveModel(agentId, session.kind === 'group' ? session.modelId : ''); const context = store.context(key, model, undefined, agentId); plan = { chars: context.chars, budget: model.contextChars, included: context.includedMessageIds.length, omitted: context.omitted } }
          catch (cause) { error = cause instanceof HttpError ? cause.message : '上下文读取失败' }
          const summaryState = store.summaryState(key, agentId)
          send(res, { plan, error, summary: summaryState.summary, summaryValid: summaryState.valid, summaryReason: summaryState.reason, total: store.messages(key).length }); return
        }
        if (action === 'memory' || action === 'memory-item') {
          const scope = string(input.scope) || url.searchParams.get('scope') || (session.kind === 'group' ? 'group' : 'agent')
          if (scope !== 'agent' && scope !== 'group' && scope !== 'member') throw new HttpError(400, '未知记忆范围')
          if (method === 'GET' && action === 'memory') { send(res, { content: store.memory(key, agentId, scope), items: store.memoryItems(key, agentId, scope) }); return }
          if (method === 'PUT') {
            if (busy(key)) throw new HttpError(409, '请等本轮结束后修改记忆')
            if (action === 'memory-item') {
              if (input.action === 'add') send(res, store.rememberFact(key, agentId, scope, string(input.note), 'manual-' + crypto.randomUUID(), undefined, 'manual'))
              else send(res, store.editMemoryItem(key, agentId, scope, string(input.itemId), string(input.action), string(input.expected), string(input.note)))
              return
            }
            if (typeof input.expected === 'string' && input.expected !== store.memory(key, agentId, scope)) throw new HttpError(409, '记忆已在其他窗口更新。你的编辑仍在，请复制后重新载入对照')
            store.updateMemory(key, agentId, scope, string(input.content), crypto.randomUUID(), false, typeof input.expected === 'string' ? input.expected : undefined); send(res, { ok: true }); return
          }
        }
        if (action === 'summarize' && method === 'POST') {
          if (busy(key)) throw new HttpError(409, '这个对话正在运行')
          const release = store.acquireRun(key), controller = new AbortController(); active.set(key, controller)
          try { send(res, await summarize(store, key, agentId, AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]))) }
          catch (error) { throw error instanceof HttpError ? error : new HttpError(502, controller.signal.aborted ? '整理已停止，原摘要保持不变' : '整理失败或超时，原摘要保持不变') }
          finally { active.delete(key); release() }
          return
        }
        if (!action && method === 'GET') {
          send(res, { ...session,...(session.kind==='group'?{groupVersion:store.groupVersion(key)}:{}), ...historyPage(key, url.searchParams.get('before')), context: store.text('chats', key, 'context.md'), running: busy(key) }); return
        }
        if (action === 'context' && method === 'PUT') {
          if (busy(key)) throw new HttpError(409, '生成中不能修改上下文')
          if (typeof input.expected === 'string' && input.expected !== store.text('chats', key, 'context.md')) throw new HttpError(409, '背景已在其他窗口更新，请先保留你的编辑再重新载入')
          const contextText = string(input.context)
          if (contextText.length > 200000) throw new HttpError(400, '摘要过长')
          atomic(store.file('chats', key, 'context.md'), contextText); send(res, { ok: true }); return
        }
        if (action === 'stop' && method === 'POST') {
          if (!active.has(key) && store.isRunning(key)) throw new HttpError(409, '正在另一个应用实例运行，请到发起回复的窗口停止')
          pauseLife(store,key,'用户停止当前工作与日常活动');lifeScheduler.pause(key);pauseQueue(store,key,'用户停止当前工作，后续消息已暂停');active.get(key)?.abort(); if(improvementSession(store,key)?.status==='active')stopImprovement(store,key);send(res, { ok: true }); return
        }
        if ((action === 'chat' || action === 'retry') && method === 'POST') {
          if (busy(key)) throw new HttpError(409, '这个对话正在生成，请稍候或停止')
          const retryTurnId = action === 'retry' ? string(input.turnId) : ''
          const content = retryTurnId ? store.turns(key).find(turn => turn.id === retryTurnId)?.content || '' : string(input.content).trim()
          if (!content) throw new HttpError(400, '消息不能为空')
          const release = store.acquireRun(key), controller = new AbortController(); active.set(key, controller)
          const onClose = () => controller.abort()
          res.on('close', onClose)
          try {
            const event = (value: Record<string, unknown>) => {
              if(value.type==='group_removed'){const removed=string(value.groupId);active.get(removed)?.abort();pauseGroupRoutines(store,removed);pauseQueue(store,removed,'群聊已删除，后续消息暂停')}
              if (res.destroyed) return
              if (!res.headersSent) res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
              res.write(redact(store,JSON.stringify(value)) + '\n')
            }
            await runConversation(store, key, content, string(input.modelId), controller.signal, event, input.memberIds, { retryTurnId, requestId: string(input.requestId) || undefined })
          } catch (error) {
            const message = controller.signal.aborted ? '已停止，部分回复已保存' : error instanceof HttpError ? error.message : '连接模型失败，请检查 API 地址、网络与服务状态'
            if (!res.headersSent) send(res, { error: message }, error instanceof HttpError ? error.status : 500)
            else if (!res.destroyed) res.write(JSON.stringify({ type: 'error', conversationId:key, message }) + '\n')
          } finally {
            active.delete(key); release(); res.off('close', onClose); if (!res.destroyed) res.end()
          }
          return
        }
      }
      if (route === '/api/export' && method === 'GET') {
        if (active.size || store.sessions().some(session => store.isRunning(session.id))) throw new HttpError(409, '请等待所有回复结束后再导出，保证数据完整')
        const zip = portableZip(store.root)
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="taoagent-portable.zip"', 'Cache-Control': 'no-store', 'Content-Length': zip.length })
        res.end(zip); return
      }
      throw new HttpError(404, '路径不存在')
    } catch (error) {
      // Unexpected failures were previously invisible; keep a redacted trace in the local console.
      if (!(error instanceof HttpError) || error.status >= 500) logFailure(store, (req.method || 'GET') + ' ' + (req.url || '/').split('?')[0], error)
      if (!res.headersSent) send(res, { error: error instanceof HttpError ? error.message : '读取或写入失败，请检查数据格式与目录权限' }, error instanceof HttpError ? error.status : 500)
      else res.end()
    }
  })
  server.on('listening', () => { scheduler.start(); queueScheduler.start();lifeScheduler.start() })
  server.on('close', () => { closeSubscribers();scheduler.stop(); queueScheduler.stop();lifeScheduler.stop(); for (const controller of active.values()) controller.abort() })
  return { server, store, active, queueScheduler,lifeScheduler }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let port = Number(process.env.PORT || 3467)
  if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error('PORT must be an integer between 0 and 65535.'); process.exit(1) }
  const app = createApp(path.resolve(process.env.TAOAGENT_HOME || path.join(ROOT, 'home')))
  app.server.on('error', (error: NodeJS.ErrnoException) => {
    if(error.code==='EADDRINUSE'&&!process.env.PORT&&port<3487){port++;app.server.listen(port,'127.0.0.1');return}
    console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请设置其他 PORT。` : '应用启动失败，请检查目录和端口权限')
    process.exitCode = 1
  })
  app.server.on('listening',()=>{const address=app.server.address(),actualPort=address&&typeof address==='object'?address.port:port,url=`http://127.0.0.1:${actualPort}`,version=string(object(JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'))).version);console.log(`Taoagent ${version} · Pi → ${url}\n数据 → ${app.store.root}\n关闭此窗口或 Ctrl+C 退出。`);if(process.env.TAOAGENT_LAUNCHER==='1')console.log('TAOAGENT_READY '+JSON.stringify({port:actualPort}));if(process.platform==='win32'&&!process.env.TAOAGENT_NO_OPEN){const browser=spawn('explorer.exe',[url],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>{});browser.unref()}})
  app.server.listen(port, '127.0.0.1')
  process.on('unhandledRejection',reason=>logFailure(app.store,'unhandled rejection',reason))
  const shutdown=()=>{for(const controller of app.active.values())controller.abort();app.server.close();setTimeout(()=>process.exit(0),2500).unref()}
  process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);if(process.platform==='win32')process.once('SIGBREAK',shutdown)
}
