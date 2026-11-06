/** Kernel-held ownership for one canonical artifact root; process exit releases either handle. */
import { createHash } from 'node:crypto'
import { openSync, closeSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

/** Windows named-pipe identity is independent of case variants in a canonical filesystem path. */
export function editorPipeName(root) {
  return `\\\\.\\pipe\\YourBuddyDesign-${createHash('sha256').update(root.toLowerCase()).digest('hex')}`
}

/** Acquire a lifetime lock without deleting a file or signaling an existing process. */
export async function acquireEditorLock(root) {
  if (process.platform === 'win32') {
    const server = createServer(socket => socket.destroy())
    await new Promise((resolve, reject) => {
      const failed = error => reject(error.code === 'EADDRINUSE'
        ? new Error('Another YourBuddy editor already owns this folder.', { cause: error }) : error)
      server.once('error', failed)
      server.listen(editorPipeName(root), () => { server.off('error', failed); resolve() })
    })
    server.on('error', () => process.kill(process.pid, 'SIGTERM'))
    return server
  }
  const { tryLockExclusive } = await import('@deepseek-ai/node-addon-system/flock')
  const fd = openSync(join(root, '.yourbuddy-design.lock'), 'a', 0o600)
  try { await tryLockExclusive(fd) }
  catch (error) {
    closeSync(fd)
    if (error.code === 'EAGAIN' || error.code === 'EWOULDBLOCK') throw new Error('Another YourBuddy editor already owns this folder.', { cause: error })
    throw error
  }
  return fd
}
