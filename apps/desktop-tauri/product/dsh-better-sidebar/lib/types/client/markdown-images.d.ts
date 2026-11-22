/**
 * Local-image resolution for the plugin's markdown surfaces.
 *
 * The shared `MarkdownText` renders absolute http(s) image destinations as
 * authored; a local destination (an image-relative `./img.png`, an absolute
 * `/cwd/img.png`, or a reference definition) is handed to the owner's
 * `pathImages` vocabulary, and only a miss falls back to the documented alt
 * text. That is the DSH renderer's sanctioned rewrite hook: the owner maps an
 * authored destination to a displayable absolute URL it vouches for.
 *
 * The base is what has to change for the desktop shell. Its page origin is
 * `dsh-app://app/` while the Host listens on another origin
 * (`__DSH_TRANSPORT__.streamBaseUrl`): an absolute http URL built from that
 * transport base is a CROSS-SITE subresource, so the Host's Connection fence
 * rejects it (403) and the image falls back to alt text. Two shapes survive:
 *
 * - **Browser** (page base is http(s)): the plugin's own `/sidebar/file`
 *   media route on the page base — same-origin as before, reverse-proxy
 *   prefix included.
 * - **Desktop shell** (page base is `dsh-app://app/`): the Host's
 *   authenticated `api/file?path=` route on the page base. The shell forwards
 *   every non-static `dsh-app://app/*` request to the Host with the launch
 *   cookie, and `dsh-app://app/api/file?...` is the one local-file URL shape
 *   the renderer's image vocabulary accepts. The built-in document preview
 *   resolves its markdown images the same way.
 *
 * Raw HTML leaves (`<img src="./x.png">`) are different: they render as plain
 * DOM elements, not through `MarkdownText`, so {@link resolveLocalMediaDest}
 * hands them the plugin media route on the page base directly — a plain
 * `<img>` has no protocol vocabulary to satisfy.
 */
import type { MarkdownPathImages } from '@deepseek-ai/dsh-client-ui-primitives';
import type { SessionScope } from './api.ts';
/**
 * The local path of an authored `file:` URL, or undefined when the
 * destination is not a well-formed file URL. This is how a Markdown file can
 * name a local image with the browser's own file-URL spelling
 * (`file:///C:/pics/a.png`, `file:///home/me/a.png`) without the preview ever
 * handing the `file:` scheme to the renderer: the path goes through the same
 * session media route as every other local image. VSCode's Markdown preview
 * does the equivalent through its webview resource provider.
 *
 * A non-empty host is a UNC path (`file://server/share/a.png` ->
 * `//server/share/a.png`); `localhost` is the local machine. Query and hash
 * are not part of a local filename and are dropped.
 * @param destination - One authored image destination.
 * @returns The local path, or undefined when this is not a file URL.
 */
export declare function fileUrlToLocalPath(destination: string): string | undefined;
/**
 * Collapse `.`/`..` segments of an absolute local path, preserving its root
 * (POSIX `/`), its Windows drive (`C:\`), or its UNC `\\server\share`
 * prefix. The host's `requireAbsolute` (`path.resolve`) normalizes anyway,
 * but producing a canonical path here keeps the media URLs clean.
 * Shared with the markdown navigation resolver (`markdown-navigation.ts`),
 * which canonicalizes a claimed link target the same way.
 */
export declare function normalizeLocalPath(path: string): string;
/**
 * The absolute local target of one markdown destination, or undefined when
 * the destination is not a local path this vocabulary serves. Relative
 * destinations resolve against the opened file's own directory; remote URLs,
 * `#`-anchors, empty destinations and queries are refused (the renderer keeps
 * its alt-text fallback for those).
 * The result may still be RELATIVE when the opened file's path is relative
 * (an editor tab opened from a chat address can carry a workspace-relative
 * path). The plugin media route accepts that together with `cwd`; the desktop
 * shell's host file route does not — see {@link absoluteTarget}.
 * @param destination - One decoded image destination.
 * @param filePath - The path of the opened `.md` file.
 * @returns The normalized target path, or undefined.
 */
export declare function markdownImageTarget(destination: string, filePath: string): string | undefined;
/**
 * Absolute URL of the plugin's session media route for one local image,
 * resolved against the page base (browser deployments).
 * @param target - Local image path (absolute, or relative to `scope.cwd` when
 * the opened file itself carries a workspace-relative path).
 * @param scope - The session scope (sessionId + cwd) for the media route.
 * @param baseUrl - The page base (`hostHttpBase()`); injected for pure tests.
 * @returns The absolute media URL.
 */
export declare function markdownMediaUrl(target: string, scope: SessionScope, baseUrl: string): string;
/**
 * Absolute URL of the Host's authenticated file route on the page base — the
 * only local-file image shape the desktop shell page can display (see the
 * module comment).
 * @param target - Absolute local path of the image.
 * @param baseUrl - The page base (`dsh-app://app/`); injected for pure tests.
 * @returns The absolute file URL.
 */
export declare function desktopFileUrl(target: string, baseUrl: string): string;
/**
 * Build the `pathImages` vocabulary for one markdown surface: `MarkdownText`
 * asks it for an authored local image destination and gets back a displayable
 * absolute URL on the page base, so the same code works in a browser and in
 * the desktop shell. An authored `data:image/` URI is passed through as-is;
 * every other `data:` payload stays rejected.
 * @param scope - The session scope (sessionId + cwd) for the plugin media route.
 * @param filePath - The path of the opened `.md` file (may be workspace-relative).
 * @param baseUrl - The page base; defaults to `hostHttpBase()`.
 * @returns The owner's local-path image vocabulary.
 */
export declare function createMarkdownPathImages(scope: SessionScope, filePath: string, baseUrl?: string): MarkdownPathImages;
/**
 * Resolve one raw-HTML media destination to a displayable URL: local
 * (relative or absolute) paths become absolute page-base `/sidebar/file` URLs,
 * while remote URLs, `#`-anchors and empty destinations are returned
 * untouched. Used by the preview's raw-HTML sanitizer (`MarkdownHtml.tsx`),
 * whose `<img src>` renders as plain DOM; markdown-syntax images go through
 * {@link createMarkdownPathImages} instead.
 * @param dest - One `src`/`poster` value from the sanitized HTML.
 * @param scope - The session scope (sessionId + cwd) for the media route.
 * @param filePath - The path of the opened `.md` file (may be workspace-relative).
 * @param baseUrl - The page base (`hostHttpBase()`); injected for pure tests.
 * @returns The rewritten source (untouched for remote/anchor/empty values).
 */
export declare function resolveLocalMediaDest(dest: string, scope: SessionScope, filePath: string, baseUrl: string): string;
/**
 * Rewrite markdown image destinations that point at local files into
 * absolute `/sidebar/file` media URLs. Relative destinations resolve against
 * the opened file's directory (normalizing `.`/`..` segments); absolute
 * local paths pass through. Remote (http/https/data/mailto) and `#`-anchor
 * destinations are left untouched for `MarkdownText`. Reference-style images
 * (`![x][id]` + `[id]: url`) are covered by rewriting their definition lines.
 * A destination may be angle-delimited (`![a](<./cat image.png>)`) and an
 * inline image may carry a title (`![a](./x.png "title")`); the delimiter and
 * title are preserved while only the destination is rewritten.
 *
 * Code regions — inline spans AND fenced blocks, the latter opened by ``` ``` ```
 * OR `~~~` (see `markdown-code.ts`, the mask both source rewriters share) — are
 * masked before rewriting so documentation that demonstrates `![alt](./img.png)`
 * is not mutated into a `/sidebar/file` URL. Reference definitions are only
 * rewritten when their label is actually referenced by an image (collapsed
 * `[![][id]]`, full `![alt][id]`, or shortcut `![]` referencing the next
 * definition) — a plain link `[text][id]` must not have its destination
 * redirected to the media route.
 * @param text - The raw markdown source (inline + reference images).
 * @param scope - The session scope (sessionId + cwd) for the media route.
 * @param filePath - The absolute path of the opened `.md` file.
 * @param baseUrl - The injected transport base (`hostTransportBase()` in the
 * renderers); injected so the core rewrite stays pure and unit-testable.
 * @returns The markdown with local image destinations rewritten in place.
 */
export declare function rewriteLocalImageUrls(text: string, scope: SessionScope, filePath: string, baseUrl: string): string;
/**
 * The prose counterpart of {@link rewriteLocalImageUrls}: a rendered
 * conversation row is not a file, so its relative destinations resolve
 * against the session workspace root instead of an opened document's
 * directory. Absolute local paths, remote URLs and code masking behave
 * exactly like the file variant (the shared MarkdownText only renders an
 * image whose destination is absolute http(s), so a local destination would
 * otherwise fall back to its alt text).
 * @param text - The markdown source of one prose row.
 * @param scope - The session scope (sessionId + cwd) for the media route.
 * @param cwd - The session workspace root; relative destinations resolve
 * against it (and stay untouched when it is unknown).
 * @param baseUrl - The injected transport base.
 * @returns The markdown with local image destinations rewritten in place.
 */
export declare function rewriteProseLocalImageUrls(text: string, scope: SessionScope, cwd: string | undefined, baseUrl: string): string;
