/** Materialize opt-in plugins with ordinary dependencies and installation-owned peers. */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dump, load } from 'js-yaml'
import { verifyExternalSnapshot } from './bundle-harness-source.mjs'
import { pinPnpmInvocationArgs } from './prepare-harness-offline-store.mjs'
import { isBundledRuntimePackage, readWorkspacePackageVersions } from './product-plugin-compatibility.mjs'
import { isolatedReleaseEnvironment } from './prepare-release.mjs'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(desktopRoot, '../..')
const PNPM_VERSION = '11.7.0'

/** Packages whose archive root is installed through the existing Profile link operation. */
export const CAPABILITY_COMPONENTS = Object.freeze([
  { key: 'harborPlugin', sourceDirectory: 'harbor-evolution', packageName: 'dsh-harbor-evolution', purpose: 'Harbor evaluation tools and workbench', requires: ['harbor'] },
])

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function sourceFile(path) {
  return !path.split(sep).some(part => ['node_modules', '.git', 'test', 'tests', '__tests__'].includes(part))
}

/**
 * Read prepared packages required by the signed release catalog.
 * @param {string} outputRoot Prepared capability directory.
 * @returns {object[]} Catalog descriptors with package roots and actual versions.
 */
export function readPreparedCapabilities(outputRoot = join(desktopRoot, 'bundled', 'capabilities')) {
  return CAPABILITY_COMPONENTS.map(definition => {
    const root = join(outputRoot, definition.key)
    const manifest = assertPreparedCapability(root)
    if (manifest.name !== definition.packageName) throw new Error(`capability package mismatch: ${definition.key}`)
    return { ...definition, version: manifest.version, root }
  })
}

/**
 * Require package entry/patch files, materialized ordinary dependencies, and no private runtime peers.
 * @param {string} root Prepared package directory.
 * @returns {object} Prepared package manifest.
 */
export function assertPreparedCapability(root) {
  const manifest = readJson(join(root, 'package.json'))
  for (const file of [manifest.main, manifest.dsh?.bundle?.patch, 'lib/client.js']) {
    if (typeof file !== 'string' || !existsSync(join(root, file))) throw new Error(`capability entry is missing: ${file}`)
  }
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (lstatSync(path).isSymbolicLink()) throw new Error(`capability contains an unmaterialized link: ${path}`)
      if (entry.isDirectory()) walk(path)
      else if (entry.name === 'package.json') {
        const dependency = readJson(path)
        if (path !== join(root, 'package.json') && isBundledRuntimePackage(dependency.name ?? '')) {
          throw new Error(`capability must use the core peer: ${dependency.name}`)
        }
      }
    }
  }
  walk(root)
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (!existsSync(join(root, 'node_modules', name, 'package.json'))) throw new Error(`capability dependency is missing: ${name}`)
  }
  return manifest
}

/**
 * Project the existing frozen lock onto a local capability workspace without resolving registry versions.
 * Package resolutions, integrity records, and snapshots remain exactly those of the core lock.
 * @param {object} lock Parsed frozen Harness lock.
 * @param {string[]} workspacePaths Selected existing workspace importers.
 * @param {string} capabilityPath New capability importer path.
 * @param {object} dependencyLinks Capability's ordinary local dependency links.
 * @returns {object} Lock consumed by pnpm's frozen production install.
 */
export function capabilityLock(lock, workspacePaths, capabilityPath, dependencyLinks) {
  const projected = structuredClone(lock)
  projected.settings.autoInstallPeers = false
  projected.importers = { '.': {} }
  for (const path of workspacePaths) {
    if (!Object.hasOwn(lock.importers, path)) throw new Error(`frozen Harness lock is missing workspace: ${path}`)
    projected.importers[path] = structuredClone(lock.importers[path])
  }
  projected.importers[capabilityPath] = {
    dependencies: Object.fromEntries(Object.entries(dependencyLinks).map(([name, link]) => [name, { specifier: link, version: link }])),
  }
  return projected
}

/**
 * Prepare all registered capabilities after bundle:source. The core tree is only read.
 * Uses the reviewed pnpm version, its production dependency selector and frozen install,
 * then dereferences installed ordinary dependencies before publishing each archive input.
 * @param {object} options Prepared Harness, product sources, output and optional pinned pnpm/store paths.
 * @returns {object[]} Prepared capability metadata, including package root and actual version.
 */
export function prepareCapabilityComponents({
  harnessRoot = join(desktopRoot, 'bundled', 'harness'),
  productRoot = join(desktopRoot, 'product'),
  outputRoot = join(desktopRoot, 'bundled', 'capabilities'),
  pnpmPath = join(repositoryRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs'),
  storeRoot,
  offline = false,
} = {}) {
  const coreLock = load(readFileSync(join(harnessRoot, 'pnpm-lock.yaml'), 'utf8'))
  const coreWorkspace = load(readFileSync(join(harnessRoot, 'pnpm-workspace.yaml'), 'utf8'))
  const workspacePackages = readWorkspacePackageVersions(harnessRoot)
  const temporary = mkdtempSync(join(tmpdir(), 'yourbuddy-capabilities-'))
  try {
    const isolated = isolatedReleaseEnvironment(process.env, temporary)
    const env = { ...isolated.env, CI: 'true' }
    const pnpm = (cwd, args) => {
      const result = spawnSync(process.execPath, [pnpmPath, ...pinPnpmInvocationArgs(args)], { cwd, env, encoding: 'utf8' })
      if (result.error) throw result.error
      if (result.status !== 0) throw new Error(`capability pnpm ${args.join(' ')} failed: ${result.stderr || result.stdout}`)
      return result.stdout
    }
    if (pnpm(harnessRoot, ['--version']).trim() !== PNPM_VERSION) throw new Error(`capability preparation requires pnpm ${PNPM_VERSION}`)
    const prepared = []
    for (const definition of CAPABILITY_COMPONENTS) {
      const source = join(productRoot, definition.sourceDirectory)
      const manifest = readJson(join(source, 'package.json'))
      if (manifest.name !== definition.packageName) throw new Error(`capability package mismatch: ${definition.key}`)
      verifyExternalSnapshot(source, manifest)
      const peers = Object.fromEntries(Object.keys(manifest.peerDependencies ?? {}).map(name => {
        const peer = workspacePackages.get(name)
        if (!peer || !isBundledRuntimePackage(name)) throw new Error(`capability core peer is missing: ${name}`)
        return [name, peer.version]
      }))
      const workspace = join(temporary, definition.key)
      const capabilityPath = `packages/capabilities/${definition.key}`
      const capabilitySource = join(workspace, capabilityPath)
      const ordinaryNames = Object.keys(manifest.dependencies ?? {})
      for (const name of ordinaryNames) {
        if (!workspacePackages.has(name)) throw new Error(`capability ordinary dependency needs a frozen workspace input: ${name}`)
      }
      const selected = ordinaryNames.length === 0 ? [] : JSON.parse(pnpm(harnessRoot, [
        ...ordinaryNames.flatMap(name => ['--filter-prod', `${name}...`]), 'list', '--depth', '-1', '--json',
      ]))
      const workspacePaths = selected.map(({ name, path }) => {
        if (isBundledRuntimePackage(name)) throw new Error(`capability ordinary closure must not embed a core peer: ${name}`)
        const rel = relative(harnessRoot, path).replaceAll('\\', '/')
        cpSync(path, join(workspace, rel), { recursive: true, filter: sourceFile })
        return rel
      })
      cpSync(source, capabilitySource, { recursive: true, filter: sourceFile })
      const dependencyLinks = Object.fromEntries(ordinaryNames.map(name => [
        name, `link:${relative(capabilitySource, join(workspace, relative(harnessRoot, workspacePackages.get(name).root))).replaceAll('\\', '/')}`,
      ]))
      const stagedManifest = { ...manifest, dependencies: dependencyLinks }
      delete stagedManifest.devDependencies
      delete stagedManifest.peerDependencies
      delete stagedManifest.peerDependenciesMeta
      writeJson(join(capabilitySource, 'package.json'), stagedManifest)
      writeJson(join(workspace, 'package.json'), { name: 'yourbuddy-capability-build', private: true, packageManager: `pnpm@${PNPM_VERSION}` })
      writeFileSync(join(workspace, 'pnpm-workspace.yaml'), dump({
        ...coreWorkspace, packages: [...workspacePaths, capabilityPath], autoInstallPeers: false,
      }, { lineWidth: -1, noRefs: true }))
      writeFileSync(join(workspace, 'pnpm-lock.yaml'), dump(capabilityLock(coreLock, workspacePaths, capabilityPath, dependencyLinks), { lineWidth: -1, noRefs: true }))
      cpSync(join(harnessRoot, 'patches'), join(workspace, 'patches'), { recursive: true })
      const storeArgs = ['--store-dir', storeRoot ?? join(temporary, 'store'), '--config.enable-global-virtual-store=false']
      pnpm(workspace, [...storeArgs, 'install', '--prod', '--frozen-lockfile', '--trust-lockfile', '--ignore-scripts', ...(offline ? ['--offline'] : [])])
      const packed = join(workspace, 'capability.tgz')
      pnpm(capabilitySource, ['--config.ignore-scripts=true', 'pack', '--out', packed])
      const materialized = join(temporary, `${definition.key}-materialized`)
      mkdirSync(materialized)
      const unpacked = spawnSync('tar', ['-xzf', packed, '--strip-components', '1', '-C', materialized], { env, encoding: 'utf8' })
      if (unpacked.error) throw unpacked.error
      if (unpacked.status !== 0) throw new Error(`capability package extraction failed: ${unpacked.stderr}`)
      // Copy the already frozen installed graph. Legacy deploy performs a second, unfrozen install.
      cpSync(join(capabilitySource, 'node_modules'), join(materialized, 'node_modules'), {
        recursive: true, dereference: true,
        filter: path => !['.pnpm', '.bin', '.modules.yaml', '.pnpm-workspace-state-v1.json'].includes(path.split(sep).at(-1)),
      })
      const outputManifest = { ...manifest, peerDependencies: peers }
      delete outputManifest.devDependencies
      writeJson(join(materialized, 'package.json'), outputManifest)
      assertPreparedCapability(materialized)
      prepared.push({ ...definition, version: manifest.version, root: join(outputRoot, definition.key), materialized })
    }
    mkdirSync(outputRoot, { recursive: true })
    for (const { root, materialized } of prepared) {
      const publication = mkdtempSync(join(outputRoot, '.prepare-'))
      const next = join(publication, 'next')
      const previous = join(publication, 'previous')
      try {
        cpSync(materialized, next, { recursive: true })
        if (existsSync(root)) renameSync(root, previous)
        try { renameSync(next, root) }
        catch (error) {
          if (existsSync(previous)) renameSync(previous, root)
          throw error
        }
      } finally {
        rmSync(publication, { recursive: true, force: true })
      }
    }
    return prepared.map(({ materialized: _materialized, ...entry }) => entry)
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const entry of prepareCapabilityComponents()) console.log(`prepare-capability-components: ${entry.packageName}@${entry.version} -> ${entry.root}`)
}
