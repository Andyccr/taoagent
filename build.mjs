import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'

fs.mkdirSync('release',{recursive:true})
await build({entryPoints:['app.ts'],outfile:'release/server.mjs',bundle:true,platform:'node',format:'esm',target:'node22.19',legalComments:'linked',banner:{js:"import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);"},metafile:true}).then(result=>{
  const packages=new Map()
  for(const input of Object.keys(result.metafile.inputs)){
    const match=input.match(/^(node_modules\/(?:@[^/]+\/)?[^/]+)\//)
    if(!match||packages.has(match[1]))continue
    const root=match[1],meta=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
    const licenses=fs.readdirSync(root).filter(name=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(name)).map(name=>fs.readFileSync(path.join(root,name),'utf8'))
    packages.set(root,`${meta.name}@${meta.version} · ${meta.license||'See upstream license'}\n${typeof meta.repository==='object'?meta.repository.url:meta.repository||''}\n${licenses.join('\n')||'Published package omits full license text; see upstream repository and release/PI-LICENSE.'}`)
  }
  fs.writeFileSync('release/THIRD-PARTY-NOTICES.txt',[...packages.values()].join('\n\n'+'='.repeat(70)+'\n\n'))
  fs.writeFileSync('release/build.json',JSON.stringify({version:JSON.parse(fs.readFileSync('package.json','utf8')).version,nodeMinimum:'22.19.0',pi:'1.3.0',builtAt:new Date().toISOString(),dependencies:[...packages.keys()]},null,2)+'\n')
})
console.log('Built release/server.mjs')
