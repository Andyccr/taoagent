// A shared place shows public events. Personal notes stay in member inspection.
export function mountSquare({el,button,heading,empty,snapshot,brief,agentName,date,editMember,editAgenda,compose,showSource,wake,navigate,openChat,content}){
  const stage=el('section',undefined,'village'),people=el('div',undefined,'village-people')
  stage.append(heading('此刻，大家在这里','点击成员看看 TA 的关注与经历，或者加入正在发生的交流。'))
  for(const member of snapshot.members){
    const run=snapshot.runs.findLast(item=>item.agentId===member.agentId)
    const active=run?.status==='running',card=button('',()=>editMember(member),'village-person')
    card.dataset.active=String(active)
    const avatar=el('span',member.name.slice(0,1),'village-avatar')
    card.append(avatar,el('strong',member.name),el('small',active?'正在思考或交流':member.attention||member.interests||'还没有留下关注'),el('span',active?'活动中':'查看自己的世界 ↗','village-person-state'))
    people.append(card)
  }
  stage.append(people);content.append(stage)
  const layout=el('div',undefined,'village-layout'),conversation=el('section',undefined,'village-conversation'),side=el('div',undefined,'village-side')
  conversation.append(heading('广场里的声音','这里仅展示已经完成的公开交流。各自的笔记不会自动变成公共消息。'))
  if(!brief?.recent.length)conversation.append(empty('广场还很安静。留下一个问题，或为成员设定不同的关注，让相遇有一个起点。'))
  for(const message of brief?.recent||[]){const card=el('article',undefined,'village-message'),head=el('div');head.append(el('span',message.author.slice(0,1),'town-avatar'),el('strong',message.author),el('time',date(message.at)));card.append(head,el('p',message.text+(message.excerpted?'…':'')));if(message.excerpted)card.append(button('阅读全文',()=>showSource(message.id)));conversation.append(card)}
  conversation.append(button('加入这场交流 ↗',openChat,'primary'))
  side.append(heading('还想继续的事','未完的话题，留待下次相遇。'))
  const agendas=snapshot.agendas.filter(item=>item.status!=='done').slice(-3)
  if(!agendas.length)side.append(el('p','还没有持续话题。可以先从各自感兴趣的事聊起。','town-note'))
  for(const agenda of agendas){const card=el('article',undefined,'village-topic');card.append(el('small',agentName(agenda.ownerId)+' 正在关注'),el('h3',agenda.title),button('接着聊',()=>compose('继续这个话题：'+agenda.title+'\n'+agenda.question)));side.append(card)}
  side.append(button('＋ 留下一个话题',()=>editAgenda()))
  const rhythm=el('details',undefined,'village-rhythm');rhythm.append(el('summary','日常节奏 · '+(snapshot.policy.enabled?'已开启':'已暂停')),el('p',snapshot.policy.enabled?'成员按 '+snapshot.policy.intervalMinutes+' 分钟间隔轮到独立活动；可以分享、反思、工作或保持安静。服务关闭时不运行。':'目前不会自动产生新的活动。你可以手动讨论，或在设置中开启日常。','town-note'),button('节奏与预算',()=>navigate('settings')));if(snapshot.policy.enabled)rhythm.append(button('邀请一次自主活动',wake));side.append(rhythm)
  layout.append(conversation,side);content.append(layout)
}
