import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { load } from 'js-yaml'

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
  assert.match(retained.with.path, /\.log$/u)
})

test('design-only changes trigger the browser regression workflow', () => {
  const paths = workflow.on.pull_request.paths
  for (const path of ['apps/desktop-tauri/product/claude-design-adapter/**', 'apps/desktop-tauri/scripts/verify-design-runtime.mjs', 'apps/desktop-tauri/scripts/test-bundled-design*.mjs']) {
    assert(paths.includes(path), `Missing trigger for ${path}`)
  }
})
