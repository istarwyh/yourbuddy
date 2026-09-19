/**
 * Free windows (extracted from Sidebar.tsx, behavior identical): the
 * drag-out gesture that floats a tab onto the conversation column, plus the
 * render layer for the floating windows and its drop-zone hint overlay.
 */
import { type ReactNode } from 'react';
import type { Context } from '../../context-types.ts';
import { type FloatWindow, type SidebarStore, type SidebarTab } from '../state.ts';
/** The dashed drop-zone hint's geometry (viewport coordinates). */
export interface FloatDropHint {
    left: number;
    top: number;
    width: number;
    height: number;
}
/**
 * Free windows — drag-out detection. The tab strips already drive HTML5
 * DnD (payload application/x-dsh-tab) with drops owned by the panes
 * (split/merge); this hook watches the DOCUMENT (capture) for the same
 * drag hovering OUTSIDE the panel host: while the pointer is over the
 * conversation column it arms the drop (preventDefault) and shows a hint
 * overlay there, and the drop floats the tab at the release point. Targets
 * inside the host are ignored here, so pane drops keep their behavior
 * untouched. Only OUR tab drags count (the body flag is the tab strip's;
 * OS file drags and any DSH drags pass through). Narrow viewports skip
 * the gesture — the merged drawer covers the conversation, leaving
 * nothing to drop onto (the tab context menu entry still floats tabs).
 */
export declare function useFloatDragout(input: {
    narrow: boolean;
    sessionId: string | undefined;
    store: SidebarStore;
    /** The AppFrame center column (from useCenterColumn); stable ref object. */
    centerColRef: {
        readonly current: HTMLElement | null;
    };
}): {
    floatHint: FloatDropHint | null;
};
/**
 * The free-window render layer: tabs dragged out onto the conversation area
 * (or floated from the tab context menu). They live in the panel host like
 * the panels (viewport coordinates, immune to desktop-shell transforms) but
 * are independent of panel state — a window stays up while panels collapse.
 * The floats array's order is the stacking order; the content reuses the
 * regular tab renderer, so every tab type floats unchanged. Renders a
 * fragment so the DOM is exactly the floats followed by the drag-out hint.
 */
export declare function FreeWindowLayer(props: {
    floats: readonly FloatWindow[];
    hint: FloatDropHint | null;
    renderTab: (tab: SidebarTab, active: boolean, paneId: string, placement: 'top' | 'bottom' | 'float') => ReactNode;
    getTabIcon: (tab: SidebarTab) => ReactNode;
    store: SidebarStore;
    ctx: Context;
    sessionId: string;
    cwd: string | undefined;
}): import("react").JSX.Element;
