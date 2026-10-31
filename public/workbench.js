export const ROSTER_DEFAULT = 360
export function rosterWidth(value, viewport) {
  if(viewport<=760)return Math.max(240,Math.min(408,viewport-52))
  const minimum=viewport<1100?280:300
  const maximum=Math.max(minimum,Math.min(520,viewport-64-480))
  const requested=Number(value)
  return Math.round(Math.max(minimum,Math.min(maximum,Number.isFinite(requested)&&requested>0?requested:ROSTER_DEFAULT)))
}
export function conversationTime(value, now=Date.now()) {
  const date=new Date(value),today=new Date(now)
  if(!value||!Number.isFinite(date.getTime()))return ''
  if(date.toDateString()===today.toDateString())return date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})
  const yesterday=new Date(today);yesterday.setDate(today.getDate()-1)
  return date.toDateString()===yesterday.toDateString()?'昨天':date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})
}
export function rosterPreview(item) {
  if(item.preview)return (item.type==='group'&&item.previewAuthor?item.previewAuthor+'：':'')+item.preview
  return item.responsibilities||item.purpose||(item.type==='agent'?'有想法就来聊聊，我会记住我们的交流。':'邀请成员，从一个问题或想法开始。')
}

export function inspectorTaskState(task){
  if(task.review?.status==='changes_requested')return {label:'待返工',finished:false}
  if(task.status==='complete')return task.requireReview&&task.review?.status!=='accepted'?{label:'待验收',finished:false}:{label:'已完成',finished:true}
  return {label:task.status==='review'?'待验收':'待推进',finished:false}
}
