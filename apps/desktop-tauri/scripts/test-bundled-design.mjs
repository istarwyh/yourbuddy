/** Run adapter regressions against the exact installed product pair, followed by its real Host. */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync } from 'node:fs'

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repository = resolve(desktop, '../..')
const harness = resolve(process.env.YOURBUDDY_DESIGN_HARNESS ?? join(desktop, 'bundled/harness'))
const installed = createRequire(join(harness, 'apps/cli/package.json'))
const adapter = join(desktop, 'product/claude-design-adapter')
const env = {
  ...process.env,
  YOURBUDDY_DESIGN_HARNESS: harness,
  YOURBUDDY_DESIGN_PACKAGE: dirname(installed.resolve('dsh-claude-design/package.json')),
  YOURBUDDY_DESIGN_ARTIFACTS_ENTRY: installed.resolve('dsh-claude-artifacts'),
  YOURBUDDY_DESIGN_ADAPTER_ENTRY: join(harness, 'packages/product/claude-design-adapter/editor-owner.mjs'),
}
for (const args of [
  ['--test', join(desktop, 'scripts/test-bundled-design.test.mjs'), ...readdirSync(adapter).filter(name => name.endsWith('.test.mjs')).map(name => join(adapter, name))],
  [join(repository, 'node_modules/vitest/vitest.mjs'), 'run', '--config', join(adapter, 'vitest.config.ts')],
  [join(desktop, 'scripts/verify-design-runtime.mjs'), ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, args, { cwd: repository, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
