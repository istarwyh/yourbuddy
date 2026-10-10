import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../splash-state.js', import.meta.url), 'utf8')
function fixture(invoke) {
  const context = { window: {} }
  vm.runInNewContext(source, context)
  const renders = []
  const errors = []
  const scheduled = []
  const cancelled = []
  const state = context.window.DSH_SPLASH_STATE.start({
    invoke,
    render: value => renders.push(value),
    onError: value => errors.push(value),
    schedule: callback => { scheduled.push(callback); return scheduled.length },
    cancel: timer => cancelled.push(timer),
  })
  return { state, renders, errors, scheduled, cancelled }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('a late splash reads retained byte progress and terminal error', async () => {
  const snapshot = { component: 'harness', transferred: 2833658, total: 33896375, error: 'connection interrupted' }
  const f = fixture(async (command, args) => {
    assert.equal(command, 'run_first_party_command')
    assert.equal(args.command, 'get_boot_status')
    return snapshot
  })
  await flush()
  assert.deepEqual(f.renders, [snapshot])
  f.state.stop()
  assert.deepEqual(f.cancelled, [1])
})

test('a failed state read is visible and the next poll recovers', async () => {
  let calls = 0
  const f = fixture(async () => {
    if (++calls === 1) throw new Error('bridge not ready')
    return { error: 'offline' }
  })
  await flush()
  assert.match(f.errors[0], /bridge not ready/u)
  await f.scheduled.shift()()
  assert.equal(f.renders.at(-1).error, 'offline')
  f.state.stop()
})

test('repeated retry clicks start one native retry and never retry an active boot', async () => {
  let snapshot = { error: null, retryRequested: false }
  let retries = 0
  let complete
  const f = fixture(async (_command, args) => {
    if (args.command === 'get_boot_status') return snapshot
    retries++
    await new Promise(resolve => { complete = resolve })
  })
  await flush()
  await f.state.retry()
  assert.equal(retries, 0)
  snapshot = { error: 'offline', retryRequested: false }
  await f.scheduled.shift()()
  const first = f.state.retry()
  await f.state.retry()
  assert.equal(retries, 1)
  assert.equal(f.renders.at(-1).retryRequested, true)
  complete()
  await first
  await f.state.retry()
  assert.equal(retries, 1)
  f.state.stop()
})

test('a rejected retry permits another user action and reports the error', async () => {
  let retries = 0
  const f = fixture(async (_command, args) => {
    if (args.command === 'get_boot_status') return { error: 'offline', retryRequested: false }
    retries++
    throw new Error('invoke failed')
  })
  await flush()
  await f.state.retry()
  assert.match(f.errors[0], /invoke failed/u)
  await f.state.retry()
  assert.equal(retries, 2)
  f.state.stop()
})

test('unloading suppresses in-flight state updates and further polling', async () => {
  let complete
  const f = fixture(() => new Promise(resolve => { complete = resolve }))
  f.state.stop()
  complete({ error: 'late failure' })
  await flush()
  assert.equal(f.renders.length, 0)
  assert.equal(f.scheduled.length, 0)
})

test('both production and development preparation include the splash controller', () => {
  for (const name of ['prepare-bootstrap-shell.mjs', 'prepare-dist.mjs']) {
    assert.match(readFileSync(new URL(name, import.meta.url), 'utf8'), /splash-state\.js/u)
  }
  const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8')
  assert.match(rust, /"get_boot_status"/u)
  assert.match(rust, /"retry_boot"/u)
  assert.doesNotMatch(rust.slice(rust.indexOf('async fn run_first_party_command'), rust.indexOf('let payload = payload')), /runtime: tauri::State/u)
})

test('the shipped splash renders retained failure details and copies its visible diagnostic', async () => {
  const html = readFileSync(new URL('../splash.html', import.meta.url), 'utf8')
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gu)].at(-1)[1]
  const elements = new Map()
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', style: {}, events: {}, addEventListener(name, callback) { this.events[name] = callback } })
    return elements.get(id)
  }
  let options
  let retries = 0
  let copied
  const context = {
    window: {
      DSH_I18N: { apply() {}, t: key => key },
      DSH_SPLASH_STATE: { start(value) { options = value; return { async retry() { retries++ }, stop() {} } } },
      addEventListener() {},
    },
    document: { getElementById: element, body: { classList: { toggle() {} } } },
    navigator: { clipboard: { async writeText(value) { copied = value } } },
  }
  vm.runInNewContext(inline, context)
  options.render({ component: 'harness', phase: 'download', transferred: 2833658, total: 33896375, attempt: 3, maxAttempts: 3, error: 'connection interrupted', retryRequested: false })
  assert.equal(element('status').textContent, 'splash.failed')
  assert.equal(element('error').textContent, 'connection interrupted')
  assert.match(element('details').textContent, /harness.*8%.*3\/3/u)
  assert.equal(element('recovery').hidden, false)
  assert.equal(element('retry').disabled, false)
  await element('retry').events.click()
  assert.equal(retries, 1)
  await element('copy').events.click()
  assert.match(copied, /connection interrupted/u)
  assert.match(copied, /2,833,658/u)
  assert.equal(element('copy').textContent, 'splash.copied')
  options.render({ error: 'connection interrupted', retryRequested: true })
  assert.equal(element('retry').disabled, true)
  assert.equal(element('retry').textContent, 'splash.restarting')
})
