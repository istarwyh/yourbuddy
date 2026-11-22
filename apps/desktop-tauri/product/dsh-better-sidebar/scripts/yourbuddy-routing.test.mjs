/** Source smoke for product routing; run with the repository's tsx/esm hook under Node 26. */
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

// UI owners import CSS; this service-only fixture renders no components.
registerHooks({
  load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true }
    return next(url, context)
  },
})
const { createSidebarStore } = await import('../src/client/state.ts')
const { createBetterSidebarService } = await import('../src/client/service.ts')

test('workbench routes documents and explicit native claims without revealing background opens', () => {
  const storage = new Map()
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }
  // Persistence is outside this routing test; do not leave real timers alive.
  globalThis.window = { setTimeout: () => 0, clearTimeout: () => {} }
  const store = createSidebarStore()
  store.setSession('main')
  const intents = []
  const documents = []
  const native = []
  const service = createBetterSidebarService(store, {
    preferWorkbench: () => true,
    onOpenIntent: intent => intents.push(intent),
    onNativeDocumentOpen: intent => documents.push(intent),
  })
  for (const id of ['editor', 'subagent']) service.registerTab({ id, title: id, component: () => null })
  service.setSurface({
    openTab: input => native.push(input),
    openResource: input => native.push(input),
    fileAddress: (sessionId, _cwd, path) => `${sessionId}:${path}`,
    close: () => undefined,
    update: () => false,
    activate: () => false,
    has: () => false,
  })
  service.openFile({ sessionId: 'main' }, '/tmp/report.pdf', undefined, { intent: 'background', line: 3 })
  assert.equal(native[0].sessionId, 'main')
  assert.equal(native[0].revealIfOpened, false)
  assert.equal(native[0].line, 3)
  service.openFile({ sessionId: 'main' }, '/tmp/report.pdf')
  assert.equal(native[1].revealIfOpened, true)
  service.openFile({ sessionId: 'other' }, '/tmp/report.pdf')
  assert.equal(native[2].sessionId, 'other')
  assert.deepEqual(intents, ['background', 'user'])
  assert.deepEqual(documents, ['background', 'user'])
  service.openFile({ sessionId: 'main' }, '/tmp/readme.md')
  assert.equal(native.length, 3)
  assert.equal(store.tabOpen('main', 'editor:/tmp/readme.md'), true)
  service.openTab({ type: 'editor', path: '/tmp/a.drawio', target: 'right' }, { sessionId: 'main' })
  assert.equal(native[3].address, 'main:/tmp/a.drawio')
  service.openTab({ type: 'subagent', intent: 'background' }, { sessionId: 'other' })
  assert.equal(store.tabOpen('other', 'subagent'), true)
  store.setSession(undefined)
  delete globalThis.window
  delete globalThis.localStorage
})
