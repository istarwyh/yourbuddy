import type { Context } from '../context-types.ts';
import { type SidebarStore } from './state.ts';
export declare function Sidebar(props: {
    ctx: Context;
    store: SidebarStore;
    presentation?: 'portal' | 'slot';
}): import("react").JSX.Element;
