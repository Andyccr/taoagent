// Optional browser e2e for the chat view. Runs only when a playwright-core package and a Chrome binary are provided:
//   TAOAGENT_E2E_PLAYWRIGHT=/abs/path/node_modules/playwright-core TAOAGENT_E2E_CHROME=/usr/bin/google-chrome npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { once } from 'node:events'
import { createApp } from '../app.ts'

interface Page {
  on(event: 'pageerror', handler: (error: Error) => void): void
  goto(url: string): Promise<unknown>
  waitForFunction(fn: (arg: string) => boolean, arg: string, options?: { timeout?: number }): Promise<unknown>
  evaluate<T>(fn: () => T): Promise<T>
  waitForTimeout(ms: number): Promise<void>
}
interface Browser { newPage(): Promise<Page>; close(): Promise<void> }
interface ChromiumLauncher { launch(options: { executablePath: string; args: string[] }): Promise<Browser> }
interface MarkedNode { __kept?: boolean }

const driverPath = process.env.TAOAGENT_E2E_PLAYWRIGHT, chrome = process.env.TAOAGENT_E2E_CHROME

if (!driverPath || !chrome) {
  test('chat view keeps rendered history between background refreshes', { skip: 'set TAOAGENT_E2E_PLAYWRIGHT and TAOAGENT_E2E_CHROME to run' }, () => {})
} else {
  test('chat view keeps rendered history between background refreshes and still shows new messages', { timeout: 60000 }, async () => {
    fs.mkdirSync('.test-tmp', { recursive: true })
    const root = fs.mkdtempSync(path.resolve('.test-tmp', 'chat-e2e-')), app = createApp(root, { seed: false }), store = app.store
    let browser: Browser | undefined, release: (() => void) | undefined
    try {
      store.saveAgent({ id: 'peer', name: 'Peer', modelId: '' }, 'r', '')
      const group = store.saveGroup('steady', ['main', 'peer'])
      for (let index = 0; index < 30; index++) store.append(group.id, index % 2 ? 'assistant' : 'user', 'history line ' + index, 'complete', index % 2 ? { agentId: 'peer', agentName: 'Peer' } : {})
      release = store.acquireRun(group.id) // Shown as running, so the page reloads the conversation every reconciliation.
      app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening')
      const address = app.server.address(); assert(address && typeof address === 'object')
      const driver = (await import(pathToFileURL(path.join(driverPath, 'index.mjs')).href)) as { chromium: ChromiumLauncher }
      browser = await driver.chromium.launch({ executablePath: chrome, args: [] })
      const page = await browser.newPage(), errors: string[] = []
      page.on('pageerror', error => { errors.push(String(error)) })
      await page.goto(`http://127.0.0.1:${address.port}/#group=${group.id}`)
      await page.waitForFunction(text => document.querySelector('#messages')?.textContent?.includes(text) || false, 'history line 29', { timeout: 20000 })
      await page.evaluate(() => { for (const node of document.querySelectorAll('#messages > *')) (node as unknown as MarkedNode).__kept = true })
      await page.waitForTimeout(9000) // At least two 4-second reconciliations with an unchanged history.
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('#messages > *')].every(node => (node as unknown as MarkedNode).__kept === true)), true)
      store.append(group.id, 'assistant', 'fresh reply', 'complete', { agentId: 'peer', agentName: 'Peer' })
      await page.waitForFunction(text => document.querySelector('#messages')?.textContent?.includes(text) || false, 'fresh reply', { timeout: 15000 })
      assert.deepEqual(errors, [])
    } finally {
      release?.(); await browser?.close(); app.server.closeAllConnections(); app.server.close(); fs.rmSync(root, { recursive: true, force: true })
    }
  })
}
