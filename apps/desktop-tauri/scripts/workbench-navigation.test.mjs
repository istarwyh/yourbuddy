import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { chromium } from 'playwright'
import { navigateAfterProxySmoke } from './verify-product-release.mjs'

// Each finished bridge iframe owns three live same-origin streams. Keep them
// open until their frame closes, rather than racing a short server response.
test('completed proxy frame releases its streams before branding navigation', { timeout: 60_000 }, async (t) => {
  const servers = [], streams = new Set()
  let browser, active = 0, reachSix, reachZero
  const six = new Promise(resolve => { reachSix = resolve })
  const zero = new Promise(resolve => { reachZero = resolve })
  t.after(async () => {
    let browserError
    try { await browser?.close() } catch (error) { browserError = error }
    for (const response of streams) response.end()
    for (const server of servers) server.closeAllConnections()
    await Promise.all(servers.filter(server => server.listening).map(server => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })))
    if (browserError) throw browserError
  })
  const listen = async (server) => {
    servers.push(server)
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve() })
    })
    return `http://127.0.0.1:${server.address().port}`
  }
  const host = await listen(createServer((request, response) => {
    if (request.url.startsWith('/stream')) {
      active++
      streams.add(response)
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
      response.write('data: ready\n\n')
      request.once('close', () => {
        if (!streams.delete(response)) return
        if (--active === 0) reachZero()
      })
      if (active === 6) reachSix()
      return
    }
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(request.url === '/frame'
      ? `<p>Bridge fixture</p><script>window.streams = Array.from({length: 3}, (_, i) => new EventSource('/stream?slot=' + i))</script>`
      : '<h1>Workbench ready</h1>')
  }))
  const bridge = await listen(createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(`<iframe src="${host}/frame"></iframe>`)
  }))
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const main = await context.newPage(), proxy = await context.newPage()
  await main.goto(bridge)
  await proxy.goto(bridge)
  await six
  assert.equal(active, 6)
  const response = await navigateAfterProxySmoke(main, proxy, `${host}/branding`)
  assert.equal(response.status(), 200)
  assert.equal(await main.getByRole('heading').textContent(), 'Workbench ready')
  assert.equal(proxy.isClosed(), true)
  await zero
  assert.equal(active, 0)
})
