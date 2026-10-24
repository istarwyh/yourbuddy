/** File types whose shipped DSH reader replaces the workbench's binary download pane. */
const DOCUMENT_EXTENSIONS: ReadonlySet<string> = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'])

/**
 * Whether a file uses the existing PDF, Office, or Excel reader.
 * @param path - Absolute or Session-relative file path, with either path separator.
 * @returns true for a supported document extension; dotfiles remain ordinary files.
 */
export function isNativeDocumentPath(path: string): boolean {
  const name = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 && DOCUMENT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}
