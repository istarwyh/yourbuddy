/**
 * Whether a file uses the existing PDF, Office, or Excel reader.
 * @param path - Absolute or Session-relative file path, with either path separator.
 * @returns true for a supported document extension; dotfiles remain ordinary files.
 */
export declare function isNativeDocumentPath(path: string): boolean;
