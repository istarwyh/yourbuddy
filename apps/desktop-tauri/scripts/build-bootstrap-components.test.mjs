import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import childProcess from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { load } from 'js-yaml'

import {
  assertBootstrapDmgSize,
  BOOTSTRAP_DMG_MAX_BYTES,
  buildBootstrapComponents,
  validateComponentManifest,
} from './build-bootstrap-components.mjs'

const fixtureRoot = new URL('../src-tauri/src/runtime/tests/fixtures/', import.meta.url)
const readFixture = name => JSON.parse(readFileSync(new URL(name, fixtureRoot), 'utf8'))
const cases = readFixture('component-manifest-v2-cases.json')

test('accepts the shared schema-2 release catalog without changing it', () => {
  const manifest = readFixture('component-manifest-v2.json')
  const original = structuredClone(manifest)
  assert.equal(validateComponentManifest(manifest), manifest)
  assert.deepEqual(manifest, original)
})

for (const { name, manifest } of cases.valid) {
  test(`accepts shared manifest: ${name}`, () => {
    assert.equal(validateComponentManifest(manifest), manifest)
  })
}

for (const { name, manifest } of cases.invalid) {
  test(`rejects shared manifest: ${name}`, () => {
    assert.throws(() => validateComponentManifest(manifest))
  })
}

const tarVersion = childProcess.spawnSync('tar', ['--version'], { encoding: 'utf8' })
const gnuTar = tarVersion.stdout?.includes('GNU tar')
const zstdAvailable = !gnuTar || childProcess.spawnSync('zstd', ['--version']).status === 0

test('builds core, fallback and on-demand components from bundled versions and archive bytes', {
  skip: tarVersion.status !== 0 || !zstdAvailable ? 'tar with zstd support is required' : false,
}, async t => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-component-build-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const bundledRoot = join(root, 'bundled')
  const harnessRoot = join(bundledRoot, 'harness')
  const storeRoot = join(harnessRoot, '.yourbuddy-pnpm-store')
  const toolchainRoot = join(bundledRoot, 'toolchain')
  const harborRoot = join(bundledRoot, 'yourbuddy-runtime')
  const nodeRoot = join(root, 'node-v22.19.0-darwin-arm64')
  const outputRoot = join(root, 'apps', 'desktop-tauri', 'component-release')
  const pomodoroRoot = join(bundledRoot, 'capabilities', 'pomodoro')
  mkdirSync(join(pomodoroRoot, 'lib'), { recursive: true })
  mkdirSync(join(pomodoroRoot, 'node_modules', '@deepseek-ai', 'schemastery'), { recursive: true })
  writeFileSync(join(pomodoroRoot, 'package.json'), JSON.stringify({
    name: '@xiaohui-wang/dsh-pomodoro', version: '0.5.5', main: 'lib/index.js',
    dsh: { bundle: { patch: './cordis.patch.yml' } },
    dependencies: { '@deepseek-ai/schemastery': '^3.18.4' },
  }))
  writeFileSync(join(pomodoroRoot, 'lib', 'index.js'), 'export {}\n')
  writeFileSync(join(pomodoroRoot, 'lib', 'client.js'), 'export {}\n')
  writeFileSync(join(pomodoroRoot, 'cordis.patch.yml'), '- insert: []\n')
  writeFileSync(join(pomodoroRoot, 'node_modules', '@deepseek-ai', 'schemastery', 'package.json'), JSON.stringify({ name: '@deepseek-ai/schemastery', version: '3.18.4' }))
  for (const path of [storeRoot, toolchainRoot, harborRoot, join(nodeRoot, 'bin')]) mkdirSync(path, { recursive: true })
  writeFileSync(join(harnessRoot, '.bundle-manifest.json'), JSON.stringify({ harnessVersion: '0.2.0-rc.7' }))
  writeFileSync(join(harnessRoot, 'entry.mjs'), 'export {}\n')
  writeFileSync(join(harnessRoot, 'entry.mjs.map'), '{}\n')
  writeFileSync(join(storeRoot, 'index.json'), '{}\n')
  writeFileSync(join(toolchainRoot, 'manifest.json'), JSON.stringify({ nodeVersion: '22.19.0', pnpmVersion: '11.7.1' }))
  writeFileSync(join(harborRoot, 'manifest.json'), JSON.stringify({ integrationVersion: '0.4.2' }))
  writeFileSync(join(nodeRoot, 'bin', 'node'), 'node fixture\n')
  const sourceArchive = join(toolchainRoot, 'node-v22.19.0-darwin-arm64.tar.gz')
  const packed = childProcess.spawnSync('tar', ['-czf', sourceArchive, '-C', root, 'node-v22.19.0-darwin-arm64'])
  assert.equal(packed.status, 0, packed.stderr?.toString())

  // The producer targets BSD tar; Linux exercises the same archives with GNU ownership flags.
  if (gnuTar) {
    const spawnSync = childProcess.spawnSync
    t.mock.method(childProcess, 'spawnSync', (command, args, options) => {
      if (command !== 'tar' || args[0] !== '-acf') return spawnSync(command, args, options)
      const adjusted = []
      for (let index = 0; index < args.length; index += 1) {
        if (['--uid', '--gid', '--uname', '--gname'].includes(args[index])) index += 1
        else if (args[index] !== '--no-mac-metadata') adjusted.push(args[index])
      }
      return spawnSync(command, [...adjusted, '--owner=0', '--group=0'], options)
    })
    syncBuiltinESMExports()
    t.after(() => {
      t.mock.restoreAll()
      syncBuiltinESMExports()
    })
  }

  const { manifest, manifestPath } = buildBootstrapComponents({ version: '0.4.9', outputRoot, bundledRoot })
  assert.deepEqual(JSON.parse(readFileSync(manifestPath, 'utf8')), manifest)
  assert.equal(manifest.schemaVersion, 2)
  assert.deepEqual(Object.keys(manifest.components), ['harness', 'pnpmStore', 'node', 'harbor', 'pomodoro'])
  assert.deepEqual(Object.values(manifest.components).map(({ kind }) => kind), [
    'core-runtime', 'runtime-fallback', 'runtime-fallback', 'capability-on-demand', 'capability-on-demand',
  ])
  assert.deepEqual(Object.values(manifest.components).map(({ version }) => version), [
    '0.2.0-rc.7', '11.7.1', '22.19.0', '0.4.2', '0.5.5',
  ])
  assert.deepEqual(Object.values(manifest.components).map(({ dependsOn }) => dependsOn), [
    {}, {}, {}, { harness: manifest.components.harness.id }, { harness: manifest.components.harness.id },
  ])
  for (const component of Object.values(manifest.components)) {
    const archive = join(outputRoot, component.archive)
    assert.equal(component.bytes, statSync(archive).size)
    assert.equal(component.sha256, createHash('sha256').update(readFileSync(archive)).digest('hex'))
    assert.equal(Object.hasOwn(component, 'activation'), false)
  }
  const extracted = join(root, 'extracted-pomodoro')
  mkdirSync(extracted)
  const unpacked = childProcess.spawnSync('tar', ['-xf', join(outputRoot, manifest.components.pomodoro.archive), '-C', extracted])
  assert.equal(unpacked.status, 0, unpacked.stderr?.toString())
  assert.equal(JSON.parse(readFileSync(join(extracted, 'package.json'))).name, '@xiaohui-wang/dsh-pomodoro')
  assert.equal(JSON.parse(readFileSync(join(extracted, 'node_modules', '@deepseek-ai', 'schemastery', 'package.json'))).version, '3.18.4')
  const harnessListing = childProcess.spawnSync('tar', ['-tf', join(outputRoot, manifest.components.harness.archive)], { encoding: 'utf8' })
  assert.equal(harnessListing.status, 0, harnessListing.stderr)
  assert.match(harnessListing.stdout, /entry\.mjs/)
  assert.doesNotMatch(harnessListing.stdout, /entry\.mjs\.map|\.yourbuddy-pnpm-store/)
  assert.deepEqual(readdirSync(outputRoot).sort(), [
    ...Object.values(manifest.components).map(({ archive }) => archive),
    'yourbuddy-components-0.4.9.json', 'yourbuddy-debug-0.4.9.tar.zst', 'yourbuddy-size-report-0.4.9.json',
  ].sort())
  const report = JSON.parse(readFileSync(join(outputRoot, 'yourbuddy-size-report-0.4.9.json'), 'utf8'))
  assert.equal(report.schemaVersion, 1)
  for (const component of Object.values(manifest.components)) {
    assert.deepEqual(report.artifacts[component.archive], { bytes: component.bytes, sha256: component.sha256 })
  }
  for (const [name, { bytes, sha256 }] of Object.entries(report.artifacts)) {
    const path = join(outputRoot, name)
    assert.equal(bytes, statSync(path).size)
    assert.equal(sha256, createHash('sha256').update(readFileSync(path)).digest('hex'))
  }

  await t.test('the macOS workflow seeds every real component archive, including Pomodoro and fallbacks', {
    skip: process.platform === 'win32' ? 'the release seed step executes under the macOS POSIX shell' : false,
  }, () => {
    const workflow = load(readFileSync(new URL('../../../.github/workflows/desktop-release.yml', import.meta.url), 'utf8'))
    const offline = workflow.jobs.build.steps.find(step => step.name === 'Build Offline app and DMG')
    const [seedCommands, nativeBuild] = offline.run.split('pnpm --dir apps/desktop-tauri run build:offline')
    assert.ok(nativeBuild, 'seed commands must precede the native Offline build')
    const seeds = join(root, 'apps', 'desktop-tauri', 'component-seeds')
    mkdirSync(seeds, { recursive: true })
    writeFileSync(join(seeds, 'stale.tar.zst'), 'old seed')
    const result = childProcess.spawnSync('bash', ['-euc', seedCommands], { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readdirSync(seeds).includes('stale.tar.zst'), false)
    for (const { archive, sha256 } of Object.values(manifest.components)) {
      assert.equal(createHash('sha256').update(readFileSync(join(seeds, archive))).digest('hex'), sha256)
    }
  })

  const priorManifest = readFileSync(manifestPath, 'utf8')
  const priorArchives = Object.fromEntries(Object.values(manifest.components).map(({ archive }) => [
    archive, createHash('sha256').update(readFileSync(join(outputRoot, archive))).digest('hex'),
  ]))
  rmSync(join(pomodoroRoot, 'node_modules'), { recursive: true })
  assert.throws(() => buildBootstrapComponents({ version: '0.4.9', outputRoot, bundledRoot }), /capability dependency is missing/)
  rmSync(pomodoroRoot, { recursive: true })
  assert.throws(() => buildBootstrapComponents({ version: '0.4.9', outputRoot, bundledRoot }), /ENOENT/)
  assert.equal(readFileSync(manifestPath, 'utf8'), priorManifest)
  for (const [archive, sha256] of Object.entries(priorArchives)) {
    assert.equal(createHash('sha256').update(readFileSync(join(outputRoot, archive))).digest('hex'), sha256)
  }
})

test('enforces the 30 MB Bootstrap DMG ceiling', t => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-bootstrap-size-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(root, { recursive: true })
  const accepted = join(root, 'accepted.dmg')
  const rejected = join(root, 'rejected.dmg')
  writeFileSync(accepted, Buffer.alloc(BOOTSTRAP_DMG_MAX_BYTES))
  writeFileSync(rejected, Buffer.alloc(BOOTSTRAP_DMG_MAX_BYTES + 1))
  assert.equal(assertBootstrapDmgSize(accepted), BOOTSTRAP_DMG_MAX_BYTES)
  assert.throws(() => assertBootstrapDmgSize(rejected), /exceeds 30000000 bytes/)
})
