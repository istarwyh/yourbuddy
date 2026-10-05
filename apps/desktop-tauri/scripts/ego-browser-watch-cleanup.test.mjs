import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../product/ego-browser/lib/client.js', import.meta.url), 'utf8')
const start = source.indexOf('LivePreviewController.prototype._stopWatch = ') + 'LivePreviewController.prototype._stopWatch = '.length
const end = source.indexOf('LivePreviewController.prototype._destroyVideo', start)

test('preview cleanup leaves an idle capture alone and stops active or pending captures', async () => {
  const requests = []
  const timers = []
  const window = { clearInterval() {}, clearTimeout() {}, setTimeout(callback) { timers.push(callback); return timers.length } }
  const stopWatch = new Function('window', 'postJson', 'WATCH_STOP_ROUTE', `return ${source.slice(start, end)}`)(window, async (route, body) => requests.push({ route, body }), '/api/ego/watch/stop')
  const preview = { watchStarted: false, watchRequest: null, clientId: 'preview' }
  stopWatch.call(preview, true)
  stopWatch.call(preview, false)
  timers.shift()()
  assert.equal(requests.length, 0)
  preview.watchStarted = true
  stopWatch.call(preview, true)
  assert.equal(preview.watchStarted, false)
  assert.deepEqual(requests, [{ route: '/api/ego/watch/stop', body: { clientId: 'preview' } }])
  stopWatch.call(preview, true)
  assert.equal(requests.length, 1)
  preview.watchRequest = Promise.resolve()
  stopWatch.call(preview, true)
  assert.equal(requests.length, 2)
})
