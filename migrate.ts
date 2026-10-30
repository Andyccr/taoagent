import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { Store, atomic, json, object, string } from './store.ts'
import { ROOT } from './portable.ts'

const endpoints: Record<string, string> = {
  openai: 'https://api.openai.com/v1', anthropic: 'https://api.anthropic.com/v1', google: 'https://generativelanguage.googleapis.com/v1beta',
  gemini: 'https://generativelanguage.googleapis.com/v1beta', deepseek: 'https://api.deepseek.com/v1', xai: 'https://api.x.ai/v1',
  groq: 'https://api.groq.com/openai/v1', openrouter: 'https://openrouter.ai/api/v1', ollama: 'http://127.0.0.1:11434/v1',
  together: 'https://api.together.xyz/v1', mistral: 'https://api.mistral.ai/v1',
}
export function migrate(legacy: string, destination: string, currentRoot = ROOT) {
  const store = new Store(destination)
  if (fs.existsSync(store.file('archive', 'migration-report.json'))) throw new Error('已经迁移过，拒绝重复写入；如需重新迁移，请使用一个空的目标目录')
  const warnings: string[] = []; let agentCount = 0; let chatCount = 0
  const dataSources = [
    { name: 'original', dir: path.join(legacy, 'data'), fallback: path.join(currentRoot, 'data') },
    { name: 'personal', dir: path.join(currentRoot, '.taoagent', 'data'), fallback: path.join(legacy, '.taoagent', 'data') },
  ]
  function copyTree(source: string, destination: string) {
    if (!fs.existsSync(source)) return
    const stat = fs.lstatSync(source)
    if (stat.isSymbolicLink()) { warnings.push('未复制外部链接：' + path.basename(source)); return }
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true })
      for (const name of fs.readdirSync(source)) copyTree(path.join(source, name), path.join(destination, name))
    } else if (!/\.db(?:-wal|-shm)?$/.test(source)) {
      fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(source, destination)
    }
  }
  const envSecrets: string[] = []
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const full = path.join(legacy, file)
    if (fs.existsSync(full)) {
      copyTree(full, store.file('archive', file))
      const match = fs.readFileSync(full, 'utf8').match(/^CREDENTIAL_SECRET\s*=\s*["']?([a-fA-F0-9]{64})/m)
      if (match) envSecrets.push(match[1])
    }
  }
  const mapped = new Map<string, string>()
  for (const source of dataSources) {
    const archive = store.file('archive', source.name)
    copyTree(source.fallback, archive); copyTree(source.dir, archive)
    const dbDirs = [source.dir, source.fallback].filter((dir, index, all) => all.indexOf(dir) === index)
    const snapshots: Record<string, Record<string, unknown>[]> = {}
    const seen = new Set<string>()
    for (const dir of dbDirs) {
      if (!fs.existsSync(dir)) continue
      for (const filename of fs.readdirSync(dir).filter(name => name.endsWith('.db'))) {
        if (seen.has(filename)) continue
        seen.add(filename)
        const db = new DatabaseSync(path.join(dir, filename), { readOnly: true })
        const tables: Record<string, unknown[]> = {}
        try {
          db.exec('BEGIN')
          for (const row of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()) {
            const name = String(row.name)
            const values = db.prepare('SELECT * FROM "' + name.replace(/"/g, '""') + '"').all()
            tables[name] = values.map(value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
              item instanceof Uint8Array ? { encoding: 'base64', data: Buffer.from(item).toString('base64') } : item,
            ])))
            if (filename === 'taoagent.db' || filename === 'swarmclaw.db') snapshots[name] = values.map(value => {
              if (typeof value.data === 'string') { try { return object(JSON.parse(value.data)) } catch {} }
              return value as Record<string, unknown>
            })
          }
          db.exec('COMMIT')
        } finally { db.close() }
        json(path.join(archive, filename + '.json'), tables)
      }
    }
    const secrets = [...envSecrets]
    for (const dir of dbDirs) {
      const secretFile = path.join(dir, 'credential-secret')
      if (fs.existsSync(secretFile)) secrets.push(fs.readFileSync(secretFile, 'utf8').trim())
    }
    function credential(credentialId: string, provider: string): string {
      const credentials = snapshots.credentials || []
      const record = credentialId ? credentials.find(c => c.id === credentialId) : credentials.find(c => c.provider === provider)
      if (!record) return ''
      const encrypted = string(record.encryptedKey)
      for (const secret of secrets) {
        try {
          const [iv, tag, data] = encrypted.split(':')
          const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(secret, 'hex'), Buffer.from(iv, 'hex'))
          decipher.setAuthTag(Buffer.from(tag, 'hex'))
          return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8')
        } catch {}
      }
      warnings.push('旧凭据无法解密，已保留原文，请重新填写：' + string(record.id)); return ''
    }
    function getModel(raw: Record<string, unknown>): string {
      const provider = string(raw.provider); const model = string(raw.model)
      const endpoint = string(raw.apiEndpoint) || string(raw.endpoint) || endpoints[provider]
      if (!model || !endpoint || /^(claude-cli|codex-cli|openclaw|opencode|gemini-cli)$/.test(provider)) return ''
      const apiKey = credential(string(raw.credentialId), provider)
      const signature = JSON.stringify([provider, model, endpoint, apiKey])
      if (mapped.has(signature)) return mapped.get(signature) || ''
      const key = crypto.randomUUID()
      try {
        store.saveModel({ id: key, name: provider + ' · ' + model, protocol: provider === 'anthropic' ? 'anthropic' : ['google', 'gemini'].includes(provider) ? 'gemini' : 'openai', model, baseUrl: endpoint, apiKey })
        mapped.set(signature, key); return key
      } catch { warnings.push('模型配置需手动确认，原文已归档：' + provider + '/' + model); return '' }
    }
    for (const model of snapshots.tao_models || []) getModel(model)
    for (const raw of snapshots.agents || []) {
      const agentId = source.name + '-' + string(raw.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
      const modelId = getModel(raw)
      store.saveAgent({ id: agentId, name: string(raw.name, '旧 Agent'), modelId }, [string(raw.systemPrompt), string(raw.soul), string(raw.description)].filter(Boolean).join('\n\n'), '')
      json(store.file('agents', agentId, 'legacy.json'), raw); agentCount++
    }
    for (const raw of snapshots.sessions || []) {
      const agentId = source.name + '-' + string(raw.agentId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
      const session = store.createSession(store.agents().some(a => a.id === agentId) ? agentId : 'main', getModel(raw))
      const rawMessages = (snapshots.session_messages || []).filter(m => m.session_id === raw.id)
      // session_messages stores data without session_id after parsing; query the archived rows for the relational key.
      let messages: unknown[] = Array.isArray(raw.messages) ? raw.messages : []
      const dbArchive = ['taoagent.db.json', 'swarmclaw.db.json'].map(name => path.join(archive, name)).find(file => fs.existsSync(file))
      if (dbArchive) {
        const tables = JSON.parse(fs.readFileSync(dbArchive, 'utf8')) as Record<string, Record<string, unknown>[]>
        const rows = (tables.session_messages || []).filter(m => m.session_id === raw.id).sort((a,b) => Number(a.seq) - Number(b.seq))
        if (rows.length) messages = rows.map(row => JSON.parse(string(row.data)) as unknown)
      } else if (rawMessages.length) messages = rawMessages
      for (const value of messages) {
        const msg = object(value)
        if (msg.role === 'user' || msg.role === 'assistant') {
          const text = typeof msg.text === 'string' ? msg.text : typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? msg)
          store.append(session.id, msg.role, text)
        }
      }
      session.title = string(raw.name, '迁移的对话'); session.updatedAt = store.session(session.id).updatedAt
      json(store.file('chats', session.id, 'session.json'), session)
      json(store.file('chats', session.id, 'legacy.json'), raw); chatCount++
    }
    const settings = (snapshots.settings || [])[0]
    if (settings) {
      const profile = Object.fromEntries(Object.entries(settings).filter(([key]) => /^(userName|personal|owner|profile|userPreferences|userBio)/i.test(key)))
      if (Object.keys(profile).length) atomic(store.file('PROFILE.md'), store.text('PROFILE.md') + '\n## 旧个人设置\n\n```json\n' + JSON.stringify(profile, null, 2) + '\n```\n')
    }
  }
  for (const folder of ['workspace', 'browser-profiles']) {
    copyTree(path.join(legacy, '.taoagent', folder), store.file('archive', folder))
    copyTree(path.join(currentRoot, '.taoagent', folder), store.file('archive', folder))
  }
  const report = { version: 1, at: new Date().toISOString(), agents: agentCount, chats: chatCount, models: store.models().length, warnings }
  json(store.file('archive', 'migration-report.json'), report)
  return report
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(migrate(path.resolve(process.argv[2] || path.join(ROOT, '..', 'taoagent-legacy-20261020')), path.resolve(process.env.TAOAGENT_HOME || path.join(ROOT, 'home'))), null, 2))
}
