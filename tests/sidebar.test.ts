import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {buildSidebarSections,sidebarQuickTab,sidebarSectionExpanded} from '../public/sidebar.js'
const fixture=()=>({agents:[{id:'main',name:'助手'},{id:'designer',name:'设计师',responsibilities:'产品设计'},{id:'legacy',name:'原始成员',legacy:true}],groups:[{id:'g1',title:'灵感空间',componentKind:'emergent',memberIds:['main','designer']},{id:'g2',title:'随便聊聊',componentKind:'chat',memberIds:['main','designer']},{id:'g3',title:'研发任务',componentKind:'task',memberIds:['main']},{id:'city-public',title:'城市聊天室',componentKind:'city',memberIds:['main','designer']}],navigation:{pinned:['agent:designer','group:g3']},conversations:[]})
const keys=(view:ReturnType<typeof buildSidebarSections>)=>view.sections.flatMap(section=>section.items.map(item=>item.key))

test('sidebar pinned entries appear once across types and every imported or ordinary component remains reachable',()=>{
 const state=fixture(),before=JSON.stringify(state),view=buildSidebarSections(state)
 assert.equal(view.count,7);assert.equal(view.total,7);assert.equal(new Set(keys(view)).size,7);assert.equal(view.sections[0].id,'pinned');assert.deepEqual(new Set(view.sections[0].items.map(item=>item.key)),new Set(state.navigation.pinned));assert(view.sections.some(section=>section.id==='legacy'));assert.equal(JSON.stringify(state),before)
})
test('sidebar combines component and status filters with an independent pin filter and accurate result counts',()=>{
 const state=fixture(),status=(type:string,id:string)=>({status:id==='g3'?'waiting':'idle',label:''})
 assert.deepEqual(keys(buildSidebarSections(state,{kind:'task',status:'waiting'},status)),['group:g3'])
 assert.deepEqual(keys(buildSidebarSections(state,{kind:'agent',status:'pinned'},status)),['agent:designer'])
 const empty=buildSidebarSections(state,{kind:'chat',status:'waiting'},status);assert.equal(empty.count,0);assert.equal(empty.total,7)
 assert.equal(buildSidebarSections(state,{status:'all'},status).count,7)
})
test('sidebar search uses all terms, exact IDs and group member names without losing long names or modifying filters',()=>{
 const state=fixture();state.agents[1].name='设计师 · '+'长名字'.repeat(100)
 assert.deepEqual(keys(buildSidebarSections(state,{search:'g1 设计师'})),['group:g1'])
 assert.deepEqual(new Set(keys(buildSidebarSections(state,{search:'MAIN'}))),new Set(['agent:main','group:g1','group:g2','group:g3','group:city-public']))
 assert.equal(buildSidebarSections(state,{search:'长名字'}).sections[0].items[0].label,state.agents[1].name)
 assert.equal(buildSidebarSections(state,{search:'  不存在  词 '}).count,0)
})
test('sidebar prioritizes approvals and retries before ordinary recent activity, keeping stable deterministic ties',()=>{
 const state={agents:Array.from({length:80},(_,i)=>({id:i?'bot-'+i:'main',name:'Bot '+i})),groups:[],navigation:{pinned:[]},conversations:[]}
 const status=(type:string,id:string)=>({status:id==='bot-79'?'waiting':id==='bot-78'?'failed':'idle',label:''})
 const view=buildSidebarSections(state,{},status);assert.equal(view.count,80);assert.deepEqual(view.sections[0].items.slice(0,3).map(item=>item.id),['bot-79','bot-78','main']);assert.deepEqual(keys(view),keys(buildSidebarSections(state,{},status)))
})
test('sidebar layout has a single owned search/filter area and a bounded scrolling list, with no town reparenting',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),town=fs.readFileSync(new URL('../public/town.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../public/sidebar.css',import.meta.url),'utf8')
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size)
 for(const id of ['sidebar-kind','sidebar-status','sidebar-create','sidebar-tools','sidebar-locate','sidebar-search-clear'])assert(ids.includes(id))
 const client=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8');assert(!client.includes("replaceWith($('#workspace-open'))"));assert(!town.includes('village-utilities'));assert(css.includes('grid-template-rows:auto minmax(0,1fr) auto'));assert(css.includes('overscroll-behavior:contain'))
})

test('formed groups expose their founder and origin space, and are searchable by founder name',()=>{
 const state={agents:[{id:'main',name:'助手'},{id:'designer',name:'设计师'}],groups:[{id:'g1',title:'灵感空间',componentKind:'emergent',memberIds:['main','designer']},{id:'f1',title:'深夜研究',componentKind:'emergent',memberIds:['designer'],originSessionId:'g1',formedBy:'main'}],navigation:{pinned:[]},conversations:[]}
 const view=buildSidebarSections(state),item=view.sections.flatMap(section=>section.items).find(entry=>entry.id==='f1')
 assert.deepEqual(item?.origin,{formedBy:'助手',fromTitle:'灵感空间'})
 assert(keys(buildSidebarSections(state,{search:'助手'})).includes('group:f1'))
})
test('roster sections stay open until folded, and quick tabs only match their own filter',()=>{
 const section={id:'agent',items:Array.from({length:25},(_,i)=>({id:'bot-'+i,type:'agent'}))}
 assert.equal(sidebarSectionExpanded(section),true)
 assert.equal(sidebarSectionExpanded(section,{target:{type:'agent',id:'bot-12'}}),true)
 assert.equal(sidebarSectionExpanded(section,{opened:new Set(['agent'])}),true)
 assert.equal(sidebarSectionExpanded(section,{closed:new Set(['agent']),target:{type:'agent',id:'bot-12'}}),false)
 assert.equal(sidebarSectionExpanded(section,{search:'bot',closed:new Set(['agent'])}),true);assert.equal(sidebarSectionExpanded(section,{filtered:true,closed:new Set(['agent'])}),true)
 assert.equal(sidebarQuickTab('group'),'group');assert.equal(sidebarQuickTab('chat'),'');assert.equal(sidebarQuickTab('city'),'');assert.equal(sidebarQuickTab(),'all')
})
