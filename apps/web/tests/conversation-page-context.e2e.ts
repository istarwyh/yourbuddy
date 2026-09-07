/** Keyless public page-context admission through Loader, Composer, and the durable Host log. */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { captureStableAria, compareOrRefreshGolden, launchWebScaffold, webSnapshotMode, type WebScaffold } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot, writeComposerDraft } from './support.ts'

const MODE = webSnapshotMode()
const FIXTURE = fileURLToPath(new URL('./fixtures/conversation-page-context/', import.meta.url))
const EXPECTED = fileURLToPath(new URL('./expected/conversation-page-context/', import.meta.url))
const PROVIDER = 'synthetic-page-context'
const PNG = fileURLToPath(new URL('../../../snapshots/session/read-image/workspace/red.png', import.meta.url))
const contextText = (trial: string): string =>
  `<dsh-page-context source="test-conversation-page-context" label="Synthetic page">\nSynthetic page context: trial ${trial}.\n</dsh-page-context>`

/** Only the external model transport is replaced; admission and logging remain real. */
class ContextAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Synthetic response. No evaluation was run.' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

describe.skipIf(MODE === 'record')('web e2e: ordinary-message page context', () => {
  let world: string
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  const adapter = new ContextAdapter()
  const events: SessionEvent[] = []
  const errors: string[] = []

  beforeAll(async () => {
    world = await mkdtemp(join(tmpdir(), 'conversation-page-context-'))
    const overlay = join(world, 'cordis.yml')
    await writeFile(overlay, `- insert:\n    - id: synthetic-page-context\n      name: ${JSON.stringify(join(FIXTURE, 'index.js'))}\n`)
    scaffold = await launchWebScaffold({ extraOverlayPath: overlay, extraInstallAnchors: [join(FIXTURE, 'package.json')] })
    scaffold.ctx.effect(() => scaffold.ctx.llm.registerAdapter([PROVIDER], adapter), 'page-context model transport')
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: 'keyless' })
    scaffold.ctx.on('session/event', (_session, event: SessionEvent) => { events.push(event) })
    const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
    browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
    page = await newEnglishPage(browser)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await mkdir(EXPECTED, { recursive: true })
  })

  afterAll(async () => {
    try { await browser?.close() }
    finally {
      try { await scaffold?.close() }
      finally { if (world !== undefined) await rm(world, { recursive: true, force: true }) }
    }
  })

  it('captures A before async work, ignores inactive views, and preserves a failed draft', async () => {
    onTestFailed(() => saveFailureShot(page, 'conversation-page-context'))
    const input = page.locator('[data-composer-input]').first()
    const send = async (draft: string): Promise<void> => {
      const settled = scaffold.whenTurnSettled()
      await writeComposerDraft(page, input, draft)
      await input.press('Enter')
      await settled
    }
    await send('Start the synthetic acceptance session.')
    await page.getByRole('tab', { name: 'Synthetic context', exact: true }).click()
    await page.getByRole('button', { name: 'Hold next preparation', exact: true }).click()
    await writeComposerDraft(page, input, 'Why did this trial fail?')
    const settled = scaffold.whenTurnSettled()
    await input.press('Enter')
    await page.getByRole('button', { name: 'Release prepared trial A', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Open trial B', exact: true }).click()
    await page.getByRole('button', { name: 'Release prepared trial A', exact: true }).click()
    await settled

    await page.getByRole('tab', { name: 'Chat', exact: true }).click()
    await send('This message is outside the synthetic page.')
    await page.getByRole('tab', { name: 'Synthetic context', exact: true }).click()
    await page.getByRole('button', { name: 'Fail next preparation', exact: true }).click()
    const countBeforeFailure = adapter.requests.length
    await writeComposerDraft(page, input, 'Keep this question when preparation fails.')
    await input.press('Enter')
    const failureNotice = page.getByText('Synthetic context preparation failed. Draft retained.', { exact: true })
    await failureNotice.waitFor()
    expect(await input.textContent()).toBe('Keep this question when preparation fails.')
    expect(await input.getAttribute('contenteditable')).toBe('true')
    expect(adapter.requests).toHaveLength(countBeforeFailure)
    await compareOrRefreshGolden(join(EXPECTED, 'failure.expected.md'),
      `${await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd)}\n\nNotice: ${await failureNotice.innerText()}`, MODE)

    const retrySettled = scaffold.whenTurnSettled()
    await input.press('Enter')
    await retrySettled
    const userEvents = events.filter(event => event.type === 'user/message' && event.data.source.kind === 'user')
    expect(userEvents).toHaveLength(4)
    const durable = userEvents.map(event => event.type === 'user/message' ? event.data.content : [])
    const visibleToModel = adapter.requests.map(request => request.messages.filter(message => message.source.kind === 'user').at(-1)?.content)
    expect(visibleToModel).toEqual(durable)
    expect(durable).toEqual([
      [{ type: 'text', text: 'Start the synthetic acceptance session.' }],
      [{ type: 'text', text: 'Why did this trial fail?' }, { type: 'text', text: contextText('A') }],
      [{ type: 'text', text: 'This message is outside the synthetic page.' }],
      [{ type: 'text', text: 'Keep this question when preparation fails.' }, { type: 'text', text: contextText('B') }],
    ])
    await compareOrRefreshGolden(join(EXPECTED, 'model-and-log.expected.md'), JSON.stringify(durable, null, 2), MODE)
    expect(errors).toEqual([])
  })

  it('keeps an image-only draft and its page attachment in the same admitted message', async () => {
    onTestFailed(() => saveFailureShot(page, 'conversation-page-context-image'))
    const input = page.locator('[data-composer-input]').first()
    await writeComposerDraft(page, input, '')
    const bytes = await readFile(PNG)
    await input.evaluate((surface, data) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([new Uint8Array(data)], 'synthetic-context.png', { type: 'image/png' }))
      surface.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: transfer, bubbles: true, cancelable: true,
      }))
    }, [...bytes])
    await page.getByRole('img', { name: 'synthetic-context.png', exact: true }).waitFor()
    const settled = scaffold.whenTurnSettled()
    await input.press('Enter')
    await settled
    const durable = events.filter(event => event.type === 'user/message' && event.data.source.kind === 'user').at(-1)
    if (durable?.type !== 'user/message') throw new Error('image-only message was not admitted')
    const model = adapter.requests.at(-1)?.messages.filter(message => message.source.kind === 'user').at(-1)?.content
    expect(model).toEqual(durable.data.content)
    expect(durable.data.content.map(block => block.type)).toEqual(['image', 'text', 'text'])
    expect(durable.data.content.filter(block => block.type === 'text').map(block => block.text)).toEqual(['', contextText('B')])
    expect(JSON.stringify(durable.data.content)).not.toContain('base64')
    await page.getByRole('tab', { name: 'Chat', exact: true }).click()
    await page.locator('[class*="userRow"] img').last().waitFor()
    const imageRow = page.locator('[class*="userRow"]').filter({ has: page.locator('img') }).last()
    expect(await imageRow.locator('[data-page-context="test-conversation-page-context"]:not([open])').count()).toBe(1)
    expect(await imageRow.innerText()).not.toContain('<dsh-page-context')
    expect(await imageRow.innerText()).not.toContain('Synthetic page context: trial B.')
    await compareOrRefreshGolden(join(EXPECTED, 'image.expected.md'),
      await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd), MODE)
    const directory = process.env.HARBOR_CONTEXT_SCREENSHOT_DIR
    if (directory !== undefined) {
      await mkdir(directory, { recursive: true })
      await page.screenshot({ path: join(directory, '05-synthetic-image-with-page-context.png'), animations: 'disabled' })
    }
    expect(errors).toEqual([])
  })

  it('keeps a later draft while the earlier send fails and explicitly recovers the unsent question', async () => {
    onTestFailed(() => saveFailureShot(page, 'conversation-page-context-recovery'))
    const input = page.locator('[data-composer-input]').first()
    const draftA = 'Question A failed while I wrote question B.'
    const draftB = 'Question B was written during preparation.'
    const before = adapter.requests.length
    await page.getByRole('tab', { name: 'Synthetic context', exact: true }).click()
    await page.getByRole('button', { name: 'Open trial A', exact: true }).click()
    await page.getByRole('button', { name: 'Hold next preparation', exact: true }).click()
    await writeComposerDraft(page, input, draftA)
    await input.press('Enter')
    await page.getByRole('button', { name: 'Reject prepared trial A', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Open trial B', exact: true }).click()
    await writeComposerDraft(page, input, draftB)
    await page.getByRole('button', { name: 'Reject prepared trial A', exact: true }).click()
    const recovery = page.locator('[data-failed-submission]').filter({ hasText: draftA })
    await recovery.waitFor()
    expect(await input.textContent()).toBe(draftB)
    expect(adapter.requests).toHaveLength(before)
    await recovery.locator('summary').click()
    const restore = recovery.getByRole('button', { name: 'Restore to composer', exact: true })
    expect(await restore.isDisabled()).toBe(true)
    await recovery.getByText('Send or move the current draft before restoring this message. Images stay with their own message.', { exact: true }).waitFor()
    await compareOrRefreshGolden(join(EXPECTED, 'recovery-occupied.expected.md'),
      await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd), MODE)
    const directory = process.env.HARBOR_CONTEXT_SCREENSHOT_DIR
    if (directory !== undefined) {
      await mkdir(directory, { recursive: true })
      await page.screenshot({ path: join(directory, '07-synthetic-failed-a-preserves-draft-b.png'), animations: 'disabled' })
    }

    const settledB = scaffold.whenTurnSettled()
    await input.press('Enter')
    await settledB
    await expect.poll(() => restore.isEnabled()).toBe(true)
    expect(await recovery.innerText()).toContain(draftA)
    await restore.click()
    await page.getByText('Message restored, not sent. Sending again captures the page open at that time.', { exact: true }).waitFor()
    expect(await input.textContent()).toBe(draftA)
    expect(adapter.requests).toHaveLength(before + 1)
    expect(await page.locator('[data-failed-submission]').count()).toBe(0)
    await compareOrRefreshGolden(join(EXPECTED, 'recovery-restored.expected.md'),
      await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd), MODE)
    const settledA = scaffold.whenTurnSettled()
    await input.press('Enter')
    await settledA
    const durable = events.filter(event => event.type === 'user/message' && event.data.source.kind === 'user')
      .map(event => event.type === 'user/message' ? event.data.content : [])
    const model = adapter.requests.map(request => request.messages.filter(message => message.source.kind === 'user').at(-1)?.content)
    expect(model).toEqual(durable)
    expect(durable.slice(before)).toEqual([
      [{ type: 'text', text: draftB }, { type: 'text', text: contextText('B') }],
      [{ type: 'text', text: draftA }, { type: 'text', text: contextText('B') }],
    ])
    await compareOrRefreshGolden(join(EXPECTED, 'recovery-model-and-log.expected.md'), JSON.stringify(durable.slice(before), null, 2), MODE)
    expect(errors).toEqual([])
    const evidencePath = process.env.HARBOR_HOST_CONTEXT_EVIDENCE_PATH
    if (evidencePath !== undefined) {
      await mkdir(dirname(evidencePath), { recursive: true })
      await writeFile(evidencePath, JSON.stringify({
        synthetic: true,
        controlledModel: `${PROVIDER}/keyless`,
        realProviderUsed: false,
        failedAWhileTypingB: true,
        currentDraftBUnaffected: true,
        restoreDisabledWhileBOccupiedComposer: true,
        failedARemainedAvailableAfterBSent: true,
        recoveryDidNotSend: true,
        retryCapturedCurrentPage: 'B',
        modelContentEqualsDurableUserMessages: true,
        messages: durable.slice(before),
      }, null, 2) + '\n')
    }
  })
})
