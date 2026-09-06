import assert from 'node:assert/strict'
import test from 'node:test'

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildTrimmedWorkspaceYaml,
  hashExternalSnapshot,
  installDefaultAgentPreset,
  installProductPlugins,
  installProductWebIdentity,
} from './bundle-harness-source.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

test('product web identity replaces upstream branding and preserves manifest behavior', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourharness-web-identity-'))
  try {
    assert.throws(() => installProductWebIdentity(root), /ENOENT/)
    const web = join(root, 'apps', 'web', 'dist')
    mkdirSync(web, { recursive: true })
    const upstream = { name: 'DeepSeek Harness', short_name: 'DSH', start_url: '/', display: 'fullscreen' }
    writeFileSync(join(web, 'manifest.webmanifest'), JSON.stringify(upstream))
    installProductWebIdentity(root)
    assert.deepEqual(JSON.parse(readFileSync(join(web, 'manifest.webmanifest'), 'utf8')), {
      ...upstream, name: 'YourHarness', short_name: 'YourHarness',
    })
    assert.equal(readFileSync(join(web, 'favicon.svg'), 'utf8'), readFileSync(join(desktopRoot, 'app-icon.svg'), 'utf8'))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

function productVersion(directory) {
  return JSON.parse(readFileSync(join(desktopRoot, 'product', directory, 'package.json'), 'utf8')).version
}

test('buildTrimmedWorkspaceYaml keeps upstream patch and build declarations verbatim', () => {
  const source = `packages:
  - vendor/*
  - packages/*/*
  - apps/*
  - examples
  - python/sdk-runtime

linkWorkspacePackages: true

overrides:
  '@deepseek-ai/cosmokit': 'link:vendor/cosmokit'

allowBuilds:
  esbuild: true
  node-pty: true

patchedDependencies:
  node-pty@1.2.0-beta.15: patches/node-pty@1.2.0-beta.15.patch
`
  const trimmed = buildTrimmedWorkspaceYaml(source)

  assert.match(trimmed, /^packages:\n(?:  - .*\n)+/)
  for (const name of ['vendor/*', 'packages/*/*', 'native/landlock-run', 'apps/cli', 'apps/web']) {
    assert.ok(trimmed.includes(`  - ${name}\n`), `trimmed packages must include ${name}`)
  }
  assert.ok(!trimmed.includes('apps/*'))
  assert.ok(!trimmed.includes('examples'))

  assert.ok(
    trimmed.includes('  node-pty@1.2.0-beta.15: patches/node-pty@1.2.0-beta.15.patch\n'),
    'patchedDependencies must be copied from the source workspace, not hardcoded',
  )
  assert.ok(trimmed.includes('allowBuilds:\n  esbuild: true\n  node-pty: true\n'))
  assert.ok(trimmed.includes('linkWorkspacePackages: true\n'))
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

test('hashExternalSnapshot ignores only the YourHarness provenance sidecar', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourharness-external-plugin-'))
  try {
    writeFileSync(join(root, 'package.json'), '{"name":"example"}\n')
    const before = hashExternalSnapshot(root)
    writeFileSync(join(root, 'YOURHARNESS_UPSTREAM.json'), '{"treeSha256":"recorded"}\n')
    assert.equal(hashExternalSnapshot(root), before)
    writeFileSync(join(root, 'package.json'), '{"name":"changed"}\n')
    assert.notEqual(hashExternalSnapshot(root), before)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('installDefaultAgentPreset creates the Codex preset without changing standard', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourharness-codex-preset-'))
  const standard = join(root, 'apps', 'cli', 'config', 'agent-presets', 'standard')
  mkdirSync(standard, { recursive: true })
  const source = `- id: delegation
  name: cordis:group
  config:
    # Production dsh keeps optional providers disabled.
    - id: tool-subagent-codex
      name: '@deepseek-ai/dsh-tool-subagent'
      disabled: true
      config:
        provider: codex
        toolName: subagent_codex
        backgroundMode: one-shot
        maxDepth: provider-managed
    - id: tool-subagent-claude-code
      name: '@deepseek-ai/dsh-tool-subagent'
      disabled: true
`
  writeFileSync(join(standard, 'agent.cordis.yml'), source)
  writeFileSync(join(standard, 'preset.yml'), 'name: 标准模式\norder: 1\n')

  try {
    installDefaultAgentPreset(root)
    const codexRoot = join(root, 'apps', 'cli', 'config', 'agent-presets', 'codex')
    const composition = readFileSync(join(codexRoot, 'agent.cordis.yml'), 'utf8')
    const codexRow = composition.slice(
      composition.indexOf('    - id: tool-subagent-codex'),
      composition.indexOf('    - id: tool-subagent-claude-code'),
    )
    assert.match(codexRow, /toolName: subagent_codex/)
    assert.doesNotMatch(codexRow, /disabled:/)
    assert.match(composition, /tool-subagent-claude-code[\s\S]*disabled: true/)
    assert.equal(
      readFileSync(join(codexRoot, 'preset.yml'), 'utf8'),
      'name: Codex\ndescription: YourHarness 默认编码 Agent，具备标准模式的全部能力，并可直接委派任务给 Codex。\norder: 0\n',
    )
    assert.equal(readFileSync(join(standard, 'agent.cordis.yml'), 'utf8'), source)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('installProductPlugins makes every YourHarness plugin an in-box CLI dependency', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourharness-product-plugin-'))
  const cli = join(root, 'apps', 'cli')
  mkdirSync(cli, { recursive: true })
  writeFileSync(join(cli, 'package.json'), '{"dependencies":{"kept":"1.0.0"}}\n')
  const agent = join(root, 'packages', 'core', 'agent')
  mkdirSync(agent, { recursive: true })
  writeFileSync(join(agent, 'package.json'), '{"name":"@deepseek-ai/dsh-agent","version":"0.1.1-rc.1"}\n')
  const codexSubagent = join(root, 'packages', 'subagent', 'subagent-codex')
  mkdirSync(codexSubagent, { recursive: true })
  writeFileSync(join(codexSubagent, 'package.json'), '{"name":"@deepseek-ai/dsh-subagent-codex","version":"0.1.1-rc.1"}\n')

  try {
    installProductPlugins(root)
    const manifest = JSON.parse(readFileSync(join(cli, 'package.json'), 'utf8'))
    assert.equal(manifest.dependencies.kept, '1.0.0')
    assert.equal(manifest.dependencies['dsh-harbor-evolution'], 'workspace:*')
    assert.equal(manifest.dependencies['dsh-codex-auth'], 'workspace:*')
    assert.equal(manifest.dependencies['dsh-better-sidebar'], 'workspace:*')
    assert.equal(manifest.dependencies['dsh-context-doctor'], 'workspace:*')
    assert.equal(manifest.dependencies['dsh-plugin-marketplace'], 'workspace:*')
    assert.equal(manifest.dependencies['dsh-personal-workbench'], 'workspace:*')
    assert.equal(manifest.dependencies['@deepseek-ai/dsh-subagent-codex'], 'workspace:*')
    assert.equal(manifest.dependencies['@deepseek-ai/dsh-agent'], 'workspace:*')
    assert.ok(readFileSync(join(root, 'packages', 'product', 'harbor-evolution', 'skills', 'evolve-agent-with-harbor', 'SKILL.md'), 'utf8').length > 0)
    assert.equal(
      JSON.parse(readFileSync(join(root, 'packages', 'product', 'harbor-evolution', 'schemas', 'meta-evaluation-report.schema.json'), 'utf8')).title,
      'Evaluator Meta-Evaluation Report v1',
    )
    for (const [source, destination] of [
      ['harbor-evolution', 'harbor-evolution'],
      ['dsh-codex-auth', 'dsh-codex-auth'],
      ['dsh-better-sidebar', 'dsh-better-sidebar'],
      ['context-doctor', 'context-doctor'],
      ['plugin-marketplace', 'plugin-marketplace'],
      ['personal-workbench', 'personal-workbench'],
    ]) {
      assert.equal(
        JSON.parse(readFileSync(join(root, 'packages', 'product', destination, 'package.json'), 'utf8')).version,
        productVersion(source),
      )
    }
    assert.ok(readFileSync(join(root, 'packages', 'product', 'dsh-codex-auth', 'lib', 'client.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'dsh-better-sidebar', 'lib', 'client.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'context-doctor', 'lib', 'client.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'context-doctor', 'lib', 'index.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'plugin-marketplace', 'client.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'plugin-marketplace', 'index.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'personal-workbench', 'lib', 'client.js'), 'utf8').length > 0)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})
