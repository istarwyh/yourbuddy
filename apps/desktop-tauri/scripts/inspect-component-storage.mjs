/** Read-only, best-effort inventory of desktop runtime storage; never a deletion plan. */
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readdirSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const metadataLimit = 256 * 1024
const collections = [
  'components/harness', 'components/stores', 'components/node', 'components/harbor',
  'components/packs', 'components/downloads', 'components/staging',
  'components/quarantine', 'components/.leases', 'components/manifests',
  'harness-versions', 'runtime',
]

function counters() {
  return { logicalFileBytes: 0n, uniqueFileBytes: 0n, allocatedFileBytes: 0n, files: 0, hardlinkedFiles: 0, symlinks: 0 }
}

function observeFile(counts, seen, stat) {
  counts.files++
  counts.logicalFileBytes += stat.size
  if (stat.nlink > 1n) counts.hardlinkedFiles++
  const identity = `${stat.dev}:${stat.ino}`
  if (seen.has(identity)) return
  seen.add(identity)
  counts.uniqueFileBytes += stat.size
  counts.allocatedFileBytes += stat.blocks * 512n
}

function jsonCounters(counts) {
  return Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value]))
}

function within(root, path) {
  const name = relative(root, path)
  return name !== '..' && !name.startsWith(`..${sep}`) && !isAbsolute(name)
}

/**
 * Inspect only runtime/component trees under an explicit application-data directory.
 * Byte fields are decimal strings; totals deduplicate regular files by device/inode.
 * On a stable tree, symlink targets, profiles, sessions and credentials are not scanned.
 * Concurrent path replacement can invalidate these exclusions. No OS locks are acquired;
 * references and sizes are observations rather than a consistent snapshot.
 *
 * @param {string} appRoot Existing macOS or Linux YourBuddy application-data directory.
 * @returns {object} Local-only inventory with unknown reclaimability and scan errors.
 */
export function inspectComponentStorage(appRoot) {
  if (appRoot === '') throw new Error('An explicit application-data directory is required')
  if (!['darwin', 'linux'].includes(process.platform)) throw new Error('Storage inventory supports macOS and Linux only')
  const root = resolve(appRoot)
  if (!lstatSync(root).isDirectory()) throw new Error('The application-data root must be a directory, not a symlink')
  const errors = []
  const references = []
  const metadata = []
  const total = counters()
  const totalSeen = new Set()
  const entries = []

  function scanError(path, code) {
    errors.push({ path, code })
  }

  // Check every intermediate directory before selecting descendants; static links never
  // widen the scan. Concurrent path replacement can still make this observation incomplete.
  function inspectPath(name) {
    const parts = name.split('/')
    for (let index = 1; index <= parts.length; index++) {
      const prefix = parts.slice(0, index).join('/')
      try {
        const stat = lstatSync(join(root, prefix), { bigint: true })
        if (index === parts.length) return stat
        if (!stat.isDirectory()) {
          scanError(prefix, 'NOT_DIRECTORY')
          return null
        }
      } catch (error) {
        if (error.code !== 'ENOENT') scanError(prefix, error.code ?? 'STAT_FAILED')
        return null
      }
    }
  }

  function readMetadata(path, select) {
    const stat = inspectPath(path)
    if (!stat) {
      metadata.push({ path, status: 'unavailable' })
      return
    }
    let file
    try {
      if (!stat.isFile()) throw new Error('NOT_REGULAR_FILE')
      file = openSync(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
      const opened = fstatSync(file)
      if (!opened.isFile() || opened.size > metadataLimit) throw new Error('METADATA_LIMIT_OR_TYPE')
      const bytes = Buffer.alloc(metadataLimit + 1)
      let length = 0
      while (length < bytes.length) {
        const read = readSync(file, bytes, length, bytes.length - length, null)
        if (read === 0) break
        length += read
      }
      if (length > metadataLimit) throw new Error('METADATA_LIMIT')
      const record = JSON.parse(bytes.subarray(0, length).toString('utf8'))
      const selected = select(record)
      let outsideRoot = 0
      const found = []
      for (const [field, value] of selected) {
        if (typeof value !== 'string' || !isAbsolute(value)) throw new Error('INVALID_REFERENCE')
        if (within(root, value)) found.push({ source: path, field, target: resolve(value) })
        else outsideRoot++
      }
      references.push(...found)
      metadata.push({ path, status: 'read', outsideRoot })
    } catch (error) {
      metadata.push({ path, status: 'unreadable' })
      scanError(path, error.code ?? 'INVALID_METADATA')
    } finally {
      if (file !== undefined) closeSync(file)
    }
  }

  readMetadata('components/active.json', record => Object.entries(record.components).map(([key, value]) => [key, value.path]))
  readMetadata('runtime/manifest.json', record => [['harnessRoot', record.harnessRoot], ['nodePath', record.nodePath]])
  readMetadata('bin/dsh-launch.json', record => [
    ['cli', record.cli], ['node', record.node], ['dshHome', record.dshHome],
    ...(record.pathPrepend ?? []).map((value, index) => [`pathPrepend[${index}]`, value]),
  ])

  function measure(name, stat, counts, seen, observations) {
    if (stat.isSymbolicLink()) {
      counts.symlinks++
      total.symlinks++
      return
    }
    if (stat.isFile()) {
      observeFile(counts, seen, stat)
      observeFile(total, totalSeen, stat)
      return
    }
    if (!stat.isDirectory()) {
      scanError(name, 'UNSUPPORTED_FILE_TYPE')
      return
    }
    let children
    try {
      children = readdirSync(join(root, name)).sort()
    } catch (error) {
      scanError(name, error.code ?? 'READ_DIRECTORY_FAILED')
      return
    }
    for (const child of children) {
      if (child === '.bootstrap-provisioning') observations.add('provisioning-marker-present')
      if (child.startsWith('.bootstrap-dependencies-') || child.startsWith('.bootstrap-pnpm-')) observations.add('preserved-provisioning-output')
      const path = `${name}/${child}`
      try {
        measure(path, lstatSync(join(root, path), { bigint: true }), counts, seen, observations)
      } catch (error) {
        scanError(path, error.code ?? 'STAT_FAILED')
      }
    }
  }

  function addEntry(path, kind, stat) {
    const counts = counters()
    const observations = new Set()
    const before = errors.length
    if (path.startsWith('runtime/.bootstrap-pnpm-')) observations.add('preserved-provisioning-output')
    measure(path, stat, counts, new Set(), observations)
    const absolute = join(root, path)
    const recordedReferences = references
      .filter(reference => within(absolute, reference.target) || within(reference.target, absolute))
      .map(({ source, field }) => ({ source, field }))
    entries.push({
      path, kind, ...jsonCounters(counts), complete: before === errors.length,
      recordedReferences, observations: [...observations].sort(),
      retainedReason: kind === '.leases' ? 'permanent-lease-coordination'
        : kind === 'staging' || kind === 'quarantine' ? kind : 'ownership-and-consumers-unverified',
      reclaimableBytes: null,
    })
  }

  for (const collection of collections) {
    const stat = inspectPath(collection)
    if (!stat) continue
    const kind = collection.split('/').at(-1)
    if (!stat.isDirectory()) {
      addEntry(collection, kind, stat)
      continue
    }
    let children
    try {
      children = readdirSync(join(root, collection)).sort()
    } catch (error) {
      scanError(collection, error.code ?? 'READ_DIRECTORY_FAILED')
      continue
    }
    for (const child of children) {
      const path = `${collection}/${child}`
      try {
        addEntry(path, kind, lstatSync(join(root, path), { bigint: true }))
      } catch (error) {
        scanError(path, error.code ?? 'STAT_FAILED')
      }
    }
  }
  const legacy = inspectPath('harness')
  if (legacy) addEntry('harness', 'legacy-harness', legacy)

  return {
    schemaVersion: 1, readOnly: true, complete: errors.length === 0,
    consistency: 'best-effort-without-locks',
    leaseActivity: 'unverified', profileReferences: 'unverified',
    physicalExclusiveBytes: null, reclaimableBytes: null,
    byteAccounting: 'regular-files-only; decimal-byte-strings; allocated=unique-inode-blocks*512; APFS-clones-not-deduplicated',
    scope: [...collections, 'harness'],
    totals: jsonCounters(total), metadata,
    entries: entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
    errors,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--root') {
      throw new Error('Usage: node apps/desktop-tauri/scripts/inspect-component-storage.mjs --root <YourBuddy application-data directory>')
    }
    const report = inspectComponentStorage(process.argv[3])
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    if (!report.complete) process.exitCode = 2
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
