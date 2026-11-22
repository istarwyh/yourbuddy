/**
 * The HTML preview iframe shared by the editor's html viewer and the changes
 * tab. In a normal web deployment it is the historical route-src frame. In the
 * desktop shell with the sandbox ON it must be self-contained: the shell
 * rejects every `dsh-app:` request from an opaque-origin subframe (#1143),
 * so the trusted top frame fetches the document and its local resources,
 * rewrites them through `html-preview-inline.ts`, and frames the result as a
 * sandboxed `blob:` document. The sandbox attribute never gains
 * `allow-same-origin`.
 */
import { type ReactNode } from 'react';
/** One preview frame; `src` is the route URL of the saved HTML file. */
export interface HtmlPreviewFrameProps {
    /** Absolute (or page-relative) `/sidebar/html/...` URL. */
    src: string;
    title: string;
    className?: string;
    /** Whether the sandbox attribute is applied. Off is the explicit unsafe
     *  escape hatch owned by the editor settings; the changes surface always
     *  sandboxes. */
    sandboxed: boolean;
    /** The page base; injected for tests. Defaults to `hostHttpBase()`. */
    baseUrl?: string;
}
/**
 * Render the HTML preview. Browser / unsandboxed desktop: route-src iframe,
 * exactly as before. Sandboxed desktop: fetch the saved document and its local
 * assets from the top frame, then frame an inlined blob. A fetch failure falls
 * back to route-src rather than inventing a new error surface.
 */
export declare function HtmlPreviewFrame(props: HtmlPreviewFrameProps): ReactNode;
