/** Path containment for already canonicalized workspace and artifact directories. */
import path from 'node:path'

/** @param workspace - Canonical workspace. @param folder - Canonical artifact directory.
 * @param paths - Native, POSIX, or Windows path operations. @returns Whether folder is within workspace. */
export function isWithinWorkspace(workspace, folder, paths = path) {
  const relative = paths.relative(workspace, folder)
  return relative !== '..' && !relative.startsWith(`..${paths.sep}`) && !paths.isAbsolute(relative)
}
