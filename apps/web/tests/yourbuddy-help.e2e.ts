/** Keyless Help journey through Loader, the shipped Web app, and the built product plugin. */
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { compareOrRefreshGolden, launchWebScaffold, webSnapshotMode, type WebScaffold } from './scaffold.ts'

const PRODUCT = fileURLToPath(new URL('../../desktop-tauri/product/personal-workbench/', import.meta.url))
const EXPECTED = fileURLToPath(new URL('./expected/yourbuddy-help/', import.meta.url))
const MODE = webSnapshotMode()

describe('YourBuddy Help in the assembled workbench', () => {
  let world: string | undefined
  let scaffold: WebScaffold | undefined
  let browser: Browser | undefined

  beforeAll(async () => {
    world = await mkdtemp(join(tmpdir(), 'yourbuddy-help-test-'))
    const harnessHome = join(world, 'home')
    const installedProduct = join(harnessHome, 'profiles', 'product')
    await mkdir(join(installedProduct, 'lib'), { recursive: true })
    for (const file of ['index.js', 'lib/client.js', 'package.json']) {
      await copyFile(join(PRODUCT, file), join(installedProduct, file))
    }
    const overlay = join(world, 'cordis.yml')
    await writeFile(overlay, `- insert:\n    - id: yourbuddy-help-product\n      name: ${JSON.stringify(join(installedProduct, 'index.js'))}\n`)
    scaffold = await launchWebScaffold({ harnessHome, extraOverlayPath: overlay,
      extraInstallAnchors: [join(installedProduct, 'package.json')] })
    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
  })

  afterAll(async () => {
    try { await browser?.close() }
    finally {
      try { await scaffold?.close() }
      finally { if (world !== undefined) await rm(world, { recursive: true, force: true }) }
    }
  })

  it.each(['en', 'zh'] as const)('opens guides and recovers from native failure in %s', async (language) => {
    const context = await browser!.newContext({ locale: language === 'zh' ? 'zh-CN' : 'en-US',
      colorScheme: language === 'zh' ? 'dark' : 'light', viewport: { width: 1280, height: 900 } })
    try {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      const shellUrl = `${scaffold!.baseUrl}/__yourbuddy-help-test-shell`
      // Only the native application bridge is substituted. The iframe loads the
      // real built Client roster, slots, settings, locale, and Host transport.
      await page.route(shellUrl, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
<html><body style="margin:0"><iframe id="workbench" style="width:100vw;height:100vh;border:0"></iframe>
<script>
window.helpRequests = []; window.failHelp = false;
window.addEventListener('message', event => {
  const frame = document.getElementById('workbench');
  if (event.source !== frame.contentWindow || event.origin !== ${JSON.stringify(new URL(scaffold!.baseUrl).origin)}) return;
  const value = event.data;
  if (value?.channel !== 'yourbuddy.desktop.external-link' || value.type !== 'open-request') return;
  window.helpRequests.push(value.url);
  event.source.postMessage({ channel: value.channel, version: value.version, type: 'open-response',
    requestId: value.requestId, ok: !window.failHelp, ...(window.failHelp ? { error: 'browser-unavailable' } : {}) }, event.origin);
});
document.getElementById('workbench').src = ${JSON.stringify(scaffold!.authenticatedUrl)};
</script></body></html>` }))
      await page.goto(shellUrl)
      const app = page.frameLocator('#workbench')
      const title = language === 'zh' ? '帮助与指南' : 'Help and guides'
      const trigger = app.getByRole('button', { name: title, exact: true })
      await trigger.waitFor({ timeout: 30_000 })
      await trigger.press('Enter')
      await compareOrRefreshGolden(join(EXPECTED, `${language}.expected.md`), await app.locator('.dpw-help').ariaSnapshot(), MODE)
      const labels = await app.getByRole('menuitem').allTextContents()
      await app.getByRole('menuitem').first().press('End')
      expect(await app.getByRole('menuitem').last().evaluate(node => node === document.activeElement)).toBe(true)
      await app.getByRole('menuitem').last().press('Escape')
      const workspace = app.getByRole('textbox', { name: language === 'zh' ? '选择工作区' : 'Choose workspace', exact: true })
      if (await workspace.isVisible()) {
        await workspace.click()
        const dialog = app.getByRole('dialog', { name: language === 'zh' ? '选择工作区目录' : 'Select Workspace Directory' })
        const edit = language === 'zh' ? '编辑路径' : 'Edit path'
        await dialog.getByRole('button', { name: edit }).click()
        await dialog.getByRole('textbox', { name: edit }).fill(scaffold!.workspaceCwd)
        await dialog.getByRole('textbox', { name: edit }).press('Enter')
        await dialog.getByRole('button', { name: language === 'zh' ? '打开' : 'Open', exact: true }).click()
      }
      const composer = app.locator('[data-composer-input][contenteditable="true"]')
      await composer.fill('Help keeps this draft.')
      const originalUrl = await app.locator('body').evaluate(() => window.location.href)
      for (const label of labels) {
        await trigger.click()
        await app.getByRole('menuitem', { name: label, exact: true }).click()
        await app.getByRole('menu').waitFor({ state: 'hidden' })
      }
      const prefix = `https://istarwyh.github.io/yourbuddy/${language === 'zh' ? '' : 'en/'}`
      expect(await page.evaluate('window.helpRequests')).toEqual([
        `${prefix}docs/start/`, `${prefix}plugins/`, `${prefix}docs/develop/`, `${prefix}docs/troubleshooting/`,
        'https://github.com/istarwyh/yourbuddy/issues',
      ])
      expect(await app.locator('body').evaluate(() => window.location.href)).toBe(originalUrl)
      expect(await composer.textContent()).toBe('Help keeps this draft.')

      await app.getByRole('button', { name: language === 'zh' ? '收起侧边栏' : 'Collapse sidebar', exact: true }).click()
      await expect.poll(() => trigger.textContent()).toBe('?')
      await page.evaluate('window.failHelp = true')
      await trigger.click()
      const panel = await app.locator('.dpw-help-panel').boundingBox()
      expect(panel?.width).toBeGreaterThan(200)
      expect(panel?.x).toBeGreaterThanOrEqual(0)
      await app.getByRole('menuitem').first().click()
      await app.getByRole('alert').waitFor()
      await compareOrRefreshGolden(join(EXPECTED, `${language}-failure.expected.md`), await app.locator('.dpw-help').ariaSnapshot(), MODE)
      const address = app.getByRole('textbox', { name: language === 'zh' ? '帮助页面地址' : 'Help page address' })
      expect(await address.inputValue()).toBe(`${prefix}docs/start/`)
      if (process.env.DSH_HELP_SCREENSHOT_DIR !== undefined) {
        await page.screenshot({ path: join(process.env.DSH_HELP_SCREENSHOT_DIR, `help-${language}.png`) })
      }
      await address.press('Escape')
      expect(await trigger.evaluate(node => node === document.activeElement)).toBe(true)
      await page.evaluate('window.failHelp = false')
      await app.getByRole('button', { name: language === 'zh' ? '打开侧边栏' : 'Open sidebar', exact: true }).click()
      await app.getByRole('button', { name: language === 'zh' ? '设置' : 'Settings', exact: true }).click()
      const settings = app.getByRole('dialog', { name: language === 'zh' ? '设置' : 'Settings', exact: true })
      await settings.getByRole('link', { name: language === 'zh' ? '查看使用说明' : 'View usage guide', exact: true }).click()
      await expect.poll(() => page.evaluate('window.helpRequests.at(-1)')).toBe(`${prefix}docs/settings/`)
      await settings.getByRole('button', { name: language === 'zh' ? '关闭' : 'Close', exact: true }).click()
      expect(await composer.textContent()).toBe('Help keeps this draft.')
      expect(errors).toEqual([])
    }
    finally { await context.close() }
  })
})
