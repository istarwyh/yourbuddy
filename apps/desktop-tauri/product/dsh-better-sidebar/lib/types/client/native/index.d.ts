import type { Context } from '../../context-types.ts';
import type { BetterSidebarService, TabDescriptor } from '../service.ts';
import type { SidebarStore } from '../state.ts';
import { type NativeTabRecords } from './tab-adapter.tsx';
/** Tab descriptors eligible for adaptation into DSH's native right Sidebar. */
export declare function nativeTabDescriptors(service: BetterSidebarService): readonly TabDescriptor[];
/** Everything the registrations need. */
export interface NativeSurfaceDeps {
    readonly ctx: Context;
    readonly store: SidebarStore;
    readonly service: BetterSidebarService;
    /** The shared native tab record registry (the surface writes it too). */
    readonly records: NativeTabRecords;
    /**
     * Report a tab-type registration failure (phase label + cause).
     *
     * `ctx.inject`'s callback body and the registry's own subscriber callbacks
     * run OUTSIDE this module's control flow, so a throw from
     * `sidebarRightTabs.register` is swallowed by cordis and the whole native
     * surface stays empty with no symptom beyond a missing guide. Reporting
     * through the client's diagnostic strip (index.tsx `fail`) turns a silent
     * contract break into a visible one — the failure mode observed when DSH
     * 0.1.6-alpha.2 made `SidebarRightGuideEntry.id` required.
     */
    readonly reportFailure?: (phase: string, error: unknown) => void;
}
/**
 * Register the plugin's tabs into the native right Sidebar and keep them in
 * step with the plugin's own registry and settings.
 * @param deps - client context, the plugin store/service, and the records.
 * @returns a disposer unregistering everything.
 */
export declare function registerNativeSurface(deps: NativeSurfaceDeps): () => void;
export type { NativeTabRecords };
