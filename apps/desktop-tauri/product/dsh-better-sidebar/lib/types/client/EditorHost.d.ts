import type { Context } from '../context-types.ts';
import { type SessionScope } from './api.ts';
import { type SidebarStore, type SidebarTab } from './state.ts';
export declare function EditorHost(props: {
    ctx: Context;
    store: SidebarStore;
    scope: SessionScope;
    tab: SidebarTab;
    expanded: string[];
    revealed: string[];
    onToggleDir: (path: string) => void;
    onReferenceFile: (path: string, isDir: boolean) => void;
    /** Session-bound native resource open; absent in the bottom workbench. */
    onOpenFile?: (path: string) => void;
    /** Session-bound replacement of the native tab that owns this editor. */
    onOpenFileInPlace?: (path: string) => void;
    /** Session-bound open in a new native pane beside this editor. */
    onOpenFileSide?: (path: string) => void;
}): import("react").JSX.Element;
