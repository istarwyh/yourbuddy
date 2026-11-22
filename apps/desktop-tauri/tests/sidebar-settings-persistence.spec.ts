/** Product sidebar preferences persist through the real profile/settings lifecycle. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { load as parse } from 'js-yaml'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { configurationFixture } from '../../../packages/settings/settings/tests/configuration-fixture.ts'
import { Config } from '../product/dsh-better-sidebar/src/config.ts'

const desktop = fileURLToPath(new URL('../', import.meta.url))
type Row = { id?: string; name?: string; config?: Record<string, unknown>; insert?: Row[] }

it('retains disabled and enabled auto-open preferences after profile writes and restarts, and rejects a final config override', async () => {
  // Only the sidebar host effects are omitted; its shipping schema and the entire settings write path are real.
  const fixture = await configurationFixture({ schema: Config, hmr: false })
  await fixture.ctx.fiber.dispose()
  const producer = new URL('../scripts/bundle-harness-source.mjs', import.meta.url)
  // Use the shipping patch renderer and source layers without packaging unrelated plugin snapshots.
  const bundled = spawnSync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    import { readFileSync } from 'node:fs';
    import { renderProductBundleLayers } from ${JSON.stringify(producer.href)};
    const patch = renderProductBundleLayers(readFileSync(process.argv[1], 'utf8'), [readFileSync(process.argv[2], 'utf8')]);
    assert.throws(() => renderProductBundleLayers(patch, []), /product bundle layers are already installed/);
    process.stdout.write(patch);
  `, fileURLToPath(new URL('../../../packages/bundle/web-app/cordis.patch.yml', import.meta.url)), join(desktop, 'product/dsh-better-sidebar/cordis.patch.yml')], {
    encoding: 'utf8', timeout: 120_000,
  })
  expect(bundled.error).toBeUndefined()
  expect(bundled.signal).toBeNull()
  expect(bundled.status, bundled.stderr).toBe(0)
  const productPatch = join(fixture.home, 'product-bundle.patch.yml')
  writeFileSync(productPatch, bundled.stdout)
  const generated = loadOverlayPatches('test', productPatch) as Row[]
  const sidebar = generated.flatMap(row => row.insert ?? []).find(row => row.id === 'better-sidebar')!
  expect(sidebar).toBeDefined()
  const defaults = generated.filter(row => row.id === 'better-sidebar')
  expect(defaults).toEqual([{ id: 'better-sidebar', config: { presentation: 'slot' } }])
  const bundlePath = join(fixture.profile.dir, 'node_modules/test-bundle/cordis.patch.yml')
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as Row[]
  const first = bundle[0]
  assert.ok(first)
  assert.ok(first.insert)
  first.insert = first.insert.filter(row => row.id !== 'first' && row.id !== 'second')
  first.insert.push({ id: sidebar.id, name: 'cordis:probe', config: sidebar.config })
  writeFileSync(bundlePath, JSON.stringify([...bundle, ...defaults]))

  const rendered = spawnSync('cargo', ['run', '--quiet', '--locked', '--manifest-path', join(desktop, 'scripts/native-overlay-renderer/Cargo.toml')], {
    input: JSON.stringify({ pluginUrl: new URL('file:///tmp/sidebar-notify.mjs').href, projectRoot: fixture.home, harborBin: join(fixture.home, 'harbor'), harborDshBin: join(fixture.home, 'harbor-dsh') }),
    encoding: 'utf8', timeout: 120_000,
  })
  expect(rendered.error).toBeUndefined()
  expect(rendered.signal).toBeNull()
  expect(rendered.status, rendered.stderr).toBe(0)
  const overlayPath = join(fixture.home, 'desktop.patch.yml')
  writeFileSync(overlayPath, rendered.stdout)
  const overlay = loadOverlayPatches('test', overlayPath).filter(row => row.id === 'better-sidebar')
  expect(overlay).toHaveLength(1)
  expect(overlay[0]).not.toHaveProperty('config')
  Object.assign(fixture.profile, { overlays: overlay })

  let ctx = await fixture.start()
  try {
    const read = () => ctx.settings.describe().find(row => row.ns === 'better-sidebar')!.value
    expect(read()).toMatchObject({ autoOpenJobs: true, autoOpenSubagent: true })
    for (const enabled of [false, true]) {
      const preferences = { autoOpenJobs: enabled, autoOpenSubagent: enabled }
      await ctx.settings.update('better-sidebar', preferences)
      expect(read()).toMatchObject(preferences)
      const persisted = parse(readFileSync(fixture.profile.patchPath, 'utf8')) as Row[]
      expect(persisted.find(row => row.id === 'better-sidebar')?.config).toMatchObject(preferences)
      await ctx.fiber.dispose()
      ctx = await fixture.start()
      expect(read()).toMatchObject(preferences)
      expect(ctx.configEditor.configuration().find(row => row.entry.options.id === 'better-sidebar')!.entry.options.config).toMatchObject({ presentation: 'slot', ...preferences })
    }

    await ctx.fiber.dispose()
    // This is the former final desktop overlay row, not a substitute settings implementation.
    const legacy: PatchOptions[] = [{ id: 'better-sidebar', config: { presentation: 'slot' } }]
    Object.assign(fixture.profile, { overlays: legacy })
    ctx = await fixture.start()
    const before = readFileSync(fixture.profile.patchPath, 'utf8')
    await expect(ctx.settings.update('better-sidebar', { autoOpenJobs: false, autoOpenSubagent: false })).rejects.toThrow('overridden')
    expect(readFileSync(fixture.profile.patchPath, 'utf8')).toBe(before)
    expect(read()).toMatchObject({ autoOpenJobs: true, autoOpenSubagent: true })
  } finally {
    await ctx.fiber.dispose()
  }
}, 180_000) // A clean checkout compiles the native overlay renderer before booting the settings fixture.
