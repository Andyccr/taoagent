import {test} from 'node:test'
import assert from 'node:assert/strict'
import {serializeToolResult} from '../pi.ts'

test('small model tool budgets preserve every source character, hash and usable paging cursor',()=>{
  const source=('引号"换行\n\\emoji🙂').repeat(800),sha256='a'.repeat(64)
  let offset=0,restored='',pages=0
  while(offset<source.length){
    const raw={path:'runtime.ts',sha256,content:source.slice(offset,offset+6000),offset,nextOffset:offset+6000<source.length?offset+6000:null,totalChars:source.length}
    const text=serializeToolResult(raw,1000),page=JSON.parse(text) as typeof raw
    assert(text.length<=1000);assert.equal(page.sha256,sha256);assert.equal(page.offset,offset)
    assert(page.content.length>0);restored+=page.content;pages++
    if(page.nextOffset===null){assert.equal(restored.length,source.length);break}
    assert.equal(page.nextOffset,offset+page.content.length);offset=page.nextOffset
    assert(pages<100)
  }
  assert.equal(restored,source);assert(pages>2)
})

test('large diagnostic metadata cannot displace the next cursor or selected log content',()=>{
  const output='failure\n'.repeat(1000)
  const text=serializeToolResult({runId:'failed-run',status:'failed',checks:Array.from({length:50},()=>({name:'test',output:'x'.repeat(500)})),content:output.slice(0,6000),offset:0,nextOffset:6000,totalChars:output.length},1000)
  const page=JSON.parse(text) as {runId:string;status:string;content:string;nextOffset:number}
  assert(text.length<=1000);assert.equal(page.runId,'failed-run');assert.equal(page.status,'failed')
  assert.equal(page.content,output.slice(0,page.nextOffset));assert(page.nextOffset>0)
  assert.equal(serializeToolResult({ok:true},1000),'{"ok":true}')
})
