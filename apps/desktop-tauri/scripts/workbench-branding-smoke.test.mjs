import assert from 'node:assert/strict'
import test from 'node:test'
import { restoreWorkbenchBranding } from './workbench-branding-smoke.mjs'

const defaults = { enabled: false, name: '', logo: '', heroHeadline: '', heroBadge: '', showHeroBadge: true }
const resetOps = [
  { op: 'set', path: ['enabled'], value: false },
  ...['name', 'logo', 'heroHeadline', 'heroBadge', 'showHeroBadge'].map(field => ({ op: 'unset', path: [field] })),
]
const view = () => ({ ns: 'personal-workbench', value: { ...defaults }, user: { enabled: false } })

function fixture({ status = 200, result = { ok: true, value: view() }, persisted = view() } = {}) {
  let listener, settle, subscribed = false, clicked = false, reads = 0
  const requestBody = { type: 'client-request', rpcId: 'reset-brand', method: 'settings/mutate', payload: { args: { ns: 'personal-workbench', ops: resetOps } } }
  const response = (body = requestBody, path = '/api/settings/mutate', method = 'POST') => ({
    url: () => `http://localhost:12345${path}`,
    request: () => ({ method: () => method, postDataJSON: () => body }),
    status: () => status,
    json: async () => ({ type: 'server-response', rpcId: body.rpcId, result }),
  })
  const page = {
    url: () => 'http://localhost:12345/',
    waitForResponse(predicate) {
      listener = predicate
      subscribed = true
      return new Promise(resolve => { settle = resolve })
    },
    request: { post: async (url, options) => {
      reads++
      assert.equal(url, 'http://localhost:12345/api/settings/describe')
      assert.equal(options.data.method, 'settings/describe')
      return {
        status: () => 200,
        json: async () => ({ type: 'server-response', rpcId: options.data.rpcId, result: { ok: true, value: { namespaces: [persisted] } } }),
      }
    } },
  }
  const settings = {
    getByRole(role, options) {
      assert.equal(role, 'button')
      assert.equal(options.name, 'Restore YourBuddy default')
      return { click: async () => {
        clicked = true
        if (!subscribed) return
        // Unrelated settings traffic must not settle the reset observation.
        assert.equal(listener(response({ ...requestBody, payload: { args: { ns: 'other', ops: resetOps } } })), false)
        assert.equal(listener(response({ ...requestBody, payload: { args: { ns: 'personal-workbench', ops: [{ op: 'set', path: ['enabled'], value: true }] } } })), false)
        assert.equal(listener(response(requestBody, '/api/settings/describe')), false)
        assert.equal(listener(response(requestBody, '/api/settings/mutate', 'GET')), false)
        const reset = response()
        assert.equal(listener(reset), true)
        settle(reset)
      } }
    },
    getByText: () => ({ waitFor: async () => { throw new Error('Settings dialog disappeared after reset') } }),
  }
  return { page, settings, state: () => ({ clicked, reads }) }
}

test('branding reset observes committed state even when its settings dialog disappears', async () => {
  const { page, settings, state } = fixture()
  await restoreWorkbenchBranding(page, settings)
  assert.deepEqual(state(), { clicked: true, reads: 1 })
})

for (const [name, input, message] of [
  ['HTTP failure', { status: 500 }, /HTTP 500/],
  ['RPC refusal inside HTTP 200', { result: { ok: false, error: { code: 'settings/rejected' } } }, /RPC failed/],
  ['custom resolved value after claimed reset', { result: { ok: true, value: { ...view(), value: { ...defaults, name: 'Research Lab' } } } }, /resolved defaults/],
  ['uncleared raw user override after claimed reset', { result: { ok: true, value: { ...view(), user: { enabled: false, logo: 'old-logo' } } } }, /user override logo/],
  ['independent read still shows customization', { persisted: { ...view(), value: { ...defaults, enabled: true } } }, /resolved defaults/],
]) {
  test(`branding reset rejects ${name}`, async () => {
    const { page, settings } = fixture(input)
    await assert.rejects(restoreWorkbenchBranding(page, settings), message)
  })
}
