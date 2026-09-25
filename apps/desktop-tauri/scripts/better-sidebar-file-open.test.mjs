import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const snapshotRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')
const bundleNames = ['client.js', 'client-registry.js']

function loadNativeFileOpen(bundleName) {
  const bundle = readFileSync(join(snapshotRoot, 'lib', bundleName), 'utf8')
  const start = bundle.indexOf('function openNativeFile(')
  const end = bundle.indexOf('\n\t\t/**\n\t\t* One plugin tab rendered', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const openNativeFile = Function(
    'fileAddressFor',
    `${bundle.slice(start, end)}; return openNativeFile`,
  )((sessionId, cwd, path) => `file:${sessionId}:${cwd}:${path}`)
  return { bundle, openNativeFile }
}

for (const bundleName of bundleNames) {
  test(`${bundleName} opens files through the owning native tab occurrence`, () => {
    const { bundle, openNativeFile } = loadNativeFileOpen(bundleName)
    const calls = []
    const info = {
      tab: {
        actions: {
          openResource: (...args) => { calls.push(args) },
        },
      },
    }

    openNativeFile(info, 'owner-session', '/workspace', 'notes/readme.md', 'tab')
    openNativeFile(info, 'owner-session', '/workspace', 'notes/readme.md', 'replace')
    openNativeFile(info, 'owner-session', '/workspace', 'notes/readme.md', 'side')

    assert.deepEqual(calls, [
      ['file:owner-session:/workspace:notes/readme.md', { revealIfOpened: true }],
      ['file:owner-session:/workspace:notes/readme.md', { replaceTab: true, revealIfOpened: false }],
      ['file:owner-session:/workspace:notes/readme.md', { toSide: true, revealIfOpened: false }],
    ])
    assert.match(bundle, /onOpenFile: \(path\) => \{\s*openNativeFile\(info, sessionId, cwd, path, "tab"\)/u)
    assert.match(bundle, /onOpenFileInPlace: \(path\) => \{\s*openNativeFile\(info, sessionId, cwd, path, "replace"\)/u)
    assert.match(bundle, /onOpenFileSide: \(path\) => \{\s*openNativeFile\(info, sessionId, cwd, path, "side"\)/u)
    assert.match(bundle, /pending\.filter\(\(entry\) => !place\(entry\)\)/u)
    assert.match(bundle, /onSessionAdopted\(flushPending\)/u)
  })
}

test('published declarations expose native file actions and editor callbacks', () => {
  const adapter = readFileSync(join(snapshotRoot, 'lib', 'types', 'client', 'native', 'tab-adapter.d.ts'), 'utf8')
  const service = readFileSync(join(snapshotRoot, 'lib', 'types', 'client', 'service.d.ts'), 'utf8')
  const editor = readFileSync(join(snapshotRoot, 'lib', 'types', 'client', 'EditorHost.d.ts'), 'utf8')

  assert.match(adapter, /readonly actions:/u)
  assert.match(adapter, /toSide\?: boolean/u)
  assert.match(adapter, /placement: 'tab' \| 'replace' \| 'side'/u)
  for (const declaration of [service, editor]) {
    assert.match(declaration, /onOpenFile\?: \(path: string\) => void/u)
    assert.match(declaration, /onOpenFileInPlace\?: \(path: string\) => void/u)
    assert.match(declaration, /onOpenFileSide\?: \(path: string\) => void/u)
  }
})
