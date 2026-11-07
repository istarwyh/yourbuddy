import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Exercise the shipped pure readers without loading the credential/provider graph.
// Bundle region boundaries and call sites are asserted so a packaging change fails closed.
const lib = join(import.meta.dirname, '../product/dsh-codex-auth/lib')
const chunks = readdirSync(lib).filter(name => /^volatile-config-.*\.js$/u.test(name))
assert.equal(chunks.length, 1)
const shared = readFileSync(join(lib, chunks[0]), 'utf8')
const liveSource = shared.match(/function liveValue\(value\) \{[\s\S]*?\n\}/u)?.[0]
assert.ok(liveSource)
function reader(file, name) {
  const source = readFileSync(join(lib, file), 'utf8')
  const implementation = source.match(new RegExp(`function ${name}\\(config\\) \\{[\\s\\S]*?\\n\\}`, 'u'))?.[0]
  assert.ok(implementation, `${name} remains in the shipped bundle`)
  assert.ok(source.indexOf(`${name}(config)`, source.indexOf(implementation) + implementation.length) >= 0,
    `${name} is still consumed by the plugin`)
  return new Function(`${liveSource}\n${implementation}\nreturn ${name}`)()
}
const readSearchSettings = reader('search.js', 'searchSettings')
const readImageSettings = reader('image.js', 'imageSettings')
const host = readFileSync(join(lib, 'index.js'), 'utf8')
const currentSettings = host.match(/const currentSettings = \(\) => \(\{[\s\S]*?\n\t\}\);/u)?.[0]
assert.ok(currentSettings)
assert.match(host, /settings: \(\) => currentSettings\(\)/u)
const readLlmSettings = new Function('config', `${liveSource}\n${currentSettings}\nreturn currentSettings()`)

function live(value) {
  return {
    get: () => value.current,
  }
}

test('Codex settings readers dereference defaults and live mutations', () => {
  const longContextEnabled = { current: false }
  const searchEnabled = { current: true }
  const searchMode = { current: 'live' }
  const contextSize = { current: 'medium' }
  const fallbackModel = { current: 'gpt-5.4' }
  const maxOutputTokens = { current: 2048 }
  const imageEnabled = { current: true }
  const imageModel = { current: 'gpt-image-2' }
  const imageCount = { current: 1 }
  const imageSize = { current: 'auto' }
  const imageQuality = { current: 'auto' }
  const imageBackground = { current: 'auto' }

  const llm = { longContextEnabled: live(longContextEnabled) }
  const search = {
    enabled: live(searchEnabled),
    mode: live(searchMode),
    contextSize: live(contextSize),
    fallbackModel: live(fallbackModel),
    maxOutputTokens: live(maxOutputTokens),
  }
  const image = {
    enabled: live(imageEnabled),
    model: live(imageModel),
    n: live(imageCount),
    size: live(imageSize),
    quality: live(imageQuality),
    background: live(imageBackground),
  }

  assert.deepEqual(readLlmSettings(llm), { longContextEnabled: false, excludedModelIds: [] })
  assert.deepEqual(readSearchSettings(search), {
    enabled: true,
    mode: 'live',
    contextSize: 'medium',
    fallbackModel: 'gpt-5.4',
    maxOutputTokens: 2048,
  })
  assert.deepEqual(readImageSettings(image), {
    enabled: true,
    model: 'gpt-image-2',
    n: 1,
    size: 'auto',
    quality: 'auto',
    background: 'auto',
  })

  longContextEnabled.current = true
  searchEnabled.current = false
  searchMode.current = 'cached'
  imageEnabled.current = false
  imageCount.current = 3

  assert.deepEqual(readLlmSettings(llm), { longContextEnabled: true, excludedModelIds: [] })
  assert.equal(readSearchSettings(search).enabled, false)
  assert.equal(readSearchSettings(search).mode, 'cached')
  assert.equal(readImageSettings(image).enabled, false)
  assert.equal(readImageSettings(image).n, 3)
})

test('bundled settings accept plain values as well as live references', () => {
  assert.deepEqual(readLlmSettings({ longContextEnabled: true, excludedModelIds: ['gpt-5.4'] }),
    { longContextEnabled: true, excludedModelIds: ['gpt-5.4'] })
  assert.equal(readSearchSettings({ enabled: false }).enabled, false)
  assert.equal(readImageSettings({ n: 2 }).n, 2)
})
