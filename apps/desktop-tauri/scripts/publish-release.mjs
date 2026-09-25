/** Validate a committed YourBuddy candidate, then atomically push its branch and release tag. */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { verifyReleaseVersion } from './verify-release-version.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = join(desktopRoot, '..', '..')
const releaseBranch = 'master'
const productSiteBaseUrl = 'https://istarwyh.github.io/yourbuddy/'

function commandFailure(command, args, result) {
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  return new Error(
    `${command} ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}`
    + (output === '' ? '' : `\n${output}`),
  )
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: options.env ?? process.env,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw commandFailure(command, args, result)
  return options.capture ? result.stdout.trim() : ''
}

function git(args) {
  return run('git', args, { capture: true })
}

function optionalGit(args) {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.error) throw result.error
  if (result.status === 0) return result.stdout.trim()
  if (result.status === 1) return undefined
  throw commandFailure('git', args, result)
}

function runPnpm(cwd, args, env = process.env) {
  const npmExecPath = process.env.npm_execpath
  if (npmExecPath && /\.[cm]?js$/iu.test(npmExecPath)) {
    run(process.execPath, [npmExecPath, ...args], { cwd, env })
    return
  }
  run('pnpm', args, { cwd, env })
}

/**
 * Parse one stable release version for the fixed origin remote.
 *
 * @param {string[]} argv
 * @returns {{version: string, tag: string, remote: string}}
 */
export function parsePublishArguments(argv) {
  if (argv[0] === '--') argv = argv.slice(1)
  if (argv.length !== 1) {
    throw new Error('usage: pnpm release:yourbuddy -- <X.Y.Z>')
  }
  const version = argv[0]
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    throw new Error(`invalid stable YourBuddy version: ${version}`)
  }
  return { version, tag: `yourbuddy-v${version}`, remote: 'origin' }
}

/**
 * Require the release archive, index entries, and GitHub release-notes link.
 *
 * @param {string} root
 * @param {string} version
 * @param {string} tag
 */
export function verifyReleaseArchive(root, version, tag) {
  const archiveRoot = join(root, 'docs', 'releases', tag)
  for (const name of ['README.md', 'README.zh.md', 'README.i18n.yaml']) {
    if (!existsSync(join(archiveRoot, name))) {
      throw new Error(`release archive is missing docs/releases/${tag}/${name}`)
    }
  }
  const english = readFileSync(join(archiveRoot, 'README.md'), 'utf8')
  const chinese = readFileSync(join(archiveRoot, 'README.zh.md'), 'utf8')
  if (!english.startsWith(`# YourBuddy ${version}\n`) || !english.includes(`\`${tag}\``)) {
    throw new Error(`docs/releases/${tag}/README.md does not identify ${tag}`)
  }
  if (!chinese.startsWith(`# YourBuddy ${version}\n`) || !chinese.includes(`\`${tag}\``)) {
    throw new Error(`docs/releases/${tag}/README.zh.md does not identify ${tag}`)
  }
  const templateMarkers = [
    '<Describe', '<State', '<Record', '<Product', '<scenario>',
    '<描述', '<说明', '<记录', '<产品名称>', '<场景>',
  ]
  for (const [name, text] of [['README.md', english], ['README.zh.md', chinese]]) {
    const marker = templateMarkers.find(candidate => text.includes(candidate))
    if (marker !== undefined) {
      throw new Error(`docs/releases/${tag}/${name} still contains template marker ${marker}`)
    }
  }
  const englishIndex = readFileSync(join(root, 'docs', 'releases', 'README.md'), 'utf8')
  const chineseIndex = readFileSync(join(root, 'docs', 'releases', 'README.zh.md'), 'utf8')
  if (!englishIndex.includes(`[${tag}](${tag}/README.md)`)) {
    throw new Error(`docs/releases/README.md is missing ${tag}`)
  }
  if (!chineseIndex.includes(`[${tag}](${tag}/README.zh.md)`)) {
    throw new Error(`docs/releases/README.zh.md is missing ${tag}`)
  }
  const notes = readFileSync(join(root, 'apps', 'desktop-tauri', 'release-notes.md'), 'utf8')
  if (!notes.includes(`/tree/${tag}/docs/releases/${tag}`)) {
    throw new Error(`apps/desktop-tauri/release-notes.md is missing the ${tag} verification link`)
  }
}

/**
 * Validate the local and fetched Git state before publication.
 *
 * @param {{branch: string, status: string, head: string, remoteHead: string, remoteIsAncestor: boolean, localTagHead?: string, localTagType?: string, remoteTagRefs: string}} state
 */
export function validatePublishState(state) {
  if (state.branch !== releaseBranch) {
    throw new Error(`YourBuddy releases must publish from ${releaseBranch}; current branch is ${state.branch || '(detached)'}`)
  }
  if (state.status !== '') {
    throw new Error('YourBuddy release publication requires a clean worktree; review and commit every intended change first')
  }
  if (state.remoteTagRefs !== '') {
    throw new Error('the release tag already exists on the remote; retry its unpublished workflow instead of moving the tag')
  }
  if (state.localTagHead !== undefined && state.localTagType !== 'tag') {
    throw new Error('the local release tag must be annotated')
  }
  if (state.localTagHead !== undefined && state.localTagHead !== state.head) {
    throw new Error('the local release tag points to another commit')
  }
  if (state.remoteHead !== state.head && !state.remoteIsAncestor) {
    throw new Error(`local ${releaseBranch} does not fast-forward the fetched remote branch`)
  }
}

function currentState(remote, tag) {
  const head = git(['rev-parse', 'HEAD'])
  const remoteHead = git(['rev-parse', `refs/remotes/${remote}/${releaseBranch}`])
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', remoteHead, head], {
    cwd: repositoryRoot,
    stdio: 'ignore',
  })
  if (ancestor.error) throw ancestor.error
  if (ancestor.status !== 0 && ancestor.status !== 1) {
    throw new Error(`git merge-base --is-ancestor failed with exit ${ancestor.status ?? 'unknown'}`)
  }
  const localTagHead = optionalGit(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])
  return {
    branch: git(['branch', '--show-current']),
    status: git(['status', '--porcelain=v1']),
    head,
    remoteHead,
    remoteIsAncestor: ancestor.status === 0,
    localTagHead,
    localTagType: localTagHead === undefined
      ? undefined
      : git(['cat-file', '-t', `refs/tags/${tag}`]),
    remoteTagRefs: git(['ls-remote', '--tags', remote, `refs/tags/${tag}`, `refs/tags/${tag}^{}`]),
  }
}

function assertCandidateUnchanged(head) {
  const currentHead = git(['rev-parse', 'HEAD'])
  const status = git(['status', '--porcelain=v1'])
  if (currentHead !== head || status !== '') {
    throw new Error(
      'release checks changed the candidate; review and commit those changes, then rerun the publish command',
    )
  }
}

function verifyRemotePublication(remote, tag, head) {
  const refs = git([
    'ls-remote', remote,
    `refs/heads/${releaseBranch}`,
    `refs/tags/${tag}^{}`,
  ])
  const entries = new Map(refs.split('\n').filter(Boolean).map(line => line.split(/\s+/u).reverse()))
  if (entries.get(`refs/heads/${releaseBranch}`) !== head || entries.get(`refs/tags/${tag}^{}`) !== head) {
    throw new Error('remote verification did not find the release branch and peeled tag at the candidate commit')
  }
}

/**
 * Publish the committed candidate and return its immutable identity.
 *
 * @param {{version: string, tag: string, remote: string}} input
 * @returns {{tag: string, head: string}}
 */
export function publishRelease({ version, tag, remote }) {
  const topLevel = resolve(git(['rev-parse', '--show-toplevel']))
  if (topLevel !== resolve(repositoryRoot)) {
    throw new Error(`release command must run in ${repositoryRoot}`)
  }
  const versionResult = verifyReleaseVersion(tag)
  if (versionResult.version !== version) {
    throw new Error(`requested ${version}, but desktop sources contain ${versionResult.version}`)
  }
  verifyReleaseArchive(repositoryRoot, version, tag)

  run('git', ['fetch', '--no-tags', remote, `refs/heads/${releaseBranch}:refs/remotes/${remote}/${releaseBranch}`])
  const state = currentState(remote, tag)
  validatePublishState(state)

  runPnpm(desktopRoot, ['run', 'test:release'])
  runPnpm(desktopRoot, ['run', 'prepare:release'])
  assertCandidateUnchanged(state.head)
  runPnpm(repositoryRoot, ['run', 'doc-sync'])
  runPnpm(repositoryRoot, ['run', 'website:check'], {
    ...process.env,
    PRODUCT_SITE_BASE_URL: productSiteBaseUrl,
  })
  assertCandidateUnchanged(state.head)

  if (state.localTagHead === undefined) {
    run('git', ['tag', '--annotate', tag, '--message', `YourBuddy ${version}`])
  }
  run('git', [
    'push', '--atomic', remote,
    `HEAD:refs/heads/${releaseBranch}`,
    `refs/tags/${tag}:refs/tags/${tag}`,
  ])
  verifyRemotePublication(remote, tag, state.head)
  console.log(`publish-release: pushed ${tag} at ${state.head}; GitHub Actions owns artifact publication`)
  return { tag, head: state.head }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  try {
    publishRelease(parsePublishArguments(process.argv.slice(2)))
  }
  catch (error) {
    console.error(`publish-release: ${error.message}`)
    process.exitCode = 1
  }
}
