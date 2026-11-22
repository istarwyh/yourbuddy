import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { artifactMatches, TOOLCHAIN_ARTIFACTS } from './prepare-managed-toolchain.mjs'

test('artifactMatches accepts only the pinned digest', () => {
  const bytes = Buffer.from('yourbuddy')
  const artifact = {
    algorithm: 'sha256',
    encoding: 'hex',
    digest: createHash('sha256').update(bytes).digest('hex'),
  }
  assert.equal(artifactMatches(bytes, artifact), true)
  assert.equal(artifactMatches(Buffer.from('changed'), artifact), false)
})

test('managed toolchain pins one macOS arm64 Node and pnpm artifact', () => {
  assert.deepEqual(TOOLCHAIN_ARTIFACTS.map(row => row.file), [
    'node-v24.22.3-darwin-arm64.tar.gz',
    'pnpm-11.28.5.tgz',
  ])
})

test('Rust provisioning uses the same artifact versions and digests as release preparation', () => {
  const config = readFileSync(new URL('../src-tauri/src/runtime/config.rs', import.meta.url), 'utf8')
  for (const [index, name, version] of [[0, 'NODE', '24.22.3'], [1, 'PNPM', '11.28.5']]) {
    const artifact = TOOLCHAIN_ARTIFACTS[index]
    assert.ok(config.includes(`DEFAULT_${name}_VERSION: &str = "${version}"`))
    assert.ok(config.includes(`BUNDLED_${name}_ARCHIVE: &str = "${artifact.file}"`))
    const digest = artifact.encoding === 'base64' ? Buffer.from(artifact.digest, 'base64').toString('hex') : artifact.digest
    assert.ok(config.includes(`"${digest}"`))
    assert.equal(artifact.url, index === 0
      ? `https://nodejs.org/dist/v${version}/${artifact.file}`
      : `https://registry.npmjs.org/pnpm/-/${artifact.file}`)
  }
})
