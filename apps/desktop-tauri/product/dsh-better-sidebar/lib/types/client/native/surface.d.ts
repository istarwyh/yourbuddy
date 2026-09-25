/**
 * The plugin's write face over DSH's native right Sidebar (`ctx.sidebarRight`).
 *
 * The service speaks in the plugin's own vocabulary (tab type, seed, session
 * scope); this module turns those into the native surface's vocabulary
 * (kind + navigation params, or a `dsh-resource://` address) and forwards
 * tab-record operations to the plugin's native record registry.
 *
 * Two native limits shape the implementation:
 *
 * - the surface exists only while a session's panel is mounted, and the
 *   service's public face (`ISidebarRight`) writes only into THAT session.
 *   The controller also carries `openTabIn` / `openResourceIn` /
 *   `closeIn`, which act on any Session whose store the runtime has minted;
 *   an open for a Session that has no store yet is queued and replayed in
 *   request order when that store is adopted;
 * - layout state is memory-only, so a queued open is not durable either.
 */
import type { Context } from '../../context-types.ts';
import type { SidebarSurface } from '../service.ts';
import type { NativeTabRecords } from './tab-adapter.tsx';
/** The plugin's write face over the native surface. */
export interface NativeSurface extends SidebarSurface {
    /** Stop observing Session-list and native-store lifecycle changes. */
    dispose(): void;
}
/**
 * Bind the plugin's write face to the native controller.
 * @param ctx - the client context (session list + `ctx.sidebarRight`).
 * @param records - the plugin's native tab record registry.
 * @returns the surface, plus a disposer unbinding its session subscription.
 */
export declare function createNativeSurface(ctx: Context, records: NativeTabRecords): NativeSurface;
