import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { designRuntimeInstructions } from './runtime-instructions.mjs'
const require = createRequire(import.meta.url)
const root = process.env.YOURBUDDY_DESIGN_PACKAGE ?? dirname(require.resolve('dsh-claude-design/package.json'))
const { runtimeSection } = await import(pathToFileURL(join(root, 'lib/index.js')).href)
test('retains the published PowerShell and POSIX quoting and names the managed open tool', () => {
  const windows = designRuntimeInstructions(runtimeSection, 'C:\\My Skill', 'C:\\Node Runtime\\node.exe', 'win32')
  assert.match(windows, /& 'C:\\Node Runtime\\node.exe' 'C:\\My Skill\\scripts\\artifact.mjs'/u)
  const posix = designRuntimeInstructions(runtimeSection, '/my $skill', '/node `runtime`/node', 'darwin')
  assert.ok(posix.includes('"/node \\`runtime\\`/node" "/my \\$skill/scripts/artifact.mjs"'))
  for (const text of [windows, posix]) {
    assert.match(text, /yourbuddy_design_open/u)
    assert.doesNotMatch(text, /`open` prints/u)
  }
})
