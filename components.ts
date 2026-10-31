import crypto from 'node:crypto'
import { Store, HttpError, json, object, string, readJsonSafe } from './store.ts'

export const CITY_ROOM = 'city-public'
export function cityConfig(store: Store) {
  const raw = object(readJsonSafe<Record<string,unknown>>(store.file('empire-city.json'),{}))
  const revision = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex')
  return { name: string(raw.name, 'City · 共同生活'), description: string(raw.description, '所有 Bot 都生活在这里。观看真实动态，或进入城市聊天室。'), leadAgentId: string(raw.leadAgentId, 'main'), revision }
}
export function saveCity(store: Store, input: Record<string, unknown>) {
  return store.updateCityConfig(()=>saveCityUnlocked(store,input))
}
function saveCityUnlocked(store: Store, input: Record<string, unknown>) {
  const previous = cityConfig(store)
  if (input.expected !== previous.revision) throw new HttpError(409, 'City 已更新，请重新读取后修改')
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80 || typeof input.description !== 'string' || input.description.length > 6000 || typeof input.leadAgentId !== 'string') throw new HttpError(400, '请填写有效的 City 名称、介绍和主 Bot')
  store.requireActiveAgent(input.leadAgentId)
  const raw = object(readJsonSafe<Record<string,unknown>>(store.file('empire-city.json'),{}))
  json(store.file('empire-city.json'), { ...raw, name: input.name.trim(), description: input.description, leadAgentId: input.leadAgentId })
  return cityConfig(store)
}
export function cityRoom(store: Store) {
  const existing = store.sessions(true).find(item => item.id === CITY_ROOM)
  if (existing?.archivedAt) throw new HttpError(410, '城市聊天室已归档，请在设置中恢复')
  const config = cityConfig(store)
  const room = existing || store.saveGroup('城市聊天室', store.agents().map(agent => agent.id), undefined, { componentKind: 'city', spaceKind: 'social', purpose: config.description, discussionMode: 'open' }, CITY_ROOM)
  return { ...room, memberIds: store.groupMembers(room.id) }
}
export function cityOverview(store: Store) {
  const room = store.sessions().find(item => item.id === CITY_ROOM)
  return { config: cityConfig(store), memberIds: store.agents().map(agent => agent.id), room: room ? { ...room, memberIds: store.groupMembers(room.id) } : null, messages: room ? store.messages(room.id).filter(message => !message.kind).slice(-20) : [] }
}
