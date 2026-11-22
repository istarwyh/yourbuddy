import type { Context } from '../context-types.ts';
/** Work-details presentation modes (host `TRANSCRIPT_VIEW_MODES`). */
export type SidechatWorkDetailsMode = 'compact' | 'standard' | 'detailed' | 'verbose';
/** When a completed Turn returns to its folded presentation. */
export type SidechatCollapseTiming = 'completion' | 'next-input';
/** What the side transcript needs from the preference. */
export interface SidechatWorkDetails {
    mode: SidechatWorkDetailsMode;
    collapseTiming: SidechatCollapseTiming;
}
/**
 * Normalize one saved `transcriptView` value the way the host does.
 * @param value - the raw saved value (any JSON).
 * @returns the mode to present.
 */
export declare function workDetailsModeOf(value: unknown): SidechatWorkDetailsMode;
/**
 * Normalize one saved `collapseTiming` value.
 * @param value - the raw saved value (any JSON).
 * @returns the timing to present (`completion` when absent or unusable).
 */
export declare function collapseTimingOf(value: unknown): SidechatCollapseTiming;
/** Whether this mode folds a settled Turn's process rows at all. */
export declare function foldsSettledTurns(mode: SidechatWorkDetailsMode): boolean;
/** Whether this mode puts the RUNNING Turn's process detail on its line
 *  (host `liveProcessDetail`: true for `standard` and `detailed`). */
export declare function showsLiveProcessDetail(mode: SidechatWorkDetailsMode): boolean;
/**
 * Read the live work-details preference.
 *
 * Deliberately NOT `useSyncExternalStore`: the host form may hand out a fresh
 * snapshot object per call (`getSnapshot()` identity is not part of its
 * contract), which would make React loop. Subscribing through local state keeps
 * the view stable whatever identity the form returns.
 * @param ctx - client context (the settings service is read off it).
 * @returns the mode and collapse timing to present.
 */
export declare function useSidechatWorkDetails(ctx: Context): SidechatWorkDetails;
