import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  assertBootstrapDmgSize,
  BOOTSTRAP_DMG_MAX_BYTES,
  validateComponentManifest,
} from './build-bootstrap-components.mjs'

function manifest() {
  const value = (name, activation) => ({
    id: name === 'node' ? 'node:22.19.0:darwin-arm64' : `sha256:${name}`,
    archive: `yourbuddy-${name}-id-macos-arm64.tar.zst`,
    sha256: 'a'.repeat(64),
    bytes: 1,
    activation,
  })
  return {
    schemaVersion: 1,
    appVersion: '0.4.0',
    releaseTag: 'yourbuddy-v0.4.0',
    platform: 'darwin',
    arch: 'arm64',
    components: {
      harness: value('harness', 'startup'),
      pnpmStore: value('pnpm-store', 'startup-fallback'),
      node: value('node', 'startup-fallback'),
      harbor: value('harbor', 'on-demand'),
    },
  }
}

test('accepts one exact darwin-arm64 component set', () => {
  assert.equal(validateComponentManifest(manifest()).releaseTag, 'yourbuddy-v0.4.0')
})

test('rejects a mutable or cross-release archive name', () => {
  const input = manifest()
  input.components.harness.archive = '../latest.tar.zst'
  assert.throws(() => validateComponentManifest(input), /harness archive is invalid/)
})

test('enforces the 30 MB Bootstrap DMG ceiling', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-bootstrap-size-'))
  mkdirSync(root, { recursive: true })
  const accepted = join(root, 'accepted.dmg')
  const rejected = join(root, 'rejected.dmg')
  writeFileSync(accepted, Buffer.alloc(BOOTSTRAP_DMG_MAX_BYTES))
  writeFileSync(rejected, Buffer.alloc(BOOTSTRAP_DMG_MAX_BYTES + 1))
  assert.equal(assertBootstrapDmgSize(accepted), BOOTSTRAP_DMG_MAX_BYTES)
  assert.throws(() => assertBootstrapDmgSize(rejected), /exceeds 30000000 bytes/)
})
