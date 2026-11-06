/** Verify an installed design pair through the actual CLI Loader, tool, routes, and Client. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm, access, realpath } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createReleaseChildEnvironment, authenticateHost, waitForClose, desktopWebviewCookie } from './verify-product-release.mjs'
import { observeDesignClient, saveDesignClientFailure } from './design-client-evidence.mjs'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(process.env.YOURBUDDY_DESIGN_HARNESS ?? join(desktopRoot, 'bundled/harness'))
const world = await mkdtemp(join(tmpdir(), 'yourbuddy-design-runtime-'))
const folder = join(world, 'canvas')
const env = createReleaseChildEnvironment(world, join(world, 'runtime'))
const hostOnly = process.argv.includes('--host-only')
const children = []

/** Start only the supported Web profile with an isolated test overlay and home. */
async function startHost(overlay) {
  const child = spawn(process.execPath, [join(root, 'apps/cli/lib/bin.js'), 'web', '--patch', overlay, '--no-open', '--host', '127.0.0.1', '--port', '0'], {
    cwd: world, env, stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.push(child)
  let output = '', errors = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { errors += chunk })
  const url = await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error(`Host readiness timeout: ${errors}`)), 60000)
    child.stdout.on('data', () => {
      const match = output.match(/dsh web: (http:\/\/[^\s]+)/u)
      if (match) { clearTimeout(timer); resolveReady(match[1]) }
    })
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Host exited ${code}: ${errors}`)) })
  })
  const { baseUrl, cookie } = await authenticateHost(url)
  return {
    url, baseUrl, cookie, child, errors: () => errors,
    async call(path, method = 'GET') {
      const response = await fetch(baseUrl + path, { headers: { cookie }, method })
      const body = await response.text()
      assert.equal(response.status, 200, body)
      return JSON.parse(body)
    },
    async stop() {
      child.kill('SIGTERM')
      const result = await waitForClose(child, 10000)
      assert.equal(result.timedOut, false, 'Host did not stop')
    },
  }
}

/** Execute the installed upstream Client in a clean, authenticated Chromium profile. */
async function verifyClient(host, expectArtifacts, editorUrl) {
  const phase = expectArtifacts ? 'design-client' : 'design-failure-isolation'
  let stage = 'launch', browser, page, evidence, failure
  try {
    browser = await chromium.launch({
      headless: true, env,
      executablePath: process.env.YOURBUDDY_RELEASE_CHROMIUM_EXECUTABLE ?? chromium.executablePath(),
    })
    const context = await browser.newContext({ locale: 'en-US' })
    await context.addCookies([desktopWebviewCookie(host.url, host.cookie)])
    page = await context.newPage()
    evidence = observeDesignClient(page)
    const artifacts = []
    page.on('response', response => {
      if (response.url().includes('dsh-claude-artifacts')) artifacts.push(response.status())
    })
    stage = 'workbench-boot'
    await page.goto(host.baseUrl)
    await page.locator('[class*="frame"]').first().waitFor({ timeout: 30000 })
    assert.equal(await page.getByText('Failed to load plugins', { exact: true }).count(), 0)
    if (expectArtifacts) {
      assert(artifacts.includes(200), 'The artifacts Client was not loaded')
      stage = 'onboarding'
      // Match the existing release smoke's optional first-launch onboarding.
      for (const name of ['Continue', 'Configure later']) {
        const action = page.getByRole('button', { name, exact: true })
        const appeared = await action.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)
        if (appeared) {
          await action.click()
          await action.waitFor({ state: 'detached', timeout: 10000 })
        }
      }
      const artifactsButton = page.getByRole('button', { name: 'Artifacts', exact: true })
      stage = 'artifacts-page'
      await artifactsButton.click()
      const artifactsPage = page.getByTestId('baoyu-design-artifacts')
      await artifactsPage.waitFor({ timeout: 10000 })
      stage = 'create-design-draft'
      await artifactsPage.locator('button.bda-tile[data-skill="claude-design"]').click()
      const composer = page.locator('[data-composer-input]')
      await composer.waitFor({ state: 'visible', timeout: 10000 })
      await page.waitForFunction(() => document.querySelector('[data-composer-input]')?.textContent?.includes('/claude-design Design this for me:'))
      // Nothing is sent to a model. Return to the real artifact and use its managed action.
      stage = 'open-managed-editor'
      await artifactsButton.click()
      await artifactsPage.waitFor({ timeout: 10000 })
      const loaded = page.waitForResponse(response => response.url() === editorUrl
        && response.request().resourceType() === 'document' && response.status() === 200)
      await artifactsPage.locator('button.bda-card, button.bda-row').filter({ hasText: 'Two boards' }).click()
      await loaded
      const iframe = page.locator('iframe[data-sidebar-browser-frame="iframe"]')
      await iframe.waitFor({ state: 'visible', timeout: 10000 })
      assert.equal(await iframe.getAttribute('src'), editorUrl)
      const sandbox = await iframe.getAttribute('sandbox')
      assert(sandbox?.includes('allow-scripts'), 'The editor must retain the existing sandbox')
      assert(!sandbox.includes('allow-downloads'), 'The smoke must not relax download policy')
      assert.equal(context.pages().length, 1, 'Managed open must not fall back to an external tab')
      console.log('Chromium executed the installed Artifacts Client, created an unsent draft, and opened the managed sandboxed editor.')
    }
    stage = 'client-errors'
    assert.deepEqual(evidence.pageErrors, [])
    if (process.env.YOURBUDDY_DESIGN_SCREENSHOT) await page.screenshot({ path: process.env.YOURBUDDY_DESIGN_SCREENSHOT })
  } catch (error) {
    failure = error
    await saveDesignClientFailure(page, process.env.YOURBUDDY_DESIGN_EVIDENCE_DIR, {
      phase, stage, error: error instanceof Error ? error.stack : String(error), ...evidence,
    })
  }
  try { await browser?.close() }
  catch (error) {
    if (failure) throw new AggregateError([failure, error], 'Design Client acceptance and browser teardown failed')
    throw error
  }
  if (failure) throw failure
}

try {
  await mkdir(join(folder, 'project'), { recursive: true })
  await writeFile(join(folder, 'project/canvas.json'), JSON.stringify({
    v: 3, title: 'Two boards', pages: [], boards: {
      'Main.dc.html': { x: 0, y: 0, w: 400, h: 300 }, 'Second.dc.html': { x: 480, y: 0, w: 400, h: 300 },
    }, order: ['Main.dc.html', 'Second.dc.html'], notes: {}, designSystems: [],
  }))
  for (const name of ['Main', 'Second']) await writeFile(join(folder, `project/${name}.dc.html`), `<h1>${name}</h1>`)
  const probe = join(world, 'probe.mjs'), overlay = join(world, 'probe.yml')
  await writeFile(probe, `
export const name = 'design-runtime-probe'
export const inject = ['yourbuddyDesign', 'tools', 'connection', 'workspaceController', 'sessionController', 'sessions']
export function apply(ctx) {
  ctx.connection.fetch.register({
    path: '/api/yourbuddy.design.probe', methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: async request => {
      const tool = ctx.tools.get('yourbuddy_design_open')
      if (request.method === 'GET') return Response.json({ tool: tool !== undefined })
      const { workspace } = await ctx.workspaceController.create({ path: ${JSON.stringify(world)} })
      const { sessionId } = await ctx.sessionController.create({ workspaceId: workspace.workspaceId })
      const resolved = await ctx.sessionController.resolveAgent(sessionId)
      if ('error' in resolved) throw resolved.error
      const opened = await tool.execute({ root: ${JSON.stringify(folder)} }, {
        agent: resolved.agent, signal: new AbortController().signal,
      })
      await ctx.sessions.flush(resolved.agent.session)
      const { workspace: attached } = await ctx.workspaceController.create({ path: workspace.path })
      return Response.json({ sessionId, opened, workspace: attached })
    },
  })
}
`)
  await writeFile(overlay, `- insert:\n    - id: design-runtime-probe\n      name: ${JSON.stringify(probe)}\n`)
  const host = await startHost(overlay)
  assert.equal((await host.call('/api/yourbuddy.design.probe')).tool, true)
  const list = await host.call('/api/baoyu-design.artifacts')
  assert.equal(list.skills.length, 1)
  assert.equal(list.skills[0].missing, false)
  const { opened, sessionId, workspace } = await host.call('/api/yourbuddy.design.probe', 'POST')
  assert.equal(workspace.path, await realpath(world))
  assert(workspace.sessionIds.includes(sessionId), 'The design fixture Session must belong to a registered Workspace')
  assert.equal((await fetch(opened.url)).status, 200)
  const removed = await host.call(`/api/baoyu-design.artifacts.delete?${new URLSearchParams({ root: folder })}`, 'POST')
  assert.equal(removed.moved, true)
  await assert.rejects(access(folder))
  await assert.rejects(fetch(opened.url))
  await host.call(`/api/baoyu-design.artifacts.restore?${new URLSearchParams({ trash: removed.trash })}`, 'POST')
  await access(folder)
  const reopened = await host.call(`/api/baoyu-design.artifacts.open?${new URLSearchParams({ root: folder })}`, 'POST')
  assert.equal((await fetch(reopened.url)).status, 200)
  const request = await fetch(new URL('__comments/agent/requests', reopened.url), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Test' }),
  })
  assert.equal(request.status, 409)
  assert.equal((await request.json()).code, 'YOURBUDDY_COMMENT_REQUIRED')
  assert.equal(host.errors(), '')
  console.log('Registered Workspace/Session, installed Loader/tool/skill/editor and Delete/Undo/managed reopen passed; page requests reject with 409.')
  if (!hostOnly) await verifyClient(host, true, reopened.url)
  await host.stop()
  await assert.rejects(fetch(reopened.url))

  const failureOverlay = join(world, 'failure.yml')
  await writeFile(failureOverlay, '- id: yourbuddy-design\n  config:\n    startupTimeoutMs: 0\n')
  const failed = await startHost(failureOverlay)
  for (let attempt = 0; attempt < 100 && !failed.errors().includes('startupTimeoutMs'); attempt++) {
    await new Promise(resolveWait => setTimeout(resolveWait, 20))
  }
  assert.match(failed.errors(), /startupTimeoutMs/u)
  const response = await fetch(`${failed.baseUrl}/api/session/create`, {
    method: 'POST', headers: { cookie: failed.cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'design-failure-isolation', method: 'session/create', payload: { args: { request: {} } } }),
  })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).result.ok, true)
  assert.equal((await fetch(failed.baseUrl, { headers: { cookie: failed.cookie } })).status, 200)
  if (!hostOnly) await verifyClient(failed, false)
  await failed.stop()
  console.log('Deliberate design startup failure leaves Web document and real Session creation available.')
  console.log(hostOnly ? 'Client execution was explicitly omitted (--host-only); native desktop acceptance is separate.' : 'Chromium Client boot passed; native desktop acceptance is separate.')
} finally {
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue
    child.kill('SIGTERM')
    const result = await waitForClose(child, 10000)
    if (result.timedOut) { child.kill('SIGKILL'); await waitForClose(child, 5000) }
  }
  await rm(world, { recursive: true, force: true })
}
