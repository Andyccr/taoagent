// Bundles the 帝国之城 (Empire City) scene for the browser: public/city-entry.js + public/city/* + three -> public/city.bundle.js
import { build } from 'esbuild'

await build({ entryPoints: ['public/city-entry.js'], outfile: 'public/city.bundle.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, charset: 'utf8', legalComments: 'none' })
console.log('Built public/city.bundle.js')
