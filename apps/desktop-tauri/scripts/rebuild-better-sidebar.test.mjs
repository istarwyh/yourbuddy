import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, symlinkSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  sidebarBuildEnvironment, sidebarFileHashes, stabilizeSidebarCss,
  stageSidebarOwners, verifySidebarRepeatBuild, withSidebarStaging,
} from './rebuild-better-sidebar.mjs'

const posixOnly = { skip: process.platform === 'win32' && 'The fixed-/tmp recipe requires POSIX symlinks' }

function temporaryRoot(t) {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-sidebar-recipe-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return realpathSync(root)
}

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

function owner(repo, path, name) {
  const root = join(repo, path)
  write(join(root, 'package.json'), JSON.stringify({ name, version: '1.0.0', main: 'lib/index.js' }))
  write(join(root, 'lib/index.js'), `export const owner = ${JSON.stringify(name)}\n`)
  write(join(root, 'lib/types/index.d.ts'), 'export declare const owner: string\n')
  return root
}

test('staging refuses unowned paths and holds an exclusive lock until work settles', posixOnly, async (t) => {
  const root = temporaryRoot(t)
  const unowned = join(root, 'unowned')
  write(join(unowned, 'keep'), 'untouched')
  await assert.rejects(withSidebarStaging(unowned, root, async () => assert.fail('must not run')), /Refusing unowned/)
  assert.equal(readFileSync(join(unowned, 'keep'), 'utf8'), 'untouched')
  const alias = join(root, 'alias')
  symlinkSync(unowned, alias, 'dir')
  await assert.rejects(withSidebarStaging(alias, root, async () => assert.fail('must not run')), /Refusing unowned/)

  const staging = join(root, 'staging')
  await withSidebarStaging(staging, root, async () => {
    await assert.rejects(withSidebarStaging(staging, root, async () => assert.fail('must not run')), { code: 'EEXIST' })
    assert.equal(existsSync(join(staging, '.build-lock')), true)
  })
  assert.equal(existsSync(join(staging, '.build-lock')), false)
  await assert.rejects(withSidebarStaging(staging, root, async () => { throw new Error('build failed') }), /build failed/)
  assert.equal(existsSync(join(staging, '.build-lock')), false)
  await withSidebarStaging(staging, root, async () => {})
})

test('owner staging copies only inline runtime files and preserves declaration identity', posixOnly, async (t) => {
  const root = temporaryRoot(t)
  const repo = join(root, 'repo')
  write(join(repo, 'LICENSE'), 'MIT\n')
  const brand = owner(repo, 'packages/util/brand', '@deepseek-ai/dsh-brand')
  const session = owner(repo, 'packages/core/session', '@deepseek-ai/dsh-session')
  const cordis = owner(repo, 'vendor/cordis', '@deepseek-ai/cordis')
  owner(repo, 'packages/other/ignored', 'unrelated-package')
  const snapshot = join(repo, 'apps/desktop-tauri/product/dsh-better-sidebar/lib/index.js')
  write(snapshot, 'existing product snapshot\n')
  const before = sidebarFileHashes(repo)
  const staging = join(root, 'staging')
  await withSidebarStaging(staging, repo, async () => {
    const owners = stageSidebarOwners(repo, staging)
    assert.equal(owners.length, 3)
    for (const [name, source] of [['@deepseek-ai/dsh-brand', brand], ['@deepseek-ai/dsh-session', session]]) {
      const staged = join(staging, 'node_modules', name)
      assert.equal(lstatSync(join(staged, 'lib/index.js')).isSymbolicLink(), false)
      assert.deepEqual(readFileSync(join(staged, 'lib/index.js')), readFileSync(join(source, 'lib/index.js')))
      assert.equal(lstatSync(join(staged, 'lib/types/index.d.ts')).isSymbolicLink(), true)
      assert.equal(realpathSync(join(staged, 'lib/types/index.d.ts')), realpathSync(join(source, 'lib/types/index.d.ts')))
      const entry = owners.find(candidate => candidate.name === name)
      assert.equal(entry.mode, 'inline-runtime')
      assert.equal(entry.files.find(file => file.path === 'lib/index.js').mode, 'copy')
      const declaration = entry.files.find(file => file.path === 'lib/types/index.d.ts')
      assert.equal(declaration.mode, 'link')
      assert.equal(declaration.sha256, createHash('sha256').update(readFileSync(join(source, 'lib/types/index.d.ts'))).digest('hex'))
    }
    assert.equal(realpathSync(join(staging, 'node_modules/@deepseek-ai/cordis')), cordis)
    assert.equal(owners.find(entry => entry.name === '@deepseek-ai/cordis').mode, 'link')
  })
  assert.deepEqual(sidebarFileHashes(repo), before)

  const declaration = join(brand, 'lib/types/index.d.ts')
  rmSync(declaration)
  symlinkSync(join(session, 'lib/types/index.d.ts'), declaration, 'file')
  await withSidebarStaging(join(root, 'escaped'), repo, async () => {
    assert.throws(() => stageSidebarOwners(repo, join(root, 'escaped')), /Declaration is outside its workspace owner/)
  })
})

test('repeat verification compares complete output trees and rejects changed inputs or maps', (t) => {
  const root = temporaryRoot(t)
  const inputs = () => ({ lock: 'original', source: 'current owner source' })
  let builds = 0
  const build = () => {
    rmSync(join(root, 'lib'), { recursive: true, force: true })
    write(join(root, 'lib/index.js'), 'export const value = 1\n')
    write(join(root, 'lib/index.js.map'), '{"version":3}\n')
    builds += 1
  }
  const output = verifySidebarRepeatBuild(root, build, inputs)
  assert.equal(builds, 2)
  assert.deepEqual(Object.keys(output), ['index.js', 'index.js.map'])
  assert.deepEqual(JSON.parse(readFileSync(join(root, '.build-evidence/build-1.json'), 'utf8')), output)
  assert.deepEqual(JSON.parse(readFileSync(join(root, '.build-evidence/build-2.json'), 'utf8')), output)

  assert.throws(() => verifySidebarRepeatBuild(root, () => {
    build()
    write(join(root, 'lib/index.js.map'), `{"build":${builds}}\n`)
  }, inputs), /Sidebar clean builds differ/)
  let changingInput = 0
  assert.throws(() => verifySidebarRepeatBuild(root, build, () => ({ revision: changingInput++ })), /inputs changed during build 1/)
})

test('the configuration edit only sorts CSS exports and subprocesses preserve proxy routing', () => {
  const before = 'const classMap = {};\nfor (const [local, exp] of Object.entries(cssExports ?? {})) classMap[local] = exp.name\ninjectTag(pluginId, fileId, code.toString())\n'
  assert.equal(stabilizeSidebarCss(before), before.replace('Object.entries(cssExports ?? {})', 'Object.entries(cssExports ?? {}).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)'))
  assert.throws(() => stabilizeSidebarCss('changed upstream config'), /Expected one upstream CSS export-map loop/)
  assert.throws(() => stabilizeSidebarCss(before + before), /Expected one upstream CSS export-map loop/)
  const env = sidebarBuildEnvironment({ NODE_USE_ENV_PROXY: '1', HTTPS_PROXY: 'http://localhost:8080', NODE_ENV: 'development', API_KEY: 'private', NPM_TOKEN: 'private', PASSWORD: 'private', NPM_CONFIG_REGISTRY: 'https://example.invalid', NPM_CONFIG_USERCONFIG: '/private/config', NPM_CONFIG_GLOBALCONFIG: '/private/global-config', NPM_CONFIG_STORE_DIR: '/different/store' })
  assert.equal(env.NODE_USE_ENV_PROXY, '1')
  assert.equal(env.HTTPS_PROXY, 'http://localhost:8080')
  assert.equal(env.NODE_ENV, undefined)
  assert.equal(env.COREPACK_NPM_REGISTRY, 'https://registry.npmjs.org')
  for (const name of ['API_KEY', 'NPM_TOKEN', 'PASSWORD', 'NPM_CONFIG_REGISTRY', 'NPM_CONFIG_USERCONFIG', 'NPM_CONFIG_GLOBALCONFIG', 'NPM_CONFIG_STORE_DIR']) assert.equal(env[name], undefined)
})
