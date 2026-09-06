import assert from 'node:assert/strict'
import test from 'node:test'

import { installSettingsSection } from '../product/dsh-codex-auth/lib/settings-section.js'

function harness(entry, resolved) {
  let current = () => entry
  let watcher
  let dispose
  const seen = []
  const ctx = {
    fiber: { state: 0 },
    inject(names, callback) {
      assert.deepEqual(names, ['settings'])
      callback({
        settings: {
          register(namespace, schema, options) {
            assert.equal(namespace, 'codex-test')
            assert.equal(schema, 'schema')
            assert.deepEqual(options, { base: entry })
            return {
              get: () => resolved.value,
              watch(callback) { watcher = callback },
            }
          },
        },
        effect(factory) { dispose = factory() },
      })
    },
  }
  installSettingsSection(ctx, 'codex-test', 'schema', entry, {
    setSource(source) { current = source },
    onChange() { seen.push(current()) },
  })
  return {
    ctx,
    dispose: () => dispose(),
    seen,
    watch: () => watcher(),
  }
}

test('Codex settings adapter follows live settings and falls back when the provider detaches', () => {
  const entry = { enabled: false }
  const resolved = { value: { enabled: true } }
  const fixture = harness(entry, resolved)
  assert.deepEqual(fixture.seen, [{ enabled: true }])

  resolved.value = { enabled: false }
  fixture.watch()
  fixture.dispose()
  assert.deepEqual(fixture.seen, [
    { enabled: true },
    { enabled: false },
    entry,
  ])
})

test('Codex settings adapter stays quiet while its consumer unloads', () => {
  const fixture = harness({ enabled: false }, { value: { enabled: true } })
  fixture.ctx.fiber.state = 5
  fixture.watch()
  fixture.dispose()
  assert.deepEqual(fixture.seen, [{ enabled: true }])
})
