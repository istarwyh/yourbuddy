import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { load } from 'js-yaml'
import { assertBootstrapResources } from './assert-bootstrap-resources.mjs'
import { PNPM_ARTIFACT } from './prepare-managed-toolchain.mjs'

function fixture(t, archive = PNPM_ARTIFACT.file) {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-bootstrap-resources-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'component-channel'))
  writeFileSync(join(root, 'component-channel', 'components.json'), '{}')
  writeFileSync(join(root, 'component-channel', archive), 'inventory fixture, not a runtime archive')
  return root
}

test('Bootstrap resources require the same pnpm archive as the toolchain producer', t => {
  const root = fixture(t)
  assert.doesNotThrow(() => assertBootstrapResources(root))
  mkdirSync(join(root, 'component-seeds'))
  assert.throws(() => assertBootstrapResources(root), /Bootstrap must exclude component-seeds/)
})

test('an old pnpm archive cannot satisfy the current Bootstrap inventory', t => {
  assert.throws(() => assertBootstrapResources(fixture(t, 'pnpm-11.7.0.tgz')), /Bootstrap resource is missing: pnpm-/)
})

test('release resource enforcement invokes the version-derived inventory assertion', () => {
  const workflow = load(readFileSync(new URL('../../../.github/workflows/desktop-release.yml', import.meta.url), 'utf8'))
  const step = workflow.jobs.build.steps.find(step => step.name === 'Enforce Bootstrap DMG ceiling and resource exclusions')
  assert.ok(step)
  assert.match(step.run, /node apps\/desktop-tauri\/scripts\/assert-bootstrap-resources\.mjs "\$resources\/YourBuddy\.app\/Contents\/Resources"/)
  assert.doesNotMatch(step.run, /pnpm-\d/)
})
