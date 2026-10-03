/** Recorded source-file delivery and nested failure behavior. */
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { release } from 'node:os'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-tool-present/types'
import {
  assertFinalWorkspaceSnapshot, fixtureUserPrompts, launchWebScaffold, recordFixture,
  webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage } from './support.ts'

const DIR = fileURLToPath(new URL('../../../snapshots/web/present', import.meta.url))
const FIXTURE = join(DIR, 'session.v3.jsonl')
const MODE = webSnapshotMode()
const PROMPT = 'Use one run_code program to do the following in order. Call present for missing.txt and catch its error without creating that file. '
  + 'Use bash to run exactly `printf "DELIVERED_REPORT\\n" > report.txt; printf "DELIVERED_NOTE\\n" > 说明.txt`. '
  + 'Call present for report.txt and 说明.txt. After present succeeds, deliberately throw the string "AFTER_PRESENT" (not an Error object) from that same run_code program. '
  + 'Do not retry the program or create any other files. Finish by mentioning `report.txt` and `说明.txt` in inline code, and put PRESENT_DONE in a separate paragraph.'

// The recorded Bash scenario and executable opener fixture require a POSIX host outside WSL.
describe.skipIf(process.platform === 'win32' || release().toLowerCase().includes('microsoft'))('web e2e: explicit file delivery', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let sessionId: SessionId
  let cwd: string
  let disposeApproval: (() => void) | undefined
  const events: SessionEvent[] = []

  beforeAll(async () => {
    await mkdir(DIR, { recursive: true })
    scaffold = await launchWebScaffold({
      extraOverlayPath: fileURLToPath(new URL('./present.overlay.yml', import.meta.url)),
      agentPresets: { default: 'ptc' }, compareReplaySession: true,
      ...(MODE === 'record' ? {} : { replayFixture: FIXTURE }),
    })
    // File associations belong to the desktop rather than the recorded Session.
    const controller = scaffold.ctx.get('sessionController')
    if (controller === undefined) throw new Error('present requires Session Controller')
    const nativeQuery: unknown = Reflect.get(controller, 'fileApplications')
    if (typeof nativeQuery !== 'function') throw new Error('present requires native association discovery')
    Reflect.set(controller, 'fileApplications', async () => [{ id: 'test-editor', name: 'Test Editor', default: true, icon: null }])
    scaffold.ctx.effect(() => () => { Reflect.set(controller, 'fileApplications', nativeQuery) }, 'present: native association fixture')
    disposeApproval = scaffold.ctx.on('approval/request', () => Promise.resolve('allowed-once'), { prepend: true })
    scaffold.ctx.on('session/event', (_session, event) => { events.push(event) })
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
  }, 120_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      disposeApproval?.()
      await scaffold?.close()
    }
  })

  it('declares nested deliveries even when the enclosing program subsequently fails', async () => {
    if (MODE !== 'record') expect(fixtureUserPrompts(await readFile(FIXTURE, 'utf8'))).toEqual([PROMPT])
    const settled = scaffold.whenTurnSettled()
    const input = page.locator('[data-composer-input]').first()
    await input.fill(PROMPT)
    await input.press('Enter')
    sessionId = await settled
    const workspace = scaffold.ctx.agents.get(sessionId)?.session.header.cwd
    if (workspace === undefined) throw new Error('present Session has no workspace')
    cwd = workspace
    if (MODE === 'record') await recordFixture(scaffold, sessionId, FIXTURE)
    await page.getByText(/^PRESENT_DONE\.?$/).waitFor({ timeout: 30_000 })
    await assertFinalWorkspaceSnapshot(DIR, cwd)
    expect(events.filter(event => event.type === 'deliverables/presented').flatMap(event => event.data.files.map(file => file.path)))
      .toEqual(['report.txt', '说明.txt'])
    for (const event of events) {
      if (event.type === 'deliverables/presented') {
        expect(event.data.files).toEqual([
          { path: 'report.txt', description: 'delivered report' },
          { path: '说明.txt', description: 'delivered note' },
        ])
      }
    }
    expect(events.some(event => event.type === 'tool/ptc-dispatch' && event.data.name === 'present' && event.data.isError)).toBe(true)
    expect(events.some(event => event.type === 'tool/result' && event.data.message.isError)).toBe(true)
  }, 200_000)

  it('opens current source files after edits and reload, and reports deletion without downloading', async () => {
    await writeFile(join(cwd, 'report.txt'), 'EDITED_REPORT\n')
    await writeFile(join(cwd, '说明.txt'), 'EDITED_NOTE\n')
    for (const reload of [false, true]) {
      if (reload) {
        const warningStart = tripwire.warnings.length
        await page.reload({ waitUntil: 'load' })
        acknowledgeReloadConnectionLoss(tripwire, warningStart)
        await page.getByText(/^PRESENT_DONE\.?$/).waitFor({ timeout: 30_000 })
      }
      const row = page.locator('[data-presented-files-row]')
      await row.waitFor()
      await expect.poll(() => row.getByRole('button', { name: 'More ways to open' }).count()).toBe(2)
      expect(await row.getByText('report.txt', { exact: true }).innerText()).toBe('report.txt')
      const card = row.locator('[data-presented-file]').filter({ hasText: 'report.txt' })
      await card.getByRole('button', { name: 'Open in Test Editor', exact: true }).hover()
      await page.getByRole('tooltip', { name: 'Open in Test Editor', exact: true }).waitFor()
      expect(await page.getByRole('tooltip').evaluate((tooltip) => {
        const rect = tooltip.getBoundingClientRect()
        const previous = tooltip.style.pointerEvents
        tooltip.style.pointerEvents = 'auto'
        const visible = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 1) === tooltip
        tooltip.style.pointerEvents = previous
        return tooltip.parentElement === document.body && visible
      })).toBe(true)
      await page.mouse.move(0, 0)
      const beforePreview = (await opened()).length
      const column = page.locator('[data-rightbar-col]')
      for (const [name, content] of [['report.txt', 'EDITED_REPORT'], ['说明.txt', 'EDITED_NOTE']] as const) {
        const mention = page.locator('code').getByRole('button', { name: `Open ${name} in sidebar`, exact: true })
        await mention.click()
        const preview = column.locator('[data-document-preview]')
        await expect.poll(() => preview.getAttribute('data-textpreview-url'))
          .toBe(`dsh-resource://file/session/${sessionId}/${encodeURIComponent(name)}`)
        await preview.getByText(content, { exact: true }).waitFor()
        await mention.click()
        expect(await column.locator('[data-dockkit-tab]').filter({ hasText: name }).count()).toBe(1)
      }
      expect(await opened()).toHaveLength(beforePreview)
      expect(downloads).toEqual([])
      await page.getByRole('button', { name: 'Collapse right sidebar', exact: true }).click()
      const beforeReveal = (await opened()).length
      await row.locator('[data-presented-file]').filter({ hasText: 'report.txt' }).getByRole('button', { name: 'More ways to open', exact: true }).click()
      const revealResponse = page.waitForResponse(response => response.url().includes('action=reveal') && response.request().method() === 'POST')
      await page.getByRole('menuitem', { name: 'Show file location', exact: true }).click()
      expect((await revealResponse).status()).toBe(204)
      await expect.poll(opened).toHaveLength(beforeReveal + 1)
      expect((await opened()).at(-1)).toEqual({ action: 'reveal', content: null, path: await realpath(process.platform === 'darwin' ? join(cwd, 'report.txt') : cwd) })
      for (const [name, bytes] of [['report.txt', 'EDITED_REPORT\n'], ['说明.txt', 'EDITED_NOTE\n']] as const) {
        const count = (await opened()).length
        const response = page.waitForResponse(response => response.url().includes('/api/present.open?') && response.request().method() === 'POST')
        await row.locator('[data-presented-file]').filter({ hasText: name }).getByRole('button', { name: 'Open in Test Editor', exact: true }).click()
        expect((await response).status()).toBe(204)
        await page.waitForFunction(() => document.querySelector('[data-presented-files-row] button:disabled') === null)
        expect(await opened()).toHaveLength(count + 1)
        expect((await opened()).at(-1)).toEqual({ action: 'open', path: await realpath(join(cwd, name)), content: bytes })
      }
    }
    expect(downloads).toEqual([])
    const response = await page.request.get(new URL(`/api/session.export?sessionId=${sessionId}`, scaffold.authenticatedUrl).href)
    expect(response.status()).toBe(200)
    const entries = unzipSync(await response.body())
    expect(Object.keys(entries)).toHaveLength(1)
    const exported = strFromU8(Object.values(entries)[0]!)
    expect(exported).toContain('deliverables/presented')
    const declarations = exported.trim().split('\n').map(line => JSON.parse(line) as SessionEvent)
      .filter(event => event.type === 'deliverables/presented')
    expect(declarations).toHaveLength(1)
    expect(declarations[0]!.data.files).toEqual([
      { path: 'report.txt', description: 'delivered report' },
      { path: '说明.txt', description: 'delivered note' },
    ])
    expect(exported).not.toContain('EDITED_REPORT')
    if (MODE !== 'record') {
      await expect.poll(() => page.locator('[data-presented-file] [role="status"]').count(), { timeout: 10_000 }).toBe(0)
      const aria = await captureExpandedTurnProcessAria(page, '[class*="centerCol"]', scaffold.workspaceCwd)
      await compareOrRefreshGolden(join(DIR, 'ui.expected.md'), aria, MODE)
      await expandTurnProcesses(page)
      const failed = page.locator('[data-tool="present"][data-state="error"]')
      const delivered = page.locator('[data-tool="present"][data-state="ok"]')
      expect(await failed.count()).toBe(1)
      expect(await delivered.count()).toBe(1)
      expect(await failed.innerText()).toContain('Delivery failed')
      expect(await delivered.innerText()).toContain('Delivered')
      await page.locator('[data-turn-process]').click()
      const geometry = await page.evaluate(() => {
        const requiredElement = <T extends Element>(value: T | null | undefined, name: string): T => {
          if (value === null || value === undefined) throw new Error(`present layout is missing ${name}`)
          return value
        }
        const answer = requiredElement(
          [...document.querySelectorAll<HTMLElement>('[data-chat-flow-kind="assistant-step"]')]
            .find(element => element.textContent?.includes('PRESENT_DONE')),
          'final answer',
        )
        const presentedGrid = requiredElement(
          document.querySelector<HTMLElement>('[data-presented-files-row]'),
          'presented grid',
        )
        const presentedRoot = requiredElement(presentedGrid.parentElement, 'presented root')
        const turnTail = requiredElement(presentedRoot.closest<HTMLElement>('[data-turn-tail]'), 'turn tail')
        const actions = requiredElement(
          turnTail.querySelector<HTMLButtonElement>('button[aria-label="Copy"]')?.parentElement,
          'action row',
        )
        const cards = [...presentedGrid.querySelectorAll<HTMLElement>('[data-presented-file]')]
        const report = requiredElement(
          cards.find(card => card.textContent?.includes('report.txt')),
          'report card',
        )
        const title = requiredElement(
          report.querySelector<HTMLElement>('span[title="report.txt"]')
            ?? [...report.querySelectorAll<HTMLElement>('span')]
              .find(element => element.textContent === 'report.txt'),
          'report title',
        )
        const description = requiredElement(report.querySelector<HTMLElement>('[data-presented-description]'), 'report description')
        const open = requiredElement(
          report.querySelector<HTMLButtonElement>('[data-open-target] button'),
          'report open action',
        )
        const icon = requiredElement(report.querySelector<SVGElement>('svg'), 'report icon')
        const secondCard = requiredElement(cards[1], 'second card')
        const answerRect = answer.getBoundingClientRect()
        const presentedRect = presentedRoot.getBoundingClientRect()
        const actionsRect = actions.getBoundingClientRect()
        const firstCard = report.getBoundingClientRect()
        const secondCardRect = secondCard.getBoundingClientRect()
        const gridStyle = getComputedStyle(presentedGrid)
        return {
          answerToPresented: presentedRect.top - answerRect.bottom,
          presentedToActions: actionsRect.top - presentedRect.bottom,
          cardHeight: firstCard.height,
          cardColumnGap: secondCardRect.left - firstCard.right,
          gridColumnGap: gridStyle.columnGap,
          gridRowGap: gridStyle.rowGap,
          iconWidth: icon.getAttribute('width'),
          titleFontSize: getComputedStyle(title).fontSize,
          descriptionFontSize: getComputedStyle(description).fontSize,
          openFontSize: getComputedStyle(open).fontSize,
        }
      })
      expect(geometry.answerToPresented).toBeCloseTo(16, 1)
      expect(geometry.presentedToActions).toBeCloseTo(20, 1)
      expect(geometry.cardHeight).toBeCloseTo(60, 1)
      expect(geometry.cardColumnGap).toBeCloseTo(10, 1)
      expect(geometry.gridColumnGap).toBe('10px')
      expect(geometry.gridRowGap).toBe('10px')
      expect(geometry.iconWidth).toBe('20')
      expect(geometry.titleFontSize).toBe('13px')
      expect(geometry.descriptionFontSize).toBe('10px')
      expect(geometry.openFontSize).toBe('11px')
      await page.setViewportSize({ width: 480, height: 900 })
      await page.locator('[data-sidebar-collapsed="true"]').waitFor({ state: 'attached' })
      const row = page.locator('[data-presented-files-row]')
      await scrollIntoView(row)
      for (const card of await row.getByRole('button').all()) {
        const bounds = await card.boundingBox()
        expect(bounds).not.toBeNull()
        expect(bounds!.x).toBeGreaterThanOrEqual(0)
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(480)
      }
    }
    const beforeDelete = (await opened()).length
    await unlink(join(cwd, 'report.txt'))
    const missing = page.waitForResponse(response => response.url().includes('/api/present.open?') && response.request().method() === 'POST')
    await page.locator('[data-presented-file]').filter({ hasText: 'report.txt' })
      .getByRole('button', { name: 'Open in Test Editor', exact: true }).click()
    expect((await missing).status()).toBe(404)
    await page.getByText('Could not open. Click to retry.', { exact: true }).waitFor()
    expect(await opened()).toHaveLength(beforeDelete)
    expect(downloads).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  })
})
