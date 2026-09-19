import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const desktopRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const snapshotRoot = join(desktopRoot, 'product', 'dsh-better-sidebar')

test('generic file routes do not impose a media size cap', () => {
  const config = readFileSync(join(snapshotRoot, 'src', 'config.ts'), 'utf8')
  const host = readFileSync(join(snapshotRoot, 'src', 'index.ts'), 'utf8')
  const builtHost = readFileSync(join(snapshotRoot, 'lib', 'index.js'), 'utf8')

  assert.doesNotMatch(config, /mediaLimit/)
  assert.doesNotMatch(host, /info\.size\s*>/)
  assert.doesNotMatch(builtHost, /mediaLimit/)
})
