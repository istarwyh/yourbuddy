import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

test('Ego Browser source patch replays once and same-commit refresh stays unchanged on repeated runs', async (t) => {
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
