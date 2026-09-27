/** Prepare one local YourBuddy release draft without network access. */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { verifyReleaseVersion } from './verify-release-version.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = join(desktopRoot, '..', '..')
const releaseBranch = 'master'

function runGit(args) {
  const result = spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}\n${result.stderr.trim()}`)
  return result.stdout.trim()
}

function replaceOnce(text, before, after, source) {
  const first = text.indexOf(before)
  if (first < 0 || text.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${source} must contain exactly one ${JSON.stringify(before)}`)
  }
  return `${text.slice(0, first)}${after}${text.slice(first + before.length)}`
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number)
  const b = right.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

/** @param {string[]} argv */
export function parsePrepareArguments(argv) {
  if (argv[0] === '--') argv = argv.slice(1)
  if (argv.length !== 1 || !/^\d+\.\d+\.\d+$/u.test(argv[0])) {
    throw new Error('usage: pnpm release:yourbuddy:prepare -- <X.Y.Z>')
  }
  return { version: argv[0], tag: `yourbuddy-v${argv[0]}` }
}

/** @param {{branch: string, status: string, currentVersion: string, version: string, archiveExists: boolean}} state */
export function validatePreparationState(state) {
  if (state.branch !== releaseBranch) {
    throw new Error(`YourBuddy release preparation must run on ${releaseBranch}; current branch is ${state.branch || '(detached)'}`)
  }
  if (state.status !== '') throw new Error('YourBuddy release preparation requires a clean worktree')
  if (compareVersions(state.version, state.currentVersion) <= 0) {
    throw new Error(`YourBuddy release version must increase from ${state.currentVersion}; received ${state.version}`)
  }
  if (state.archiveExists) throw new Error(`release archive already exists for yourbuddy-v${state.version}`)
}

/** @param {string} template @param {string} version @param {string} tag @param {'en'|'zh'} locale */
export function draftArchive(template, version, tag, locale) {
  const english = locale === 'en'
  let output = template
    .replace(/^# .+$/mu, `# YourBuddy ${version}`)
    .replace(/^.*Copy this directory.*$/mu, 'This draft was generated locally. Replace every `TODO` before publication.')
    .replace(/^.*把本目录复制到.*$/mu, '本草稿由本地命令生成。发布前必须替换全部 `TODO`。')
    .replaceAll(/<[^>\n]+>/gu, 'TODO')
  output = replaceOnce(output, english ? '- Release identifier: `TODO`' : '- 发布标识：`TODO`', english ? `- Release identifier: \`${tag}\`` : `- 发布标识：\`${tag}\``, `${locale} archive`)
  output = replaceOnce(output, english ? '- Product channel: `TODO`' : '- 产品渠道：`TODO`', english ? '- Product channel: YourBuddy desktop for macOS Apple Silicon.' : '- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。', `${locale} archive`)
  output = replaceOnce(output, english ? '- Archive state: `TODO`' : '- 归档状态：`TODO`', english ? '- Archive state: draft; complete every TODO before publication.' : '- 归档状态：草稿；发布前必须完成全部 TODO。', `${locale} archive`)
  return output
}

/** @param {string} index @param {string} row */
export function prependReleaseIndex(index, row) {
  const separator = '|---|---|---|---|---|\n'
  return replaceOnce(index, separator, `${separator}${row}\n`, 'release index')
}

function recordPair(pairPath) {
  const result = spawnSync('pnpm', ['run', 'verify-translation-pairing', '--write', pairPath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`translation pairing failed for ${pairPath}`)
}

/** @param {{version: string, tag: string}} input */
export function prepareReleaseCandidate({ version, tag }) {
  const topLevel = resolve(runGit(['rev-parse', '--show-toplevel']))
  if (topLevel !== resolve(repositoryRoot)) throw new Error(`release command must run in ${repositoryRoot}`)
  const current = verifyReleaseVersion()
  const archiveRelative = `docs/releases/${tag}`
  const archiveRoot = join(repositoryRoot, archiveRelative)
  validatePreparationState({
    branch: runGit(['branch', '--show-current']),
    status: runGit(['status', '--porcelain=v1']),
    currentVersion: current.version,
    version,
    archiveExists: existsSync(archiveRoot),
  })

  const packagePath = join(desktopRoot, 'package.json')
  const tauriPath = join(desktopRoot, 'src-tauri', 'tauri.conf.json')
  const cargoPath = join(desktopRoot, 'src-tauri', 'Cargo.toml')
  const cargoLockPath = join(desktopRoot, 'src-tauri', 'Cargo.lock')
  const notesPath = join(desktopRoot, 'release-notes.md')
  const englishIndexPath = join(repositoryRoot, 'docs', 'releases', 'README.md')
  const chineseIndexPath = join(repositoryRoot, 'docs', 'releases', 'README.zh.md')

  const files = new Map()
  files.set(packagePath, replaceOnce(readFileSync(packagePath, 'utf8'), `\"version\": \"${current.version}\"`, `\"version\": \"${version}\"`, 'package.json'))
  let tauri = replaceOnce(readFileSync(tauriPath, 'utf8'), `\"version\": \"${current.version}\"`, `\"version\": \"${version}\"`, 'tauri.conf.json')
  tauri = replaceOnce(tauri, `yourbuddy-icon-${current.version}.ico`, `yourbuddy-icon-${version}.ico`, 'tauri.conf.json icon')
  files.set(tauriPath, tauri)
  files.set(cargoPath, replaceOnce(readFileSync(cargoPath, 'utf8'), `version = \"${current.version}\"`, `version = \"${version}\"`, 'Cargo.toml'))
  const lockBlock = new RegExp(`(\\[\\[package\\]\\]\\nname = \"yourbuddy\"\\nversion = \")${current.version.replaceAll('.', '\\.')}(\")`, 'u')
  const cargoLock = readFileSync(cargoLockPath, 'utf8')
  if (!lockBlock.test(cargoLock)) throw new Error('Cargo.lock does not contain the current YourBuddy package version')
  files.set(cargoLockPath, cargoLock.replace(lockBlock, `$1${version}$2`))
  files.set(notesPath, `# YourBuddy ${version}\n\nTODO: Write concise English and Chinese release notes.\n\nVerification archive: https://github.com/istarwyh/yourbuddy/tree/${tag}/${archiveRelative}\n`)

  const englishTemplate = readFileSync(join(repositoryRoot, 'docs', 'releases', '_template', 'README.md'), 'utf8')
  const chineseTemplate = readFileSync(join(repositoryRoot, 'docs', 'releases', '_template', 'README.zh.md'), 'utf8')
  files.set(join(archiveRoot, 'README.md'), draftArchive(englishTemplate, version, tag, 'en'))
  files.set(join(archiveRoot, 'README.zh.md'), draftArchive(chineseTemplate, version, tag, 'zh'))
  files.set(englishIndexPath, prependReleaseIndex(readFileSync(englishIndexPath, 'utf8'), `| [${tag}](${tag}/README.md) | YourBuddy desktop | Draft | Complete the generated archive before publication | Release candidate |`))
  files.set(chineseIndexPath, prependReleaseIndex(readFileSync(chineseIndexPath, 'utf8'), `| [${tag}](${tag}/README.zh.md) | YourBuddy 桌面应用 | 草稿 | 发布前完成生成的归档 | 候选版本 |`))

  mkdirSync(archiveRoot, { recursive: false })
  for (const [path, content] of files) writeFileSync(path, content)
  recordPair('docs/releases/README.i18n.yaml')
  recordPair(`${archiveRelative}/README.i18n.yaml`)
  verifyReleaseVersion(tag)
  console.log(`prepare-release-candidate: created ${tag} draft; replace every TODO, re-record its pair, commit, then run pnpm release:yourbuddy -- ${version}`)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  try {
    prepareReleaseCandidate(parsePrepareArguments(process.argv.slice(2)))
  }
  catch (error) {
    console.error(`prepare-release-candidate: ${error.message}`)
    process.exitCode = 1
  }
}
