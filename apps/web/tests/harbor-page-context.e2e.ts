/** Opt-in cross-repository acceptance of the real built Harbor consumer and real Web Host. */
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import { captureStableAria, compareOrRefreshGolden, launchWebScaffold, webSnapshotMode, type WebScaffold } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot, writeComposerDraft } from './support.ts'

const MODE = webSnapshotMode()
const PLUGIN = process.env.HARBOR_PLUGIN_ROOT
const EXPECTED = fileURLToPath(new URL('./expected/harbor-page-context/', import.meta.url))
const PROVIDER = 'synthetic-harbor-context'
const START = 'Synthetic Harbor acceptance session.'
const REPLY = 'Synthetic transport response. No evaluation or external model was run.'
const RESOLVE_CALL = ToolCallId('synthetic-harbor-resolve-trial-a')
const execute = promisify(execFile)

function normalizeHarborEvidence(value: string, job: string, workspaceId: string): string {
  return value.split(job).join('{{syntheticJob}}')
    .replace(/hctx_[A-Za-z0-9_-]{20,80}/gu, '{{snapshotToken}}')
    .split(workspaceId).join('{{workspaceId}}')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\b/gu, '{{observedAt}}')
}

interface FormalResolvedResult {
  schema: string
  context: { object: { trial?: string } }
}

/** A deterministic external transport; the Harbor package, browser, and Host are not stubbed. */
class HarborContextAdapter extends LlmAdapter {
  /** First model request for each admitted user message (excludes the tool continuation). */
  readonly requests: GenerateOptions[] = []
  formalResult: FormalResolvedResult | undefined
  private resolving = false

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    if (this.resolving) {
      const result = options.messages.flatMap(message => message.content)
        .find(block => block.type === 'tool-result' && block.toolCallId === RESOLVE_CALL)
      if (result?.type !== 'tool-result' || result.isError === true) throw new Error('Real Harbor tool result missing or failed')
      this.formalResult = JSON.parse(result.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')) as FormalResolvedResult
      this.resolving = false
    } else {
      this.requests.push(options)
      if (this.requests.length === 2) {
        const user = options.messages.filter(message => message.source.kind === 'user').at(-1)
        const content = user?.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n') ?? ''
        const token = content.match(/context-snapshot-id="(hctx_[A-Za-z0-9_-]+)"/u)?.[1]
        if (token === undefined) throw new Error('Ordinary Trial A prompt did not carry its page token')
        const args = JSON.stringify({ contextSnapshotId: token })
        this.resolving = true
        yield { type: 'block-start', index: 0, blockType: 'tool-call' }
        yield { type: 'tool-call-delta', index: 0, id: RESOLVE_CALL, name: 'harbor_resolve_page_context', argumentsDelta: args }
        yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: RESOLVE_CALL, name: 'harbor_resolve_page_context', arguments: args } }
        yield { type: 'finish', reason: { kind: 'tool-calls' } }
        return
      }
    }
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: REPLY } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

interface ResolvedContext {
  ok: boolean
  error?: { code: string }
  value?: {
    contextSnapshotId: string
    context: {
      workspace: string
      object: { kind: string; trial?: string }
      focus?: { trial?: string }
      viewState?: { filters?: { status?: string; validity?: string }; sort?: string }
    }
    selectedEvidence?: {
      ref: { kind: string }
      available: boolean
      value?: { mode: string; count: number; members: { id: string }[] }
    }[]
  }
}

describe.skipIf(MODE === 'record' || PLUGIN === undefined)('web e2e: real Harbor automatic page context (HARBOR_PLUGIN_ROOT)', () => {
  let world: string
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let fixture: { job: string; directory: string; synthetic: boolean }
  let pluginVersion: string
  let pluginClientSha256: string
  let workspaceId: string
  let evidence: { observed: Record<string, unknown>; [key: string]: unknown } | undefined
  const adapter = new HarborContextAdapter()
  const events: { sessionId: SessionId; event: SessionEvent }[] = []
  const errors: string[] = []

  beforeAll(async () => {
    if (PLUGIN === undefined) throw new Error('HARBOR_PLUGIN_ROOT must name the built dsh-plugin directory')
    const plugin = resolve(PLUGIN)
    const manifest = JSON.parse(await readFile(join(plugin, 'package.json'), 'utf8')) as { name: string; version: string }
    if (manifest.name !== 'dsh-harbor-evolution') throw new Error('HARBOR_PLUGIN_ROOT must be the real dsh-harbor-evolution package')
    pluginVersion = manifest.version
    await access(join(plugin, 'lib/client.js'))
    pluginClientSha256 = createHash('sha256').update(await readFile(join(plugin, 'lib/client.js'))).digest('hex')
    world = await mkdtemp(join(tmpdir(), 'harbor-page-context-'))
    const overlay = join(world, 'cordis.yml')
    await writeFile(overlay, `- insert:\n    - id: harbor-evolution\n      name: ${JSON.stringify(join(plugin, 'index.js'))}\n`)
    scaffold = await launchWebScaffold({ extraOverlayPath: overlay, extraInstallAnchors: [join(plugin, 'package.json')] })
    const workspace = join(scaffold.workspaceCwd, 'workspace')
    await mkdir(workspace, { recursive: true })
    const generated = await execute(process.execPath, [join(plugin, 'scripts/workbench-fixture.mjs'), workspace, '2'])
    fixture = JSON.parse(generated.stdout) as typeof fixture
    expect(fixture.synthetic).toBe(true)
    scaffold.ctx.effect(() => scaffold.ctx.llm.registerAdapter([PROVIDER], adapter), 'Harbor acceptance model transport')
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: PROVIDER, model: 'keyless' })
    scaffold.ctx.on('session/event', (session, event: SessionEvent) => { events.push({ sessionId: session.id, event }) })
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

  it('uses the viewed Trial without Ask AI, freezes identity, and keeps explicit references authoritative', async () => {
    onTestFailed(() => saveFailureShot(page, 'harbor-page-context'))
    const input = page.locator('[data-composer-input]').first()
    const normalize = (value: string): string => normalizeHarborEvidence(value, fixture.job, workspaceId)
    const screenshot = async (name: string): Promise<void> => {
      const directory = process.env.HARBOR_CONTEXT_SCREENSHOT_DIR
      if (directory === undefined) return
      await mkdir(directory, { recursive: true })
      const heading = page.locator('.hse-drawer-head')
      if (await heading.count()) await heading.scrollIntoViewIfNeeded()
      const failureState = name.startsWith('04-')
      if (failureState) {
        // Wait for the genuine toast's entrance; disabling all animations would
        // fast-forward its delayed fade and erase the failure from the image.
        const notice = page.getByRole('alert').filter({ hasText: 'Could not attach the Harbor page' })
        await expect.poll(() => notice.evaluate(element => getComputedStyle(element).opacity), { timeout: 2_000 }).toBe('1')
      }
      await page.screenshot({ path: join(directory, name), fullPage: true, animations: failureState ? 'allow' : 'disabled' })
    }
    const send = async (draft: string): Promise<SessionId> => {
      await writeComposerDraft(page, input, draft)
      const settled = scaffold.whenTurnSettled()
      await input.press('Enter')
      return await settled
    }
    const userContent = (index: number) => adapter.requests[index]?.messages.filter(message => message.source.kind === 'user').at(-1)?.content ?? []
    const tokens = (index: number): string[] => userContent(index).flatMap(block => block.type === 'text'
      ? [...block.text.matchAll(/context-snapshot-id="(hctx_[A-Za-z0-9_-]+)"/gu)].map(match => match[1]!) : [])
    const resolveContext = async (sessionId: SessionId, token: string): Promise<ResolvedContext> => {
      const response = await scaffold.hostFetch('/_dsh/harbor-evolution/session-context-resolve', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, contextSnapshotId: token }),
      })
      return await response.json() as ResolvedContext
    }
    const openTrial = async (trial: string): Promise<void> => {
      await page.locator('.hse-trial-name').getByRole('button', { name: trial, exact: true }).click()
      await page.locator('.hse-trial-detail').getByText(`${trial}: 结果是 42。`, { exact: false }).first().waitFor()
    }

    const sessionA = await send(START)
    await page.getByRole('tab', { name: 'Harbor', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Attach current page on send', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Open latest result', exact: true }).click()
    await page.getByRole('button', { name: 'Tasks & scores', exact: true }).click()
    await openTrial('hfq-021')
    const previewContrast = await page.locator('.hse-trial-detail .hse-document').evaluate((element) => {
      const luminance = (color: string): number => {
        const channels = color.match(/[\d.]+/gu)?.map(Number)
        if (channels === undefined || channels.length < 3 || (channels[3] !== undefined && channels[3] !== 1)) {
          throw new Error(`Contrast measurement requires an opaque RGB color: ${color}`)
        }
        const linear = channels.slice(0, 3).map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
      }
      const background = getComputedStyle(element).backgroundColor
      const backgroundLuminance = luminance(background)
      return ['pre', 'h4'].map((selector) => {
        const text = element.querySelector(selector)
        if (text === null) throw new Error(`Document preview is missing ${selector}`)
        const color = getComputedStyle(text).color
        const foreground = luminance(color)
        return { selector, color, background,
          ratio: (Math.max(foreground, backgroundLuminance) + 0.05) / (Math.min(foreground, backgroundLuminance) + 0.05) }
      })
    })
    for (const measurement of previewContrast) expect(measurement.ratio).toBeGreaterThanOrEqual(4.5)
    await writeComposerDraft(page, input, 'Why did this trial lose points?')
    expect(await input.textContent()).toBe('Why did this trial lose points?')
    expect(await input.locator('[data-composer-chip="harbor"]').count()).toBe(0)
    await screenshot('01-synthetic-trial-a-ordinary-question.png')
    const settledA = scaffold.whenTurnSettled()
    await input.press('Enter')
    await settledA
    expect(adapter.formalResult?.schema).toBe('harbor-resolved-context/v1')
    expect(adapter.formalResult?.context.object.trial).toBe('hfq-021')
    const toolCall = events.find(item => item.event.type === 'tool/call' && item.event.data.callId === RESOLVE_CALL)
    const toolResult = events.find(item => item.event.type === 'tool/result' && item.event.data.message.source.callId === RESOLVE_CALL)
    expect(toolCall?.sessionId).toBe(sessionA)
    expect(toolResult?.sessionId).toBe(sessionA)
    expect(tokens(1)).toHaveLength(1)
    const tokenA = tokens(1)[0]!
    await openTrial('hfq-034')
    const resolvedA = await resolveContext(sessionA, tokenA)
    expect(resolvedA.ok).toBe(true)
    if (resolvedA.value === undefined) throw new Error('The real Harbor resolver did not return its workspace identity')
    workspaceId = resolvedA.value.context.workspace
    expect(workspaceId).toMatch(/^workspace-[a-f0-9]{12}$/u)
    expect(resolvedA.value?.context.object.trial).toBe('hfq-021')
    await send('Explain the trial currently open now.')
    const resolvedB = await resolveContext(sessionA, tokens(2)[0]!)
    expect(resolvedB.value?.context.object.trial).toBe('hfq-034')

    await page.getByRole('tab', { name: 'Chat', exact: true }).click()
    await page.getByText(REPLY, { exact: true }).last().waitFor()
    expect(await page.locator('[class*="userRow"]').count()).toBe(3)
    expect(await page.locator('[data-page-context="harbor-page"]:not([open])').count()).toBe(2)
    expect(await page.locator('[class*="userRow"]').allInnerTexts()).not.toEqual(expect.arrayContaining([expect.stringContaining('<harbor-context-ref')]))
    expect(await page.locator('[class*="userRow"]').allInnerTexts()).not.toEqual(expect.arrayContaining([expect.stringContaining('<dsh-page-context')]))
    const attachments = page.locator('[data-page-context="harbor-page"]')
    expect(await attachments.nth(0).locator('summary').innerText()).toBe('Harbor · hfq-021')
    expect(await attachments.nth(1).locator('summary').innerText()).toBe('Harbor · hfq-034')
    await attachments.nth(0).locator('summary').click()
    const capturedDescriptionA = await attachments.nth(0).locator('pre').innerText()
    expect(capturedDescriptionA).toContain('hfq-021')
    expect(capturedDescriptionA).not.toContain('hfq-034')
    expect(capturedDescriptionA).not.toContain('hctx_')
    expect(capturedDescriptionA).not.toContain('<harbor-context-ref')
    await page.reload({ waitUntil: 'load' })
    await attachments.nth(0).locator('summary').waitFor()
    expect(await attachments.nth(0).locator('summary').innerText()).toBe('Harbor · hfq-021')
    await attachments.nth(0).locator('summary').click()
    expect(await attachments.nth(0).locator('pre').innerText()).toBe(capturedDescriptionA)
    await screenshot('02-synthetic-native-conversation.png')
    await attachments.nth(0).locator('summary').click()
    await send('This question is outside Harbor.')
    expect(tokens(3)).toEqual([])
    await compareOrRefreshGolden(join(EXPECTED, 'conversation.expected.md'),
      normalize(await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd)), MODE)

    await page.getByRole('tab', { name: 'Harbor', exact: true }).click()
    await page.getByRole('button', { name: 'Open latest result', exact: true }).click()
    await page.getByRole('button', { name: 'Tasks & scores', exact: true }).click()
    await openTrial('hfq-021')
    await writeComposerDraft(page, input, '@harbor')
    const menu = page.getByRole('listbox', { name: 'Trigger suggestions', exact: true })
    await menu.getByRole('option').filter({ has: page.getByText('harbor', { exact: true }) })
      .filter({ hasText: 'hfq-021' }).click()
    await input.locator('[data-composer-chip="harbor"]').waitFor()
    expect(await input.locator('[data-composer-chip="harbor"]').innerText()).toContain('hfq-021')
    await openTrial('hfq-034')
    await input.click()
    await input.press('End')
    await page.keyboard.type(' Explain the explicitly referenced trial A.')
    await screenshot('03-synthetic-explicit-a-overrides-page-b.png')
    const explicitSettled = scaffold.whenTurnSettled()
    await input.press('Enter')
    await explicitSettled
    expect(tokens(4)).toHaveLength(1)
    expect(JSON.stringify(userContent(4))).not.toContain('<dsh-page-context')
    expect((await resolveContext(sessionA, tokens(4)[0]!)).value?.context.object.trial).toBe('hfq-021')

    // Make the selected Job genuinely unavailable in the owned fixture tree.
    // The real Harbor route must reject preparation, rather than sending without context.
    const unavailable = `${fixture.directory}-temporarily-unavailable`
    await rename(fixture.directory, unavailable)
    try {
      await writeComposerDraft(page, input, 'Keep my question if this page cannot be attached.')
      await input.press('Enter')
      await page.getByText('Could not attach the Harbor page; the message was not sent.', { exact: false }).waitFor()
      expect(await input.textContent()).toBe('Keep my question if this page cannot be attached.')
      expect(await input.getAttribute('contenteditable')).toBe('true')
      expect(adapter.requests).toHaveLength(5)
      await screenshot('04-synthetic-failure-preserves-draft.png')
      await compareOrRefreshGolden(join(EXPECTED, 'failed-draft.expected.md'), [
        'Fixture fault: selected synthetic Job directory temporarily renamed.',
        `Composer: ${await input.textContent()}`,
        `Editable: ${await input.getAttribute('contenteditable')}`,
        `Model requests: ${adapter.requests.length} (unchanged)`,
      ].join('\n'), MODE)
    } finally { await rename(unavailable, fixture.directory) }
    const retrySettled = scaffold.whenTurnSettled()
    await input.press('Enter')
    await retrySettled
    expect((await resolveContext(sessionA, tokens(5)[0]!)).value?.context.object.trial).toBe('hfq-034')

    await page.getByRole('button', { name: 'New session', exact: true }).last().click()
    await page.locator('[data-composer-input][contenteditable="true"][data-placeholder="Describe what you want to build... / commands, @ files or sessions"]')
      .waitFor()
    const sessionB = await send('Second synthetic Harbor acceptance session.')
    expect(sessionB).not.toBe(sessionA)
    expect(tokens(6)).toEqual([])
    const crossSession = await resolveContext(sessionB, tokenA)
    expect(crossSession.ok).toBe(false)
    expect(crossSession.error?.code).toBe('HARBOR_CONTEXT_SESSION_MISMATCH')
    await page.getByRole('tab', { name: 'Harbor', exact: true }).click()
    await page.getByRole('button', { name: 'Open latest result', exact: true }).waitFor()
    await send('Which Harbor page is active in this new session?')
    const secondContext = await resolveContext(sessionB, tokens(7)[0]!)
    expect(secondContext.ok).toBe(true)
    expect(secondContext.value?.context.object.kind).toBe('harbor.workspace/v1')
    expect(secondContext.value?.context.focus?.trial).toBeUndefined()

    const userEvents = events.filter(item => item.event.type === 'user/message' && item.event.data.source.kind === 'user')
    expect(userEvents).toHaveLength(adapter.requests.length)
    const durable = userEvents.map(item => item.event.type === 'user/message' ? item.event.data.content : [])
    expect(adapter.requests.map((_, index) => userContent(index))).toEqual(durable)
    expect(userEvents.slice(0, 6).every(item => item.sessionId === sessionA)).toBe(true)
    expect(userEvents.slice(6).every(item => item.sessionId === sessionB)).toBe(true)
    await compareOrRefreshGolden(join(EXPECTED, 'model-and-log.expected.md'), normalize(JSON.stringify(durable, null, 2)), MODE)
    expect(errors).toEqual([])
    const evidencePath = process.env.HARBOR_CONTEXT_EVIDENCE_PATH
    if (evidencePath !== undefined) {
      evidence = {
        schema: 'harbor-automatic-page-context-acceptance/v1',
        generatedAt: new Date().toISOString(),
        pluginVersion,
        pluginClientSha256,
        nodeVersion: process.version,
        synthetic: true,
        controlledModel: `${PROVIDER}/keyless`,
        realProviderUsed: false,
        composition: 'real Loader, built Harbor client, real Composer, Host admission, real Harbor resolver tool, durable Session log',
        observed: {
          ordinaryAWithoutAskAiOrAt: resolvedA.value?.context.object.trial,
          ordinaryBAfterNavigation: resolvedB.value?.context.object.trial,
          modelRequestedRealTool: toolCall?.event.type === 'tool/call' ? toolCall.event.data.name : undefined,
          realToolReturnedTrial: adapter.formalResult?.context.object.trial,
          formalToolStayedInSendingSession: toolCall?.sessionId === sessionA && toolResult?.sessionId === sessionA,
          outsideHarborTokens: tokens(3).length,
          explicitReferenceOnly: tokens(4).length === 1 && !JSON.stringify(userContent(4)).includes('<dsh-page-context'),
          failedPreparationAdmittedMessage: false,
          failedDraftRetained: true,
          attachmentLabelsIdentifyTrials: true,
          firstAttachmentDescriptionStableAfterNavigationAndReload: true,
          documentPreviewContrast: previewContrast,
          secondSessionRejectedFirstToken: crossSession.error?.code,
          secondSessionPageKind: secondContext.value?.context.object.kind,
          admittedMessages: durable.length,
          modelContentEqualsDurableUserMessages: true,
        },
        messages: JSON.parse(normalize(JSON.stringify(durable))) as unknown,
      }
    }
  })

  it('freezes checked Trials and list filters when an ordinary question is sent', async () => {
    onTestFailed(() => saveFailureShot(page, 'harbor-page-context-selection'))
    const input = page.locator('[data-composer-input]').first()
    const firstRequest = adapter.requests.length
    const resolveRequest = async (index: number, sessionId: SessionId): Promise<ResolvedContext> => {
      const content = adapter.requests[index]?.messages.filter(message => message.source.kind === 'user').at(-1)?.content ?? []
      const tokens = content.flatMap(block => block.type === 'text'
        ? [...block.text.matchAll(/context-snapshot-id="(hctx_[A-Za-z0-9_-]+)"/gu)].map(match => match[1]!) : [])
      expect(tokens).toHaveLength(1)
      const response = await scaffold.hostFetch('/_dsh/harbor-evolution/session-context-resolve', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, contextSnapshotId: tokens[0] }),
      })
      const value = await response.json() as ResolvedContext
      expect(value.ok).toBe(true)
      return value
    }
    const send = async (draft: string): Promise<SessionId> => {
      await writeComposerDraft(page, input, draft)
      expect(await input.locator('[data-composer-chip="harbor"]').count()).toBe(0)
      const settled = scaffold.whenTurnSettled()
      await input.press('Enter')
      return await settled
    }
    await page.getByRole('button', { name: 'Open latest result', exact: true }).click()
    await page.getByRole('button', { name: 'Tasks & scores', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Select Trial hfq-021', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Select Trial hfq-034', exact: true }).check()
    const sessionId = await send('Compare the two trials I checked.')
    const checked = await resolveRequest(firstRequest, sessionId)
    const checkedSet = checked.value?.selectedEvidence?.find(item => item.ref.kind === 'trial-set')
    expect(checkedSet?.available).toBe(true)
    expect(checkedSet?.value?.mode).toBe('explicit')
    expect(checkedSet?.value?.members.map(member => member.id)).toEqual(['hfq-021', 'hfq-034'])

    await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
    const filters = page.locator('.hse-trial-tools select')
    await filters.nth(0).selectOption('completed')
    await filters.nth(1).selectOption('true')
    await filters.nth(2).selectOption('lowest-score')
    await expect.poll(() => page.locator('.hse-trial-name').count()).toBe(2)
    expect(await page.locator('.hse-table input[type="checkbox"]:checked').count()).toBe(0)
    await send('Explain this filtered and sorted trial list.')
    const filtered = await resolveRequest(firstRequest + 1, sessionId)
    expect(filtered.value?.context.object.kind).toBe('harbor.job/v1')
    expect(filtered.value?.context.viewState).toMatchObject({
      filters: { status: 'completed', validity: 'true' }, sort: 'lowest-score',
    })
    expect(filtered.value?.selectedEvidence ?? []).toEqual([])
    // Editing current filters must not rewrite the sent context or frozen set.
    await filters.nth(0).selectOption('')
    await filters.nth(1).selectOption('')
    await filters.nth(2).selectOption('dataset-order')
    expect((await resolveRequest(firstRequest, sessionId)).value?.selectedEvidence).toEqual(checked.value?.selectedEvidence)
    expect((await resolveRequest(firstRequest + 1, sessionId)).value?.context.viewState).toEqual(filtered.value?.context.viewState)

    // Restart the actual Loader contribution. Its new service instances have
    // empty process caches and must recover these same Session-owned snapshots.
    const entry = [...scaffold.ctx.loader.entries()].find(item => item.options.id === 'harbor-evolution')
    if (entry === undefined) throw new Error('Real Harbor Loader entry is missing')
    const originalFiber = entry.fiber
    await scaffold.ctx.loader.update(entry.id, { disabled: true })
    await scaffold.ctx.loader.await()
    expect(entry.fiber).toBeUndefined()
    await scaffold.ctx.loader.update(entry.id, { disabled: false })
    await scaffold.ctx.loader.await()
    expect(entry.fiber).toBeDefined()
    expect(entry.fiber).not.toBe(originalFiber)
    expect((await resolveRequest(firstRequest, sessionId)).value?.selectedEvidence).toEqual(checked.value?.selectedEvidence)
    expect((await resolveRequest(firstRequest + 1, sessionId)).value?.context.viewState).toEqual(filtered.value?.context.viewState)

    const userEvents = events.filter(item => item.event.type === 'user/message' && item.event.data.source.kind === 'user')
    const durable = userEvents.map(item => item.event.type === 'user/message' ? item.event.data.content : [])
    expect(adapter.requests.map(request => request.messages.filter(message => message.source.kind === 'user').at(-1)?.content)).toEqual(durable)
    const observations = {
      ordinaryCheckedMembers: checkedSet?.value?.members.map(member => member.id),
      ordinaryListViewState: filtered.value?.context.viewState,
      listFilterCreatedNoImplicitSelection: true,
      membershipStableAfterFilterChange: true,
      realHarborPluginReloadRecoveredSnapshotAndSelection: true,
      modelContentEqualsDurableUserMessages: true,
    }
    await page.getByRole('tab', { name: 'Chat', exact: true }).click()
    const selectedAttachment = page.locator('[data-page-context="harbor-page"]')
      .filter({ hasText: 'Harbor · Selected 2' })
    await selectedAttachment.locator('summary').click()
    const selectedDescription = await selectedAttachment.locator('pre').innerText()
    expect(selectedDescription).toContain('hfq-021')
    expect(selectedDescription).toContain('hfq-034')
    expect(selectedDescription).not.toContain('hctx_')
    const filteredAttachment = page.locator('[data-page-context="harbor-page"]').last()
    await filteredAttachment.locator('summary').click()
    expect(await filteredAttachment.locator('pre').innerText()).toContain('completed')
    expect(await filteredAttachment.locator('pre').innerText()).not.toContain('<harbor-context-ref')
    const scrollport = page.locator('[data-conversation-scroll]')
    await scrollport.evaluate((element) => { element.scrollTop = element.scrollHeight })
    await expect.poll(() => scrollport.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop))
      .toBeLessThanOrEqual(1)
    await page.getByRole('button', { name: 'Back to bottom', exact: true }).waitFor({ state: 'hidden' })
    await compareOrRefreshGolden(join(EXPECTED, 'selection.expected.md'), [
      JSON.stringify(observations, null, 2),
      normalizeHarborEvidence(await captureStableAria(page, '[class*="centerCol"]', scaffold.workspaceCwd), fixture.job, workspaceId),
    ].join('\n\n'), MODE)
    expect(errors).toEqual([])
    const directory = process.env.HARBOR_CONTEXT_SCREENSHOT_DIR
    if (directory !== undefined) {
      await mkdir(directory, { recursive: true })
      await page.screenshot({ path: join(directory, '06-synthetic-selection-and-filter-attachments.png'), animations: 'disabled' })
    }
    const evidencePath = process.env.HARBOR_CONTEXT_EVIDENCE_PATH
    if (evidencePath !== undefined) {
      if (evidence === undefined) throw new Error('Initial Harbor acceptance did not complete')
      await mkdir(dirname(evidencePath), { recursive: true })
      await writeFile(evidencePath, JSON.stringify({
        ...evidence,
        generatedAt: new Date().toISOString(),
        observed: { ...evidence.observed, ...observations, admittedMessages: durable.length },
        messages: JSON.parse(normalizeHarborEvidence(JSON.stringify(durable), fixture.job, workspaceId)) as unknown,
      }, null, 2) + '\n')
    }
  })
})
