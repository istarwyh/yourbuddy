/** Assert the Bootstrap archive resource inventory without starting the application. */
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PNPM_ARTIFACT } from './prepare-managed-toolchain.mjs'

/**
 * Require the signed channel and current fixed pnpm archive, excluding Offline resources.
 * @param resources - extracted Bootstrap application's Resources directory.
 */
export function assertBootstrapResources(resources) {
  for (const name of ['harness-source', 'toolchain', 'yourbuddy-runtime', 'component-seeds']) {
    assert.equal(existsSync(join(resources, name)), false, `Bootstrap must exclude ${name}`)
  }
  for (const name of ['components.json', PNPM_ARTIFACT.file]) {
    const path = join(resources, 'component-channel', name)
    assert.ok(existsSync(path) && statSync(path).isFile(), `Bootstrap resource is missing: ${name}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv[2], 'usage: assert-bootstrap-resources.mjs <Resources>')
  assertBootstrapResources(process.argv[2])
}
