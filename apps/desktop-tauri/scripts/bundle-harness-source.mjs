/**
 * Bundle a trimmed harness monorepo slice for the Tauri installer.
 *
 * Ships source + pre-built lib/dist artifacts, never node_modules. The
 * committed product lockfile is verified before an offline pnpm store is
 * attached by prepare-harness-offline-store.mjs.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  assertRecordedDshRelease,
  readDshUpstreamRecord,
  readDshUpdatePolicy,
} from './dsh-release-policy.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(desktopRoot, '..', '..')
const outRoot = join(desktopRoot, 'bundled', 'harness')
const productLockPath = join(desktopRoot, 'product', 'harness-pnpm-lock.yaml')
const defaultHarnessPlugins = [
  {
    name: '@deepseek-ai/dsh-subagent-codex',
    root: join(repoRoot, 'packages', 'subagent', 'subagent-codex'),
  },
]
const defaultAgentPreset = {
  id: 'codex',
  name: 'Codex',
  source: 'standard',
  description: 'YourBuddy 默认编码 Agent，具备标准模式的全部能力，并可直接委派任务给 Codex。',
  order: 0,
}
const creatorAgentPreset = {
  id: 'creator',
  name: '内容创作',
  source: 'codex',
  description: '面向本地视频与图文创作，包含完整工具、Skills、Codex 委派和内容工作台能力。',
  order: 1,
}
const productAgentPresetPatches = [defaultAgentPreset, creatorAgentPreset]
  .map(preset => `./presets/${preset.id}.patch.yml`)
const creatorPersona = 'You are a creator workbench agent powered by the {{model}} model. Help the user plan, produce, package, and publish local video and article content while keeping human review at recording, editing, subtitle, and final publication checkpoints.'
const productPlugins = [
  {
    name: 'dsh-harbor-evolution',
    root: join(desktopRoot, 'product', 'harbor-evolution'),
    destination: join('packages', 'product', 'harbor-evolution'),
  },
  {
    name: 'dsh-codex-auth',
    root: join(desktopRoot, 'product', 'dsh-codex-auth'),
    destination: join('packages', 'product', 'dsh-codex-auth'),
  },
  {
    name: 'dsh-better-sidebar',
    root: join(desktopRoot, 'product', 'dsh-better-sidebar'),
    destination: join('packages', 'product', 'dsh-better-sidebar'),
  },
  {
    name: 'dsh-context-doctor',
    root: join(desktopRoot, 'product', 'context-doctor'),
    destination: join('packages', 'product', 'context-doctor'),
  },
  {
    name: 'dsh-plugin-marketplace',
    root: join(desktopRoot, 'product', 'plugin-marketplace'),
    destination: join('packages', 'product', 'plugin-marketplace'),
  },
  {
    name: 'dsh-personal-workbench',
    root: join(desktopRoot, 'product', 'personal-workbench'),
    destination: join('packages', 'product', 'personal-workbench'),
  },
  {
    name: 'dsh-oil-creator',
    root: join(desktopRoot, 'product', 'oil-creator'),
    destination: join('packages', 'product', 'oil-creator'),
  },
]

const skipDirNames = new Set([
  'node_modules', '.git', '.turbo', 'coverage', 'release', '.stage', '.cache',
  'tests', 'test', '__tests__', 'dist-test',
])

const trimmedPackages = [
  'vendor/*',
  'packages/*/*',
  'native/system',
  'native/system/packages/*',
  'apps/cli',
  'apps/web',
]

const skipPackageGroups = new Set(['examples', 'test-support'])

const skipFileSuffixes = ['.spec.ts', '.e2e.ts', '.snapshot.ts']

/**
 * Derive the bundled pnpm-workspace.yaml from the repository's own file,
 * replacing the `packages:` membership and allowing patches whose only
 * consumers were omitted development packages. Every source section —
 * `patchedDependencies`, the dependency-build policy, overrides — is copied
 * verbatim so a stale hardcoded copy can never disagree with the source tree
 * the bundle ships.
 *
 * @param {string} sourceYaml
 * @returns {string}
 */
export function buildTrimmedWorkspaceYaml(sourceYaml) {
  const lines = sourceYaml.split(/\r?\n/)
  const packagesIndex = lines.findIndex(line => /^packages:\s*$/.test(line))
  if (packagesIndex === -1) {
    throw new Error('pnpm-workspace.yaml has no packages: block to trim')
  }
  let end = packagesIndex + 1
  while (end < lines.length && (lines[end].trim() === '' || /^[ \t]/.test(lines[end]))) {
    end += 1
  }
  const trimmedBlock = [
    'packages:',
    ...trimmedPackages.map(name => `  - ${name}`),
    '',
    'allowUnusedPatches: true',
    '',
  ]
  return [...lines.slice(0, packagesIndex), ...trimmedBlock, ...lines.slice(end)].join('\n')
}

/** @param {string} sourceRoot @param {string} source */
function shouldCopyEntry(sourceRoot, source) {
  const rel = relative(sourceRoot, source)
  if (rel === '') return true
  const parts = rel.split(sep)
  if (parts.some(part => skipDirNames.has(part))) return false
  const base = parts[parts.length - 1]
  if (skipFileSuffixes.some(suffix => base.endsWith(suffix))) return false
  if (base.startsWith('README') && parts.length > 2) return false
  return true
}

/** @param {string} sourceRoot @param {string} current @param {import('node:crypto').Hash} hasher @param {string} relPrefix */
function hashSourceWalk(sourceRoot, current, hasher, relPrefix) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, entry.name)
    if (!shouldCopyEntry(sourceRoot, path)) continue
    if (entry.isDirectory()) {
      const dirRel = relPrefix ? `${relPrefix}/${entry.name}`.replaceAll('\\', '/') : entry.name.replaceAll('\\', '/')
      hashSourceWalk(sourceRoot, path, hasher, dirRel)
      continue
    }
    if (!entry.isFile()) continue
    const rel = relPrefix ? `${relPrefix}/${entry.name}`.replaceAll('\\', '/') : entry.name.replaceAll('\\', '/')
    hasher.update(rel)
    if (entry.name === 'package.json') {
      const pkg = JSON.parse(readFileSync(path, 'utf8'))
      delete pkg.devDependencies
      hasher.update(JSON.stringify(pkg, null, 2))
    }
    else {
      hasher.update(readFileSync(path))
    }
  }
}

/** Hash the same source slices we copy into the installer bundle. */
function hashBundledContent(trimmedWorkspace, bundlePkg, productLock, dshUpstream) {
  const hasher = createHash('sha256')

  for (const name of ['package.json', 'pnpm-workspace.yaml']) {
    const path = join(repoRoot, name)
    if (!existsSync(path)) continue
    hasher.update(name)
    if (name === 'package.json') {
      hasher.update(JSON.stringify(bundlePkg, null, 2))
    }
    else {
      hasher.update(readFileSync(path))
    }
  }
  hasher.update('pnpm-lock.yaml')
  hasher.update(productLock)
  hasher.update('DSH_UPSTREAM.json')
  hasher.update(JSON.stringify(dshUpstream))
  hasher.update('YourBuddy')
  hasher.update(readFileSync(join(desktopRoot, 'app-icon.svg')))

  for (const rel of ['patches', 'vendor', join('native', 'system'), join('apps', 'cli'), join('apps', 'web')]) {
    const path = join(repoRoot, rel)
    if (existsSync(path)) {
      hashSourceWalk(path, path, hasher, rel.replaceAll('\\', '/'))
    }
  }

  const packagesRoot = join(repoRoot, 'packages')
  for (const group of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!group.isDirectory() || skipPackageGroups.has(group.name)) continue
    const groupPath = join(packagesRoot, group.name)
    for (const pkg of readdirSync(groupPath, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue
      const rel = `packages/${group.name}/${pkg.name}`
      hashSourceWalk(join(groupPath, pkg.name), join(groupPath, pkg.name), hasher, rel)
    }
  }

  for (const plugin of productPlugins) {
    hashSourceWalk(plugin.root, plugin.root, hasher, plugin.destination)
    hasher.update(plugin.name)
    hasher.update('workspace:*')
  }
  for (const plugin of defaultHarnessPlugins) {
    hasher.update(plugin.name)
    hasher.update('workspace:*')
  }
  hasher.update(JSON.stringify(defaultAgentPreset))
  hasher.update(JSON.stringify(creatorAgentPreset))

  hasher.update(trimmedWorkspace)
  return hasher.digest('hex')
}

/** Hash an external plugin snapshot without its YourBuddy source record sidecar. */
export function hashExternalSnapshot(root) {
  const hasher = createHash('sha256')

  /** @param {string} current @param {string} prefix */
  const walk = (current, prefix) => {
    const entries = readdirSync(current, { withFileTypes: true })
      .sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)))
    for (const entry of entries) {
      if (prefix === '' && entry.name === 'YOURBUDDY_UPSTREAM.json') continue
      const path = join(current, entry.name)
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isSymbolicLink()) {
        throw new Error(`external plugin snapshot must not contain symlinks: ${rel}`)
      }
      if (entry.isDirectory()) {
        walk(path, rel)
        continue
      }
      if (!entry.isFile()) continue
      const mode = (statSync(path).mode & 0o111) === 0 ? 0o644 : 0o755
      hasher.update(`${rel}\0${mode.toString(8)}\0`)
      hasher.update(readFileSync(path))
      hasher.update('\0')
    }
  }

  walk(root, '')
  return hasher.digest('hex')
}

/** Verify the committed package still matches its reviewed external snapshot. */
export function verifyExternalSnapshot(root, manifest) {
  const sourceRecordPath = join(root, 'YOURBUDDY_UPSTREAM.json')
  if (!existsSync(sourceRecordPath)) return
  const sourceRecord = JSON.parse(readFileSync(sourceRecordPath, 'utf8'))
  if (sourceRecord.package !== manifest.name || sourceRecord.version !== manifest.version) {
    throw new Error(
      `YourBuddy product source record mismatch for ${manifest.name}@${manifest.version}`,
    )
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(sourceRecord.integrity ?? '')) {
    throw new Error(`YourBuddy product integrity is invalid: ${manifest.name}`)
  }
  const actual = hashExternalSnapshot(root)
  if (actual !== sourceRecord.treeSha256) {
    throw new Error(
      `YourBuddy product snapshot hash mismatch for ${manifest.name}: expected ${sourceRecord.treeSha256}, found ${actual}`,
    )
  }
}

/** Names available from the copied monorepo rather than the external registry. */
function bundledWorkspacePackageNames(bundleRoot) {
  const manifests = [
    join(bundleRoot, 'apps', 'cli', 'package.json'),
    join(bundleRoot, 'apps', 'web', 'package.json'),
    join(bundleRoot, 'native', 'system', 'package.json'),
  ]

  for (const parent of [
    join(bundleRoot, 'vendor'),
    join(bundleRoot, 'native', 'system', 'packages'),
  ]) {
    if (!existsSync(parent)) continue
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory()) manifests.push(join(parent, entry.name, 'package.json'))
    }
  }

  const packagesRoot = join(bundleRoot, 'packages')
  if (existsSync(packagesRoot)) {
    for (const group of readdirSync(packagesRoot, { withFileTypes: true })) {
      if (!group.isDirectory()) continue
      const groupRoot = join(packagesRoot, group.name)
      for (const entry of readdirSync(groupRoot, { withFileTypes: true })) {
        if (entry.isDirectory()) manifests.push(join(groupRoot, entry.name, 'package.json'))
      }
    }
  }

  const names = new Set()
  for (const manifestPath of manifests) {
    if (!existsSync(manifestPath)) continue
    const name = JSON.parse(readFileSync(manifestPath, 'utf8')).name
    if (typeof name === 'string' && name !== '') names.add(name)
  }
  return names
}

/** Install YourBuddy's product plugins and default Harness plugins into the CLI closure. */
export function installProductPlugins(bundleRoot) {
  const cliManifestPath = join(bundleRoot, 'apps', 'cli', 'package.json')
  const cliManifest = JSON.parse(readFileSync(cliManifestPath, 'utf8'))
  const installedPlugins = []

  for (const plugin of productPlugins) {
    const productManifest = join(plugin.root, 'package.json')
    if (!existsSync(productManifest)) {
      throw new Error(`YourBuddy product plugin missing: ${productManifest}`)
    }
    const manifest = JSON.parse(readFileSync(productManifest, 'utf8'))
    if (manifest.name !== plugin.name) {
      throw new Error(
        `YourBuddy product plugin name mismatch: expected ${plugin.name}, found ${manifest.name ?? '<missing>'}`,
      )
    }
    if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') {
      throw new Error(`YourBuddy product plugin has no DSH bundle patch: ${plugin.name}`)
    }
    verifyExternalSnapshot(plugin.root, manifest)

    const bundledPluginRoot = join(bundleRoot, plugin.destination)
    copyTree(plugin.root, bundledPluginRoot)
    rmSync(join(bundledPluginRoot, 'YOURBUDDY_UPSTREAM.json'), { force: true })
    installedPlugins.push({ manifest, destination: plugin.destination })
    cliManifest.dependencies = {
      ...cliManifest.dependencies,
      [plugin.name]: 'workspace:*',
    }
  }

  const workspaceNames = bundledWorkspacePackageNames(bundleRoot)
  for (const plugin of defaultHarnessPlugins) {
    if (!workspaceNames.has(plugin.name)) {
      throw new Error(`YourBuddy default Harness plugin is missing from the bundled workspace: ${plugin.name}`)
    }
    cliManifest.dependencies[plugin.name] = 'workspace:*'
  }
  for (const plugin of installedPlugins) {
    const bundledManifestPath = join(bundleRoot, plugin.destination, 'package.json')
    const bundledManifest = JSON.parse(readFileSync(bundledManifestPath, 'utf8'))
    for (const peerName of Object.keys(plugin.manifest.peerDependencies ?? {})) {
      if (!workspaceNames.has(peerName)) continue
      cliManifest.dependencies[peerName] = 'workspace:*'
      bundledManifest.peerDependencies[peerName] = 'workspace:*'
    }
    writeFileSync(bundledManifestPath, `${JSON.stringify(bundledManifest, null, 2)}\n`)
  }

  writeFileSync(cliManifestPath, `${JSON.stringify(cliManifest, null, 2)}\n`)

  const webPatchPath = join(bundleRoot, 'packages', 'bundle', 'web-app', 'cordis.patch.yml')
  const webPatch = readFileSync(webPatchPath, 'utf8').trimEnd()
  const marker = '# YourBuddy product bundle layers'
  if (webPatch.includes(marker)) {
    throw new Error('YourBuddy product bundle layers are already installed')
  }
  const productPatches = [...productPlugins, ...defaultHarnessPlugins]
    .map(plugin => readFileSync(join(plugin.root, 'cordis.patch.yml'), 'utf8').trim())
  writeFileSync(webPatchPath, `${webPatch}\n\n${marker}\n\n${productPatches.join('\n\n')}\n`)
}

/** Find one exact YAML line or reject an upstream layout the product generator does not understand. */
function onlyLineIndex(lines, expected, label) {
  const indexes = lines
    .map((line, index) => line === expected ? index : -1)
    .filter(index => index !== -1)
  if (indexes.length !== 1) {
    throw new Error(`YourBuddy Agent Preset expected one ${label}, found ${indexes.length}`)
  }
  return indexes[0]
}

/** Derive one product declaration from the shipped standard preset patch. */
function deriveProductAgentPreset(standardPatch, preset) {
  const lines = standardPatch.split('\n')
  const declarationIndex = onlyLineIndex(lines, '    - id: preset-standard', 'standard declaration row')
  const idIndex = onlyLineIndex(lines, '        id: standard', 'standard preset id')
  const orderIndex = onlyLineIndex(lines, '        order: 1', 'standard preset order')
  lines[declarationIndex] = `    - id: preset-${preset.id}`
  lines[idIndex] = `        id: ${preset.id}`
  lines.splice(
    idIndex + 1,
    0,
    `        name: ${preset.name}`,
    `        description: ${preset.description}`,
  )
  lines[orderIndex + 2] = `        order: ${preset.order}`
  if (lines[0] === '# Agent preset standard: one `@deepseek-ai/dsh-agent-preset` declaration inserted') {
    lines[0] = `# YourBuddy Agent preset ${preset.id}: derived from the shipped standard declaration.`
  }

  const codexRows = lines
    .map((line, index) => line.trim() === '- id: tool-subagent-codex' ? index : -1)
    .filter(index => index !== -1)
  if (codexRows.length !== 1) {
    throw new Error(`YourBuddy Agent Preset expected one Codex tool row, found ${codexRows.length}`)
  }
  const rowStart = codexRows[0]
  const rowIndent = lines[rowStart].length - lines[rowStart].trimStart().length
  const nextRow = lines.findIndex((line, index) => index > rowStart
    && line.length - line.trimStart().length === rowIndent
    && line.trimStart().startsWith('- id: '))
  const rowEnd = nextRow === -1 ? lines.length : nextRow
  const disabledIndexes = lines
    .map((line, index) => index > rowStart && index < rowEnd && line.trim() === 'disabled: true' ? index : -1)
    .filter(index => index !== -1)
  if (disabledIndexes.length !== 1) {
    throw new Error(`YourBuddy Agent Preset expected one disabled Codex tool flag, found ${disabledIndexes.length}`)
  }
  lines.splice(disabledIndexes[0], 1)

  if (preset.id === creatorAgentPreset.id) {
    const codingPersona = 'prefix: You are a coding agent powered by the {{model}} model.'
    const personaIndexes = lines
      .map((line, index) => line.trim() === codingPersona ? index : -1)
      .filter(index => index !== -1)
    if (personaIndexes.length !== 1) {
      throw new Error(`YourBuddy Creator Agent Preset expected one standard coding persona, found ${personaIndexes.length}`)
    }
    const personaIndex = personaIndexes[0]
    const indent = lines[personaIndex].slice(0, lines[personaIndex].length - lines[personaIndex].trimStart().length)
    lines.splice(personaIndex, 1, `${indent}prefix: >-`, `${indent}  ${creatorPersona}`)
  }
  return lines.join('\n')
}

/** Create YourBuddy's declarative Codex and content-creation Agent Presets. */
export function installDefaultAgentPresets(bundleRoot) {
  const webAppRoot = join(bundleRoot, 'packages', 'bundle', 'web-app')
  const standardPatchPath = join(webAppRoot, 'presets', 'standard.patch.yml')
  const webManifestPath = join(webAppRoot, 'package.json')
  const webCordisPatchPath = join(webAppRoot, 'cordis.patch.yml')
  for (const path of [standardPatchPath, webManifestPath, webCordisPatchPath]) {
    if (!existsSync(path)) throw new Error(`YourBuddy Agent Preset source is missing: ${path}`)
  }

  const standardPatch = readFileSync(standardPatchPath, 'utf8')
  const generated = [
    [defaultAgentPreset, deriveProductAgentPreset(standardPatch, defaultAgentPreset)],
    [creatorAgentPreset, deriveProductAgentPreset(standardPatch, creatorAgentPreset)],
  ]
  for (const [preset, content] of generated) {
    const destination = join(webAppRoot, 'presets', `${preset.id}.patch.yml`)
    if (existsSync(destination)) {
      throw new Error(`YourBuddy Agent Preset patch already exists: ${destination}`)
    }
    writeFileSync(destination, content)
  }

  const webManifest = JSON.parse(readFileSync(webManifestPath, 'utf8'))
  if (webManifest.exports?.['./presets/*.patch.yml'] !== './presets/*.patch.yml') {
    throw new Error('YourBuddy Agent Presets require the shipped web-app preset export')
  }
  for (const patch of productAgentPresetPatches) {
    if (Object.hasOwn(webManifest.exports, patch)) {
      throw new Error(`YourBuddy Agent Preset export already exists: ${patch}`)
    }
    webManifest.exports[patch] = patch
  }
  if (!Array.isArray(webManifest.files) || !Array.isArray(webManifest.dsh?.bundle?.patch)) {
    throw new Error('YourBuddy Agent Presets require web-app files and dsh.bundle.patch arrays')
  }
  for (const patch of productAgentPresetPatches) {
    const file = patch.slice(2)
    if (webManifest.files.includes(file) || webManifest.dsh.bundle.patch.includes(patch)) {
      throw new Error(`YourBuddy Agent Preset manifest row already exists: ${patch}`)
    }
    webManifest.files.push(file)
    webManifest.dsh.bundle.patch.push(patch)
  }
  writeFileSync(webManifestPath, `${JSON.stringify(webManifest, null, 2)}\n`)

  const webCordisPatch = readFileSync(webCordisPatchPath, 'utf8')
  const defaultRow = '        default: standard'
  if (webCordisPatch.split(defaultRow).length !== 2) {
    throw new Error('YourBuddy Agent Presets expected one standard registry default')
  }
  writeFileSync(webCordisPatchPath, webCordisPatch.replace(defaultRow, '        default: codex'))
}

/**
 * @param {string} src
 * @param {string} dest
 */
function copyTree(src, dest) {
  if (!existsSync(src)) return
  if (statSync(src).isFile()) {
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
    return
  }
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, {
    recursive: true,
    dereference: true,
    filter: candidate => shouldCopyEntry(src, candidate),
  })
}

/**
 * Apply product-owned web identity after copying the upstream client artifacts.
 * @param {string} root - destination of the trimmed Harness bundle.
 * @returns {void}
 */
export function installProductWebIdentity(root) {
  const web = join(root, 'apps', 'web', 'dist')
  const manifestPath = join(web, 'manifest.webmanifest')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.name = 'YourBuddy'
  manifest.short_name = 'YourBuddy'
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  copyFileSync(join(desktopRoot, 'app-icon.svg'), join(web, 'favicon.svg'))
}

function assertBuiltArtifacts() {
  const cliBin = join(repoRoot, 'apps', 'cli', 'lib', 'bin.js')
  const webIndex = join(repoRoot, 'apps', 'web', 'dist', 'index.html')
  const systemEntry = join(repoRoot, 'native', 'system', 'packages', 'entry', 'lib', 'index.js')
  if (!existsSync(cliBin) || !existsSync(webIndex)) {
    throw new Error(
      'Harness build artifacts missing. From repo root run: pnpm run build',
    )
  }
  if (!existsSync(systemEntry)) {
    throw new Error(
      'node-addon-system entry lib missing. From native/system run: pnpm run build:ts',
    )
  }
  const buildRecordPath = join(repoRoot, '.dsh-build', 'client-build-environment.json')
  if (!existsSync(buildRecordPath)) {
    throw new Error('Harness client build record missing. Run the YourBuddy-branded root build first.')
  }
  const buildRecord = JSON.parse(readFileSync(buildRecordPath, 'utf8'))
  if (buildRecord.environment?.DSH_CLIENT_TITLE !== 'YourBuddy') {
    throw new Error(
      'Harness client artifacts are not branded for YourBuddy. Run: DSH_CLIENT_TITLE="YourBuddy" pnpm run build',
    )
  }
  if (!existsSync(productLockPath)) {
    throw new Error(`YourBuddy frozen Harness lockfile missing: ${productLockPath}`)
  }
}

/** Strip devDependencies so first-run `pnpm install --prod` never resolves demo/test-only workspace refs. */
function stripDevDependencies(root) {
  /** @param {string} dir */
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (skipDirNames.has(entry.name)) continue
        walk(path)
        continue
      }
      if (entry.name !== 'package.json') continue
      if (!existsSync(path)) continue
      const pkg = JSON.parse(readFileSync(path, 'utf8'))
      if (!pkg.devDependencies) continue
      delete pkg.devDependencies
      writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
    }
  }
  walk(root)
}

/** @param {string} dir */
function removeTree(dir) {
  if (!existsSync(dir)) return
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
  } catch (error) {
    if (process.platform === 'win32') {
      execSync(`cmd /c rmdir /s /q "${dir.replaceAll('/', '\\')}"`, { stdio: 'ignore' })
      return
    }
    throw error
  }
}

function main() {
assertBuiltArtifacts()
removeTree(outRoot)
mkdirSync(outRoot, { recursive: true })

for (const name of ['package.json', 'pnpm-workspace.yaml']) {
  copyTree(join(repoRoot, name), join(outRoot, name))
}
copyTree(productLockPath, join(outRoot, 'pnpm-lock.yaml'))

if (existsSync(join(repoRoot, 'patches'))) {
  copyTree(join(repoRoot, 'patches'), join(outRoot, 'patches'))
}

copyTree(join(repoRoot, 'vendor'), join(outRoot, 'vendor'))
copyTree(join(repoRoot, 'native', 'system'), join(outRoot, 'native', 'system'))
copyTree(join(repoRoot, 'apps', 'cli'), join(outRoot, 'apps', 'cli'))
copyTree(join(repoRoot, 'apps', 'web'), join(outRoot, 'apps', 'web'))
installProductWebIdentity(outRoot)

const packagesRoot = join(repoRoot, 'packages')
for (const group of readdirSync(packagesRoot, { withFileTypes: true })) {
  if (!group.isDirectory()) continue
  if (skipPackageGroups.has(group.name)) continue
  const groupPath = join(packagesRoot, group.name)
  for (const pkg of readdirSync(groupPath, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue
    copyTree(join(groupPath, pkg.name), join(outRoot, 'packages', group.name, pkg.name))
  }
}
installProductPlugins(outRoot)
installDefaultAgentPresets(outRoot)

const trimmedWorkspace = buildTrimmedWorkspaceYaml(
  readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8'),
)
writeFileSync(join(outRoot, 'pnpm-workspace.yaml'), trimmedWorkspace)

const rootPkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
const dshPolicy = readDshUpdatePolicy(join(desktopRoot, 'product'))
const dshUpstream = readDshUpstreamRecord(join(desktopRoot, 'product'))
assertRecordedDshRelease({ policy: dshPolicy, upstreamRecord: dshUpstream, currentVersion: rootPkg.version })
const productLock = readFileSync(productLockPath)
const bundlePkg = {
  name: '@deepseek-ai/dsh-desktop-bundle',
  private: true,
  version: rootPkg.version,
  packageManager: rootPkg.packageManager ?? 'pnpm@11.7.0',
}
writeFileSync(join(outRoot, 'package.json'), `${JSON.stringify(bundlePkg, null, 2)}\n`)

stripDevDependencies(outRoot)

const manifest = {
  harnessVersion: rootPkg.version,
  dshUpstream,
  product: 'YourBuddy',
  productPlugins: productPlugins.map(plugin => {
    const pkg = JSON.parse(readFileSync(join(plugin.root, 'package.json'), 'utf8'))
    return `${plugin.name}@${pkg.version}`
  }),
  defaultHarnessPlugins: defaultHarnessPlugins.map(plugin => {
    const pkg = JSON.parse(readFileSync(join(plugin.root, 'package.json'), 'utf8'))
    return `${plugin.name}@${pkg.version}`
  }),
  defaultAgentPreset,
  agentPresets: [defaultAgentPreset, creatorAgentPreset],
  bundledAt: new Date().toISOString(),
  contentSha256: hashBundledContent(trimmedWorkspace, bundlePkg, productLock, dshUpstream),
  method: 'trimmed-monorepo-source-frozen-lock',
}
writeFileSync(join(outRoot, '.bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`bundle-harness-source: wrote ${outRoot}`)
console.log(`bundle-harness-source: sha256=${manifest.contentSha256}`)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  main()
}
