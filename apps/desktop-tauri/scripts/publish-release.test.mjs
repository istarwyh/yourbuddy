import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  parsePublishArguments,
  validatePublishState,
  verifyReleaseArchive,
} from './publish-release.mjs'

test('parsePublishArguments derives one stable immutable tag on origin', () => {
  assert.deepEqual(parsePublishArguments(['0.3.16']), {
    version: '0.3.16',
    tag: 'yourbuddy-v0.3.16',
    remote: 'origin',
  })
  assert.deepEqual(parsePublishArguments(['--', '0.3.16']), {
    version: '0.3.16',
    tag: 'yourbuddy-v0.3.16',
    remote: 'origin',
  })
  assert.throws(() => parsePublishArguments([]), /usage:/u)
  assert.throws(() => parsePublishArguments(['next']), /invalid stable YourBuddy version/u)
  assert.throws(() => parsePublishArguments(['0.3.16-rc.1']), /invalid stable YourBuddy version/u)
  assert.throws(() => parsePublishArguments(['0.3.16', '--remote', 'release']), /usage:/u)
})

test('validatePublishState accepts only a clean master fast-forward with an unused remote tag', () => {
  const candidate = {
    branch: 'master',
    status: '',
    head: 'candidate',
    remoteHead: 'published',
    remoteIsAncestor: true,
    remoteTagRefs: '',
  }
  assert.doesNotThrow(() => validatePublishState(candidate))
  assert.doesNotThrow(() => validatePublishState({
    ...candidate,
    remoteHead: candidate.head,
    remoteIsAncestor: false,
    localTagHead: candidate.head,
    localTagType: 'tag',
  }))
  assert.throws(() => validatePublishState({ ...candidate, branch: 'feature' }), /publish from master/u)
  assert.throws(() => validatePublishState({ ...candidate, status: ' M file' }), /clean worktree/u)
  assert.throws(() => validatePublishState({
    ...candidate,
    remoteTagRefs: 'tag already exists',
  }), /already exists on the remote/u)
  assert.throws(() => validatePublishState({
    ...candidate,
    localTagHead: candidate.head,
    localTagType: 'commit',
  }), /must be annotated/u)
  assert.throws(() => validatePublishState({
    ...candidate,
    localTagHead: 'other',
    localTagType: 'tag',
  }), /points to another commit/u)
  assert.throws(() => validatePublishState({
    ...candidate,
    remoteIsAncestor: false,
  }), /does not fast-forward/u)
})

test('verifyReleaseArchive requires the bilingual archive, indexes, and immutable notes link', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-publish-release-test-'))
  const tag = 'yourbuddy-v0.3.16'
  const archive = join(root, 'docs', 'releases', tag)
  mkdirSync(archive, { recursive: true })
  mkdirSync(join(root, 'apps', 'desktop-tauri'), { recursive: true })
  try {
    writeFileSync(join(archive, 'README.md'), `# YourBuddy 0.3.16\n\n- Release identifier: \`${tag}\`\n`)
    writeFileSync(join(archive, 'README.zh.md'), `# YourBuddy 0.3.16\n\n- 发布标识：\`${tag}\`\n`)
    writeFileSync(join(archive, 'README.i18n.yaml'), 'paired: true\n')
    writeFileSync(join(root, 'docs', 'releases', 'README.md'), `[${tag}](${tag}/README.md)\n`)
    writeFileSync(join(root, 'docs', 'releases', 'README.zh.md'), `[${tag}](${tag}/README.zh.md)\n`)
    writeFileSync(
      join(root, 'apps', 'desktop-tauri', 'release-notes.md'),
      `https://github.com/istarwyh/yourbuddy/tree/${tag}/docs/releases/${tag}\n`,
    )

    assert.doesNotThrow(() => verifyReleaseArchive(root, '0.3.16', tag))
    writeFileSync(join(archive, 'README.md'), `# YourBuddy 0.3.16\n\n<Describe the user-visible change.>\n\`${tag}\`\n`)
    assert.throws(() => verifyReleaseArchive(root, '0.3.16', tag), /template marker/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})
