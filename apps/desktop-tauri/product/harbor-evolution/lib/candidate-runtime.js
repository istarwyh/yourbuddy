import { createHash } from 'node:crypto'
import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'

export const CANDIDATE_RUNTIME_NAME = 'candidate-runtime.json'
const DESCRIPTOR_KEYS = ['schema_version', 'transport', 'entrypoint', 'config_path', 'agent_entry_id', 'node_version']
const RESERVED_PATHS = new Set(['node_modules', '.harbor-runtime', '.git'])
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies', 'devDependencies', 'peerDependencies']

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`

function safeRelative(value, label) {
  if (typeof value !== 'string' || !value || value.length > 1024 || value.trim() !== value || /[\\:\x00-\x1f\x7f]/.test(value) || path.posix.isAbsolute(value)) {
    throw new Error(`${label} must be a safe Candidate-relative path`)
  }
  const parts = value.split('/')
  if (parts.some(part => !part || part === '.' || part === '..' || RESERVED_PATHS.has(part))) {
    throw new Error(`${label} must not traverse or use reserved Candidate paths`)
  }
  return parts
}

async function sourceFile(root, relative, { optional = false } = {}) {
  const parts = safeRelative(relative, relative)
  let absolute = root
  for (let index = 0; index < parts.length; index++) {
    absolute = path.join(absolute, parts[index])
    let info
    try {
      info = await lstat(absolute)
    } catch (error) {
      if (optional && index === parts.length - 1 && error.code === 'ENOENT') return undefined
      if (error.code === 'ENOENT') throw new Error(`Candidate runtime requires a regular source file: ${relative}`)
      throw error
    }
    if (info.isSymbolicLink() || (index === parts.length - 1 ? !info.isFile() : !info.isDirectory())) {
      throw new Error(`Candidate runtime requires a regular source file without symlinks: ${relative}`)
    }
  }
  return readFile(absolute)
}

function parseObject(bytes, label) {
  if (bytes.length > 4 * 1024 * 1024) throw new Error(`${label} exceeds the runtime metadata size limit`)
  let value
  try {
    const source = bytes.toString('utf8')
    if (!Buffer.from(source, 'utf8').equals(bytes)) throw new Error('Invalid UTF-8')
    value = JSON.parse(source)
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }
  if (!object(value)) throw new Error(`${label} must be an object`)
  return value
}

function dependencies(value, field, label) {
  const entries = Object.hasOwn(value, field) ? value[field] : {}
  if (!object(entries)) throw new Error(`${label} ${field} must be an object`)
  for (const [name, version] of Object.entries(entries)) {
    if (typeof version !== 'string' || !EXACT_VERSION.test(version)) {
      throw new Error(`${label} ${field}.${name} must use an exact semver, not a tag, range, alias, or local dependency`)
    }
  }
  return Object.entries(entries).sort(([left], [right]) => left.localeCompare(right))
}

function validateLockfile(packageJson, lockfile) {
  if (lockfile.lockfileVersion !== 3 || !object(lockfile.packages) || !object(lockfile.packages[''])) {
    throw new Error('Candidate runtime requires package-lock.json v3 with packages[\'\'] root metadata')
  }
  const root = lockfile.packages['']
  for (const field of ['name', 'version']) {
    if (typeof packageJson[field] !== 'string' || !packageJson[field] || root[field] !== packageJson[field]) {
      throw new Error(`package-lock.json root ${field} must match package.json ${field}`)
    }
  }
  for (const field of DEPENDENCY_FIELDS) {
    const expected = dependencies(packageJson, field, 'package.json')
    const actual = dependencies(root, field, 'package-lock.json root')
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error(`package-lock.json root ${field} must match package.json ${field}`)
    }
    for (const [name, version] of expected) {
      const target = lockfile.packages[`node_modules/${name}`]
      if (!object(target) || target.version !== version) {
        throw new Error(`package-lock.json root ${field} dependency must resolve to its exact locked version`)
      }
    }
  }
  for (const [location, entry] of Object.entries(lockfile.packages)) {
    if (!location) continue
    if (!location.startsWith('node_modules/') || /[\\:\x00-\x1f\x7f]/.test(location) || location.split('/').some(part => !part || part === '.' || part === '..' || part === '.git' || part === '.harbor-runtime')) {
      throw new Error(`package-lock.json contains an unsupported package location: ${location}`)
    }
    if (!object(entry) || entry.link || entry.inBundle || typeof entry.version !== 'string' || !EXACT_VERSION.test(entry.version)) {
      throw new Error(`package-lock.json ${location} requires an exact registry version without links or bundled dependencies`)
    }
    let resolved
    try {
      resolved = new URL(entry.resolved)
    } catch {
      throw new Error(`package-lock.json ${location} requires an HTTPS resolved package URL`)
    }
    if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith('https://') || /[\x00-\x20\x7f\\]/.test(entry.resolved) || resolved.protocol !== 'https:' || !resolved.hostname || resolved.username || resolved.password || resolved.search || resolved.hash || entry.resolved.includes('?') || entry.resolved.includes('#')) {
      throw new Error(`package-lock.json ${location} requires an HTTPS resolved package URL without credentials, query, or fragment`)
    }
    const integrity = entry.integrity
    if (typeof integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity) || Buffer.from(integrity.slice(7), 'base64').toString('base64') !== integrity.slice(7)) {
      throw new Error(`package-lock.json ${location} requires a valid sha512 integrity digest`)
    }
  }
}

/** Resolve only Candidate-owned, source-digested runtime metadata; never select a registry default. */
export async function loadCandidateRuntime(candidateDir, { required = false } = {}) {
  const root = path.resolve(candidateDir)
  const bytes = await sourceFile(root, CANDIDATE_RUNTIME_NAME, { optional: true })
  if (bytes === undefined) {
    if (required) throw new Error(`Candidate runtime is unbound; migrate this Candidate by adding ${CANDIDATE_RUNTIME_NAME} and a locked ACP entrypoint, then create a new snapshot`)
    return { kind: 'deepseek-harness', policy: 'unbound', transport: 'acp' }
  }
  const descriptor = parseObject(bytes, CANDIDATE_RUNTIME_NAME)
  if (Object.keys(descriptor).some(key => !DESCRIPTOR_KEYS.includes(key)) || DESCRIPTOR_KEYS.some(key => !Object.hasOwn(descriptor, key))) {
    throw new Error(`${CANDIDATE_RUNTIME_NAME} requires exactly: ${DESCRIPTOR_KEYS.join(', ')}`)
  }
  if (descriptor.schema_version !== 1 || descriptor.transport !== 'acp') {
    throw new Error(`${CANDIDATE_RUNTIME_NAME} requires schema_version=1 and transport=acp`)
  }
  safeRelative(descriptor.entrypoint, 'entrypoint')
  if (!/\.(?:js|mjs|cjs)$/.test(descriptor.entrypoint)) throw new Error('Candidate runtime entrypoint must be a .js, .mjs, or .cjs source file')
  safeRelative(descriptor.config_path, 'config_path')
  if (typeof descriptor.agent_entry_id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(descriptor.agent_entry_id)) {
    throw new Error('Candidate runtime agent_entry_id must be a non-empty safe identifier')
  }
  if (typeof descriptor.node_version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(descriptor.node_version) || Number(descriptor.node_version.split('.')[0]) < 22) {
    throw new Error('Candidate runtime node_version must be an exact x.y.z release with major >=22')
  }
  const entrypointBytes = await sourceFile(root, descriptor.entrypoint)
  await sourceFile(root, descriptor.config_path)
  const packageBytes = await sourceFile(root, 'package.json')
  const lockfileBytes = await sourceFile(root, 'package-lock.json')
  validateLockfile(parseObject(packageBytes, 'package.json'), parseObject(lockfileBytes, 'package-lock.json'))
  return {
    kind: 'deepseek-harness',
    policy: 'candidate-locked',
    transport: 'acp',
    descriptor: CANDIDATE_RUNTIME_NAME,
    entrypoint: descriptor.entrypoint,
    config_path: descriptor.config_path,
    agent_entry_id: descriptor.agent_entry_id,
    node_version: descriptor.node_version,
    lockfile: 'package-lock.json',
    descriptor_digest: sha256(bytes),
    entrypoint_digest: sha256(entrypointBytes),
    lockfile_digest: sha256(lockfileBytes),
  }
}
