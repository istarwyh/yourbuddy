import assert from 'node:assert/strict'
import { test } from 'node:test'
import { posix, win32 } from 'node:path'
import { isWithinWorkspace } from './workspace-path.mjs'

test('POSIX workspace containment includes itself and descendants but excludes siblings', () => {
  assert.equal(isWithinWorkspace('/work/project', '/work/project', posix), true)
  assert.equal(isWithinWorkspace('/work/project', '/work/project/design', posix), true)
  assert.equal(isWithinWorkspace('/work/project', '/work/sibling', posix), false)
  assert.equal(isWithinWorkspace('/work/project', '/work', posix), false)
  assert.equal(isWithinWorkspace('/work/project', '/work/project-other', posix), false)
})

test('Windows workspace containment handles separators, sibling folders, and different drives', () => {
  assert.equal(isWithinWorkspace('C:\\work\\project', 'C:\\work\\project', win32), true)
  assert.equal(isWithinWorkspace('C:\\work\\project', 'C:\\work\\project\\design', win32), true)
  assert.equal(isWithinWorkspace('C:\\work\\project', 'C:\\work\\sibling', win32), false)
  assert.equal(isWithinWorkspace('C:\\work\\project', 'C:\\work', win32), false)
  assert.equal(isWithinWorkspace('C:\\work\\project', 'D:\\work\\project\\design', win32), false)
  assert.equal(isWithinWorkspace('C:\\work\\project', 'C:\\work\\project-other', win32), false)
})
