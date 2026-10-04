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
export declare function ensureWorkspacePath(cwd: string, target: string): Promise<string>;
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
export declare function ensureWorkspaceWritePath(cwd: string, target: string): Promise<string>;
