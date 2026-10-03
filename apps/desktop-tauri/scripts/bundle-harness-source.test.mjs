import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { buildTrimmedWorkspaceYaml, stripUnbundledWorkspaceDependencies } from './bundle-harness-source.mjs'

import {
  buildTrimmedWorkspaceYaml,
  hashExternalSnapshot,
  installDefaultAgentPresets,
  installProductPlugins,
  installProductWebIdentity,
  verifyExternalSnapshot,
} from './bundle-harness-source.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

test('product web identity replaces upstream branding and preserves manifest behavior', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-web-identity-'))
  try {
    assert.throws(() => installProductWebIdentity(root), /ENOENT/)
    const web = join(root, 'apps', 'web', 'dist')
    mkdirSync(web, { recursive: true })
    const upstream = { name: 'DeepSeek Harness', short_name: 'DSH', start_url: '/', display: 'fullscreen' }
    writeFileSync(join(web, 'manifest.webmanifest'), JSON.stringify(upstream))
    installProductWebIdentity(root)
    assert.deepEqual(JSON.parse(readFileSync(join(web, 'manifest.webmanifest'), 'utf8')), {
      ...upstream, name: 'YourBuddy', short_name: 'YourBuddy',
    })
    assert.equal(readFileSync(join(web, 'favicon.svg'), 'utf8'), readFileSync(join(desktopRoot, 'app-icon.svg'), 'utf8'))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

function productVersion(directory) {
  return JSON.parse(readFileSync(join(desktopRoot, 'product', directory, 'package.json'), 'utf8')).version
}

test('Ego Browser keeps headed macOS launches on the native desktop', () => {
  const root = join(desktopRoot, 'product', 'ego-browser')
  const plugin = readFileSync(join(root, 'lib', 'index.js'), 'utf8')
  const chrome = readFileSync(join(root, 'runtime', 'ego-linux', 'src', 'chrome.mjs'), 'utf8')
  const cli = readFileSync(join(root, 'runtime', 'ego-linux', 'bin', 'ego-browser.mjs'), 'utf8')
  const sdk = readFileSync(join(root, 'runtime', 'ego-browser', 'dist', 'out', 'index.js'))

  assert.match(plugin, /\/Applications\/Google Chrome\.app\/Contents\/MacOS\/Google Chrome/u)
  assert.match(plugin, /platform === "win32" \|\| platform === "darwin"/u)
  assert.match(chrome, /process\.platform === "win32" \|\| process\.platform === "darwin"/u)
  assert.match(chrome, /plan && process\.platform !== "darwin"/u)
  assert.match(cli, /process\.platform === "darwin"/u)
  assert.equal(createHash('sha256').update(sdk).digest('hex'), '2d11d9110828253f7dec63ba58d60b4e6dcbb5a6caa3c0650562f305fe640751')
})

test('Better Sidebar bundled client calls the bundled clsx function', () => {
  const client = readFileSync(join(desktopRoot, 'product', 'dsh-better-sidebar', 'lib', 'client.js'), 'utf8')

  assert.doesNotMatch(client, /\(0, clsx\.clsx\)\(/u)
})

test('buildTrimmedWorkspaceYaml keeps upstream patch declarations verbatim', () => {
  const source = `packages:
  - vendor/*
  - packages/*/*
  - apps/*
  - examples
  - python/sdk-runtime

linkWorkspacePackages: true

overrides:
  '@deepseek-ai/cosmokit': 'link:vendor/cosmokit'

patchedDependencies:
  node-pty@1.2.0-beta.15: patches/node-pty@1.2.0-beta.15.patch
`
  const trimmed = buildTrimmedWorkspaceYaml(source)

  assert.match(trimmed, /^packages:\n(?:  - .*\n)+/)
  for (const name of ['vendor/*', 'packages/*/*', 'native/system', 'native/system/packages/*', 'apps/cli', 'apps/web']) {
    assert.ok(trimmed.includes(`  - ${name}\n`), `trimmed packages must include ${name}`)
  }
  assert.ok(!trimmed.includes('apps/*'))
  assert.ok(!trimmed.includes('native/landlock-run'))
  assert.ok(!trimmed.includes('examples'))

  assert.ok(
    trimmed.includes('  node-pty@1.2.0-beta.15: patches/node-pty@1.2.0-beta.15.patch\n'),
    'patchedDependencies must be copied from the source workspace, not hardcoded',
  )
  assert.ok(trimmed.includes('allowUnusedPatches: true\n'))
  assert.ok(trimmed.includes('linkWorkspacePackages: true\n'))
  assert.ok(trimmed.includes('allowUnusedPatches: true\n'))
})

test('buildTrimmedWorkspaceYaml preserves comments after the packages block', () => {
  const source = `# workspace header
packages:
  - apps/*

# Why linkWorkspacePackages is on.
linkWorkspacePackages: true
`
  const trimmed = buildTrimmedWorkspaceYaml(source)

  assert.ok(trimmed.startsWith('# workspace header\n'))
  assert.ok(trimmed.includes('# Why linkWorkspacePackages is on.\n'))
})

test('buildTrimmedWorkspaceYaml rejects a workspace without a packages block', () => {
  assert.throws(() => buildTrimmedWorkspaceYaml('linkWorkspacePackages: true\n'), /packages/)
})

test('stripUnbundledWorkspaceDependencies drops only workspace refs to absent packages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-bundle-strip-'))
  try {
    const presentDir = join(root, 'packages', 'core', 'present')
    const consumerDir = join(root, 'packages', 'core', 'consumer')
    const cliDir = join(root, 'apps', 'cli')
    await mkdir(presentDir, { recursive: true })
    await mkdir(consumerDir, { recursive: true })
    await mkdir(cliDir, { recursive: true })
    await writeFile(
      join(presentDir, 'package.json'),
      `${JSON.stringify({ name: '@deepseek-ai/dsh-present' }, null, 2)}\n`,
    )
    const consumerPath = join(consumerDir, 'package.json')
    await writeFile(
      consumerPath,
      `${JSON.stringify({
        name: '@deepseek-ai/dsh-consumer',
        dependencies: {
          '@deepseek-ai/dsh-present': 'workspace:*',
          '@deepseek-ai/dsh-experimental-missing': 'workspace:*',
          'regular-dep': '^1.0.0',
        },
        optionalDependencies: { '@deepseek-ai/dsh-experimental-optional-missing': 'workspace:*' },
        peerDependencies: { '@deepseek-ai/dsh-experimental-peer-missing': 'workspace:*' },
      }, null, 2)}\n`,
    )
    await writeFile(
      join(cliDir, 'package.json'),
      `${JSON.stringify({ name: '@deepseek-ai/dsh-cli', dependencies: { '@deepseek-ai/dsh-present': 'workspace:*' } }, null, 2)}\n`,
    )

    stripUnbundledWorkspaceDependencies(root)

    const stripped = JSON.parse(await readFile(consumerPath, 'utf8'))
    assert.deepEqual(stripped.dependencies, {
      '@deepseek-ai/dsh-present': 'workspace:*',
      'regular-dep': '^1.0.0',
    })
    assert.equal(stripped.optionalDependencies, undefined)
    assert.equal(stripped.peerDependencies, undefined)
    const cli = JSON.parse(await readFile(join(cliDir, 'package.json'), 'utf8'))
    assert.deepEqual(cli.dependencies, { '@deepseek-ai/dsh-present': 'workspace:*' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
