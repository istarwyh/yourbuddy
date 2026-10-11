import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { applyRecordedMaterializedPatches } from './refresh-product-plugins.mjs'
import { hashExternalSnapshot } from './bundle-harness-source.mjs'

const product = new URL('../product/', import.meta.url)
const client = readFileSync(new URL('pomodoro/lib/client.js', product), 'utf8')
const slice = (start, end) => {
  const index = client.indexOf(start)
  const finish = client.indexOf(end, index)
  assert.ok(index >= 0 && finish > index)
  return client.slice(index, finish)
}
// Execute the shipped commit function and user-action engine; storage/lock scheduling are controlled inputs.
const commitSource = slice('      function commitRuntime(mutator) {', '      function unchangedRuntime(snapshot) {')
const transitionSource = slice('      function transitionRunning(snapshot, now, desiredRunning) {', '      function requestDeadlineReconcile(')
const engineSource = slice('      function reportYourBuddyInvocation(succeeded) {', '      const toggleRun = () => {')

function engineFixture(options = {}) {
  const events = []
  const diagnostics = []
  const storage = { snapshot: null, writes: 0 }
  const setup = Function('options', 'events', 'diagnostics', 'storage', `
    let s = { revision: 0, phase: 'focus', running: false, totalMs: 60000, remainingMs: 60000, open: true };
    let runtimeDisposed = false;
    let runtimeTail = Promise.resolve();
    const RUNTIME_SNAPSHOT_VERSION = 1;
    const runtimeStorage = {};
    const listeners = new Set();
    const console = { warn: value => diagnostics.push(value) };
    const window = { dispatchEvent(event) { if (options.failMetrics) throw new Error('metrics unavailable'); events.push(event.detail); } };
    const currentRuntimeSnapshot = () => ({ ...s });
    const readRuntimeSnapshot = () => storage.snapshot;
    const writeRuntimeSnapshot = value => { if (options.failCommit) throw new Error('commit rejected'); storage.snapshot = value; storage.writes++; return true; };
    const adoptRuntimeSnapshot = value => { s = { ...s, ...value }; };
    const notifyRuntimeChanged = () => {};
    const publishCompletion = () => {};
    const set = value => { s = { ...s, ...value }; };
    const afterRuntimeReady = operation => operation();
    const withRuntimeLock = async operation => { if (options.gate) await options.gate; return operation(); };
    const unchangedRuntime = snapshot => ({ changed: false, next: snapshot });
    ${commitSource}
    ${transitionSource}
    ${engineSource}
    return { engine, dispose() { runtimeDisposed = true; } };
  `)
  return { ...setup(options, events, diagnostics, storage), events, diagnostics, storage }
}

function gate() { let release; const promise = new Promise(resolve => { release = resolve }); return { promise, release } }

test('only actual committed user start and resume emit one local observation each', async () => {
  const pending = gate()
  const value = engineFixture({ gate: pending.promise })
  assert.deepEqual(value.events, [])
  const first = value.engine.toggleRun()
  const repeated = value.engine.toggleRun()
  assert.equal(first, repeated)
  value.engine.toggleOpen()
  assert.deepEqual(value.events, [])
  assert.equal(value.storage.writes, 0)
  pending.release()
  await first
  assert.equal(value.storage.writes, 1)
  assert.deepEqual(value.events, [{ component: 'pomodoro', succeeded: true }])
  await value.engine.toggleRun() // Pause is not an invocation.
  assert.equal(value.events.length, 1)
  await value.engine.toggleRun() // Resume is a new committed user invocation.
  assert.equal(value.events.length, 2)
  assert.deepEqual(Object.keys(value.events[1]).sort(), ['component', 'succeeded'])
})

test('async commit failure counts once, rethrows the product error, and remains retryable', async () => {
  const options = { failCommit: true }
  const value = engineFixture(options)
  const first = value.engine.toggleRun()
  assert.equal(first, value.engine.toggleRun())
  await assert.rejects(first, /commit rejected/u)
  assert.deepEqual(value.events, [{ component: 'pomodoro', succeeded: false }])
  options.failCommit = false
  await value.engine.toggleRun()
  assert.deepEqual(value.events[1], { component: 'pomodoro', succeeded: true })
})

test('unchanged cross-tab state and disposed/HMR instances do not count as new invocations', async () => {
  const unchanged = engineFixture()
  unchanged.storage.snapshot = { ...unchanged.engine.get(), running: true, deadlineAt: Date.now() + 60000, revision: 1 }
  await unchanged.engine.toggleRun()
  assert.equal(unchanged.events.length, 0)
  const pending = gate()
  const old = engineFixture({ gate: pending.promise })
  const operation = old.engine.toggleRun()
  old.dispose()
  pending.release()
  await operation
  assert.equal(old.events.length, 0)
  assert.equal(old.storage.writes, 0)
})

test('metric delivery failure never rolls back or rejects a committed Pomodoro start', async () => {
  const value = engineFixture({ failMetrics: true })
  const result = await value.engine.toggleRun()
  assert.equal(result.running, true)
  assert.equal(value.storage.writes, 1)
  assert.equal(value.diagnostics.length, 1)
})

test('the recorded materialized patch replays exactly and the vendored tree hash matches', t => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-pomodoro-metrics-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'lib'))
  writeFileSync(join(root, 'lib/client.js'), client)
  const record = JSON.parse(readFileSync(new URL('pomodoro/YOURBUDDY_UPSTREAM.json', product), 'utf8'))
  const patch = record.patches.find(item => item.id === 'pomodoro-local-component-metrics')
  assert.ok(patch)
  const patchPath = new URL(patch.file, product)
  assert.equal(createHash('sha256').update(readFileSync(patchPath)).digest('hex'), patch.sha256)
  const reversed = spawnSync('git', ['apply', '--reverse', '--whitespace=error-all', patchPath.pathname], { cwd: root, encoding: 'utf8' })
  assert.equal(reversed.status, 0, reversed.stderr)
  assert.ok(!readFileSync(join(root, 'lib/client.js'), 'utf8').includes('reportYourBuddyInvocation'))
  applyRecordedMaterializedPatches(root, product.pathname, [patch])
  assert.equal(readFileSync(join(root, 'lib/client.js'), 'utf8'), client)
  assert.equal(hashExternalSnapshot(new URL('pomodoro', product).pathname), record.treeSha256)
})
