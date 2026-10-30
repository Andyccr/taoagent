// Optional browser e2e for 帝国之城. Runs only when a playwright-core package and a Chrome binary are provided:
//   TAOAGENT_E2E_PLAYWRIGHT=/abs/path/node_modules/playwright-core TAOAGENT_E2E_CHROME=/usr/bin/google-chrome npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { once } from 'node:events'
import { json } from '../store.ts'
import { createApp } from '../app.ts'

function home() {
  fs.mkdirSync('.test-tmp', { recursive: true })
  return fs.mkdtempSync(path.resolve('.test-tmp', 'empire-e2e-'))
}

interface CityUnit {
  id: string
  state: string
}

interface CityMessenger {
  from: string
  to: string
}

interface CityDebug {
  units: CityUnit[]
  messengers: CityMessenger[]
}

interface EmpireCityWindow {
  __empireCity?: { debug(): CityDebug }
}

interface Page {
  setViewportSize(size: { width: number; height: number }): Promise<void>
  on(event: 'pageerror', handler: (error: Error) => void): void
  goto(url: string): Promise<unknown>
  waitForFunction(fn: () => boolean, arg: unknown, options?: { timeout?: number }): Promise<unknown>
  evaluate<T>(fn: () => T): Promise<T>
  textContent(selector: string): Promise<string | null>
}

interface Browser {
  newPage(): Promise<Page>
  close(): Promise<void>
}

interface ChromiumLauncher {
  launch(options: { executablePath: string; args: string[] }): Promise<Browser>
}

const driverPath = process.env.TAOAGENT_E2E_PLAYWRIGHT
const chrome = process.env.TAOAGENT_E2E_CHROME

if (!driverPath || !chrome) {
  test('empire city browser e2e', { skip: 'set TAOAGENT_E2E_PLAYWRIGHT and TAOAGENT_E2E_CHROME to run' }, () => {})
} else {
  test('empire city browser e2e', { timeout: 90000 }, async () => {
    const root = home()
    const app = createApp(root, { seed: false })
    const store = app.store
    let browser: Browser | undefined
    try {
      store.saveAgent({ id: 'lead', name: '统筹者', responsibilities: '协调与派工' }, '', '')
      store.saveAgent({ id: 'coder', name: '实现者', responsibilities: '代码实现与测试' }, '', '')
      const group = store.saveGroup('工程组', ['main', 'lead', 'coder'], undefined, { coordinatorId: 'lead' })

      app.server.listen(0, '127.0.0.1')
      await once(app.server, 'listening')
      const address = app.server.address()
      assert(address && typeof address === 'object')
      const base = 'http://127.0.0.1:' + address.port

      const driver = (await import(pathToFileURL(path.join(driverPath, 'index.mjs')).href)) as { chromium: ChromiumLauncher }
      browser = await driver.chromium.launch({
        executablePath: chrome,
        args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
      })
      const page = await browser.newPage()
      await page.setViewportSize({ width: 1440, height: 900 })
      const pageerrors: string[] = []
      page.on('pageerror', (error) => {
        pageerrors.push(String(error))
      })

      await page.goto(base + '/#civilization')
      await page.waitForFunction(() => {
        const c = (window as unknown as EmpireCityWindow).__empireCity
        return !!c && c.debug().units.length >= 3
      }, null, { timeout: 30000 })

      const initialUnits = await page.evaluate(() => {
        const c = (window as unknown as EmpireCityWindow).__empireCity
        return c ? c.debug().units : []
      })
      assert.equal(initialUnits.find((unit) => unit.id === 'coder')?.state, 'idle')
      assert.equal(await page.textContent('#civ-title'), '帝国之城')

      const now = new Date().toISOString()
      json(store.file('chats', group.id, 'turns.json'), [{
        id: 'e2e',
        content: '',
        modelId: group.modelId,
        at: now,
        updatedAt: now,
        speakers: [{ agentId: 'coder', eventId: 'run', status: 'running', taskId: 'e2e-task' }],
      }])
      json(store.file('chats', group.id, 'tasks.json'), [{
        id: 'e2e-task',
        title: '端到端任务',
        fromAgentId: 'lead',
        assigneeId: 'coder',
        status: 'pending',
        at: now,
      }])

      await page.waitForFunction(() => {
        const c = (window as unknown as EmpireCityWindow).__empireCity
        return !!c && c.debug().units.some((unit) => unit.id === 'coder' && unit.state === 'working')
      }, null, { timeout: 15000 })

      const after = await page.evaluate(() => {
        const c = (window as unknown as EmpireCityWindow).__empireCity
        return c ? c.debug() : { units: [], messengers: [] }
      })
      const messenger = after.messengers.some((entry) => entry.from === 'lead' && entry.to === 'coder')
      const leadWorking = after.units.some((unit) => unit.id === 'lead' && unit.state === 'working')
      assert.equal(messenger || leadWorking, true)
      const side = await page.textContent('.civ-side')
      assert.equal(side?.includes('正在执行'), true)
      assert.equal(pageerrors.length, 0)
    } finally {
      if (browser) await browser.close()
      app.server.closeAllConnections()
      await new Promise<void>((resolve) => app.server.close(() => resolve()))
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
}
