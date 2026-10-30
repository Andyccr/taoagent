import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const source=fs.readFileSync(new URL('../public/client.js',import.meta.url),'utf8')
test('minimal shell keeps pending approvals visible and clears them on conversation change',()=>{
  const button={dataset:{} as Record<string,string>,hidden:true,textContent:''}
  const context=vm.createContext({$ :()=>button,current:null,isBusy:()=>false})
  vm.runInContext(source.slice(source.indexOf('function syncAttention('),source.indexOf("$('#conversation-settings-open').onclick")),context)
  const sync=vm.runInContext('syncAttention',context) as (actions?:{status:string}[])=>void
  sync([{status:'pending'},{status:'uncertain'},{status:'complete'}]);assert.equal(button.hidden,false);assert.equal(button.textContent,'2 项待审批');assert.equal(button.dataset.section,'#work-panel')
  sync([]);assert.equal(button.hidden,true)
  vm.runInContext("current={turns:[{speakers:[{status:'failed'}]}]}",context);sync();assert.equal(button.textContent,'待继续');assert.equal(button.dataset.section,'#conversation-progress')
})
test('settings search exposes the matching category without altering existing form values',()=>{
  const panels:Record<string,{textContent:string}>={'#tab-models':{textContent:'温度 输出 上下文'},'#tab-tools':{textContent:'MCP 审批'}}
  const buttons=[{dataset:{tab:'models'},textContent:'模型',hidden:false,getAttribute:()=> 'false'},{dataset:{tab:'tools'},textContent:'工具',hidden:false,getAttribute:()=> 'true'}]
  const query={value:'温度'},empty={hidden:true};let selected=''
  const context=vm.createContext({$: (selector:string)=>selector==='#settings-search'?query:selector==='#settings-search-empty'?empty:panels[selector],document:{querySelectorAll:()=>buttons},showTab:(name:string)=>selected=name})
  vm.runInContext(source.slice(source.indexOf('function filterSettings('),source.indexOf("$('#settings-search').oninput")),context)
  const filter=vm.runInContext('filterSettings',context) as ()=>unknown[]
  assert.equal(filter().length,1);assert.equal(selected,'models');assert.equal(buttons[1].hidden,true)
  query.value='不存在的设置';assert.equal(filter().length,0);assert.equal(empty.hidden,false)
  query.value='';assert.equal(filter().length,2);assert.equal(buttons[1].hidden,false)
})
