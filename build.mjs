import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'

fs.mkdirSync('release',{recursive:true})
await build({entryPoints:['app.ts'],outfile:'release/server.mjs',bundle:true,platform:'node',format:'esm',target:'node22.19',legalComments:'none',banner:{js:"import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);"},metafile:true}).then(result=>{
  const packages=new Map()
  for(const input of Object.keys(result.metafile.inputs)){
    const match=input.match(/^(node_modules\/(?:@[^/]+\/)?[^/]+)\//)
    if(!match||packages.has(match[1]))continue
    const root=match[1],meta=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
    packages.set(root,meta.version)
  }
  fs.writeFileSync('release/build.json',JSON.stringify({version:JSON.parse(fs.readFileSync('package.json','utf8')).version,nodeMinimum:'22.19.0',pi:'1.3.0',builtAt:new Date().toISOString(),dependencies:[...packages.keys()]},null,2)+'\n')
})
console.log('Built release/server.mjs')
