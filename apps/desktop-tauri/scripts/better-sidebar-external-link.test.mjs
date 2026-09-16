import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const snapshotRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')
const bundleRoot = join(snapshotRoot, 'lib')
const sourceRoot = join(snapshotRoot, 'src', 'client')
const bundleNames = ['client.js', 'client-registry.js', 'client-terminal.js']
const bridgeStart = 'const DESKTOP_EXTERNAL_LINK_CHANNEL = "yourbuddy.desktop.external-link";'
const bridgeEnds = ['\n\t\t/** The modal body:', '\n\t//#endregion']

function loadExternalLinkApi(bundleName, browserWindow) {
  const bundle = readFileSync(join(bundleRoot, bundleName), 'utf8')
  const start = bundle.indexOf(bridgeStart)
  assert.notEqual(start, -1, `${bundleName} desktop external-link bridge is missing`)
  const ends = bridgeEnds
    .map((marker) => bundle.indexOf(marker, start))
    .filter((index) => index !== -1)
  assert.notEqual(ends.length, 0, `${bundleName} desktop external-link bridge terminator is missing`)
  const source = bundle.slice(start, Math.min(...ends))
  return Function(
    'window',
    `${source}; return { openExternalHttpUrl, resolveExternalHttpUrl }`,
  )(browserWindow)
}

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTypeScriptFiles(path)
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []
  })
}

for (const bundleName of bundleNames) {
  test(`${bundleName} sends Better Sidebar HTTP(S) destinations to the Y8 shell`, () => {
    const messages = []
    const parent = {
      postMessage(message, targetOrigin) {
        messages.push({ message, targetOrigin })
      },
    }
    const { openExternalHttpUrl } = loadExternalLinkApi(bundleName, { parent })

    assert.equal(openExternalHttpUrl('https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office'), true)

    assert.equal(messages.length, 1)
    assert.deepEqual(messages[0], {
      message: {
        channel: 'yourbuddy.desktop.external-link',
        version: 1,
        type: 'open-request',
        requestId: messages[0].message.requestId,
        url: 'https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office',
      },
      targetOrigin: '*',
    })
    assert.match(messages[0].message.requestId, /^\d+_1$/u)
  })

  test(`${bundleName} preserves standalone Web new-tab behavior`, () => {
    const opened = { opener: 'parent' }
    const calls = []
    const browserWindow = {
      open(...args) {
        calls.push(args)
        return opened
      },
    }
    browserWindow.parent = browserWindow
    const { openExternalHttpUrl } = loadExternalLinkApi(bundleName, browserWindow)

    assert.equal(openExternalHttpUrl('https://github.com/topics/dsh-better-sidebar'), true)

    assert.deepEqual(calls, [[
      'https://github.com/topics/dsh-better-sidebar',
      '_blank',
      'noopener,noreferrer',
    ]])
    assert.equal(opened.opener, null)
  })

  test(`${bundleName} rejects unsupported or credential-bearing destinations`, () => {
    const calls = []
    const browserWindow = {
      open(...args) {
        calls.push(args)
        return null
      },
    }
    browserWindow.parent = browserWindow
    const { openExternalHttpUrl, resolveExternalHttpUrl } = loadExternalLinkApi(bundleName, browserWindow)

    for (const url of [
      'file:///tmp/report.html',
      'javascript:alert(1)',
      'https://user:secret@example.com/',
      'not a URL',
      `https://example.com/${'x'.repeat(4096)}`,
    ]) {
      assert.equal(resolveExternalHttpUrl(url), undefined)
      assert.equal(openExternalHttpUrl(url), false)
    }
    assert.deepEqual(calls, [])
  })
}

test('Better Sidebar keeps direct window.open in the shared browser fallback only', () => {
  const directOpenFiles = collectTypeScriptFiles(sourceRoot)
    .filter((path) => readFileSync(path, 'utf8').includes('window.open('))
    .map((path) => path.slice(sourceRoot.length + 1))

  assert.deepEqual(directOpenFiles, ['desktop-external-links.ts'])
  for (const caller of ['BrowserView.tsx', 'add-plugin-modal.tsx', 'terminal-links.ts']) {
    assert.match(readFileSync(join(sourceRoot, caller), 'utf8'), /openExternalHttpUrl/u)
  }
  const terminalView = readFileSync(join(sourceRoot, 'TerminalView.tsx'), 'utf8')
  assert.match(terminalView, /linkHandler:\s*\{/u)
  assert.match(terminalView, /activateTerminalLink\(event, uri\)/u)
  assert.match(
    readFileSync(join(bundleRoot, 'client-terminal.js'), 'utf8'),
    /linkHandler: \{ activate: \(event, uri\) => \{/u,
  )
})
