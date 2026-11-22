/**
 * Desktop-shell HTML preview inlining.
 *
 * The shell only injects its `x-dsh-desktop-renderer` header for a subframe
 * whose origin is literally `dsh-app://app`; a sandboxed HTML preview frame is
 * an opaque origin, so both the document navigation and every resource it
 * requests from `dsh-app:` are rejected by the shell before they reach the
 * plugin's routes (#1143). The sanctioned shape (the host's own document
 * preview uses it) is a self-contained document in a sandboxed `blob:` frame:
 * the trusted top frame fetches the HTML and its local resources through the
 * plugin routes, rewrites them to `data:` URLs / inline style and script
 * blocks, and the frame then needs no `dsh-app:` request at all.
 *
 * This module is pure on purpose (no fetch, no React): the caller supplies
 * `fetchResource`, so the resolution and rewriting rules are unit-testable and
 * the component owns transport, aborting and object-URL lifetime.
 *
 * Only same-origin resources are inlined. External http(s) URLs, `data:`,
 * `blob:` and `file:` are left exactly as authored; a failed local fetch also
 * leaves the authored reference (the page still renders, the one resource
 * may not). The returned document is always UTF-8 and keeps the route's
 * `object-src 'none'` defense as a meta CSP; the iframe sandbox attribute
 * remains the primary boundary (no `allow-same-origin` is ever added).
 */
/** One fetched local resource, already in memory. */
export interface InlineResource {
    readonly bytes: Uint8Array;
    readonly mediaType: string;
}
/**
 * Fetch one same-origin resource. The caller decides how (the component uses
 * `fetch` with same-origin credentials and an abort signal); returning
 * undefined means "leave the authored reference alone".
 */
export type FetchInlineResource = (url: string) => Promise<InlineResource | undefined>;
/**
 * Resolve a same-origin resource reference. Returns undefined for empty /
 * fragment destinations, external origins, and every non-http(s)/non-custom
 * protocol this preview cannot inline.
 */
export declare function inlineableUrl(reference: string, baseUrl: string): URL | undefined;
/** Base64 in bounded chunks so a multi-megabyte asset cannot overflow the
 *  argument stack through `String.fromCharCode(...bytes)`. */
export declare function bytesToBase64(bytes: Uint8Array): string;
/**
 * Build the self-contained document for one HTML file.
 * @param html - The authored HTML text.
 * @param documentUrl - The file's absolute route URL (the base for relatives).
 * @param fetchResource - Same-origin resource fetcher (injected; may fail).
 * @returns The rewritten, UTF-8, self-contained HTML.
 */
export declare function inlineHtmlDocument(html: string, documentUrl: string, fetchResource: FetchInlineResource): Promise<string>;
