/** Report the prepared YourBuddy package closure and measured release-archive sizes without changing either. */

import { createHash } from 'node:crypto'
import { createReadStream, globSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import * as yaml from 'js-yaml'
import { activeBarePluginPackages, isAgentPresetEntry, isCordisGroupEntry, loadCordisYaml, presetDefinitions } from './cordis-yaml.ts'
import { runtimeDependencyNames, selectRuntimePackageClosure } from './runtime-package-closure.ts'

const LABEL = 'yourbuddy component inventory'
const SECTIONS = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const

/** Read-only inputs for an inventory of a prepared, release-owned Harness. */
export interface YourBuddyInventoryOptions {
  /** Directory produced by bundle-harness-source, containing .bundle-manifest.json. */
  readonly harnessRoot: string
  /** Package roots to inspect; defaults to the prepared apps/cli package. */
  readonly roots?: readonly string[]
  /** Target platform for literal Cordis process.platform conditions. */
  readonly platform: 'darwin' | 'linux' | 'win32'
  /** Optional release-owned component manifest; archives are measured beside it. */
  readonly componentsManifest?: string
}

interface StagedPackage {
  readonly name: string
  readonly version: string
  readonly path: string
  readonly manifest: Readonly<Record<string, unknown>>
}

function record(value: unknown, subject: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${LABEL}: ${subject} must be an object`)
  }
  return value as Record<string, unknown>
}

function json(path: string): Record<string, unknown> {
  return record(JSON.parse(readFileSync(path, 'utf8')), path)
}

function text(value: unknown, subject: string): string {
  if (typeof value !== 'string' || value === '') throw new Error(`${LABEL}: ${subject} must be a nonempty string`)
  return value
}

function strings(value: unknown, subject: string): string[] {
  if (!Array.isArray(value) || value.some(entry => typeof entry !== 'string')) {
    throw new Error(`${LABEL}: ${subject} must be a string array`)
  }
  return value as string[]
}

function portable(path: string): string {
  return path.split(sep).join('/')
}

function readPackages(root: string): Map<string, StagedPackage> {
  const workspace = record(yaml.load(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8')), 'workspace')
  const patterns = strings(workspace.packages, 'workspace.packages').map(pattern => `${pattern}/package.json`)
  const paths = [...globSync(patterns, { cwd: root })].map(portable).sort()
  if (paths.length === 0) throw new Error(`${LABEL}: prepared workspace contains no package manifests`)
  const packages = new Map<string, StagedPackage>()
  for (const path of paths) {
    const manifest = json(join(root, path))
    const name = text(manifest.name, `${path} name`)
    if (packages.has(name)) throw new Error(`${LABEL}: duplicate prepared package ${name}`)
    packages.set(name, { name, version: text(manifest.version, `${path} version`), path: portable(dirname(path)), manifest })
  }
  return packages
}

function packageEdges(pkg: StagedPackage, available: ReadonlyMap<string, StagedPackage>) {
  return SECTIONS.flatMap(section => runtimeDependencyNames(pkg.manifest, section, LABEL).map(name => ({
    name,
    section,
    specifier: text(record(pkg.manifest[section], `${pkg.name} ${section}`)[name], `${pkg.name} dependency ${name}`),
    staged: available.has(name),
  })))
}

function clientInjections(pkg: StagedPackage): string[] {
  if (pkg.manifest.dsh === undefined) return []
  const dsh = record(pkg.manifest.dsh, `${pkg.name} dsh`)
  if (dsh.client === undefined) return []
  const client = record(dsh.client, `${pkg.name} dsh.client`)
  return client.inject === undefined ? [] : strings(client.inject, `${pkg.name} dsh.client.inject`).toSorted()
}

function bundlePaths(pkg: StagedPackage): string[] {
  if (pkg.manifest.dsh === undefined) return []
  const dsh = record(pkg.manifest.dsh, `${pkg.name} dsh`)
  if (dsh.bundle === undefined) return []
  const bundle = record(dsh.bundle, `${pkg.name} dsh.bundle`)
  return typeof bundle.patch === 'string' ? [bundle.patch] : strings(bundle.patch, `${pkg.name} dsh.bundle.patch`)
}

/** Preserve disabled ancestors while adapting patch insertions and presets to the shared group scanner. */
function patchEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(patchEntries)
  if (typeof value !== 'object' || value === null) return []
  const row = value as Record<string, unknown>
  // Loader insertion operations consume only id/insert; their other fields do not disable entries.
  if (row.insert !== undefined) return patchEntries(row.insert)
  const children = [
    ...(isCordisGroupEntry(row) ? patchEntries(row.config) : []),
    ...(isAgentPresetEntry(row) ? patchEntries(row.config.plugins) : []),
  ]
  return [{ ...row, group: true, config: children }]
}

function patchReferences(root: string, pkg: StagedPackage, platform: string) {
  return bundlePaths(pkg).map((path) => {
    const relativePath = portable(join(pkg.path, path))
    const document = loadCordisYaml(readFileSync(join(root, relativePath), 'utf8'))
    if (!Array.isArray(document)) throw new Error(`${LABEL}: ${relativePath} is not a Loader patch array`)
    const presets = presetDefinitions(document)
    const entries = patchEntries(document)
    return { path: relativePath, presets: presets.map(preset => preset.id).sort(),
      packages: [...activeBarePluginPackages(entries, platform)].sort() }
  })
}

function packageFiles(root: string, path: string) {
  let bytes = 0
  let files = 0
  const nodeAddons: string[] = []
  const executableFiles: string[] = []
  const symlinks: string[] = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.name === 'node_modules') continue
      const filename = join(current, entry.name)
      const rel = portable(relative(root, filename))
      if (entry.isSymbolicLink()) symlinks.push(rel)
      else if (entry.isDirectory()) visit(filename)
      else if (entry.isFile()) {
        const stat = lstatSync(filename)
        bytes += stat.size
        files += 1
        if (entry.name.endsWith('.node')) nodeAddons.push(rel)
        if ((stat.mode & 0o111) !== 0) executableFiles.push(rel)
      }
    }
  }
  visit(join(root, path))
  return { bytes, files, nodeAddons, executableFiles, symlinks }
}

async function archiveMeasurements(manifestPath: string | undefined) {
  if (manifestPath === undefined) return null
  const root = dirname(resolve(manifestPath))
  const manifest = json(manifestPath)
  const components = record(manifest.components, 'component manifest components')
  const archives = []
  for (const name of Object.keys(components).sort()) {
    const component = record(components[name], `component ${name}`)
    const archive = text(component.archive, `${name} archive`)
    if (basename(archive) !== archive || archive.includes('\\')) throw new Error(`${LABEL}: archive must be a basename: ${archive}`)
    const path = join(root, archive)
    const stat = lstatSync(path)
    if (!stat.isFile()) throw new Error(`${LABEL}: archive must be a regular file: ${archive}`)
    const measuredBytes = stat.size
    const digest = createHash('sha256')
    for await (const value of createReadStream(path)) {
      const chunk: unknown = value
      if (!Buffer.isBuffer(chunk)) throw new Error(`${LABEL}: expected archive bytes`)
      digest.update(chunk)
    }
    const measuredSha256 = digest.digest('hex')
    if (measuredBytes !== component.bytes || measuredSha256 !== component.sha256) {
      throw new Error(`${LABEL}: measured archive does not match component manifest: ${archive}`)
    }
    archives.push({ component: name, id: text(component.id, `${name} id`), archive,
      kind: text(component.kind, `${name} kind`), version: text(component.version, `${name} version`), measuredBytes, measuredSha256 })
  }
  if (archives.length === 0) throw new Error(`${LABEL}: component manifest contains no archives`)
  return { appVersion: text(manifest.appVersion, 'component appVersion'),
    platform: text(manifest.platform, 'component platform'), arch: text(manifest.arch, 'component arch'), archives }
}

/**
 * Inventory staged packages, their declared Loader/Client references, and optional archive measurements.
 * @param options Prepared Harness, target platform, selected roots, and optional release artifacts.
 * @returns Deterministic report; archive costs are null without artifacts and network/installed costs
 * are always null because static inspection cannot observe them. Missing selected-package dependencies fail.
 */
export async function createYourBuddyComponentInventory(options: YourBuddyInventoryOptions) {
  const root = resolve(options.harnessRoot)
  const bundle = json(join(root, '.bundle-manifest.json'))
  const available = readPackages(root)
  const roots = [...new Set(options.roots ?? [text(json(join(root, 'apps/cli/package.json')).name, 'CLI package name')])].sort()
  if (roots.length === 0) throw new Error(`${LABEL}: at least one package root is required`)
  const workspaceNames = new Set(available.keys())
  for (const pkg of available.values()) {
    for (const edge of packageEdges(pkg, available)) {
      if (edge.specifier.startsWith('workspace:')) workspaceNames.add(edge.name)
    }
  }
  const selected = selectRuntimePackageClosure(available, roots, workspaceNames, LABEL)
  const selectedNames = new Set(selected.map(pkg => pkg.name))
  const externalNames = new Set(selected.flatMap(pkg => packageEdges(pkg, available)
    .filter(edge => !edge.staged && !workspaceNames.has(edge.name)).map(edge => edge.name)))
  const requireReference = (owner: string, reference: string): void => {
    if (!selectedNames.has(reference) && !externalNames.has(reference)) {
      throw new Error(`${LABEL}: ${owner} references ${reference} outside the selected package closure`)
    }
  }
  const packages = [...available.values()].sort((left, right) => left.name.localeCompare(right.name)).map((pkg) => {
    const client = clientInjections(pkg)
    const patches = patchReferences(root, pkg, options.platform)
    if (selectedNames.has(pkg.name)) {
      for (const name of client) requireReference(`${pkg.name} Client injection`, name)
      for (const patch of patches) for (const name of patch.packages) requireReference(patch.path, name)
    }
    return { name: pkg.name, version: pkg.version, path: pkg.path, selected: selectedNames.has(pkg.name),
      dependencies: packageEdges(pkg, available), clientInjections: client, patches, stagedFiles: packageFiles(root, pkg.path) }
  })
  return {
    formatVersion: 1,
    analysis: 'prepared-package-declarations',
    harnessVersion: text(bundle.harnessVersion, 'bundle harnessVersion'),
    bundleContentSha256: text(bundle.contentSha256, 'bundle contentSha256'),
    platform: options.platform,
    roots,
    counts: { stagedPackages: packages.length, selectedPackages: selected.length,
      stagedOutsideSelectedClosure: packages.length - selected.length },
    packages,
    costs: { archives: await archiveMeasurements(options.componentsManifest),
      installedBytes: null, networkDownloadedBytes: null },
    limitations: [
      'The package closure includes declared peers and available optional packages; it is not a minimal-core recommendation.',
      'Loader patches are inspected independently, not composed; unknown disabled expressions remain conservatively active.',
      'Native desktop overlays are not included. External package contents and successful runtime loading require artifact and startup checks.',
      'Staged file bytes exclude node_modules and symlink targets; they are neither compressed sizes nor installed or downloaded bytes.',
      'Archive measurements compare local bytes with their supplied manifest; they do not verify its signature or observe network traffic.',
    ],
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    harness: { type: 'string' }, root: { type: 'string', multiple: true },
    platform: { type: 'string', default: 'darwin' }, components: { type: 'string' },
  }, allowPositionals: false })
  if (values.harness === undefined || !['darwin', 'linux', 'win32'].includes(values.platform)) {
    throw new Error('Usage: pnpm exec tsx scripts/yourbuddy-component-inventory.ts --harness <prepared-directory> [--root <package>] [--platform darwin|linux|win32] [--components <manifest-file>]')
  }
  const report = await createYourBuddyComponentInventory({
    harnessRoot: values.harness,
    platform: values.platform as YourBuddyInventoryOptions['platform'],
    ...(values.root === undefined ? {} : { roots: values.root }),
    ...(values.components === undefined ? {} : { componentsManifest: values.components }),
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (import.meta.main) await main()
