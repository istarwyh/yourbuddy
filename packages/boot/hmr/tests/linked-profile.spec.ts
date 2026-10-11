/** Live Profile HMR publishes out-of-tree resolution before loading bare bundle rows. */
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { getEnvironmentData } from 'node:worker_threads'
import { Context } from '@deepseek-ai/cordis'
import Timer from '@deepseek-ai/cordis-plugin-timer'
import {
  boot, createRuntimeResolution, initProfile, loadProfileDirectory, PluginPackages,
  readProfileManifest, readProfilePatches, type ProfileContext,
} from '@deepseek-ai/dsh-app-boot'
import { expect, it, onTestFinished, vi } from 'vitest'
import Hmr from '../src/index.ts'

function file(filename: string, content: string): void {
  mkdirSync(dirname(filename), { recursive: true })
  writeFileSync(filename, content)
}

async function fixture(ready = true) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hmr-linked-profile-')))
  const scheduled = vi.spyOn(Hmr.prototype, 'runExclusive')
  onTestFinished(() => { scheduled.mockRestore() })
  const runtime: { ctx?: Context } = {}
  onTestFinished(async () => { await runtime.ctx?.fiber.dispose(); rmSync(root, { recursive: true, force: true }) })
  const home = join(root, 'home')
  const dir = join(home, 'profiles', 'test')
  const install = join(root, 'installation')
  const installAnchor = join(install, 'package.json')
  file(installAnchor, JSON.stringify({ name: 'hmr-runtime', dependencies: { '@deepseek-ai/dsh-settings': '*' } }))
  const peerDir = join(install, 'node_modules', '@deepseek-ai', 'dsh-settings')
  file(join(peerDir, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-settings', version: '1.0.0', type: 'module', exports: './index.mjs' }))
  file(join(peerDir, 'index.mjs'), 'export const token = {}')
  file(join(install, 'owner.mjs'), 'import { token } from \'@deepseek-ai/dsh-settings\'; export function apply(ctx) { ctx.provide(\'hostPeer\', token) }')
  initProfile(dir, [])
  const profile: ProfileContext = {
    name: 'test', dir, home, cwd: root, installAnchor, patchPath: join(dir, 'cordis.patch.yml'),
    startedBundles: [], overlays: [], telemetryDisabledEnv: undefined,
  }
  file(join(dir, 'cordis.yml'), '[]\n')
  const rows = [{ insert: [
    { id: 'timer', name: 'cordis:timer' },
    { id: 'hmr', name: 'cordis:hmr', config: { root: [], awaitWriteFinish: { stabilityThreshold: 20, pollInterval: 10 } } },
    { id: 'owner', name: join(install, 'owner.mjs') },
    { id: 'user', name: 'cordis:probe', config: { value: 'retained' } },
  ] }]
  file(profile.patchPath, JSON.stringify(rows))
  const resolution = await createRuntimeResolution({ installAnchor, home, profile: loadProfileDirectory('test', dir, installAnchor) })
  let commit: (() => void) | undefined
  const host = await boot('test', join(dir, 'cordis.yml'), readProfilePatches('test', profile), async (host) => {
    await host.plugin(PluginPackages, { resolution })
    host.provide('profileContext', profile)
    host.provide('appReady', { onReady(listener) { commit = listener; return () => { commit = undefined } } })
    host.loader.builtins.timer = Timer
    host.loader.builtins.hmr = Hmr
    host.loader.builtins.probe = { apply(host: Context, config: { value: string }) { host.provide('userProbe', config.value) } }
  })
  runtime.ctx = host
  const errors: unknown[] = []
  const warn = vi.spyOn(host.logger, 'warn').mockImplementation((value: unknown) => { errors.push(value) })
  onTestFinished(() => { warn.mockRestore() })
  if (ready) { commit?.(); await host.hmr.runExclusive(async () => {}) }
  const bundle = (name: string, revision = 'first', broken = false) => {
    const packageDir = join(root, 'outside', `${name}-${revision}`)
    file(join(packageDir, 'package.json'), JSON.stringify({
      name, version: '1.0.0', type: 'module', exports: './index.mjs',
      dependencies: { 'ordinary-helper': '*' }, peerDependencies: { '@deepseek-ai/dsh-settings': '*' },
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }))
    file(join(packageDir, 'node_modules', 'ordinary-helper', 'package.json'), JSON.stringify({ name: 'ordinary-helper', version: '1.0.0', type: 'module', exports: './index.mjs' }))
    file(join(packageDir, 'node_modules', 'ordinary-helper', 'index.mjs'), 'export const value = \'ordinary-dependency\'')
    file(join(packageDir, 'index.mjs'), broken ? 'throw new Error("broken bundle import")' : [
      'import { token } from \'@deepseek-ai/dsh-settings\'',
      'import { value } from \'ordinary-helper\'',
      'export function apply(ctx) {',
      '  if (token !== ctx.get(\'hostPeer\')) throw new Error(\'duplicated runtime peer\')',
      `  ctx.provide(${JSON.stringify(name)}, { token, value, revision: ${JSON.stringify(revision)} })`,
      '}',
    ].join('\n'))
    file(join(packageDir, 'cordis.patch.yml'), JSON.stringify([{ insert: [{ id: name, name }] }]))
    return packageDir
  }
  const link = (name: string, packageDir: string) => {
    const target = join(dir, 'node_modules', name)
    mkdirSync(dirname(target), { recursive: true })
    symlinkSync(packageDir, target, process.platform === 'win32' ? 'junction' : 'dir')
    const manifest = readProfileManifest('test', dir)
    manifest.dependencies = { ...manifest.dependencies, [name]: `link:${packageDir}` }
    file(join(dir, 'package.json'), JSON.stringify(manifest))
  }
  const select = (...names: string[]) => {
    const manifest = readProfileManifest('test', dir)
    manifest.dsh!.profile!.bundles = names
    file(join(dir, 'package.json'), JSON.stringify(manifest))
  }
  const drainChange = async (change: () => void) => {
    const before = scheduled.mock.calls.length
    change()
    await vi.waitFor(() => { expect(scheduled.mock.calls.length).toBeGreaterThan(before) })
    await host.hmr.runExclusive(async () => {})
  }
  return { ctx: host, profile, root, dir, bundle, link, select, drainChange, errors, scheduled, commit: () => commit?.() }
}

it('hot-loads a new linked bare bundle with its ordinary dependency and the running core peer singleton', async () => {
  const f = await fixture()
  const root = f.bundle('linked-probe')
  await f.drainChange(() => { f.link('linked-probe', root) })
  expect(f.ctx.get('linked-probe')).toBeUndefined()
  await f.drainChange(() => { f.select('linked-probe') })
  expect(f.errors).toEqual([])
  expect(f.ctx.get('linked-probe')).toEqual({ token: f.ctx.get('hostPeer'), value: 'ordinary-dependency', revision: 'first' })
  expect(f.ctx.get('userProbe')).toBe('retained')
  await f.ctx.fiber.dispose()
  expect(f.ctx.get('linked-probe')).toBeUndefined()
})

it('rejects a changed historical linked root before touching the running composition', async () => {
  const f = await fixture()
  f.link('linked-probe', f.bundle('linked-probe'))
  await f.drainChange(() => { f.select('linked-probe') })
  const active = f.ctx.get('linked-probe')
  const generation = getEnvironmentData('@deepseek-ai/dsh-app-boot/profile-resolution')
  unlinkSync(join(f.dir, 'node_modules', 'linked-probe'))
  await f.drainChange(() => { f.link('linked-probe', f.bundle('linked-probe', 'second')) })
  expect(f.ctx.get('linked-probe')).toBe(active)
  await f.drainChange(() => {
    file(f.profile.patchPath, readFileSync(f.profile.patchPath, 'utf8').replace('retained', 'edited'))
  })
  expect(f.errors.some(error => String(error).includes('requires a process restart'))).toBe(true)
  expect(f.ctx.get('linked-probe')).toBe(active)
  expect(f.ctx.get('userProbe')).toBe('retained')
  expect(getEnvironmentData('@deepseek-ai/dsh-app-boot/profile-resolution')).toBe(generation)
})

it('parses all patch inputs before publishing resolution and retries corrected inputs', async () => {
  const f = await fixture()
  const generation = getEnvironmentData('@deepseek-ai/dsh-app-boot/profile-resolution')
  const original = readFileSync(f.profile.patchPath, 'utf8')
  await f.drainChange(() => {
    file(f.profile.patchPath, '[invalid')
    f.link('linked-probe', f.bundle('linked-probe'))
    f.select('linked-probe')
  })
  expect(f.errors.some(error => String(error).includes('failed to parse'))).toBe(true)
  expect(f.ctx.get('linked-probe')).toBeUndefined()
  expect(f.ctx.get('userProbe')).toBe('retained')
  expect(getEnvironmentData('@deepseek-ai/dsh-app-boot/profile-resolution')).toBe(generation)
  await f.drainChange(() => { file(f.profile.patchPath, original) })
  expect(f.ctx.get('linked-probe')).toEqual({ token: f.ctx.get('hostPeer'), value: 'ordinary-dependency', revision: 'first' })
})

it('does not report unknown or broken bundle imports as active and keeps existing user services', async () => {
  const f = await fixture()
  await f.drainChange(() => { f.select('unknown-bundle') })
  expect([...f.ctx.loader.entries()].some(row => row.id === 'include:unknown-bundle')).toBe(false)
  f.link('broken-probe', f.bundle('broken-probe', 'first', true))
  await f.drainChange(() => { f.select('unknown-bundle', 'broken-probe') })
  expect(f.ctx.get('broken-probe')).toBeUndefined()
  expect(f.errors.some(error => String(error).includes('broken-probe (broken-probe): failed to import'))).toBe(true)
  expect(f.ctx.get('userProbe')).toBe('retained')
  f.link('healthy-probe', f.bundle('healthy-probe'))
  await f.drainChange(() => { f.select('unknown-bundle', 'broken-probe', 'healthy-probe') })
  expect(f.ctx.get('healthy-probe')).toEqual({ token: f.ctx.get('hostPeer'), value: 'ordinary-dependency', revision: 'first' })
  expect(f.ctx.get('broken-probe')).toBeUndefined()
})

it('serializes simultaneous manifest and patch events into the latest linked composition', async () => {
  const f = await fixture()
  const release = Promise.withResolvers<undefined>()
  onTestFinished(() => { release.resolve(undefined) })
  const blocked = f.ctx.hmr.runExclusive(() => release.promise)
  const before = f.scheduled.mock.calls.length
  f.link('first-probe', f.bundle('first-probe'))
  f.select('first-probe')
  await vi.waitFor(() => { expect(f.scheduled.mock.calls.length).toBeGreaterThan(before) })
  const queued = f.scheduled.mock.calls.length
  f.link('second-probe', f.bundle('second-probe'))
  f.select('first-probe', 'second-probe')
  file(f.profile.patchPath, readFileSync(f.profile.patchPath, 'utf8').replace('retained', 'edited'))
  await vi.waitFor(() => { expect(f.scheduled.mock.calls.length).toBeGreaterThan(queued) })
  expect(f.ctx.get('first-probe')).toBeUndefined()
  expect(f.ctx.get('second-probe')).toBeUndefined()
  release.resolve(undefined)
  await blocked
  await f.ctx.hmr.runExclusive(async () => {})
  for (const name of ['first-probe', 'second-probe']) {
    expect(f.ctx.get(name)).toEqual({ token: f.ctx.get('hostPeer'), value: 'ordinary-dependency', revision: 'first' })
  }
  expect(f.ctx.get('userProbe')).toBe('edited')
  expect(f.errors).toEqual([])
})

it('cancels a linked refresh waiting for startup and disposes the resolver generation', async () => {
  const previous = getEnvironmentData('@deepseek-ai/dsh-app-boot/profile-resolution')
  const f = await fixture(false)
  const replaced = vi.spyOn(f.ctx.pluginPackages, 'replace')
  onTestFinished(() => { replaced.mockRestore() })
  f.link('linked-probe', f.bundle('linked-probe'))
  f.select('linked-probe')
  await vi.waitFor(() => { expect(f.scheduled).toHaveBeenCalled() })
  await f.ctx.fiber.dispose()
  f.commit()
  expect(replaced).not.toHaveBeenCalled()
  expect(f.ctx.get('linked-probe')).toBeUndefined()
  expect(getEnvironmentData('@deepseek-ai/dsh-app-boot/profile-resolution')).toBe(previous)
})
