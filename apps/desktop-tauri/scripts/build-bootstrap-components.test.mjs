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

import { CAPABILITY_COMPONENTS } from './prepare-capability-components.mjs'

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
  const harborPluginRoot = join(bundledRoot, 'capabilities', 'harborPlugin')
  const versions = []
  for (const { key, packageName, sourceDirectory } of CAPABILITY_COMPONENTS) {
    const source = JSON.parse(readFileSync(new URL(`../product/${sourceDirectory}/package.json`, import.meta.url), 'utf8'))
    versions.push(source.version)
    const prepared = join(bundledRoot, 'capabilities', key)
    mkdirSync(join(prepared, 'lib'), { recursive: true })
    writeFileSync(join(prepared, 'package.json'), JSON.stringify({
      name: packageName, version: source.version, main: source.main,
      dsh: { bundle: { patch: './cordis.patch.yml' } }, dependencies: source.dependencies,
    }))
    writeFileSync(join(prepared, source.main), 'export {}\n')
    writeFileSync(join(prepared, 'lib/client.js'), 'export {}\n')
    writeFileSync(join(prepared, 'cordis.patch.yml'), '- insert: []\n')
    for (const name of Object.keys(source.dependencies ?? {})) {
      const dependency = join(prepared, 'node_modules', name)
      mkdirSync(dependency, { recursive: true })
      writeFileSync(join(dependency, 'package.json'), JSON.stringify({ name, version: name === '@deepseek-ai/schemastery' ? '3.18.4' : '1.0.0' }))
    }
  }
  for (const path of [storeRoot, toolchainRoot, harborRoot, join(nodeRoot, 'bin')]) mkdirSync(path, { recursive: true })
  writeFileSync(join(harnessRoot, '.bundle-manifest.json'), JSON.stringify({ harnessVersion: '0.2.0-rc.7' }))
  writeFileSync(join(harnessRoot, 'entry.mjs'), 'export {}\n')
  writeFileSync(join(harnessRoot, 'entry.mjs.map'), '{}\n')
  writeFileSync(join(storeRoot, 'index.json'), '{}\n')
  writeFileSync(join(toolchainRoot, 'manifest.json'), JSON.stringify({ nodeVersion: '22.19.0', pnpmVersion: '11.7.1' }))
  const harborVersion = versions[CAPABILITY_COMPONENTS.findIndex(({ key }) => key === 'harborPlugin')]
  writeFileSync(join(harborRoot, 'manifest.json'), JSON.stringify({ integrationVersion: harborVersion }))
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
  assert.deepEqual(Object.keys(manifest.components), ['harness', 'pnpmStore', 'node', 'harbor', ...CAPABILITY_COMPONENTS.map(({ key }) => key)])
  assert.deepEqual(Object.values(manifest.components).map(({ kind }) => kind), [
    'core-runtime', 'runtime-fallback', 'runtime-fallback', 'capability-on-demand', ...CAPABILITY_COMPONENTS.map(() => 'capability-on-demand'),
  ])
  assert.deepEqual(Object.values(manifest.components).map(({ version }) => version), [
    '0.2.0-rc.7', '11.7.1', '22.19.0', harborVersion, ...versions,
  ])
  assert.deepEqual(Object.values(manifest.components).map(({ dependsOn }) => dependsOn), [
    {}, {}, {}, { harness: manifest.components.harness.id },
    ...CAPABILITY_COMPONENTS.map(({ requires = [] }) => Object.fromEntries(['harness', ...requires].map(key => [key, manifest.components[key].id]))),
  ])
  for (const component of Object.values(manifest.components)) {
    const archive = join(outputRoot, component.archive)
    assert.equal(component.bytes, statSync(archive).size)
    assert.equal(component.sha256, createHash('sha256').update(readFileSync(archive)).digest('hex'))
    assert.equal(Object.hasOwn(component, 'activation'), false)
  }
  const extracted = join(root, 'extracted-harbor-plugin')
  mkdirSync(extracted)
  const unpacked = childProcess.spawnSync('tar', ['-xf', join(outputRoot, manifest.components.harborPlugin.archive), '-C', extracted])
  assert.equal(unpacked.status, 0, unpacked.stderr?.toString())
  assert.equal(JSON.parse(readFileSync(join(extracted, 'package.json'))).name, 'dsh-harbor-evolution')
  assert.equal(JSON.parse(readFileSync(join(extracted, 'node_modules', '@deepseek-ai/schemastery', 'package.json'))).version, '3.18.4')
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

  await t.test('the macOS workflow seeds every real component archive, including Harbor Node, Python and fallbacks', {
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
  writeFileSync(join(harborRoot, 'manifest.json'), JSON.stringify({ integrationVersion: '0.0.0' }))
  assert.throws(() => buildBootstrapComponents({ version: '0.4.9', outputRoot, bundledRoot }), /Harbor Node and Python capability versions differ/)
  writeFileSync(join(harborRoot, 'manifest.json'), JSON.stringify({ integrationVersion: harborVersion }))
  rmSync(join(harborPluginRoot, 'node_modules'), { recursive: true })
  assert.throws(() => buildBootstrapComponents({ version: '0.4.9', outputRoot, bundledRoot }), /capability dependency is missing/)
  rmSync(harborPluginRoot, { recursive: true })
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
