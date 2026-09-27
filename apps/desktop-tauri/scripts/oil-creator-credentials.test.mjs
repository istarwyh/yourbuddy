import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const clientBundle = readFileSync(
  join(import.meta.dirname, '..', 'product', 'oil-creator', 'lib', 'client.js'),
  'utf8',
)

test('Oil Creator uses the current remote credentials API', () => {
  assert.match(clientBundle, /return ctx\.remote\.credentials;/)
  assert.match(clientBundle, /credentials\.describe\(refs\)/)
  assert.match(clientBundle, /credentials\.set\(item\.ref, value\)/)
  assert.doesNotMatch(clientBundle, /connection[^\n]*api[^\n]*credentials/)
})
