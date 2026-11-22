/** Bottom-workbench terminals consume the optional host terminal controller. */
import type { Context } from '../context-types.ts';
import type { ClientTerminals, TerminalView, TerminalViewState, TerminalViewIssue, TerminalLaunchShells } from '@deepseek-ai/dsh-api-terminal-controller/client';
import type { WebTerminalId, WebTerminalInfo, TerminalEnvironment, TerminalFrame, TerminalShell } from '@deepseek-ai/dsh-api-terminal-controller/types';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
export type { WebTerminalId };
export type HostTerminalInfo = WebTerminalInfo;
export type HostTerminalEnvironment = TerminalEnvironment;
export type HostTerminalFrame = TerminalFrame;
export type HostTerminalIssue = TerminalViewIssue;
export type HostRenderFrame = Extract<TerminalFrame, {
    type: 'snapshot' | 'output';
}>;
export type HostTerminalViewState = TerminalViewState;
export type HostSnapshot<T> = SnapshotStore<T>;
export type HostTerminalView = TerminalView;
export type HostShellChoice = TerminalShell;
export type HostShellCatalog = TerminalLaunchShells;
export type WebTerminalsFace = ClientTerminals;
/** Return the controller only when this deployment provides it.
 * @param ctx - client context.
 * @returns the registered controller, or undefined.
 */
export declare function webTerminals(ctx: Context): ClientTerminals | undefined;
/** The persisted `tab.meta` field identifying ONE terminal tab instance. */
export declare const INSTANCE_FIELD = "terminalInstance";
/**
 * The content identity of the bottom terminal at `run`.
 *
 * The host keys its recovery binding on `(sessionId, contentId)`, so a stable
 * value is what makes a page reload adopt the SAME host terminal instead of
 * allocating a new one. A "new terminal" (the run bump) deliberately changes
 * it: the old binding points at a process that is gone — a host restart, or a
 * terminal closed elsewhere — and reusing it would wedge the tab on
 * `missingTerminal` forever.
 *
 * The SAME value is the occurrence key the host memoizes one view by
 * (`view(sessionId, key, contentId)`), so a run bump has to move both: the
 * namespace is what keeps it from colliding with a host layout tab id (`tab1`).
 *
 * The bottom workbench hosts SEVERAL terminals (#774 follow-up), so each tab
 * carries its own `instance`, spliced in before the run suffix: two tabs never
 * share an id and therefore never share a shell. A tab WITHOUT an instance —
 * one persisted before the follow-up — keeps the byte-identical legacy
 * identity, so its host binding still reattaches.
 * @param run - the content-identity generation (0 for a tab's first terminal).
 * @param instance - the tab's own instance id (`undefined` on legacy tabs).
 */
export declare function bottomTerminalContentId(run: number, instance?: string): string;
/** The per-tab instance id a tab carries (absent/legacy tabs read as `undefined`). */
export declare function terminalInstanceOf(tab: {
    meta?: unknown;
}): string | undefined;
/** The content-identity generation a tab carries (absent/corrupt reads as 0). */
export declare function terminalRunOf(tab: {
    meta?: unknown;
}): number;
/**
 * The `tab.meta` patch that mints the tab's next terminal.
 *
 * The instance has to survive the bump: `patchTab` REPLACES `meta` wholesale,
 * so returning only the run field would drop `terminalInstance` and collapse
 * the tab onto the legacy identity — where every tab that bumped its run lands
 * on the same key (`…terminal-bottom#1`) and the host, which memoizes one view
 * per `(sessionId, key)`, would hand two tabs the SAME shell. Legacy tabs carry
 * no instance and get none here, so their identity stays byte-identical.
 */
export declare function nextTerminalMeta(tab: {
    meta?: unknown;
}): Record<string, unknown>;
/**
 * End the tab's host terminal (the descriptor's `onClose`). Unmounting the
 * view deliberately does NOT do this — that is the host's "a view survives DOM
 * unmount" contract, and it is what lets a reload reattach — so without this
 * every closed bottom terminal would leave its shell running invisibly.
 * @param ctx - the client context.
 * @param tab - the closing tab (its `meta` names the content identity).
 * @param sessionId - the tab's session.
 */
export declare function closeBottomTerminal(ctx: Context, tab: {
    meta?: unknown;
}, sessionId: string): void;
