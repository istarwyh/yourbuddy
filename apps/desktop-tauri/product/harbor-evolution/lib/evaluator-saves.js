import { constants } from 'node:fs'
import { access, lstat, mkdir, open, rename, unlink } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'

const SCHEMA = 'harbor-evaluator-save/v1'
const IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,99}$/
const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/i
const MAX_RECORD_BYTES = 16 * 1024
const fail = () => { throw new Error('HARBOR_EVALUATOR_SAVE_HISTORY_UNAVAILABLE: Saved-version history could not be safely read or recorded.') }
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

function relativeFile(value) {
  if (typeof value !== 'string' || !value || value.length > 1024 || /[\u0000-\u001f\u007f\\]/.test(value) || value.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) fail()
  return value
}

function identity(value) { if (typeof value !== 'string' || !IDENTITY.test(value)) fail(); return value }

function scopeFor(args) {
  const scope = { sessionId: args.sessionId, workspace: args.workspace, job: args.job }
  // Workspace IDs may begin with a dot (the project-root workspace label).
  // These opaque strings are hashed, never interpolated into a file path.
  if (Object.values(scope).some(value => typeof value !== 'string' || !value || value.length > 512 || /[\u0000-\u001f\u007f]/.test(value))) fail()
  return scope
}

export function evaluatorSourceIdentity(governance) {
  const evaluator = governance?.components?.evaluator
  return { stack: governance?.stackIdentity, evaluator: { id: evaluator?.id, version: evaluator?.version, digest: evaluator?.digest, entry: evaluator?.entry }, contextDigest: governance?.contextDigest }
}

// The journal stores identities only, never browser-supplied receipts, source
// text, credentials, or evaluation claims. Live source is re-read by the Host.
function receiptIdentity(receipt) {
  const evaluator = receipt?.evaluator
  const stack = receipt?.stack
  if (typeof evaluator?.digest !== 'string' || !DIGEST.test(evaluator.digest)) fail()
  return {
    stack: { id: identity(stack?.id), version: identity(stack?.version), path: relativeFile(stack?.path) },
    evaluator: { evaluator_id: identity(evaluator?.evaluator_id), version: identity(evaluator?.version), descriptor_path: relativeFile(evaluator?.descriptor_path), digest: evaluator.digest },
    requires_fresh_baseline: true, automatic_evaluation: false, automatic_gate: false,
  }
}

async function directory(root, create) {
  let current = path.resolve(root)
  for (const segment of ['.harbor', 'workbench-evaluator-saves']) {
    current = path.join(current, segment)
    if (create) await mkdir(current, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error })
    const details = await lstat(current)
    if (!details.isDirectory() || details.isSymbolicLink()) fail()
  }
  return current
}

async function stackDigest(config, relative) {
  const segments = relativeFile(relative).split('/')
  let file = path.resolve(config.projectRoot)
  for (const segment of segments) {
    file = path.join(file, segment)
    if ((await lstat(file)).isSymbolicLink()) fail()
  }
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const details = await handle.stat()
    if (!details.isFile() || details.size > 1024 * 1024) fail()
    return `sha256:${createHash('sha256').update(await handle.readFile()).digest('hex')}`
  } finally { await handle.close() }
}

// Check journal access before mutating the evaluator. A later disk failure must
// still be reported as a *saved* version with recovery unavailable, not a failed
// save which invites the user to repeat a successful source mutation.
export async function prepareEvaluatorSaveHistory(config, args) {
  const scope = scopeFor(args)
  const destination = await directory(config.projectRoot, true)
  await access(destination, constants.W_OK)
  return { scope, destination }
}

export async function recordEvaluatorSave(config, args, governance, receipt) {
  if (receipt?.requires_fresh_baseline !== true || receipt?.automatic_evaluation !== false || receipt?.automatic_gate !== false) fail()
  const { scope, destination } = await prepareEvaluatorSaveHistory(config, args)
  const value = receiptIdentity(receipt)
  const record = { schema: SCHEMA, scope, sourceDigest: hash(evaluatorSourceIdentity(governance)), stackDigest: await stackDigest(config, value.stack.path), savedAt: new Date().toISOString(), receipt: value }
  const temporary = path.join(destination, `.save-${randomUUID()}.tmp`)
  let handle
  try {
    handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    await handle.writeFile(JSON.stringify(record))
    await handle.sync()
    await handle.close(); handle = undefined
    await rename(temporary, path.join(destination, `${hash(scope)}.json`))
  } finally {
    await handle?.close()
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
  return { ...receipt, continuation: { verification: 'VERIFIED', savedAt: record.savedAt, durable: true } }
}

export async function readEvaluatorSave(config, args, governance, current, inspect) {
  const scope = scopeFor(args)
  let handle
  let record
  try {
    const destination = await directory(config.projectRoot, false)
    handle = await open(path.join(destination, `${hash(scope)}.json`), constants.O_RDONLY | constants.O_NOFOLLOW)
    const details = await handle.stat()
    if (!details.isFile() || details.size > MAX_RECORD_BYTES) fail()
    record = JSON.parse(await handle.readFile('utf8'))
  } catch (error) { if (error.code === 'ENOENT') return undefined; throw error }
  finally { await handle?.close() }
  if (record.schema !== SCHEMA || hash(record.scope) !== hash(scope) || record.sourceDigest !== hash(evaluatorSourceIdentity(governance)) || typeof record.stackDigest !== 'string' || !DIGEST.test(record.stackDigest) || typeof record.savedAt !== 'string' || !Number.isFinite(Date.parse(record.savedAt))) fail()
  const receipt = receiptIdentity(record.receipt)
  // A saved explicit Stack path can differ from the Job's default discovery
  // path. Resolve only the validated recorded path through the Host inspector.
  if (inspect && current?.stack?.path !== receipt.stack.path) {
    try { current = await inspect(receipt.stack.path) } catch { current = undefined }
  }
  let verified = false
  let available = Boolean(current)
  try { verified = hash(receiptIdentity(current)) === hash(receipt) && await stackDigest(config, receipt.stack.path) === record.stackDigest } catch { available = false }
  return {
    ...receipt,
    ...(verified ? { evaluator: { ...receipt.evaluator, editable_files: current.evaluator.editable_files } } : {}),
    continuation: { verification: verified ? 'VERIFIED' : available ? 'DRIFTED' : 'UNAVAILABLE', savedAt: record.savedAt, durable: true, recovered: true },
  }
}
