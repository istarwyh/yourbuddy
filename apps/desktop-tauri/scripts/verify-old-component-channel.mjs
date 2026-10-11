/** Verify an authentic old channel is rejected by schema, and tampering fails before schema parsing. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Exercise the production helper against the old signed CI fixture, restoring its exact bytes. */
export function verifyOldComponentChannel(executable, manifestPath, run = spawnSync) {
  const original = readFileSync(manifestPath)
  const invoke = () => {
    const result = run(executable, ['--yourbuddy-component-helper', 'verify-channel'], {
      encoding: 'utf8', timeout: 60_000,
    })
    if (result.error) throw result.error
    assert.equal(result.status, 1, 'old and tampered channels must not be accepted')
    return result.stderr.trim()
  }
  assert.equal(invoke(), 'unsupported component manifest schema 1',
    'the original fixture must pass real signature verification before old-schema rejection')
  try {
    // Whitespace keeps the old JSON valid while changing the authenticated bytes.
    writeFileSync(manifestPath, Buffer.concat([original, Buffer.from('\n')]))
    assert.match(invoke(), /^component manifest signature failed:/,
      'tampered bytes must fail signature verification, not schema validation')
  } finally {
    writeFileSync(manifestPath, original)
  }
  assert.equal(invoke(), 'unsupported component manifest schema 1')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw new Error('usage: verify-old-component-channel.mjs <app-executable> <fixture-manifest>')
  verifyOldComponentChannel(process.argv[2], process.argv[3])
  console.log('old signed schema rejected; tampered signature rejected; fixture restored')
}
