import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const shell = readFileSync(new URL('../shell.html', import.meta.url), 'utf8')
const source = shell.slice(shell.indexOf("    const appFrame = document.getElementById('app')"), shell.indexOf('\n    function openHost()'))

function fixture(invoke = async () => ({ restartRequired: true })) {
  const replies = []
  const frame = { contentWindow: { postMessage: (data, origin) => replies.push({ data, origin }) } }
  const window = { __DSH_WEB_URL__: 'http://127.0.0.1:19387/', __TAURI__: { core: { invoke } }, addEventListener: (type, handler) => { if (type === 'message') window.message = handler } }
  Function('document', 'window', 'URL', source)({ getElementById: () => frame }, window, URL)
  const send = async (fields = {}, origin = 'http://127.0.0.1:19387', sender = frame.contentWindow) => {
    await window.message({ origin, source: sender, data: { channel: 'yourbuddy.desktop.components', version: 1, type: 'install-request', requestId: 'install_1', ...(['get-request', 'ready-request'].includes(fields.type) ? {} : { component: 'pomodoro' }), ...fields } })
    await Promise.resolve()
    await Promise.resolve()
  }
  return { send, replies, frame }
}

test('component shell dispatcher rejects unrelated origins, frames, methods and executable payloads', async () => {
  const calls = []
  const value = fixture(async (...args) => { calls.push(args) })
  await value.send({}, 'http://127.0.0.1:1234')
  await value.send({}, 'http://127.0.0.1:19387', {})
  for (const change of [{ type: 'execute-request' }, { requestId: '../request' }, { command: 'quit' }, { component: '../pomodoro' }, { path: '/tmp/plugin' }, { version: 2 }]) await value.send(change)
  assert.deepEqual(calls, [])
  assert.deepEqual(value.replies, [])
})

test('component shell forwards only fixed gateway commands and exact catalog arguments', async () => {
  const calls = []
  const value = fixture(async (...args) => { calls.push(args); return { restartRequired: true } })
  await value.send()
  await value.send()
  assert.deepEqual(calls, [['run_first_party_command', { command: 'install_component', payload: { component: 'pomodoro' } }]])
  assert.equal(value.replies[0].data.type, 'install-accepted')
  assert.equal(value.replies[1].data.type, 'install-response')
  assert.equal(value.replies[1].origin, 'http://127.0.0.1:19387')
  assert.equal(value.replies[1].data.requestId, 'install_1')
  await value.send({ type: 'plan-request', requestId: 'plan_1' })
  assert.deepEqual(calls[1], ['run_first_party_command', { command: 'plan_component_install', payload: { component: 'pomodoro' } }])
  await value.send({ type: 'get-request', requestId: 'get_1' })
  assert.deepEqual(calls[2], ['run_first_party_command', { command: 'get_component_overview' }])
})

test('component shell preserves schema-2 dotted catalog keys and rejects leading punctuation', async () => {
  const calls = []
  const value = fixture(async (...args) => { calls.push(args); return { components: [], prepareArchiveBytes: 0 } })
  await value.send({ type: 'plan-request', requestId: 'dotted', component: 'plugin.v2' })
  assert.deepEqual(calls[0], ['run_first_party_command', { command: 'plan_component_install', payload: { component: 'plugin.v2' } }])
  for (const component of ['.plugin', '_plugin', '-plugin']) await value.send({ requestId: 'invalid_key', component })
  assert.equal(calls.length, 1)
})

test('runtime report carries the generation token and never accepts arbitrary state', async () => {
  const calls = []
  const value = fixture(async (...args) => { calls.push(args); return { restartRequired: false } })
  await value.send({ type: 'report-request', requestId: 'report_1', runtimeToken: 'generation_install_1', state: 'active' })
  assert.deepEqual(calls, [['run_first_party_command', { command: 'report_component_runtime', payload: { component: 'pomodoro', state: 'active', runtimeToken: 'generation_install_1' } }]])
  for (const change of [{ runtimeToken: '/tmp/token' }, { state: 'ready' }, { runtimeToken: '' }, { runtimeToken: 'x'.repeat(129) }]) await value.send({ type: 'report-request', requestId: 'report_bad', runtimeToken: 'epoch', state: 'active', ...change })
  assert.equal(calls.length, 1)
})

test('late completion cannot address a replacement iframe and native failure remains a failure', async () => {
  let finish
  const value = fixture(() => new Promise(resolve => { finish = resolve }))
  await value.send()
  value.frame.contentWindow = { postMessage: () => assert.fail('late completion addressed replacement frame') }
  finish({ restartRequired: true })
  await Promise.resolve()
  assert.equal(value.replies.length, 1)
  const failed = fixture(async () => { throw new Error('native unavailable') })
  await failed.send()
  assert.equal(failed.replies[1].data.ok, false)
  assert.equal(failed.replies[1].data.error, 'native unavailable')
})


test('local statistics commands admit only payload-free ready and fixed Pomodoro result fields', async () => {
  const calls = []
  const value = fixture(async (...args) => { calls.push(args); return { recorded: true } })
  await value.send({ type: 'ready-request', requestId: 'ready_1' })
  assert.deepEqual(calls[0], ['run_first_party_command', { command: 'report_workbench_ready' }])
  await value.send({ type: 'invocation-request', requestId: 'used_1', component: 'pomodoro', runtimeToken: 'epoch', succeeded: false })
  assert.deepEqual(calls[1], ['run_first_party_command', { command: 'report_component_invocation', payload: { component: 'pomodoro', runtimeToken: 'epoch', succeeded: false } }])
  await value.send({ type: 'ready-request', requestId: 'bad_ready', payload: {} })
  for (const change of [{ component: 'harbor' }, { succeeded: 'true' }, { runtimeToken: '../epoch' }, { task: 'not allowed' }]) await value.send({ type: 'invocation-request', requestId: 'bad_usage', runtimeToken: 'epoch', succeeded: true, ...change })
  await value.send({ type: 'ready-request', requestId: 'wrong_origin' }, 'http://127.0.0.1:1234')
  await value.send({ type: 'invocation-request', requestId: 'wrong_frame', runtimeToken: 'epoch', succeeded: true }, 'http://127.0.0.1:19387', {})
  assert.equal(calls.length, 2)
})
