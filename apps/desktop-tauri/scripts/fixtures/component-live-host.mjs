/** Real built Host watcher used by the native Harbor managed-capability installation smoke. */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const [builtRoot, home] = process.argv.slice(2)
const built = path => import(pathToFileURL(join(builtRoot, path)))
const { boot, createRuntimeResolution, initProfile, loadProfileDirectory, PluginPackages, readProfilePatches } = await built('packages/boot/app-boot/lib/index.js')
const { default: Timer } = await built('vendor/timer/lib/index.js')
const { default: Hmr } = await built('packages/boot/hmr/lib/index.js')
const dir = join(home, 'profiles/web')
mkdirSync(dir, { recursive: true })
initProfile(dir, [])
writeFileSync(join(dir, 'cordis.yml'), '[]\n')
const profileContext = {
  name: 'web', dir, home, cwd: builtRoot, patchPath: join(dir, 'cordis.patch.yml'),
  installAnchor: join(builtRoot, 'apps/cli/package.json'), startedBundles: [], overlays: [], telemetryDisabledEnv: undefined,
}
writeFileSync(profileContext.patchPath, JSON.stringify([{ insert: [
  { id: 'timer', name: 'cordis:timer' },
  { id: 'hmr', name: 'cordis:hmr', config: { root: [], awaitWriteFinish: { stabilityThreshold: 20, pollInterval: 10 } } },
] }]))
const profile = loadProfileDirectory('component-smoke', dir, profileContext.installAnchor)
const resolution = await createRuntimeResolution({ installAnchor: profileContext.installAnchor, profile, home })
let ready
const routes = new Map()
const tools = new Set()
let registeredSkill = false
const ctx = await boot('component-smoke', join(dir, 'cordis.yml'), readProfilePatches('component-smoke', profileContext), async host => {
  host.logger.exporter({ export(record) { console.log(JSON.stringify(record, (_key, value) => value instanceof Error ? value.stack : value)) } })
  host.provide('profileContext', profileContext)
  host.provide('appReady', { onReady(listener) { ready = listener; return () => { ready = undefined } } })
  // Only provider registration is exercised; no evaluation, model request or job is started.
  host.provide('tools', { register(tool) { tools.add(tool.name); return () => tools.delete(tool.name) } })
  host.provide('skills', { register() { registeredSkill = true; return () => { registeredSkill = false } } })
  host.provide('llm', {})
  host.provide('agentDefaultModel', {})
  host.provide('sessions', { get() { return undefined } })
  host.provide('webServer', { register(route) { routes.set(route.path, route); return () => routes.delete(route.path) } })
  host.loader.builtins.timer = Timer
  host.loader.builtins.hmr = Hmr
  await host.plugin(PluginPackages, { resolution })
})
try {
  ready?.()
  await ctx.hmr.runExclusive(async () => {})
  writeFileSync(join(home, 'host-ready'), '')
  const deadline = Date.now() + 60_000
  let previous = ''
  while (!existsSync(join(home, 'host-stop'))) {
    if (Date.now() >= deadline) throw new Error('native component smoke did not settle')
    const entries = [...ctx.loader.entries()]
    const status = JSON.stringify(entries.map(entry => ({ id: entry.options.id, name: entry.options.name, state: entry.fiber?.state })))
    if (status !== previous) { console.log(status); previous = status }
    const entry = entries.find(entry => entry.options.id === 'harbor-evolution')
    if (entry?.fiber?.state === 2 && routes.has('/_dsh/harbor-evolution/version') && !existsSync(join(home, 'host-mounted'))) {
      assert(tools.has('harbor_candidate_snapshot'))
      assert(registeredSkill)
      writeFileSync(join(home, 'host-mounted'), entry.id)
    }
    await sleep(10)
  }
} finally {
  await ctx.fiber.dispose()
  assert.equal(routes.size, 0)
  writeFileSync(join(home, 'host-disposed'), '')
}
