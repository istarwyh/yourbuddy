import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { load } from 'js-yaml'
import { expectedRegistryPackageCount } from './registry-inventory.mjs'

test('frozen product lock resolves the macOS production inventory without orphan platform dependencies', () => {
  const lock = load(readFileSync(new URL('../product/harness-pnpm-lock.yaml', import.meta.url), 'utf8'))
  assert.equal(expectedRegistryPackageCount(lock, { os: 'darwin', cpu: 'arm64' }), 551)
})

test('inventory follows production aliases and peer variants, excluding dev and unsupported optional trees', () => {
  const lock = {
    importers: { '.': { dependencies: { app: { version: '1(peer@1)' } }, devDependencies: { dev: { version: '1' } } } },
    packages: { 'app@1': {}, 'alias-target@1': {}, 'native@1': { os: ['linux'] }, 'unused@1': {}, 'dev@1': {} },
    snapshots: {
      'app@1(peer@1)': { dependencies: { alias: 'alias-target@1' }, optionalDependencies: { native: '1' } },
      'alias-target@1': {}, 'native@1': { dependencies: { unused: '1' } }, 'unused@1': {}, 'dev@1': {},
    },
  }
  assert.equal(expectedRegistryPackageCount(lock, { os: 'darwin', cpu: 'arm64' }), 2)
  assert.equal(expectedRegistryPackageCount(lock, { os: 'linux', cpu: 'arm64' }), 4)
  lock.snapshots['app@1(peer@1)'].dependencies.missing = '1'
  assert.throws(() => expectedRegistryPackageCount(lock, { os: 'darwin', cpu: 'arm64' }), /Unresolved production lock reference/)
})
