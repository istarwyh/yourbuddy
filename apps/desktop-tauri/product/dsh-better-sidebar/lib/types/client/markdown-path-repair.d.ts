/**
 * Check whether a path uses a Windows drive or UNC absolute-path form.
 *
 * @param path - Path received from the host Markdown renderer
 * @returns Whether the path is absolute in Windows syntax
 */
export declare function isWindowsAbsolutePath(path: string): boolean;
/**
 * Build Windows path candidates by restoring separators before Markdown punctuation.
 *
 * @param path - The decoded path received from the host Markdown renderer.
 * @returns Candidate paths, or an empty list when the path is not Windows-absolute
 *   or contains more than eight punctuation positions.
 */
export declare function markdownPathRepairCandidates(path: string): string[];
