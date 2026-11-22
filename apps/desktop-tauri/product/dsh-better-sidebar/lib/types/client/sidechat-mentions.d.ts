/**
 * Inline-code file mentions for the Side Chat transcript — the plugin-side
 * mirror of the host's produced-path vocabulary
 * (`ui-deliverables/turn-deliverables.ts`, `producedFileMentions`).
 *
 * The main conversation makes `` `src/client/api.ts` `` clickable because the
 * chat view hands `MarkdownText` a resolver over the paths the turn PRODUCED.
 * The side chat rendered the same answers as dead code, and the host's resolver
 * is deliberately cheap: it never stats the filesystem, it only matches the
 * turn's produced/delivered paths and declines an ambiguous basename. A compact
 * transcript can rebuild exactly that vocabulary from its own rows, which is
 * what this module does — no request per token, no guess at what "looks like" a
 * path.
 *
 * Only two row shapes carry evidence of production, and only the MUTATION tools
 * count (see {@link MUTATION_PATH_KEYS}):
 * - a successful `write` / `edit` / `str_replace_editor` call's target path,
 * - a `deliverables` row (`files[].path`, the authoritative delivery record).
 */
import type { SidechatTranscriptRow } from './sidechat-transcript.ts';
/**
 * Every path this thread produced, in first-seen order and deduplicated: the
 * target of a successful (`failed !== true`) mutation call, plus every
 * delivered file. Nothing else — see {@link MUTATION_PATH_KEYS}.
 * @param rows - the thread's mapped transcript rows.
 * @returns the produced paths exactly as the producing row spelled them
 * (relative call arguments stay relative; delivery events are absolute).
 */
export declare function producedFilePaths(rows: readonly SidechatTranscriptRow[]): string[];
/**
 * The produced path one inline-code token names, or undefined when it names
 * none — the token must equal the path or its basename, and EXACTLY ONE
 * produced path may match (two `dup.ts` under different directories are
 * ambiguous, so the token stays inert rather than opening a guess).
 * @param paths - the thread's produced paths ({@link producedFilePaths}).
 * @param token - the authored inline-code text, exactly as written.
 * @returns the matching produced path, or undefined for an inert token.
 */
export declare function resolveProducedPath(paths: readonly string[], token: string): string | undefined;
