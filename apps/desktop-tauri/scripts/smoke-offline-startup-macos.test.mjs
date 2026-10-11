/** Guard release evidence against fixture-version, readiness, activation, and environment mistakes. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { childIsActive, descendantPids, inspectBoot, isOwnedHost, isolatedEnvironment, ownedProcessDescendants, ownsApplicationProcess, parseProcessRecord, redactEvidence, sameProcessIdentity } from './smoke-offline-startup-macos.mjs'

const manifest = { appVersion: '0.4.9', releaseTag: 'yourbuddy-v0.4.9', components: { harness: { id: 'current' }, pnpmStore: { id: 'store' } } }
const active = { appVersion: '0.4.9', components: { harness: { id: 'current' }, pnpmStore: { id: 'store' } } }
const log = '1 === boot session started ===\n2 spawning dsh web node=/isolated/node\n3 authenticated readiness passed url=http://127.0.0.1:17890/\n4 boot complete\n'

test('accepts only the requested signed version after real native readiness', () => {
  assert.deepEqual(inspectBoot(log, active, manifest, '0.4.9'), { webUrl: 'http://127.0.0.1:17890/' })
  assert.throws(() => inspectBoot(log, active, { ...manifest, appVersion: '0.4.8' }, '0.4.9'), /requested current version/)
  assert.throws(() => inspectBoot(log, active, { ...manifest, releaseTag: 'yourbuddy-v0.4.8' }, '0.4.9'))
})

test('rejects missing, out-of-order, failed, or rescued readiness', () => {
  for (const phrase of ['=== boot session started ===', 'spawning dsh web ', 'authenticated readiness passed url=', 'boot complete']) {
    assert.throws(() => inspectBoot(log.replace(phrase, ''), active, manifest, '0.4.9'), /in that order/)
  }
  assert.throws(() => inspectBoot(log.replace('2 spawning dsh web node=/isolated/node\n', '') + 'spawning dsh web ', active, manifest, '0.4.9'))
  for (const failure of ['ERROR install failed', 'plugins disabled by rescue patch', 'retrying with it disabled']) {
    assert.throws(() => inspectBoot(`${log}${failure}`, active, manifest, '0.4.9'), /not release acceptance/)
  }
})

test('rejects stale activation and startup of optional Harbor', () => {
  assert.throws(() => inspectBoot(log, { ...active, appVersion: '0.4.8' }, manifest, '0.4.9'))
  assert.throws(() => inspectBoot(log, { ...active, components: { harness: { id: 'old' } } }, manifest, '0.4.9'))
  const withHarbor = { components: { ...manifest.components, harbor: { id: 'harbor' } } }
  assert.throws(() => inspectBoot(log, { ...active, components: { ...active.components, harbor: { id: 'harbor' } } }, { ...manifest, ...withHarbor }, '0.4.9'), /optional Harbor/)
})

test('child environment never inherits credentials, real HOME, or development launch overrides', () => {
  const env = isolatedEnvironment('/tmp/owned-smoke', '/opt/node/bin/node')
  assert.equal(env.HOME, '/tmp/owned-smoke/home')
  assert.equal(env.YOURBUDDY_APP_DATA_DIR, '/tmp/owned-smoke/app-data')
  assert.equal(env.CODEX_HOME, '/tmp/owned-smoke/home/.codex')
  assert.equal(env.PATH, '/opt/node/bin:/usr/bin:/bin:/usr/sbin:/sbin')
  assert.equal(env.DSH_DESKTOP_LAUNCH, undefined)
  assert.equal(env.DSH_HOME, undefined)
  assert.equal(env.NODE_OPTIONS, undefined)
  assert.equal(env.TAURI_SIGNING_PRIVATE_KEY, undefined)
  assert(!Object.keys(env).some(key => /token|secret|password|api.*key/i.test(key)))
})

test('retained failure evidence removes launch tokens and auth cookies', () => {
  const safe = redactEvidence('url=http://127.0.0.1:17890/?token=private&retry=1\nCookie: dsh-auth=private-cookie; HttpOnly')
  assert(!safe.includes('private'))
  assert.match(safe, /token=<redacted>&retry=1/)
  assert.match(safe, /dsh-auth=<redacted>; HttpOnly/)
})


test('failure cleanup owns only descendants of the launched application', () => {
  const rows = [
    { pid: 1, parent: 0 }, { pid: 10, parent: 1 }, { pid: 11, parent: 10 },
    { pid: 12, parent: 11 }, { pid: 20, parent: 1 }, { pid: 21, parent: 20 },
  ]
  assert.deepEqual(descendantPids(rows, 10), [12, 11])
  assert.deepEqual(descendantPids(rows, 99), [])
})


test('PID reuse, exited application handles, and foreign Hosts do not authorize cleanup', () => {
  const row = parseProcessRecord(' 123 100 123 Sun Oct 11 03:00:00 2026 /node /tmp/owned/app-data/harness-versions/hash/apps/cli/lib/bin.js web')
  const child = { pid: 100, exitCode: null, signalCode: null }
  assert(childIsActive(child))
  assert(!childIsActive({ ...child, exitCode: 0 }))
  assert(!childIsActive({ ...child, signalCode: 'SIGTERM' }))
  assert(isOwnedHost(row, child, '/tmp/owned/app-data'))
  assert(sameProcessIdentity(row, { ...row }))
  for (const changed of [
    { ...row, started: 'Sun Oct 11 03:00:01 2026' },
    { ...row, command: '/node unrelated-user-work' },
    { ...row, group: 999 },
    undefined,
  ]) assert(!sameProcessIdentity(row, changed))
  assert(!isOwnedHost({ ...row, parent: 999 }, child, '/tmp/owned/app-data'))
  assert(!isOwnedHost({ ...row, group: 999 }, child, '/tmp/owned/app-data'))
  assert(!isOwnedHost({ ...row, command: '/node /tmp/foreign/harness-versions/hash/bin.js' }, child, '/tmp/owned/app-data'))
  assert(!isOwnedHost(row, { ...child, exitCode: 0 }, '/tmp/owned/app-data'))
  assert(isOwnedHost({ ...row, parent: 1 }, { ...child, exitCode: 0 }, '/tmp/owned/app-data'))
})


test('an application PID recycled before its exit event cannot acquire foreign descendants', () => {
  const child = { pid: 100, exitCode: null, signalCode: null }
  const application = { pid: 100, parent: 50, group: 50, started: 'Sun Oct 11 03:00:00 2026', command: '/app' }
  const ownChild = { pid: 101, parent: 100, group: 101, started: application.started, command: '/node' }
  assert(ownsApplicationProcess(child, application, application))
  assert(!ownsApplicationProcess(child, application, { ...application, started: 'Sun Oct 11 03:00:02 2026' }))
  assert(!ownsApplicationProcess(child, application, { ...application, parent: 999 }))
  assert(!ownsApplicationProcess(child, application, undefined))
  assert(!ownsApplicationProcess({ ...child, exitCode: 0 }, application, application))
  assert.deepEqual(ownedProcessDescendants([application, ownChild], child, application), [ownChild])
  assert.deepEqual(ownedProcessDescendants([{ ...application, started: 'Sun Oct 11 03:00:02 2026' }, ownChild], child, application), [])
  assert.deepEqual(ownedProcessDescendants([{ ...application, parent: 999 }, ownChild], child, application), [])
  assert.deepEqual(ownedProcessDescendants([application, ownChild], { ...child, exitCode: 0 }, application), [])
})
