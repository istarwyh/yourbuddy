/** Real pnpm writes reach Profile HMR only after bundle selection is committed. */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { execa } from 'execa'
import { Context } from '@deepseek-ai/cordis'
import Timer from '@deepseek-ai/cordis-plugin-timer'
import { boot, initProfile, readProfileManifest, readProfilePatches, type ProfileContext } from '@deepseek-ai/dsh-app-boot'
import Hmr from '@deepseek-ai/dsh-hmr'
import { expect, it, onTestFinished, vi } from 'vitest'
import { runPluginCommand, type PackageOperationOptions } from '../src/operations.ts'
import * as runTree from '../src/run-tree.ts'

const require = createRequire(import.meta.url)
const pnpm = join(dirname(require.resolve('pnpm')), 'bin/pnpm.mjs')

/** Pauses after real pnpm has written its tree, before its caller can reconcile bundles. */
const barrierRunner = `
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
if (!process.argv.includes('add') && process.env.TEST_DESCENDANT_PID) {
  let alive = false
  try { process.kill(Number(readFileSync(process.env.TEST_DESCENDANT_PID, 'utf8')), 0); alive = true } catch {}
  writeFileSync(process.env.TEST_REPAIR_SAW_DESCENDANT, String(alive))
}
writeFileSync(process.env.TEST_STARTED, readFileSync('package.json', 'utf8'))
const child = spawn(process.execPath, [process.env.TEST_PNPM, ...process.argv.slice(2)], { stdio: ['inherit', 'pipe', 'pipe'] })
for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => {
  appendFileSync(process.env.TEST_CHILD_LOG, chunk)
  process[stream].write(chunk)
})
const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
if (!process.argv.includes('add') && process.env.TEST_REPAIR_EXIT === 'stall') {
  setInterval(() => {}, 1000)
  await new Promise(() => {})
}
if (process.argv.includes('add') && process.env.TEST_DESCENDANT_SCRIPT) {
  spawn(process.execPath, [process.env.TEST_DESCENDANT_SCRIPT], { stdio: 'inherit' })
  while (!existsSync(process.env.TEST_DESCENDANT_PID)) await sleep(10)
}
if (process.argv.includes('add') && process.env.TEST_INCOMPATIBLE_MANIFEST) {
  const metadata = JSON.parse(readFileSync(process.env.TEST_INCOMPATIBLE_MANIFEST, 'utf8'))
  metadata.peerDependencies['@deepseek-ai/dsh'] = '999.0.0'
  writeFileSync(process.env.TEST_INCOMPATIBLE_MANIFEST, JSON.stringify(metadata))
}
writeFileSync(process.env.TEST_WRITTEN, String(exit))
while (!existsSync(process.env.TEST_RELEASE)) await sleep(10)
process.exit(exit === 0 ? Number(process.argv.includes('add') ? process.env.TEST_EXIT || 0 : process.env.TEST_REPAIR_EXIT || 0) : exit)
`

async function eventually(check: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 15_000
  while (!check()) {
    if (Date.now() >= deadline) throw new Error(message)
    await sleep(10)
  }
}

async function fixture() {
  const home = realpathSync.native(mkdtempSync(join(tmpdir(), 'plugin-activation-')))
  const operations = new Set<Promise<unknown>>()
  const cancellation = new AbortController()
  const runtime: { ctx?: Context } = {}
  onTestFinished(async () => {
    cancellation.abort()
    await Promise.allSettled(operations)
    await runtime.ctx?.fiber.dispose()
    rmSync(home, { recursive: true, force: true })
  })
  const dir = join(home, 'profiles', 'test')
  initProfile(dir, [])
  writeFileSync(join(home, 'package.json'), '{}\n')
  writeFileSync(join(dir, 'cordis.yml'), '[]\n')
  const profile: ProfileContext = {
    name: 'test', dir, home, cwd: home, patchPath: join(dir, 'cordis.patch.yml'),
    installAnchor: join(home, 'package.json'), startedBundles: [], overlays: [], telemetryDisabledEnv: undefined,
  }
  const helper = join(home, 'ordinary-helper')
  const peer = join(home, 'runtime-peer')
  for (const [root, name, source] of [
    [helper, 'activation-helper', "export const value = 'ordinary-dependency-loaded'"],
    [peer, 'activation-peer', 'export const token = {}'],
  ] as const) {
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name, version: '1.0.0', type: 'module', exports: './index.mjs' }))
    writeFileSync(join(root, 'index.mjs'), source)
  }
  const peerOwner = join(home, 'peer-owner.mjs')
  writeFileSync(peerOwner, `import { token } from ${JSON.stringify(pathToFileURL(join(peer, 'index.mjs')).href)}; export function apply(ctx) { ctx.provide('hostPeer', token) }`)
  const patch = JSON.stringify([{ insert: [
    { id: 'timer', name: 'cordis:timer' },
    { id: 'hmr', name: 'cordis:hmr', config: { root: [], awaitWriteFinish: { stabilityThreshold: 20, pollInterval: 10 } } },
    { id: 'peer-owner', name: peerOwner },
    { id: 'user', name: 'cordis:probe', config: { value: 'retained' } },
  ] }])
  writeFileSync(profile.patchPath, patch)
  let ready: (() => void) | undefined
  const ctx = await boot('test', join(dir, 'cordis.yml'), readProfilePatches('test', profile), (host) => {
    host.provide('profileContext', profile)
    host.provide('appReady', { onReady(listener) { ready = listener; return () => { ready = undefined } } })
    host.loader.builtins.timer = Timer
    host.loader.builtins.hmr = Hmr
    host.loader.builtins.probe = { apply(host: Context, config: { value: string }) { host.provide('userProbe', config.value) } }
  })
  runtime.ctx = ctx
  ready?.()
  await ctx.hmr.runExclusive(async () => {})
  const context = { home, profile: 'test', installAnchor: profile.installAnchor, cwd: home }
  const env = {
    HOME: home, USERPROFILE: home, XDG_DATA_HOME: join(home, 'data'), XDG_CACHE_HOME: join(home, 'cache'),
    XDG_CONFIG_HOME: join(home, 'config'), PNPM_HOME: join(home, 'pnpm'),
    npm_config_store_dir: join(home, 'store'), npm_config_registry: 'http://127.0.0.1:1',
    npm_config_offline: 'true', npm_config_verify_deps_before_run: 'false',
  }
  const options: PackageOperationOptions = {
    command: process.execPath, args: [pnpm], execution: 'service', env,
    outputBytes: 8192, signal: cancellation.signal, lockWaitMs: 15_000,
  }
  const track = <T>(task: Promise<T>): Promise<T> => {
    operations.add(task)
    void task.finally(() => { operations.delete(task) }).catch(() => {})
    return task
  }
  const command = (args: string[], override: Partial<PackageOperationOptions> = {}) =>
    track(runPluginCommand(context, args, { ...options, ...override }))
  const snapshot = (name: string): NonNullable<PackageOperationOptions['rollbackExpected']> => {
    const manifest = readProfileManifest('test', dir)
    let link: string | null = null
    try { link = readlinkSync(join(dir, 'node_modules', name)) } catch (error) {
      if (!['ENOENT', 'EINVAL'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error
    }
    return { dependency: manifest.dependencies?.[name] ?? null, link }
  }
  const run = (root: string, override: Partial<PackageOperationOptions> = {}) =>
    command(['add', `link:${root}`, '--offline'], {
      ...override.rollbackPackage === undefined || Object.hasOwn(override, 'rollbackExpected') ? {}
        : { rollbackExpected: snapshot(override.rollbackPackage) },
      ...override,
    })
  const prepare = (root: string) => track(runPluginCommand({ ...context, dir: root }, ['install', '--offline', '--ignore-scripts'], {
    ...options, activateNewBundles: false,
  }))
  const fork = (source: string) => track(execa(process.execPath, ['--input-type=module', '--eval', source], {
    env, extendEnv: false, reject: false, killDescendants: true, cancelSignal: cancellation.signal,
  }))
  const drain = ctx.hmr.runExclusive.bind(ctx.hmr)
  const scheduled = vi.spyOn(ctx.hmr, 'runExclusive')
  onTestFinished(() => { scheduled.mockRestore() })
  const drainManifest = async (after: number) => {
    await eventually(() => scheduled.mock.calls.length > after, 'Profile HMR did not queue the pnpm write')
    await drain(async () => {})
  }
  const barrier = (root: string, exitCode = 0, repairExit: number | 'stall' = 0, extraEnv: Record<string, string> = {}) => {
    const gate = mkdtempSync(join(home, 'gate-'))
    const script = join(gate, 'runner.mjs')
    writeFileSync(script, barrierRunner)
    const written = join(gate, 'written')
    const started = join(gate, 'started')
    const release = join(gate, 'release')
    const childLog = join(gate, 'pnpm-output.log')
    writeFileSync(childLog, '')
    const task = run(root, { rollbackPackage: 'activation-bundle', args: [script],
      ...repairExit === 'stall' ? { idleTimeoutMs: 5000 } : {}, env: {
        ...env, ...extraEnv, TEST_PNPM: pnpm, TEST_WRITTEN: written, TEST_STARTED: started, TEST_RELEASE: release,
        TEST_EXIT: String(exitCode), TEST_REPAIR_EXIT: String(repairExit), TEST_CHILD_LOG: childLog,
      } })
    const completion: { result?: Awaited<typeof task> } = {}
    void task.then((result) => { completion.result = result })
    return { task, started, diagnostic: () => readFileSync(childLog, 'utf8'), written: async () => {
      await eventually(() => existsSync(written) || completion.result !== undefined, 'Real pnpm did not finish writing the fixture')
      if (!existsSync(written)) throw new Error(completion.result?.output ?? 'Package command exited before the barrier')
      expect(readFileSync(written, 'utf8')).toBe('0')
    }, release: () => { writeFileSync(release, '') } }
  }
  return {
    home, dir, ctx, profile, patch, helper, peer, prepare, command, run, barrier, fork, snapshot, drainManifest,
    manifestEvents: () => scheduled.mock.calls.length,
  }
}

async function bundle(f: Awaited<ReturnType<typeof fixture>>, version = '1.0.0', broken = false) {
  const { home } = f
  const root = join(home, `bundle-${version}`)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: 'activation-bundle', version, type: 'module',
    dependencies: { 'activation-helper': `file:${f.helper}` },
    peerDependencies: { 'activation-peer': '1.0.0' },
    devDependencies: { 'activation-peer': `link:${f.peer}` },
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }))
  const marker = join(home, 'active.txt')
  const audit = join(home, 'activation.log')
  writeFileSync(join(root, 'plugin.mjs'), broken ? 'throw new Error("fixture plugin cannot load")\n' : `
import { appendFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { value } from 'activation-helper'
import { token } from 'activation-peer'
export function apply(ctx) {
  ctx.provide('installedPeer', token)
  ctx.provide('ordinaryValue', value)
  ctx.effect(() => {
    appendFileSync(${JSON.stringify(audit)}, 'mount:${version}\\n')
    writeFileSync(${JSON.stringify(marker)}, ${JSON.stringify(version)})
    return () => { appendFileSync(${JSON.stringify(audit)}, 'dispose:${version}\\n'); unlinkSync(${JSON.stringify(marker)}) }
  })
}
`)
  writeFileSync(join(root, 'cordis.patch.yml'), JSON.stringify([{ insert: [{ id: 'installed', name: './plugin.mjs' }] }]))
  const prepared = await f.prepare(root)
  expect(prepared, prepared.output).toMatchObject({ exitCode: 0 })
  return { root, marker, audit }
}

it('keeps pnpm writes inactive until the CLI commits bundles, then mounts through the real watcher', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const pkg = await bundle(f)
  const events = f.manifestEvents()
  const install = f.barrier(pkg.root)
  await install.written()
  await f.drainManifest(events)
  const installing = readProfileManifest('test', f.dir)
  expect(typeof installing.dependencies?.['activation-bundle']).toBe('string')
  expect(installing).toMatchObject({ dsh: { profile: { bundles: [] } } })
  expect(realpathSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(pkg.root)
  expect(existsSync(pkg.marker)).toBe(false)
  expect(f.ctx.get('userProbe')).toBe('retained')
  install.release()
  expect(await install.task).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(pkg.marker), 'Installed bundle never mounted in the running Loader')
  expect(readFileSync(pkg.marker, 'utf8')).toBe('1.0.0')
  expect(f.ctx.get('ordinaryValue')).toBe('ordinary-dependency-loaded')
  expect(f.ctx.get('installedPeer')).toBe(f.ctx.get('hostPeer'))
  expect(readProfileManifest('test', f.dir).dsh?.profile?.bundles).toEqual(['activation-bundle'])
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
  await f.ctx.fiber.dispose()
  expect(existsSync(pkg.marker)).toBe(false)
})


it('serializes concurrent duplicate requests and mounts a selected bundle only once', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const pkg = await bundle(f)
  const first = f.barrier(pkg.root)
  await first.written()
  const second = f.barrier(pkg.root)
  expect(existsSync(second.started)).toBe(false)
  first.release()
  expect(await first.task).toMatchObject({ exitCode: 0 })
  await second.written()
  expect(JSON.parse(readFileSync(second.started, 'utf8'))).toMatchObject({ dsh: { profile: { bundles: ['activation-bundle'] } } })
  await eventually(() => existsSync(pkg.marker), 'The first completed request did not activate its bundle')
  second.release()
  expect(await second.task).toMatchObject({ exitCode: 0 })
  expect(readProfileManifest('test', f.dir).dsh?.profile?.bundles).toEqual(['activation-bundle'])
  expect(readFileSync(pkg.audit, 'utf8')).toBe('mount:1.0.0\n')
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
})

it('leaves the old runtime mounted when a same-name link update does not change bundle selection', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const next = await bundle(f, '2.0.0')
  const events = f.manifestEvents()
  const update = f.barrier(next.root)
  await update.written()
  await f.drainManifest(events)
  update.release()
  expect(await update.task).toMatchObject({ exitCode: 0 })
  expect(realpathSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(next.root)
  expect(readFileSync(first.marker, 'utf8')).toBe('1.0.0')
  expect(readFileSync(first.audit, 'utf8')).toBe('mount:1.0.0\n')
  expect(readProfileManifest('test', f.dir).dsh?.profile?.bundles).toEqual(['activation-bundle'])
})

it('does not equate a successful CLI exit with a mounted plugin', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const pkg = await bundle(f, '1.0.0', true)
  const events = f.manifestEvents()
  expect(await f.run(pkg.root)).toMatchObject({ exitCode: 0 })
  await f.drainManifest(events)
  await eventually(() => [...f.ctx.loader.entries()].some(entry => entry.id === 'include:installed'), 'HMR never applied the bundle row')
  await f.ctx.loader.await()
  expect(existsSync(pkg.marker)).toBe(false)
  expect(f.ctx.get('userProbe')).toBe('retained')
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
})

it('retains the active link and profile when a package run fails after writing an update', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
  const lock = readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')
  const link = readlinkSync(join(f.dir, 'node_modules', 'activation-bundle'))
  const next = await bundle(f, '2.0.0')
  // The command boundary reports a nonzero exit after real pnpm has written its tree.
  const update = f.barrier(next.root, 17)
  await update.written()
  update.release()
  const result = await update.task
  expect(result, result.output + update.diagnostic()).toMatchObject({ exitCode: 17, rollback: 'restored' })
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
  expect(readFileSync(first.marker, 'utf8')).toBe('1.0.0')
  expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).toBe(manifest)
  expect(readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')).toBe(lock)
  expect(readlinkSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(link)
  expect(realpathSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(first.root)
})

it('refuses an incompatible linked update before pnpm touches the active profile', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
  const lock = readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')
  const link = readlinkSync(join(f.dir, 'node_modules', 'activation-bundle'))
  const next = await bundle(f, '2.0.0')
  const metadata = readProfileManifest('test', next.root)
  metadata.peerDependencies = { ...metadata.peerDependencies, '@deepseek-ai/dsh': '999.0.0' }
  writeFileSync(join(next.root, 'package.json'), JSON.stringify(metadata))
  const update = f.barrier(next.root)
  expect(await update.task).toMatchObject({ exitCode: 1, incompatible: [expect.objectContaining({ name: 'activation-bundle' })] })
  expect(existsSync(update.started)).toBe(false)
  expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).toBe(manifest)
  expect(readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')).toBe(lock)
  expect(readlinkSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(link)
  expect(realpathSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(first.root)
  expect(readFileSync(first.marker, 'utf8')).toBe('1.0.0')
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
})

it('does not activate an uncommitted same-name update when the user edits their patch', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const next = await bundle(f, '2.0.0')
  const update = f.barrier(next.root)
  await update.written()
  writeFileSync(f.profile.patchPath, f.patch.replace('retained', 'edited-during-install'))
  await eventually(() => f.ctx.get('userProbe') === 'edited-during-install', 'User patch did not apply during the package operation')
  await f.ctx.hmr.runExclusive(async () => {})
  expect(readFileSync(first.marker, 'utf8')).toBe('1.0.0')
  update.release()
  expect(await update.task).toMatchObject({ exitCode: 0 })
})


it.each([
  { name: '../outside', multi: false },
  { name: '@scope/name/extra', multi: false },
  { name: 'activation-bundle@1', multi: false },
  { name: 'other-package', multi: false },
  { name: 'activation-bundle', multi: true },
])('refuses rollback target $name with multi=$multi before changing the profile', async ({ name, multi }) => {
  const f = await fixture()
  const root = join(f.home, 'target')
  mkdirSync(root)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'activation-bundle', version: '1.0.0' }))
  const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
  const args = ['add', `link:${root}`, ...multi ? [`link:${root}`] : []]
  expect(await f.command(args, { rollbackPackage: name })).toMatchObject({ exitCode: 1 })
  expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).toBe(manifest)
  expect(existsSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(false)
})

it('refuses an existing real package directory without deleting its contents', async () => {
  const f = await fixture()
  const root = join(f.home, 'target')
  const original = join(f.dir, 'node_modules', 'activation-bundle')
  mkdirSync(root)
  mkdirSync(original, { recursive: true })
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'activation-bundle', version: '1.0.0' }))
  writeFileSync(join(original, 'owned.txt'), 'user-owned')
  const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
  const result = await f.run(root, { rollbackPackage: 'activation-bundle' })
  expect(result).toMatchObject({ exitCode: 1 })
  expect(result.output).toContain('cannot replace a real directory')
  expect(readFileSync(join(original, 'owned.txt'), 'utf8')).toBe('user-owned')
  expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).toBe(manifest)
})

it.each([23, 'stall'] as const)('reports incomplete repair %s but restores the protected link and user files',
  { timeout: 30_000 }, async (repairExit) => {
    const f = await fixture()
    const first = await bundle(f)
    expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
    await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
    const userPackage = join(f.home, 'user-retained')
    mkdirSync(userPackage)
    writeFileSync(join(userPackage, 'package.json'), JSON.stringify({ name: 'user-retained', version: '1.0.0' }))
    expect(await f.command(['add', `link:${userPackage}`, '--offline'])).toMatchObject({ exitCode: 0 })
    const userLink = readlinkSync(join(f.dir, 'node_modules', 'user-retained'))
    const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
    const lock = readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')
    const link = readlinkSync(join(f.dir, 'node_modules', 'activation-bundle'))
    const next = await bundle(f, '2.0.0')
    const update = f.barrier(next.root, 17, repairExit)
    await update.written()
    update.release()
    const result = await update.task
    expect(result).toMatchObject({ exitCode: 17, rollback: 'incomplete' })
    expect(result.output).toContain('rollback is incomplete')
    expect(readlinkSync(join(f.dir, 'node_modules', 'user-retained'))).toBe(userLink)
    expect(existsSync(join(f.dir, 'package.json.lock'))).toBe(false)
    expect(existsSync(join(f.dir, '.plugin-manager', 'run.json'))).toBe(false)
    expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).toBe(manifest)
    expect(readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')).toBe(lock)
    expect(readlinkSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(link)
    expect(realpathSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(first.root)
    expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
    expect(readFileSync(first.marker, 'utf8')).toBe('1.0.0')
    expect(await f.run(first.root, { rollbackPackage: 'activation-bundle' })).toMatchObject({ exitCode: 0 })
  })


it('removes an uncommitted first link and allows a clean retry to activate it', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const pkg = await bundle(f)
  const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
  const install = f.barrier(pkg.root, 17)
  await install.written()
  install.release()
  expect(await install.task).toMatchObject({ exitCode: 17, rollback: 'restored' })
  expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).toBe(manifest)
  expect(existsSync(join(f.dir, 'pnpm-lock.yaml'))).toBe(false)
  expect(existsSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(false)
  expect(existsSync(pkg.marker)).toBe(false)
  expect(await f.run(pkg.root, { rollbackPackage: 'activation-bundle' })).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(pkg.marker), 'Retried bundle did not activate')
  expect(readFileSync(pkg.audit, 'utf8')).toBe('mount:1.0.0\n')
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
})


it('snapshots only after a writer in another process releases the profile lock', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const next = await bundle(f, '2.0.0')
  const acquired = join(f.home, 'writer-acquired')
  const release = join(f.home, 'writer-release')
  const manifest = join(f.dir, 'package.json')
  // This OS fixture loads only the zero-dependency writer lock, using Node's erasable TypeScript mode.
  const lockSource = new URL('../../../util/atomic-write/src/index.ts', import.meta.url).href
  const writer = f.fork(`
import { withFileLock } from ${JSON.stringify(lockSource)}
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
await withFileLock(${JSON.stringify(manifest)}, async () => {
  writeFileSync(${JSON.stringify(acquired)}, '')
  while (!existsSync(${JSON.stringify(release)})) await sleep(10)
  const manifest = JSON.parse(readFileSync(${JSON.stringify(manifest)}, 'utf8'))
  manifest.externalWriter = 'retain-this-commit'
  writeFileSync(${JSON.stringify(manifest)}, JSON.stringify(manifest))
})
`)
  await eventually(() => existsSync(acquired), 'Separate writer did not acquire the profile lock')
  const update = f.barrier(next.root, 17)
  expect(existsSync(update.started)).toBe(false)
  writeFileSync(release, '')
  const written = await writer
  expect(written, written.stderr).toMatchObject({ exitCode: 0, timedOut: false })
  await update.written()
  expect(JSON.parse(readFileSync(update.started, 'utf8'))).toHaveProperty('externalWriter', 'retain-this-commit')
  update.release()
  const result = await update.task
  expect(result, result.output + update.diagnostic()).toMatchObject({ exitCode: 17, rollback: 'restored' })
  expect(JSON.parse(readFileSync(manifest, 'utf8'))).toHaveProperty('externalWriter', 'retain-this-commit')
  expect(realpathSync(join(f.dir, 'node_modules', 'activation-bundle'))).toBe(first.root)
  expect(existsSync(`${manifest}.lock`)).toBe(false)
})


// POSIX alone retains a descendant's inherited pipes after the direct child exits.
it.skipIf(process.platform === 'win32')('quiesces successful pnpm descendants before compatibility rollback', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const next = await bundle(f, '2.0.0')
  const pid = join(f.home, 'lifecycle.pid')
  const stop = join(f.home, 'lifecycle.stop')
  const done = join(f.home, 'lifecycle.done')
  const sawDescendant = join(f.home, 'repair-saw-descendant')
  const script = join(f.home, 'lifecycle.mjs')
  writeFileSync(script, `
import { existsSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
writeFileSync(${JSON.stringify(pid)}, String(process.pid))
while (!existsSync(${JSON.stringify(stop)})) await sleep(10)
writeFileSync(${JSON.stringify(done)}, '')
`)
  onTestFinished(async () => {
    if (!existsSync(pid)) return
    writeFileSync(stop, '')
    await eventually(() => {
      if (existsSync(done)) return true
      try { process.kill(Number(readFileSync(pid, 'utf8')), 0); return false } catch { return true }
    }, 'Lifecycle fixture did not exit')
  })
  const update = f.barrier(next.root, 0, 0, {
    TEST_DESCENDANT_SCRIPT: script, TEST_DESCENDANT_PID: pid, TEST_REPAIR_SAW_DESCENDANT: sawDescendant,
    TEST_INCOMPATIBLE_MANIFEST: join(next.root, 'package.json'),
  })
  await update.written()
  update.release()
  const result = await update.task
  expect(result.exitCode).toBe(1)
  if (existsSync(sawDescendant)) expect(readFileSync(sawDescendant, 'utf8')).toBe('false')
  else {
    expect(result.rollback).toBe('incomplete')
    expect(existsSync(join(f.dir, '.plugin-manager', 'run.json'))).toBe(true)
  }
})


it('does not claim file recovery when a live process tree prevents compatibility rollback', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const pkg = await bundle(f)
  const manifest = readFileSync(join(f.dir, 'package.json'), 'utf8')
  const update = f.barrier(pkg.root, 0, 0, { TEST_INCOMPATIBLE_MANIFEST: join(pkg.root, 'package.json') })
  await update.written()
  // The process-liveness probe cannot establish quiescence, so no restore may begin.
  const alive = vi.spyOn(runTree, 'treeAlive').mockReturnValue(true)
  const wait = vi.spyOn(runTree, 'awaitTreeGone').mockResolvedValue()
  onTestFinished(() => { alive.mockRestore(); wait.mockRestore() })
  update.release()
  const result = await update.task
  expect(result).toMatchObject({ exitCode: 1, rollback: 'incomplete' })
  expect(result.output).toContain('package rollback is incomplete')
  expect(result.output).not.toContain('restored package.json')
  expect(readFileSync(join(f.dir, 'package.json'), 'utf8')).not.toBe(manifest)
  expect(existsSync(join(f.dir, '.plugin-manager', 'run.json'))).toBe(true)
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
})


it.each([
  { dependency: '', link: null },
  { dependency: null, link: '' },
  { dependency: 'link:missing', link: null },
  { dependency: null, link: './missing' },
])('requires exact null absence in the expected snapshot %j', async (expected) => {
  const f = await fixture()
  const root = join(f.home, 'target')
  mkdirSync(root)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'activation-bundle', version: '1.0.0' }))
  const invoked = join(f.home, 'pnpm-invoked')
  const result = await f.run(root, {
    rollbackPackage: 'activation-bundle', rollbackExpected: expected,
    args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(invoked)}, '')`, '--'],
  })
  expect(result).toMatchObject({ exitCode: 1 })
  expect(result.output).toContain(expected.dependency === '' || expected.link === ''
    ? 'rollback-expected requires' : 'changed after application preflight')
  expect(existsSync(invoked)).toBe(false)
  expect(f.snapshot('activation-bundle')).toEqual({ dependency: null, link: null })
})

it.each([
  '{"rollbackPackage":"activation-bundle"}',
  '{"rollbackPackage":"activation-bundle","rollbackExpected":null}',
  '{"rollbackPackage":"activation-bundle","rollbackExpected":[]}',
  '{"rollbackPackage":"activation-bundle","rollbackExpected":{"dependency":null}}',
  '{"rollbackPackage":"activation-bundle","rollbackExpected":{"dependency":null,"link":null,"extra":true}}',
  '{"rollbackPackage":"activation-bundle","rollbackExpected":{"dependency":1,"link":null}}',
  '{"rollbackPackage":"activation-bundle","rollbackExpected":{"dependency":null,"link":false}}',
  '{"rollbackExpected":{"dependency":null,"link":null}}',
  JSON.stringify({ rollbackPackage: 'activation-bundle', rollbackExpected: { dependency: 'x'.repeat(4097), link: null } }),
  JSON.stringify({ rollbackPackage: 'activation-bundle', rollbackExpected: { dependency: null, link: '界'.repeat(1366) } }),
])('rejects a malformed serialized rollback request %# before pnpm starts', async (serialized) => {
  const f = await fixture()
  const root = join(f.home, 'target')
  mkdirSync(root)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'activation-bundle', version: '1.0.0' }))
  const invoked = join(f.home, 'pnpm-invoked')
  const malformed: unknown = JSON.parse(serialized)
  if (typeof malformed !== 'object' || malformed === null) throw new Error('the fixture request must be an object')
  // Serialized JS callers do not have the options interface's field guarantees.
  const result: unknown = await Reflect.apply(f.command, undefined, [['add', `link:${root}`], {
    ...malformed, args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(invoked)}, '')`, '--'],
  }])
  expect(result).toMatchObject({ exitCode: 1 })
  expect(existsSync(invoked)).toBe(false)
  expect(f.snapshot('activation-bundle')).toEqual({ dependency: null, link: null })
})

it('compares the raw link spelling even when a different spelling reaches the same directory', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  const expected = f.snapshot('activation-bundle')
  const otherSpelling = expected.link === first.root ? `${first.root}/.` : first.root
  const result = await f.run(first.root, {
    rollbackPackage: 'activation-bundle', rollbackExpected: { ...expected, link: otherSpelling },
  })
  expect(result).toMatchObject({ exitCode: 1 })
  expect(result.output).toContain('changed after application preflight')
  expect(f.snapshot('activation-bundle')).toEqual(expected)
})

it('rejects a stale managed snapshot after another process commits a user link under the profile lock', { timeout: 30_000 }, async () => {
  const f = await fixture()
  const first = await bundle(f)
  expect(await f.run(first.root)).toMatchObject({ exitCode: 0 })
  await eventually(() => existsSync(first.marker), 'Initial bundle did not activate')
  const expected = f.snapshot('activation-bundle')
  const next = await bundle(f, '2.0.0')
  const userRoot = join(f.home, 'user-package')
  mkdirSync(userRoot)
  writeFileSync(join(userRoot, 'package.json'), JSON.stringify({ name: 'activation-bundle', version: '3.0.0' }))
  writeFileSync(join(userRoot, 'owned.txt'), 'keep this user package')
  const acquired = join(f.home, 'snapshot-writer-acquired')
  const release = join(f.home, 'snapshot-writer-release')
  const invoked = join(f.home, 'pnpm-invoked')
  const manifestPath = join(f.dir, 'package.json')
  const linkPath = join(f.dir, 'node_modules', 'activation-bundle')
  const lock = readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')
  const lockSource = new URL('../../../util/atomic-write/src/index.ts', import.meta.url).href
  const writer = f.fork(`
import { withFileLock } from ${JSON.stringify(lockSource)}
import { existsSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
await withFileLock(${JSON.stringify(manifestPath)}, async () => {
  writeFileSync(${JSON.stringify(acquired)}, '')
  while (!existsSync(${JSON.stringify(release)})) await sleep(10)
  const manifest = JSON.parse(readFileSync(${JSON.stringify(manifestPath)}, 'utf8'))
  manifest.dependencies['activation-bundle'] = ${JSON.stringify(`link:${userRoot}`)}
  writeFileSync(${JSON.stringify(manifestPath)}, JSON.stringify(manifest))
  unlinkSync(${JSON.stringify(linkPath)})
  symlinkSync(${JSON.stringify(userRoot)}, ${JSON.stringify(linkPath)}, process.platform === 'win32' ? 'junction' : 'dir')
})
`)
  await eventually(() => existsSync(acquired), 'Separate writer did not acquire the profile lock')
  const update = f.run(next.root, {
    rollbackPackage: 'activation-bundle', rollbackExpected: expected,
    args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(invoked)}, '')`, '--'],
  })
  writeFileSync(release, '')
  expect(await writer).toMatchObject({ exitCode: 0, timedOut: false })
  const committedManifest = readFileSync(manifestPath, 'utf8')
  const userLink = readlinkSync(linkPath)
  const result = await update
  expect(result).toMatchObject({ exitCode: 1 })
  expect(result.output).toContain('changed after application preflight')
  expect(existsSync(invoked)).toBe(false)
  expect(readFileSync(manifestPath, 'utf8')).toBe(committedManifest)
  expect(readFileSync(join(f.dir, 'pnpm-lock.yaml'), 'utf8')).toBe(lock)
  expect(readlinkSync(linkPath)).toBe(userLink)
  expect(realpathSync(linkPath)).toBe(userRoot)
  expect(readFileSync(join(userRoot, 'owned.txt'), 'utf8')).toBe('keep this user package')
  expect(readFileSync(f.profile.patchPath, 'utf8')).toBe(f.patch)
})


it('does not confuse a malformed persisted null dependency with absence', async () => {
  const f = await fixture()
  const root = join(f.home, 'target')
  mkdirSync(root)
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'activation-bundle', version: '1.0.0' }))
  const manifestPath = join(f.dir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, object>
  manifest.dependencies = { 'activation-bundle': null }
  const stored = JSON.stringify(manifest)
  writeFileSync(manifestPath, stored)
  const invoked = join(f.home, 'pnpm-invoked')
  const result = await f.run(root, {
    rollbackPackage: 'activation-bundle', rollbackExpected: { dependency: null, link: null },
    args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(invoked)}, '')`, '--'],
  })
  expect(result).toMatchObject({ exitCode: 1 })
  expect(result.output).toContain('invalid dependency value')
  expect(existsSync(invoked)).toBe(false)
  expect(readFileSync(manifestPath, 'utf8')).toBe(stored)
})
