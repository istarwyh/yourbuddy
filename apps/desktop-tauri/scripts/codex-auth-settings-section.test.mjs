import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readImageSettings,
  readLlmSettings,
  readSearchSettings,
} from '../product/dsh-codex-auth/lib/settings-values.js'

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

  assert.deepEqual(readLlmSettings(llm), { longContextEnabled: false })
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

  assert.deepEqual(readLlmSettings(llm), { longContextEnabled: true })
  assert.equal(readSearchSettings(search).enabled, false)
  assert.equal(readSearchSettings(search).mode, 'cached')
  assert.equal(readImageSettings(image).enabled, false)
  assert.equal(readImageSettings(image).n, 3)
})
