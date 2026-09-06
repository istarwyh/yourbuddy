import type { SessionScope } from '../api.ts';
import type { SidebarDiffRef, SidebarTab } from '../state.ts';
import { type FileOp } from './ops.ts';
/** What the pane is showing right now. */
export type ChangesPreview = {
    kind: 'git';
    ref: SidebarDiffRef;
} | {
    kind: 'op';
    path: string;
    op: FileOp;
    prior?: string;
};
/** The diff tab a git preview expands into (the shell owns placement). */
export declare function diffTabOf(ref: SidebarDiffRef): SidebarTab;
export interface DiffPaneProps {
    target: ChangesPreview;
    scope: SessionScope;
    /** The persisted pane height (px); drag commits a new one upwards. */
    height: number;
    onHeightCommit: (height: number) => void;
    onClose: () => void;
    /** Expand the current git target into a dedicated diff tab. */
    onExpand: () => void;
}
export declare function DiffPane({ target, scope, height, onHeightCommit, onClose, onExpand }: DiffPaneProps): import("react").JSX.Element;
