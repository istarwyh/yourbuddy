/** Build immutable YourBuddy runtime components and the signed-channel manifest input. */

import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_OUTPUT = join(desktopRoot, 'component-release')
export const BOOTSTRAP_DMG_MAX_BYTES = 30_000_000

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status ?? 'unknown'}`)
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function archiveTree(source, destination, excludes = [], dereference = false) {
  if (!existsSync(source)) throw new Error(`component source is missing: ${source}`)
  mkdirSync(dirname(destination), { recursive: true })
  const args = [
    '-acf', destination,
    '--uid', '0',
    '--gid', '0',
    '--uname', 'root',
    '--gname', 'wheel',
    '--no-mac-metadata',
    ...(dereference ? ['--dereference'] : []),
    ...excludes.flatMap(pattern => ['--exclude', pattern]),
    '-C', source,
    '.',
  ]
  run('tar', args, { env: { ...process.env, COPYFILE_DISABLE: '1' } })
  return { sha256: sha256(destination), bytes: statSync(destination).size }
}

function component(id, archive, activation, metadata) {
  return { id, archive: basename(archive), sha256: metadata.sha256, bytes: metadata.bytes, activation }
}

function treeDigest(root, include) {
  const hash = createHash('sha256')
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(current, entry.name)
      const rel = relative(root, path).replaceAll('\\', '/')
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && include(rel)) {
        hash.update(`${rel}\0`)
        hash.update(readFileSync(path))
        hash.update('\0')
      }
    }
  }
  walk(root)
  return hash.digest('hex')
}

function copyDebugFiles(source, destination) {
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && (entry.name.endsWith('.map') || entry.name.endsWith('.dSYM'))) {
        const target = join(destination, relative(source, path))
        mkdirSync(dirname(target), { recursive: true })
        cpSync(path, target)
      }
    }
  }
  walk(source)
}

/** Reject a Bootstrap installer that exceeds the public acceptance ceiling. */
export function assertBootstrapDmgSize(path, maxBytes = BOOTSTRAP_DMG_MAX_BYTES) {
  const bytes = statSync(path).size
  if (bytes > maxBytes) {
    throw new Error(`Bootstrap DMG exceeds ${maxBytes} bytes: ${bytes} (${path})`)
  }
  return bytes
}

/** Validate the release-owned fields before the manifest becomes an application resource. */
export function validateComponentManifest(manifest) {
  if (manifest.schemaVersion !== 1) throw new Error(`unsupported component manifest schema: ${manifest.schemaVersion}`)
  if (!/^\d+\.\d+\.\d+$/.test(manifest.appVersion ?? '')) throw new Error('component manifest appVersion is invalid')
  if (manifest.releaseTag !== `yourbuddy-v${manifest.appVersion}`) throw new Error('component manifest releaseTag does not match appVersion')
  if (manifest.platform !== 'darwin' || manifest.arch !== 'arm64') throw new Error('component manifest must target darwin-arm64')
  for (const name of ['harness', 'pnpmStore', 'node', 'harbor']) {
    const value = manifest.components?.[name]
    if (!value || !/^[a-z0-9][a-z0-9._:-]*$/i.test(value.id ?? '')) throw new Error(`component ${name} id is invalid`)
    if (!/^yourbuddy-[a-z0-9._-]+\.tar\.zst$/i.test(value.archive ?? '') || value.archive.includes('..')) {
      throw new Error(`component ${name} archive is invalid`)
    }
    if (!/^[0-9a-f]{64}$/.test(value.sha256 ?? '')) throw new Error(`component ${name} sha256 is invalid`)
    if (!Number.isSafeInteger(value.bytes) || value.bytes < 1) throw new Error(`component ${name} bytes is invalid`)
  }
  return manifest
}

/** Build all component archives and the exact manifest later signed by the release job. */
export function buildBootstrapComponents({ version, outputRoot = DEFAULT_OUTPUT, bundledRoot = join(desktopRoot, 'bundled') }) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('version must be X.Y.Z')
  const harnessRoot = join(bundledRoot, 'harness')
  let storeRoot = join(harnessRoot, '.yourbuddy-pnpm-store')
  const storeSourceArchive = join(harnessRoot, 'yourbuddy-pnpm-store.tar.gz')
  const toolchainRoot = join(bundledRoot, 'toolchain')
  const harborRoot = join(bundledRoot, 'yourbuddy-runtime')
  for (const path of [harnessRoot, toolchainRoot, harborRoot]) {
    if (!existsSync(path)) throw new Error(`prepared release input is missing: ${path}`)
  }
  if (!existsSync(storeRoot) && !existsSync(storeSourceArchive)) {
    throw new Error(`prepared release input is missing: ${storeSourceArchive}`)
  }

  rmSync(outputRoot, { recursive: true, force: true })
  mkdirSync(outputRoot, { recursive: true })
  const temporary = mkdtempSync(join(tmpdir(), 'yourbuddy-components-'))
  try {
    if (!existsSync(storeRoot)) {
      const storeStage = join(temporary, 'store')
      mkdirSync(storeStage, { recursive: true })
      run('tar', ['-xzf', storeSourceArchive, '-C', storeStage])
      storeRoot = join(storeStage, '.yourbuddy-pnpm-store')
    }
    const harnessId = treeDigest(harnessRoot, rel => !rel.endsWith('.map') && !rel.startsWith('.yourbuddy-pnpm-store/') && rel !== 'yourbuddy-pnpm-store.tar.gz')
    const storeId = treeDigest(storeRoot, () => true)
    const harborId = treeDigest(harborRoot, () => true)
    const nodeVersion = JSON.parse(readFileSync(join(toolchainRoot, 'manifest.json'), 'utf8')).nodeVersion
    const nodeArchive = join(toolchainRoot, `node-v${nodeVersion}-darwin-arm64.tar.gz`)
    const nodeStage = join(temporary, 'node')
    mkdirSync(nodeStage, { recursive: true })
    run('tar', ['-xzf', nodeArchive, '--strip-components', '1', '-C', nodeStage])

    const harnessArchive = join(outputRoot, `yourbuddy-harness-${harnessId}-macos-arm64.tar.zst`)
    const storeArchive = join(outputRoot, `yourbuddy-pnpm-store-${storeId}-macos-arm64.tar.zst`)
    const nodeComponentArchive = join(outputRoot, `yourbuddy-node-${nodeVersion}-darwin-arm64.tar.zst`)
    const harborArchive = join(outputRoot, `yourbuddy-harbor-${harborId}-darwin-arm64.tar.zst`)
    const debugArchive = join(outputRoot, `yourbuddy-debug-${version}.tar.zst`)

    const harness = archiveTree(harnessRoot, harnessArchive, ['*.map', 'node_modules', '.yourbuddy-pnpm-store', 'yourbuddy-pnpm-store.tar.gz'])
    const pnpmStore = archiveTree(storeRoot, storeArchive)
    const node = archiveTree(nodeStage, nodeComponentArchive, [], true)
    const harbor = archiveTree(harborRoot, harborArchive, [
      '__pycache__',
      '*.pyc',
      'python/cpython-3.12-macos-aarch64-none',
    ])
    const debugStage = join(temporary, 'debug')
    mkdirSync(debugStage, { recursive: true })
    copyDebugFiles(harnessRoot, debugStage)
    writeFileSync(join(debugStage, 'README.txt'), 'Optional YourBuddy source maps and native diagnostics.\n')
    archiveTree(debugStage, debugArchive)

    const manifest = validateComponentManifest({
      schemaVersion: 1,
      appVersion: version,
      releaseTag: `yourbuddy-v${version}`,
      platform: 'darwin',
      arch: 'arm64',
      components: {
        harness: component(`sha256:${harnessId}`, harnessArchive, 'startup', harness),
        pnpmStore: component(`sha256:${storeId}`, storeArchive, 'startup-fallback', pnpmStore),
        node: component(`node:${nodeVersion}:darwin-arm64`, nodeComponentArchive, 'startup-fallback', node),
        harbor: component(`sha256:${harborId}`, harborArchive, 'on-demand', harbor),
      },
    })
    const manifestPath = join(outputRoot, `yourbuddy-components-${version}.json`)
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    const report = {
      schemaVersion: 1,
      appVersion: version,
      artifacts: Object.fromEntries(readdirSync(outputRoot).sort().map(name => {
        const path = join(outputRoot, name)
        return [name, { bytes: statSync(path).size, sha256: sha256(path) }]
      })),
    }
    writeFileSync(join(outputRoot, `yourbuddy-size-report-${version}.json`), `${JSON.stringify(report, null, 2)}\n`)
    return { manifest, manifestPath, outputRoot }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--') continue
    if (argv[index] === '--version') options.version = argv[++index]
    else if (argv[index] === '--output') options.outputRoot = argv[++index]
    else if (argv[index] === '--bundled-root') options.bundledRoot = argv[++index]
    else if (argv[index] === '--assert-bootstrap-dmg') options.bootstrapDmg = argv[++index]
    else throw new Error(`unknown argument: ${argv[index]}`)
  }
  return options
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) {
  const options = parseArgs(process.argv.slice(2))
  if (options.bootstrapDmg) {
    console.log(`build-bootstrap-components: Bootstrap DMG bytes=${assertBootstrapDmgSize(options.bootstrapDmg)}`)
  } else {
    const result = buildBootstrapComponents(options)
    console.log(`build-bootstrap-components: wrote ${result.outputRoot}`)
  }
}
