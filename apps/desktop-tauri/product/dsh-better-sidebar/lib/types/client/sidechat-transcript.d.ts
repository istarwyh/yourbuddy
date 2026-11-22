/**
 * Side Chat transcript mapping (browser half): turns a thread child's own
 * events (`sidechat.events` — the plugin route, which reads the log without
 * activating the child and cuts the inherited seed host-side) into compact
 * display rows.
 *
 * A thread child's log starts with the ENTIRE inherited parent log as its
 * fork seed. The route already cuts everything up to the last tagged
 * `session/end-seed { inherited: true }` marker; the mapping re-applies the
 * same cut (never a restore/replay lifecycle marker) so any
 * seed event that somehow crosses the wire still never renders, and maps
 * context injections (the "Side conversation boundary" prompt,
 * plugin-sourced context) onto a collapsible injection row, so the view
 * shows only the thread's own conversation.
 *
 * Live streaming: `assistant/message` events only land when a step
 * completes, but the host's `assistant/live-chunk` rows stream token-level
 * text and reasoning deltas (DSH 0.1.5 publishes them outside the session
 * log — see assistant-live.ts). The mapping accumulates both per block and
 * supersedes them with the assembled message once it lands (settled rows).
 *
 * Failures: a provider/agent error used to end a turn with nothing on screen.
 * The terminal `turn/end` reason and a failed attempt's embedded finish chunk
 * both map onto one visible `error` row per turn.
 *
 * Deliveries: a `present` call maps onto a compact deliverables card, and the
 * authoritative `deliverables/presented` event the tool appends attaches to
 * that card by `callId` — or stands alone when the call row is outside the
 * events route's head cap. One card per call; a FAILED call replaces its card
 * with the generic failed tool row. (The host's own `PresentRow` is a status
 * disclosure row over the call — its delivery cards come from the turn-tail
 * deliverables, not from the call itself.)
 */
import type { DiffHunk, ReadBlockLine, SearchBlockProps, WebBlockProps } from '@deepseek-ai/dsh-client-ui-primitives';
import { type SidechatImageOccurrence } from '../sidechat-images.ts';
import type { SidebarHistoryEntry } from '../context-types.ts';
/** {@link Omit} that distributes over a union, so a discriminated props union
 *  keeps its `kind` discriminant (the host's card models use the same trick). */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
/** The host `SearchBlock` props minus the render site's own fields. */
export type SidechatSearchCard = DistributiveOmit<SearchBlockProps, 'labels' | 'className'>;
/** The host `WebBlock` props minus the render site's own fields. */
export type SidechatWebCard = DistributiveOmit<WebBlockProps, 'labels' | 'className'>;
/**
 * Structured render payload for a tool row that maps onto one of the host's
 * ui-primitives Blocks (the same atoms the main conversation renders). Derived
 * defensively from raw `tool/call` arguments and `tool/result` `meta` — the
 * producing tool owns the meta shape, so every field is narrowed and any
 * malformed input silently falls back to the generic text row.
 */
export type SidechatToolCard = {
    type: 'terminal';
    command: string;
    cwd?: string;
    output?: string;
    exitCode?: number;
    signal?: string;
} | {
    type: 'diff';
    diffs: DiffHunk[];
} | {
    type: 'read';
    label: string;
    lines: ReadBlockLine[];
    totalLines: number;
    lang?: string;
}
/** grep / glob: the host SearchBlock, in its `matches` or `paths` shape. */
 | {
    type: 'search';
    card: SidechatSearchCard;
}
/** web_search / web_fetch: the host WebBlock, in its `search` or `fetch` shape. */
 | {
    type: 'web';
    card: SidechatWebCard;
};
/** One file a `present` call delivered: its path (absolute from the
 *  `deliverables/presented` event, session-relative from the call arguments)
 *  plus the model's own description when it wrote one. */
export interface SidechatDeliverable {
    path: string;
    description?: string;
}
/** One compact transcript row rendered in the thread view. `seq` is the
 *  source event's log sequence. Text/reasoning also retain the original
 *  content-block index: one event can yield several rows, so seq alone is
 *  not a unique React key across polls. */
export type SidechatTranscriptRow = 
/** `messageId` is the durable message identity the log records on the event
 *  (`data.id`); the view uses it to dedupe a still-pending inbox row against
 *  the durable row the claim eventually writes. Older logs may lack it. */
{
    kind: 'user';
    seq: number;
    text: string;
    messageId?: string;
    /** Upstream's projected image occurrences (side-chat images). */
    images?: SidechatImageOccurrence[];
    /** The message's `file` blocks, in content order (a bubble is one visual
     *  unit, so they ride the row instead of becoming siblings). */
    attachments?: readonly SidechatAttachment[];
}
/** A context injection (the side boundary prompt + the parked in-progress
 *  snapshot, or any plugin-sourced context): rendered as one collapsible
 *  row, never as a user bubble. */
 | {
    kind: 'injection';
    seq: number;
    text: string;
}
/** A provider/agent FAILURE, which used to end a turn silently: either a
 *  `turn/end` carrying `reason.kind === 'error'` or a failed
 *  `assistant/attempt` (its stream's terminal `finish` chunk). One row per
 *  turn — the attempt error and the turn/end that follows it are the same
 *  failure. */
 | {
    kind: 'error';
    seq: number;
    text: string;
}
/** `settled` distinguishes an assembled message from a still-streaming
 *  chunk accumulation. Original content-block indexes are never compacted;
 *  a live chunk that lacks a valid index keeps it undefined. */
 | {
    kind: 'assistant';
    seq: number;
    text: string;
    settled: boolean;
    contentBlockIndex?: number;
} | {
    kind: 'reasoning';
    seq: number;
    text: string;
    settled: boolean;
    contentBlockIndex?: number;
    /** The turn this row belongs to, when the log records one (the view groups
     *  a Turn's work rows by it). */
    turn?: number;
    /** True when that turn already ended (`turn/end` landed): its work rows are
     *  settled and may be folded shut. */
    turnEnded?: boolean;
} | {
    kind: 'tool';
    seq: number;
    name: string;
    failed: boolean;
    /** Raw arguments JSON as the model produced it. */
    args?: string;
    /** Plain text of the paired result. */
    resultText?: string;
    /** True while the call's result has not landed yet. */
    executing?: boolean;
    /** Structured render payload (host Block atoms); absent = generic row. */
    card?: SidechatToolCard;
    /** `image` / `file` blocks of the paired result's content list. */
    resultAttachments?: readonly SidechatAttachment[];
    /** The turn this call belongs to, and whether that turn already ended (see
     *  `reasoning.turn`). */
    turn?: number;
    turnEnded?: boolean;
}
/** One `present` delivery (a compact deliverables card instead of a tool
 *  row). A `deliverables/presented` event with the same `callId` REPLACES
 *  the call's arguments copy — one card per call, never two, whichever
 *  event lands first. An event with no call row in the window (an
 *  event-only delivery) still gets its own. A FAILED present call delivered
 *  nothing and renders as the generic failed tool row instead. */
 | {
    kind: 'deliverables';
    seq: number;
    callId?: string;
    files: readonly SidechatDeliverable[];
}
/** One turn's tail metrics, emitted at `turn/end`: the turn's token usage
 *  (aggregated from `assistant/message.usage`) and wall duration (envelope
 *  time delta from `turn/start`), whichever are computable. */
 | {
    kind: 'turnSummary';
    seq: number;
    /** The turn these metrics belong to (the view's work-details control reads
     *  its duration from here). */
    turn?: number;
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
}
/** A turn that ended WITHOUT a normal completion, so the transcript says why
 *  it stops there instead of looking deliberately finished: the reader (or
 *  the agent) stopped it (`aborted`), or the output limit cut it
 *  (`max-tokens`). One row per turn — the attempt's terminal finish reason and
 *  the `turn/end` that repeats it are the same event. */
 | {
    kind: 'terminal';
    seq: number;
    reason: 'aborted' | 'max-tokens';
}
/** One `image` / `file` content block of an ASSISTANT message, rendered in
 *  block order: the assistant branch explodes a message per content block, so
 *  an attachment needs its own row to keep that order. A USER message keeps
 *  its blocks on the message's own row (`user.attachments`) — the bubble is
 *  one visual unit. */
 | {
    kind: 'attachment';
    seq: number;
    attachment: SidechatAttachment;
    contentBlockIndex?: number;
}
/** One compaction transaction, drawn at its landed CHECKPOINT (host parity:
 *  no checkpoint, no node). `text` is the summary body the row publishes
 *  behind its disclosure (`''` when the metering event is outside the
 *  window); the counts come from that same metering event, so they are null
 *  whenever it is. */
 | {
    kind: 'compaction';
    seq: number;
    text: string;
    summary: string | null;
    shadowedItemCount: number | null;
    shadowedTokenCount: number | null;
}
/** One model-request retry CHAIN (`retryId`), folded like the host: every
 *  further attempt updates this row, which keeps the chain's first seq. */
 | {
    kind: 'retry';
    seq: number;
    retry: number;
    maxRetries?: number;
    delayMs?: number;
    provider?: string;
    state: 'scheduled' | 'started';
    failureMessage?: string;
};
/**
 * One image content block the transcript must show. The bytes are NOT part of
 * the log — only the id is — so the read goes through the host Remote with the
 * THREAD's own session id (see `SidechatAttachments`); a `uiConversation`
 * image URL is never the source.
 */
export interface SidechatImageAttachment {
    /** Opaque host id — the only key a byte read may use. */
    attachmentId: string;
    /** The image's media type (becomes the Blob's `type`). */
    mediaType: string;
    /** The producer's file name, when it recorded one (the thumbnail's alt). */
    name?: string;
}
/** One non-image file the model was given: a chip, never a byte read. */
export interface SidechatFileAttachment {
    name: string;
    /** Byte count for the size chip (absent when the producer recorded none). */
    bytes?: number;
}
/** An `image` or `file` content block, narrowed to what the transcript renders. */
export type SidechatAttachment = {
    kind: 'image';
    image: SidechatImageAttachment;
} | {
    kind: 'file';
    file: SidechatFileAttachment;
};
/** Compact token count the way the main conversation prints usage
 *  (517 / 12.2K / 1.2M — the host's own formatter is not exported). */
export declare function formatTokens(n: number): string;
/** Compact duration the way the main conversation prints run times
 *  (45.2s / 2m42s — sub-minute keeps one decimal). */
export declare function formatDurationMs(ms: number): string;
/** Extract the visible text of a content-block list (`text` blocks verbatim,
 *  joined by blank lines); empty reads `…` so rows never render blank. */
export declare function blockText(content: readonly unknown[]): string;
/**
 * One-line summary of a tool call's raw arguments JSON for the collapsed row:
 * the first identifying string field when the JSON parses, else (an object with
 * none of those keys) the first string/array field, else nothing at all.
 *
 * The raw JSON is NEVER the answer for a parsed object — a collapsed row that
 * reads `{"custom":"v"}` tells the reader nothing they can scan. Raw text still
 * serves the one case where it is all there is: arguments that are not an
 * object at all (unparsable, or a bare array/literal), and an object that HAS an
 * identifying key but left it blank (the key is the tool's own vocabulary, so
 * the arguments themselves are the honest summary). Empty when there is nothing
 * worth showing.
 */
export declare function toolArgsSummary(args: string | undefined): string;
/** Parse the tool's raw arguments JSON to an object, or undefined (malformed
 *  JSON, a non-object, or an absent argument string). Shared with the file-
 *  mention vocabulary, which reads the same arguments. */
export declare function parseArgsObject(args: string | undefined): Record<string, unknown> | undefined;
/**
 * Map a thread child's history rows onto compact transcript rows: the
 * inherited fork seed is cut at the last `session/end-seed`, context
 * injections map onto a collapsible injection row, `assistant/live-chunk`
 * deltas accumulate into streaming rows per (turn, step, block) and are
 * superseded by the assembled `assistant/message`, and tool invocations
 * render one expandable line each (arguments, paired result text, failure
 * marker; a still-executing call is marked until its result lands). A failed
 * turn renders exactly one `error` row — the attempt's stream error and the
 * `turn/end` reason are the same failure.
 * @param entries - history rows (event + host-computed view) in seq order,
 *   the live deltas of the in-flight attempt appended after the durable tail.
 * @returns display rows in log order.
 */
export declare function transcriptRows(entries: readonly SidebarHistoryEntry[], prev?: readonly SidechatTranscriptRow[]): SidechatTranscriptRow[];
/** A single assistant event can have multiple text/reasoning blocks. Keep the
 * original block index (including skipped blocks), not a filtered row index. */
export declare function sidechatRowKey(row: SidechatTranscriptRow): string;
export {};
