import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { assertReleaseAbsent, firstPublication, preflight, publicationEnvironment, validateCandidateIdentity, verifyCandidate } from './first-publication.mjs'

const scripts = dirname(fileURLToPath(import.meta.url))
const root = join(scripts, '../../..')
const sha = 'a'.repeat(40)
const context = {
  GITHUB_REPOSITORY: 'istarwyh/yourbuddy', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/master', GITHUB_SHA: sha, VERIFIED_MASTER_SHA: sha,
  RELEASE_MODE: 'first-publication', RELEASE_VERSION: '0.4.9', RELEASE_TAG: 'yourbuddy-v0.4.9',
  GH_TOKEN: 'synthetic-test-value-never-a-real-token',
}
const absent = async () => ({ status: 404 })

function execute(cwd, args, env = process.env) {
  const result = spawnSync('git', args, { cwd, env, encoding: 'utf8' })
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout.trim()
}

test('the first route admits only the fixed repository, branch, version, tag, and exact dispatch SHA', () => {
  validateCandidateIdentity(context)
  for (const [key, values] of Object.entries({
    GITHUB_REPOSITORY: ['other/yourbuddy', 'istarwyh/other', ''],
    GITHUB_EVENT_NAME: ['push', 'pull_request', ''],
    GITHUB_REF: ['master', 'refs/heads/feature', 'refs/tags/yourbuddy-v0.4.9', ''],
    RELEASE_MODE: ['existing-tag', 'unknown', ''], RELEASE_VERSION: ['0.4.8', '0.4.10', '0.4.9-rc.1', ''],
    RELEASE_TAG: ['yourbuddy-v0.4.8', ''], GITHUB_SHA: ['b'.repeat(40), ''],
    VERIFIED_MASTER_SHA: ['', 'a'.repeat(39), 'a'.repeat(41), 'A'.repeat(40), 'b'.repeat(40), 'master', `${sha}\n`],
  })) {
    for (const value of values) assert.throws(() => validateCandidateIdentity({ ...context, [key]: value }), undefined, `${key}=${value}`)
  }
})

test('only explicit HTTP 404 permits publication, never API or transport failures', async () => {
  await assertReleaseAbsent(context, async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/istarwyh/yourbuddy/releases/tags/yourbuddy-v0.4.9')
    assert.equal(options.headers.Authorization, `Bearer ${context.GH_TOKEN}`)
    assert.equal(options.redirect, 'error')
    return { status: 404 }
  })
  for (const status of [200, 201, 301, 401, 403, 429, 500, 503]) {
    await assert.rejects(assertReleaseAbsent(context, async () => ({ status })))
  }
  await assert.rejects(assertReleaseAbsent(context, async () => { throw new Error('offline') }), /absence is unverified/u)
  await assert.rejects(assertReleaseAbsent({ ...context, GH_TOKEN: '' }, absent), /token/u)
})

test('retry and push routes retain the Release absence guard, while unknown modes stop before API access', async () => {
  await preflight({ ...context, RELEASE_MODE: 'existing-tag', GITHUB_EVENT_NAME: 'push' }, absent)
  await preflight(context, absent)
  let calls = 0
  await assert.rejects(preflight({ ...context, RELEASE_MODE: 'unknown' }, async () => { calls++; return { status: 404 } }), /mode/u)
  assert.equal(calls, 0)
})

test('invalid first-publication inputs cannot reach Git or the token-bearing API', async () => {
  let calls = 0
  const forbidden = () => { calls++; throw new Error('must not run') }
  await assert.rejects(firstPublication({ ...context, VERIFIED_MASTER_SHA: 'master' }, forbidden, forbidden))
  await assert.rejects(preflight({ ...context, RELEASE_VERSION: '0.5.0' }, forbidden))
  assert.equal(calls, 0)
})

test('publisher delegation requires origin, attached master and both fresh commit identities', async () => {
  for (const failure of ['origin', 'branch', 'HEAD', 'refs/remotes/origin/master', 'fetch', 'status']) {
    let published = false
    await assert.rejects(firstPublication(context, (command, args) => {
      if (command !== 'git') { published = true; return '' }
      if (args[0] === 'remote') return failure === 'origin' ? 'https://example.com/other.git' : 'https://github.com/istarwyh/yourbuddy.git'
      if (args[0] === 'branch') return failure === 'branch' ? '' : 'master'
      if (args[0] === 'status') return failure === 'status' ? ' M modified' : ''
      if (args[0] === 'fetch') { if (failure === 'fetch') throw new Error('fetch refused'); return '' }
      if (args[0] === 'rev-parse') return failure === args[1] ? 'b'.repeat(40) : sha
      throw new Error('unexpected command')
    }, absent))
    assert.equal(published, false)
  }
  const calls = []
  await firstPublication(context, (command, args, env) => {
    calls.push([command, args])
    assert.equal(env.GIT_CONFIG_VALUE_1, '!gh auth git-credential')
    if (args[0] === 'remote') return 'https://github.com/istarwyh/yourbuddy'
    if (args[0] === 'branch') return 'master'
    if (args[0] === 'rev-parse') return sha
    return ''
  }, absent)
  assert.deepEqual(calls.at(-1), [process.execPath, [join(root, 'apps/desktop-tauri/scripts/publish-release.mjs'), '0.4.9']])
})

test('candidate validation verifies the same pinned master but cannot call the tag publisher', async () => {
  const candidate = { ...context, RELEASE_MODE: 'candidate-validation' }
  validateCandidateIdentity(candidate)
  await preflight(candidate, absent)
  const calls = []
  const run = (command, args) => {
    calls.push([command, args])
    assert.equal(command, 'git')
    if (args[0] === 'remote') return 'https://github.com/istarwyh/yourbuddy'
    if (args[0] === 'branch') return 'master'
    if (args[0] === 'rev-parse') return sha
    return ''
  }
  await verifyCandidate(candidate, run, absent)
  assert.equal(calls.length, 6)
  await assert.rejects(firstPublication(candidate, run, absent), /requires first-publication/u)
  assert.equal(calls.length, 6)
})

test('Git authentication is runtime-only, clears other helpers, and does not embed the token in arguments or config', () => {
  const temp = mkdtempSync(join(tmpdir(), 'yourbuddy-auth-test-'))
  try {
    execute(temp, ['init'])
    const config = join(temp, '.git/config')
    const before = readFileSync(config, 'utf8')
    const env = publicationEnvironment({ ...process.env, ...context })
    assert.equal(env.GIT_TERMINAL_PROMPT, '0')
    assert.equal(env.GIT_CONFIG_VALUE_0, '')
    assert.equal(env.GIT_COMMITTER_NAME, 'github-actions[bot]')
    assert.equal(env.GIT_COMMITTER_EMAIL, '41898282+github-actions[bot]@users.noreply.github.com')
    const helpers = execute(temp, ['config', '--get-all', 'credential.https://github.com.helper'], env)
    assert.equal(helpers, '!gh auth git-credential')
    assert.ok(!helpers.includes(context.GH_TOKEN))
    const credential = spawnSync('git', ['credential', 'fill'], {
      cwd: temp, env, encoding: 'utf8', input: 'protocol=https\nhost=github.com\n\n',
    })
    assert.equal(credential.status, 0, 'process-scoped gh credential helper must succeed')
    assert.ok(credential.stdout.includes(`password=${context.GH_TOKEN}`), 'helper must use the synthetic process token')
    assert.ok(!credential.stderr.includes(context.GH_TOKEN), 'helper must not log the token')
    assert.equal(readFileSync(config, 'utf8'), before)
    const unscoped = spawnSync('git', ['config', '--local', '--get-all', 'credential.https://github.com.helper'], { cwd: temp })
    assert.equal(unscoped.status, 1)
    assert.equal(context.GIT_CONFIG_COUNT, undefined)
    assert.throws(() => publicationEnvironment({ GH_TOKEN: '' }), /token/u)
  }
  finally { rmSync(temp, { recursive: true, force: true }) }
})

test('the unchanged publisher creates an annotated tag atomically in an isolated local Git fixture and rejects reuse', () => {
  const temp = mkdtempSync(join(tmpdir(), 'yourbuddy-atomic-test-'))
  const checkout = join(temp, 'checkout')
  const remote = join(temp, 'remote.git')
  const env = publicationEnvironment({ ...process.env, ...context, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid' })
  try {
    mkdirSync(checkout)
    execute(temp, ['init', '--bare', remote], env)
    execute(checkout, ['init', '--initial-branch=master'], env)
    for (const relative of [
      'apps/desktop-tauri/package.json', 'apps/desktop-tauri/src-tauri/tauri.conf.json',
      'apps/desktop-tauri/src-tauri/Cargo.toml', 'apps/desktop-tauri/src-tauri/Cargo.lock',
      'apps/desktop-tauri/release-notes.md', 'apps/desktop-tauri/scripts/publish-release.mjs',
      'apps/desktop-tauri/scripts/verify-release-version.mjs',
      'docs/releases/README.md', 'docs/releases/README.zh.md', 'docs/releases/yourbuddy-v0.4.9',
    ]) {
      mkdirSync(dirname(join(checkout, relative)), { recursive: true })
      cpSync(join(root, relative), join(checkout, relative), { recursive: true })
    }
    // Keep this immutable 0.4.9 fixture valid after later source-version bumps.
    const desktop = join(checkout, 'apps/desktop-tauri')
    writeFileSync(join(desktop, 'package.json'), JSON.stringify({ version: '0.4.9' }))
    writeFileSync(join(desktop, 'src-tauri/tauri.conf.json'), JSON.stringify({
      version: '0.4.9', bundle: { resources: { 'icons/icon.ico': 'yourbuddy-icon-0.4.9.ico' } },
    }))
    writeFileSync(join(desktop, 'src-tauri/Cargo.toml'), 'version = "0.4.9"\n')
    writeFileSync(join(desktop, 'src-tauri/Cargo.lock'), '[[package]]\nname = "yourbuddy"\nversion = "0.4.9"\n')
    writeFileSync(join(desktop, 'release-notes.md'), '# YourBuddy 0.4.9\nhttps://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.9/docs/releases/yourbuddy-v0.4.9\n')
    execute(checkout, ['add', '.'], env)
    execute(checkout, ['commit', '-m', 'fixture'], env)
    execute(checkout, ['remote', 'add', 'origin', remote], env)
    execute(checkout, ['push', 'origin', 'master'], env)
    const head = execute(checkout, ['rev-parse', 'HEAD'], env)
    const script = join(checkout, 'apps/desktop-tauri/scripts/publish-release.mjs')
    const publish = () => spawnSync(process.execPath, [script, '0.4.9'], { cwd: checkout, env, encoding: 'utf8' })
    writeFileSync(join(checkout, 'dirty'), 'uncommitted')
    assert.notEqual(publish().status, 0)
    assert.equal(execute(checkout, ['ls-remote', '--tags', 'origin'], env), '')
    rmSync(join(checkout, 'dirty'))
    execute(remote, ['config', 'receive.advertiseAtomic', 'false'], env)
    assert.notEqual(publish().status, 0, 'a server without atomic support must refuse publication')
    assert.equal(execute(checkout, ['ls-remote', '--tags', 'origin'], env), '')
    execute(remote, ['config', 'receive.advertiseAtomic', 'true'], env)
    const result = publish()
    assert.equal(result.status, 0, result.stderr)
    assert.ok(!`${result.stdout}${result.stderr}`.includes(context.GH_TOKEN))
    assert.equal(execute(checkout, ['cat-file', '-t', 'yourbuddy-v0.4.9'], env), 'tag')
    assert.equal(execute(checkout, ['rev-parse', 'yourbuddy-v0.4.9^{}'], env), head)
    assert.equal(execute(remote, ['rev-parse', 'refs/heads/master'], env), head)
    assert.equal(execute(remote, ['rev-parse', 'refs/tags/yourbuddy-v0.4.9^{}'], env), head)
    assert.notEqual(publish().status, 0)
    assert.equal(execute(remote, ['rev-parse', 'refs/tags/yourbuddy-v0.4.9^{}'], env), head)
  }
  finally { rmSync(temp, { recursive: true, force: true }) }
})
