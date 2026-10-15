import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { inspectComponentStorage } from './inspect-component-storage.mjs'

const script = fileURLToPath(new URL('./inspect-component-storage.mjs', import.meta.url))
const supported = ['darwin', 'linux'].includes(process.platform)

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-storage-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

function put(root, path, content) {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
  return target
}

function snapshot(root, path = '') {
  const absolute = join(root, path)
  const stat = lstatSync(absolute, { bigint: true })
  const result = [{ path, mode: stat.mode, mtime: stat.mtimeNs, size: stat.size,
    content: stat.isFile() ? readFileSync(absolute).toString('base64') : stat.isSymbolicLink() ? readlinkSync(absolute) : null }]
  if (stat.isDirectory()) for (const child of readdirSync(absolute).sort()) result.push(...snapshot(root, join(path, child)))
  return result
}

function run(root) {
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8', timeout: 20_000 })
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  return result
}

test('CLI inventories retained trees and recorded references without changing application data', { skip: !supported }, t => {
  const parent = fixture(t)
  const root = join(parent, 'YourBuddy')
  const current = put(root, 'components/harness/current/code', 'current')
  put(root, 'components/harness/current/.bootstrap-provisioning', 'pending')
  put(root, 'components/harness/current/.bootstrap-dependencies-1/node_modules/user-file', 'retain')
  const store = put(root, 'components/stores/old/package', 'shared-package')
  mkdirSync(join(root, 'components/stores/current'))
  linkSync(store, join(root, 'components/stores/current/package'))
  put(root, 'components/downloads/old.tar.zst.partial', 'partial')
  put(root, 'components/staging/in-progress/data', 'staging')
  put(root, 'components/quarantine/interrupted/user-file', 'user-data')
  put(root, 'components/.leases/permanent.lock', '')
  put(root, 'harness-versions/old/apps/cli/lib/bin.js', 'cli')
  put(root, 'runtime/.bootstrap-pnpm-1/pnpm-global/user-file', 'preserved')
  put(root, 'runtime/node/bin/node', 'node')
  put(root, 'dsh-home/profiles/web/package.json', 'do not read this profile')
  put(root, 'dsh-home/credentials.json', 'do not read credentials')
  const external = put(parent, 'outside/secret', 'outside')
  symlinkSync(dirname(external), join(root, 'components/harness/external'))
  symlinkSync(join(parent, 'missing'), join(root, 'components/harness/dangling'))
  put(root, 'components/active.json', JSON.stringify({ schemaVersion: 1, components: { harness: { id: 'sha256:current', path: dirname(current) } } }))
  put(root, 'runtime/manifest.json', JSON.stringify({ harnessRoot: join(root, 'harness-versions/old'), nodePath: join(root, 'runtime/node/bin/node') }))
  put(root, 'bin/dsh-launch.json', JSON.stringify({ cli: join(root, 'harness-versions/old/apps/cli/lib/bin.js'), node: '/external/node', dshHome: join(root, 'dsh-home'), pathPrepend: [join(root, 'runtime/node/bin')] }))
  const before = snapshot(parent)
  const result = run(root)
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.deepEqual(snapshot(parent), before)
  assert.equal(report.complete, true)
  assert.equal(report.readOnly, true)
  assert.equal(report.leaseActivity, 'unverified')
  assert.equal(report.profileReferences, 'unverified')
  assert.equal(report.reclaimableBytes, null)
  assert.equal(report.physicalExclusiveBytes, null)
  assert.equal(report.totals.symlinks, 2)
  assert.equal(report.totals.hardlinkedFiles, 2)
  assert.equal(BigInt(report.totals.logicalFileBytes) - BigInt(report.totals.uniqueFileBytes), 14n)
  assert.ok(BigInt(report.totals.allocatedFileBytes) > 0n)
  assert.equal(result.stdout.includes(parent), false)
  assert.equal(result.stdout.includes('secret'), false)
  assert.equal(report.metadata.find(row => row.path === 'bin/dsh-launch.json').outsideRoot, 1)
  const rows = report.entries.map(({ path, kind, recordedReferences, observations, retainedReason, reclaimableBytes }) => ({ path, kind, recordedReferences, observations, retainedReason, reclaimableBytes }))
  assert.deepEqual(rows, JSON.parse(readFileSync(new URL('./tests/expected/component-storage.json', import.meta.url), 'utf8')))
  assert.equal(run(root).stdout, result.stdout)
})

test('allocated and unique byte totals deduplicate hardlinks across inventory rows', { skip: !supported }, t => {
  const root = fixture(t)
  const file = put(root, 'components/stores/a/package', Buffer.alloc(8192, 'x'))
  mkdirSync(join(root, 'components/stores/b'))
  linkSync(file, join(root, 'components/stores/b/package'))
  const stat = lstatSync(file, { bigint: true })
  const report = inspectComponentStorage(root)
  assert.equal(report.totals.logicalFileBytes, '16384')
  assert.equal(report.totals.uniqueFileBytes, '8192')
  assert.equal(report.totals.allocatedFileBytes, (stat.blocks * 512n).toString())
  assert.equal(report.entries[0].allocatedFileBytes, report.entries[1].allocatedFileBytes)
  assert.equal(report.metadata.every(row => row.status === 'unavailable'), true)
  assert.equal(report.entries.every(row => row.retainedReason === 'ownership-and-consumers-unverified'), true)
})

test('malformed, oversized, and linked metadata leave references unknown and report incomplete inspection', { skip: !supported }, t => {
  const root = fixture(t)
  put(root, 'components/harness/old/file', 'keep')
  put(root, 'components/active.json', '{')
  put(root, 'runtime/manifest.json', 'x'.repeat(256 * 1024 + 1))
  mkdirSync(join(root, 'bin'))
  symlinkSync(join(root, 'components/active.json'), join(root, 'bin/dsh-launch.json'))
  const before = snapshot(root)
  const result = run(root)
  assert.equal(result.status, 2)
  const report = JSON.parse(result.stdout)
  assert.equal(report.complete, false)
  assert.equal(report.metadata.every(row => row.status === 'unreadable'), true)
  assert.equal(report.errors.length, 3)
  assert.deepEqual(report.entries.find(row => row.path === 'components/harness/old').recordedReferences, [])
  assert.deepEqual(snapshot(root), before)
})

test('launcher sidecars without optional PATH entries retain their recorded references', { skip: !supported }, t => {
  const root = fixture(t)
  put(root, 'harness-versions/older/apps/cli/lib/bin.js', 'cli')
  put(root, 'bin/dsh-launch.json', JSON.stringify({
    cli: join(root, 'harness-versions/older/apps/cli/lib/bin.js'),
    node: '/external/node', dshHome: join(root, 'dsh-home'),
  }))
  const report = inspectComponentStorage(root)
  assert.equal(report.complete, true)
  assert.deepEqual(report.entries[0].recordedReferences, [{ source: 'bin/dsh-launch.json', field: 'cli' }])
})

test('symlinked collection ancestors and special files are never traversed', { skip: !supported }, t => {
  const parent = fixture(t)
  const root = join(parent, 'app')
  mkdirSync(root)
  put(parent, 'outside/harness/secret', 'outside')
  symlinkSync(join(parent, 'outside'), join(root, 'components'))
  let report = inspectComponentStorage(root)
  assert.equal(report.complete, false)
  assert.equal(report.totals.logicalFileBytes, '0')
  assert.ok(report.errors.some(row => row.path === 'components' && row.code === 'NOT_DIRECTORY'))
  rmSync(join(root, 'components'))
  mkdirSync(join(root, 'components/downloads'), { recursive: true })
  execFileSync('mkfifo', [join(root, 'components/downloads/pipe')])
  report = inspectComponentStorage(root)
  assert.ok(report.errors.some(row => row.code === 'UNSUPPORTED_FILE_TYPE'))
  assert.equal(report.entries[0].complete, false)
})

test('CLI requires an explicit existing directory and never creates it', { skip: !supported }, t => {
  const root = fixture(t)
  const missing = join(root, 'missing')
  const noRoot = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 20_000 })
  assert.equal(noRoot.error, undefined)
  assert.equal(noRoot.signal, null)
  assert.equal(noRoot.status, 1)
  assert.match(noRoot.stderr, /Usage:/)
  assert.equal(run(missing).status, 1)
  assert.equal(run('').status, 1)
  assert.deepEqual(readdirSync(root), [])
  symlinkSync(root, join(root, 'linked'))
  assert.equal(run(join(root, 'linked')).status, 1)
})
