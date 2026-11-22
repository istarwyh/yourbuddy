import type { Context } from '../../context-types.ts';
import type { NativePathTab, NativeTabKind, NativeTabParams, SidebarSurface } from '../service.ts';
import type { NativeTabRecords } from './tab-adapter.tsx';
/** The Session currently displayed by the native Sidebar controller. */
export interface MountedSessions {
    getSnapshot(): string | undefined;
    subscribe(listener: () => void): () => void;
}
declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
    /** Page parameters owned by Better Sidebar's descriptor adapter. */
    interface SidebarRightTabParamsMap extends Record<NativeTabKind, NativeTabParams> {
    }
}
/** Native operations and the observer cleanup owned by this adapter. */
export interface NativeSurface extends SidebarSurface {
    /** Retry queued opens after a host store is adopted. */
    flushPending(): void;
    /** Release observers and pending opens. */
    dispose(): void;
    /** Every native tab associated with a path. */
    pathTabs(): NativePathTab[];
}
/**
 * Observe the on-screen Session; the list also discovers a late controller.
 * @param ctx - client context.
 * @returns current Session observation.
 */
export declare function mountedSessions(ctx: Context): MountedSessions;
/**
 * Read the Session whose native panel is on screen.
 * @param ctx - client context.
 * @returns on-screen Session, or undefined.
 */
export declare function mountedSessionId(ctx: Context): string | undefined;
/**
 * Bind native records to Session-targeted controller operations.
 * @param ctx - client context.
 * @param records - per-Session tab records.
 * @returns surface with observer cleanup.
 */
export declare function createNativeSurface(ctx: Context, records: NativeTabRecords): NativeSurface;
