/** Exercise release guards in PR CI and retain the same-run artifact publication path. */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

interface Step {
  name?: string
  uses?: string
  run?: string
  if?: string
  'continue-on-error'?: boolean
  env?: Record<string, string>
  with?: Record<string, unknown>
}

interface Workflow {
  on: Record<string, unknown>
  permissions: Record<string, string>
  concurrency: { group: string; 'cancel-in-progress': boolean }
  env: Record<string, string>
  jobs: Record<string, {
    'runs-on': string
    if?: string
    'continue-on-error'?: boolean
    steps: Step[]
  }>
}

const workflow = load(readFileSync(resolve(root, '.github/workflows/desktop-release.yml'), 'utf8')) as Workflow
const firstPublicationCondition = "env.RELEASE_MODE == 'first-publication'"
const tagExpression = "${{ github.event_name == 'workflow_dispatch' && (inputs.mode != 'existing-tag' && inputs.mode != '' && 'yourbuddy-v0.4.11' || inputs.tag) || github.ref_name }}"

// These canonical string inputs use the same truthiness and equality in Actions and JavaScript.
function evaluate(expression: string | undefined, context: Record<string, string>): string {
  if (expression === undefined) return 'true'
  const source = expression.replace(/\balways\(\)/g, 'true').trim().replace(/^\$\{\{|\}\}$/g, '')
    .replace(/\b(?:github|inputs|env)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)+/g,
      key => JSON.stringify(context[key] ?? ''))
  return String(runInNewContext(source, {}, { timeout: 1000 }))
}

function assertPublicationGates(candidate: Workflow): void {
  expect(Object.keys(candidate.jobs)).toEqual(['build'])
  const build = candidate.jobs.build!
  expect(build['runs-on']).toBe('macos-15')
  expect(build.if).toBeUndefined()
  expect(build['continue-on-error']).toBeUndefined()
  const names = [
    'Validate release route and refuse an existing Release',
    'Refuse an existing Release for tag retry',
    'Verify release tag and desktop versions',
    'Check native acceptance prerequisites',
    'Install workspace dependencies',
    'Check types before candidate validation or publication',
    'Verify the candidate without publishing',
    'Publish the verified master tag atomically',
    'Build Harness',
    'Prepare frozen release inputs',
    'Install prepared product acceptance browser',
    'Verify prepared default workbench and optional Harbor',
    'Remove Python bytecode excluded from component archives',
    'Build immutable runtime components',
    'Retain component archive measurements',
    'Build Bootstrap app and DMG',
    'Enforce Bootstrap DMG ceiling and resource exclusions',
    'Build Offline app and DMG',
    'Record installer archive sizes',
    'Verify native Offline installation and cold starts',
    'Test relocated YourBuddy product runtime',
    'Stage release assets',
    'Generate updater manifest',
    'Generate and verify release checksums',
    'Retain updater metadata and checksums',
    'Publish release',
    'Upload validation candidate artifacts',
    'Upload prepared acceptance evidence',
    'Upload native acceptance evidence',
  ]
  const positions = names.map((name) => {
    const matches = build.steps.filter(step => step.name === name)
    expect(matches, name).toHaveLength(1)
    return build.steps.indexOf(matches[0]!)
  })
  expect(positions).toEqual([...positions].sort((left, right) => left - right))
  for (const step of build.steps) {
    expect(step['continue-on-error'], step.name ?? step.uses).toBeUndefined()
    const conditions: Record<string, string> = {
      'Validate release route and refuse an existing Release': "env.RELEASE_MODE != 'existing-tag'",
      'Refuse an existing Release for tag retry': "env.RELEASE_MODE == 'existing-tag'",
      'Check types before candidate validation or publication': "env.RELEASE_MODE != 'existing-tag'",
      'Upload prepared acceptance evidence': 'always()',
      'Upload native acceptance evidence': 'always()',
      'Verify the candidate without publishing': "env.RELEASE_MODE == 'candidate-validation'",
      'Publish the verified master tag atomically': firstPublicationCondition,
      'Publish release': "env.RELEASE_MODE != 'candidate-validation'",
      'Upload validation candidate artifacts': "env.RELEASE_MODE == 'candidate-validation'",
    }
    expect(step.if, step.name ?? step.uses).toBe(conditions[step.name ?? ''])
  }
  expect(build.steps.find(step => step.name === 'Validate release route and refuse an existing Release'))
    .toMatchObject({ run: 'node apps/desktop-tauri/scripts/first-publication.mjs preflight', env: { GH_TOKEN: '${{ github.token }}' } })
  expect(build.steps.find(step => step.name === 'Verify release tag and desktop versions')?.run)
    .toBe('node apps/desktop-tauri/scripts/verify-release-version.mjs --tag "$RELEASE_TAG"')
  expect(build.steps.find(step => step.name === 'Install workspace dependencies')?.run)
    .toBe('pnpm install --frozen-lockfile')
  expect(build.steps.find(step => step.name === 'Check types before candidate validation or publication')?.run)
    .toBe('pnpm run typecheck')
  expect(build.steps.find(step => step.name === 'Publish the verified master tag atomically'))
    .toMatchObject({ run: 'node apps/desktop-tauri/scripts/first-publication.mjs publish', env: { GH_TOKEN: '${{ github.token }}' } })
  expect(build.steps.find(step => step.name === 'Check native acceptance prerequisites')?.run)
    .toBe('git show "${GITHUB_WORKFLOW_SHA:?}:apps/desktop-tauri/scripts/smoke-offline-startup-macos.mjs" > "$RUNNER_TEMP/yourbuddy-native-smoke.mjs"\n'
      + 'echo "Native acceptance runner: $GITHUB_WORKFLOW_SHA; application source: $(git rev-parse HEAD)"\n'
      + 'node "$RUNNER_TEMP/yourbuddy-native-smoke.mjs" --preflight\n')
  expect(build.steps.find(step => step.name === 'Verify native Offline installation and cold starts')?.run)
    .toBe('node "$RUNNER_TEMP/yourbuddy-native-smoke.mjs" "$RUNNER_TEMP/offline-updater-resources/YourBuddy.app/Contents/MacOS/yourbuddy" "$RUNNER_TEMP/offline-startup-smoke" "${RELEASE_TAG#yourbuddy-v}"')
  expect(build.steps.find(step => step.name === 'Upload native acceptance evidence')).toMatchObject({
    uses: 'actions/upload-artifact@v4',
    with: { path: '${{ runner.temp }}/offline-startup-smoke/evidence/', 'if-no-files-found': 'warn', 'retention-days': 7 },
  })
  expect(build.steps.find(step => step.name === 'Build Harness')?.run).toBe('pnpm run build')
  expect(build.steps.find(step => step.name === 'Prepare frozen release inputs')).toMatchObject({
    run: 'pnpm --dir apps/desktop-tauri run prepare:dist',
    env: { YOURBUDDY_OFFLINE_STORE_CACHE_DIR: '${{ runner.temp }}/yourbuddy-offline-store-cache' },
  })
  const prepared = build.steps.find(step => step.name === 'Verify prepared default workbench and optional Harbor')!
  expect(prepared.run).toContain("execFileSync('pnpm', pinPnpmInvocationArgs(frozenOfflineInstallArgs())")
  expect(prepared.run).toContain('await withProcessEnvironment(')
  expect(prepared.run).toContain('const desktopOverlayPath = renderReleaseDesktopOverlay(')
  expect(prepared.run).toContain('await verifyPreparedProduct(')
  expect(prepared.run).toContain('`${sourceEnvironment.GITHUB_WORKFLOW_SHA}:apps/desktop-tauri/scripts/verify-product-release.mjs`')
  expect(prepared.run).toContain('await import(pathToFileURL(verifierPath).href)')
  expect(prepared.run).toContain('rmSync(verifierPath, { force: true })')
  expect(prepared.run).not.toContain("from './apps/desktop-tauri/scripts/verify-product-release.mjs'")
  expect(prepared.run).toContain('capabilities: readPreparedCapabilities()')
  expect(prepared.run).toContain('process.exitCode = 1')
  expect(prepared.run).not.toMatch(/prepareRelease\(|prepare:release|refresh:product-plugins|sync:dsh/)
  expect(build.steps.find(step => step.name === 'Upload prepared acceptance evidence')).toMatchObject({
    uses: 'actions/upload-artifact@v4',
    with: { path: '${{ runner.temp }}/yourbuddy-prepared-acceptance/', 'if-no-files-found': 'warn', 'retention-days': 7 },
  })
  const publication = build.steps.find(step => step.name === 'Publish release')!
  expect(publication.run).toContain('gh release create "$RELEASE_TAG" release-assets/* --verify-tag')
  expect(publication.run).toContain('gh release upload yourbuddy-updater release-assets/latest.json --clobber')
  expect(publication.env).toEqual({ GH_TOKEN: '${{ github.token }}', GH_REPO: '${{ github.repository }}' })
}

describe('YourBuddy first publication', () => {
  it('runs the existing publisher and first-publication Node regressions inside PR CI', () => {
    const result = spawnSync(process.execPath, [
      '--test',
      'apps/desktop-tauri/scripts/publish-release.test.mjs',
      'apps/desktop-tauri/scripts/first-publication.test.mjs',
      'apps/desktop-tauri/scripts/smoke-offline-startup-macos.test.mjs',
    ], {
      cwd: root,
      encoding: 'utf8',
      // Guard checks and isolated Git fixtures need no build; bound a hanging child.
      timeout: 30_000,
    })
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  })

  it('defaults manual dispatch to existing-tag and retains tag-triggered releases', () => {
    expect(workflow.on).toEqual({
      push: { tags: ['yourbuddy-v*'] },
      workflow_dispatch: {
        inputs: {
          mode: {
            description: 'Retry an existing tag, validate a candidate, or first-publish verified 0.4.11',
            type: 'choice',
            options: ['existing-tag', 'first-publication', 'candidate-validation'],
            default: 'existing-tag',
            required: true,
          },
          version: { description: 'Candidate validation or first publication (fixed at 0.4.11)', default: '0.4.11', required: false },
          verified_master_sha: { description: 'Candidate validation or first publication, exact operator-verified master SHA', required: false },
          tag: {
            description: 'Existing unpublished yourbuddy-v* tag to build after a failed run',
            required: true,
            default: 'desktop-v0.2.0-rc.1-0.3',
          },
        },
      },
    })
    expect(workflow.env.RELEASE_MODE).toBe("${{ github.event_name == 'workflow_dispatch' && inputs.mode || 'existing-tag' }}")
    expect(workflow.env.RELEASE_VERSION).toBe('${{ inputs.version }}')
    expect(workflow.env.VERIFIED_MASTER_SHA).toBe('${{ inputs.verified_master_sha }}')
  })

  it('uses the same uncancelled concurrency group for first publication, retry, and tag push', () => {
    expect(workflow.env.RELEASE_TAG).toBe(tagExpression)
    expect(workflow.concurrency).toEqual({ group: `yourbuddy-release-${tagExpression}`, 'cancel-in-progress': false })
    const contexts = [
      { 'github.event_name': 'workflow_dispatch', 'inputs.mode': 'candidate-validation', 'inputs.tag': 'ignored', 'github.ref_name': 'master' },
      { 'github.event_name': 'workflow_dispatch', 'inputs.mode': 'first-publication', 'inputs.tag': 'ignored', 'github.ref_name': 'master' },
      { 'github.event_name': 'workflow_dispatch', 'inputs.mode': 'existing-tag', 'inputs.tag': 'yourbuddy-v0.4.11', 'github.ref_name': 'master' },
      { 'github.event_name': 'push', 'inputs.mode': '', 'inputs.tag': '', 'github.ref_name': 'yourbuddy-v0.4.11' },
    ]
    for (const context of contexts) expect(evaluate(workflow.env.RELEASE_TAG, context)).toBe('yourbuddy-v0.4.11')
    for (const tag of ['yourbuddy-v0.4.8', 'yourbuddy-v0.4.9', 'yourbuddy-v0.4.10']) {
      expect(evaluate(workflow.env.RELEASE_TAG, {
        'github.event_name': 'workflow_dispatch', 'inputs.mode': 'existing-tag', 'inputs.tag': tag,
      })).toBe(tag)
      expect(evaluate(workflow.env.RELEASE_TAG, { 'github.event_name': 'push', 'github.ref_name': tag })).toBe(tag)
    }
  })

  it('retains token permissions and keeps checkout credentials out of persisted Git configuration', () => {
    expect(workflow.permissions).toEqual({ contents: 'write' })
    const checkout = workflow.jobs.build!.steps[0]!
    expect(checkout).toEqual({
      uses: 'actions/checkout@v6',
      with: {
        ref: "${{ env.RELEASE_MODE != 'existing-tag' && 'master' || env.RELEASE_TAG }}",
        'fetch-depth': 0,
        'persist-credentials': false,
      },
    })
    expect(evaluate(String(checkout.with!.ref), { 'env.RELEASE_MODE': 'first-publication', 'env.RELEASE_TAG': 'yourbuddy-v0.4.9' })).toBe('master')
    expect(evaluate(String(checkout.with!.ref), { 'env.RELEASE_MODE': 'existing-tag', 'env.RELEASE_TAG': 'yourbuddy-v0.4.9' })).toBe('yourbuddy-v0.4.9')
    expect(workflow.env.GH_TOKEN).toBeUndefined()
    expect(JSON.stringify(workflow)).not.toMatch(/gh auth setup-git|git config.*(?:credential|extraheader)|--force|workflow run/)
  })

  it('checks old tags without requiring the new helper to exist in their source tree', () => {
    const step = workflow.jobs.build!.steps.find(candidate => candidate.name === 'Refuse an existing Release for tag retry')!
    const program = step.run!.split("<<'NODE'\n")[1]!.replace(/\nNODE\s*$/, '')
    expect(program).not.toContain('first-publication.mjs')
    const fixture = mkdtempSync(join(tmpdir(), 'yourbuddy-old-tag-'))
    try {
      writeFileSync(join(fixture, 'README.md'), 'Legacy unpublished tag fixture; no release helper.\n')
      const gitEnv = {
        ...process.env,
        GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      }
      for (const args of [
        ['init'], ['add', 'README.md'], ['commit', '-m', 'legacy fixture'],
        ['tag', 'yourbuddy-v0.4.8'], ['checkout', '--detach', 'yourbuddy-v0.4.8'],
      ]) {
        const git = spawnSync('git', args, { cwd: fixture, env: gitEnv, encoding: 'utf8', timeout: 5000 })
        expect(git.status, git.stderr).toBe(0)
      }
      for (const status of [404, 200, 401, 403, 500, 'network']) {
        const mock = status === 'network'
          ? 'globalThis.fetch = async () => { throw new Error("offline") };'
          : `globalThis.fetch = async () => ({ status: ${status} });`
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', `${mock}\n${program}`], {
          cwd: fixture,
          env: { ...process.env, GH_TOKEN: 'synthetic-token', GITHUB_REPOSITORY: 'istarwyh/yourbuddy', RELEASE_TAG: 'yourbuddy-v0.4.8' },
          encoding: 'utf8', timeout: 5000,
        })
        expect(result.error).toBeUndefined()
        expect(result.status).toBe(status === 404 ? 0 : 1)
        expect(`${result.stdout}${result.stderr}`).not.toContain('synthetic-token')
      }
    }
    finally { rmSync(fixture, { recursive: true, force: true }) }
  })

  it('candidate validation runs all build gates but never the tag, public Release, or updater feed writers', () => {
    const steps = workflow.jobs.build!.steps
    const context = { 'env.RELEASE_MODE': 'candidate-validation' }
    const enabled = steps.filter(step => !step.if || evaluate(step.if, context) === 'true')
    expect(enabled.some(step => step.name === 'Verify the candidate without publishing')).toBe(true)
    expect(enabled.some(step => step.name === 'Publish the verified master tag atomically')).toBe(false)
    expect(enabled.some(step => step.name === 'Publish release')).toBe(false)
    expect(enabled.map(step => step.run).join('\n')).not.toMatch(/gh release (?:create|upload)|first-publication\.mjs publish/)
    expect(enabled.find(step => step.name === 'Upload validation candidate artifacts')).toMatchObject({
      uses: 'actions/upload-artifact@v4',
      with: { path: 'release-assets/', 'if-no-files-found': 'error', 'retention-days': 7 },
    })
  })

  it.each([false, true])('reads the workflow verifier without changing tagged source (autocrlf=%s)', (autocrlf) => {
    const fixture = mkdtempSync(join(tmpdir(), 'yourbuddy-verifier-source-'))
    try {
      const repo = join(fixture, 'repo')
      const path = 'apps/desktop-tauri/scripts/smoke-offline-startup-macos.mjs'
      mkdirSync(join(repo, 'apps/desktop-tauri/scripts'), { recursive: true })
      const env = {
        ...process.env,
        GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      }
      const git = (...args: string[]): string => {
        const result = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8' })
        expect(result.error).toBeUndefined()
        expect(result.status, result.stderr).toBe(0)
        return result.stdout.trim()
      }
      git('init')
      git('config', 'core.autocrlf', String(autocrlf))
      writeFileSync(join(repo, path), 'console.log("tag verifier")\n')
      git('add', '.')
      git('commit', '-m', 'tagged source')
      const taggedSha = git('rev-parse', 'HEAD')
      writeFileSync(join(repo, path), 'console.log("workflow verifier")\n')
      git('commit', '-am', 'updated verifier')
      const workflowSha = git('rev-parse', 'HEAD')
      git('checkout', '--detach', taggedSha)
      const taggedSource = readFileSync(join(repo, path))
      expect(taggedSource.toString('utf8')).toBe(`console.log("tag verifier")${autocrlf ? '\r\n' : '\n'}`)
      const extracted = join(fixture, 'yourbuddy-native-smoke.mjs')
      writeFileSync(extracted, git('show', `${workflowSha}:${path}`))
      const result = spawnSync(process.execPath, [extracted], { encoding: 'utf8' })
      expect(result.error).toBeUndefined()
      expect(result.status).toBe(0)
      expect(result.stdout.trim()).toBe('workflow verifier')
      expect(git('rev-parse', 'HEAD')).toBe(taggedSha)
      expect(readFileSync(join(repo, path))).toEqual(taggedSource)
      expect(git('status', '--porcelain')).toBe('')
    }
    finally { rmSync(fixture, { recursive: true, force: true }) }
  })

  it('requires native acceptance for every release tag and both dispatch modes', () => {
    const steps = workflow.jobs.build!.steps
    const smoke = steps.find(step => step.name === 'Verify native Offline installation and cold starts')!
    const evidence = steps.find(step => step.name === 'Upload native acceptance evidence')!
    for (const mode of ['candidate-validation', 'first-publication', 'existing-tag']) {
      for (const tag of ['yourbuddy-v0.4.8', 'yourbuddy-v0.4.9', 'yourbuddy-v0.4.10', 'yourbuddy-v0.4.11', 'yourbuddy-v0.4.12', 'yourbuddy-v0.5.0']) {
        const context = { 'env.RELEASE_MODE': mode, 'env.RELEASE_TAG': tag }
        expect(evaluate(smoke.if, context)).toBe('true')
        expect(evaluate(evidence.if, context)).toBe('true')
      }
    }
    const publish = steps.find(step => step.name === 'Publish release')!
    // Actions adds success() unless a step condition explicitly names a status function.
    expect(publish.if).not.toMatch(/always\(|failure\(|cancelled\(/)
    expect(smoke['continue-on-error']).toBeUndefined()
    expect(steps.indexOf(smoke)).toBeLessThan(steps.indexOf(publish))
  })

  it('keeps prepared product checks and evidence in every release route before publication', () => {
    const steps = workflow.jobs.build!.steps
    const verification = steps.find(step => step.name === 'Verify prepared default workbench and optional Harbor')!
    const evidence = steps.find(step => step.name === 'Upload prepared acceptance evidence')!
    for (const mode of ['candidate-validation', 'first-publication', 'existing-tag']) {
      for (const tag of ['yourbuddy-v0.4.8', 'yourbuddy-v0.4.9', 'yourbuddy-v0.4.10', 'yourbuddy-v0.4.11', 'yourbuddy-v0.4.12', 'yourbuddy-v0.5.0']) {
        const context = { 'env.RELEASE_MODE': mode, 'env.RELEASE_TAG': tag }
        expect(evaluate(verification.if, context)).toBe('true')
        expect(evaluate(evidence.if, context)).toBe('true')
      }
    }
    const programs = [
      verification,
      steps.find(step => step.name === 'Remove Python bytecode excluded from component archives')!,
      steps.find(step => step.name === 'Record installer archive sizes')!,
    ]
    for (const step of programs) {
      const program = step.run!.split("<<'NODE'\n")[1]!.replace(/\nNODE\s*$/, '')
      const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
        input: program, encoding: 'utf8', timeout: 5_000,
      })
      expect(result.error).toBeUndefined()
      expect(result.signal).toBeNull()
      expect(result.status, result.stderr).toBe(0)
    }
  })

  // This macOS workflow execution fixture uses POSIX command stubs; structural gates remain cross-platform.
  it.skipIf(process.platform === 'win32').each([false, true])('uses the workflow prepared verifier beside tagged helpers and removes it after failure=%s', (fail) => {
    const step = workflow.jobs.build!.steps.find(candidate => candidate.name === 'Verify prepared default workbench and optional Harbor')!
    const program = step.run!.split("<<'NODE'\n")[1]!.replace(/\nNODE\s*$/, '')
    const fixture = mkdtempSync(join(tmpdir(), 'yourbuddy-prepared-runner-'))
    try {
      const scripts = join(fixture, 'apps/desktop-tauri/scripts')
      const runner = join(fixture, 'runner')
      const bin = join(fixture, 'bin')
      mkdirSync(scripts, { recursive: true })
      mkdirSync(runner)
      mkdirSync(bin)
      mkdirSync(join(fixture, 'isolation'))
      mkdirSync(join(fixture, 'apps/desktop-tauri/bundled/harness/.yourbuddy-pnpm-store'), { recursive: true })
      for (const command of ['tar', 'pnpm']) {
        const path = join(bin, command)
        writeFileSync(path, '#!/bin/sh\nexit 0\n')
        chmodSync(path, 0o755)
      }
      writeFileSync(join(scripts, 'prepare-release.mjs'), `
        export const isolatedReleaseEnvironment = () => ({ root: './isolation', env: process.env, discard() {} })
        export const withProcessEnvironment = (_env, operation) => operation()
        export const renderReleaseDesktopOverlay = () => 'tagged-overlay'
      `)
      writeFileSync(join(scripts, 'prepare-harness-offline-store.mjs'), 'export const frozenOfflineInstallArgs = () => []; export const pinPnpmInvocationArgs = args => args')
      writeFileSync(join(scripts, 'prepare-capability-components.mjs'), 'export const readPreparedCapabilities = () => []')
      writeFileSync(join(scripts, 'smoke-offline-startup-macos.mjs'), 'export const redactEvidence = text => text')
      writeFileSync(join(scripts, 'fixture.mjs'), 'export const marker = "tagged helper"')
      const path = 'apps/desktop-tauri/scripts/verify-product-release.mjs'
      writeFileSync(join(fixture, path), 'throw new Error("tag verifier must not run")')
      const env = {
        ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: runner,
        RELEASE_TAG: 'yourbuddy-v0.4.9',
        GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      }
      const git = (...args: string[]): string => {
        const result = spawnSync('git', args, { cwd: fixture, env, encoding: 'utf8' })
        expect(result.error).toBeUndefined()
        expect(result.status, result.stderr).toBe(0)
        return result.stdout.trim()
      }
      git('init')
      git('add', '.')
      git('commit', '-m', 'tagged product')
      const taggedSha = git('rev-parse', 'HEAD')
      writeFileSync(join(fixture, path), `
        import { marker } from './fixture.mjs'
        export async function verifyPreparedProduct() {
          if (marker !== 'tagged helper') throw new Error('wrong sibling helper')
          console.log('workflow verifier with ' + marker)
          ${fail ? "throw new Error('preview is still Loading')" : ''}
        }
      `)
      git('commit', '-am', 'workflow acceptance')
      const workflowSha = git('rev-parse', 'HEAD')
      git('checkout', '--detach', taggedSha)
      const taggedSource = readFileSync(join(fixture, path))
      const result = spawnSync(process.execPath, ['--input-type=module'], {
        cwd: fixture, env: { ...env, GITHUB_WORKFLOW_SHA: workflowSha }, input: program, encoding: 'utf8', timeout: 10_000,
      })
      expect(result.error).toBeUndefined()
      expect(result.status, result.stderr).toBe(fail ? 1 : 0)
      expect(result.stdout).toContain('workflow verifier with tagged helper')
      const evidence = JSON.parse(readFileSync(join(runner, 'yourbuddy-prepared-acceptance/result.json'), 'utf8')) as { status: string; sourceCommit: string; workflowCommit: string; error?: string }
      expect(evidence).toMatchObject({ status: fail ? 'failed' : 'passed', sourceCommit: taggedSha, workflowCommit: workflowSha })
      if (fail) expect(evidence.error).toContain('preview is still Loading')
      expect(readdirSync(scripts).some(name => name.startsWith('.yourbuddy-prepared-verifier-'))).toBe(false)
      expect(readFileSync(join(fixture, path))).toEqual(taggedSource)
      expect(git('rev-parse', 'HEAD')).toBe(taggedSha)
    } finally { rmSync(fixture, { recursive: true, force: true }) }
  })

  it('removes acceptance bytecode before component IDs are calculated without following runtime symlinks', () => {
    const step = workflow.jobs.build!.steps.find(candidate => candidate.name === 'Remove Python bytecode excluded from component archives')!
    const program = step.run!.split("<<'NODE'\n")[1]!.replace(/\nNODE\s*$/, '')
    const fixture = mkdtempSync(join(tmpdir(), 'yourbuddy-release-bytecode-'))
    try {
      const runtime = join(fixture, 'apps/desktop-tauri/bundled/yourbuddy-runtime')
      const harbor = join(runtime, 'venv/lib/python3.12/site-packages/harbor')
      const standardLibrary = join(runtime, 'python/lib/python3.12')
      const outside = join(fixture, 'outside')
      mkdirSync(join(harbor, '__pycache__'), { recursive: true })
      mkdirSync(join(standardLibrary, '__pycache__'), { recursive: true })
      mkdirSync(outside)
      writeFileSync(join(harbor, '__pycache__/module.cpython-312.pyc'), 'acceptance cache')
      writeFileSync(join(harbor, 'legacy.pyc'), 'legacy bytecode')
      writeFileSync(join(standardLibrary, '__pycache__/module.cpython-312.pyc'), 'prepared cache')
      writeFileSync(join(harbor, 'source.py'), 'print("source")\n')
      writeFileSync(join(outside, 'external.pyc'), 'external bytecode')
      symlinkSync(outside, join(runtime, 'external'), 'junction')
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
        cwd: fixture, encoding: 'utf8', timeout: 5_000,
      })
      expect(result.error).toBeUndefined()
      expect(result.signal).toBeNull()
      expect(result.status, result.stderr).toBe(0)
      expect(existsSync(join(harbor, '__pycache__'))).toBe(false)
      expect(existsSync(join(harbor, 'legacy.pyc'))).toBe(false)
      expect(existsSync(join(standardLibrary, '__pycache__'))).toBe(false)
      expect(readFileSync(join(harbor, 'source.py'), 'utf8')).toBe('print("source")\n')
      expect(readFileSync(join(outside, 'external.pyc'), 'utf8')).toBe('external bytecode')
    }
    finally { rmSync(fixture, { recursive: true, force: true }) }
  })

  it('records the actual installer files without treating their sizes as transfer counters', () => {
    const step = workflow.jobs.build!.steps.find(candidate => candidate.name === 'Record installer archive sizes')!
    const program = step.run!.split("<<'NODE'\n")[1]!.replace(/\nNODE\s*$/, '')
    const fixture = mkdtempSync(join(tmpdir(), 'yourbuddy-release-sizes-'))
    try {
      const runner = join(fixture, 'runner')
      const bootstrap = join(runner, 'bootstrap-bundle/dmg')
      const offline = join(fixture, 'apps/desktop-tauri/src-tauri/target/aarch64-apple-darwin/release/bundle/macos')
      mkdirSync(bootstrap, { recursive: true })
      mkdirSync(offline, { recursive: true })
      mkdirSync(join(runner, 'yourbuddy-prepared-acceptance'))
      writeFileSync(join(bootstrap, 'YourBuddy.dmg'), 'bootstrap')
      writeFileSync(join(offline, 'YourBuddy.app.tar.gz'), 'offline archive')
      writeFileSync(join(offline, 'YourBuddy.app.tar.gz.sig'), 'signature')
      writeFileSync(join(offline, 'unrelated.txt'), 'excluded')
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
        cwd: fixture,
        env: { ...process.env, RUNNER_TEMP: runner, RUST_TARGET: 'aarch64-apple-darwin', RELEASE_TAG: 'yourbuddy-v0.4.9' },
        encoding: 'utf8', timeout: 5_000,
      })
      expect(result.error).toBeUndefined()
      expect(result.signal).toBeNull()
      expect(result.status, result.stderr).toBe(0)
      const measured: unknown = JSON.parse(readFileSync(join(runner, 'yourbuddy-prepared-acceptance/installer-sizes.json'), 'utf8'))
      expect(measured).toEqual({
        releaseTag: 'yourbuddy-v0.4.9',
        scope: 'Installer and updater archive bytes; not measured network traffic or installed size.',
        bootstrap: [{ name: 'YourBuddy.dmg', bytes: 9 }],
        offline: [{ name: 'YourBuddy.app.tar.gz', bytes: 15 }, { name: 'YourBuddy.app.tar.gz.sig', bytes: 9 }],
      })
    }
    finally { rmSync(fixture, { recursive: true, force: true }) }
  })

  it('runs every existing artifact gate in the dispatch after guarded tag publication', () => {
    assertPublicationGates(workflow)
  })

  it('rejects skipped checks, omitted typechecking, and artifact publication detached from the same job', () => {
    const build = workflow.jobs.build!
    for (const changedSteps of [
      build.steps.map(step => step.name === 'Build Harness' ? { ...step, if: "env.RELEASE_MODE != 'first-publication'" } : step),
      build.steps.map(step => step.name === 'Verify native Offline installation and cold starts' ? { ...step, if: "env.RELEASE_TAG == 'yourbuddy-v0.4.11'" } : step),
      build.steps.map(step => step.name === 'Upload prepared acceptance evidence' ? { ...step, if: 'success()' } : step),
      build.steps.filter(step => step.name !== 'Check types before candidate validation or publication'),
      build.steps.filter(step => step.name !== 'Publish release'),
      build.steps.filter(step => step.name !== 'Verify prepared default workbench and optional Harbor'),
      build.steps.filter(step => step.name !== 'Remove Python bytecode excluded from component archives'),
      build.steps.map(step => step.name === 'Verify prepared default workbench and optional Harbor' ? { ...step, if: "env.RELEASE_MODE != 'existing-tag'" } : step),
      build.steps.map(step => step.name === 'Verify prepared default workbench and optional Harbor' ? { ...step, run: step.run!.replace('await verifyPreparedProduct(', 'await skippedProductCheck(') } : step),
      build.steps.map(step => step.name === 'Publish the verified master tag atomically' ? { ...step, 'continue-on-error': true } : step),
    ]) {
      expect(() => { assertPublicationGates({ ...workflow, jobs: { build: { ...build, steps: changedSteps } } }) }).toThrow()
    }
  })
})
