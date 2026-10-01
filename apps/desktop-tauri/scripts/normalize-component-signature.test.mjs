import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeComponentSignature } from './normalize-component-signature.mjs'

const RAW_SIGNATURE = [
  'untrusted comment: signature from tauri secret key',
  'RUTESTSIGNATURE',
  'trusted comment: timestamp:1790812800',
  'RUTESTGLOBAL',
  '',
].join('\n')

test('unwraps Tauri signer output into the raw minisign document', () => {
  assert.equal(
    normalizeComponentSignature(Buffer.from(RAW_SIGNATURE).toString('base64')),
    RAW_SIGNATURE,
  )
})

test('keeps an already-normalized minisign document stable', () => {
  assert.equal(normalizeComponentSignature(RAW_SIGNATURE), RAW_SIGNATURE)
})
