import assert from 'node:assert/strict'
import childProcess, { spawnSync } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { dump, load } from 'js-yaml'
import { hashTree } from './prepare-harness-offline-store.mjs'
import { buildTrimmedWorkspaceYaml } from './bundle-harness-source.mjs'
import { assertPreparedCapability, capabilityLock, prepareCapabilityComponents } from './prepare-capability-components.mjs'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(desktopRoot, '../..')
const builtRoot = process.env.YOURBUDDY_BUILT_HARNESS_ROOT ?? repoRoot
const builtAvailable = existsSync(join(builtRoot, 'vendor/schemastery/lib/index.mjs'))
  && existsSync(join(builtRoot, 'packages/boot/app-boot/lib/index.js'))
const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

test('projects the frozen capability lock without changing registry versions or integrity', () => {
  const lock = load(readFileSync(join(desktopRoot, 'product/harness-pnpm-lock.yaml'), 'utf8'))
  const original = structuredClone(lock)
  const projected = capabilityLock(lock, ['vendor/schemastery', 'vendor/cosmokit'], 'packages/capabilities/pomodoro', {
    '@deepseek-ai/schemastery': 'link:../../../vendor/schemastery',
  })
  assert.deepEqual(lock, original)
  assert.deepEqual(projected.packages, lock.packages)
  assert.deepEqual(projected.snapshots, lock.snapshots)
  assert.deepEqual(projected.importers['vendor/schemastery'], lock.importers['vendor/schemastery'])
  assert.equal(projected.settings.autoInstallPeers, false)
  assert.deepEqual(Object.keys(projected.importers), ['.', 'vendor/schemastery', 'vendor/cosmokit', 'packages/capabilities/pomodoro'])
  assert.throws(() => capabilityLock(lock, ['vendor/missing'], 'capability', {}), /missing workspace/)
  assert.equal(lock.importers['apps/cli'].dependencies['@xiaohui-wang/dsh-pomodoro'], undefined)
  assert.equal(lock.importers['packages/product/pomodoro'], undefined)
  assert.equal(lock.importers['apps/cli'].dependencies['@deepseek-ai/dsh-subagent-codex'].specifier, 'workspace:*')
})

function preparedFixture(root) {
  mkdirSync(join(root, 'lib'), { recursive: true })
  mkdirSync(join(root, 'node_modules', 'ordinary'), { recursive: true })
  writeJson(join(root, 'package.json'), {
    name: 'capability', version: '1.0.0', main: 'lib/index.js',
    dsh: { bundle: { patch: './cordis.patch.yml' } }, dependencies: { ordinary: '1.0.0' },
  })
  writeJson(join(root, 'node_modules', 'ordinary', 'package.json'), { name: 'ordinary', version: '1.0.0' })
  for (const file of ['lib/index.js', 'lib/client.js', 'cordis.patch.yml']) writeFileSync(join(root, file), '')
}

test('rejects absent ordinary dependencies and a bundled second Cordis', t => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-capability-files-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  preparedFixture(root)
  assert.equal(assertPreparedCapability(root).name, 'capability')
  writeJson(join(root, 'node_modules', '@deepseek-ai', 'cordis', 'package.json'), { name: '@deepseek-ai/cordis' })
  assert.throws(() => assertPreparedCapability(root), /must use the core peer/)
  rmSync(join(root, 'node_modules', '@deepseek-ai'), { recursive: true })
  rmSync(join(root, 'node_modules', 'ordinary'), { recursive: true })
  assert.throws(() => assertPreparedCapability(root), /dependency is missing: ordinary/)
})

function coreFixture(root) {
  const harnessRoot = join(root, 'core')
  mkdirSync(harnessRoot)
  writeJson(join(harnessRoot, 'package.json'), { name: 'core', private: true, packageManager: 'pnpm@11.7.0' })
  writeFileSync(join(harnessRoot, 'pnpm-workspace.yaml'), buildTrimmedWorkspaceYaml(readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8')))
  cpSync(join(desktopRoot, 'product/harness-pnpm-lock.yaml'), join(harnessRoot, 'pnpm-lock.yaml'))
  cpSync(join(repoRoot, 'patches'), join(harnessRoot, 'patches'), { recursive: true })
  for (const directory of ['vendor/schemastery', 'vendor/cosmokit']) {
    cpSync(join(builtRoot, directory), join(harnessRoot, directory), {
      recursive: true, filter: path => !path.split(/[\\/]/).includes('node_modules'),
    })
  }
  for (const directory of ['vendor/cordis', 'packages/settings/settings']) {
    writeJson(join(harnessRoot, directory, 'package.json'), readJson(join(repoRoot, directory, 'package.json')))
  }
  return harnessRoot
}

const smokeSource = String.raw`
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const [builtRoot, root, capability, mode] = process.argv.slice(1);
const { boot, createRuntimeResolution, loadProfileDirectory, PluginPackages } = await import(pathToFileURL(join(builtRoot, 'packages/boot/app-boot/lib/index.js')));
const profileRoot = join(root, 'profiles', 'web');
mkdirSync(profileRoot, { recursive: true });
const manifest = JSON.parse(readFileSync(join(capability, 'package.json')));
const enabled = mode !== 'core-only';
writeFileSync(join(profileRoot, 'package.json'), JSON.stringify({
  private: true, dependencies: enabled ? { [manifest.name]: 'link:' + capability } : {},
  dsh: { profile: { bundles: enabled ? [manifest.name] : [] } },
}));
if (enabled) {
  const link = join(profileRoot, 'node_modules', manifest.name);
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(capability, link, process.platform === 'win32' ? 'junction' : 'dir');
}
const anchor = join(builtRoot, 'apps/cli/package.json');
const profile = loadProfileDirectory('capability-smoke', profileRoot, anchor);
if (mode === 'wrong-peer') {
  assert.equal(profile.layers.length, 0);
  assert.match(profile.skippedBundles[0].reason, /incompatible/);
  process.exit(0);
}
assert.deepEqual(profile.skippedBundles, []);
const resolution = await createRuntimeResolution({ installAnchor: anchor, profile, home: root });
assert.equal(resolution.linkedRoots.length, enabled ? 1 : 0);
const config = join(profileRoot, 'base.yml');
writeFileSync(config, '[]\n');
let route;
const ctx = await boot('capability-smoke', config, profile.layers.flatMap(layer => layer.patches), async ctx => {
  await ctx.plugin(PluginPackages, { resolution });
  ctx.provide('connection', { fetch: { register(value) { route = value; return () => { route = undefined; }; } } });
});
try {
  if (mode === 'missing-ordinary') await import(pathToFileURL(join(capability, manifest.main)));
  const entry = [...ctx.loader.entries()].find(entry => entry.options.id === 'dsh-pomodoro');
  if (enabled) {
    assert.equal(entry?.fiber?.state, 2);
    assert.equal(route.path, '/api/pomodoro/config');
    const response = await route.fetch();
    assert.equal((await response.json()).value.focusMinutes, 25);
    const require = createRequire(join(capability, 'package.json'));
    assert.equal(realpathSync(require.resolve('@deepseek-ai/cordis')), realpathSync(join(builtRoot, 'vendor/cordis/lib/index.js')));
    assert.ok(require.resolve('@deepseek-ai/schemastery').startsWith(join(capability, 'node_modules')));
  } else {
    assert.equal(entry, undefined);
    assert.equal(route, undefined);
  }
} finally {
  await ctx.fiber.dispose();
}
assert.equal(route, undefined);
`

function runSmoke(root, capability, mode) {
  const home = join(root, mode)
  mkdirSync(home)
  return spawnSync(process.execPath, ['--input-type=module', '--eval', smokeSource, builtRoot, home, capability, mode], {
    encoding: 'utf8', timeout: 30_000,
    env: { PATH: process.env.PATH, HOME: home, DSH_HOME: home },
  })
}

function assertSmoke(result) {
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
}

test('materializes the frozen package and loads its built entry through out-of-tree Profile resolution', {
  skip: builtAvailable ? false : 'requires built Harness artifacts; set YOURBUDDY_BUILT_HARNESS_ROOT after the root build',
}, t => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-capability-real-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const harnessRoot = coreFixture(root)
  const originalLock = readFileSync(join(harnessRoot, 'pnpm-lock.yaml'))
  const options = { harnessRoot, outputRoot: join(root, 'capabilities'), storeRoot: process.env.YOURBUDDY_CAPABILITY_TEST_STORE ?? join(root, 'store'), offline: Boolean(process.env.YOURBUDDY_CAPABILITY_TEST_STORE) }
  const [entry] = prepareCapabilityComponents(options)
  const manifest = assertPreparedCapability(entry.root)
  assert.equal(manifest.version, '0.5.5')
  assert.equal(manifest.peerDependencies['@deepseek-ai/cordis'], readJson(join(repoRoot, 'vendor/cordis/package.json')).version)
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-settings'], readJson(join(repoRoot, 'packages/settings/settings/package.json')).version)
  assert.ok(existsSync(join(entry.root, 'node_modules/@deepseek-ai/schemastery/lib/index.mjs')))
  assert.equal(readJson(join(entry.root, 'node_modules/@deepseek-ai/schemastery/node_modules/@standard-schema/spec/package.json')).version, '1.1.0')
  assert.equal(existsSync(join(entry.root, 'node_modules/@deepseek-ai/cordis')), false)
  assert.deepEqual(readFileSync(join(harnessRoot, 'pnpm-lock.yaml')), originalLock)
  assert.equal(existsSync(join(harnessRoot, 'packages/product/pomodoro')), false)
  const archive = join(root, 'pomodoro.tar.zst')
  assertSmoke(spawnSync('tar', ['-acf', archive, '-C', entry.root, '.'], { encoding: 'utf8', timeout: 30_000 }))
  const extracted = join(root, 'extracted')
  mkdirSync(extracted)
  assertSmoke(spawnSync('tar', ['-xf', archive, '-C', extracted], { encoding: 'utf8', timeout: 30_000 }))
  assert.deepEqual(assertPreparedCapability(extracted), manifest)
  assertSmoke(runSmoke(root, extracted, 'active'))
  assertSmoke(runSmoke(root, entry.root, 'core-only'))

  const badPeer = join(root, 'bad-peer')
  cpSync(entry.root, badPeer, { recursive: true })
  writeJson(join(badPeer, 'package.json'), { ...manifest, peerDependencies: { ...manifest.peerDependencies, '@deepseek-ai/dsh-settings': '0.0.0' } })
  assertSmoke(runSmoke(root, badPeer, 'wrong-peer'))

  const missingDependency = join(root, 'missing-dependency')
  cpSync(entry.root, missingDependency, { recursive: true })
  rmSync(join(missingDependency, 'node_modules/@deepseek-ai/schemastery'), { recursive: true })
  const failed = runSmoke(root, missingDependency, 'missing-ordinary')
  assert.equal(failed.error, undefined)
  assert.equal(failed.signal, null)
  assert.notEqual(failed.status, 0)
  assert.match(failed.stderr, /Cannot find package '@deepseek-ai\/schemastery'/)

  const badImporter = load(originalLock.toString())
  badImporter.importers['vendor/schemastery'].dependencies['@standard-schema/spec'].specifier = '^99.0.0'
  writeFileSync(join(harnessRoot, 'pnpm-lock.yaml'), dump(badImporter))
  assert.throws(() => prepareCapabilityComponents(options), /FROZEN_LOCKFILE|OUTDATED_LOCKFILE|frozen-lockfile/)
  writeFileSync(join(harnessRoot, 'pnpm-lock.yaml'), originalLock)
  {
    const badIntegrity = load(originalLock.toString())
    badIntegrity.packages['@standard-schema/spec@1.1.0'].resolution.integrity = 'sha512-' + Buffer.alloc(64).toString('base64')
    writeFileSync(join(harnessRoot, 'pnpm-lock.yaml'), dump(badIntegrity))
    assert.throws(() => prepareCapabilityComponents({ ...options, offline: true }), /NO_OFFLINE_TARBALL|integrity/)
    writeFileSync(join(harnessRoot, 'pnpm-lock.yaml'), originalLock)
  }

  const expectedExternal = hashTree(join(entry.root, 'node_modules/@deepseek-ai/schemastery/node_modules/@standard-schema/spec'))
  const cacheHome = join(root, 'warm-cache')
  const alternateIntegrity = 'sha512-' + Buffer.alloc(64, 1).toString('base64')
  const alternate = {
    name: '@standard-schema/spec', 'dist-tags': { latest: '1.9.0' },
    versions: { '1.9.0': { name: '@standard-schema/spec', version: '1.9.0', dist: {
      integrity: alternateIntegrity, tarball: 'https://registry.npmjs.org/@standard-schema/spec/-/spec-1.9.0.tgz',
    } } },
    time: { created: '2020-01-01T00:00:00Z', modified: '2020-01-01T00:00:00Z', '1.9.0': '2020-01-01T00:00:00Z' },
  }
  for (const directory of ['metadata', 'metadata-full']) {
    const path = join(cacheHome, 'pnpm/v11', directory, 'registry.npmjs.org/@standard-schema/spec.jsonl')
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, '{}\n' + JSON.stringify(alternate))
  }
  const unconstrained = join(root, 'unconstrained')
  writeJson(join(unconstrained, 'package.json'), { private: true, packageManager: 'pnpm@11.7.0', dependencies: { '@standard-schema/spec': '^1.1.0' } })
  const pnpmPath = join(repoRoot, 'node_modules/pnpm/bin/pnpm.mjs')
  assertSmoke(spawnSync(process.execPath, [pnpmPath, '--pm-on-fail=ignore', '--store-dir', options.storeRoot,
    'install', '--lockfile-only', '--offline', '--ignore-scripts', '--no-frozen-lockfile'], {
    cwd: unconstrained, encoding: 'utf8', timeout: 30_000,
    env: { PATH: process.env.PATH, HOME: root, XDG_CACHE_HOME: cacheHome, CI: 'true' },
  }))
  assert.equal(load(readFileSync(join(unconstrained, 'pnpm-lock.yaml'), 'utf8')).importers['.'].dependencies['@standard-schema/spec'].version, '1.9.0')

  const sentinel = join(root, 'lifecycle-ran')
  const scriptPath = join(root, 'lifecycle.cjs')
  writeFileSync(scriptPath, `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'ran')\n`)
  const lifecycle = `"${process.execPath}" "${scriptPath}"`
  const dependencySentinel = join(root, 'dependency-lifecycle-ran')
  const dependencyScriptPath = join(root, 'dependency-lifecycle.cjs')
  writeFileSync(dependencyScriptPath, `require('node:fs').writeFileSync(${JSON.stringify(dependencySentinel)}, 'ran')\n`)
  const dependencyLifecycle = `"${process.execPath}" "${dependencyScriptPath}"`
  const scriptedProductRoot = join(root, 'scripted-product')
  const scriptedProduct = join(scriptedProductRoot, 'pomodoro')
  cpSync(join(desktopRoot, 'product/pomodoro'), scriptedProduct, { recursive: true })
  rmSync(join(scriptedProduct, 'YOURBUDDY_UPSTREAM.json'))
  const scriptedManifest = { ...readJson(join(scriptedProduct, 'package.json')), scripts: { prepack: lifecycle, prepare: lifecycle } }
  writeJson(join(scriptedProduct, 'package.json'), scriptedManifest)
  const cosmokitPath = join(harnessRoot, 'vendor/cosmokit/package.json')
  writeJson(cosmokitPath, { ...readJson(cosmokitPath), scripts: { preinstall: dependencyLifecycle, install: dependencyLifecycle, postinstall: dependencyLifecycle, prepare: dependencyLifecycle } })
  const originalSpawn = childProcess.spawnSync
  const commands = []
  t.mock.method(childProcess, 'spawnSync', (command, args, commandOptions) => {
    if (args[0] === pnpmPath) {
      commands.push(args)
      commandOptions = { ...commandOptions, env: { ...commandOptions.env, XDG_CACHE_HOME: cacheHome } }
    }
    return originalSpawn(command, args, commandOptions)
  })
  syncBuiltinESMExports()
  let frozenEntry
  try {
    [frozenEntry] = prepareCapabilityComponents({ ...options, productRoot: scriptedProductRoot, offline: true })
  } finally {
    t.mock.restoreAll()
    syncBuiltinESMExports()
  }
  assert.equal(commands.filter(args => args.includes('install')).length, 1)
  assert.equal(commands.some(args => args.includes('deploy')), false)
  assert.equal(existsSync(sentinel), false)
  assert.equal(existsSync(dependencySentinel), false)
  assert.deepEqual(hashTree(join(frozenEntry.root, 'node_modules/@deepseek-ai/schemastery/node_modules/@standard-schema/spec')), expectedExternal)
  assert.equal(readJson(join(frozenEntry.root, 'node_modules/@deepseek-ai/schemastery/node_modules/@standard-schema/spec/package.json')).version, '1.1.0')
  assertSmoke(spawnSync(process.execPath, [pnpmPath, '--pm-on-fail=ignore', '--config.ignore-scripts=false', 'pack', '--out', join(root, 'lifecycle-control.tgz')], {
    cwd: scriptedProduct, encoding: 'utf8', timeout: 30_000, env: { PATH: process.env.PATH, HOME: root },
  }))
  assert.equal(readFileSync(sentinel, 'utf8'), 'ran')
  rmSync(sentinel)
  t.mock.method(childProcess, 'spawnSync', (command, args, commandOptions) => {
    if (args[0] === pnpmPath && args.includes('install')) args = args.filter(arg => arg !== '--ignore-scripts')
    return originalSpawn(command, args, commandOptions)
  })
  syncBuiltinESMExports()
  try {
    prepareCapabilityComponents({ ...options, productRoot: scriptedProductRoot, offline: true })
  } finally {
    t.mock.restoreAll()
    syncBuiltinESMExports()
  }
  assert.equal(readFileSync(dependencySentinel, 'utf8'), 'ran')
  rmSync(dependencySentinel)
  const retainedManifest = readJson(join(frozenEntry.root, 'package.json'))

  const wrongPnpm = join(root, 'wrong-pnpm.mjs')
  writeFileSync(wrongPnpm, 'console.log("11.25.0")\n')
  assert.throws(() => prepareCapabilityComponents({ ...options, pnpmPath: wrongPnpm }), /requires pnpm 11.7.0/)
  assert.deepEqual(readJson(join(entry.root, 'package.json')), retainedManifest)
  assert.deepEqual(readFileSync(join(harnessRoot, 'pnpm-lock.yaml')), originalLock)
})
