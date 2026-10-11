import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = join(desktopRoot, '..', '..')
const browserSourceRoot = join(repositoryRoot, 'packages', 'client', 'ui-sidebar-browser', 'src', 'client')
const desktopShellSource = readFileSync(join(repositoryRoot, 'apps', 'desktop', 'src', 'main.ts'), 'utf8')
const browserBody = readFileSync(join(browserSourceRoot, 'view', 'BrowserBody.tsx'), 'utf8')
const browserAddresses = readFileSync(join(browserSourceRoot, 'browser', 'url.ts'), 'utf8')

test('the Browser toolbar opens only its normalized credential-free HTTP(S) target', () => {
  assert.match(browserBody, /const externalUrl = unknown \? undefined : target\?\.url/u)
  assert.match(
    browserBody,
    /window\.open\(externalUrl, '_blank', 'noopener,noreferrer'\)/u,
  )
  assert.match(browserAddresses, /if \(url\.username !== '' \|\| url\.password !== ''\) return \{ ok: false, reason: 'credentials' \}/u)
  assert.match(browserAddresses, /if \(url\.protocol === 'https:' \|\| url\.protocol === 'http:'\)/u)
  assert.match(browserAddresses, /return \{ ok: false, reason: 'protocol' \}/u)
})

test('the YourBuddy desktop shell intercepts Browser toolbar window.open without creating a child window', () => {
  const handler = desktopShellSource.match(
    /window\.webContents\.setWindowOpenHandler\(\(\{ url \}\) => \{[\s\S]*?return \{ action: 'deny' \}\n  \}\)/u,
  )?.[0]

  assert.notEqual(handler, undefined, 'desktop window-open handler is missing')
  assert.match(handler, /\['http:', 'https:'\]\.includes\(new URL\(url\)\.protocol\)/u)
  assert.match(handler, /void shell\.openExternal\(url\)/u)
  assert.match(handler, /return \{ action: 'deny' \}/u)
})


const sidebarRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')
const restoredSource = readFileSync(join(sidebarRoot, 'src', 'client', 'desktop-external-links.ts'), 'utf8')
const restoredScript = ts.transpileModule(restoredSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText.replaceAll('export function ', 'function ')

function externalLinkRegion(bundleName) {
  const bundle = readFileSync(join(sidebarRoot, 'lib', bundleName), 'utf8')
  const start = bundle.indexOf('//#region src/client/desktop-external-links.ts')
  const end = bundle.indexOf('//#endregion', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  return bundle.slice(start, end)
}

/** Compare executable syntax without source locations, comments, or quote style. */
function executableSyntax(source) {
  const parsed = ts.createSourceFile('external-link.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  function visit(node) {
    const children = []
    ts.forEachChild(node, child => { children.push(visit(child)) })
    return {
      kind: node.kind,
      declarationKind: ts.isVariableDeclarationList(node) ? node.flags & ts.NodeFlags.BlockScoped : undefined,
      text: ts.isIdentifier(node) || ts.isLiteralExpression(node) ? node.text : undefined,
      children,
    }
  }
  return visit(parsed)
}

for (const name of ['client.js', 'client-registry.js']) {
  test(`${name} preserves the restored external-link implementation`, () => {
    assert.deepEqual(executableSyntax(externalLinkRegion(name)), executableSyntax(restoredScript))
  })
}

for (const [name, script] of [
  ['source', restoredScript],
  ['client.js', externalLinkRegion('client.js')],
  ['client-registry.js', externalLinkRegion('client-registry.js')],
]) {
  function load(target) {
    return Function('window', 'Date', `${script}; return { resolveExternalHttpUrl, openExternalHttpUrl }`)(target, { now: () => 1234 })
  }

  test(`${name} accepts only normalized credential-free HTTP(S) within the existing URL limit`, () => {
    const api = load(undefined)
    assert.equal(api.resolveExternalHttpUrl('HTTP://EXAMPLE.COM/path'), 'http://example.com/path')
    assert.equal(api.resolveExternalHttpUrl('https://example.com/a?q=b#c'), 'https://example.com/a?q=b#c')
    for (const value of ['', '/relative', 'not a URL', 'file:///tmp/a', 'javascript:alert(1)', 'https://user:pass@example.com', 'http://user@example.com']) {
      assert.equal(api.resolveExternalHttpUrl(value), undefined, value)
    }
    const prefix = 'https://example.com/'
    const limit = prefix + 'a'.repeat(4096 - prefix.length)
    assert.equal(api.resolveExternalHttpUrl(limit), limit)
    assert.equal(api.resolveExternalHttpUrl(limit + 'a'), undefined)
    const expanded = prefix + '中'.repeat(500)
    assert.ok(expanded.length < 4096)
    assert.ok(new URL(expanded).href.length > 4096)
    assert.equal(api.resolveExternalHttpUrl(expanded), undefined)
    assert.equal(api.openExternalHttpUrl('https://example.com'), false)
  })

  test(`${name} routes embedded links to the parent with the existing request fields`, () => {
    const messages = []
    const api = load({
      parent: { postMessage: (...args) => { messages.push(args) } },
      open: () => { assert.fail('embedded links must not open a child window') },
    })
    assert.equal(api.openExternalHttpUrl('https://user:pass@example.com'), false)
    assert.equal(api.openExternalHttpUrl('https://example.com'), true)
    assert.equal(api.openExternalHttpUrl('http://example.com/a'), true)
    assert.deepEqual(messages, [
      [{ channel: 'yourbuddy.desktop.external-link', version: 1, type: 'open-request', requestId: '1234_1', url: 'https://example.com/' }, '*'],
      [{ channel: 'yourbuddy.desktop.external-link', version: 1, type: 'open-request', requestId: '1234_2', url: 'http://example.com/a' }, '*'],
    ])
  })

  test(`${name} keeps standalone browser tabs isolated from their opener`, () => {
    const calls = []
    const child = { opener: {} }
    const target = { open: (...args) => { calls.push(args); return child } }
    target.parent = target
    const api = load(target)
    assert.equal(api.openExternalHttpUrl('https://example.com'), true)
    assert.deepEqual(calls, [['https://example.com/', '_blank', 'noopener,noreferrer']])
    assert.equal(child.opener, null)
    target.open = () => null
    assert.equal(api.openExternalHttpUrl('https://example.com'), true)
  })
}
