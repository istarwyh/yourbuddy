import type { RenderFactorySlot } from '@deepseek-ai/dsh-client-ui-slots';
import type { Context } from '../context-types.ts';
import { type SidebarStore } from './state.ts';
export declare function Sidebar(props: {
    ctx: Context;
    store: SidebarStore;
    presentation?: 'portal' | 'slot';
    renderFactorySlot?: RenderFactorySlot;
}): import("react").JSX.Element;
/** The header control that expands/collapses the bottom workbench (see
 *  sidebar/bottom-toggle.tsx — registered into DSH's session header). */
export declare function BottomDockToggle(props: {
    store: SidebarStore;
}): import("react").JSX.Element;
