import type { SidebarHttpResponse } from './context-types.ts';
/** One satisfiable byte window, inclusive on both ends (`start <= end < size`). */
export interface ByteRange {
    start: number;
    end: number;
}
/**
 * Parse one `Range` request header against the file's size.
 *
 * Only the SINGLE-range form is honoured. A multi-range request
 * (`bytes=0-1,4-5`) is not a byte stream any more — it would need a multipart
 * body — so it is answered with the whole file (200), which is exactly what a
 * media element falls back to.
 *
 * @returns the window to send (206), `'unsatisfiable'` when the header asked
 *  for a window past EOF (the caller answers 416 with `content-range: bytes
 *  *\/size`), or `undefined` when there is nothing to honour (no header, a
 *  malformed one, or a unit other than bytes) — the caller then sends 200.
 */
export declare function byteRangeOf(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | undefined;
/**
 * Stream one file into the response with the given headers.
 *
 * The caller keeps ownership of every header except `content-length`, which is
 * derived from `size` here: browsers need it for a download's progress bar,
 * and the routes always have a fresh `stat` at hand.
 *
 * @param path - absolute path of the file to send (already fenced by the caller).
 * @param size - the file's size in bytes, from the same `stat` the caller ran.
 * @param res - the response face.
 * @param headers - status/type/disposition headers, written verbatim.
 * @param range - a window from {@link byteRangeOf}: the response becomes a 206
 *  with `content-range` and `content-length` restated for that window, which is
 *  what makes a `<video>` seek instead of buffering to EOF.
 * @throws {SidebarError} fs-error when the file cannot be opened — thrown
 *  BEFORE the header commits, so the caller's `writeError` still produces a
 *  proper envelope. After that this function never throws: the response is
 *  already committed and the connection is destroyed instead.
 */
export declare function streamFileToResponse(path: string, size: number, res: SidebarHttpResponse, headers: Record<string, string>, range?: ByteRange): Promise<void>;
