import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
test('public square presents completed public events without publishing personal reflections',()=>{
  class Node {children:Node[]=[];dataset:Record<string,string>={};value='';text:string;constructor(text=''){this.text=text}append(...nodes:Node[]){this.children.push(...nodes)}setAttribute(){} }
  const saved=new Map([['taoagent.square.draft.one','one draft'],['taoagent.square.draft.two','two draft']]),context=vm.createContext({sessionStorage:{getItem:(key:string)=>saved.get(key),setItem:(key:string,value:string)=>saved.set(key,value)}})
  const source=fs.readFileSync('public/square.js','utf8').replace('export function','function');vm.runInContext(source+'\nglobalThis.mount=mountSquare',context)
  const render=(id:string)=>{const content=new Node();context.mount({el:(_tag:string,text?:string)=>new Node(text),button:(text:string)=>new Node(text),heading:(title:string)=>new Node(title),empty:(text:string)=>new Node(text),snapshot:{spaceId:id,policy:{enabled:false},members:[],runs:[],agendas:[],entries:[{text:'PRIVATE_REFLECTION'}]},brief:{recent:[{author:'伙伴',text:'PUBLIC_SPEECH',at:'now',id:'message'}]},date:()=>'',content});return content}
  const one=render('one'),two=render('two');assert(JSON.stringify(one).includes('PUBLIC_SPEECH'));assert(!JSON.stringify(one).includes('PRIVATE_REFLECTION'));assert(!JSON.stringify(two).includes('PRIVATE_REFLECTION'))
})
