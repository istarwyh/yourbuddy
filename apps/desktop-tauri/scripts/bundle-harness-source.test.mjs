import assert from 'node:assert/strict'
import test from 'node:test'

import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'js-yaml'

import {
  buildTrimmedWorkspaceYaml,
  hashExternalSnapshot,
  installDefaultAgentPresets,
  installProductPlugins,
  installProductWebIdentity,
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
  assert.ok(!trimmed.includes('examples'))

  assert.ok(
    trimmed.includes('  node-pty@1.2.0-beta.15: patches/node-pty@1.2.0-beta.15.patch\n'),
    'patchedDependencies must be copied from the source workspace, not hardcoded',
  )
  assert.ok(trimmed.includes('allowUnusedPatches: true\n'))
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

test('hashExternalSnapshot ignores only the YourBuddy source record sidecar', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-external-plugin-'))
  try {
    writeFileSync(join(root, 'package.json'), '{"name":"example"}\n')
    const before = hashExternalSnapshot(root)
    writeFileSync(join(root, 'YOURBUDDY_UPSTREAM.json'), '{"treeSha256":"recorded"}\n')
    assert.equal(hashExternalSnapshot(root), before)
    chmodSync(join(root, 'package.json'), 0o640)
    assert.equal(hashExternalSnapshot(root), before)
    chmodSync(join(root, 'package.json'), 0o750)
    assert.notEqual(hashExternalSnapshot(root), before)
    chmodSync(join(root, 'package.json'), 0o640)
    writeFileSync(join(root, 'package.json'), '{"name":"changed"}\n')
    assert.notEqual(hashExternalSnapshot(root), before)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('hashExternalSnapshot uses bytewise path order across locales', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-snapshot-order-'))
  try {
    for (const name of ['A.txt', '_meta', 'a-file', 'a_file', 'ä.txt']) {
      writeFileSync(join(root, name), `${name}\n`)
      chmodSync(join(root, name), 0o640)
    }
    assert.equal(hashExternalSnapshot(root), 'c87853d767d9d2b1ba229fdfe8a59cacea4bf6d7c2df71df62b42b4e39cc841e')
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('installDefaultAgentPresets declares product presets from the standard profile patch', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-codex-preset-'))
  const webAppRoot = join(root, 'packages', 'bundle', 'web-app')
  const presetsRoot = join(webAppRoot, 'presets')
  mkdirSync(presetsRoot, { recursive: true })
  const source = `# Agent preset standard: one \`@deepseek-ai/dsh-agent-preset\` declaration inserted
# after the web patch.
- insert:
    - id: preset-standard
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: standard
        order: 1
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: You are a coding agent powered by the {{model}} model.
          - id: delegation
            name: cordis:group
            group: true
            config:
              - id: tool-subagent-codex
                name: '@deepseek-ai/dsh-tool-subagent'
                disabled: true
                config:
                  provider: codex
                  toolName: subagent_codex
              - id: tool-subagent-claude-code
                name: '@deepseek-ai/dsh-tool-subagent'
                disabled: true
`
  writeFileSync(join(presetsRoot, 'standard.patch.yml'), source)
  writeFileSync(join(webAppRoot, 'cordis.patch.yml'), `- insert:
    - id: agent-preset-registry
      name: '@deepseek-ai/dsh-agent-preset-registry'
      config:
        default: standard
`)
  writeFileSync(join(webAppRoot, 'package.json'), `${JSON.stringify({
    name: '@deepseek-ai/dsh-web-app',
    exports: {
      './cordis.patch.yml': './cordis.patch.yml',
      './presets/*.patch.yml': './presets/*.patch.yml',
      './package.json': './package.json',
    },
    files: ['cordis.patch.yml', 'presets/standard.patch.yml'],
    dsh: { bundle: { patch: ['./cordis.patch.yml', './presets/standard.patch.yml'] } },
  }, null, 2)}\n`)

  try {
    installDefaultAgentPresets(root)
    const standard = load(source)[0].insert[0].config
    const codexPath = join(presetsRoot, 'codex.patch.yml')
    const creatorPath = join(presetsRoot, 'creator.patch.yml')
    const codex = load(readFileSync(codexPath, 'utf8'))[0].insert[0]
    const creator = load(readFileSync(creatorPath, 'utf8'))[0].insert[0]
    assert.deepEqual({
      id: codex.id,
      name: codex.config.name,
      description: codex.config.description,
      order: codex.config.order,
    }, {
      id: 'preset-codex',
      name: 'Codex',
      description: 'YourBuddy 默认编码 Agent，具备标准模式的全部能力，并可直接委派任务给 Codex。',
      order: 0,
    })
    const expectedCodexPlugins = structuredClone(standard.plugins)
    delete expectedCodexPlugins[1].config[0].disabled
    assert.deepEqual(codex.config.plugins, expectedCodexPlugins)
    assert.equal(codex.config.id, 'codex')
    assert.equal(codex.config.plugins[1].config[1].disabled, true)

    const expectedCreatorPlugins = structuredClone(expectedCodexPlugins)
    expectedCreatorPlugins[0].config.prefix = 'You are a creator workbench agent powered by the {{model}} model. Help the user plan, produce, package, and publish local video and article content while keeping human review at recording, editing, subtitle, and final publication checkpoints.'
    assert.deepEqual(creator.config.plugins, expectedCreatorPlugins)
    assert.deepEqual({
      id: creator.id,
      preset: creator.config.id,
      name: creator.config.name,
      description: creator.config.description,
      order: creator.config.order,
    }, {
      id: 'preset-creator',
      preset: 'creator',
      name: '内容创作',
      description: '面向本地视频与图文创作，包含完整工具、Skills、Codex 委派和内容工作台能力。',
      order: 1,
    })

    const manifest = JSON.parse(readFileSync(join(webAppRoot, 'package.json'), 'utf8'))
    for (const patch of ['./presets/codex.patch.yml', './presets/creator.patch.yml']) {
      assert.equal(manifest.exports[patch], patch)
      assert.ok(manifest.files.includes(patch.slice(2)))
      assert.ok(manifest.dsh.bundle.patch.includes(patch))
    }
    assert.match(readFileSync(join(webAppRoot, 'cordis.patch.yml'), 'utf8'), /default: codex/)
    assert.equal(readFileSync(join(presetsRoot, 'standard.patch.yml'), 'utf8'), source)
    assert.equal(existsSync(join(root, 'packages', 'preset', 'agent-presets')), false)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('installProductPlugins makes every YourBuddy plugin an in-box CLI dependency', () => {
  const root = mkdtempSync(join(tmpdir(), 'yourbuddy-product-plugin-'))
  const cli = join(root, 'apps', 'cli')
  mkdirSync(cli, { recursive: true })
  writeFileSync(join(cli, 'package.json'), '{"dependencies":{"kept":"1.0.0"}}\n')
  const agent = join(root, 'packages', 'core', 'agent')
  mkdirSync(agent, { recursive: true })
  writeFileSync(join(agent, 'package.json'), '{"name":"@deepseek-ai/dsh-agent","version":"0.1.1-rc.1"}\n')
  const codexSubagent = join(root, 'packages', 'subagent', 'subagent-codex')
  mkdirSync(codexSubagent, { recursive: true })
  writeFileSync(join(codexSubagent, 'package.json'), '{"name":"@deepseek-ai/dsh-subagent-codex","version":"0.1.1-rc.1"}\n')
  const webApp = join(root, 'packages', 'bundle', 'web-app')
  mkdirSync(webApp, { recursive: true })
  writeFileSync(join(webApp, 'cordis.patch.yml'), '- insert:\n    - id: built-in\n      name: built-in\n')

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
    assert.equal(manifest.dependencies['dsh-oil-creator'], 'workspace:*')
    assert.equal(manifest.dependencies['@deepseek-ai/dsh-subagent-codex'], 'workspace:*')
    assert.equal(manifest.dependencies['@deepseek-ai/dsh-agent'], 'workspace:*')
    const webPatch = readFileSync(join(webApp, 'cordis.patch.yml'), 'utf8')
    assert.match(webPatch, /# YourBuddy product bundle layers/u)
    assert.match(webPatch, /id: personal-workbench\n\s+name: dsh-personal-workbench/u)
    assert.match(webPatch, /id: dsh-oil-creator\n\s+name: dsh-oil-creator/u)
    assert.match(webPatch, /id: subagent-codex\n\s+name: '@deepseek-ai\/dsh-subagent-codex'/u)
    assert.doesNotMatch(webPatch, /id: ui-sidebar\n\s+disabled: true/u)
    const bundledCodex = JSON.parse(readFileSync(
      join(root, 'packages', 'product', 'dsh-codex-auth', 'package.json'),
      'utf8',
    ))
    assert.equal(bundledCodex.peerDependencies['@deepseek-ai/dsh-agent'], 'workspace:*')
    assert.equal(
      existsSync(join(root, 'packages', 'product', 'dsh-codex-auth', 'YOURBUDDY_UPSTREAM.json')),
      false,
    )
    const sourceCodex = JSON.parse(readFileSync(
      join(desktopRoot, 'product', 'dsh-codex-auth', 'package.json'),
      'utf8',
    ))
    assert.notEqual(sourceCodex.peerDependencies['@deepseek-ai/dsh-agent'], 'workspace:*')
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
      ['oil-creator', 'oil-creator'],
    ]) {
      assert.equal(
        JSON.parse(readFileSync(join(root, 'packages', 'product', destination, 'package.json'), 'utf8')).version,
        productVersion(source),
      )
    }
    assert.ok(readFileSync(join(root, 'packages', 'product', 'dsh-codex-auth', 'lib', 'client.js'), 'utf8').length > 0)
    const bundledSidebar = join(root, 'packages', 'product', 'dsh-better-sidebar')
    for (const bundle of ['client.js', 'client-registry.js']) {
      const source = readFileSync(join(bundledSidebar, 'lib', bundle), 'utf8')
      assert.match(source, /yourbuddy\.desktop\.external-link/u)
      assert.match(source, /window\.parent\.postMessage/u)
    }
    const sidebarSourceRecord = JSON.parse(readFileSync(join(
      desktopRoot,
      'product',
      'dsh-better-sidebar',
      'YOURBUDDY_UPSTREAM.json',
    ), 'utf8'))
    assert.ok(sidebarSourceRecord.patches.some(
      patch => patch.id === 'yourbuddy-workbench' && /^[a-f0-9]{64}$/u.test(patch.sha256),
    ))
    assert.equal(existsSync(join(bundledSidebar, 'YOURBUDDY_UPSTREAM.json')), false)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'context-doctor', 'lib', 'client.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'context-doctor', 'lib', 'index.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'plugin-marketplace', 'client.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'plugin-marketplace', 'index.js'), 'utf8').length > 0)
    assert.ok(readFileSync(join(root, 'packages', 'product', 'personal-workbench', 'lib', 'client.js'), 'utf8').length > 0)
    const bundledOilCreator = join(root, 'packages', 'product', 'oil-creator')
    assert.ok(readFileSync(join(bundledOilCreator, 'lib', 'client.js'), 'utf8').length > 0)
    const oilCreatorHost = readFileSync(join(bundledOilCreator, 'lib', 'index.js'), 'utf8')
    assert.match(oilCreatorHost, /name: "oil_prepare_publish"/u)
    for (const skill of ['video-publisher', 'oil-video-article', 'wechat-publisher']) {
      assert.ok(readFileSync(join(bundledOilCreator, 'skills', skill, 'SKILL.md'), 'utf8').length > 0)
    }
    assert.ok(readFileSync(join(bundledOilCreator, 'skills', 'video-publisher', 'scripts', 'v2', 'publisher.mjs'), 'utf8').length > 0)
    assert.ok(readFileSync(join(bundledOilCreator, 'skills', 'video-publisher', 'scripts', 'lib', 'config.mjs'), 'utf8').length > 0)
    assert.ok(readFileSync(join(bundledOilCreator, 'skills', 'video-publisher', 'scripts', 'v2', 'lib', 'model.mjs'), 'utf8').length > 0)
    assert.ok(readFileSync(join(bundledOilCreator, 'skills', 'wechat-publisher', 'wechat-publisher.mjs'), 'utf8').length > 0)
    const oilCreator = JSON.parse(readFileSync(join(bundledOilCreator, 'package.json'), 'utf8'))
    assert.equal(oilCreator.scripts.prepare, undefined)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
})
