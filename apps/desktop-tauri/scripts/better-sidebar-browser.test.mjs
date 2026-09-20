import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const snapshotRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')
const bundleNames = ['client.js', 'client-registry.js']

function loadSandboxPolicy(bundleName) {
  const bundle = readFileSync(join(snapshotRoot, 'lib', bundleName), 'utf8')
  const start = bundle.indexOf('const BROWSER_IFRAME_SANDBOX =')
  const end = bundle.indexOf('\n\t\tfunction BrowserView', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const isLoopbackHostname = hostname => hostname === 'localhost' || hostname === '127.0.0.1'
  const isAllowedLoopbackUrl = (url, allowlist) => {
    const parsed = new URL(url)
    return allowlist.split(',').map(value => value.trim()).includes(parsed.host)
  }
  return Function(
    'isLoopbackHostname',
    'isAllowedLoopbackUrl',
    `${bundle.slice(start, end)}; return { BROWSER_IFRAME_SANDBOX, iframeSandboxFor }`,
  )(isLoopbackHostname, isAllowedLoopbackUrl)
}

for (const bundleName of bundleNames) {
  test(`${bundleName} gives ordinary external pages the capabilities required to render`, () => {
    const policy = loadSandboxPolicy(bundleName)
    assert.equal(
      policy.iframeSandboxFor('https://baidu.com/', '', 'http://127.0.0.1:17890'),
      `${policy.BROWSER_IFRAME_SANDBOX} allow-same-origin allow-top-navigation`,
    )
  })

  test(`${bundleName} keeps the GUI origin and unapproved loopback pages opaque`, () => {
    const policy = loadSandboxPolicy(bundleName)
    assert.equal(
      policy.iframeSandboxFor('http://127.0.0.1:17890/', '', 'http://127.0.0.1:17890'),
      policy.BROWSER_IFRAME_SANDBOX,
    )
    assert.equal(
      policy.iframeSandboxFor('http://localhost:5173/', '', 'http://127.0.0.1:17890'),
      policy.BROWSER_IFRAME_SANDBOX,
    )
    assert.equal(
      policy.iframeSandboxFor('http://localhost:5173/', 'localhost:5173', 'http://127.0.0.1:17890'),
      `${policy.BROWSER_IFRAME_SANDBOX} allow-same-origin allow-top-navigation`,
    )
  })
}

test('the Browser tab defaults to an unrestricted iframe', () => {
  for (const bundleName of bundleNames) {
    const bundle = readFileSync(join(snapshotRoot, 'lib', bundleName), 'utf8')
    assert.match(bundle, /browserNoSandbox: true/u)
  }

  const hostBundle = readFileSync(join(snapshotRoot, 'lib', 'index.js'), 'utf8')
  assert.equal(hostBundle.match(/browserNoSandbox: true/gu)?.length, 1)
  assert.equal(hostBundle.match(/browserNoSandbox: z\.boolean\(\)\.default\(true\)/gu)?.length, 1)
})

test('the browser source and distributed sandbox capability stay in sync', () => {
  const source = readFileSync(join(snapshotRoot, 'src', 'client', 'BrowserView.tsx'), 'utf8')
  assert.match(source, /`\$\{BROWSER_IFRAME_SANDBOX\} allow-same-origin allow-top-navigation`/u)
})
