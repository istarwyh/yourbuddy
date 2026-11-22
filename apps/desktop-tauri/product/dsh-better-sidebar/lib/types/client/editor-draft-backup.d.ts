/**
 * Durable backups of unsaved editor drafts.
 *
 * Why this exists: the two host-owned paths that can take an editor tab away
 * without asking are not interceptable with a confirmation.
 *
 * - The native right column's tab strip (its × / middle click / context menu /
 *   page.close) runs `ctx.sidebarRight.registerCloseHandler` before removing
 *   the record, but that hook is a synchronous CLEANUP callback
 *   ("Failure preserves the tab"), not a confirmation channel: vetoing means
 *   throwing, which the host logs as "Sidebar tab close failed:" and which
 *   escapes from `replaceTab` and the public `close()` callers. It may flush a
 *   draft, never ask.
 * - The Desktop shell quits on its own (Electron main intercepts `before-quit`
 *   and the page receives no cancellable quit event), so Cmd+Q cannot show a
 *   page-level prompt either.
 *
 * The remaining protection is to keep the draft somewhere that survives both:
 * a small localStorage entry keyed by `sessionId::path`, offered back when the
 * same file is opened again (TextEditor shows the restore prompt).
 *
 * Cost rules (steady-state):
 * - Writing is a single trailing throttle armed only by an edit and disarmed
 *   by the flush; idle tabs hold no timer and no polling is added.
 * - At most {@link DRAFT_BACKUP_LIMIT} drafts and {@link DRAFT_BACKUP_TOTAL_CHARS}
 *   characters live in storage; the oldest entry is evicted first (FIFO).
 * - A draft larger than {@link DRAFT_BACKUP_CHARS} is not stored at all (a
 *   single entry would evict the whole budget).
 * - An entry is deleted the moment its draft stops being unsaved (save, or a
 *   confirmed discard) and when the throttle is cleared.
 */
/** How many drafts are kept (oldest evicted first). */
export declare const DRAFT_BACKUP_LIMIT = 8;
/** Longest draft persisted, in characters; bigger drafts are skipped. */
export declare const DRAFT_BACKUP_CHARS = 200000;
/** Total characters across all kept drafts. */
export declare const DRAFT_BACKUP_TOTAL_CHARS = 600000;
/** Delay after an edit before the draft is written. */
export declare const DRAFT_BACKUP_THROTTLE_MS = 1000;
/** Write every pending draft now (the close / unload flush). */
export declare function flushDraftBackups(): void;
/**
 * Remember one mounted editor's live text and return its disposer.
 *
 * The reader runs at flush time and must answer `null` once its editor is
 * gone, so a flush after an unmount can never write a destroyed view's text.
 * @param sessionId - the session owning the tab.
 * @param path - the file the draft belongs to.
 * @param read - the live document's text, or null.
 * @param readBase - the mtime the live document is based on, stored with the draft.
 * @returns the disposer (idempotent; a newer source for the same file wins).
 */
export declare function registerDraftSource(sessionId: string, path: string, read: () => string | null, readBase?: () => number | null): () => void;
/**
 * Mark one draft as changed; a single shared throttle writes the pending set
 * once {@link DRAFT_BACKUP_THROTTLE_MS} has passed since the first change.
 * @param sessionId - the session owning the tab.
 * @param path - the file the draft belongs to.
 */
export declare function scheduleDraftBackup(sessionId: string, path: string): void;
/** Whether two spellings are the SAME document — byte-equal, or equal once
 *  line endings are normalized CRLF/CR → LF. Line endings are not content:
 *  CodeMirror keeps every document with `\n` endings whatever the file used,
 *  so the live document of a freshly opened CRLF file differs from the bytes
 *  it was loaded from by line endings alone. */
export declare function sameDocument(a: string, b: string): boolean;
/**
 * The pending draft of one file, if its content differs from the bytes on
 * disk (line endings aside, see {@link sameDocument}); otherwise the stale
 * entry is dropped.
 * @param sessionId - the session owning the tab.
 * @param path - the file the draft belongs to.
 * @param content - the bytes just loaded from disk.
 * @returns the stored text, or null.
 */
export declare function readDraftBackup(sessionId: string, path: string, content: string): string | null;
/**
 * The mtime one file's stored draft was typed against.
 * @param sessionId - the session owning the tab.
 * @param path - the file the draft belongs to.
 * @returns the baseline, or undefined when the entry carries none.
 */
export declare function draftBackupBaseMtime(sessionId: string, path: string): number | undefined;
/** Drop one file's backup (saved, discarded, or restored). Idempotent. */
export declare function clearDraftBackup(sessionId: string, path: string): void;
