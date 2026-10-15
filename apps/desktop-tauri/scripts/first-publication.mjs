/** Bounded candidate validation and one-time dispatch into the unchanged release publisher. */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** Validate dispatch identity before using the workflow token or running Git. */
export function validateCandidateIdentity(env) {
  if (env.GITHUB_REPOSITORY !== 'istarwyh/yourbuddy'
    || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
    || env.GITHUB_REF !== 'refs/heads/master'
    || !['first-publication', 'candidate-validation'].includes(env.RELEASE_MODE)
    || env.RELEASE_VERSION !== '0.4.11'
    || env.RELEASE_TAG !== 'yourbuddy-v0.4.11') {
    throw new Error('candidate dispatch requires istarwyh/yourbuddy, master, and version 0.4.11')
  }
  if (!/^[a-f0-9]{40}$/u.test(env.VERIFIED_MASTER_SHA ?? '')
    || env.GITHUB_SHA !== env.VERIFIED_MASTER_SHA) {
    throw new Error('dispatch SHA must equal the exact verified master SHA')
  }
}

/** Only an explicit API 404 establishes that the Release does not exist. */
export async function assertReleaseAbsent(env, request = fetch) {
  if (!env.GH_TOKEN) throw new Error('the workflow token is required')
  let response
  try {
    response = await request(
      `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/releases/tags/${encodeURIComponent(env.RELEASE_TAG)}`,
      {
        headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      },
    )
  }
  catch {
    throw new Error('Release API request failed; absence is unverified')
  }
  if (response.status === 404) return
  if (response.status === 200) throw new Error('GitHub Release already exists; do not replace its assets')
  throw new Error(`Release absence could not be established (HTTP ${response.status})`)
}

/** Scope Git authentication and tagger identity to child processes, never Git config files. */
export function publicationEnvironment(env) {
  if (!env.GH_TOKEN) throw new Error('the workflow token is required')
  return {
    ...env,
    GIT_CONFIG_COUNT: '2',
    GIT_CONFIG_KEY_0: 'credential.helper',
    GIT_CONFIG_VALUE_0: '',
    GIT_CONFIG_KEY_1: 'credential.https://github.com.helper',
    GIT_CONFIG_VALUE_1: '!gh auth git-credential',
    GIT_TERMINAL_PROMPT: '0',
    GIT_COMMITTER_NAME: 'github-actions[bot]',
    GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
  }
}

function command(command, args, env) {
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    // Do not echo a credential-helper diagnostic or captured subprocess environment.
    throw new Error(`${command} failed during first publication (exit ${result.status ?? 'unknown'})`)
  }
  return result.stdout.trim()
}

/** Verify the pinned candidate without creating tags, Releases, or updater feeds. */
export async function verifyCandidate(env, run = command, request = fetch) {
  validateCandidateIdentity(env)
  await assertReleaseAbsent(env, request)
  const childEnv = publicationEnvironment(env)
  const origin = run('git', ['remote', 'get-url', 'origin'], childEnv)
  if (origin !== 'https://github.com/istarwyh/yourbuddy' && origin !== 'https://github.com/istarwyh/yourbuddy.git') {
    throw new Error('origin must be the YourBuddy HTTPS repository')
  }
  if (run('git', ['branch', '--show-current'], childEnv) !== 'master') {
    throw new Error('candidate dispatch requires an attached master checkout')
  }
  if (run('git', ['status', '--porcelain=v1'], childEnv) !== '') {
    throw new Error('candidate dispatch requires a clean worktree')
  }
  run('git', ['fetch', '--no-tags', 'origin', 'refs/heads/master:refs/remotes/origin/master'], childEnv)
  for (const ref of ['HEAD', 'refs/remotes/origin/master']) {
    if (run('git', ['rev-parse', ref], childEnv) !== env.VERIFIED_MASTER_SHA) {
      throw new Error(`${ref} no longer equals the verified master SHA`)
    }
  }
  return childEnv
}

/** Recheck the pinned checkout immediately before the existing guarded atomic publisher. */
export async function firstPublication(env, run = command, request = fetch) {
  if (env.RELEASE_MODE !== 'first-publication') throw new Error('tag publication requires first-publication mode')
  const childEnv = await verifyCandidate(env, run, request)
  run(process.execPath, [join(root, 'apps/desktop-tauri/scripts/publish-release.mjs'), '0.4.11'], childEnv)
}

/** Validate the selected workflow route and fail closed on the Release API. */
export async function preflight(env, request = fetch) {
  if (['first-publication', 'candidate-validation'].includes(env.RELEASE_MODE)) validateCandidateIdentity(env)
  else if (env.RELEASE_MODE !== 'existing-tag') throw new Error('unknown release mode')
  await assertReleaseAbsent(env, request)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === 'preflight') await preflight(process.env)
    else if (process.argv[2] === 'verify') await verifyCandidate(process.env)
    else if (process.argv[2] === 'publish') await firstPublication(process.env)
    else throw new Error('usage: first-publication.mjs preflight|verify|publish')
  }
  catch (error) {
    // Fetch and credential-provider errors can carry sensitive context; keep CLI failures generic.
    console.error(error instanceof Error && !error.cause ? error.message : 'first-publication failed')
    process.exitCode = 1
  }
}
