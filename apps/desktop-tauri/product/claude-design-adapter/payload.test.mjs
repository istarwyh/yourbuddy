import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const design = process.env.YOURBUDDY_DESIGN_PACKAGE ?? dirname(require.resolve('dsh-claude-design/package.json'))
const artifacts = process.env.YOURBUDDY_DESIGN_ARTIFACTS_ENTRY === undefined
  ? dirname(require.resolve('dsh-claude-artifacts/package.json'))
  : dirname(dirname(process.env.YOURBUDDY_DESIGN_ARTIFACTS_ENTRY))

test('installed pair preserves pinned metadata and upstream mixed-license notices', async () => {
  for (const [name, root] of [['dsh-claude-design', design], ['dsh-claude-artifacts', artifacts]]) {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    assert.equal(pkg.name, name)
    assert.equal(pkg.version, '2.11.1')
    assert.match(await readFile(join(root, 'LICENSE'), 'utf8'), /MIT/u)
    assert.match(await readFile(join(root, 'NOTICE.md'), 'utf8'), /Anthropic/u)
  }
  assert.match(await readFile(join(design, 'skills/claude-design/scripts/editor/third-party-licenses.txt'), 'utf8'), /license/iu)
})

test('the installed Client embeds exactly the helpers covered by source tests', async () => {
  const client = await readFile(join(artifacts, 'lib/client.js'), 'utf8')
  for (const helper of ['client-start.mjs', 'client-open.mjs']) {
    const source = await readFile(new URL(helper, import.meta.url), 'utf8')
    assert(client.includes(source.replace('export async function', 'async function')), `${helper} is stale in the integration patch`)
  }
})
