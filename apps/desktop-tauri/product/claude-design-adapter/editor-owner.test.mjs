import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
const { EditorOwner } = await import(process.env.YOURBUDDY_DESIGN_ADAPTER_ENTRY ?? './editor-owner.mjs')

const require = createRequire(import.meta.url)
const packageRoot = process.env.YOURBUDDY_DESIGN_PACKAGE ?? dirname(require.resolve('dsh-claude-design/package.json'))
const script = join(packageRoot, 'skills/claude-design/scripts/artifact.mjs')

const cleanups = new WeakMap()
function cleanup(t, action) {
  let stack = cleanups.get(t)
  if (!stack) {
    stack = []
    cleanups.set(t, stack)
    t.after(async () => {
      const failures = []
      for (const dispose of stack.reverse()) {
        try { await dispose() } catch (error) { failures.push(error) }
      }
      if (failures.length) throw new AggregateError(failures, 'Editor test cleanup failed')
    })
  }
  stack.push(action)
}

async function canvas(t) {
  const root = await mkdtemp(join(tmpdir(), 'yourbuddy-design-test-'))
  cleanup(t, () => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'project'))
  await writeFile(join(root, 'project/canvas.json'), JSON.stringify({ v: 3, title: 'Two boards', pages: [], boards: {
    'Main.dc.html': { x: 0, y: 0, w: 400, h: 300 }, 'Second.dc.html': { x: 480, y: 0, w: 400, h: 300 },
  }, order: ['Main.dc.html', 'Second.dc.html'], notes: {}, designSystems: [] }))
  for (const name of ['Main', 'Second']) await writeFile(join(root, `project/${name}.dc.html`), `<h1>${name}</h1>`)
  return root
}
function owner(t, deliver = async () => {}) {
  const value = new EditorOwner({ deliver, startupTimeoutMs: 5000, stopTimeoutMs: 2000 })
  cleanup(t, () => value.dispose())
  return value
}
async function until(read, accept) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const value = await read()
    if (accept(value)) return value
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error('Condition did not become observable')
}

test('real published editor opens, reuses, closes and never terminates another owner', async t => {
  const root = await canvas(t)
  const first = owner(t)
  const opened = await first.open(script, root, 'session-a')
  assert.match(await (await fetch(opened.url)).text(), /<html/u)
  assert.deepEqual(await first.open(script, root, 'session-a'), { ...opened, reused: true })
  await assert.rejects(first.open(script, root, 'session-b'), /another Session/u)
  const second = owner(t)
  await assert.rejects(second.open(script, root, 'session-a'), /already owns/u)
  assert.equal((await fetch(opened.url)).status, 200)
  await first.close(root)
  await assert.rejects(fetch(opened.url))
  const reopened = await first.open(script, root, 'session-a')
  assert.equal((await fetch(reopened.url)).status, 200)
})

test('upstream Send to Agent remains pending until the Host receipt resolves', { timeout: 15000 }, async t => {
  const root = await canvas(t)
  let acknowledge, came
  const handed = new Promise(resolve => { came = resolve })
  const pending = new Promise(resolve => { acknowledge = resolve })
  const managed = owner(t, async (...args) => { came(args); await pending })
  cleanup(t, () => acknowledge())
  const { url } = await managed.open(script, root, 'session-a')
  const response = await fetch(new URL('__comments', url.endsWith('/') ? url : `${url}/`), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ anchor: 'Main.dc.html', label: 'Main title', text: 'Make it blue', send: true }),
  })
  assert.equal(response.status, 201)
  const args = await handed
  assert.equal(args[0], 'session-a')
  assert.equal(args[1], root)
  const comments = async () => JSON.parse(await readFile(join(root, 'comments.json'), 'utf8'))
  assert.equal((await comments()).threads[0].agent.status, 'pending')
  acknowledge()
  await until(comments, value => value.threads[0].agent.status === 'delivered')
})

test('a newer sent comment revision drains after an earlier receipt without reopening', async t => {
  const root = await canvas(t)
  const receipts = []
  let acknowledge
  const blocked = new Promise(resolve => { acknowledge = resolve })
  const managed = owner(t, async (...args) => { receipts.push(args[4]); if (receipts.length === 1) await blocked })
  cleanup(t, () => acknowledge())
  const { url } = await managed.open(script, root, 'session-a')
  const endpoint = new URL('__comments', url.endsWith('/') ? url : `${url}/`)
  const post = (target, body) => fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const first = await post(endpoint, { anchor: 'Main.dc.html', label: 'Title', text: 'First change', send: true })
  const { thread } = await first.json()
  await until(async () => receipts.length, count => count === 1)
  const reply = await post(`${endpoint}/${thread.id}/messages`, { text: 'Second change', send: true })
  assert.equal(reply.status, 200)
  acknowledge()
  await until(async () => receipts.length, count => count === 2)
  assert.equal(receipts[1].messages.at(-1).text, 'Second change')
  await until(async () => JSON.parse(await readFile(join(root, 'comments.json'), 'utf8')), value => value.threads[0].agent.status === 'delivered')
})

test('concurrent independent Hosts admit one editor owner for the artifact', async t => {
  const root = await canvas(t)
  const first = owner(t)
  const second = owner(t)
  const attempts = await Promise.allSettled([first.open(script, root, 'one'), second.open(script, root, 'two')])
  const started = attempts.filter(result => result.status === 'fulfilled')
  const refused = attempts.filter(result => result.status === 'rejected')
  assert.equal(started.length, 1)
  assert.equal(refused.length, 1)
  assert.match(refused[0].reason.message, /already owns/u)
  assert.equal((await fetch(started[0].value.url)).status, 200)
})

test('an unsent reply does not create another delivery while a receipt is pending', async t => {
  const root = await canvas(t)
  let calls = 0, acknowledge
  const blocked = new Promise(resolve => { acknowledge = resolve })
  const managed = owner(t, async () => { calls++; await blocked })
  cleanup(t, () => acknowledge())
  const { url } = await managed.open(script, root, 'session-a')
  const endpoint = new URL('__comments', url.endsWith('/') ? url : `${url}/`)
  const post = (target, body) => fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const { thread } = await (await post(endpoint, { anchor: 'Main.dc.html', label: 'Title', text: 'Sent change', send: true })).json()
  await until(async () => calls, count => count === 1)
  assert.equal((await post(`${endpoint}/${thread.id}/messages`, { text: 'Unsent note', send: false })).status, 200)
  acknowledge()
  await until(async () => JSON.parse(await readFile(join(root, 'comments.json'), 'utf8')), value => value.threads[0].agent.status === 'delivered')
  await managed.close(root)
  assert.equal(calls, 1)
})

for (const failure of [new Error(), '']) {
  test(`an empty ${failure instanceof Error ? 'Error' : 'string'} rejection does not mark a comment delivered`, async t => {
    const root = await canvas(t)
    const managed = owner(t, async () => { throw failure })
    const { url } = await managed.open(script, root, 'session-a')
    const response = await fetch(new URL('__comments', url.endsWith('/') ? url : `${url}/`), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anchor: 'Main.dc.html', label: 'Title', text: 'Must remain pending', send: true }),
    })
    assert.equal(response.status, 201)
    const comments = async () => JSON.parse(await readFile(join(root, 'comments.json'), 'utf8'))
    await until(() => readFile(join(root, '.artifact-server.log'), 'utf8'), value => value.includes('the comment stays waiting:'))
    assert.equal((await comments()).threads[0].agent.status, 'pending')
  })
}

test('managed editors ignore persisted LAN sharing and retain ordinary local exports', { timeout: 15000 }, async t => {
  const root = await canvas(t)
  const sharing = JSON.stringify({ lan: true })
  await writeFile(join(root, '.sharing.json'), sharing)
  const managed = owner(t)
  const { url } = await managed.open(script, root, 'session-local')
  const endpoint = new URL('__share', url)
  const response = await fetch(endpoint)
  const view = await response.json()
  assert.equal(response.status, 200, JSON.stringify(view) + await readFile(join(root, '.artifact-server.log'), 'utf8'))
  assert.equal(view.lan, false, JSON.stringify(view))
  assert.deepEqual(view.addresses, [])
  const rejected = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: new URL(url).origin },
    body: JSON.stringify({ action: 'lan', on: true }),
  })
  assert.equal(rejected.status, 400)
  assert.match((await rejected.json()).message, /LAN sharing is not supported in YourBuddy/u)
  assert.equal(await readFile(join(root, '.sharing.json'), 'utf8'), sharing)
  const bytes = '<!doctype html><html><body>Local design export</body></html>'
  const saved = await fetch(new URL('__share/save?name=design.html', url), {
    method: 'POST', headers: { 'content-type': 'text/html', origin: new URL(url).origin }, body: bytes,
  })
  assert.equal(saved.status, 200)
  assert.equal(await readFile((await saved.json()).path, 'utf8'), bytes)
})
