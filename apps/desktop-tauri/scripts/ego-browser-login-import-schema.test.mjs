import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hashExternalSnapshot } from './bundle-harness-source.mjs'
import { isBundledRuntimePackage } from './product-plugin-compatibility.mjs'
import { applySourcePatches, refreshProductPlugins } from './refresh-product-plugins.mjs'

const source = readFileSync(new URL('../product/ego-browser/lib/index.js', import.meta.url), 'utf8')
const start = source.indexOf('name: "ego_login_import"')
const end = source.indexOf('/** The structured action tools', start)
const registration = source.slice(start, end)

test('login import output declares the source-browser close status it returns', () => {
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.match(registration, /closedSource: \{ type: "boolean" \}/u)
  assert.match(source, /closedSource,\n\s+totalRead:/u)
})

test('POSIX source detection ignores the Agent Browser profile', async () => {
  const functionStart = source.indexOf('async function sourceBrowserPids')
  const functionEnd = source.indexOf('/**\n* Gracefully close the source browser', functionStart)
  const definition = source.slice(functionStart, functionEnd)
  const commands = new Map([
    [101, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    [202, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/Users/test/.local/share/ego-lite-linux/profile'],
  ])
  const execFile = async (command, args) => {
    if (command === 'pgrep') return { stdout: '101\n202\n' }
    if (command === 'ps') return { stdout: commands.get(Number(args[1])) ?? '' }
    throw new Error(`unexpected command: ${command}`)
  }
  const sourceBrowserPids = new Function('execFile$1', 'basename', `${definition}; return sourceBrowserPids`)(execFile, basename)

  assert.deepEqual(await sourceBrowserPids('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', null, 'darwin'), [101])
  assert.deepEqual(await sourceBrowserPids('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Users/test/.local/share/ego-lite-linux/profile', 'darwin'), [202])
})

function egoRefreshFixture(t) {
  const desktop = mkdtempSync(join(tmpdir(), 'yourbuddy-ego-refresh-'))
  t.after(() => rmSync(desktop, { recursive: true, force: true }))
  const product = join(desktop, 'product')
  const snapshot = join(product, 'ego-browser')
  const productSource = fileURLToPath(new URL('../product/', import.meta.url))
  mkdirSync(product)
  cpSync(join(productSource, 'ego-browser'), snapshot, { recursive: true })
  cpSync(join(productSource, 'patches'), join(product, 'patches'), { recursive: true })
  cpSync(join(productSource, 'plugin-update-policy.json'), join(product, 'plugin-update-policy.json'))
  const repository = join(desktop, 'repository')
  const manifest = JSON.parse(readFileSync(join(snapshot, 'package.json'), 'utf8'))
  // Isolate source-patch replay from unrelated maintenance-workspace version changes.
  for (const [name, version] of Object.entries(manifest.peerDependencies)) {
    if (!isBundledRuntimePackage(name)) continue
    const peerRoot = join(repository, 'packages', 'fixture', basename(name))
    mkdirSync(peerRoot, { recursive: true })
    writeFileSync(join(peerRoot, 'package.json'), `${JSON.stringify({ name, version })}\n`)
  }
  const recordPath = join(snapshot, 'YOURBUDDY_UPSTREAM.json')
  const recordBytes = readFileSync(recordPath, 'utf8')
  const record = JSON.parse(recordBytes)
  const treeSha256 = hashExternalSnapshot(snapshot)
  return { desktop, product, snapshot, repository, recordPath, recordBytes, record, treeSha256 }
}

test('Ego Browser source patch replays once and same-commit refresh stays unchanged on repeated runs', async (t) => {
  const { desktop, product, snapshot, repository, recordPath, recordBytes, record, treeSha256 } = egoRefreshFixture(t)
  const patch = 'patches/ego-browser-login-import.patch'
  execFileSync('git', ['apply', '--reverse', '--whitespace=error-all', join(product, patch)], { cwd: snapshot })
  const sourcePatches = applySourcePatches(snapshot, product, [patch])
  assert.deepEqual(record.sourcePatches, sourcePatches)
  assert.equal(record.patches.some(entry => entry.file === patch), false)
  assert.equal(hashExternalSnapshot(snapshot), treeSha256)
  let requests = 0

  for (let run = 0; run < 2; run += 1) {
    const updates = await refreshProductPlugins({
      desktop,
      repository,
      only: ['ego-browser'],
      fetchImpl: async (url) => {
        assert.equal(url, 'https://api.github.com/repos/Fisfzy/dsh-ego-browser/branches/master')
        requests += 1
        return new Response(JSON.stringify({ commit: { sha: record.commit } }))
      },
    })
    assert.deepEqual(updates, [])
    assert.equal(hashExternalSnapshot(snapshot), treeSha256)
    assert.equal(readFileSync(recordPath, 'utf8'), recordBytes)
  }
  assert.equal(requests, 2)
})

test('fresh Ego Browser refresh reconstructs the pinned runtime and retains its source record', {
  skip: process.platform === 'win32' ? 'The pinned archive tree records POSIX executable modes.' : false,
}, async (t) => {
  const { desktop, product, snapshot, repository, recordPath, record, treeSha256 } = egoRefreshFixture(t)
  const upstreamRoot = join(desktop, 'upstream')
  const upstream = join(upstreamRoot, 'ego-browser')
  cpSync(snapshot, upstream, { recursive: true })
  for (const patch of [...record.sourcePatches, ...record.patches].reverse()) {
    if (typeof patch !== 'object') continue
    execFileSync('git', ['apply', '--reverse', '--whitespace=error-all', join(product, patch.file)], { cwd: upstream, timeout: 30_000 })
  }
  const runtimePath = join(upstream, record.runtimeArtifacts[0].file)
  assert.equal(existsSync(runtimePath), true, 'the pinned upstream archive already contains the SDK runtime')
  // The immutable upstream archive owns the old file; the patch replaces its bytes.
  const manifestPath = join(upstream, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const patch of record.patches) {
    if (typeof patch !== 'string') continue
    const peer = /^Set (\S+) peer range from (.+) to .+\.$/u.exec(patch)
    if (peer) manifest.peerDependencies[peer[1]] = peer[2]
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  assert.equal(hashExternalSnapshot(upstream), record.upstreamTreeSha256)
  rmSync(join(upstream, 'YOURBUDDY_UPSTREAM.json'))
  const archivePath = join(desktop, 'upstream.tar.gz')
  execFileSync('tar', ['-czf', archivePath, '-C', upstreamRoot, 'ego-browser'], { timeout: 30_000 })
  let archive = readFileSync(archivePath)
  writeFileSync(recordPath, `${JSON.stringify({ ...record, sourcePatches: [] }, null, 2)}\n`)
  const requests = []

  const options = {
    desktop,
    repository,
    only: ['ego-browser'],
    fetchImpl: async (url) => {
      requests.push(url)
      if (url === 'https://api.github.com/repos/Fisfzy/dsh-ego-browser/branches/master') {
        return new Response(JSON.stringify({ commit: { sha: record.commit } }))
      }
      assert.equal(url, record.source)
      return new Response(archive)
    },
  }
  const updates = await refreshProductPlugins(options)

  assert.equal(updates.length, 1)
  assert.deepEqual(requests, [
    'https://api.github.com/repos/Fisfzy/dsh-ego-browser/branches/master',
    record.source,
  ])
  assert.equal(hashExternalSnapshot(snapshot), treeSha256)
  const refreshed = JSON.parse(readFileSync(recordPath, 'utf8'))
  assert.deepEqual(refreshed.runtimeArtifacts, record.runtimeArtifacts)
  assert.deepEqual(refreshed.sourcePatches, record.sourcePatches)
  assert.equal(
    createHash('sha256').update(readFileSync(join(snapshot, record.runtimeArtifacts[0].file))).digest('hex'),
    record.runtimeArtifacts[0].fileSha256,
  )

  writeFileSync(runtimePath, readFileSync(runtimePath, 'utf8').replace('#!/usr/bin/env node', '#!/usr/bin/env node --trace-warnings'))
  execFileSync('tar', ['-czf', archivePath, '-C', upstreamRoot, 'ego-browser'], { timeout: 30_000 })
  archive = readFileSync(archivePath)
  const pendingRecord = `${JSON.stringify({ ...refreshed, sourcePatches: [] }, null, 2)}\n`
  writeFileSync(recordPath, pendingRecord)
  await assert.rejects(refreshProductPlugins(options), /runtime artifact changed for ego-browser-v2/u)
  assert.equal(hashExternalSnapshot(snapshot), treeSha256)
  assert.equal(readFileSync(recordPath, 'utf8'), pendingRecord)
})
