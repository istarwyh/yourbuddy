import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const verifier = join(scriptsDir, 'verify-harbor-host-path-translation.py')
const python = process.platform === 'win32' ? 'python' : 'python3'

test('Harbor Host translation preserves resolved paths and translates logical paths once', () => {
  const result = spawnSync(python, [verifier], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.deepEqual(JSON.parse(result.stdout), {
    source: 'product/harbor-python/src/harbor_dsh_evolution/host_environment.py',
    status: 'passed',
  })
})
