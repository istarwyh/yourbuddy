import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

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
