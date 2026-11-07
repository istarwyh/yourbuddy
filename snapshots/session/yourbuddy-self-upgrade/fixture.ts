/** Bind the actual product plugin to a test-only external native installer. */
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

/** Loader identity for the native fixture provider. */
export const name = 'yourbuddy-upgrade-fixture'

/**
 * Mount the shipped product registration with an external process fixture.
 * @param ctx - Test-only fixture scope in the shipped headless profile.
 */
export async function apply(ctx: Context): Promise<void> {
  const root = join(process.cwd(), '.dsh', 'upgrade-fixture')
  await mkdir(root, { recursive: true })
  // The committed product bundle keeps its runtime peers external. Link the
  // workspace package roots so plain Node selects their built exports too.
  const plugin = join(root, 'plugin')
  const scope = join(plugin, 'node_modules', '@deepseek-ai')
  await mkdir(scope, { recursive: true })
  const peers = {
    schemastery: 'vendor/schemastery',
    'dsh-http-proxy': 'packages/util/http-proxy',
    'dsh-brand': 'packages/util/brand',
    'dsh-tools': 'packages/core/tools',
    'dsh-util-values': 'packages/util/values',
  }
  for (const [name, path] of Object.entries(peers)) {
    await symlink(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), join(scope, name), 'dir')
  }
  const entry = join(plugin, 'index.mjs')
  await writeFile(entry, await readFile(new URL('../../../apps/desktop-tauri/product/personal-workbench/index.js', import.meta.url)))
  const personalWorkbench = await import(pathToFileURL(entry).href)
  const executable = join(root, 'YourBuddy')
  const native = fileURLToPath(new URL('./native-fixture.mjs', import.meta.url))
  await writeFile(executable, `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(native)} "$@"\n`, { mode: 0o700 })
  const previousApp = process.env.YOURBUDDY_DESKTOP_APP
  const previousExecutable = process.env.YOURBUDDY_DESKTOP_EXECUTABLE
  process.env.YOURBUDDY_DESKTOP_APP = '/Applications/YourBuddy.app'
  process.env.YOURBUDDY_DESKTOP_EXECUTABLE = executable
  ctx.effect(() => () => {
    if (previousApp === undefined) delete process.env.YOURBUDDY_DESKTOP_APP
    else process.env.YOURBUDDY_DESKTOP_APP = previousApp
    if (previousExecutable === undefined) delete process.env.YOURBUDDY_DESKTOP_EXECUTABLE
    else process.env.YOURBUDDY_DESKTOP_EXECUTABLE = previousExecutable
  })
  await ctx.plugin(personalWorkbench)
}
