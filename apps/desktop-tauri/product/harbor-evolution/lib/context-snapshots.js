import { constants } from 'node:fs'
import { lstat, mkdir, open, link, unlink } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'

const MAX_BYTES = 1024 * 1024
const ID = /^(?:hctx_[A-Za-z0-9_-]{20,80}|hsel_[A-Za-z0-9_-]{24})$/
const failure = () => new Error('HARBOR_CONTEXT_STORAGE_UNAVAILABLE: Page context could not be safely saved or read. Keep the draft and retry.')

async function directory(projectRoot, sessionId, create) {
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 240) throw failure()
  let current = path.resolve(projectRoot)
  const sessionKey = createHash('sha256').update(sessionId).digest('hex')
  for (const segment of ['.harbor', 'private', 'page-contexts', sessionKey]) {
    current = path.join(current, segment)
    if (create) await mkdir(current, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error })
    const details = await lstat(current)
    if (!details.isDirectory() || details.isSymbolicLink()) throw failure()
    if (process.platform !== 'win32' && ((typeof process.getuid === 'function' && details.uid !== process.getuid()) || (details.mode & (segment === '.harbor' ? 0o022 : 0o077)))) throw failure()
  }
  return current
}

/** Read one immutable Session-owned record; absence never selects a replacement. */
export async function readContextSnapshot(projectRoot, sessionId, id) {
  if (!ID.test(id ?? '')) throw failure()
  let handle
  try {
    const root = await directory(projectRoot, sessionId, false)
    handle = await open(path.join(root, `${id}.json`), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    const details = await handle.stat()
    if (!details.isFile() || details.size > MAX_BYTES) throw failure()
    if (process.platform !== 'win32' && ((typeof process.getuid === 'function' && details.uid !== process.getuid()) || (details.mode & 0o077))) throw failure()
    const record = JSON.parse(await handle.readFile('utf8'))
    if (record.schema !== 'harbor-context-snapshot/v1' || record.sessionId !== sessionId || record.id !== id || record.projectRoot !== path.resolve(projectRoot)) throw failure()
    return record.value
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw failure()
  } finally { await handle?.close() }
}

async function publishImmutable(file, text) {
  const temporary = path.join(path.dirname(file), `.context-${randomUUID()}.tmp`)
  let handle
  try {
    handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    await handle.writeFile(text)
    await handle.sync()
    await handle.close(); handle = undefined
    try { await link(temporary, file); return true }
    catch (error) {
      if (error.code !== 'EEXIST') throw error
      return false
    }
  } catch { throw failure() }
  finally {
    await handle?.close()
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}

/** Persist only validated identity/revision data, never artifact bodies or credentials. */
export async function writeContextSnapshot(projectRoot, sessionId, id, value) {
  if (!ID.test(id ?? '')) throw failure()
  const text = JSON.stringify({ schema: 'harbor-context-snapshot/v1', sessionId, projectRoot: path.resolve(projectRoot), id, value })
  if (Buffer.byteLength(text) > MAX_BYTES) throw failure()
  const root = await directory(projectRoot, sessionId, true)
  const ignore = path.join(root, '..', '.gitignore')
  await publishImmutable(ignore, '*\n!.gitignore\n')
  let ignoreHandle
  try {
    ignoreHandle = await open(ignore, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    const details = await ignoreHandle.stat()
    if (!details.isFile() || details.size > 1024 || (process.platform !== 'win32' && ((typeof process.getuid === 'function' && details.uid !== process.getuid()) || (details.mode & 0o077)))) throw failure()
    if (await ignoreHandle.readFile('utf8') !== '*\n!.gitignore\n') throw failure()
  } catch { throw failure() }
  finally { await ignoreHandle?.close() }
  if (!await publishImmutable(path.join(root, `${id}.json`), text)) {
    const existing = await readContextSnapshot(projectRoot, sessionId, id)
    if (JSON.stringify(existing) !== JSON.stringify(value)) throw failure()
  }
}
