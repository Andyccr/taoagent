import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HttpError } from './store.ts'

const moduleRoot = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.basename(moduleRoot)==='release'?path.dirname(moduleRoot):moduleRoot
export const sources = ['components.ts','VALIDATION-4.4.0.md','civilization.ts','build-city.mjs','docs','REAL-SQUARE-4.3.0.json','VALIDATION-4.3.0.md','REAL-ROLEPLAY-4.2.1.json','roleplay.ts','ROLEPLAY-GUIDE.md','VALIDATION-4.2.1.md','REAL-SPACE-4.2.0.json','space.ts','SPACE-DESIGN.md','VALIDATION-4.2.0.md','VALIDATION-4.1.0.md','REAL-UNIFIED-4.1.0.json','social-state.ts','social.ts','TOWN-GUIDE.md','VALIDATION-4.0.0.md','REAL-DAILY-4.0.0.json','EMERGENT-GROUP-CHAT-DESIGN.md','app.ts', 'workspace.ts', 'queue.ts', 'work.ts', 'collaboration.ts', 'context.ts', 'audience.ts', 'communication.ts', 'reasoning.ts', 'COMMUNICATION.md', 'COLLABORATION-RELEASE.md', 'opencode-go.ts', 'store.ts', 'models.ts', 'runtime.ts', 'pi.ts', 'execution.ts', 'evolution.ts', 'defaults.ts', 'portable.ts', 'migrate.ts', 'build.mjs', 'pack-windows.mjs', 'launcher.mjs', 'Taoagent.exe', 'windows', 'windows-release.json', 'Start Taoagent.cmd', 'Stop Taoagent.cmd', 'Check Taoagent.cmd', 'WINDOWS-README.md', 'VALIDATION-3.14.0.md', 'package.json', 'package-lock.json', 'README.md', 'OPENBOT-OPTIMIZATION.md', 'VALIDATION-3.13.0.md', 'AUDIT.md', 'AGENTS.md', 'CLAUDE.md', 'LICENSE', 'NOTICE', '启动 Taoagent.cmd', '启动.sh', 'public', 'tests', 'release', 'runtime']
const crcTable = Uint32Array.from({length:256},(_,value)=>{let crc=value;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);return crc>>>0})
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = (crc>>>8)^crcTable[(crc^byte)&255]
  }
  return (crc ^ 0xffffffff) >>> 0
}
// ZIP STORE: standard ZIP without dependencies; readable by Windows/macOS/Linux.
export function portableZip(home: string, root = ROOT, sourceOnly = false): Buffer {
  let files: { name: string; data: Buffer }[] = []
  function collect(file: string, name: string) {
    const stat = fs.lstatSync(file)
    if (stat.isSymbolicLink()) throw new Error('便携包不允许符号链接：' + name)
    if (stat.isDirectory() && path.basename(file) === '.launcher-lock') return
    if (name.startsWith('release/') && stat.isFile() && !['server.mjs','server.mjs.LEGAL.txt','build.json','THIRD-PARTY-NOTICES.txt','PI-LICENSE'].includes(path.basename(file))) return
    if(stat.isDirectory()&&['node_modules','.git','.next','__pycache__','.pytest_cache'].includes(path.basename(file)))return
    if (['.run-lock', '.memory-lock', '.tool-lock', '.queue-lock', '.work-lock', '.social-lock'].includes(path.basename(file)) && stat.isDirectory()) {
      let active = Date.now() - stat.mtimeMs < 30000
      try {
        const owner = JSON.parse(fs.readFileSync(path.join(file, 'owner.json'), 'utf8')) as { pid: number }
        if (Number.isInteger(owner.pid) && owner.pid > 0) {
          try { process.kill(owner.pid, 0); active = true } catch (error) { active = (error as NodeJS.ErrnoException).code !== 'ESRCH' }
        }
      } catch { /* An incomplete, newly created lock remains active. */ }
      if (active) throw new HttpError(409, '仍有对话在运行，请结束后再生成便携包')
      return
    }
    if (stat.isDirectory()) for (const item of fs.readdirSync(file).sort()) collect(path.join(file, item), name + '/' + item)
    else if (stat.isFile() && !/\.[a-f0-9-]{36}\.tmp$/i.test(name)) files.push({ name: 'taoagent/' + name, data: fs.readFileSync(file) })
  }
  const scan = () => {
    for (const source of sources) if ((!sourceOnly || !['release','runtime','Taoagent.exe','windows-release.json'].includes(source)) && fs.existsSync(path.join(root, source))) collect(path.join(root, source), source)
    if (!sourceOnly) collect(home, 'home')
  }
  scan()
  const first = files; files = []; scan()
  if (first.length !== files.length || files.some((file, index) => file.name !== first[index].name || !file.data.equals(first[index].data))) throw new HttpError(409, '打包期间文件发生变化，请停止编辑后重新导出')
  return zipFiles(files)
}
export function zipFiles(files: {name: string; data: Buffer}[]): Buffer {
  if (files.some(file => file.name.includes('\\') || file.name.split('/').some(part => !part || part === '.' || part === '..') || file.name.startsWith('/') || /^[a-z]:/i.test(file.name))) throw new Error('无效 ZIP 路径')
  if (files.length >= 65535) throw new Error('文件过多，超过 ZIP 限额，请直接复制项目目录')
  const entries: Buffer[] = []; const directory: Buffer[] = []; let offset = 0
  const now = new Date(); const year = Math.max(1980, Math.min(2107, now.getFullYear()))
  const date = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8'); const size = file.data.length
    if (offset + size > 0xffffffff) throw new Error('数据超过 4GB，请直接复制项目目录')
    const crc = crc32(file.data); const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6)
    header.writeUInt16LE(time, 10); header.writeUInt16LE(date, 12); header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(size, 18); header.writeUInt32LE(size, 22); header.writeUInt16LE(name.length, 26)
    entries.push(header, name, file.data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8)
    central.writeUInt16LE(time, 12); central.writeUInt16LE(date, 14); central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(size, 20); central.writeUInt32LE(size, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42)
    directory.push(central, name); offset += header.length + name.length + size
  }
  const central = Buffer.concat(directory); const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...entries, central, end])
}
if (process.argv[1] && path.basename(process.argv[1]) === 'portable.ts' && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const home = path.resolve(process.env.TAOAGENT_HOME || path.join(ROOT, 'home'))
  const out = path.join(ROOT, 'backups', `taoagent-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, portableZip(home), { mode: 0o600 })
  console.log(out)
}
