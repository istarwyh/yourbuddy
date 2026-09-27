import assert from 'node:assert/strict'
import test from 'node:test'

import {
  draftArchive,
  parsePrepareArguments,
  prependReleaseIndex,
  validatePreparationState,
} from './prepare-release-candidate.mjs'

test('parses one stable version into the release tag', () => {
  assert.deepEqual(parsePrepareArguments(['--', '0.4.0']), { version: '0.4.0', tag: 'yourbuddy-v0.4.0' })
  assert.throws(() => parsePrepareArguments(['0.4.0-rc.1']), /invalid|usage/i)
})

test('rejects non-master, dirty, non-increasing, and existing release drafts', () => {
  const base = { branch: 'master', status: '', currentVersion: '0.3.18', version: '0.3.19', archiveExists: false }
  assert.doesNotThrow(() => validatePreparationState(base))
  assert.throws(() => validatePreparationState({ ...base, branch: 'feature' }), /must run on master/i)
  assert.throws(() => validatePreparationState({ ...base, status: ' M file' }), /clean worktree/i)
  assert.throws(() => validatePreparationState({ ...base, version: '0.3.18' }), /must increase/i)
  assert.throws(() => validatePreparationState({ ...base, version: '0.3.17' }), /must increase/i)
  assert.throws(() => validatePreparationState({ ...base, archiveExists: true }), /already exists/i)
})

test('creates an identified archive draft while retaining publication blockers', () => {
  const template = '# <Product name> <version>\n\nCopy this directory.\n\n- Release identifier: `<exact tag>`\n- Product channel: `<desktop>`\n- Archive state: `<draft>`\n\n<Describe the change.>\n'
  const draft = draftArchive(template, '0.3.19', 'yourbuddy-v0.3.19', 'en')
  assert.match(draft, /^# YourBuddy 0\.3\.19/m)
  assert.match(draft, /`yourbuddy-v0\.3\.19`/)
  assert.match(draft, /Product channel: YourBuddy desktop/)
  assert.match(draft, /TODO/)
  assert.doesNotMatch(draft, /<[^>]+>/)
})

test('prepends a release index row and refuses an ambiguous table', () => {
  const index = '| Release | Channel | User notes | Verification archive | Product status |\n|---|---|---|---|---|\n| old | old | old | old | old |\n'
  const next = prependReleaseIndex(index, '| new | new | new | new | new |')
  assert.match(next, /\|---\|---\|---\|---\|---\|\n\| new /)
  assert.throws(() => prependReleaseIndex(`${index}${index}`, '| new |'), /exactly one/i)
})
