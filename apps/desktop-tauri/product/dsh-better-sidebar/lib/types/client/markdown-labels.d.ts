/**
 * Chrome labels for DSH's shared `MarkdownText` (DSH
 * 0.1.2-alpha contract): the renderer takes a REQUIRED nested `labels` prop
 * — `labels.code.copyLabel` / `labels.code.copiedLabel` for the fence copy
 * buttons plus a screen-reader-only `labels.footnotes` heading — and the
 * MarkdownText/CodeBlock are cordis-free, falling back to HARDCODED Chinese
 * when the labels are omitted, so every render site threads the plugin
 * dictionary's localized pair through here.
 * `footnotes` is left empty (the heading is sr-only; give it a real string
 * only if a locale key ever earns its place in all 19 dictionaries).
 *
 * The nested object is built ONCE per distinct set of label VALUES
 * ({@link cachedLabels}): `MarkdownText` is memoized on the `labels` identity
 * (its streaming render cache is dropped when the identity changes), so a
 * fresh object per render re-parsed every markdown row on every parent
 * re-render — a composer keystroke or one streaming push. Callers pass a
 * plain value bag and may build that bag inline; identity is never the key.
 *
 * DSH 0.1.7-rc.1 added `labels.code.toolbarLabels` (language name + wrap
 * toggle + copy). Supplying it is what swaps the legacy info-string banner for
 * the host's code card, and the three strings are REQUIRED once supplied, so
 * every site that builds the flat pair has to carry them too — the code card
 * must look the same in the transcript, the diff card and the editor preview as
 * it does in DSH's own chat.
 */
import type { ComponentProps } from 'react';
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';
/** The code-card chrome the plugin threads through its own props (e.g.
 *  MermaidMarkdownProps.codeLabels — the chunk contract carries the same
 *  fields). */
export interface MarkdownCopyLabels {
    copyLabel: string;
    copiedLabel: string;
    /** Code-card title for an absent or unsupported language. */
    codeLabel: string;
    /** Code-card action that enables wrapping. */
    wrapLabel: string;
    /** Code-card action that preserves source columns with horizontal scrolling. */
    unwrapLabel: string;
}
/** The nested `labels` prop the host renderer takes. */
type HostMarkdownLabels = ComponentProps<typeof MarkdownText>['labels'];
/**
 * The identity-stable nested host `labels` for one label-value set — the same
 * object {@link markdownTextProps} threads into `MarkdownText`, exported for the
 * host cards that render markdown of their OWN (the web card renders the
 * provider's answer through `MarkdownText` and takes these labels directly).
 * @param labels - the flat plugin label bag.
 * @returns the nested host label object (cached by value).
 */
export declare function markdownLabels(labels: MarkdownCopyLabels): HostMarkdownLabels;
/** MarkdownText props carrying the nested chrome labels, an optional page-base
 *  image resolver, and — for a surface whose transcript knows which files the
 *  thread produced — the inline-code file-mention vocabulary (`MarkdownText`
 *  links a token only through it; omitting it leaves every token inert code).
 *  The resolver's IDENTITY is a render-cache key inside `MarkdownText`, so
 *  callers memoize it per vocabulary CONTENT instead of rebuilding it on every
 *  render. */
export declare function markdownTextProps(text: string, labels: MarkdownCopyLabels, pathImages?: ComponentProps<typeof MarkdownText>['pathImages'], fileMentions?: MarkdownFileMentions): ComponentProps<typeof MarkdownText>;
export {};
