import {rosterWidth,conversationTime,rosterPreview,inspectorTaskState,ROSTER_DEFAULT} from './workbench.js'
import {buildSidebarSections,sidebarSectionExpanded,sidebarQuickTab,sidebarComponentType as componentType} from './sidebar.js'
import './town.js'
import './civilization.js'
window.addEventListener('tao-select-group',event=>{if(target?.type==='group'&&target.id===event.detail)return;openTarget({type:'group',id:event.detail}).catch(error=>toast(error.message))})
window.addEventListener('tao-open-group',event=>{openTarget({type:'group',id:event.detail}).catch(error=>toast(error.message))})
window.addEventListener('tao-work-open',async event=>{try{await openTarget({type:'group',id:event.detail});if(current?.id!==event.detail)return;await openConversationControl('#work-panel')}catch(error){toast(error.message)}})
window.addEventListener('tao-queue-open',async event=>{try{await openTarget({type:'group',id:event.detail});if(current?.id===event.detail)$('#queue-open').click()}catch(error){toast(error.message)}})
window.addEventListener('tao-compose-group',async event=>{try{await openTarget({type:'group',id:event.detail.id});if(current?.id!==event.detail.id)return;$('#prompt').value=$('#prompt').value.trim()?$('#prompt').value+'\n\n'+event.detail.text:event.detail.text;$('#prompt').dispatchEvent(new Event('input'));$('#prompt').focus()}catch(error){toast(error.message)}})
window.addEventListener('tao-edit-common',async event=>{try{await openTarget({type:'group',id:event.detail});if(current?.id===event.detail)$('#context-open').click()}catch(error){toast(error.message)}})
const showComponentLanding=false
const $ = selector => document.querySelector(selector)
const volatilePreferences = new Map()
let state = { models: [], account: {}, agents: [], groups: [], running: [] }
let inspectorWork=null,inspectorTab='overview',inspectorFingerprint='',inspectorReturnFocus=null
let current = null, target = null, loadVersion = 0, toastTimer, stateFingerprint = ''
const drafts = new Map(), pending = new Set(), streams = new Map()
const groupRecipients = new Map(), sendingIds = new Map()
const submittingThreads = new Set()
const submissionControllers = new Map()
let memoryEditor = null, memoryLoadVersion = 0, contextOriginal = '', followLatest = true, mentionIndex = 0, agentOriginal = null, profileOriginal = null
let contextLoadVersion = 0, historyLoadVersion = 0
const summaryRuns = new Map()
let factEditorOriginal = '', groupOriginal = '', agentEditOrigin = null
const draftWrites = new Map(), draftTimers = new Map(), draftBases = new Map()
const draftProblems = new Map()
let draftRecovery = null
const modelForm = $('#model-form'), agentForm = $('#agent-form'), groupForm = $('#group-form')
const dialogLoads = new Map()
let confirmationPending = false
function confirmAction(message, acceptLabel='放弃修改', cancelLabel='继续编辑') {
  if(confirmationPending)return Promise.resolve(false)
  confirmationPending=true
  const dialog=$('#confirm-dialog');$('#confirm-message').textContent=message;$('#confirm-accept').textContent=acceptLabel;$('#confirm-cancel').textContent=cancelLabel
  return new Promise(resolve=>{
    let finished=false
    const finish=value=>{if(finished)return;finished=true;dialog.close();confirmationPending=false;resolve(value)}
    $('#confirm-cancel').onclick=()=>finish(false);$('#confirm-accept').onclick=()=>finish(true);dialog.oncancel=event=>{event.preventDefault();finish(false)}
    dialog.showModal();$('#confirm-cancel').focus()
  })
}
async function loadDialog(dialog, load) {
  if (dialog.dataset.saving) { toast('正在保存，请稍候'); return }
  const token = {}; dialogLoads.set(dialog.id, token); dialog.dataset.loading = 'true'
  let loader = dialog.querySelector('.dialog-loader')
  if (!loader) { loader = document.createElement('div'); loader.className = 'dialog-loader'; loader.setAttribute('role','status'); dialog.append(loader) }
  loader.replaceChildren(); loader.hidden = false; loader.textContent = '正在载入，请稍候…'
  if (!dialog.open) dialog.showModal()
  try {
    const apply = await load()
    if (dialogLoads.get(dialog.id) !== token || !dialog.open) return
    apply(); delete dialog.dataset.loading; loader.hidden = true; markDialogClean(dialog)
  } catch (error) {
    if (dialogLoads.get(dialog.id) !== token || !dialog.open) return
    loader.textContent = error.message || '载入失败，请重试'
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重新载入'; retry.onclick = () => loadDialog(dialog,load); loader.append(retry)
  }
}
function preference(key, value) { if(value!==undefined)volatilePreferences.set(key,value);try { if (value !== undefined) localStorage.setItem('taoagent.' + key, value); return volatilePreferences.has(key)?volatilePreferences.get(key):localStorage.getItem('taoagent.' + key) } catch { return volatilePreferences.get(key)??null } }
let newlineMode = preference('newline') === 'true'
const systemTheme = matchMedia('(prefers-color-scheme: dark)')
function setTheme(theme) { document.documentElement.dataset.theme = theme; $('#theme-toggle').setAttribute('aria-label','外观与主题');$('#quick-theme').setAttribute('aria-label',theme==='dark'?'切换到浅色主题':'切换到深色主题');$('#quick-theme').title=theme==='dark'?'切换到浅色主题':'切换到深色主题';$('#quick-theme').textContent=theme==='dark'?'☀':'◐' }
const visualStyles=[
  {id:'studio',name:'极简工作台',tag:'STUDIO',description:'清晰留白，专注每次对话',light:'#fafafb',dark:'#16181d'},
  {id:'paper',name:'暖纸书房',tag:'PAPER',description:'温润纸感，适合深读与思考',light:'#f7f3eb',dark:'#24211e'},
  {id:'terminal',name:'终端实验室',tag:'TERMINAL',description:'等宽字形，利落的工程秩序',light:'#f2f5f1',dark:'#111713'},
  {id:'aurora',name:'极光空间',tag:'AURORA',description:'轻盈层次，让灵感自由展开',light:'#f2f4fb',dark:'#151725'},
  {id:'ink',name:'黑白印记',tag:'INK',description:'鲜明对比，克制而有力量',light:'#ffffff',dark:'#0e0e0e'},
]
const appearanceColors=[{id:'auto',name:'风格原色',hex:'#7b7b78'},{id:'copper',name:'陶土',hex:'#b65a3c'},{id:'moss',name:'苔绿',hex:'#4c7657'},{id:'ocean',name:'海蓝',hex:'#386cb5'},{id:'violet',name:'鸢紫',hex:'#7a58b3'},{id:'rose',name:'玫瑰',hex:'#b8496f'},{id:'amber',name:'琥珀',hex:'#a77724'},{id:'cyan',name:'青瓷',hex:'#247d83'},{id:'custom',name:'自定义',hex:'#5865f2'}]
function appearanceChoice(key,values,fallback){const value=preference(key);return values.includes(value)?value:fallback}
function colorChannels(hex){return [1,3,5].map(index=>parseInt(hex.slice(index,index+2),16))}
function mixColor(hex,target,amount){const a=colorChannels(hex),b=colorChannels(target);return '#'+a.map((value,index)=>Math.round(value+(b[index]-value)*amount).toString(16).padStart(2,'0')).join('')}
function colorContrast(first,second){const luminance=hex=>colorChannels(hex).map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);const a=luminance(first),b=luminance(second);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
function accessibleAccent(raw,background,dark){
  const hex=/^#[a-f0-9]{6}$/i.test(raw)?raw:'#5865f2',target=dark?'#ffffff':'#000000'
  let accent=hex,soft=mixColor(accent,background,.9)
  for(let step=0;step<=100;step++){accent=mixColor(hex,target,step/100);soft=mixColor(accent,background,.9);if(colorContrast(accent,background)>=4.5&&colorContrast(accent,soft)>=4.5)break}
  const text=colorContrast(accent,'#ffffff')>=colorContrast(accent,'#000000')?'#ffffff':'#000000'
  return {accent,soft,text}
}
function applyAppearance() {
  const theme=appearanceChoice('theme',['system','light','dark'],'system'),dark=theme==='system'?systemTheme.matches:theme==='dark'
  setTheme(dark?'dark':'light')
  const root=document.documentElement,style=visualStyles.find(style=>style.id===appearanceChoice('visualStyle',visualStyles.map(item=>item.id),'studio'))
  root.dataset.visualStyle=style.id;root.dataset.colorway=appearanceChoice('colorway',appearanceColors.map(item=>item.id),'auto')
  root.dataset.readingSize=appearanceChoice('readingSize',['default','large'],'default');root.dataset.density=appearanceChoice('density',['comfortable','compact'],'comfortable')
  root.dataset.readingFont=appearanceChoice('readingFont',['system','serif','mono'],'system');root.dataset.motion=appearanceChoice('motion',['auto','reduce'],'auto')
  const color=appearanceColors.find(color=>color.id===root.dataset.colorway)
  if(color.id==='auto'){for(const key of ['--accent','--accent-soft','--accent-text'])root.style.removeProperty(key)}
  else{const raw=color.id==='custom'?preference('customColor')||color.hex:color.hex,tokens=accessibleAccent(raw,dark?style.dark:style.light,dark);root.style.setProperty('--accent',tokens.accent);root.style.setProperty('--accent-soft',tokens.soft);root.style.setProperty('--accent-text',tokens.text)}
  for(const button of document.querySelectorAll('[data-style-choice]'))button.setAttribute('aria-pressed',String(button.dataset.styleChoice===style.id))
  for(const button of document.querySelectorAll('[data-color-choice]'))button.setAttribute('aria-pressed',String(button.dataset.colorChoice===color.id))
  $('#appearance-custom-row').hidden=color.id!=='custom'
  $('#appearance-preview-name').textContent=style.name+' · '+color.name+' · '+(dark?'深色':'浅色')
}
$('#theme-toggle').onclick = () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(theme); preference('theme', theme) }
function renderEnterMode() { $('#enter-mode').textContent = newlineMode ? 'Enter 换行 · Ctrl/⌘+Enter 发送' : 'Enter 发送 · Shift+Enter 换行'; $('#enter-mode').setAttribute('aria-pressed', String(newlineMode)) }
renderEnterMode()
$('#enter-mode').onclick = () => { newlineMode = !newlineMode; preference('newline', String(newlineMode)); renderEnterMode(); $('#prompt').focus() }
function syncAppearance() { $('#appearance-theme').value = appearanceChoice('theme',['system','light','dark'],'system'); $('#appearance-size').value = document.documentElement.dataset.readingSize; $('#appearance-density').value = document.documentElement.dataset.density; $('#appearance-enter').value = newlineMode ? 'newline' : 'send';$('#appearance-font').value=document.documentElement.dataset.readingFont;$('#appearance-motion').value=document.documentElement.dataset.motion;$('#appearance-custom').value=/^#[a-f0-9]{6}$/i.test(preference('customColor')||'')?preference('customColor'):'#5865f2';applyAppearance() }
for (const [selector,key] of [['#appearance-theme','theme'],['#appearance-size','readingSize'],['#appearance-density','density'],['#appearance-font','readingFont'],['#appearance-motion','motion']]) $(selector).onchange = () => { preference(key,$(selector).value); applyAppearance() }
for(const style of visualStyles){const button=document.createElement('button');button.type='button';button.className='style-card';button.dataset.styleChoice=style.id;button.setAttribute('aria-pressed','false');const miniature=document.createElement('span');miniature.className='style-miniature';miniature.setAttribute('aria-hidden','true');const rail=document.createElement('span');rail.className='miniature-rail';const content=document.createElement('span');content.className='miniature-content';const title=document.createElement('i'),line=document.createElement('i'),input=document.createElement('i');content.append(title,line,input);miniature.append(rail,content);const tag=document.createElement('small');tag.textContent=style.tag;const name=document.createElement('strong');name.textContent=style.name;const description=document.createElement('span');description.className='style-description';description.textContent=style.description;button.append(miniature,tag,name,description);button.onclick=()=>{preference('visualStyle',style.id);applyAppearance()};$('#appearance-styles').append(button)}
for(const color of appearanceColors){const button=document.createElement('button');button.type='button';button.className='color-chip';button.dataset.colorChoice=color.id;button.setAttribute('aria-pressed','false');const dot=document.createElement('span');dot.className='color-dot';dot.style.backgroundColor=color.hex;dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=color.name;button.append(dot,label);button.onclick=()=>{preference('colorway',color.id);applyAppearance()};$('#appearance-colors').append(button)}
$('#appearance-custom').oninput=event=>{preference('customColor',event.target.value);preference('colorway','custom');applyAppearance()}
$('#appearance-reset').onclick=()=>{for(const [key,value] of Object.entries({theme:'system',visualStyle:'studio',colorway:'auto',customColor:'#5865f2',readingSize:'default',readingFont:'system',density:'comfortable',motion:'auto',width:'focused',starters:'false',timestamps:'false',actions:'false'}))preference(key,value);applyAppearance();applyShellPreferences();syncAppearance();toast('已恢复默认外观，发送习惯保留')}
applyAppearance();systemTheme.addEventListener('change',applyAppearance)
$('#appearance-enter').onchange = () => { newlineMode = $('#appearance-enter').value === 'newline'; preference('newline',String(newlineMode)); renderEnterMode() }
const mobileLayout = matchMedia('(max-width: 760px)')
function sidebar(open) { if(!open)for(const id of ['sidebar-create','sidebar-tools','roster-filter'])$('#'+id).open=false;document.body.classList.toggle('sidebar-open', open); $('#sidebar-backdrop').hidden = !open; $('#menu').setAttribute('aria-expanded', String(mobileLayout.matches?open:!document.body.classList.contains('navigation-collapsed'))); $('main').inert = open && mobileLayout.matches || document.body.classList.contains('civ-active') || document.body.classList.contains('town-active');for(const id of ['civ-view','town-view']){const view=$('#'+id);if(view)view.inert=open&&mobileLayout.matches}if(open&&mobileLayout.matches&&!$('#sidebar').contains(document.activeElement))$('#roster-home').focus();if($('#workspace-inspector')?.hidden===false&&innerWidth<1200){$('main').inert=true;$('#sidebar').inert=true} }
mobileLayout.addEventListener('change', () => sidebar(false))
$('#sidebar-backdrop').onclick = () => { sidebar(false); $('#menu').focus() }
document.addEventListener('keydown', event => {
  if(document.querySelector('dialog[open]'))return
  if(event.key==='Escape'&&document.activeElement===$('#search')&&$('#search').value&&!event.isComposing){event.preventDefault();$('#search').value='';$('#contacts').scrollTop=0;renderContacts();return}
  if(event.key==='Escape'){const menu=['sidebar-create','sidebar-tools','roster-filter'].map(id=>$('#'+id)).find(node=>node.open);if(menu){event.preventDefault();menu.open=false;menu.querySelector('summary').focus();return}}
  if (!document.body.classList.contains('sidebar-open')) return
  if (event.key === 'Escape') { sidebar(false); $('#menu').focus() }
  if (event.key === 'Tab' && mobileLayout.matches) { const items = [...$('#sidebar').querySelectorAll('a,button,input,select,summary')].filter(element => !element.disabled && element.getClientRects().length), first = items[0], last = items.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } }
})
function connection(online) { document.body.classList.toggle('offline', !online); const label = online ? '本地已连接 · 自动保存' : '连接中断 · 请检查本地服务'; if ($('#connection-status').textContent !== label) $('#connection-status').textContent = label }
function renderStarters(group) {
  const box = $('#starter-prompts'); box.replaceChildren()
  const items = current?.componentKind==='chat' ? [['☕','随便聊聊','分享一个小问题','今天有什么有趣的问题值得聊一聊？'],['✧','听听大家的想法','每位成员各回复一次','最近有什么让你好奇的事？请各自分享一个想法。']] : group ? [['◎','一起拆解问题','让不同成员补充视角','我想解决一个问题：\n请先帮我明确目标、限制和关键假设，再从不同角度提出方案。'],['↗','寻找更好的方法','比较方案，指出盲点','请帮我评估一个方案：\n希望大家指出具体反例，提出替代方法，并说明还需要验证什么。'],['✧','碰撞一个新想法','从灵感到可执行的下一步','我有一个还不成熟的想法：\n请帮我拓展不同可能，再选一个值得做的小实验。']] : [['◎','整理我的想法','从杂乱信息中理清重点','请帮我梳理下面的想法，提炼目标、关键问题和下一步：\n'],['↗','制定行动计划','把目标变成可执行步骤','我想完成：\n请先问清必要信息，再帮我制定可执行的计划。'],['✧','换个角度思考','发现遗漏的假设与机会','请从不同角度审视这个问题，指出我可能遗漏的假设：\n']]
  for (const [symbol, title, subtitle, prompt] of items) { const button = document.createElement('button'); button.className = 'starter'; button.type = 'button'; const icon = document.createElement('span'); icon.className = 'starter-symbol'; icon.textContent = symbol; icon.setAttribute('aria-hidden','true'); const strong = document.createElement('strong'); strong.textContent = title; const small = document.createElement('small'); small.textContent = subtitle; button.append(icon,strong,small); button.onclick = () => { const input = $('#prompt'); input.value = input.value.trim() ? input.value + '\n' + prompt : prompt; input.dispatchEvent(new Event('input')); input.focus(); input.setSelectionRange(input.value.length,input.value.length) }; box.append(button) }
  $('#setup-models').hidden = state.models.some(model => model.provider !== 'opencode-go' || model.hasKey)
}
$('#setup-models').onclick = handle(() => settings())
for (const panel of document.querySelectorAll('.workspace-tools > details')) {
  const content=document.createElement('div');content.className='tool-panel-content';content.id=panel.id+'-content';content.setAttribute('role','region');content.setAttribute('aria-label',panel.querySelector('summary').textContent.trim())
  for(const child of [...panel.children])if(child.tagName!=='SUMMARY')content.append(child)
  panel.append(content);panel.querySelector('summary').setAttribute('aria-controls',content.id)
  panel.addEventListener('toggle', () => { if (panel.open) for (const other of document.querySelectorAll('.workspace-tools > details')) if (other !== panel) other.open = false })
}
document.addEventListener('pointerdown',event=>{if(document.querySelector('dialog[open]'))return;if(!$('.workspace-tools').contains(event.target))for(const panel of document.querySelectorAll('.workspace-tools > details'))panel.open=false})
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;const panel=document.querySelector('.workspace-tools > details[open]');if(panel){panel.open=false;panel.querySelector('summary').focus()}})

function toast(message) {
  const box = $('#toast')
  // Modal dialogs occupy the browser top layer; body-level notices are hidden behind them.
  ;([...document.querySelectorAll('dialog[open]')].at(-1) || document.body).append(box)
  box.textContent = message; box.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true }, 6500)
}
function handle(fn) { return event => {
  const form = event?.type === 'submit' ? event.target : null
  if (form) { event.preventDefault(); if (form.dataset.saving) return; form.dataset.saving = 'true' }
  const clicked = !form && event?.currentTarget?.tagName === 'BUTTON' ? event.currentTarget : null
  if (clicked) clicked.disabled = true
  const dialog = form?.closest('dialog'), controls = form ? [...(dialog || form).querySelectorAll('input,textarea,select,button')].map(control=>({control,disabled:control.disabled})) : []
  const buttons = form ? [...form.querySelectorAll('[type="submit"]')].map(button => ({button,text:button.textContent})) : []
  if (dialog) dialog.dataset.saving = 'true'
  if (form) form.setAttribute('aria-busy','true')
  Promise.resolve().then(() => { const result = fn(event); controls.forEach(({control})=>{control.disabled=true}); buttons.forEach(({button})=>{button.textContent='处理中…'}); return result }).catch(error => toast(error.message)).finally(()=>{
    if(form){delete form.dataset.saving;form.removeAttribute('aria-busy')}
    if(dialog)delete dialog.dataset.saving
    if(clicked)clicked.disabled=false
    controls.forEach(({control,disabled})=>{control.disabled=disabled}); buttons.forEach(({button,text})=>{button.textContent=text})
    if(dialog?.id==='work-hub')syncWorkActions()
  })
} }
async function readApiResponse(response) {
  let value
  try { value=await response.json() }
  catch(error){throw new Error(error.name==='TimeoutError'||error.name==='AbortError'?'响应中断或超时，请核对保存结果后再试；当前编辑仍保留。':`本地服务返回了无法读取的内容（HTTP ${response.status}）。请刷新核对，当前编辑仍保留。`)}
  if(!response.ok)throw new Error(value&&typeof value.error==='string'?value.error:`请求失败（HTTP ${response.status}），请核对结果后再试。`)
  return value
}
async function api(url, method = 'GET', data) {
  let response
  try { response = await fetch(url, { method, signal:AbortSignal.timeout(url.endsWith('/summarize')?135000:45000), ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) }); connection(true) }
  catch(error) { connection(false); throw new Error(error.name==='TimeoutError'?'请求超时，请重新载入核对结果；当前编辑仍保留。':'无法连接本地服务。请确认 Taoagent 正在运行，输入草稿仍保留在当前页面。') }
  return readApiResponse(response)
}
function options(select, items, selected = '', empty) {
  select.replaceChildren(); if (empty) select.add(new Option(empty, ''))
  for (const item of items) select.add(new Option(item.name, item.id))
  select.value = [...select.options].some(option => option.value === selected) ? selected : select.options[0]?.value || ''
}
function agentName(key) { return state.agents.find(agent => agent.id === key)?.name || 'Agent' }
function targetKey(value) { return value ? `${value.type}:${value.id}` : '' }
function draftStatus(selected, text, failed = false) { if (targetKey(selected) !== targetKey(target)) return; const problem=draftProblems.get(targetKey(selected)),box = $('#draft-status'); if (box.textContent !== text) box.textContent = text; box.classList.toggle('unsaved',failed||!!problem);const retry=$('#draft-retry');retry.hidden=!problem;retry.textContent=problem?.conflict?'对照草稿':'重试保存' }
function saveDraft(selected, content, expected) {
  const key = targetKey(selected)
  draftStatus(selected,'正在保存草稿…')
  const write = (draftWrites.get(key) || Promise.resolve()).catch(() => {}).then(async () => {
    const url = `/api/drafts/${selected.type}/${selected.id}`
    if (!draftBases.has(key)) draftBases.set(key, (await api(url)).content)
    const result = await api(url, 'PUT', { content, expected: expected === undefined ? draftBases.get(key) : expected })
    if (result.saved === false) {
      if (expected === undefined) {const error=new Error('另一窗口已更新草稿；当前文字仍保留，可点击「对照草稿」选择保存版本');error.code='DRAFT_CONFLICT';throw error}
      return result
    }
    draftBases.set(key, content);draftProblems.delete(key); if (targetKey(selected) === targetKey(target) && $('#prompt').value === content) draftStatus(selected,content ? '草稿已保存到本机' : '讨论与记忆保存在本机'); return result
  })
  draftWrites.set(key, write); write.catch(error => {const prior=draftProblems.get(key);draftProblems.set(key,{conflict:error.code==='DRAFT_CONFLICT',error:error.message}); draftStatus(selected,error.code==='DRAFT_CONFLICT'?'草稿存在不同版本，请对照后保存':'草稿尚未保存，请保持页面打开',true); if(!prior||prior.error!==error.message)toast(error.message || '草稿尚未保存，请保持页面打开并检查连接') }); return write
}
function flushDraft(selected = target) {
  if (!selected) return Promise.resolve()
  const key = targetKey(selected); clearTimeout(draftTimers.get(key)); draftTimers.delete(key)
  if (!drafts.has(key)) return draftWrites.get(key) || Promise.resolve()
  return saveDraft(selected, drafts.get(key))
}
function hasUnsavedDrafts(){const values=new Map(drafts);if(target)values.set(targetKey(target),$('#prompt').value);return [...values].some(([key,content])=>draftBases.has(key)?content!==draftBases.get(key):content.length>0)}
async function openDraftRecovery(){
  if(!target)return
  const selected={...target},key=targetKey(selected)
  if(!draftProblems.get(key)?.conflict){await flushDraft(selected);return}
  const title=current?.title||'当前对话'
  await loadDialog($('#draft-recovery'),async()=>{
    const remote=await api(`/api/drafts/${selected.type}/${selected.id}`)
    return()=>{draftRecovery={selected,key,expected:remote.content};$('#draft-recovery-description').textContent=title+' · 对照后可保存当前版本。关闭窗口会继续保留你的编辑。';$('#draft-local-copy').value=targetKey(target)===key?$('#prompt').value:drafts.get(key)||'';$('#draft-remote-copy').value=remote.content}
  })
}
async function saveRecoveredDraft(){
  if(!draftRecovery)return
  const recovery=draftRecovery,content=$('#draft-local-copy').value
  const result=await saveDraft(recovery.selected,content,recovery.expected)
  if(result.saved===false){
    const remote=await api(`/api/drafts/${recovery.selected.type}/${recovery.selected.id}`)
    recovery.expected=remote.content;$('#draft-remote-copy').value=remote.content;draftProblems.set(recovery.key,{conflict:true});draftStatus(recovery.selected,'另一窗口又更新了草稿，请再次对照',true);markDialogClean($('#draft-recovery'))
    throw new Error('另一窗口又更新了草稿，已载入最新版本；请对照后再次选择保存。')
  }
  $('#draft-recovery').close();draftRecovery=null;toast('已保存当前草稿版本')
}
function shouldFocusComposer(){
  if(!matchMedia('(min-width: 761px)').matches||document.querySelector('dialog[open]'))return false
  const active=document.activeElement
  return !active||active===document.body||active===$('#send')||active===$('#stop')
}
function restoreComposerFocus(allowed=true){if(allowed&&shouldFocusComposer())$('#prompt').focus()}
function isBusy() { return !!current && (pending.has(current.id) || state.running.includes(current.id)) }
const workLoading=new Set()
const seenApprovals = new Set()
const expandedActionChats = new Set()
function visibleActions(actions,expanded=false){return expanded?actions:actions.filter((action,index)=>!['complete','failed','denied'].includes(action.status)||index>=actions.length-12)}
function appendReceipt(parent,text,label){const preview=document.createElement('pre');preview.textContent=text.length>12000?text.slice(0,12000)+'\n\n[仅显示前12000字符，可展开完整内容]':text;parent.append(preview);if(text.length>12000){const expand=document.createElement('button');expand.textContent=`查看完整${label}（${text.length} 字符）`;expand.onclick=()=>{preview.textContent=text;expand.remove()};parent.append(expand)}}
async function taskRequest(key,task,row,payload){
  const controls=[...row.querySelectorAll('button,select')].map(control=>({control,disabled:control.disabled}));controls.forEach(({control})=>{control.disabled=true})
  try{await api(`/api/chats/${key}/tasks/${task.id}`,'POST',{...payload,expectedStatus:task.status});const box=$('#work-items');delete box.dataset.fingerprint;await refreshWork()}
  catch(error){toast(error.message);controls.forEach(({control,disabled})=>{control.disabled=disabled||isBusy()})}
}
function appendTaskControls(row,task,key){
  const actions=document.createElement('div');actions.className='task-actions'
  const busy=isBusy(),guard=busy?'本轮协作结束后可修改':''
  const button=(label,run)=>{const control=document.createElement('button');control.type='button';control.textContent=label;control.disabled=busy;if(guard)control.title=guard;control.onclick=()=>{if(!busy)run()};actions.append(control);return control}
  if(task.status==='pending'){
    const select=document.createElement('select');select.setAttribute('aria-label','改派给');select.disabled=busy;if(guard)select.title=guard
    for(const id of current.memberIds||[])if(id!==task.assigneeId)select.add(new Option(agentName(id),id))
    actions.append(select)
    const reassign=button('改派',()=>{if(select.value)return taskRequest(key,task,row,{action:'reassign',assigneeId:select.value})})
    if(!select.options.length)reassign.disabled=true
    button('取消',()=>{const reason=prompt('取消原因（可留空）');if(reason===null)return;return taskRequest(key,task,row,{action:'cancel',reason})})
  }else if(task.status==='cancelled'){
    button('恢复',()=>taskRequest(key,task,row,{action:'reopen'}))
  }else if(task.review?.status==='awaiting_review'){
    button('验收通过',()=>{const reason=prompt('验收依据（可留空）');if(reason===null)return;return taskRequest(key,task,row,{action:'review',decision:'accepted',reason})})
    button('要求返工',()=>{const reason=prompt('返工原因');if(reason===null)return;return taskRequest(key,task,row,{action:'review',decision:'changes_requested',reason})})
  }
  if(actions.childElementCount)row.append(actions)
}
function appendTaskCreateForm(box,key){
  const form=document.createElement('form');form.className='task-create';form.setAttribute('aria-label','新建任务')
  const title=document.createElement('input');title.name='title';title.maxLength=200;title.required=true;title.placeholder='任务标题'
  const assignee=document.createElement('select');assignee.name='assigneeId';assignee.setAttribute('aria-label','负责人');for(const id of current.memberIds||[])assignee.add(new Option(agentName(id),id))
  const criteria=document.createElement('input');criteria.name='acceptanceCriteria';criteria.maxLength=2000;criteria.placeholder='验收标准（可选）'
  const label=document.createElement('label');label.className='check';const review=document.createElement('input');review.type='checkbox';review.name='requireReview';label.append(review,document.createTextNode('需要验收'))
  const submit=document.createElement('button');submit.type='submit';submit.textContent='新建任务';submit.disabled=isBusy();if(isBusy())submit.title='本轮协作结束后可修改'
  form.append(title,assignee,criteria,label,submit)
  form.onsubmit=handle(async()=>{const data={title:title.value.trim(),assigneeId:assignee.value,requireReview:review.checked},acceptanceCriteria=criteria.value.trim();if(acceptanceCriteria)data.acceptanceCriteria=acceptanceCriteria;await api(`/api/chats/${key}/tasks`,'POST',data);const box=$('#work-items');delete box.dataset.fingerprint;await refreshWork()})
  box.append(form)
}
async function refreshWork(){
  if(!current||workLoading.has(current.id))return
  const key=current.id;workLoading.add(key)
  try{
    const [actions,tasks]=await Promise.all([api(`/api/chats/${key}/actions`),api(`/api/chats/${key}/tasks`)])
    if(current?.id!==key)return
    inspectorWork={key,actions,tasks};renderInspector()
    const taskGroup=current.kind==='group'&&componentType(current)==='task',expanded=expandedActionChats.has(key),box=$('#work-items'), fingerprint=JSON.stringify([key,taskGroup,isBusy(),current.memberIds,actions,tasks,expanded,state.agents.map(agent=>[agent.id,agent.name])]);if(box.dataset.fingerprint===fingerprint)return;box.dataset.fingerprint=fingerprint;box.replaceChildren();$('#work-panel').hidden=false;if(taskGroup)appendTaskCreateForm(box,key);if(!actions.length&&!tasks.length){const empty=document.createElement('p');empty.className='help';empty.textContent='当前没有待处理任务或审批。';box.append(empty)}
    syncAttention(actions);const pendingTasks=tasks.filter(task=>task.status!=='cancelled'&&(task.status!=='complete'||task.requireReview&&task.review?.status!=='accepted')); $('#work-count').textContent=`${pendingTasks.length} 待办 · ${actions.filter(action=>['pending','uncertain'].includes(action.status)).length} 待审批`
    for(const task of tasks){const row=document.createElement('div'),title=document.createElement('p');title.textContent=`${task.status==='cancelled'?'已取消':task.review?.status==='awaiting_review'?'待验收':task.review?.status==='changes_requested'?'待返工':task.status==='complete'?'✓':'○'} ${task.title} · ${agentName(task.assigneeId)}`;row.append(title);if(task.status==='cancelled'){const cancelled=document.createElement('p');cancelled.className='help';cancelled.textContent='已取消'+(task.cancelledReason?'：'+task.cancelledReason:'');row.append(cancelled)}if(task.acceptanceCriteria){const criteria=document.createElement('p');criteria.textContent='验收标准：'+task.acceptanceCriteria;row.append(criteria)}if(task.review?.reason){const reason=document.createElement('p');reason.textContent='验收意见：'+task.review.reason;row.append(reason)}if(task.result)appendReceipt(row,task.result,'任务结果');if(taskGroup)appendTaskControls(row,task,key);box.append(row)}
    for(const action of visibleActions(actions,expanded)){
      const row=document.createElement('div');row.className='approval';const title=document.createElement('strong');title.textContent=`${agentName(action.agentId)} · ${action.name} · ${{pending:'等待批准',approved:'已批准',running:'执行中',complete:'已执行',failed:'失败',denied:'已拒绝',uncertain:'执行结果不确定，重试可能重复副作用'}[action.status]}`
      const args=document.createElement('pre');args.textContent=JSON.stringify(action.preview?{operation:action.preview,arguments:action.args}:action.target?{arguments:action.args,server:action.target}:action.args,null,2);row.append(title,args)
      if(['pending','uncertain'].includes(action.status)){
        const noticeKey=key+':'+action.id+':'+action.status;if(!seenApprovals.has(noticeKey)){seenApprovals.add(noticeKey);$('#work-panel').open=true}
        for(const approve of [true,false]){const button=document.createElement('button');button.textContent=approve?'批准执行':'拒绝';button.onclick=handle(async()=>{button.disabled=true;try{await api(`/api/chats/${key}/actions`,'POST',{actionId:action.id,approve});await refreshWork()}catch(error){button.disabled=false;throw error}});row.append(button)}
      }
      if(action.result!==undefined)appendReceipt(row,JSON.stringify(action.result,null,2),'回执');box.append(row)
    }
    if(actions.length>12){const history=document.createElement('button');history.textContent=expanded?'收起历史操作':`查看全部操作记录（${actions.length}）`;history.onclick=handle(async()=>{if(expanded)expandedActionChats.delete(key);else expandedActionChats.add(key);await refreshWork()});box.append(history)}
  }finally{workLoading.delete(key)}
}
let collaborationLoading=false
async function refreshCollaboration(){
  if(!current||!$('#collaboration-panel').open||collaborationLoading)return
  const key=current.id;collaborationLoading=true
  try{
    const [relations,reasoning]=await Promise.all([api(`/api/chats/${key}/relations`),api(`/api/chats/${key}/reasoning`)])
    if(current?.id!==key)return
    const box=$('#collaboration-items');box.replaceChildren()
    const notice=document.createElement('p');notice.textContent='联系记录反映实际投递；公开论证保留结论、依据、分歧与修正，不代表事实已验证。';box.append(notice)
    if(relations.health){const health=document.createElement('p');health.className='help';health.textContent=`${relations.health.openQuestions.length} 个待回应问题 · ${relations.health.pendingTasks.length} 个未完成或待验收任务 · ${relations.health.pendingTasks.filter(task=>!task.assigneeActive).length} 个任务需重新指定负责人`;box.append(health)}
    const refresh=document.createElement('button');refresh.textContent='刷新联系与论证';refresh.onclick=handle(async()=>{delete $('#collaboration-panel').dataset.paged;await refreshCollaboration()});box.append(refresh)
    for(const edge of relations.edges){const row=document.createElement('p');row.textContent=`${agentName(edge.from)} → ${agentName(edge.to)} · ${edge.delivered} 已送达 · ${edge.pending} 待处理 · ${edge.failed} 失败或离群 · ${edge.openQuestions} 待回应`;box.append(row)}
    if(!relations.edges.length){const empty=document.createElement('p');empty.textContent='尚无成员间投递记录。';box.append(empty)}
    const statuses={proposed:'未验证',superseded:'已被修正',contested:'存在质疑',needs_review:'前提变化，待复查'}
    const kinds={hypothesis:'假设',finding:'发现',decision:'决定',challenge:'质疑',revision:'修正',synthesis:'综合候选'}
    function appendRecord(record,parent){
      const detail=document.createElement('details'),title=document.createElement('summary');title.textContent=`${agentName(record.agentId)} · ${record.topic} · ${kinds[record.kind]} · ${statuses[record.status]}：${record.claim.slice(0,80)}`;detail.append(title)
      for(const text of [record.claim,'简短依据：'+record.rationale,record.uncertainty?'待验证：'+record.uncertainty:'',record.novelty?'新组合的变化：'+record.novelty:'',record.validation?'如何检验：'+record.validation:''])if(text){const line=document.createElement('p');line.textContent=text;detail.append(line)}
      for(const [label,ids] of [['查看前提',record.dependsOn],['查看质疑对象',record.challenges],['查看修正前版本',record.revisesId?[record.revisesId]:[]]])for(const source of ids){const button=document.createElement('button');button.textContent=label;button.onclick=handle(async()=>{const result=await api(`/api/chats/${key}/reasoning?recordId=${encodeURIComponent(source)}`);if(current?.id===key){button.disabled=true;appendRecord(result.records[0],detail)}});detail.append(button)}
      for(const source of record.evidenceIds){const button=document.createElement('button');button.textContent='查看消息证据';button.onclick=handle(async()=>{const message=await api(`/api/chats/${key}/message?id=${encodeURIComponent(source)}`);if(current?.id===key){button.disabled=true;const line=document.createElement('p');line.textContent=`${message.agentName||'用户'}：${message.content}`;detail.append(line)}});detail.append(button)}
      parent.append(detail)
    }
    for(const record of [...reasoning.records].reverse())appendRecord(record,box)
    if(!reasoning.total){const empty=document.createElement('p');empty.textContent='尚无公开论证记录。成员可记录结论、简短依据、前提与不确定事项。';box.append(empty)}
    if(reasoning.nextBefore){let before=reasoning.nextBefore;const older=document.createElement('button');older.textContent='查看更早论证';older.onclick=handle(async()=>{const page=await api(`/api/chats/${key}/reasoning?before=${encodeURIComponent(before)}`);if(current?.id!==key)return;$('#collaboration-panel').dataset.paged='true';for(const record of [...page.records].reverse())appendRecord(record,box);before=page.nextBefore;older.hidden=!before});box.append(older)}
  }finally{collaborationLoading=false}
}
$('#collaboration-panel').ontoggle=()=>{if($('#collaboration-panel').open){delete $('#collaboration-panel').dataset.paged;refreshCollaboration().catch(error=>toast(error.message))}}
setInterval(()=>{if(!document.hidden&&isBusy()){refreshWork().catch(()=>{});if($('#collaboration-panel').open&&!$('#collaboration-panel').dataset.paged&&!$('#collaboration-items').querySelector('details[open]'))refreshCollaboration().catch(()=>{})}},1500)
$('#mcp-form').onsubmit=handle(async()=>{let servers;try{servers=JSON.parse($('#mcp-form').elements.namedItem('servers').value||'[]')}catch{throw new Error('MCP 配置不是有效 JSON')};await api('/api/integrations','PUT',{servers});toast('MCP 配置已保存')})
function controls() {
  const busy = isBusy()
  $('#send').hidden = false; $('#send').textContent = busy ? '插话' : '↑'; $('#stop').hidden = !busy
  $('#send').classList.toggle('interject', busy); $('#send').setAttribute('aria-label', busy ? '插话，优先加入本轮讨论' : '发送消息')
  updateSendControl(); $('#stop').disabled = !current
  $('#model').disabled = !current || busy; $('#context-open').disabled = !current || busy
  $('#recipients').disabled = busy; $('#contact-info').disabled = !current || busy
  renderTurn()
}
function updateSendControl(){const send=$('#send'),busy=isBusy(),submitting=current&&submittingThreads.has(current.id),queued=$('#busy-send-mode')?.value==='queue';send.disabled=!current||!$('#prompt').value.trim()||submitting;send.textContent=submitting?'发送中…':busy?(queued?'排队':'插话'):'↑';send.classList.toggle('interject',busy||!!submitting);send.setAttribute('aria-label',submitting?'正在发送，请稍候':busy?(queued?'加入队列，等待当前工作结束':'插话，优先加入本轮讨论'):'发送消息')}
function updateLiveStream(threadId,item) {
  if(item.conversationId&&item.conversationId!==threadId)return null
  const key=item.eventId||item.agentId
  let room=streams.get(threadId)
  if(item.type==='speaker'){
    if(!room){room=new Map();streams.set(threadId,room)}
    const entry={...item,key,text:'',done:false};room.set(key,entry);return entry
  }
  const entry=room?.get(key)
  if(!entry)return null
  if(item.type==='delta')entry.text+=item.text
  if(item.type==='speaker_done'){
    entry.done=true;entry.text=item.message.content;entry.message=item.message;entry.interrupted=!!item.interrupted
    room.delete(key);if(!room.size)streams.delete(threadId)
  }
  return entry
}
function paintStream(threadId,entry) {
  if(current?.id!==threadId)return
  if(!entry.done&&streams.get(threadId)?.get(entry.key)!==entry)return
  let body=[...$('#messages').querySelectorAll('.message.assistant')].find(article=>article.dataset.streaming===threadId&&article.dataset.streamEvent===entry.key)?.querySelector('.body')
  if(entry.done&&entry.message.id){
    const saved=[...$('#messages').querySelectorAll('.message.assistant')].find(article=>article.dataset.messageId===entry.message.id)?.querySelector('.body')
    if(saved&&saved!==body){body?.parentElement.remove();return}
  }
  if(!body){body=message({role:'assistant',agentId:entry.agentId,agentName:entry.name,content:''});body.parentElement.dataset.streaming=threadId;body.parentElement.dataset.streamEvent=entry.key}
  if(entry.done){
    delete body.parentElement.dataset.streaming
    body.parentElement.dataset.messageId=entry.message.id||''
    if(!entry.text){body.parentElement.remove();return}
    richText(body,entry.text)
    if(entry.message.replyToMessageId)attachReplyReference(body.parentElement,entry.message)
    const who=body.parentElement.querySelector('.who')
    if(entry.interrupted)who.textContent+=' · 已中断'
    else if(entry.message.concurrentMessageIds?.length){who.textContent+=' · 并行起草';who.title='这条回复生成期间有新消息，尚未纳入本次判断。'}
  }else {body.classList.remove('rich-text');body.textContent=entry.text||'正在思考…';body.dataset.raw=entry.text}
  scrollIfNear()
}
function renderTurn() {
  $('#collaboration-panel').hidden=!current
  if($('#collaboration-panel').dataset.key!==current?.id){$('#collaboration-items').replaceChildren();delete $('#collaboration-panel').dataset.paged;$('#collaboration-panel').dataset.key=current?.id||'';refreshCollaboration().catch(()=>{})}
  syncAttention(); const box = $('#turn-progress'); box.replaceChildren()
  const turn = current?.turns?.at(-1); box.hidden = !turn
  if (!turn) { const empty=document.createElement('p');empty.className='help';empty.textContent='尚未开始运行。发送消息后可在这里查看进度。';box.append(empty);box.hidden=false;return }
  const task = document.createElement('span'); task.className = 'turn-task'; task.textContent = turn.content.replace(/\s+/g,' ').slice(0, 42); task.title = turn.content; box.append(task)
  if(turn.usage){const usage=document.createElement('span');usage.className='turn-task';usage.textContent=`${turn.usage.modelCalls} 次模型调用 · ${turn.usage.measuredTotalTokens??'未报告'} 实测 tokens`;usage.title=`工具调用 ${turn.usage.toolCalls}；输入估算 ${turn.usage.estimatedInputTokens||0} tokens（约字符数/4，不是计费数据）；有用结果不由调用次数保证`;box.append(usage)}
  const labels = { pending: '待回复', running: isBusy() ? '回复中' : '已中断', complete: '已完成', failed: '未完成', skipped: '已跳过' }
  const concurrent=turn.speakers.filter(item=>item.status==='running').length
  if(isBusy()){const note=document.createElement('span');note.className='turn-task';note.textContent=concurrent>1?`${concurrent} 位成员同时交流`:'成员按需接话';box.append(note)}
  const intents = {inform:'告知',question:'提问',challenge:'质疑',proposal:'提案',answer:'回答',revision:'修正'}
  for (const item of turn.speakers) { const chip = document.createElement('span'); chip.className = 'turn-member ' + item.status; chip.textContent = `${agentName(item.agentId)}${item.spontaneous?' · 接话':''}${(item.responseIntent||item.intent) ? ' · ' + intents[item.responseIntent||item.intent] : ''}${item.phase ? ' · ' + ({discuss:'讨论',review:'复核',synthesis:'汇总'}[item.phase]) : ''} · ${labels[item.status]}`; chip.title = (item.error || chip.textContent) + (item.topic ? ` · 议题：${item.topic}` : '') + (item.fromAgentId ? ` · 来自 ${agentName(item.fromAgentId)}` : '') + (item.attempts ? ` · 尝试 ${item.attempts} 次` : ''); box.append(chip) }
  const open = turn.speakers.filter(item => ['question','challenge'].includes(item.intent) && item.status !== 'skipped' && !turn.speakers.some(reply => reply.replyTo === item.eventId && reply.fromAgentId === item.agentId && reply.agentId === item.fromAgentId && ['answer','revision'].includes(reply.intent) && reply.status === 'complete')).length
  if (open) { const note = document.createElement('span'); note.className = 'turn-task'; note.textContent = `${open} 个问题待回应`; note.title = '成员完成发言不等于已回答问题；已回应也不代表事实已验证'; box.append(note) }
  const observations=turn.observations||[]; if(observations.length){const note=document.createElement('span');note.className='turn-task';note.textContent=`${observations.filter(item=>item.status==='joined').length} 次主动接话 · ${observations.filter(item=>item.status==='silent').length} 次安静旁听`;note.title=observations.filter(item=>item.error).map(item=>agentName(item.agentId)+'：'+item.error).join('\n');box.append(note)}
  if(!isBusy()&&observations.some(item=>item.status==='skipped'&&item.error?.includes('预算'))){const note=document.createElement('span');note.className='turn-task';note.textContent='本轮讨论达到预算，可发消息继续或调整讨论预算';box.append(note)}
  if (!isBusy() && (turn.speakers.some(item => item.status !== 'complete' && item.status !== 'skipped')||observations.some(item=>['pending','checking','failed'].includes(item.status)))) {
    const retry = document.createElement('button'); retry.textContent = '继续未完成成员'; retry.onclick = handle(() => sendMessage(turn.id)); box.append(retry)
  }
}
function isPinned(type,id) { return state.navigation?.pinned?.includes(type+':'+id) || false }
function contactState(type,id) {
  const info=state.conversations?.find(item=>item.target.type===type&&item.target.id===id)
  if(!info)return {status:'idle',label:''}
  if(info.status==='waiting')return {status:'waiting',label:info.waiting+' 项待审批'}
  if(info.status==='running')return {status:'running',label:'正在处理…'}
  if(info.status==='failed')return {status:'failed',label:'上次运行失败 · 可查看并重试'}
  if(info.queue?.pending)return {status:'queued',label:(info.queue.paused?'队列暂停 · ':'')+info.queue.pending+' 条排队'}
  if(info.hasMessages&&info.id!==current?.id&&state.navigation?.seen?.[info.id]!==info.revision)return {status:'unread',label:'有新消息'}
  return {status:'idle',label:''}
}
function matchesContactFilter(type,id) {
  const filter=$('#sidebar-status')?.value||'all'
  return filter==='all'||(filter==='pinned'?isPinned(type,id):contactState(type,id).status===filter)
}
async function acknowledgeConversation(value) {
  if(!value.revision||state.navigation?.seen?.[value.id]===value.revision||document.hidden)return
  try { const navigation=await api('/api/navigation','POST',{sessionId:value.id,seenRevision:value.revision});state.navigation=navigation;renderContacts() }
  catch { /* A newer message keeps its unread state until it is actually loaded. */ }
}

const componentNames={emergent:'涌现群聊',chat:'纯聊天',task:'任务组',city:'City 聊天室'}
let sidebarFingerprint='',sidebarRevealedTarget=''
let sidebarClosedGroups=new Set(['legacy']),sidebarOpenedGroups=new Set()
try{const saved=JSON.parse(preference('sidebarExpandedGroups')||'[]');if(Array.isArray(saved)&&saved.every(item=>typeof item==='string'))sidebarOpenedGroups=new Set(saved)}catch{}
try{const saved=JSON.parse(preference('sidebarGroups')||'null');if(Array.isArray(saved)&&saved.every(item=>typeof item==='string'))sidebarClosedGroups=new Set(saved)}catch{}
function sidebarFilters(){return {search:$('#search').value,kind:$('#sidebar-kind').value,status:$('#sidebar-status').value}}
function renderContacts() {
  const list=$('#contacts'),filters=sidebarFilters(),view=buildSidebarSections(state,filters,contactState)
  const viewingWorld=document.body.classList.contains('civ-active')||document.body.classList.contains('town-active')
  const fingerprint=JSON.stringify([view,filters,target,viewingWorld,[...sidebarClosedGroups],[...sidebarOpenedGroups]])
  if(fingerprint===sidebarFingerprint)return
  sidebarFingerprint=fingerprint
  const scrollTop=list.scrollTop,focused=list.contains(document.activeElement)?{key:document.activeElement.closest('[data-contact-key]')?.dataset.contactKey,pin:document.activeElement.classList.contains('contact-pin')}:null
  list.replaceChildren()
  $('#sidebar-result-count').textContent=view.count===view.total?view.total+' 个对话':view.count+' / '+view.total+' 个对话'
  $('#sidebar-search-clear').hidden=!filters.search
  for(const name of ['kind','status'])$('#sidebar-'+name).dataset.active=String(filters[name]!=='all')
  const quickKind=sidebarQuickTab(filters.kind)
  for(const button of document.querySelectorAll('[data-roster-kind]'))button.setAttribute('aria-pressed',String(button.dataset.rosterKind===quickKind))
  $('#roster-filter > summary').dataset.active=String(filters.kind!=='all'||filters.status!=='all')
  $('#sidebar-locate').disabled=!target
  for(const section of view.sections){
    const group=document.createElement('section');group.className='contact-group';group.dataset.section=section.id
    const heading=document.createElement('div');heading.className='contact-section'
    const toggle=document.createElement('button');toggle.type='button';toggle.className='contact-section-toggle'
    const expanded=sidebarSectionExpanded(section,{search:filters.search,filtered:filters.kind!=='all'||filters.status!=='all',closed:sidebarClosedGroups,opened:sidebarOpenedGroups,target})
    const items=document.createElement('div');items.id='sidebar-items-'+section.id;items.className='contact-group-items';items.hidden=!expanded
    toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-controls',items.id);toggle.disabled=!!filters.search.trim()||filters.kind!=='all'||filters.status!=='all'
    const chevron=document.createElement('span');chevron.className='section-chevron';chevron.textContent='›';chevron.setAttribute('aria-hidden','true')
    const label=document.createElement('span');label.textContent=section.label;const count=document.createElement('span');count.className='section-count';count.textContent=section.items.length
    toggle.append(chevron,label,count);toggle.onclick=()=>{if(expanded){sidebarClosedGroups.add(section.id);sidebarOpenedGroups.delete(section.id)}else{sidebarClosedGroups.delete(section.id);sidebarOpenedGroups.add(section.id)}preference('sidebarExpandedGroups',JSON.stringify([...sidebarOpenedGroups]));preference('sidebarGroups',JSON.stringify([...sidebarClosedGroups]));renderContacts();$('#sidebar-items-'+section.id)?.previousElementSibling?.querySelector('button')?.focus()};heading.append(toggle)
    if(!['pinned','legacy','city'].includes(section.id)){const add=document.createElement('button');add.type='button';add.className='contact-section-add';add.textContent='＋';add.setAttribute('aria-label','新建'+section.label);add.title='新建'+section.label;add.onclick=handle(()=>section.id==='agent'?editAgent():editGroup(true,section.id));heading.append(add)}
    for(const item of section.items){
      const row=document.createElement('div');row.className='contact-row';row.dataset.contactKey=item.key
      const button=document.createElement('button');button.type='button';button.className='contact';button.title=item.label+' · '+item.id
      const selected=!viewingWorld&&target?.type===item.type&&target.id===item.id;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')
      const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=item.type==='agent'?(item.label||'B').slice(0,1):({task:'▦',chat:'☏',city:'⌂',emergent:'◈'}[item.kind]||'◈');avatar.dataset.tone=String([...item.id].reduce((sum,char)=>sum+char.charCodeAt(0),0)%4);avatar.setAttribute('aria-hidden','true')
      const copy=document.createElement('span');copy.className='contact-copy'
      const heading=document.createElement('span');heading.className='contact-heading'
      const title=document.createElement('span');title.className='contact-label';title.textContent=item.label
      const time=document.createElement('time');time.className='contact-time';time.textContent=conversationTime(item.updated);if(time.textContent){time.dateTime=item.updated;time.title=new Date(item.updated).toLocaleString()}
      heading.append(title,time)
      const preview=document.createElement('span');preview.className='contact-preview';preview.textContent=rosterPreview(item);preview.title=preview.textContent
      const meta=document.createElement('span');meta.className='contact-entry-meta';const kind=document.createElement('span');kind.className='contact-kind';kind.textContent=item.type==='agent'?'独立 Bot':componentNames[item.kind];meta.append(kind)
      const status=document.createElement('span');status.className='contact-status';status.textContent=item.info.label||(item.type==='group'?item.memberIds.length+' 位成员':'独立记忆');meta.append(status)
      if(item.info.status!=='idle')button.dataset.status=item.info.status
      copy.append(heading,preview,meta)
      if(item.origin){const origin=document.createElement('span');origin.className='contact-origin';origin.textContent='由 '+item.origin.formedBy+' 发起'+(item.origin.fromTitle?' · 来自 '+item.origin.fromTitle:'');copy.append(origin)}
      button.append(avatar,copy);button.onclick=handle(()=>{if(target?.type===item.type&&target.id===item.id){window.dispatchEvent(new Event('tao-roster-open'));if(/^#(town|civilization|empire-city)/.test(location.hash))history.replaceState(null,'',`#${item.type}=${encodeURIComponent(item.id)}`);if(mobileLayout.matches)sidebar(false);return}return openTarget({type:item.type,id:item.id})})
      const pin=document.createElement('button');pin.type='button';pin.className='contact-pin';pin.textContent=item.pinned?'◆':'◇';pin.setAttribute('aria-pressed',String(item.pinned));pin.title=(item.pinned?'取消置顶':'置顶')+'「'+item.label+'」';pin.setAttribute('aria-label',pin.title)
      pin.onclick=handle(async event=>{event.stopPropagation();state.navigation=await api('/api/navigation','POST',{targetKey:item.key,pinned:!item.pinned,expectedPinned:item.pinned});const nextSection=item.pinned?(item.legacy?'legacy':item.kind):'pinned';sidebarClosedGroups.delete(nextSection);sidebarOpenedGroups.add(nextSection);preference('sidebarExpandedGroups',JSON.stringify([...sidebarOpenedGroups]));preference('sidebarGroups',JSON.stringify([...sidebarClosedGroups]));renderContacts();const row=[...list.querySelectorAll('[data-contact-key]')].find(node=>node.dataset.contactKey===item.key);if(!item.pinned)list.scrollTop=0;else row?.scrollIntoView({block:'nearest'});row?.querySelector('.contact-pin')?.focus({preventScroll:true});toast(item.pinned?'已取消置顶':'已放入置顶区')})
      row.append(button,pin);items.append(row)
    }
    group.append(heading,items);list.append(group)
  }
  if(!view.count){const empty=document.createElement('div');empty.className='empty-contacts';const note=document.createElement('p');note.textContent=view.total?'没有匹配的对话。试试其他关键词，或清除筛选。':'还没有对话，先创建一个 Bot 或群组。';const reset=document.createElement('button');reset.type='button';reset.textContent=view.total?'清除搜索与筛选':'新建 Bot';reset.onclick=()=>view.total?resetSidebarFilters():$('#create-agent').click();empty.append(note,reset);list.append(empty)}
  list.scrollTop=scrollTop
  const targetIdentity=target?target.type+':'+target.id:''
  if(targetIdentity!==sidebarRevealedTarget){sidebarRevealedTarget=targetIdentity;const selected=[...list.querySelectorAll('[data-contact-key]')].find(node=>node.dataset.contactKey===targetIdentity)?.querySelector('.contact');if(selected?.getClientRects().length){if(selected.closest('.contact-group').dataset.section==='pinned')list.scrollTop=0;else selected.scrollIntoView({block:'nearest'})}}
  if(focused?.key){const row=[...list.querySelectorAll('[data-contact-key]')].find(node=>node.dataset.contactKey===focused.key);const control=row?.querySelector(focused.pin?'.contact-pin':'.contact');if(control?.getClientRects().length)control.focus({preventScroll:true});else ([...list.querySelectorAll('.contact')].find(item=>item.getClientRects().length)||$('#search')).focus({preventScroll:true})}
}
function resetSidebarFilters(){for(const name of ['kind','status'])$('#sidebar-'+name).value='all';$('#search').value='';$('#contacts').scrollTop=0;renderContacts()}
function locateSidebarCurrent(){
  if(!target)return
  resetSidebarFilters()
  const key=target.type+':'+target.id,row=[...$('#contacts').querySelectorAll('[data-contact-key]')].find(node=>node.dataset.contactKey===key)
  const group=row?.closest('.contact-group');if(!group)return
  sidebarClosedGroups.delete(group.dataset.section);sidebarOpenedGroups.add(group.dataset.section);preference('sidebarExpandedGroups',JSON.stringify([...sidebarOpenedGroups]));preference('sidebarGroups',JSON.stringify([...sidebarClosedGroups]));renderContacts()
  const visible=[...$('#contacts').querySelectorAll('[data-contact-key]')].find(node=>node.dataset.contactKey===key)?.querySelector('.contact')
  visible?.scrollIntoView({block:'nearest'});visible?.focus({preventScroll:true})
}
function renderMemberModels(){
  const panel=$('#member-models');panel.hidden=current?.kind!=='group';if(panel.hidden)return
  const fingerprint=JSON.stringify([current.id,current.memberIds,current.modelId,state.agents,state.models.map(model=>[model.id,model.name]),state.account.defaultModelId])
  if(panel.dataset.fingerprint===fingerprint)return;panel.dataset.fingerprint=fingerprint
  const box=$('#member-model-items');box.replaceChildren()
  const note=document.createElement('p');note.className='help';note.textContent=current.modelId?'此群正在使用顶部选择的统一模型。先切换到「按各 Agent 的模型设置」，即可分别选择。':'每位成员独立选择模型；修改会用于下一次调用，已在生成的回复保持原模型。';box.append(note)
  for(const id of current.memberIds){const agent=state.agents.find(item=>item.id===id);if(!agent)continue
    const row=document.createElement('div');row.className='member-model-row';const label=document.createElement('label');label.textContent=agent.name
    const select=document.createElement('select');select.setAttribute('aria-label',agent.name+' 的独立模型');options(select,state.models,agent.modelId||'','继承账户默认模型');select.disabled=!!current.modelId
    select.onchange=handle(async()=>{select.disabled=true;try{await api(`/api/agents/${id}/model`,'PUT',{modelId:select.value,expectedModelId:agent.modelId||''});await refresh();toast(agent.name+' 的模型已更新')}catch(error){delete panel.dataset.fingerprint;renderMemberModels();throw error}finally{select.disabled=!!current?.modelId}})
    label.append(select);const profile=document.createElement('button');profile.textContent='背景与提示词';profile.onclick=handle(()=>editAgent(id));row.append(label,profile);box.append(row)
  }
}
function renderHeader() {
  if($('#space-switch'))$('#space-switch').hidden=current?.kind!=='group'||current?.componentKind==='chat'
  if($('#space-memory-open'))$('#space-memory-open').hidden=current?.kind!=='group'
  if($('#queue-open')){const queue=state.conversations?.find(item=>item.id===current?.id)?.queue;$('#queue-open').disabled=!current;$('#queue-open').textContent=queue?.pending?'队列 · '+queue.pending:'队列'}
  if (!current) return
  const group = current.kind === 'group', agent = state.agents.find(item => item.id === current.agentId)
  const name = group ? current.title : agent?.name || 'Agent'
  $('#contact-name').textContent = name
  $('#conversation-avatar').textContent=group?({task:'▦',chat:'☏',city:'⌂',emergent:'◈'}[componentType(current)]||'◈'):name.slice(0,1)
  renderInspector()
  $('#chat-kind').textContent = group ? `${componentNames[componentType(current)]} / ${current.memberIds.length} 位 Bot` : '与成员私聊 / 独立记忆'
  $('#contact-description').textContent = group ? current.memberIds.map(agentName).join(' · ') : '独立身份 · 长期记忆'
  $('#free-chat-actions').hidden=!group||componentType(current)==='task'
  $('#brainstorm-fill').hidden=current.componentKind==='chat'
  $('#space-town').textContent=group&&componentType(current)==='task'?'任务与审批':current.componentKind==='city'?'居民生活与日程':'回到广场'
  $('#welcome-title').textContent = group ? name : `和${name}说点什么`
  $('#welcome-description').textContent = group ? current.discussionMode === 'directed' ? '明确目标，把问题交给合适的伙伴。成员可按需联系同事，交流与决定都会保留。' : '一个问题，多种视角。伙伴们会在有新想法时加入，也会认真指出分歧。' : '留一点空间给想法。一起梳理问题、探索可能，把下一步变得清楚。'
  renderStarters(group)
  if(group&&(current.discussionMode==='brainstorm'||!current.purpose?.trim()))$('#welcome-description').textContent=current.discussionMode==='brainstorm'?'没有主题也能开始。从一个观察、一段联想或有趣的问题出发，让想法碰撞。':'不用先准备主题，随便聊聊也可以。伙伴们会沿着具体想法自然接话。'
  if(group&&componentType(current)==='task')$('#welcome-description').textContent='描述目标、交付物和约束，由负责人协调 Bot 推进工作；工具操作由你审批。'
  if(current.componentKind==='chat')$('#welcome-description').textContent='轻松的文字聊天室。每位 Bot 各回复一次，或用 @ 选择成员；不执行工具和派工。'
  if(group&&componentType(current)==='emergent'&&current.formedBy){const fromTitle=state.groups.find(item=>item.id===current.originSessionId)?.title;$('#welcome-description').textContent=agentName(current.formedBy)+' 在「'+(fromTitle||'原来的空间')+'」的日常中发起了这个涌现群聊'}
  const inherited = state.models.find(model => model.id === state.account.defaultModelId)?.name || '尚未配置'
  options($('#model'), state.models, group ? current.modelId || '' : agent?.modelId || '', group ? '按各 Agent 的模型设置' : `账户默认 · ${inherited}`)
  $('#model').setAttribute('aria-label', group ? '群聊本轮使用的模型' : '此 Agent 使用的模型')
  $('#recipients').hidden = !group
  if (group) options($('#recipients'), current.memberIds.map(id => ({ id, name: `先请 ${agentName(id)} 发言` })), groupRecipients.get(current.id) || '', current.componentKind==='chat'?'纯聊天 · 每位成员回复一次':current.discussionMode === 'brainstorm' ? `头脑风暴 · 先请 ${Math.min(2,current.memberIds.length)} 位成员独立发散` : `自主协作 · 首先交给 ${agentName(current.coordinatorId || current.memberIds[0])}`)
  renderMemberModels(); controls(); syncConversationControl()
}
let refreshVersion = 0
async function refresh() {
  const version = ++refreshVersion
  const next = await api('/api/state'), fingerprint = JSON.stringify(next)
  if (version !== refreshVersion || fingerprint === stateFingerprint) return
  const changed = current && state.revisions?.[current.id] !== next.revisions?.[current.id]
  state = next; stateFingerprint = fingerprint; renderContacts()
  if(current?.kind==='group'&&!state.groups.some(group=>group.id===current.id)){if($('#conversation-settings').open)$('#conversation-settings').close();await openInitialTarget();return}
  renderHeader()
  if (changed && current && !pending.has(current.id)) await loadCurrent(false)
}
function scrollIfNear(force = false) { const view = $('#conversation'); if (force || followLatest) { view.scrollTop = view.scrollHeight; followLatest = true }; $('#jump-bottom').hidden = view.scrollHeight - view.scrollTop - view.clientHeight < 180 }
function richText(body, text) {
  body.replaceChildren(); body.classList.add('rich-text'); body.dataset.raw = text
  function inline(node, value) {
    const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g
    let start = 0
    for (const match of value.matchAll(pattern)) {
      node.append(document.createTextNode(value.slice(start, match.index))); const token = match[0]
      if (token.startsWith('`')) { const code = document.createElement('code'); code.textContent = token.slice(1, -1); node.append(code) }
      else if (token.startsWith('**')) { const bold = document.createElement('strong'); bold.textContent = token.slice(2, -2); node.append(bold) }
      else { const link = token.match(/^\[([^\]]+)\]\((https?:\/\/.+)\)$/); const anchor = document.createElement('a'); anchor.textContent = link[1]; anchor.href = link[2]; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; node.append(anchor) }
      start = match.index + token.length
    }
    node.append(document.createTextNode(value.slice(start)))
  }
  const lines = text.split('\n'); let list = null
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (/^\s*```/.test(line)) {
      const language = line.replace(/^\s*```/, '').trim(), codeLines = []
      while (++index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index])
      const box = document.createElement('div'); box.className = 'code-block'
      const label = document.createElement('div'); label.className = 'code-heading'; const name = document.createElement('span'); name.textContent = language || '代码'
      const copy = document.createElement('button'); copy.textContent = '复制代码'; copy.onclick = handle(async () => { await navigator.clipboard.writeText(codeLines.join('\n')); toast('代码已复制') })
      label.append(name, copy); const pre = document.createElement('pre'), code = document.createElement('code'); code.textContent = codeLines.join('\n'); pre.append(code); box.append(label, pre); body.append(box); list = null; continue
    }
    if (!line.trim()) { list = null; continue }
    if (line.includes('|') && /^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1] || '')) {
      const cells = value => value.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
      const wrapper = document.createElement('div'); wrapper.className = 'table-wrap'; wrapper.tabIndex = 0; wrapper.setAttribute('role','region'); wrapper.setAttribute('aria-label','表格，可横向滚动')
      const table = document.createElement('table'), head = document.createElement('thead'), row = document.createElement('tr'), tbody = document.createElement('tbody')
      for (const value of cells(line)) { const th = document.createElement('th'); th.scope = 'col'; inline(th,value); row.append(th) } head.append(row); table.append(head,tbody); index++
      while (index + 1 < lines.length && lines[index + 1].includes('|') && lines[index + 1].trim()) { const tr = document.createElement('tr'); for (const value of cells(lines[++index])) { const td = document.createElement('td'); inline(td,value); tr.append(td) } tbody.append(tr) }
      wrapper.append(table)
      // All cell text goes through the same safe inline renderer as paragraphs.
      list = null; body.append(wrapper); continue
    }
    const bullet = line.match(/^\s*(?:[-*]\s+|\d+[.)]\s+)(.*)$/)
    if (bullet) { const type = /^\s*\d/.test(line) ? 'OL' : 'UL'; if (list?.tagName !== type) { list = document.createElement(type); body.append(list) } const item = document.createElement('li'); inline(item, bullet[1]); list.append(item); continue }
    list = null; const heading = line.match(/^(#{1,4})\s+(.*)$/), quote = line.match(/^>\s?(.*)$/)
    const node = document.createElement(heading ? 'h' + (heading[1].length + 1) : quote ? 'blockquote' : 'p'); inline(node, heading ? heading[2] : quote ? quote[1] : line); body.append(node)
  }
}
function attachReplyReference(wrapper,item){
  if(!item.replyToMessageId||wrapper.querySelector('.reply-reference'))return
  const source=current?.messages?.find(message=>message.id===item.replyToMessageId),key=current?.id
  const button=document.createElement('button');button.className='reply-reference';button.type='button'
  button.textContent='↪ 回应'+(source?.agentName||'群内发言');button.title='查看这条回复所接续的原消息'
  button.onclick=handle(async()=>{
    const original=source||await api('/api/chats/'+key+'/message?id='+encodeURIComponent(item.replyToMessageId))
    if(current?.id!==key)return
    const quote=document.createElement('blockquote');quote.textContent=(original.agentName||'成员')+'：'+original.content
    button.after(quote);button.disabled=true
  })
  wrapper.querySelector('.body').before(button)
}
function message(item) {
  if (item.kind === 'activity') {
    const note = document.createElement(item.content.length > 160 ? 'details' : 'div'); note.className = 'activity'
    if (note.tagName === 'DETAILS') { const title = document.createElement('summary'); title.textContent = item.content.split('\n')[0].slice(0, 150); const text = document.createElement('p'); text.textContent = item.content; note.append(title, text) } else note.textContent = item.content
    $('#messages').append(note); return null
  }
  const wrapper = document.createElement('article'); wrapper.className = `message ${item.role}${item.status === 'interrupted' ? ' interrupted' : ''}`
  const meta = document.createElement('div'); meta.className = 'message-meta'
  const author = item.role === 'user' ? '你' : item.agentName || agentName(item.agentId || current?.agentId)
  const avatar = document.createElement('span'); avatar.className = 'message-avatar'; avatar.textContent = author.slice(0,1); avatar.setAttribute('aria-hidden','true'); wrapper.dataset.tone = String([...(item.agentId || author)].reduce((sum,char) => sum + char.charCodeAt(0),0) % 4); meta.append(avatar)
  const who = document.createElement('span'); who.className = 'who'; who.textContent = item.role === 'user' ? '你' : item.agentName || agentName(item.agentId || current?.agentId)
  if (item.status === 'interrupted') who.textContent += ' · 已中断'
  if (item.concurrentMessageIds?.length) { who.textContent += ' · 并行起草'; who.title = '生成期间有其他成员发表新消息；本回复未依据这些新消息作核验。' }
  if (item.phase) who.textContent += ' · ' + ({discuss:'讨论',review:'交叉复核',synthesis:'共同结论'}[item.phase])
  meta.append(who)
  if (item.at) { const time = document.createElement('time'); time.dateTime = item.at; time.textContent = new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); time.title = new Date(item.at).toLocaleString(); meta.append(time) }
  const body = document.createElement('div'); body.className = 'body'; body.textContent = item.content
  if (item.role === 'assistant' && item.content) richText(body, item.content)
  wrapper.append(meta, body)
  if(item.replyToMessageId)attachReplyReference(wrapper,item)
  wrapper.dataset.messageId = item.id || ''
  const actions = document.createElement('div'); actions.className = 'message-actions'
  {
    const copy = document.createElement('button'); copy.className = 'copy'; copy.textContent = '复制'
    copy.setAttribute('aria-label','复制'+author+'的消息'); copy.onclick = handle(async () => { await navigator.clipboard.writeText(body.dataset.raw || body.textContent); toast('已复制') }); actions.append(copy)
  }
  const quote = document.createElement('button'); quote.className = 'quote'; quote.textContent = '引用'; quote.setAttribute('aria-label','引用'+author+'的消息到输入框')
  quote.onclick = () => { const input = $('#prompt'), text = body.dataset.raw || body.textContent; input.value = (input.value ? input.value + '\n\n' : '') + '> ' + author + '：\n' + text.split('\n').map(line => '> ' + line).join('\n') + '\n\n'; input.dispatchEvent(new Event('input')); input.focus(); input.setSelectionRange(input.value.length,input.value.length) }; actions.append(quote); wrapper.append(actions)
  $('#messages').append(wrapper); return body
}
async function loadCurrent(forceScroll = true) {
  if (!target) return
  const version = ++loadVersion, selected = { ...target }
  const url = selected.type === 'agent' ? `/api/agents/${selected.id}/thread` : `/api/chats/${selected.id}`
  const value = await api(url)
  if (version !== loadVersion || targetKey(selected) !== targetKey(target)) return
  const scrollTop = $('#conversation').scrollTop, stickToBottom = $('#conversation').scrollHeight - scrollTop - $('#conversation').clientHeight < 180
  if (!forceScroll && current?.id === value.id) {
    const oldIds = new Set(current.messages.map(message => message.id))
    // Bridge a burst larger than one page before merging, so expanded history never develops a gap.
    while (current.messages.length && value.hasOlder && value.messages.length && !value.messages.some(message => oldIds.has(message.id))) {
      const page = await api(`/api/chats/${value.id}?before=${value.messages[0].id}`)
      if (version !== loadVersion || targetKey(selected) !== targetKey(target)) return
      value.messages = [...page.messages, ...value.messages]; value.hasOlder = page.hasOlder
    }
    const newIds = new Set(value.messages.map(message => message.id))
    value.messages = [...current.messages.filter(message => !newIds.has(message.id)), ...value.messages]
    if (current.messages.length) value.hasOlder = current.hasOlder && value.hasOlder
  }
  current = value; if(typeof refreshWork==='function')refreshWork().catch(()=>{});acknowledgeConversation(value); watchQueueEvents(value.id); $('#messages').replaceChildren(); $('#welcome').hidden = value.messages.length > 0
  $('#older-messages').hidden = !value.hasOlder
  for (const item of value.messages) message(item)
  for (const streaming of streams.get(value.id)?.values() || []) paintStream(value.id,streaming)
  renderContacts(); renderHeader(); if (!value.messages.length) $('#conversation').scrollTop = 0; else if (forceScroll || stickToBottom) scrollIfNear(true); else $('#conversation').scrollTop = scrollTop
}
async function openTarget(next) {
  if (target) { drafts.set(targetKey(target), $('#prompt').value); flushDraft().catch(() => {}) }
  target = next; if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tao-target-changed',{detail:next}));current = null; followLatest = true; controls(); $('#messages').replaceChildren(); $('#welcome').hidden = false
  $('#tool-output').textContent = ''; $('#tool-output').hidden = true; $('#work-items').replaceChildren(); delete $('#work-items').dataset.fingerprint; $('#work-panel').hidden = true; $('#work-panel').open = false; $('#member-models').hidden = true
  $('#mention-list').hidden = true; $('#mention-list').replaceChildren()
  $('#welcome').hidden=true;$('#conversation').setAttribute('aria-busy','true'); syncAttention([])
  $('#contact-name').textContent=(next.type==='group'?state.groups.find(group=>group.id===next.id)?.title:state.agents.find(agent=>agent.id===next.id)?.name)||'载入对话'
  $('#contact-description').textContent='正在载入…';renderContacts()
  $('#prompt').value = drafts.get(targetKey(next)) || ''; resizePrompt()
  draftStatus(next,$('#prompt').value ? '草稿保留在当前页面' : '讨论与记忆保存在本机')
  if(typeof document==='undefined'||!document.body.classList.contains('town-active'))history.replaceState(null, '', `#${next.type}=${encodeURIComponent(next.id)}`)
  sidebar(false)
  const draftKey = targetKey(next)
  try{await loadCurrent()}catch(error){
    if(targetKey(target)===draftKey){const box=document.createElement('div');box.className='chat-load-error';box.setAttribute('role','alert');const title=document.createElement('strong');title.textContent='对话暂时无法载入';const text=document.createElement('p');text.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='重新载入此对话';retry.onclick=handle(()=>openTarget(next));box.append(title,text,retry);$('#messages').replaceChildren(box)}
    return
  }finally{if(targetKey(target)===draftKey)$('#conversation').removeAttribute('aria-busy')}
  if (!draftBases.has(draftKey)) {
    const value = await api(`/api/drafts/${next.type}/${next.id}`)
    draftBases.set(draftKey, value.content)
    if (targetKey(target) === draftKey && !drafts.has(draftKey)) { drafts.set(draftKey, value.content); $('#prompt').value = value.content; resizePrompt() }
    if (targetKey(target) === draftKey && $('#prompt').value === value.content) draftStatus(next,value.content ? '草稿已保存到本机' : '讨论与记忆保存在本机')
  }
  if (targetKey(target) === draftKey && matchMedia('(min-width: 761px)').matches) $('#prompt').focus()
}
$('#older-messages').onclick = handle(async () => {
  const chat = current, button = $('#older-messages'); if (!chat?.messages.length) return
  button.disabled = true
  try {
    const value = await api(`/api/chats/${chat.id}?before=${chat.messages[0].id}`)
    if (current?.id !== chat.id) return
    const view = $('#conversation'), height = view.scrollHeight, top = view.scrollTop
    const previous = [...$('#messages').childNodes]; $('#messages').replaceChildren()
    for (const item of value.messages) message(item)
    $('#messages').append(...previous); chat.messages.unshift(...value.messages); chat.hasOlder = value.hasOlder; button.hidden = !value.hasOlder
    view.scrollTop = top + view.scrollHeight - height
  } finally { button.disabled = false }
})
function resizePrompt() { $('#prompt').style.height = 'auto'; $('#prompt').style.height = Math.min($('#prompt').scrollHeight, 180) + 'px' }
function showTab(name) { $('.settings-content').scrollTop=0; for (const button of document.querySelectorAll('[data-tab]')) { const selected = button.dataset.tab === name; button.classList.toggle('selected', selected); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; $('#tab-' + button.dataset.tab).hidden = !selected } }
function renderModelSettings() {
  options($('#account-model'), state.models, state.account.defaultModelId, state.models.length ? undefined : '先添加 API')
  $('#model-list').replaceChildren()
  for (const model of state.models) {
    const row = document.createElement('div'); row.className = 'model-row'
    row.dataset.search = (model.name+' '+model.model+' '+model.protocol).toLowerCase()
    const title = document.createElement('div'); title.textContent = model.name
    const detail = document.createElement('small'); detail.textContent = `${model.model} · ${model.protocol} · ${model.hasKey ? 'Key 已保存' : '无 Key'}`; title.append(detail)
    const actions = document.createElement('div'); actions.className = 'model-actions'
    const test = document.createElement('button'); test.textContent = '检查连接'
    test.onclick = handle(async () => { test.disabled = true; test.textContent = '检查中…'; try { const result = await api(`/api/models/${model.id}/test`, 'POST', {}); toast(`连接成功 · ${(result.elapsedMs / 1000).toFixed(1)} 秒（仅检查文字接口）`) } finally { test.disabled = false; test.textContent = '检查连接' } })
    const edit = document.createElement('button'); edit.textContent = '编辑'; edit.onclick = () => editModel(model)
    actions.append(test, edit); row.append(title, actions); $('#model-list').append(row)
  }
  if (!state.models.length) $('#model-list').textContent = '绑定账户 API 后，所有 Agent 都可以直接使用。'
  filterModels()
}
function filterModels() { const query = $('#model-filter').value.trim().toLowerCase(), rows = [...$('#model-list').querySelectorAll('.model-row')]; for (const row of rows) row.hidden = !row.dataset.search.includes(query); $('#model-empty').hidden = !rows.length || rows.some(row => !row.hidden) }
$('#model-filter').oninput = filterModels
async function settings(tab = 'general') {
  $('#settings-search').value='';filterSettings()
  if ($('#settings').open && !$('#settings').dataset.loading) { showTab(tab); return }
  return loadDialog($('#settings'),async()=>{
    const [,profile,go,servers]=await Promise.all([refresh(),api('/api/profile'),api('/api/providers/opencode-go'),api('/api/integrations')])
    return()=>{
      renderModelSettings();profileOriginal=profile
      options($('#go-presets'),go.presets.map(id=>({id,name:id})),$('#go-presets').value)
      $('#go-status').textContent=go.hasKey?'Go Key 已保存，添加模型时无需重复填写。':'填写 OpenCode Go 的账户 Key，即可由所有 Agent 共用。'
      if(!go.hasKey&&state.models.every(model=>model.provider==='opencode-go'))$('#go-panel').open=true
      $('#mcp-form').elements.namedItem('servers').value=JSON.stringify(servers.map(({hasToken,...server})=>server),null,2)
      for(const key of ['profile','rules','memory'])$('#profile-form').elements.namedItem(key).value=profile[key]
      syncAppearance();renderSettingsManagement();showTab(tab)
    }
  })
}
async function editModel(model = {}) {
  if(!modelForm.hidden&&modelForm.dataset.clean!==dialogSnapshot(modelForm)&&!await confirmAction('模型有未保存的修改，确定放弃并切换？'))return
  modelForm.hidden = false; modelForm.reset()
  modelForm.dataset.revision = model.revision || ''
  for (const key of ['id','name','protocol','baseUrl','model','contextChars','maxOutputTokens']) if (model[key] !== undefined) modelForm.elements.namedItem(key).value = model[key]
  modelForm.elements.namedItem('toolsEnabled').checked = model.toolsEnabled !== false
  modelForm.elements.namedItem('temperature').value = model.temperature ?? 0.7
  modelForm.elements.namedItem('tokenParameter').value = model.tokenParameter || 'max_tokens'
  modelForm.elements.namedItem('apiKey').value = ''; modelForm.elements.namedItem('name').focus()
  modelForm.elements.namedItem('apiKey').disabled = model.provider === 'opencode-go'
  modelForm.elements.namedItem('clearKey').disabled = model.provider === 'opencode-go'
  modelForm.elements.namedItem('apiKey').placeholder = model.provider === 'opencode-go' ? '使用 Go 面板管理账户共享 Key' : '留空保留已保存的 Key'
  markFormClean(modelForm)
}
async function editAgent(key) {
  const origin=key&&current?.kind==='group'?{type:'group',id:current.id}:null
  $('#agent-dialog-title').textContent = key ? 'Agent 身份、模型与记忆' : '创建 Agent'
  return loadDialog($('#agent-dialog'),async()=>{
    const agent=key?await api('/api/agents/'+key):{id:'',name:'',rules:'',memory:''}
    return()=>{agentEditOrigin=origin;agentOriginal={...agent};agentForm.reset();for(const field of ['id','name','rules','memory','background','responsibilities'])agentForm.elements.namedItem(field).value=agent[field]||'';options($('#agent-model'),state.models,agent.modelId||'','继承账户默认模型')}
  })
}
function editGroup(create = false, kind = 'emergent') {
  if($('#group-dialog').dataset.saving){toast('正在保存，请稍候');return}
  const group = !create && current?.kind === 'group' ? current : null
  if(group?.componentKind==='city'){openComponents().catch(error=>toast(error.message));return}
  groupOriginal = group?.updatedAt || ''
  groupForm.reset(); groupForm.elements.namedItem('id').value = group?.id || ''; groupForm.elements.namedItem('name').value = group?.title || ''
  groupForm.dataset.runtimeLimits=JSON.stringify(group?.runtimeLimits||{})
  groupForm.elements.namedItem('concurrency').value=group?.runtimeLimits?.concurrency||2
  groupForm.elements.namedItem('modelCalls').value=group?.runtimeLimits?.modelCalls||24
  for(const [name,fallback] of [['listenerDepth',6],['listenerChecks',8],['perAgent',4],['events',16]])groupForm.elements.namedItem(name).value=group?.runtimeLimits?.[name]||fallback
  groupForm.elements.namedItem('purpose').value = group?.purpose || ''
  groupForm.elements.namedItem('replyMode').value = group?.replyMode || 'collective'; groupForm.elements.namedItem('discussionMode').value=group?.discussionMode||'open'
  groupForm.elements.namedItem('componentKind').value=group?componentType(group):kind
  syncComponentMode()
  $('#group-dialog-title').textContent = group ? '群聊成员' : '创建群聊'; $('#group-members').replaceChildren()
  for (const agent of state.agents) {
    const label = document.createElement('label'); label.className = 'member-option'
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.name = 'memberIds'; checkbox.value = agent.id; checkbox.checked = group?.memberIds.includes(agent.id) || false
    label.append(checkbox, document.createTextNode(agent.name))
    const role = document.createElement('input'); role.name = 'role-' + agent.id; role.placeholder = '职责（可选）'; role.value = group?.memberRoles?.[agent.id] || ''; role.maxLength = 1000; role.setAttribute('aria-label', agent.name + '的群内职责'); role.className = 'member-role'; role.disabled = !checkbox.checked
    checkbox.onchange = () => { role.disabled = !checkbox.checked; updateCoordinator() }
    const row = document.createElement('div'); row.className = 'member-row'; row.dataset.search = agent.name.toLowerCase(); row.append(label, role); $('#group-members').append(row)
  }
  function updateCoordinator(initial = false) { const chosen = [...groupForm.querySelectorAll('[name="memberIds"]:checked')].map(input => ({ id: input.value, name: agentName(input.value) })); options($('#group-coordinator'), chosen, initial ? group?.coordinatorId || '' : $('#group-coordinator').value, chosen.length ? undefined : '先选择讨论成员'); const minimum=group?.spaceKind==='solo'?1:2; const invalid = chosen.length < minimum || chosen.length > 12; $('#group-selected-count').textContent = `已选 ${chosen.length} / 12 · 至少 ${minimum} 位`; $('#group-selected-count').classList.toggle('invalid',invalid); groupForm.querySelector('[type="submit"]').disabled = invalid; $('#group-save-note').textContent = invalid ? `请选择 ${minimum}–12 位成员` : `${chosen.length} 位成员 · 可继续调整群内职责` }
  updateCoordinator(true)
  $('#group-member-filter').value = ''; filterGroupMembers()
  $('#group-dialog').showModal()
  markDialogClean($('#group-dialog'))
}
function filterGroupMembers() { const query = $('#group-member-filter').value.trim().toLowerCase(), rows = [...$('#group-members').children]; for (const row of rows) row.hidden = !row.dataset.search.includes(query); $('#group-member-empty').hidden = rows.some(row => !row.hidden) }
$('#group-member-filter').oninput = filterGroupMembers
function clearSubmittedDraft(selected, raw) {
  const key = targetKey(selected), visible = targetKey(target) === key
  const unchanged = visible ? $('#prompt').value === raw : drafts.get(key) === raw
  if (unchanged) { clearTimeout(draftTimers.get(key)); draftTimers.delete(key); drafts.delete(key); if (visible) { $('#prompt').value = ''; resizePrompt() } }
  return saveDraft(selected, '', raw)
}
async function sendMessage(retryTurnId = '') {
  if (!current) return
  if (submittingThreads.has(current.id)) return
  if (isBusy()) {
    if ($('#busy-send-mode')?.value==='queue') return enqueueCurrentMessage()
    const threadId = current.id, selected = {...target}, raw = $('#prompt').value, content = raw.trim(), recipient = current.kind === 'group' ? $('#recipients').value : ''
    if (!content) return
    submittingThreads.add(threadId);updateSendControl()
    try { await api(`/api/chats/${threadId}/steer`,'POST',{content,...(recipient?{memberIds:[recipient]}:{})}); await clearSubmittedDraft(selected,raw); toast('已插话，已中断旧任务并优先处理') }
    finally { submittingThreads.delete(threadId);updateSendControl() }
    return
  }
  const rawContent = $('#prompt').value, content = rawContent.trim(); if (!content && !retryTurnId) return
  if (!state.models.length) { await settings(); toast('先绑定账户 API，所有 Agent 都能使用'); return }
  const threadId = current.id, selected = { ...target }, selectedKey = targetKey(selected)
  const group = current.kind === 'group', recipient = group ? $('#recipients').value : '', modelId = group ? $('#model').value : ''
  const submission = selectedKey + ':' + rawContent
  if (!sendingIds.has(submission)) sendingIds.set(submission, crypto.randomUUID())
  const controller=new AbortController();submissionControllers.set(threadId,controller)
  submittingThreads.add(threadId); pending.add(threadId); controls(); await flushDraft(selected).catch(() => {})
  let accepted = false, ended = false
  try {
    if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError')
    const response = await fetch(`/api/chats/${threadId}/${retryTurnId ? 'retry' : 'chat'}`, { method: 'POST',signal:controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(retryTurnId ? { turnId: retryTurnId, modelId } : { content, modelId, requestId: sendingIds.get(submission), ...(group && recipient ? { memberIds: [recipient] } : {}) }) })
    if (!response.ok) await readApiResponse(response)
    const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = ''
    const consume = item => {
      const visible = current?.id === threadId
      if (item.type === 'accepted') {
        sendingIds.delete(submission)
        accepted = true; submittingThreads.delete(threadId)
        clearSubmittedDraft(selected, rawContent).catch(() => {})
        updateSendControl()
        if (visible) { $('#welcome').hidden = true; message(item.message); scrollIfNear(true) }
      }
      if (item.type === 'turn' && visible) { current.turns ||= []; const index = current.turns.findIndex(turn => turn.id === item.turn.id); if (index < 0) current.turns.push(item.turn); else current.turns[index] = item.turn; renderTurn() }
      if (['speaker','delta','speaker_done'].includes(item.type)) {
        const streaming=updateLiveStream(threadId,item)
        if(streaming&&visible){
          if(item.type==='delta'){
            if(!streaming.frame)streaming.frame=requestAnimationFrame(()=>{streaming.frame=0;if(!streaming.done)paintStream(threadId,streaming)})
          }else paintStream(threadId,streaming)
          const active=[...(streams.get(threadId)?.values()||[])].map(entry=>entry.name||agentName(entry.agentId))
          $('#hint').textContent=active.length?active.join('、')+' 正在交流…':'正在听取其他成员的想法…'
        }
      }
      if (['approval','tasks','tool'].includes(item.type) && visible) refreshWork().catch(()=>{});
      if(item.type==='tool' && visible) $('#hint').textContent=`${agentName(item.agentId)} · ${item.name} · ${item.status}`;
      if(item.type==='tool_output' && visible){$('#tool-output').hidden=false;$('#tool-output').textContent=($('#tool-output').textContent+item.text).slice(-12000)}
      if(item.type==='interjection' && visible)message(item.message);
      if (item.type === 'agent_created') { if (!state.agents.some(agent => agent.id === item.agent.id)) state.agents.push(item.agent); renderContacts(); if (visible) { message(item.message); scrollIfNear() } }
      if (item.type === 'agent_removed') { state.agents=state.agents.filter(agent=>agent.id!==item.agentId);renderContacts();refresh().catch(error=>toast(error.message)) }
      if (item.type === 'components_updated') { refresh().catch(error=>toast(error.message)) }
      if (item.type === 'group_removed') { refresh().catch(error=>toast(error.message)) }
      if (item.type === 'group_created') { const index=state.groups.findIndex(group=>group.id===item.group.id);if(index<0)state.groups.push(item.group);else state.groups[index]=item.group;renderContacts();if(item.group.formedBy)toast(agentName(item.group.formedBy)+' 发起了新的涌现群聊「'+item.group.title+'」');if (visible && item.message) message(item.message) }
      if (['memory_updated', 'collaboration','reasoning_updated'].includes(item.type) && visible) { message(item.message); scrollIfNear() }
      if (item.type === 'warning' && visible) message(item.message)
      if (item.type === 'done') { ended = true; sendingIds.delete(submission); if (item.duplicate) toast('这条消息已收到，正在载入已保存的结果') }
      if (item.type === 'error') { ended = true; throw new Error(item.message) }
    }
    try {
      while (true) {
        const { value, done } = await reader.read(); buffer += decoder.decode(value, { stream: !done })
        let split; while ((split = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, split); buffer = buffer.slice(split + 1); if (line.trim()) consume(JSON.parse(line)) }
        if (done) break
      }
      if (buffer.trim()) consume(JSON.parse(buffer))
      if (!ended) throw new Error('连接已断开，已保存的内容仍在当前 Agent 中')
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  } catch (error) { toast(error.name==='AbortError'?(accepted?'已停止，已接收的内容仍保留':'已取消发送，草稿仍保留'):error.message); if (!accepted && targetKey(target) !== selectedKey && !drafts.has(selectedKey)) drafts.set(selectedKey, rawContent) }
  finally {
    const restoreFocus=shouldFocusComposer()
    submittingThreads.delete(threadId)
    if(submissionControllers.get(threadId)===controller)submissionControllers.delete(threadId)
    pending.delete(threadId)
    streams.delete(threadId)
    await refresh().catch(error => toast(error.message))
    if (current?.id === threadId) { await loadCurrent(false).catch(error => toast(error.message)); $('#hint').textContent = current.kind === 'group' ? '输入 @，选择想联系的成员' : '继续追问，或分享一个新想法'; restoreComposerFocus(restoreFocus) }
    controls()
  }
}
$('#composer').onsubmit = event => { event.preventDefault();sendMessage().catch(error=>toast(error.message)) }
$('#prompt').onkeydown = event => {
  const menu = $('#mention-list'), choices = [...menu.querySelectorAll('button')]
  if (!menu.hidden && choices.length && ['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(event.key) && !event.isComposing) {
    event.preventDefault()
    if (event.key === 'Escape') menu.hidden = true
    else if (event.key === 'Enter' || event.key === 'Tab') choices[mentionIndex]?.click()
    else { mentionIndex = (mentionIndex + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length; choices.forEach((choice,index) => choice.classList.toggle('active',index === mentionIndex)) }
    return
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && (!newlineMode || event.ctrlKey || event.metaKey)) { event.preventDefault(); $('#composer').requestSubmit() }
}
$('#prompt').oninput = () => {
  resizePrompt(); mentionSuggestions()
  updateSendControl()
  if (target) draftStatus(target,$('#prompt').value ? '正在编辑 · 等待保存' : '正在清空草稿…')
  if (target) { const selected = { ...target }, key = targetKey(selected); drafts.set(key, $('#prompt').value); clearTimeout(draftTimers.get(key)); draftTimers.set(key, setTimeout(() => flushDraft(selected).catch(() => {}), 350)) }
}
window.addEventListener('pagehide', () => { if (target && draftBases.has(targetKey(target))) fetch(`/api/drafts/${target.type}/${target.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: $('#prompt').value, expected: draftBases.get(targetKey(target)) }), keepalive: true }).catch(() => {}) })
window.addEventListener('beforeunload',event=>{if(hasUnsavedDrafts()){event.preventDefault();event.returnValue=''}})
$('#draft-retry').onclick=handle(openDraftRecovery)
$('#draft-recovery-form').onsubmit=handle(saveRecoveredDraft)
function mentionSuggestions() {
  const menu = $('#mention-list'); menu.replaceChildren(); menu.hidden = true; mentionIndex = 0
  if (current?.kind !== 'group') return
  const match = $('#prompt').value.slice(0, $('#prompt').selectionStart).match(/(?:^|\s)@([^\s@]*)$/)
  if (!match) return
  for (const member of ['all', ...current.memberIds].filter(member => (member === 'all' ? '全体 all' : agentName(member)).toLowerCase().includes(match[1].toLowerCase()))) {
    const button = document.createElement('button'); button.type = 'button'; const mentionName = member === 'all' ? '全体' : state.agents.filter(agent => agent.name === agentName(member)).length > 1 ? member : agentName(member); button.textContent = '@' + (member === 'all' ? '全体' : agentName(member)); button.title = member; button.onmousedown = event => event.preventDefault()
    button.onclick = () => { const input = $('#prompt'), at = input.selectionStart, prefix = input.value.slice(0, at), suffix = input.value.slice(at); input.value = prefix.slice(0, prefix.length - match[1].length) + mentionName + ' ' + suffix; const caret = prefix.length - match[1].length + mentionName.length + 1; input.focus(); input.setSelectionRange(caret, caret); menu.hidden = true; input.dispatchEvent(new Event('input')) }
    menu.append(button)
  }
  menu.hidden = !menu.childElementCount
  menu.querySelector('button')?.classList.add('active')
}
document.addEventListener('pointerdown',event=>{if(!$('#mention-list').contains(event.target)&&!$('#composer').contains(event.target))$('#mention-list').hidden=true})
$('#stop').onclick = handle(async () => { if (current) { const key=current.id;submissionControllers.get(key)?.abort();$('#stop').disabled=true;try{await api(`/api/chats/${key}/stop`,'POST',{})}finally{if(current?.id===key)$('#stop').disabled=!isBusy()} } })
$('#model').onchange = handle(async () => {
  if (!current) return
  if (current.kind === 'group') { const key=current.id;try { const group = await api(`/api/chats/${key}/preferences`, 'PUT', { modelId: $('#model').value,expectedModelId:current.modelId||'' }); if(current?.id===key)current.modelId = group.modelId;await refresh();toast('群模型设置已保存') } catch(error) {await refresh();renderHeader();throw error} return }
  const key = current.agentId
  try { await api(`/api/agents/${key}/model`, 'PUT', { modelId: $('#model').value,expectedModelId:state.agents.find(agent=>agent.id===key)?.modelId||'' }); await refresh(); toast('模型设置已保存，下次继续生效') }
  catch (error) { renderHeader(); throw error }
})
$('#recipients').onchange = () => { if (current) groupRecipients.set(current.id, $('#recipients').value) }
$('#account-model').onchange = handle(async () => {
  const select=$('#account-model'), modelId=select.value, expectedModelId=state.account.defaultModelId
  select.disabled=true
  try { await api('/api/account', 'PUT', { defaultModelId:modelId, expectedModelId }); await refresh(); toast('账户默认模型已更新，继承账户设置的 Agent 会一起切换') }
  catch(error) { try { await refresh() } finally { options(select,state.models,state.account.defaultModelId,state.models.length?undefined:'先添加 API') } throw error }
  finally { select.disabled=false }
})
function visibleRosterContacts(){return [...$('#contacts').querySelectorAll('.contact')].filter(item=>item.getClientRects().length)}
$('#search').oninput = () => { $('#contacts').scrollTop = 0; renderContacts() }
$('#search').onkeydown = event => {
  if(event.isComposing||event.keyCode===229)return
  if((event.key==='ArrowDown'||event.key==='ArrowUp')&&!event.altKey&&!event.ctrlKey&&!event.metaKey){const items=visibleRosterContacts();if(!items.length)return;event.preventDefault();const next=event.key==='ArrowUp'?items.at(-1):items[0];next.focus();next.scrollIntoView({block:'nearest'})}
  if(event.key==='Enter'&&($('#search').value.trim()||$('#sidebar-kind').value!=='all'||$('#sidebar-status').value!=='all')){const first=visibleRosterContacts()[0];if(!first)return;event.preventDefault();first.click()}
}
$('#create-agent').onclick = handle(() => editAgent())
$('#create-group').onclick = () => editGroup(true)
$('#contact-info').onclick = () => openConversationControl()
$('#settings-open').onclick = handle(() => settings())
function dialogSnapshot(dialog) { return JSON.stringify([...dialog.querySelectorAll('input,textarea,select')].filter(input => input.type !== 'search' && input.id !== 'context-agent' && input.id !== 'memory-scope' && input.id !== 'show-old-memory').map(input => [input.name || input.id, input.type === 'checkbox' ? input.checked : input.value])) }
function markFormClean(form) { form.dataset.clean = dialogSnapshot(form) }
function markDialogClean(dialog) { dialog.dataset.clean = dialogSnapshot(dialog); for (const form of dialog.querySelectorAll('form')) markFormClean(form) }
async function closeDialog(dialog) {
  if(dialog.dataset.saving){toast('正在保存，请稍候');return}
  const dirty=dialog.id!=='conversation-settings'&&!dialog.dataset.loading&&(dialog.id==='context-dialog'?$('#context-form').elements.namedItem('context').value!==contextOriginal||memoryDirty():['settings','work-hub'].includes(dialog.id)?[...dialog.querySelectorAll('form')].some(form=>form.dataset.clean!==dialogSnapshot(form)):dialog.dataset.clean!==dialogSnapshot(dialog))
  if(dirty&&!await confirmAction('还有未保存的修改，确定放弃？'))return
  dialogLoads.delete(dialog.id);dialog.close()
  if(dialog.id==='settings'){modelForm.reset();modelForm.hidden=true;$('#go-form').reset()}
}
for (const dialog of document.querySelectorAll('dialog:not(#confirm-dialog)')) { const heading = dialog.querySelector('h2'); if (!heading.id) heading.id = dialog.id + '-heading'; dialog.setAttribute('aria-labelledby', heading.id); dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog) }) }
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => closeDialog($('#' + button.dataset.close))
for (const selector of ['#agent-form','#group-form','#profile-form','#context-form']) { const form = $(selector), button = form.querySelector(':scope > button[type="submit"]'); if (button) { const footer = document.createElement('div'); footer.className = 'dialog-actions'; footer.append(button); if (selector === '#group-form') { const note = document.createElement('span'); note.id = 'group-save-note'; note.className = 'help'; footer.append(note) } form.append(footer) } }
$('#group-member-empty').after($('#group-coordinator').closest('label'))
const backgroundSection=document.createElement('details');backgroundSection.id='context-background';const backgroundTitle=document.createElement('summary');backgroundTitle.textContent='本次交流的背景与约定';backgroundSection.append(backgroundTitle);$('#context-form').before(backgroundSection);backgroundSection.append($('#context-form'));$('#context-form [name="context"]').rows=6
for (const button of document.querySelectorAll('[data-tab]')) button.onclick = () => showTab(button.dataset.tab)
$('.tabs').setAttribute('role', 'tablist'); $('.tabs').setAttribute('aria-label', '设置分类')
for (const button of document.querySelectorAll('[data-tab]')) { button.setAttribute('role', 'tab'); button.id = 'settings-tab-' + button.dataset.tab; button.setAttribute('aria-controls', 'tab-' + button.dataset.tab); const panel = $('#tab-' + button.dataset.tab); panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id); button.onkeydown = event => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return; event.preventDefault(); const buttons = [...document.querySelectorAll('[data-tab]')].filter(item=>!item.hidden), index = buttons.indexOf(button); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length; showTab(buttons[next].dataset.tab); buttons[next].focus() } }
$('#add-model').onclick = () => editModel()
$('#cancel-model').onclick = async () => { if(modelForm.dataset.clean!==dialogSnapshot(modelForm)&&!await confirmAction('确定放弃这个模型的未保存修改？'))return;modelForm.hidden = true; modelForm.reset(); markFormClean(modelForm) }
modelForm.onsubmit = handle(async () => {
  const values = Object.fromEntries(new FormData(modelForm)); values.clearKey = modelForm.elements.namedItem('clearKey').checked
  values.toolsEnabled = modelForm.elements.namedItem('toolsEnabled').checked
  values.expectedRevision = modelForm.dataset.revision || ''
  try { await api('/api/models', 'PUT', values) }
  catch(error) { try { await refresh(); renderModelSettings() } catch {} throw error }
  modelForm.reset(); modelForm.hidden = true; await refresh(); renderModelSettings(); markFormClean(modelForm); toast('账户 API 已保存')
})
$('#profile-form').onsubmit = handle(async event => { const values = Object.fromEntries(new FormData(event.target)); await api('/api/profile', 'PUT', { ...values, expected: profileOriginal }); profileOriginal = values; markFormClean(event.target); toast('个人信息和共享记忆已保存') })
agentForm.onsubmit = handle(async () => { const agent = await api('/api/agents', 'PUT', { ...Object.fromEntries(new FormData(agentForm)), expectedMemory: agentOriginal?.memory, expectedRules: agentOriginal?.rules, expectedName: agentOriginal?.name,expectedModelId:agentOriginal?.modelId||'',expectedBackground:agentOriginal?.background||'',expectedResponsibilities:agentOriginal?.responsibilities||'' }); $('#agent-dialog').close(); await refresh(); await openTarget(agentEditOrigin||{ type: 'agent', id: agent.id }); toast('Agent 的模型、背景、提示词和职责已保存') })
groupForm.onsubmit = handle(async () => {
  const values = new FormData(groupForm), id = values.get('id')
  const memberIds = values.getAll('memberIds'), memberRoles = Object.fromEntries(memberIds.map(key => [key, values.get('role-' + key) || '']))
  const group = await api(id ? `/api/groups/${id}` : '/api/groups', id ? 'PUT' : 'POST', { componentKind:values.get('componentKind'), runtimeLimits:{...JSON.parse(groupForm.dataset.runtimeLimits||'{}'),concurrency:Number(values.get('concurrency')),modelCalls:Number(values.get('modelCalls')),listenerDepth:Number(values.get('listenerDepth')),listenerChecks:Number(values.get('listenerChecks')),perAgent:Number(values.get('perAgent')),events:Number(values.get('events'))},name: values.get('name'), memberIds, memberRoles, purpose: values.get('purpose'), replyMode: groupForm.elements.namedItem('replyMode').value, discussionMode:groupForm.elements.namedItem('discussionMode').value, coordinatorId: values.get('coordinatorId'), ...(id ? { expected: groupOriginal } : {}) })
  $('#group-dialog').close(); await refresh(); await openTarget({ type: 'group', id: group.id })
})
$('#context-open').onclick = handle(async () => {
  if (!current) return
  const key=current.id
  return loadDialog($('#context-dialog'),async()=>{
    const chat=await api('/api/chats/'+key),agentId=chat.agentId
    const scopes=chat.kind==='group'?chat.replyMode==='collective'?[{id:'group',name:'群体共同记忆 · 全体成员共用'}]:[{id:'group',name:'本群共享记忆'},{id:'member',name:'所选成员在本群的笔记'},{id:'agent',name:'所选 Agent 的长期记忆'}]:[{id:'agent',name:'此 Agent 的长期记忆'}]
    const scope=scopes[0].id,[context,memory]=await Promise.all([api(`/api/chats/${key}/context?agentId=${agentId}`),api(`/api/chats/${key}/memory?agentId=${agentId}&scope=${scope}`)])
    return()=>{
      contextLoadVersion++;memoryLoadVersion++;historyLoadVersion++;contextOriginal=chat.context;$('#context-form').elements.namedItem('context').value=chat.context;$('#context-dialog').dataset.thread=key
      options($('#context-agent'),(chat.memberIds||[agentId]).map(id=>({id,name:agentName(id)})),agentId);options($('#memory-scope'),scopes,scope)
      $('#memory-filter').value='';$('#history-results').replaceChildren();$('#history-search').reset();renderContext(context);applyMemory(memory,key,agentId,scope);syncSummaryControls()
    }
  })
})
function contextPath(action) { return `/api/chats/${$('#context-dialog').dataset.thread}/${action}` }
async function loadContext() {
  const version=++contextLoadVersion,thread=$('#context-dialog').dataset.thread,agentId=$('#context-agent').value
  const value = await api(`/api/chats/${thread}/context?agentId=${agentId}`)
  if(version!==contextLoadVersion||thread!==$('#context-dialog').dataset.thread||agentId!==$('#context-agent').value)return
  renderContext(value)
}
function renderContext(value) {
  $('#context-stats').textContent = value.plan ? `完整历史 ${value.total} 条 · 当前载入 ${value.plan.included} 条 · 预算外 ${value.plan.omitted} 条 · ${value.plan.chars.toLocaleString()} / ${value.plan.budget.toLocaleString()} 字符` : value.error
  $('#summary-preview').textContent = (value.summaryReason ? `【${value.summaryReason}】\n\n` : '') + (value.summary?.text || '尚未整理旧历史')
  $('#summary-preview').classList.toggle('stale', !!value.summary && !value.summaryValid)
  if (value.summaryReason) $('#context-stats').textContent += ' · 旧摘要已暂停使用'
}
async function loadMemory() {
  const version = ++memoryLoadVersion, agentId = $('#context-agent').value, scope = $('#memory-scope').value, thread = $('#context-dialog').dataset.thread
  for(const selector of ['#memory-items','#memory-form','#memory-fact-form'])$(selector).inert=true
  $('#memory-items').setAttribute('aria-busy','true')
  try{
    const value = await api(`/api/chats/${thread}/memory?agentId=${agentId}&scope=${scope}`)
    if (version !== memoryLoadVersion||thread!==$('#context-dialog').dataset.thread||agentId!==$('#context-agent').value||scope!==$('#memory-scope').value) return
    applyMemory(value,thread,agentId,scope)
  }catch(error){if(version===memoryLoadVersion&&memoryEditor&&memoryEditor.thread===thread){$('#context-agent').value=memoryEditor.agentId;$('#memory-scope').value=memoryEditor.scope}throw error}
  finally{if(version===memoryLoadVersion){for(const selector of ['#memory-items','#memory-form','#memory-fact-form'])$(selector).inert=false;$('#memory-items').removeAttribute('aria-busy')}}
}
function applyMemory(value,thread,agentId,scope) {
  for(const selector of ['#memory-items','#memory-form','#memory-fact-form'])$(selector).inert=false
  $('#memory-items').removeAttribute('aria-busy')
  memoryEditor = { thread, agentId, scope, content: value.content, items: value.items || [] }; $('#memory-form').elements.namedItem('content').value = value.content
  $('#source-preview').hidden = true
  resetFactEditor()
  renderMemoryItems()
}
function renderMemoryItems() {
  const box = $('#memory-items'); box.replaceChildren(); if (!memoryEditor) return
  const query = $('#memory-filter').value.trim().toLocaleLowerCase()
  const items = memoryEditor.items.filter(item => (['active','proposed','contested'].includes(item.status) || $('#show-old-memory').checked) && item.note.toLocaleLowerCase().includes(query)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at))
  for (const item of items) {
    const row = document.createElement('div'); row.className = 'memory-item ' + item.status
    const text = document.createElement('p'); text.textContent = (item.pinned ? '置顶 · ' : '') + item.note
    const meta = document.createElement('small'); meta.textContent = `${item.sourceType === 'manual' ? '你手动记录' : agentName(item.agentId)} · ${new Date(item.at).toLocaleString()} · ${{active:'当前采用',proposed:'已共享 · 待验证',contested:'存在分歧',replaced:'已被纠正',forgotten:'已撤回'}[item.status]}${item.category ? ' · '+({fact:'事实',decision:'决定',lesson:'经验',question:'待验证问题',discussion:'讨论成果'}[item.category]) : ''}${item.confirmedByUserAt ? ' · 你已确认' : ''}${item.replacesId ? ' · 有旧版本' : ''}`
    const reviewRows = []
    for (const review of item.reviews || []) { const detail = document.createElement('p'); detail.className = 'help'; detail.textContent = `${agentName(review.agentId)} · ${review.verdict === 'support' ? '支持' : '质疑'}：${review.reason}`; reviewRows.push(detail) }
    const actions = document.createElement('div'); actions.className = 'memory-actions'
    const source = document.createElement('button'); source.type = 'button'; source.textContent = '查看来源'; source.onclick = handle(async () => {
      const editor=memoryEditor
      const value = await api(`/api/chats/${item.sourceSessionId}/message?id=${item.sourceMessageId}`)
      if(editor!==memoryEditor||!$('#context-dialog').open)return
      $('#source-preview').hidden = false; $('#source-preview').textContent = `记忆来源 · ${new Date(value.at).toLocaleString()}\n${value.content}`
      $('#source-preview').closest('details').open = true; $('#source-preview').scrollIntoView({ block: 'nearest' })
    }); if (item.sourceType !== 'manual') actions.append(source)
    if (item.status === 'active') {
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '纠正'; edit.onclick = () => openFactEditor(item); actions.append(edit)
    }
    for (const [action, label] of item.status === 'active' ? [['pin',item.pinned ? '取消置顶' : '置顶'],['forget','撤回']] : ['proposed','contested'].includes(item.status) ? [['confirm','确认采用'],['forget','撤回']] : item.status === 'forgotten' ? [['restore','恢复']] : []) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label
      button.onclick = handle(async () => {
        if(memoryDirty()){toast('请先保存或取消记忆编辑，再调整单条记忆');return}
        const editor=memoryEditor
        if(action==='forget'&&!await confirmAction('从后续上下文撤回这条记忆？历史和旧版本会保留。','撤回记忆','保留记忆'))return
        if(editor!==memoryEditor||!$('#context-dialog').open)return
        button.disabled=true
        try{await api(`/api/chats/${editor.thread}/memory-item`,'PUT',{agentId:editor.agentId,scope:editor.scope,itemId:item.id,expected:item.updatedAt,action});if(editor===memoryEditor&&$('#context-dialog').open){await loadMemory();await loadContext();markDialogClean($('#context-dialog'))}}finally{button.disabled=false}
      })
      actions.append(button)
    }
    row.append(text, meta, ...reviewRows, actions); box.append(row)
  }
  if (!items.length) { const text = document.createElement('p'); text.className = 'help'; text.textContent = query ? '没有匹配的记忆条目' : '还没有逐条记录的记忆。可直接记一条；现有文本仍然有效，可在下方展开编辑。'; box.append(text) }
}
function resetFactEditor() { $('#memory-fact-form').reset(); $('#memory-fact-form').hidden = true; factEditorOriginal = '' }
function memoryDirty() { return !!memoryEditor && ($('#memory-form').elements.namedItem('content').value !== memoryEditor.content || !$('#memory-fact-form').hidden && $('#memory-fact-form').elements.namedItem('note').value !== factEditorOriginal) }
function openFactEditor(item) {
  if (memoryDirty()) { toast('请先保存或取消已有的记忆编辑'); return }
  const form = $('#memory-fact-form'); form.reset(); form.hidden = false
  form.elements.namedItem('itemId').value = item?.id || ''; form.elements.namedItem('expected').value = item?.updatedAt || ''; form.elements.namedItem('note').value = item?.note || ''; factEditorOriginal = item?.note || ''; form.elements.namedItem('note').focus()
}
$('#add-memory-fact').onclick = () => openFactEditor()
$('#cancel-memory-fact').onclick = resetFactEditor
$('#memory-filter').oninput = renderMemoryItems
$('#memory-fact-form').onsubmit = handle(async () => {
  const form = $('#memory-fact-form'), values = Object.fromEntries(new FormData(form))
  if (!memoryEditor || !values.note.trim()) return
  await api(`/api/chats/${memoryEditor.thread}/memory-item`, 'PUT', { ...values, agentId: memoryEditor.agentId, scope: memoryEditor.scope, action: values.itemId ? 'correct' : 'add' })
  $('#memory-filter').value = ''
  await loadMemory(); await loadContext(); toast(values.itemId ? '记忆已纠正，旧条目已归档' : '记忆已记录，标注为手动来源')
})
async function switchMemory() {
  if (memoryDirty() && !await confirmAction('当前记忆有未保存的编辑，确定切换并放弃？')) { $('#context-agent').value = memoryEditor.agentId; $('#memory-scope').value = memoryEditor.scope; return }
  await loadMemory(); await loadContext(); markDialogClean($('#context-dialog'))
}
$('#show-old-memory').onchange = renderMemoryItems
$('#context-agent').onchange = handle(switchMemory)
$('#memory-scope').onchange = handle(switchMemory)
$('#memory-form').onsubmit = handle(async () => { if (!memoryEditor) return; if (!$('#memory-fact-form').hidden && $('#memory-fact-form').elements.namedItem('note').value !== factEditorOriginal) { toast('请先保存或取消条目编辑'); return }; await api(`/api/chats/${memoryEditor.thread}/memory`, 'PUT', { agentId: memoryEditor.agentId, scope: memoryEditor.scope, content: $('#memory-form').elements.namedItem('content').value, expected: memoryEditor.content }); await loadMemory(); await loadContext(); markDialogClean($('#context-dialog')); toast('记忆已保存，旧版本已备份') })
$('#history-search').onsubmit = handle(async () => {
  const version=++historyLoadVersion,thread=$('#context-dialog').dataset.thread,query=$('#history-search').elements.namedItem('query').value
  const results = await api(`/api/chats/${thread}/search?q=${encodeURIComponent(query)}`)
  if(version!==historyLoadVersion||thread!==$('#context-dialog').dataset.thread||query!==$('#history-search').elements.namedItem('query').value)return
  $('#history-results').replaceChildren()
  for (const item of results) { const row = document.createElement('div'); row.className = 'history-result'; const meta = document.createElement('small'); meta.textContent = `${item.agentName || (item.role === 'user' ? '你' : 'Agent')} · ${new Date(item.at).toLocaleString()}`; const text = document.createElement('p'); text.textContent = item.content + (item.excerpted ? '\n（仅展示前 4000 字符，完整原文仍在历史文件中）' : ''); row.append(meta, text); $('#history-results').append(row) }
  if (!results.length) $('#history-results').textContent = '未找到相关记录'
})
$('#summarize').onclick = handle(async () => {
  const thread=$('#context-dialog').dataset.thread,agentId=$('#context-agent').value
  if(summaryRuns.has(thread))return
  const run={};summaryRuns.set(thread,run);syncSummaryControls()
  try { await api(`/api/chats/${thread}/summarize`,'POST',{agentId});if($('#context-dialog').dataset.thread===thread&&$('#context-agent').value===agentId)await loadContext();toast('旧历史已整理，原文完整保留') }
  finally { if(summaryRuns.get(thread)===run)summaryRuns.delete(thread);syncSummaryControls() }
})
function syncSummaryControls(){const running=summaryRuns.has($('#context-dialog').dataset.thread);$('#summarize').disabled=running;$('#summarize').textContent=running?'整理中…':'整理一批旧历史';$('#stop-summary').hidden=!running}
$('#go-form').onsubmit = handle(async () => {
  const form = $('#go-form'), values = new FormData(form), button = form.querySelector('[type="submit"]'); button.disabled = true
  try { await api('/api/providers/opencode-go', 'PUT', { apiKey: values.get('apiKey'), modelIds: [values.get('preset'), ...String(values.get('custom') || '').split(/[,，\s]+/)].filter(Boolean), makeDefault: form.elements.namedItem('makeDefault').checked }); form.elements.namedItem('apiKey').value = ''; form.elements.namedItem('custom').value = ''; await refresh(); renderModelSettings(); $('#go-status').textContent = 'Go Key 已保存，所有 Agent 可继承账户默认模型。'; markFormClean(form); toast('Go 配置已保存') }
  finally { button.disabled = false }
})
$('#context-form').onsubmit = handle(async event => { const values = Object.fromEntries(new FormData(event.target)); await api(`/api/chats/${$('#context-dialog').dataset.thread}/context`, 'PUT', { ...values, expected: contextOriginal }); contextOriginal = values.context; markDialogClean($('#context-dialog')); toast('背景与约定已保存') })
$('#export').onclick = handle(async () => {
  const button = $('#export'); button.disabled = true; button.textContent = '正在打包…'
  try { const response = await fetch('/api/export'); if (!response.ok) throw new Error((await response.json()).error); const url = URL.createObjectURL(await response.blob()), link = document.createElement('a'); link.href = url; link.download = 'taoagent-portable.zip'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); toast('便携包已生成，已请求浏览器下载') }
  finally { button.disabled = false; button.textContent = '下载完整便携包' }
})
// Only one background reconciliation may run at a time, including slow/offline requests.
let reconciling = false
async function reconcile() {
  if (reconciling || document.hidden || pending.size || [...document.querySelectorAll('dialog')].some(dialog => dialog.open)) return
  reconciling = true
  try {
    const selected = current?.id, wasRunning = selected && state.running.includes(selected)
    await refresh()
    if (!target) await openInitialTarget()
    else if (wasRunning && current?.id === selected) await loadCurrent(false)
  } catch { /* Connection state is shown by api; the next reconciliation retries. */ }
  finally { reconciling = false }
}
function initialTarget() {
  if (location.hash === '#civilization') return null
  const match = location.hash.match(/^#(agent|group|town)=([^&]+)$/)
  let key = ''
  try { key = match ? decodeURIComponent(match[2]) : '' } catch { /* Invalid bookmark falls back to the workspace. */ }
  const type = match?.[1]==='town'?'group':match?.[1]
  if (type === 'agent' && state.agents.some(agent => agent.id === key)) return {type,id:key}
  if (type === 'group' && state.groups.some(group => group.id === key)) return {type,id:key}
  const main=state.agents.find(agent=>agent.id==='main');if(main)return {type:'agent',id:main.id}
  const group = state.groups.find(group => group.id === 'my-team') || state.groups[0]
  if (group) return {type:'group',id:group.id}
  const agent = state.agents.find(agent => agent.id === 'main') || state.agents[0]
  return agent ? {type:'agent',id:agent.id} : null
}
async function openInitialTarget() {
  if (location.hash === '#civilization' || document.body.classList.contains('civ-active')) return
  const selected = initialTarget()
  if (selected) await openTarget(selected)
  else { $('#welcome-title').textContent = '创建你的第一个成员'; $('#welcome-description').textContent = '点击侧栏「＋ 成员」设置职责，再绑定模型即可开始交流。' }
  if (!state.models.length || state.models.every(model=>model.provider==='opencode-go'&&!model.hasKey)) $('#hint').textContent = '在设置中绑定账户 API，即可开始交流'
}
setInterval(reconcile, 4000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) reconcile() })
window.addEventListener('online', reconcile)
reconcile().then(()=>{if(showComponentLanding)openComponents().catch(error=>toast(error.message))})

$('#stop-summary').onclick = handle(async () => { const thread=$('#context-dialog').dataset.thread;if(!summaryRuns.has(thread))return;await api(`/api/chats/${thread}/stop`,'POST',{});toast('已请求停止整理，原文保留') })

$('#conversation').addEventListener('scroll', () => { const view = $('#conversation'); followLatest = view.scrollHeight - view.scrollTop - view.clientHeight < 180; $('#jump-bottom').hidden = followLatest })
$('#jump-bottom').onclick = () => scrollIfNear(true)
window.addEventListener('hashchange', () => { const next = initialTarget(); if (next && targetKey(target) !== targetKey(next)) openTarget(next).catch(error=>toast(error.message)) })

// A local overview turns configuration and existing discussions into actionable entry points.
$('#workspace-open').onclick = handle(async () => {
  await loadDialog($('#workspace-dialog'), async () => {
    const snapshot = await api('/api/state')
    return () => {
      const box = $('#workspace-overview'); box.replaceChildren()
      const stats = document.createElement('div'); stats.className = 'workspace-stats'
      for (const [label,count] of [['成员',snapshot.agents.length],['讨论',snapshot.groups.length],['模型',snapshot.models.length],['运行中',snapshot.running.length]]) {
        const card = document.createElement('div'),number = document.createElement('strong'),caption = document.createElement('span')
        number.textContent = count; caption.textContent = label; card.append(number,caption); stats.append(card)
      }
      box.append(stats)
      const available = snapshot.models.filter(model => model.provider !== 'opencode-go' || model.hasKey)
      const notice = document.createElement('p'); notice.textContent = available.length ? '模型连接是否可用，可在设置中点击「检测」核验。' : '尚未配置可用模型凭据，请先完成模型设置。'; box.append(notice)
      const configure = document.createElement('button'); configure.textContent = '管理模型与账户'; configure.onclick = () => { $('#workspace-dialog').close(); settings().catch(error=>toast(error.message)) }; box.append(configure)
      const heading = document.createElement('h3'); heading.textContent = '讨论空间'; box.append(heading)
      for (const group of snapshot.groups) {
        const button = document.createElement('button'); button.className = 'workspace-destination'
        const title = document.createElement('strong'),description = document.createElement('small')
        title.textContent = group.title; description.textContent = `${group.memberIds.length} 位成员 · ${snapshot.running.includes(group.id) ? '正在运行' : '可继续交流'}`
        button.append(title,description); button.onclick = handle(async()=>{ $('#workspace-dialog').close(); await openTarget({type:'group',id:group.id}) }); box.append(button)
      }
      if (!snapshot.groups.length) { const empty = document.createElement('p'); empty.textContent = '还没有讨论空间。可在侧栏新建讨论，邀请成员参与。'; box.append(empty) }
    }
  })
})
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' || document.querySelector('dialog[open]')||$('#workspace-inspector').getAttribute('aria-modal')==='true') return
  event.preventDefault(); if (mobileLayout.matches) sidebar(true); else if(document.body.classList.contains('navigation-collapsed'))toggleNavigation(); $('#search').focus(); $('#search').select()
})
$('#search').title = '搜索成员与讨论 · Ctrl/⌘+K · Esc 清空 · 上下键进入名单'

// Progressive disclosure: real controls retain their handlers and identities when relocated.
$('#conversation-model-slot').querySelector('label').after($('#model'))
$('#conversation-recipients-slot').querySelector('label').after($('#recipients'))
$('#conversation-memory-slot').append($('#context-open'))
$('#conversation-progress-slot').append($('#turn-progress'))
$('#conversation-tools-slot').append($('.workspace-tools'))
$('#settings-integrations').append($('#mcp-form').closest('details'))
$('#settings-workspace').onclick=handle(async()=>{await closeDialog($('#settings'));if(!$('#settings').open)$('#workspace-open').click()})
$('#theme-toggle').hidden = false
$('#theme-toggle').onclick=handle(async()=>{await settings();showTab('appearance')})
$('#quick-theme').onclick=()=>{preference('theme',document.documentElement.dataset.theme==='dark'?'light':'dark');applyAppearance();syncAppearance()}
$('#create-agent').hidden = false
$('#contact-info').title = '打开对话控制'
$('#prompt').placeholder = '说点什么，或 @ 一位成员…'

function syncConversationControl() {
  $('#conversation-delete-group').hidden=current?.kind!=='group'
  $('#conversation-settings-description').textContent = current ? (current.kind === 'group' ? current.title : agentName(current.agentId)) + ' · 更改模型在下一次调用生效' : '先选择一个成员或讨论。'
  $('#conversation-recipients-slot').hidden = current?.kind !== 'group'
  $('#conversation-edit').disabled = !current || isBusy()
  $('#settings-conversation').disabled = !current
  $('#settings-approvals').disabled = !current
}
function openConversationControl(section) {
  syncConversationControl()
  const dialog = $('#conversation-settings')
  if (!dialog.open) dialog.showModal()
  if (section) { const panel = $(section); panel.hidden=false;panel.open = true; panel.scrollIntoView({block:'nearest'}) }
  refreshWork().catch(error=>toast(error.message))
  markDialogClean(dialog)
}
function syncAttention(actions) {
  const button = $('#attention-open')
  if (actions) button.dataset.approvals = String(actions.filter(action=>['pending','uncertain'].includes(action.status)).length)
  const count = Number(button.dataset.approvals || 0), turn = current?.turns?.at(-1)
  const unfinished = !isBusy() && turn && (turn.speakers.some(item=>!['complete','skipped'].includes(item.status)) || (turn.observations||[]).some(item=>['pending','checking','failed'].includes(item.status)))
  button.hidden = !count && !unfinished && !isBusy()
  button.textContent = count ? `${count} 项待审批` : unfinished ? '待继续' : '运行中'
  button.dataset.section = count ? '#work-panel' : '#conversation-progress'
}
$('#conversation-settings-open').onclick = () => openConversationControl()
$('#attention-open').onclick = () => openConversationControl($('#attention-open').dataset.section)
$('#conversation-edit').onclick = handle(()=>current?.kind==='group'?editGroup():editAgent(current?.agentId))
$('#conversation-delete-group').onclick=handle(()=>current?.kind==='group'?deleteGroup(current):undefined)
$('#settings-conversation').onclick = () => openConversationControl()
$('#settings-approvals').onclick = () => openConversationControl('#work-panel')
$('#settings-create-agent').onclick = handle(()=>editAgent())
$('#settings-create-group').onclick = () => editGroup(true)
$('#settings-reconnect').onclick = handle(async()=>{await refresh();$('#settings-connection').textContent='已同步 · '+new Date().toLocaleTimeString();renderSettingsManagement();toast('工作空间已同步')})
function renderSettingsManagement() {
  const box = $('#settings-member-list'); box.replaceChildren()
  for (const agent of state.agents) {
    const row = document.createElement('div'); row.className = 'setting-row'
    const info = document.createElement('div'), name = document.createElement('strong'), detail = document.createElement('p'), edit = document.createElement('button')
    name.textContent = agent.name; detail.textContent = state.models.find(model=>model.id===(agent.modelId||state.account.defaultModelId))?.name || '尚未绑定模型'
    edit.textContent = '配置'; edit.setAttribute('aria-label','配置'+agent.name); edit.onclick = handle(()=>editAgent(agent.id))
    info.append(name,detail); row.append(info,edit); box.append(row)
    if(agent.id!=='main'){const remove=document.createElement('button');remove.type='button';remove.textContent='移除';remove.setAttribute('aria-label','移除'+agent.name);remove.onclick=handle(async()=>{if(!await confirmAction(`移除「${agent.name}」？它将退出活动成员与群协作，完整历史和记忆保留，可恢复。`,'移除 Bot','保留'))return;await api('/api/agents/'+agent.id+'/archive','POST',{reason:'用户在成员管理中确认移除'});await refresh();renderSettingsManagement()});row.append(remove)}
  }
  const heading=document.createElement('h3');heading.textContent='讨论设置';heading.style.marginTop='28px';box.append(heading)
  const archived=document.createElement('details'),archivedTitle=document.createElement('summary'),archivedList=document.createElement('div');archivedTitle.textContent='已移除 Bot · 查看与恢复';archived.append(archivedTitle,archivedList);archived.ontoggle=handle(async()=>{if(!archived.open)return;const entries=await api('/api/agents/archived');archivedList.replaceChildren();for(const agent of entries){const row=document.createElement('div');row.className='setting-row';const text=document.createElement('p'),restore=document.createElement('button');text.textContent=agent.name+' · '+agent.id;restore.textContent='恢复';restore.type='button';restore.onclick=handle(async()=>{await api('/api/agents/'+agent.id+'/restore','POST',{});await refresh();renderSettingsManagement();toast('已恢复 Bot，历史和记忆保留')});row.append(text,restore);archivedList.append(row)}if(!entries.length)archivedList.textContent='没有已移除的 Bot。'});box.append(archived)
  for(const group of state.groups){
    const row=document.createElement('div');row.className='setting-row'
    const info=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('p'),edit=document.createElement('button'),remove=document.createElement('button'),actions=document.createElement('div')
    name.textContent=group.title;detail.textContent=group.memberIds.length+' 位 Bot · '+componentNames[componentType(group)]
    edit.textContent='配置';edit.setAttribute('aria-label','配置'+group.title);edit.onclick=handle(async()=>{await openTarget({type:'group',id:group.id});if(current?.id===group.id)await editGroup()})
    remove.textContent='删除';remove.setAttribute('aria-label','删除群聊'+group.title);remove.onclick=handle(()=>deleteGroup(group));actions.className='group-actions';actions.append(edit,remove)
    info.append(name,detail);row.append(info,actions);box.append(row)
  }
  const deletedGroups=document.createElement('details'),deletedTitle=document.createElement('summary'),deletedList=document.createElement('div');deletedTitle.textContent='已删除群聊 · 查看与恢复';deletedGroups.append(deletedTitle,deletedList)
  deletedGroups.ontoggle=handle(async()=>{if(!deletedGroups.open)return;const entries=await api('/api/groups/archived');deletedList.replaceChildren();for(const group of entries){const row=document.createElement('div'),label=document.createElement('p'),restore=document.createElement('button');row.className='setting-row';label.textContent=group.title+' · 历史、记忆与文件保留';restore.textContent='恢复群聊';restore.type='button';restore.onclick=handle(async()=>{await api('/api/groups/'+group.id+'/restore','POST',{});await refresh();renderSettingsManagement();toast('群聊已恢复，例行任务保持暂停')});row.append(label,restore);deletedList.append(row)}if(!entries.length)deletedList.textContent='没有已删除群聊。'});box.append(deletedGroups)
  syncConversationControl()
  $('#settings-connection').textContent = document.body.classList.contains('offline') ? '连接中断，可手动重新同步' : '已连接本机服务'
}
function filterSettings() {
  const query = $('#settings-search').value.trim().toLocaleLowerCase()
  const matches = [...document.querySelectorAll('[data-tab]')].filter(button=>{
    const panel = $('#tab-'+button.dataset.tab), haystack = button.textContent+' '+panel.textContent
    button.hidden = !!query && !haystack.toLocaleLowerCase().includes(query)
    return !button.hidden
  })
  $('#settings-search-empty').hidden = !!matches.length
  if (matches.length && !matches.some(button=>button.getAttribute('aria-selected')==='true')) showTab(matches[0].dataset.tab)
  return matches
}
$('#settings-search').oninput = filterSettings
$('#settings-search').onkeydown = event => { if (event.key==='Enter') { const first=filterSettings()[0]; if(first){showTab(first.dataset.tab);first.focus()} } }
function applyShellPreferences() {
  for (const [key,fallback] of [['width','focused'],['starters','false'],['timestamps','false'],['actions','false']]) {
    const value=preference(key)||fallback; document.documentElement.dataset[key]=value
    const control=$('#appearance-'+key); if(control.type==='checkbox')control.checked=value==='true';else control.value=value
  }
  document.body.classList.toggle('navigation-collapsed',preference('sidebarCollapsed')==='true')
  $('#menu').setAttribute('aria-expanded',String(mobileLayout.matches?document.body.classList.contains('sidebar-open'):preference('sidebarCollapsed')!=='true'))
}
for (const key of ['width','starters','timestamps','actions']) $('#appearance-'+key).onchange = event => { preference(key,event.target.type==='checkbox'?String(event.target.checked):event.target.value);applyShellPreferences() }
function toggleNavigation() {
  if(mobileLayout.matches){sidebar(!document.body.classList.contains('sidebar-open'));return}
  const collapsed=!document.body.classList.contains('navigation-collapsed');preference('sidebarCollapsed',String(collapsed));applyShellPreferences();$('#menu').setAttribute('aria-expanded',String(!collapsed));if(collapsed&&$('#sidebar .roster-pane').contains(document.activeElement))$('#roster-home').focus()
}
$('#sidebar-collapse').onclick = toggleNavigation
$('#menu').onclick = toggleNavigation
applyShellPreferences()
function synchronizePreferences(event){
  if(event.key!==null&&!event.key.startsWith('taoagent.'))return
  if(event.key===null)volatilePreferences.clear();else volatilePreferences.delete(event.key.slice('taoagent.'.length))
  newlineMode=preference('newline')==='true';applyAppearance();applyShellPreferences();syncAppearance();renderEnterMode()
}
window.addEventListener('storage',synchronizePreferences)
document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey)return
  if((event.key===','||event.code==='Comma')){event.preventDefault();if(document.querySelector('dialog[open]')||$('#workspace-inspector').getAttribute('aria-modal')==='true')return;if(event.shiftKey)openConversationControl();else settings().catch(error=>toast(error.message));return}
  if(document.querySelector('dialog[open]')||$('#workspace-inspector').getAttribute('aria-modal')==='true')return
  if(event.key.toLowerCase()==='b'){event.preventDefault();toggleNavigation()}
  if(event.key.toLowerCase()==='i'){event.preventDefault();$('#prompt').focus()}
  if(event.key==='Enter'&&document.activeElement!==$('#prompt')){event.preventDefault();$('#composer').requestSubmit()}
})

for(const id of ['agent-dialog','group-dialog']) $('#'+id).addEventListener('close',()=>{if($('#settings').open&&!$('#settings').dataset.loading)renderSettingsManagement()})

async function refreshImprovement(){
  const key=current?.id;if(!key)return
  const data=await api('/api/chats/'+key+'/improvement');if(current?.id!==key)return
  let catalog=$('#improvement-catalog')
  if(!catalog){catalog=document.createElement('details');catalog.id='improvement-catalog';catalog.className='help';const title=document.createElement('summary');title.textContent='高级：可修改文件与验收测试';catalog.append(title,document.createElement('p'));$('#improvement-form').before(catalog)}
  catalog.querySelector('p').textContent='可修改文件：'+data.scope.join(', ')+'。可选验收测试：'+data.acceptanceTests.join(', ')
  const session=data.session
  $('#improvement-status').textContent=session?JSON.stringify({status:session.status,objective:session.objective,iterations:session.iterations,modelCalls:session.modelCalls,toolCalls:session.toolCalls,reservedTokens:session.reservedTokens,expiresAt:new Date(session.expiresAt).toLocaleString()},null,2):'尚未授权自动改进。'
  const box=$('#improvement-history');box.replaceChildren()
  for(const record of data.history){const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('pre');summary.textContent=record.status+' · '+record.reason;body.textContent=JSON.stringify(record,null,2);details.append(summary,body);box.append(details)
    if(record.status==='applied'){const button=document.createElement('button');button.textContent='回滚此版本';button.onclick=handle(async()=>{await api('/api/chats/'+key+'/improvement','POST',{operation:'rollback',runId:record.runId});await refreshImprovement()});details.append(button)}
    if(['validating','applying','recovering'].includes(record.status)){const button=document.createElement('button');button.textContent='恢复此中断版本';button.onclick=handle(async()=>{await api('/api/chats/'+key+'/improvement','POST',{operation:'recover',runId:record.runId});await refreshImprovement()});details.append(button)}
  }
}
$('#improvement-panel').ontoggle=()=>{if($('#improvement-panel').open)refreshImprovement().catch(error=>toast(error.message))}
$('#improvement-refresh').onclick=handle(refreshImprovement)
$('#improvement-stop').onclick=handle(async()=>{if(current){await api('/api/chats/'+current.id+'/improvement','POST',{operation:'stop'});await refreshImprovement()}})
$('#improvement-form').onsubmit=handle(async()=>{
  if(!current)return
  const form=$('#improvement-form'),values=new FormData(form),body=Object.fromEntries(values)
  body.acceptanceTests=String(values.get('acceptanceTests')).split(',').map(name=>name.trim()).filter(Boolean)
  body.scope=String(values.get('scope')).split(',').map(name=>name.trim()).filter(Boolean)
  for(const name of ['maxIterations','maxModelCalls','maxToolCalls','maxTokens','maxMinutes'])body[name]=Number(values.get(name))
  await api('/api/chats/'+current.id+'/improvement','POST',body);await refreshImprovement();toast('已授权。发送包含目标的消息开始；停止按钮可撤销授权。')
})

// Workbench: shared methods, scheduled work, and decisions link back to the original conversation.
let workSnapshot = null
const workSkillForm = $('#skill-form'), workRoutineForm = $('#routine-form')
function workTab(name) {
  for (const button of document.querySelectorAll('[data-work-tab]')) {
    const selected = button.dataset.workTab === name
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1
    $('#work-panel-' + button.dataset.workTab).hidden = !selected
  }
}
for (const button of document.querySelectorAll('[data-work-tab]')) {
  button.onclick = () => workTab(button.dataset.workTab)
  button.onkeydown = event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...document.querySelectorAll('[data-work-tab]')], index = buttons.indexOf(button)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    workTab(buttons[next].dataset.workTab); buttons[next].focus()
  }
}
async function replaceWorkEditor(form) {
  if (form.dataset.clean === dialogSnapshot(form)) return true
  return confirmAction('这份编辑尚未保存，确定切换？')
}
function fillSkill(skill) {
  workSkillForm.reset()
  for (const name of ['id','name','description','instructions']) workSkillForm.elements.namedItem(name).value = skill?.[name] || ''
  workSkillForm.elements.namedItem('expected').value = skill?.revision || ''
  workSkillForm.elements.namedItem('enabled').checked = skill?.enabled !== false
  $('#skill-use').disabled = !skill?.enabled || !current
  markFormClean(workSkillForm)
}
function fillRoutine(routine) {
  workRoutineForm.reset()
  const select = workRoutineForm.elements.namedItem('sessionId')
  select.replaceChildren(new Option('选择已有对话…', ''))
  for (const session of workSnapshot.sessions) select.add(new Option(session.title, session.id))
  for (const name of ['id','name','instruction']) workRoutineForm.elements.namedItem(name).value = routine?.[name] || ''
  workRoutineForm.elements.namedItem('expected').value = routine?.revision || ''
  select.value = routine?.sessionId || current?.id || ''
  workRoutineForm.elements.namedItem('intervalMinutes').value = routine?.intervalMinutes || 60
  workRoutineForm.elements.namedItem('enabled').checked = !!routine?.enabled
  $('#routine-try').disabled = !routine
  markFormClean(workRoutineForm)
}
function workCard(title, detail, onClick) {
  const card = document.createElement(onClick ? 'button' : 'div'); card.className = 'work-card'
  if (onClick) { card.type = 'button'; card.onclick = handle(onClick) }
  const heading = document.createElement('strong'), caption = document.createElement('span')
  heading.textContent = title; caption.textContent = detail; card.append(heading, caption)
  return card
}
function workEmpty(box, message) { const note = document.createElement('p'); note.className = 'work-empty'; note.textContent = message; box.append(note) }
function syncWorkActions() {
  $('#skill-use').disabled = !current || !workSnapshot?.skills.some(skill => skill.enabled && skill.id === workSkillForm.elements.namedItem('id').value)
  $('#routine-try').disabled = !workSnapshot?.routines.some(routine => routine.id === workRoutineForm.elements.namedItem('id').value)
}
async function workOpenSession(sessionId, approval = false) {
  const session = workSnapshot.sessions.find(item => item.id === sessionId)
  if (!session) throw new Error('原对话已不存在，请刷新工作台')
  await closeDialog($('#work-hub')); if ($('#work-hub').open) return false
  await openTarget(session.kind === 'group' ? {type:'group',id:session.id} : {type:'agent',id:session.agentId})
  if (approval) await openConversationControl('#work-panel')
  return true
}
function renderWork() {
  const snapshot = workSnapshot
  $('#work-summary').textContent = `${snapshot.inbox.length} 项待办 · ${snapshot.skills.filter(item=>item.enabled).length} 个可用技能 · ${snapshot.routines.filter(item=>item.enabled).length} 个已启用例行任务`
  const inbox = $('#work-inbox'); inbox.replaceChildren()
  for (const item of snapshot.inbox) inbox.append(workCard(`${({approval:'待审批',task:'任务',resume:'待继续'})[item.kind]} · ${item.label}`, item.title, () => workOpenSession(item.sessionId, item.kind === 'approval' || item.kind === 'resume')))
  if (!snapshot.inbox.length) workEmpty(inbox, '暂时没有需要处理的事项。可以继续对话，或把常用流程保存为技能。')
  const skillBox = $('#work-skills'); skillBox.replaceChildren()
  for (const skill of snapshot.skills) skillBox.append(workCard(skill.name, `${skill.enabled ? '已启用' : '已停用'} · ${skill.description}`, async () => { if (await replaceWorkEditor(workSkillForm)) fillSkill(skill) }))
  if (!snapshot.skills.length) workEmpty(skillBox, '还没有共享技能。从一次做成功的工作开始，保存可复用的方法。')
  const routineBox = $('#work-routines'); routineBox.replaceChildren()
  for (const routine of snapshot.routines) routineBox.append(workCard(routine.name, `${routine.enabled ? '下次 '+new Date(routine.nextAt).toLocaleString() : '已暂停'} · 每 ${routine.intervalMinutes} 分钟`, async () => { if (await replaceWorkEditor(workRoutineForm)) fillRoutine(routine) }))
  if (!snapshot.routines.length) workEmpty(routineBox, '创建任务、选择对话，并明确启用后才会定时调用模型。')
  const runs = $('#work-runs'); runs.replaceChildren()
  for (const run of snapshot.runs) {
    const routine = snapshot.routines.find(item => item.id === run.routineId)
    runs.append(workCard(`${({running:'正在运行',complete:'已完成',failed:'失败，已暂停',interrupted:'已中断，已暂停'})[run.status]} · ${routine?.name || '例行任务'}`, `${new Date(run.at).toLocaleString()}${run.error ? ' · '+run.error : ''}`, () => workOpenSession(run.sessionId)))
  }
  if (!snapshot.runs.length) workEmpty(runs, '尚无运行记录。每次执行都保留在原对话和本机工作库中。')
}
async function openWork(tab = 'inbox') {
  const dialog = $('#work-hub')
  if (dialog.open && [...dialog.querySelectorAll('form')].some(form => form.dataset.clean !== dialogSnapshot(form)) && !await confirmAction('刷新会重新载入工作库，确定放弃未保存的编辑？')) return
  await loadDialog(dialog, async () => {
    const snapshot = await api('/api/work')
    return () => { workSnapshot = snapshot; fillSkill(null); fillRoutine(null); renderWork(); workTab(tab) }
  })
}
$('#work-hub-open').onclick = handle(() => openWork())
$('#work-refresh').onclick = handle(() => openWork(document.querySelector('[data-work-tab][aria-selected="true"]').dataset.workTab))
$('#skill-new').onclick = handle(async () => { if (await replaceWorkEditor(workSkillForm)) { fillSkill(null); workSkillForm.elements.namedItem('name').focus() } })
$('#routine-new').onclick = handle(async () => { if (await replaceWorkEditor(workRoutineForm)) { fillRoutine(null); workRoutineForm.elements.namedItem('name').focus() } })
workSkillForm.onsubmit = handle(async () => {
  const body = Object.fromEntries(new FormData(workSkillForm)); body.enabled = workSkillForm.elements.namedItem('enabled').checked
  const saved = await api('/api/skills', 'PUT', body)
  workSnapshot.skills = [...workSnapshot.skills.filter(item => item.id !== saved.id), saved]
  fillSkill(saved); renderWork(); toast('技能已保存，成员可按需检索')
})
workRoutineForm.onsubmit = handle(async () => {
  const body = Object.fromEntries(new FormData(workRoutineForm)); body.enabled = workRoutineForm.elements.namedItem('enabled').checked; body.intervalMinutes = Number(body.intervalMinutes)
  const saved = await api('/api/routines', 'PUT', body)
  workSnapshot.routines = [...workSnapshot.routines.filter(item => item.id !== saved.id), saved]
  fillRoutine(saved); renderWork(); toast(saved.enabled ? '例行任务已启用，到期后执行' : '例行任务已保存并暂停')
})
function insertWorkPrompt(text) {
  const prompt = $('#prompt'); prompt.value += (prompt.value ? '\n\n' : '') + text
  prompt.dispatchEvent(new Event('input', {bubbles:true})); prompt.focus()
}
$('#skill-use').onclick = handle(async () => {
  const skill = workSnapshot.skills.find(item => item.id === workSkillForm.elements.namedItem('id').value)
  if (!skill?.enabled || !current) return
  await closeDialog($('#work-hub')); if ($('#work-hub').open) return
  insertWorkPrompt(`请使用技能「${skill.name}」（ID: ${skill.id}）处理下面的工作：\n`)
})
$('#routine-try').onclick = handle(async () => {
  const routine = workSnapshot.routines.find(item => item.id === workRoutineForm.elements.namedItem('id').value)
  if (routine && await workOpenSession(routine.sessionId)) insertWorkPrompt(`试运行例行任务「${routine.name}」：\n${routine.instruction}`)
})

async function deleteGroup(group) {
  const snapshot=await api('/api/groups/'+group.id)
  if(snapshot.archivedAt){await refresh();toast('此群聊已删除');return}
  if(!await confirmAction(`删除群聊「${snapshot.title}」？正在进行的讨论会停止，关联例行任务暂停。聊天、记忆和文件保留，可在设置中恢复。`,'删除群聊','保留群聊'))return
  await api('/api/groups/'+group.id,'DELETE',{expected:snapshot.groupVersion,reason:'用户在界面确认删除群聊'})
  await refresh()
  if($('#settings').open)renderSettingsManagement()
  toast('群聊已删除，历史保留，可在设置中恢复')
}
$('#free-chat-fill').onclick=()=>{if(current?.kind==='group')insertWorkPrompt('没有固定主题，我们随便聊聊吧。从一个具体观察或有趣的问题开始，顺着彼此的想法自然交流，不必急着形成结论。')}
$('#brainstorm-fill').onclick=()=>{if(current?.kind==='group')insertWorkPrompt('来一场没有预设主题的头脑风暴吧。先抛出具体观察、意外联想或大胆假设，沿着别人的想法组合、转向或提出另一种可能；无需先问我主题，也不必马上总结成任务。')}

for(const id of ['sidebar-kind','sidebar-status'])$('#'+id).onchange=()=>{$('#contacts').scrollTop=0;renderContacts()}
$('#sidebar-search-clear').onclick=()=>{$('#search').value='';$('#contacts').scrollTop=0;renderContacts();$('#search').focus()}
$('#sidebar-locate').onclick=locateSidebarCurrent
for(const button of document.querySelectorAll('[data-create-kind]'))button.onclick=handle(()=>editGroup(true,button.dataset.createKind))
$('#sidebar').addEventListener('click',event=>{const action=event.target.closest('.sidebar-menu button,.contact-section-add');if(!action)return;for(const id of ['sidebar-create','sidebar-tools','roster-filter'])$('#'+id).open=false;if(mobileLayout.matches)sidebar(false)})
for(const id of ['sidebar-create','sidebar-tools','roster-filter'])$('#'+id).addEventListener('toggle',()=>{if($('#'+id).open)for(const other of ['sidebar-create','sidebar-tools','roster-filter'])if(other!==id)$('#'+other).open=false})
document.addEventListener('pointerdown',event=>{for(const id of ['sidebar-create','sidebar-tools','roster-filter'])if(!$('#'+id).contains(event.target))$('#'+id).open=false})
$('#contacts').addEventListener('keydown',event=>{if(!event.target.closest('.contact-row')||!['ArrowDown','ArrowUp','Home','End'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;const items=visibleRosterContacts(),current=event.target.closest('.contact-row')?.querySelector('.contact'),index=items.indexOf(current);if(index<0)return;event.preventDefault();const next=items[event.key==='Home'?0:event.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,index+(event.key==='ArrowDown'?1:-1)))];next?.focus();next?.scrollIntoView({block:'nearest'})})
const pinControl=document.createElement('button');pinControl.type='button';pinControl.id='conversation-pin';pinControl.textContent='置顶 / 取消置顶';$('#conversation-settings .management-actions').append(pinControl)
pinControl.onclick=handle(async()=>{if(!target)return;const selected={...target},pinned=isPinned(selected.type,selected.id);state.navigation=await api('/api/navigation','POST',{targetKey:targetKey(selected),pinned:!pinned,expectedPinned:pinned});renderContacts();toast(pinned?'已取消置顶':'已置顶，排列在同类对话前面')})
const diagnosticsControl=document.createElement('button');diagnosticsControl.type='button';diagnosticsControl.id='system-open';diagnosticsControl.textContent='系统状态与诊断';$('#workspace-overview').before(diagnosticsControl)
let diagnosticSnapshot=null
async function loadDiagnostics(){
  await loadDialog($('#system-diagnostics'),async()=>{
    const value=await api('/api/diagnostics')
    return ()=>{diagnosticSnapshot=value;const box=$('#system-metrics');box.replaceChildren();const list=document.createElement('dl');for(const [name,detail] of [['版本',value.version],['运行环境','Node '+value.node+' · '+value.platform],['本次运行',Math.floor(value.uptimeSeconds/60)+' 分钟'],['进程内存',Math.round(value.memory.rssBytes/1024/1024)+' MB'],['对话 / 成员',value.counts.conversations+' / '+value.counts.agents],['运行中的对话',value.counts.running],['数据存储',value.storage],['访问保护','本机访问 · 同源校验 · 操作审批']]){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=name;description.textContent=detail;list.append(term,description)}box.append(list)}
  })
}
diagnosticsControl.onclick=handle(()=>loadDiagnostics());$('#system-refresh').onclick=handle(()=>loadDiagnostics())
$('#system-diagnostics-close').onclick=()=>$('#system-diagnostics').close()
$('#system-download').onclick=()=>{if(!diagnosticSnapshot)return;const url=URL.createObjectURL(new Blob([JSON.stringify(diagnosticSnapshot,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='taoagent-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}

let historySearchController=null, historySearchVersion=0, historyCursor=null, historyCriteria=null, historyCount=0, historyPreviewVersion=0
function openHistorySearch(){const dialog=$('#global-history-search');if(!dialog.open)dialog.showModal();$('#history-query').focus()}
$('#history-search-open').onclick=openHistorySearch
$('#history-search-close').onclick=()=>$('#global-history-search').close()
$('#global-history-search').addEventListener('close',()=>{historySearchController?.abort();historySearchVersion++;historyPreviewVersion++})
$('#history-preview-close').onclick=()=>{historyPreviewVersion++;$('#history-preview').hidden=true}
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='f'&&!document.querySelector('dialog[open]')){event.preventDefault();openHistorySearch()}})
async function searchHistory(more=false){
  const scope=$('#history-scope').value==='current'?current?.id:''
  if($('#history-scope').value==='current'&&!scope){toast('请先打开一个对话');return}
  const criteria={q:$('#history-query').value.trim(),...(scope?{session:scope}:{})}
  if(!criteria.q)return
  if(more&&(!historyCursor||JSON.stringify(criteria)!==JSON.stringify(historyCriteria)))return
  historySearchController?.abort();const controller=new AbortController();historySearchController=controller;const version=++historySearchVersion
  const params=new URLSearchParams(criteria);if(more)params.set('cursor',historyCursor)
  if(!more){historyCriteria=criteria;historyCursor=null;historyCount=0;$('#global-history-results').replaceChildren();$('#history-preview').hidden=true;historyPreviewVersion++}
  $('#history-more').hidden=true;$('#history-search-status').textContent='正在搜索本机历史…';$('#global-history-results').setAttribute('aria-busy','true')
  try{
    const response=await fetch('/api/search?'+params,{signal:controller.signal});const result=await readApiResponse(response)
    if(version!==historySearchVersion||!$('#global-history-search').open)return
    for(const hit of result.hits){const card=document.createElement('button');card.type='button';card.className='history-result';const title=document.createElement('strong'),meta=document.createElement('small'),excerpt=document.createElement('p');title.textContent=hit.title;meta.textContent=hit.author+' · '+new Date(hit.at).toLocaleString()+(hit.status==='interrupted'?' · 已中断':'');highlightSearch(excerpt,hit.excerpt,criteria.q);card.append(title,meta,excerpt);card.onclick=handle(()=>previewHistoryMessage(hit));$('#global-history-results').append(card)}
    historyCount+=result.hits.length;historyCursor=result.cursor;$('#history-more').hidden=!result.hasMore;$('#history-search-status').textContent=historyCount?`已显示 ${historyCount} 条匹配消息${result.hasMore?'，可继续加载':'，已到末尾'}`:'没有匹配消息，换个关键词或搜索范围试试。'
  }catch(error){if(version===historySearchVersion&&error.name!=='AbortError'){$('#history-search-status').textContent=error.message||'搜索失败，请重试';$('#history-more').hidden=!(more&&historyCursor)}}
  finally{if(version===historySearchVersion)$('#global-history-results').removeAttribute('aria-busy')}
}
function highlightSearch(node,text,query){
  const terms=[...new Set(query.toLocaleLowerCase().split(/\s+/u).filter(Boolean))].sort((a,b)=>b.length-a.length),lower=text.toLocaleLowerCase();let start=0,index=0
  while(index<text.length){const term=terms.find(term=>lower.startsWith(term,index));if(!term){index++;continue}node.append(document.createTextNode(text.slice(start,index)));const mark=document.createElement('mark');mark.textContent=text.slice(index,index+term.length);node.append(mark);index+=term.length;start=index}node.append(document.createTextNode(text.slice(start)))
}
async function previewHistoryMessage(hit){
  const version=++historyPreviewVersion;$('#history-preview').hidden=false;$('#history-message').textContent='载入原文…';$('#history-origin').onclick=null
  try{const value=await api('/api/search/message?'+new URLSearchParams({session:hit.sessionId,message:hit.messageId}));if(version!==historyPreviewVersion||!$('#global-history-search').open)return;$('#history-message').textContent=value.content;$('#history-origin').onclick=handle(async()=>{$('#global-history-search').close();await openTarget(hit.target);toast('已打开原对话；历史命中的完整原文可在搜索中查看')});$('#history-preview').scrollIntoView({block:'nearest'})}
  catch(error){if(version===historyPreviewVersion){$('#history-message').textContent=error.message;$('#history-origin').onclick=null}}
}
$('#history-search-form').onsubmit=event=>{event.preventDefault();searchHistory()}
$('#history-more').onclick=()=>searchHistory(true)
for(const control of [$('#history-query'),$('#history-scope')])control.addEventListener('input',()=>{historySearchController?.abort();historySearchVersion++;historyPreviewVersion++;historyCursor=null;$('#history-more').hidden=true;$('#global-history-results').removeAttribute('aria-busy');$('#history-search-status').textContent='按 Enter 或点击搜索以更新结果。'})

const queueRequests=new Map()
async function enqueueCurrentMessage(){
  if(!current||!target||submittingThreads.has(current.id))return
  const threadId=current.id,selected={...target},raw=$('#prompt').value,content=raw.trim(),recipient=current.kind==='group'?$('#recipients').value:'',modelId=current.kind==='group'?$('#model').value:''
  if(!content)return
  const signature=JSON.stringify([threadId,raw,modelId,recipient]);if(!queueRequests.has(signature))queueRequests.set(signature,crypto.randomUUID())
  submittingThreads.add(threadId);updateSendControl()
  try{
    await api(`/api/chats/${threadId}/queue`,'POST',{content,modelId,requestId:queueRequests.get(signature),...(recipient?{memberIds:[recipient]}:{})})
    queueRequests.delete(signature);await clearSubmittedDraft(selected,raw).catch(()=>{});toast('已保存到本机队列；轮到它时执行，失败或停止会暂停后续消息');await refresh()
    if($('#message-queue').open&&current?.id===threadId)await refreshQueue()
  }finally{submittingThreads.delete(threadId);updateSendControl()}
}
$('#busy-send-mode').onchange=()=>updateSendControl()
let queueView=null,queueLoading=false,queueEditing=false,queueLoadVersion=0
const queueLabels={queued:'等待执行',running:'正在运行',complete:'已完成',failed:'执行失败',interrupted:'已中断',cancelled:'已取消'}
function renderQueue(snapshot,key){
  queueView={...snapshot,sessionId:key};const box=$('#queue-items');box.replaceChildren();$('#queue-summary').textContent=(snapshot.paused?'已暂停':'按顺序执行')+' · '+snapshot.items.filter(item=>item.status==='queued').length+' 条等待'+(snapshot.reason?' · '+snapshot.reason:'');$('#queue-pause').textContent=snapshot.paused?'恢复队列':'暂停后续消息'
  for(const item of snapshot.items){
    const row=document.createElement('article');row.className='queue-item';row.dataset.status=item.status
    const title=document.createElement('strong'),text=document.createElement('div'),meta=document.createElement('small'),buttons=document.createElement('div');buttons.className='queue-actions';title.textContent=queueLabels[item.status];meta.textContent=new Date(item.createdAt).toLocaleString();text.className='queue-content';text.textContent=item.content;row.append(title,meta,text)
    if(item.error){const error=document.createElement('p');error.className='help';error.textContent=item.error;row.append(error)}
    if(item.status==='queued'){
      const cancel=document.createElement('button');cancel.type='button';cancel.textContent='取消这条';cancel.onclick=handle(async()=>{await api(`/api/chats/${key}/queue`,'PATCH',{operation:'cancel',itemId:item.id,expected:snapshot.revision});await refreshQueue()});buttons.append(cancel)
      if(snapshot.paused){const edit=document.createElement('button');edit.type='button';edit.textContent='编辑';edit.onclick=()=>{
        if(queueEditing){toast('请先保存或取消当前编辑');return}queueEditing=true
        const form=document.createElement('form'),input=document.createElement('textarea'),save=document.createElement('button'),discard=document.createElement('button');input.value=item.content;input.rows=6;input.maxLength=200000;input.required=true;input.setAttribute('aria-label','编辑排队消息');save.type='submit';save.textContent='保存修改';discard.type='button';discard.textContent='取消编辑';form.append(input,save,discard);row.append(form);input.focus()
        discard.onclick=()=>{queueEditing=false;form.remove()};form.onsubmit=handle(async event=>{event.preventDefault();await api(`/api/chats/${key}/queue`,'PATCH',{operation:'edit',itemId:item.id,content:input.value,expected:snapshot.revision});queueEditing=false;await refreshQueue()})
      };buttons.append(edit)}
    }
    if(['failed','interrupted','cancelled'].includes(item.status)){const copy=document.createElement('button');copy.type='button';copy.textContent='复制为草稿';copy.onclick=()=>{if(current?.id!==key){toast('请先回到原对话');return}insertWorkPrompt(item.content);$('#message-queue').close();toast('已复制为草稿；核对历史与回执后再决定是否发送')};buttons.append(copy)}
    row.append(buttons);box.append(row)
  }
  if(!snapshot.items.length){const empty=document.createElement('p');empty.className='work-empty';empty.textContent='队列还是空的。可以把当前草稿加入队列，或在忙碌时选择“排队”。';box.append(empty)}
  $('#queue-history-note').textContent='显示全部等待/运行消息及最近 30 条历史；完整记录与编辑旧版保留在本机。';markDialogClean($('#message-queue'))
}
async function refreshQueue(){
  if(!current||queueLoading||queueEditing)return
  const key=current.id,version=++queueLoadVersion;queueLoading=true
  try{const value=await api(`/api/chats/${key}/queue`);if(version!==queueLoadVersion||current?.id!==key||!$('#message-queue').open||queueView?.sessionId===key&&queueView.revision===value.revision)return;renderQueue(value,key)}finally{queueLoading=false}
}
$('#queue-open').onclick=handle(async()=>{if(!current)return;$('#message-queue').showModal();$('#queue-items').replaceChildren();$('#queue-summary').textContent='正在载入…';await refreshQueue()})
$('#queue-refresh').onclick=handle(async()=>{if(queueEditing){toast('当前编辑仍保留，请先保存或取消编辑');return}await refreshQueue()})
$('#queue-close').onclick=()=>closeDialog($('#message-queue'))
$('#message-queue').addEventListener('close',()=>{queueLoadVersion++;queueEditing=false;queueView=null})
$('#queue-pause').onclick=handle(async()=>{if(!queueView||queueEditing)return;await api(`/api/chats/${queueView.sessionId}/queue`,'PATCH',{operation:queueView.paused?'resume':'pause',expected:queueView.revision});await refreshQueue()})
$('#queue-add-draft').onclick=handle(()=>enqueueCurrentMessage())
setInterval(()=>{if(!document.hidden&&$('#message-queue').open)refreshQueue().catch(error=>{$('#queue-summary').textContent=error.message})},2000)

let queueEvents=null,queueEventsThread=''
function watchQueueEvents(key){
  if(queueEvents&&queueEventsThread===key)return
  queueEvents?.close();queueEventsThread=key
  if(typeof EventSource==='undefined')return
  const source=new EventSource(`/api/chats/${key}/events`);queueEvents=source
  source.onopen=()=>{if(current?.id===key&&!pending.has(key))loadCurrent(false).catch(()=>{})}
  source.onmessage=event=>{
    if(queueEvents!==source||current?.id!==key||pending.has(key))return
    let item;try{item=JSON.parse(event.data)}catch{return}
    if(item.conversationId!==key)return
    if(['accepted','speaker','turn'].includes(item.type)&&!state.running.includes(key)){state.running.push(key);controls()}
    if(item.type==='accepted'&&item.message){$('#welcome').hidden=true;if(![...$('#messages').querySelectorAll('.message')].some(node=>node.dataset.messageId===item.message.id))message(item.message);scrollIfNear()}
    if(item.type==='turn'){current.turns||=[];const index=current.turns.findIndex(turn=>turn.id===item.turn.id);if(index<0)current.turns.push(item.turn);else current.turns[index]=item.turn;renderTurn()}
    if(['speaker','delta','speaker_done'].includes(item.type)){const entry=updateLiveStream(key,item);if(entry){if(item.type==='delta'){if(!entry.frame)entry.frame=requestAnimationFrame(()=>{entry.frame=0;if(!entry.done)paintStream(key,entry)})}else paintStream(key,entry)}}
    if(['approval','tasks','tool'].includes(item.type))refreshWork().catch(()=>{})
    if(['done','queue_finished','error'].includes(item.type)){refresh().then(()=>current?.id===key&&!pending.has(key)?loadCurrent(false):undefined).catch(()=>{});if($('#message-queue').open)refreshQueue().catch(()=>{})}
  }
}
window.addEventListener('pagehide',()=>{queueEvents?.close();queueEvents=null;queueEventsThread=''})
window.addEventListener('pageshow',()=>{if(current)watchQueueEvents(current.id)})

$('#space-town').onclick=()=>current?.kind==='group'&&componentType(current)==='task'?openConversationControl('#work-panel').catch(error=>toast(error.message)):window.dispatchEvent(new CustomEvent('tao-town-open',{detail:{id:current?.kind==='group'?current.id:undefined,tab:'overview'}}))
$('#space-chat').onclick=()=>$('#prompt').focus()
$('#space-memory-open').onclick=()=>window.dispatchEvent(new CustomEvent('tao-town-open',{detail:{id:current?.id,tab:'memory'}}))
$('#town-open').onclick=()=>window.dispatchEvent(new CustomEvent('tao-town-open',{detail:{id:current?.kind==='group'?current.id:undefined}}))


function syncComponentMode(){
  const kind=groupForm.elements.namedItem('componentKind').value
  const task=kind==='task',chat=kind==='chat';groupForm.dataset.component=kind
  for(const name of ['discussionMode','replyMode'])groupForm.elements.namedItem(name).closest('label').hidden=name==='replyMode'||task||chat
  groupForm.elements.namedItem('coordinatorId').closest('label').hidden=chat
  for(const note of groupForm.querySelectorAll('p.help'))if(note.id!=='component-mode-help')note.hidden=task||chat
  groupForm.elements.namedItem('replyMode').value=task?'coordinated':chat?'round':'collective'
  const mode=groupForm.elements.namedItem('discussionMode');mode.disabled=task||chat
  if(mode.disabled)mode.value='directed';else if(mode.value==='directed')mode.value='open'
  $('#component-mode-help').textContent=chat?'只进行文字交流。默认每位成员各回复一次，也可 @ 指定；不执行工具、不派工、不自动旁听接话。':task?'负责人接收目标，主动协调成员、调用工具并交付；外部操作需批准。':'成员按内容自主接话，可质疑、组合与修正想法；共享认识与记忆，受每轮预算约束。'
}
groupForm.elements.namedItem('componentKind').onchange=syncComponentMode
async function openCityChat(){
  const room=await api('/api/city/room','POST',{})
  if($('#components-dialog').open){await closeDialog($('#components-dialog'));if($('#components-dialog').open)return}
  await refresh();await openTarget({type:'group',id:room.id})
}
$('#city-chat-open').onclick=handle(openCityChat)
let cityConfigRevision=''
async function openComponents(){
  if(mobileLayout.matches)sidebar(false)
  window.dispatchEvent(new Event('tao-components-open'))
  const dialog=$('#components-dialog');if(!dialog.open)dialog.showModal()
  await refresh()
  const city=await api('/api/city'),form=$('#city-config-form');cityConfigRevision=city.config.revision
  for(const key of ['name','description'])form.elements.namedItem(key).value=city.config[key]
  options(form.elements.namedItem('leadAgentId'),state.agents,city.config.leadAgentId)
  const cards=$('#component-cards');cards.replaceChildren()
  const definitions=[['bot','独立 Bot','独立身份、模型、长期记忆与一对一交流。',state.agents.length],['emergent','涌现群聊','从一个想法开始，让成员自然接话与形成共同认识。'],['chat','纯聊天','专注日常交流，指定成员或让大家各说一句。'],['task','任务组','由负责人协调 Bot，推进任务、审批和成果交付。'],['city','City','观看所有 Bot 的真实活动，进入公共文字聊天室。',city.memberIds.length]]
  for(const [kind,title,description,total] of definitions){
    const card=document.createElement('article');card.className='component-card';card.dataset.kind=kind
    const heading=document.createElement('h3'),note=document.createElement('p'),count=document.createElement('small'),actions=document.createElement('div')
    heading.textContent=title;note.textContent=description;count.textContent=(total??state.groups.filter(group=>componentType(group)===kind).length)+(kind==='bot'?' 位 Bot':kind==='city'?' 位居民':' 个组件')
    const create=document.createElement('button');create.type='button';create.textContent=kind==='city'?'观看城市':'＋ 创建'+title
    create.onclick=handle(async()=>{await closeDialog(dialog);if(dialog.open)return;if(kind==='city')$('#civ-open').click();else if(kind==='bot')return editAgent();else editGroup(true,kind)})
    actions.append(create)
    if(kind==='city'){const chat=document.createElement('button');chat.type='button';chat.textContent='文字聊天室';chat.onclick=handle(openCityChat);actions.append(chat)}
    const list=document.createElement('div');list.className='component-existing'
    const entries=kind==='bot'?state.agents:kind==='city'?[]:state.groups.filter(group=>componentType(group)===kind)
    for(const entry of entries){const link=document.createElement('button');link.type='button';link.textContent=entry.name||entry.title;link.onclick=handle(async()=>{await closeDialog(dialog);if(!dialog.open)await openTarget({type:kind==='bot'?'agent':'group',id:entry.id})});list.append(link)}
    card.append(count,heading,note,actions,list);cards.append(card)
  }
  markDialogClean(dialog);syncSidebarSurface()
}
$('#components-open').onclick=handle(openComponents)
$('#city-config-form').onsubmit=handle(async event=>{event.preventDefault();const values=new FormData(event.currentTarget);const result=await api('/api/city','PUT',{expected:cityConfigRevision,...Object.fromEntries(values)});cityConfigRevision=result.revision;markDialogClean($('#components-dialog'));toast('City 设置已保存');window.dispatchEvent(new Event('tao-city-updated'))})
$('#component-improvement-open').onclick=handle(async()=>{await closeDialog($('#components-dialog'));if($('#components-dialog').open)return;if(current?.componentKind==='chat')await openTarget({type:'agent',id:'main'});await openConversationControl();$('#improvement-panel').open=true;$('#improvement-panel').scrollIntoView({block:'nearest'})})

$('#component-city-preset').onclick=handle(async()=>{
  await closeDialog($('#components-dialog'));if($('#components-dialog').open)return;if(current?.componentKind==='chat')await openTarget({type:'agent',id:'main'});await openConversationControl();$('#improvement-panel').open=true
  const form=$('#improvement-form');form.elements.namedItem('scope').value='public/city/city.js,public/city/layout.js,public/city/characters.js,public/civilization.js,public/civilization.css,public/components.css,civilization.ts'
  form.elements.namedItem('acceptanceTests').value='tests/components.test.ts,tests/empire-city.test.ts,tests/civilization.test.ts'
  form.elements.namedItem('objective').value='根据我接下来提出的目标，改进 City 的场景和交互'
  form.elements.namedItem('acceptanceCriteria').value='保留所有 Bot、聊天历史与真实活动来源；城市渲染和组件回归测试通过'
  $('#improvement-panel').scrollIntoView({block:'start'});toast('已准备 City 范围，请补充目标并点击授权')
})

$('#component-models-open').onclick=handle(async()=>{await closeDialog($('#components-dialog'));if(!$('#components-dialog').open)settings('models')})

window.addEventListener('tao-civ-open',()=>{if(mobileLayout.matches){sidebar(false);$('main').inert=true}})
window.addEventListener('tao-town-open',()=>{if(mobileLayout.matches){sidebar(false);$('main').inert=true}})

function syncSidebarSurface(){
  const city=document.body.classList.contains('civ-active'),town=document.body.classList.contains('town-active')
  for(const [node,on] of [[$('#roster-home'),!city&&!town&&!$('#components-dialog').open],[$('#civ-open'),city],[$('#town-open'),town],[$('#components-open'),$('#components-dialog').open]]){if(on)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current')}
  renderContacts()
}
new MutationObserver(syncSidebarSurface).observe(document.body,{attributes:true,attributeFilter:['class']})
$('#components-dialog').addEventListener('close',syncSidebarSurface)
syncSidebarSurface()


// Workspace layout is stored locally. Dragging never modifies Bot or chat records.
let preferredRosterWidth=Number(preference('rosterWidth'))||ROSTER_DEFAULT
function applyRosterWidth(value=preferredRosterWidth,persist=false){
  const docked=!$('#workspace-inspector').hidden&&innerWidth>=1200
  const width=Math.max(innerWidth<=760?240:innerWidth<1100?280:300,rosterWidth(value,innerWidth-(docked?250:0)))
  document.documentElement.style.setProperty('--roster-width',width+'px')
  $('#roster-resize').setAttribute('aria-valuenow',String(width));$('#roster-resize').setAttribute('aria-valuemax',String(rosterWidth(99999,innerWidth-(docked?250:0))))
  $('#roster-resize').setAttribute('aria-valuemin',String(innerWidth<1100?280:300))
  if(persist){preferredRosterWidth=width;preference('rosterWidth',String(width))}
  window.dispatchEvent(new Event('tao-layout-changed'))
  return width
}
applyRosterWidth()
let rosterDrag=null
$('#roster-resize').onpointerdown=event=>{
  if(event.button!==0||mobileLayout.matches)return
  event.preventDefault();rosterDrag={x:event.clientX,width:document.querySelector('.roster-pane').getBoundingClientRect().width};event.currentTarget.setPointerCapture(event.pointerId);document.body.classList.add('roster-resizing')
}
$('#roster-resize').onpointermove=event=>{if(rosterDrag)applyRosterWidth(rosterDrag.width+event.clientX-rosterDrag.x)}
function finishRosterResize(){if(!rosterDrag)return;rosterDrag=null;document.body.classList.remove('roster-resizing');applyRosterWidth(parseFloat(document.documentElement.style.getPropertyValue('--roster-width')),true)}
$('#roster-resize').onpointerup=finishRosterResize
$('#roster-resize').onpointercancel=finishRosterResize
$('#roster-resize').ondblclick=()=>applyRosterWidth(ROSTER_DEFAULT,true)
$('#roster-resize').onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();applyRosterWidth(event.key==='Home'?ROSTER_DEFAULT:parseFloat(document.documentElement.style.getPropertyValue('--roster-width'))+(event.key==='ArrowRight'?24:-24),true)}
function showRoster(){window.dispatchEvent(new Event('tao-roster-open'));if(target&&/^#(town|civilization|empire-city)/.test(location.hash))history.replaceState(null,'',`#${target.type}=${encodeURIComponent(target.id)}`);if(mobileLayout.matches){if(!document.body.classList.contains('sidebar-open'))sidebar(true)}else if(document.body.classList.contains('navigation-collapsed'))toggleNavigation();syncSidebarSurface()}
for(const button of document.querySelectorAll('[data-roster-kind]')){button.onclick=()=>{$('#sidebar-kind').value=button.dataset.rosterKind;$('#roster-filter').open=false;$('#contacts').scrollTop=0;renderContacts()};button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...document.querySelectorAll('[data-roster-kind]')],index=tabs.indexOf(button);event.preventDefault();const next=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];next.focus();next.click()}}
$('#roster-reset').onclick=()=>{resetSidebarFilters();$('#roster-filter').open=false}
$('#roster-home').onclick=showRoster
$('.rail-brand').onclick=event=>{event.preventDefault();showRoster()}
window.addEventListener('resize',()=>{applyRosterWidth();syncInspectorAccessibility()})
window.addEventListener('storage',event=>{if(event.key==='taoagent.rosterWidth'){preferredRosterWidth=Number(preference('rosterWidth'))||ROSTER_DEFAULT;applyRosterWidth()}})

function inspectorNode(tag,text,className=''){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node}
function inspectorSection(title){const section=document.createElement('section');section.className='inspector-section';section.append(inspectorNode('h3',title));return section}
function inspectorButton(section,label,action){const button=inspectorNode('button',label);button.type='button';button.onclick=handle(action);section.append(button);return button}
function renderInspector(){
  if($('#workspace-inspector').hidden||!current)return
  const group=current.kind==='group',agent=state.agents.find(item=>item.id===current.agentId),name=group?current.title:agent?.name||'Bot',members=group?current.memberIds||[]:[current.agentId]
  const work=inspectorWork?.key===current.id?inspectorWork:null
  const fingerprint=JSON.stringify([current.id,current.title,current.purpose,current.memberIds,inspectorTab,work,state.agents,state.models.map(model=>[model.id,model.name]),state.account,current.modelId,state.running])
  if(fingerprint===inspectorFingerprint)return;inspectorFingerprint=fingerprint
  $('#inspector-title').textContent=name
  const content=$('#inspector-content'),scroll=content.scrollTop;content.replaceChildren()
  for(const tab of document.querySelectorAll('[data-inspector-tab]'))tab.setAttribute('aria-pressed',String(tab.dataset.inspectorTab===inspectorTab))
  if(inspectorTab==='overview'){
    const identity=inspectorSection(group?componentNames[componentType(current)]:'独立 Bot')
    identity.append(inspectorNode('div',group?'◈':name.slice(0,1),'inspector-avatar'),inspectorNode('p',group?current.purpose||'成员共享这里的交流，各自保留独立身份。':agent?.responsibilities||agent?.background||'独立身份与长期记忆，与你持续交流。'))
    identity.append(inspectorNode('p',isBusy()?'正在处理当前对话':'可以开始新的交流','inspector-note'));content.append(identity)
    const context=inspectorSection('模型与记忆'),model=state.models.find(item=>item.id===(current.modelId||agent?.modelId||state.account.defaultModelId))
    context.append(inspectorNode('p',group&&!current.modelId?'按每位 Bot 的模型设置':model?.name||'尚未配置模型','inspector-note'))
    inspectorButton(context,'查看记忆与背景',()=>$('#context-open').click()).disabled=$('#context-open').disabled
    inspectorButton(context,'资料、模型与协作规则',()=>openConversationControl())
    content.append(context)
    const workSection=inspectorSection('工作与日常')
    inspectorButton(workSection,'任务与操作审批',()=>{inspectorTab='work';inspectorFingerprint='';renderInspector();refreshWork().catch(error=>toast(error.message))})
    if(group&&current.componentKind!=='chat')inspectorButton(workSection,componentType(current)==='task'?'打开任务与验收':'居民生活与日程',()=>$('#space-town').click())
    if(current.componentKind==='city')inspectorButton(workSection,'观看 City 世界',()=>$('#civ-open').click())
    content.append(workSection)
  }else if(inspectorTab==='members'){
    const section=inspectorSection(group?members.length+' 位成员':'当前 Bot')
    for(const id of members){const person=state.agents.find(item=>item.id===id);if(!person)continue;const row=document.createElement('div');row.className='inspector-person';const info=document.createElement('div'),model=state.models.find(item=>item.id===(current.modelId||person.modelId||state.account.defaultModelId));info.append(inspectorNode('strong',person.name),inspectorNode('small',current.memberRoles?.[id]||person.responsibilities||'独立成员'),inspectorNode('small',model?.name||'继承默认模型'));row.append(inspectorNode('span',person.name.slice(0,1)),info);section.append(row)}
    inspectorButton(section,'编辑成员与身份',()=>group?editGroup():editAgent(current.agentId));content.append(section)
  }else{
    const pending=(work?.actions||[]).filter(action=>['pending','uncertain'].includes(action.status)),tasks=work?.tasks||[]
    const section=inspectorSection('任务与审批');section.append(inspectorNode('p',work?pending.length+' 项待审批 · '+tasks.filter(task=>!inspectorTaskState(task).finished).length+' 项未完成任务':'正在读取当前任务…','inspector-note'))
    for(const action of pending){const row=document.createElement('div');row.className='inspector-work-row';row.append(inspectorNode('strong','等待你的批准'),inspectorNode('small',agentName(action.agentId)+' · '+action.name));section.append(row)}
    for(const task of tasks){const row=document.createElement('div');row.className='inspector-work-row';row.append(inspectorNode('strong',task.title),inspectorNode('small',agentName(task.assigneeId)+' · '+inspectorTaskState(task).label));section.append(row)}
    if(work&&!pending.length&&!tasks.length)section.append(inspectorNode('p','这里会显示真实登记的任务与审批。','inspector-note'))
    inspectorButton(section,'查看消息队列',()=>$('#queue-open').click());inspectorButton(section,'打开任务、审批与完整回执',()=>openConversationControl('#work-panel'));content.append(section)
  }
  content.scrollTop=scroll
}
function syncInspectorAccessibility(){
  const open=!$('#workspace-inspector').hidden,modal=open&&innerWidth<1200
  $('#inspector-backdrop').hidden=!modal
  $('#workspace-inspector').setAttribute('role',modal?'dialog':'complementary')
  if(modal)$('#workspace-inspector').setAttribute('aria-modal','true');else $('#workspace-inspector').removeAttribute('aria-modal')
  if(modal){$('main').inert=true;$('#sidebar').inert=true;if(!$('#workspace-inspector').contains(document.activeElement))$('#inspector-close').focus()}else{$('#sidebar').inert=false;$('main').inert=document.body.classList.contains('town-active')||document.body.classList.contains('civ-active')||mobileLayout.matches&&document.body.classList.contains('sidebar-open')}
}
function setInspector(open,restore=true){
  if(open&&!current){toast('先选择一个 Bot 或群聊');return}
  if(open){inspectorReturnFocus=document.activeElement;inspectorFingerprint=''}
  $('#workspace-inspector').hidden=!open;document.body.classList.toggle('inspector-visible',open);$('#inspector-open').setAttribute('aria-expanded',String(open));applyRosterWidth();syncInspectorAccessibility()
  if(open){renderInspector();if(innerWidth<1200)$('#inspector-close').focus()}else if(restore&&inspectorReturnFocus?.isConnected)inspectorReturnFocus.focus({preventScroll:true})
}
$('#inspector-open').onclick=()=>setInspector($('#workspace-inspector').hidden)
$('#inspector-close').onclick=()=>setInspector(false)
$('#inspector-backdrop').onclick=()=>setInspector(false)
for(const button of document.querySelectorAll('[data-inspector-tab]'))button.onclick=()=>{inspectorTab=button.dataset.inspectorTab;inspectorFingerprint='';renderInspector();if(inspectorTab==='work')refreshWork().catch(error=>toast(error.message))}
for(const type of ['tao-civ-open','tao-town-open','tao-components-open'])window.addEventListener(type,()=>{if(!$('#workspace-inspector').hidden)setInspector(false,false)})
document.addEventListener('keydown',event=>{
  if($('#workspace-inspector').hidden||document.querySelector('dialog[open]'))return
  if(event.key==='Escape'){event.preventDefault();setInspector(false);return}
  if(event.key==='Tab'&&innerWidth<1200){const items=[...$('#workspace-inspector').querySelectorAll('button,[tabindex="0"]')].filter(item=>!item.disabled&&item.getClientRects().length),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
})
