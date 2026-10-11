import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { verifyOldComponentChannel } from './verify-old-component-channel.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-old-channel-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const path = join(root, 'components.json')
  const bytes = Buffer.from('{"schemaVersion":1}\n')
  writeFileSync(path, bytes)
  return { path, bytes }
}

test('checks signature-before-schema and restores exact fixture bytes', (t) => {
  const { path, bytes } = fixture(t)
  let calls = 0
  verifyOldComponentChannel('fixture-app', path, (executable, args, options) => {
    assert.equal(executable, 'fixture-app')
    assert.deepEqual(args, ['--yourbuddy-component-helper', 'verify-channel'])
    assert.equal(options.timeout, 60_000)
    calls += 1
    const original = readFileSync(path).equals(bytes)
    return { status: 1, stderr: original ? 'unsupported component manifest schema 1\n' : 'component manifest signature failed: fixture\n' }
  })
  assert.equal(calls, 3)
  assert.deepEqual(readFileSync(path), bytes)
})

test('rejects acceptance or a deserialize error as proof of authentic old-schema rejection', (t) => {
  const { path, bytes } = fixture(t)
  for (const result of [{ status: 0, stderr: '' }, { status: 1, stderr: 'component manifest is invalid: missing field kind' }]) {
    assert.throws(() => verifyOldComponentChannel('fixture-app', path, () => result))
    assert.deepEqual(readFileSync(path), bytes)
  }
})

test('restores the fixture when tampering is wrongly accepted or reported as schema failure', (t) => {
  const { path, bytes } = fixture(t)
  for (const result of [{ status: 0, stderr: '' }, { status: 1, stderr: 'unsupported component manifest schema 1' }]) {
    let calls = 0
    assert.throws(() => verifyOldComponentChannel('fixture-app', path, () => ++calls === 1
      ? { status: 1, stderr: 'unsupported component manifest schema 1' } : result))
    assert.deepEqual(readFileSync(path), bytes)
  }
})

test('the packaged-splash workflow keeps legacy rejection separate from current candidate acceptance', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/bootstrap-regression.yml', import.meta.url), 'utf8')
  assert.match(workflow, /yourbuddy-v0\.4\.8\/yourbuddy-0\.4\.8-bootstrap/)
  assert.match(workflow, /node apps\/desktop-tauri\/scripts\/verify-old-component-channel\.mjs "\$app"/)
  assert.match(workflow, /node apps\/desktop-tauri\/scripts\/smoke-bootstrap-macos\.mjs "\$app"/)
  assert.doesNotMatch(workflow, /"\$app" --yourbuddy-component-helper verify-channel/)
})
