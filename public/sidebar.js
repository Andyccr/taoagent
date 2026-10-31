// Navigation model shared by the client and regression tests. Never reads chat bodies.
export function sidebarComponentType(group) {
  return group.componentKind || (group.discussionMode === 'directed' || group.replyMode !== 'collective' ? 'task' : 'emergent')
}
export const sidebarLabels = {agent:'独立 Bot',emergent:'涌现群聊',chat:'纯聊天',task:'任务组',city:'City 聊天室'}
export function buildSidebarSections(state, filters = {}, statusOf = () => ({status:'idle',label:''})) {
  const pinned = new Set(state.navigation?.pinned || [])
  const conversations = new Map((state.conversations || []).map(item => [item.target.type+':'+item.target.id,item]))
  const names = new Map(state.agents.map(agent => [agent.id,agent.name]))
  const entries = [
    ...state.agents.map(agent => ({...agent,type:'agent',kind:'agent',label:agent.name,legacy:!!agent.legacy})),
    ...state.groups.map(group => ({...group,type:'group',kind:sidebarComponentType(group),label:group.title})),
  ].map(item => {
    const key=item.type+':'+item.id
    const info=statusOf(item.type,item.id)
    const conversation=conversations.get(key)
    return {...item,key,pinned:pinned.has(key),info,preview:conversation?.preview||'',previewAuthor:conversation?.previewAuthor||'',previewTruncated:!!conversation?.previewTruncated,updated:conversation?.previewAt||conversation?.updatedAt||item.updatedAt||''}
  })
  const words=(filters.search||'').trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean)
  const matching=entries.filter(item=>{
    if(filters.kind&&filters.kind!=='all'&&(filters.kind==='group'?!['emergent','chat','city'].includes(item.kind):item.kind!==filters.kind))return false
    if(filters.status&&filters.status!=='all'&&(filters.status==='pinned'?!item.pinned:item.info.status!==filters.status))return false
    const text=[item.label,item.id,item.responsibilities,sidebarLabels[item.kind],...(item.memberIds||[]),...(item.memberIds||[]).map(id=>names.get(id)||id)].join(' ').toLocaleLowerCase()
    return words.every(word=>text.includes(word))
  })
  const ranks={waiting:0,failed:1,running:2,queued:3,unread:4,idle:5}
  const sort=(a,b)=>(ranks[a.info.status]??5)-(ranks[b.info.status]??5)||Number(b.id==='main')-Number(a.id==='main')||b.updated.localeCompare(a.updated)||a.label.localeCompare(b.label,'zh-CN',{numeric:true})||a.id.localeCompare(b.id)
  const sections=[{id:'pinned',label:'置顶',items:matching.filter(item=>item.pinned).sort(sort)}]
  for(const kind of ['agent','emergent','chat','task','city'])sections.push({id:kind,label:sidebarLabels[kind],items:matching.filter(item=>!item.pinned&&!item.legacy&&item.kind===kind).sort(sort)})
  sections.push({id:'legacy',label:'以前导入的 Bot',items:matching.filter(item=>!item.pinned&&item.legacy).sort(sort)})
  return {sections:sections.filter(section=>section.items.length),count:matching.length,total:entries.length}
}

export function sidebarQuickTab(kind = 'all') {
  return ['all','agent','group','task'].includes(kind) ? kind : ''
}
export function sidebarSectionExpanded(section, {search='',filtered=false,closed=new Set()}={}) {
  if(String(search||'').trim()||filtered)return true
  return !closed.has(section.id)
}
