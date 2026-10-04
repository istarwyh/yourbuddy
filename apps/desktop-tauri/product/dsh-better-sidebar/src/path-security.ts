/** Filesystem path resolution shared by sidebar APIs. */
import { realpath } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { requireAbsolute } from './fs-tree.ts'
import { resolveSessionPath } from './session-path.ts'
import { SidebarError } from './wire.ts'

/** Resolve a path and convert filesystem resolution failures to an API error. */
async function resolveRealPath(path: string, label: string): Promise<string> {
  try {
    return await realpath(path)
  } catch (error) {
    throw new SidebarError('fs-error', `cannot resolve ${label} "${path}": ${error instanceof Error ? error.message : String(error)}`, 400)
  }
}

/**
 * Resolve an existing filesystem path through symlinks.
 *
 * Relative paths use the Session workspace as their base, while absolute paths
 * may point anywhere on the host.
 *
 * @param cwd - Session workspace directory used for relative paths.
 * @param target - Client-supplied path in the session's namespace.
 * @returns The canonical absolute path used for the filesystem operation.
 */
export async function ensureWorkspacePath(cwd: string, target: string): Promise<string> {
  const absolute = requireAbsolute(resolve(cwd, resolveSessionPath(cwd, target)))
  return resolveRealPath(absolute, 'target')
}

/**
 * Validate a write destination, including destinations that do not exist yet.
 * Existing targets are resolved to catch symlinks; missing targets are checked
 * against the nearest existing ancestor before the caller creates or renames.
 * The returned path is rebuilt from that canonical ancestor, so an existing
 * symlink is never left in the path passed to the write operation.
 *
 * Relative paths use the Session workspace as their base, while absolute paths
 * may point anywhere on the host.
 *
 * @param cwd - Session workspace directory used for relative paths.
 * @param target - Client-supplied destination path in the session's namespace.
 * @returns A canonical path for an existing target or its nearest existing ancestor.
 */
export async function ensureWorkspaceWritePath(cwd: string, target: string): Promise<string> {
  const absolute = requireAbsolute(resolve(cwd, resolveSessionPath(cwd, target)))
  let existingPath = absolute
  const missingSegments: string[] = []

  for (;;) {
    try {
      const realTarget = await realpath(existingPath)
      return missingSegments.reduce((path, segment) => join(path, segment), realTarget)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof SidebarError) throw error
        throw new SidebarError('fs-error', `cannot resolve target "${existingPath}": ${error instanceof Error ? error.message : String(error)}`, 400)
      }
      const parent = dirname(existingPath)
      if (parent === existingPath) {
        throw new SidebarError('fs-error', `cannot resolve target "${absolute}"`, 400)
      }
      missingSegments.unshift(basename(existingPath))
      existingPath = parent
    }
  }
}
