import type { Context } from '../../context-types.ts';
import type { NativeTabKind, NativeTabParams, SidebarSurface } from '../service.ts';
import type { NativeTabRecords } from './tab-adapter.tsx';
/** The observation of the Session retained by the main conversation view. */
export interface MountedSessions {
    getSnapshot(): string | undefined;
    subscribe(listener: () => void): () => void;
}
declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
    /** Page parameters owned by Better Sidebar's registered descriptor adapter. */
    interface SidebarRightTabParamsMap extends Record<NativeTabKind, NativeTabParams> {
    }
}
/** The plugin's write face over the native surface. */
export interface NativeSurface extends SidebarSurface {
    /** Stop observing Session-list and native-store lifecycle changes. */
    dispose(): void;
}
/**
 * Observe the Session retained by the main conversation view.
 *
 * @param ctx - the client context.
 * @returns the observable face of the main view's session id.
 */
export declare function mountedSessions(ctx: Context): MountedSessions;
/**
 * The session whose seat is on screen, or `undefined` — no seat is mounted
 * (global panel, column not mounted) or the host has no mounted feed. Callers
 * treat `undefined` as "not this session": nothing the plugin draws belongs to
 * that surface, so it must neither write into it nor manage its column.
 *
 * @param ctx - the client context.
 * @returns the on-screen session id, when there is one.
 */
export declare function mountedSessionId(ctx: Context): string | undefined;
/**
 * Bind the plugin's write face to the native controller.
 * @param ctx - the client context (session list + `ctx.sidebarRight`).
 * @param records - the plugin's native tab record registry.
 * @returns the surface, plus a disposer unbinding its two feed subscriptions.
 */
export declare function createNativeSurface(ctx: Context, records: NativeTabRecords): NativeSurface;
