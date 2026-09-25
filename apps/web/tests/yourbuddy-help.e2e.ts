/** Keyless YourBuddy journeys through Loader, the shipped Web app, and built product plugins. */
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { createUserMessage, LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import {
  assertFixtureInventory,
  captureStableAria,
  compareOrRefreshGolden,
  launchWebScaffold,
  watchConsole,
  webSnapshotMode,
  type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, saveFailureShot } from './support.ts'

const PRODUCT_ROOT = fileURLToPath(new URL('../../desktop-tauri/product/', import.meta.url))
const PERSONAL_PRODUCT = join(PRODUCT_ROOT, 'personal-workbench')
const BETTER_SIDEBAR_PRODUCT = join(PRODUCT_ROOT, 'dsh-better-sidebar')
const OIL_CREATOR_PRODUCT = join(PRODUCT_ROOT, 'oil-creator')
const DRIVER = fileURLToPath(new URL('./fixtures/yourbuddy-workbench/', import.meta.url))
const SCHEMASTERY_PRODUCT = fileURLToPath(new URL('../../../vendor/schemastery/', import.meta.url))
const PNPM_PUBLIC_DEPENDENCIES = fileURLToPath(new URL('../../../node_modules/.pnpm/node_modules/', import.meta.url))
const EXPECTED = fileURLToPath(new URL('./expected/yourbuddy-help/', import.meta.url))
const MODE = webSnapshotMode()
const EPISODE_TITLE = 'Assembled Workbench Episode'
const ATTENTION_PROVIDER = 'yourbuddy-workbench-attention'

/** Keyless model transport used only to append a current-Session turn completion. */
class AttentionAdapter extends LlmAdapter {
  override async *stream(): AsyncIterable<StreamChunk> {
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function installPackageTree(source: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true })
  await cp(source, destination, { recursive: true, dereference: true })
}

async function openSyntheticWorkbench(page: Page, intent: 'user' | 'background'): Promise<void> {
  await page.evaluate((nextIntent) => {
    const bridge = (window as unknown as {
      __yourBuddyWorkbenchTest?: { open(value: 'user' | 'background'): void }
    }).__yourBuddyWorkbenchTest
    if (bridge === undefined) throw new Error('synthetic YourBuddy workbench driver is unavailable')
    bridge.open(nextIntent)
  }, intent)
}

describe('YourBuddy product surfaces in the assembled workbench', () => {
  let world: string | undefined
  let libraryRoot: string
  let scaffold: WebScaffold | undefined
  let browser: Browser | undefined

  beforeAll(async () => {
    world = await mkdtemp(join(tmpdir(), 'yourbuddy-help-test-'))
    const harnessHome = join(world, 'home')
    const installedRoot = join(harnessHome, 'profiles', 'product')
    const installedPersonal = join(installedRoot, 'personal-workbench')
    const installedSidebar = join(installedRoot, 'dsh-better-sidebar')
    const installedOil = join(harnessHome, 'profiles', 'node_modules', 'dsh-oil-creator')
    await Promise.all([
      installPackageTree(PERSONAL_PRODUCT, installedPersonal),
      installPackageTree(BETTER_SIDEBAR_PRODUCT, installedSidebar),
      installPackageTree(OIL_CREATOR_PRODUCT, installedOil),
    ])
    await Promise.all([
      installPackageTree(SCHEMASTERY_PRODUCT, join(installedSidebar, 'node_modules', 'schemastery')),
      installPackageTree(join(PNPM_PUBLIC_DEPENDENCIES, 'ws'), join(installedSidebar, 'node_modules', 'ws')),
      installPackageTree(
        SCHEMASTERY_PRODUCT,
        join(installedOil, 'node_modules', '@deepseek-ai', 'schemastery'),
      ),
      installPackageTree(join(PNPM_PUBLIC_DEPENDENCIES, 'zod'), join(installedOil, 'node_modules', 'zod')),
    ])
    libraryRoot = join(world, 'library')
    const episode = join(libraryRoot, `2026-09-30_${EPISODE_TITLE}`)
    await mkdir(episode, { recursive: true })
    await Promise.all([
      writeFile(join(episode, 'topic.md'), '# Synthetic assembled-browser topic\n'),
      writeFile(join(episode, 'script.md'), 'Synthetic local script. No external API is used.\n'),
    ])
    const dataDir = join(world, 'oil-data')
    const overlay = join(world, 'cordis.yml')
    await writeFile(overlay, `- id: ui-sidebar
  disabled: true
- id: typert-loader
  config:
    packages:
      - dsh-oil-creator
- insert:
    - id: yourbuddy-help-product
      name: ${JSON.stringify(join(installedPersonal, 'index.js'))}
    - id: yourbuddy-help-better-sidebar
      name: ${JSON.stringify(join(installedSidebar, 'lib/index.js'))}
      config:
        presentation: slot
    - id: yourbuddy-help-oil-creator
      name: ${JSON.stringify(join(installedOil, 'lib/index.js'))}
      config:
        libraryRoot: ${JSON.stringify(libraryRoot)}
        dataDir: ${JSON.stringify(dataDir)}
    - id: yourbuddy-help-workbench-driver
      name: ${JSON.stringify(join(DRIVER, 'index.js'))}
`)
    scaffold = await launchWebScaffold({
      harnessHome,
      extraOverlayPath: overlay,
      extraInstallAnchors: [
        join(installedPersonal, 'package.json'),
        join(installedSidebar, 'package.json'),
        join(installedOil, 'package.json'),
        join(DRIVER, 'package.json'),
      ],
    })
    scaffold.ctx.effect(
      () => scaffold!.ctx.llm.registerAdapter([ATTENTION_PROVIDER], new AttentionAdapter()),
      'YourBuddy workbench attention adapter',
    )
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: ATTENTION_PROVIDER, model: 'keyless' })
    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
  }, 120_000)

  afterAll(async () => {
    try { await browser?.close() }
    finally {
      try { await scaffold?.close() }
      finally { if (world !== undefined) await rm(world, { recursive: true, force: true }) }
    }
  })

  it('coordinates durable core, creator content, and the aggregate Session region', async () => {
    const context = await browser!.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const tripwire = watchConsole(page)
    onTestFailed(() => saveFailureShot(page, 'web-e2e-yourbuddy-product-workbench'))
    try {
      await page.goto(scaffold!.authenticatedUrl, { waitUntil: 'load' })
      await page.waitForSelector('[data-dsh-frame]', { timeout: 30_000 })
      await connectFreshWorkspace(page, scaffold!.workspaceCwd, 'yourbuddy-workbench')
      await page.waitForFunction(() => '__yourBuddyWorkbenchTest' in window)

      const frame = page.locator('[data-dsh-frame][data-workbench-primary]').first()
      const productWorkbench = page.locator('[data-product-workbench]').first()
      const coreSurface = productWorkbench.locator('[data-workbench-surface="core"]')
      const contentSurface = productWorkbench.locator('[data-workbench-surface="content"]')
      const oilSidebar = page.locator('[data-plugin="dsh-oil-creator"][data-surface="sidebar"]')
      await frame.waitFor({ timeout: 15_000 })
      await coreSurface.waitFor({ state: 'visible', timeout: 15_000 })
      expect(await coreSurface.getAttribute('hidden')).toBe(null)
      expect(await contentSurface.getAttribute('hidden')).toBe('')
      expect(await contentSurface.getAttribute('inert')).toBe('')

      await oilSidebar.getByRole('tab', { name: 'Library', exact: true }).click()
      await oilSidebar.getByText(EPISODE_TITLE, { exact: true }).click()
      const creatorInspector = contentSurface.locator('[data-plugin="dsh-oil-creator"][data-surface="inspector"]')
      await creatorInspector.waitFor({ state: 'visible', timeout: 15_000 })
      expect(await contentSurface.getAttribute('hidden')).toBe(null)
      expect(await coreSurface.getAttribute('hidden')).toBe('')
      expect(await coreSurface.getAttribute('inert')).toBe('')

      await openSyntheticWorkbench(page, 'background')
      await creatorInspector.waitFor({ state: 'visible' })
      expect(await productWorkbench.getAttribute('data-mode')).toBe('content')
      const contentSnapshot = await captureStableAria(
        page,
        '[data-workbench-surface="content"] [data-plugin="dsh-oil-creator"] > header',
        scaffold!.workspaceCwd,
      )

      await productWorkbench.locator('.dpw-workbench-session-collapse').click()
      await expect.poll(() => frame.getAttribute('data-session-region-collapsed')).toBe('true')
      expect(await frame.locator('#dsh-session-region').getAttribute('aria-hidden')).toBe('true')
      const currentAgent = scaffold!.ctx.agents.list().at(-1)
      if (currentAgent === undefined) throw new Error('connected workspace created no current Agent')
      const settled = scaffold!.whenTurnSettled()
      currentAgent.followup(createUserMessage({
        content: [{ type: 'text', text: 'Synthetic current-Session attention.' }],
        source: { kind: 'user' },
      }))
      await settled
      await expect.poll(() => frame.getAttribute('data-session-region-collapsed'), { timeout: 15_000 }).toBe(null)
      await creatorInspector.waitFor({ state: 'visible' })

      await productWorkbench.locator('.dpw-workbench-session-collapse').click()
      const restore = productWorkbench.getByRole('button', { name: 'Open Conversation', exact: true })
      await restore.waitFor({ state: 'visible', timeout: 10_000 })
      await restore.click()
      await expect.poll(() => frame.getAttribute('data-session-region-collapsed')).toBe(null)

      await creatorInspector.getByRole('button', { name: 'Close', exact: true }).click()
      await coreSurface.waitFor({ state: 'visible', timeout: 10_000 })
      await oilSidebar.getByRole('tab', { name: 'Library', exact: true }).click()
      await oilSidebar.getByText(EPISODE_TITLE, { exact: true }).click()
      await creatorInspector.waitFor({ state: 'visible', timeout: 10_000 })
      await openSyntheticWorkbench(page, 'user')
      await coreSurface.waitFor({ state: 'visible', timeout: 10_000 })
      await coreSurface.getByRole('region', { name: 'Synthetic Better Sidebar content' }).waitFor()
      expect(await productWorkbench.getAttribute('data-mode')).toBe('core')
      const coreSnapshot = await captureStableAria(
        page,
        '[data-workbench-surface="core"] [aria-label="Synthetic Better Sidebar content"]',
        scaffold!.workspaceCwd,
      )

      await oilSidebar.getByRole('tab', { name: 'Library', exact: true }).click()
      await oilSidebar.getByText(EPISODE_TITLE, { exact: true }).click()
      await creatorInspector.waitFor({ state: 'visible', timeout: 10_000 })
      await productWorkbench.locator('.dpw-workbench-session-collapse').click()
      await oilSidebar.getByRole('button', { name: 'New session', exact: true }).first().click()
      await expect.poll(() => frame.getAttribute('data-session-region-collapsed'), { timeout: 15_000 }).toBe(null)
      await coreSurface.waitFor({ state: 'visible', timeout: 10_000 })
      expect(await productWorkbench.getAttribute('data-mode')).toBe('core')

      await compareOrRefreshGolden(
        join(EXPECTED, 'workbench-en.expected.md'),
        `## Content after a background Better Sidebar open\n\n${contentSnapshot}\n\n## Core after an explicit user open\n\n${coreSnapshot}`,
        MODE,
      )
      await assertFixtureInventory(EXPECTED, [
        'branding-en.expected.md',
        'branding-zh.expected.md',
        'en-failure.expected.md',
        'en.expected.md',
        'workbench-en.expected.md',
        'zh-failure.expected.md',
        'zh.expected.md',
      ])
      expect(tripwire.pageErrors).toEqual([])
      expect(tripwire.warnings).toEqual([])
    } finally {
      await context.close()
    }
  }, 120_000)

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

      const settingsTrigger = app.getByRole('button', {
        name: language === 'zh' ? '设置' : 'Settings', exact: true,
      })
      await settingsTrigger.click()
      const settings = app.getByRole('dialog', {
        name: language === 'zh' ? '设置' : 'Settings', exact: true,
      })
      const card = settings.locator('.dpw-card').filter({
        hasText: language === 'zh' ? '我的工作台' : 'My Workbench',
      })
      await card.waitFor({ timeout: 10_000 })
      await compareOrRefreshGolden(
        join(EXPECTED, `branding-${language}.expected.md`), await card.ariaSnapshot(), MODE,
      )
      const custom = language === 'zh'
        ? { name: '远方研究室', headline: '一起探索远方', badge: '体验版' }
        : { name: 'Frontier Lab', headline: 'Explore together', badge: 'Early access' }
      await card.getByRole('textbox', { name: language === 'zh' ? '工作台名称' : 'Workbench name' }).fill(custom.name)
      await card.getByRole('textbox', { name: language === 'zh' ? '首页标题' : 'Home headline' }).fill(custom.headline)
      await card.getByRole('textbox', { name: language === 'zh' ? '标题标记' : 'Headline badge' }).fill(custom.badge)
      await card.getByRole('button', { name: language === 'zh' ? '应用到工作台' : 'Apply to workbench' }).click()
      await card.getByText(language === 'zh' ? '已应用' : 'Applied', { exact: true }).waitFor()
      await settings.getByRole('button', { name: language === 'zh' ? '关闭' : 'Close', exact: true }).click()
      await app.getByText(custom.headline, { exact: true }).waitFor()
      await app.getByText(custom.badge, { exact: true }).waitFor()

      await settingsTrigger.click()
      await card.getByRole('button', { name: language === 'zh' ? '恢复 YourBuddy 默认' : 'Restore YourBuddy default' }).click()
      await card.getByText(language === 'zh' ? '已恢复默认' : 'Default restored', { exact: true }).waitFor()
      await settings.getByRole('button', { name: language === 'zh' ? '关闭' : 'Close', exact: true }).click()
      await app.getByText(language === 'zh' ? '探索未至之境' : 'Into the Unknown', { exact: true }).waitFor()

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
      await settingsTrigger.click()
      await settings.getByRole('link', { name: language === 'zh' ? '查看使用说明' : 'View usage guide', exact: true }).click()
      await expect.poll(() => page.evaluate('window.helpRequests.at(-1)')).toBe(`${prefix}docs/settings/`)
      await settings.getByRole('button', { name: language === 'zh' ? '关闭' : 'Close', exact: true }).click()
      expect(await composer.textContent()).toBe('Help keeps this draft.')
      expect(errors).toEqual([])
    }
    finally { await context.close() }
  })
})
