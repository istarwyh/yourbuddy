import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { load } from 'js-yaml'
import { observeDesignClient, saveDesignClientFailure, waitForDesignEditor } from './design-client-evidence.mjs'

const workflow = load(readFileSync(new URL('../../../.github/workflows/bootstrap-regression.yml', import.meta.url), 'utf8'))

test('design browser CI reuses the existing branded build with read-only permissions', () => {
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  const steps = workflow.jobs['network-proxy'].steps
  const builds = steps.filter(step => step.run === 'pnpm run build')
  assert.equal(builds.length, 1)
  assert.equal(builds[0].env.DSH_CLIENT_TITLE, 'YourBuddy')
  const install = steps.findIndex(step => step.name === 'Assemble and install the pinned design product graph')
  const browser = steps.findIndex(step => step.name === 'Install Chromium for bundled design acceptance')
  const smoke = steps.findIndex(step => step.name === 'Test installed design Host and Chromium Client')
  const legacyNode = steps.findIndex(step => step.with?.['node-version'] === '22.19.0')
  assert(steps.indexOf(builds[0]) < install && browser < smoke && install < smoke && smoke < legacyNode)
  assert.match(steps[install].run, /--prod --frozen-lockfile/u)
  assert.match(steps[smoke].run, /test-bundled-design\.mjs/u)
  assert.doesNotMatch(steps[smoke].run, /--host-only/u)
  assert.equal(steps.find(step => step.uses === 'actions/checkout@v6').with['persist-credentials'], false)
  const retained = steps.find(step => step.name === 'Retain design acceptance log')
  assert.equal(retained.if, 'always()')
  assert.match(retained.with.path, /yourbuddy-design-acceptance\.log/u)
  assert.match(retained.with.path, /yourbuddy-design-evidence\//u)
  assert.equal(steps[smoke].env.YOURBUDDY_DESIGN_EVIDENCE_DIR, '${{ runner.temp }}/yourbuddy-design-evidence')
})

test('design-only changes trigger the browser regression workflow', () => {
  const paths = workflow.on.pull_request.paths
  for (const path of ['apps/desktop-tauri/product/claude-design-adapter/**', 'apps/desktop-tauri/scripts/verify-design-runtime.mjs', 'apps/desktop-tauri/scripts/design-client-evidence.mjs', 'apps/desktop-tauri/scripts/test-bundled-design*.mjs']) {
    assert(paths.includes(path), `Missing trigger for ${path}`)
  }
})

test('Client evidence retains bounded errors and request paths without URL credentials or payloads', () => {
  const handlers = {}
  const evidence = observeDesignClient({ on: (event, callback) => { handlers[event] = callback } })
  handlers.pageerror(new Error('missing service'))
  handlers.console({ type: () => 'error', text: () => 'plugin failed' })
  handlers.console({ type: () => 'log', text: () => 'irrelevant' })
  handlers.requestfailed({
    url: () => 'https://user:password@example.com/api/session?token=secret#private',
    failure: () => ({ errorText: 'net::ERR_FAILED' }),
  })
  handlers.response({ url: () => 'https://example.com/plugin?key=secret', status: () => 500 })
  assert.deepEqual(evidence, {
    pageErrors: ['missing service'], consoleErrors: ['plugin failed'],
    requests: [{ path: '/api/session', failure: 'net::ERR_FAILED' }, { path: '/plugin', status: 500 }],
  })
  for (let i = 0; i < 200; i++) handlers.pageerror(new Error('repeated'))
  assert.equal(evidence.pageErrors.length, 100)
})

test('Client failure capture redacts authentication values and attempts a screenshot before teardown', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'design-evidence-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  let screenshot
  await saveDesignClientFailure({
    evaluate: async () => ({ path: '/', text: 'That did not work: cannot get property "layout" without inject' }),
    screenshot: async options => { screenshot = options },
  }, directory, { phase: 'design-client', stage: 'create-design-draft', error: 'dsh-auth-test=secret' })
  const result = JSON.parse(await readFile(join(directory, 'design-client-browser-failure.json'), 'utf8'))
  assert.equal(result.stage, 'create-design-draft')
  assert.equal(result.error, 'dsh-auth-test=<redacted>')
  assert.match(result.state.text, /layout/u)
  assert.equal(screenshot.path, join(directory, 'design-client-browser-failure.png'))
  assert.equal(screenshot.timeout, 5000)
})

test('Closed-page diagnostics cannot replace the original acceptance failure', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'design-evidence-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await saveDesignClientFailure({
    evaluate: async () => { throw new Error('page closed') },
    screenshot: async () => { throw new Error('page closed') },
  }, directory, { phase: 'design-client', stage: 'create-design-draft', error: 'original error' })
  const result = JSON.parse(await readFile(join(directory, 'design-client-browser-failure.json'), 'utf8'))
  assert.equal(result.error, 'original error')
  assert.equal(result.state.inspectionError, 'Error: page closed')
})

test('Hung DOM inspection still records the original failure and reaches screenshot cleanup', { timeout: 10000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'design-evidence-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  let screenshotAttempted = false
  await saveDesignClientFailure({
    evaluate: () => new Promise(() => {}),
    screenshot: async () => { screenshotAttempted = true },
  }, directory, { phase: 'design-client', stage: 'create-design-draft', error: 'original timeout' })
  const result = JSON.parse(await readFile(join(directory, 'design-client-browser-failure.json'), 'utf8'))
  assert.equal(result.error, 'original timeout')
  assert.equal(result.state.inspectionError, 'Error: DOM inspection timed out')
  assert.equal(screenshotAttempted, true)
})


test('design smoke enables the Browser tab in both overlays', () => {
  const smoke = readFileSync(new URL('./verify-design-runtime.mjs', import.meta.url), 'utf8')
  const row = '- id: ui-sidebar-browser\\n  disabled: false\\n'
  assert(smoke.includes(row))
  assert.match(smoke, /writeFile\(overlay, `\$\{browserOverlay\}/u)
  assert.match(smoke, /writeFile\(failureOverlay, browserOverlay \+/u)
})

test('managed editor wait requires the exact successful document response', async () => {
  let accepts, responseOptions
  const hidden = Promise.withResolvers()
  const expected = { url: () => 'http://127.0.0.1:23456/', request: () => ({ resourceType: () => 'document' }), status: () => 200 }
  const response = await waitForDesignEditor({
    waitForResponse(predicate, options) { accepts = predicate; responseOptions = options; return Promise.resolve(expected) },
    locator(selector) {
      assert.equal(selector, '.bda-toast[role="alert"]')
      return { waitFor: () => hidden.promise }
    },
  }, expected.url())
  assert.equal(response, expected)
  assert.equal(responseOptions.timeout, 30000)
  assert.equal(accepts(expected), true)
  assert.equal(accepts({ ...expected, status: () => 404 }), false)
  assert.equal(accepts({ ...expected, url: () => 'http://127.0.0.1:23457/' }), false)
  assert.equal(accepts({ ...expected, request: () => ({ resourceType: () => 'fetch' }) }), false)
  hidden.reject(new Error('page closed'))
})

test('managed editor error is captured before its toast disappears, not replaced by the later response timeout', async () => {
  const document = Promise.withResolvers()
  const opened = waitForDesignEditor({
    waitForResponse: () => document.promise,
    locator: () => ({
      waitFor: async options => { assert.deepEqual(options, { state: 'visible', timeout: 30000 }) },
      textContent: async options => {
        assert.equal(options.timeout, 1000)
        return 'Could not open: Enable the Browser sidebar tab to view this design comment.'
      },
    }),
  }, 'http://127.0.0.1:23456/')
  await assert.rejects(opened, /Enable the Browser sidebar tab/u)
  document.reject(new Error('page closed'))
})
