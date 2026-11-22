import type { Context } from '../../context-types.ts';
import type { ContextDiagnostics } from '../context-diagnostics.ts';
import type { BetterSidebarService, TabDescriptor } from '../service.ts';
import type { SidebarStore } from '../state.ts';
import type { NativeGuideCatalog } from './guide-catalog.ts';
import { type NativeTabInfo, type NativeTabParams, type NativeTabRecords } from './tab-adapter.tsx';
/** Tab descriptors eligible for the native right Sidebar. */
export declare function nativeTabDescriptors(service: BetterSidebarService): readonly TabDescriptor[];
/**
 * The plugin-side seed a file-address tab carries.
 *
 * The path comes from the address, and that is also where a `path:line` spec
 * the host's markdown grammar left in it has to come off: DSH reads a `#`-less
 * destination as the file name verbatim, so `[a/b.c](a/b.c:131)` addresses a
 * file called `b.c:131` and the editor reports it missing (#826). The tab
 * TITLE is seeded from the same spec, because the host derives it from the same
 * string and would otherwise label the tab `b.c:131`.
 *
 * The LINE rides along in the same seed. DSH's own `#L131` form already
 * arrives as `navigation.params.line` (the host parses it and sends it down),
 * so seeding it here is what makes both spellings land on the same row — see
 * {@link NativeTabParams.line}. The range end and the column are deliberately
 * dropped: {@link splitTrailingLineSpec} parses them, and a start line is all
 * the editor has anywhere to put a cursor.
 *
 * `base` is where an address-relative path is resolved, and it must be the
 * base the ADDRESS was built with — the session's stored header cwd, see
 * `src/client/address-base.ts` — never the tab body's worktree root. Without
 * it the seed stays relative and every downstream reader (the viewer's
 * `fs.read`, the editor, the directory watch) re-bases it on the ACTIVE
 * worktree: a chat link to `<repo>/frontend/.worktrees/wt/a.md` arrives as
 * `frontend/.worktrees/wt/a.md` and is joined onto the worktree root a second
 * time (#947), or silently reads the same-named file of another checkout
 * (#950). Omitted (a caller with no session context) keeps the historical
 * relative seed.
 * @param info - the native tab record the body is drawing.
 * @param base - the address's own base, when the caller knows it.
 * @returns the seed, or `undefined` when the tab is not a file address.
 */
export declare function fileParamsOf(info: NativeTabInfo, base?: string): NativeTabParams | undefined;
/** Everything the registrations need. */
export interface NativeSurfaceDeps {
    readonly ctx: Context;
    readonly store: SidebarStore;
    readonly service: BetterSidebarService;
    /** The shared native tab record registry (the surface writes it too). */
    readonly records: NativeTabRecords;
    /**
     * The live catalog of host guide cards. When present, the plugin replaces
     * the shipped guide page with its own start page; omitted keeps the host's
     * guide untouched (the unit harnesses use this to exercise the original
     * surface without mounting the start page).
     */
    readonly guideCatalog?: NativeGuideCatalog;
    /**
     * The activation's optional dsh-context diagnostics controller (see
     * ../context-diagnostics.ts). Forwarded into the tab bodies' injected bag,
     * because a native body renders in the HOST's React tree and cannot read the
     * plugin shell's provider. Omitted = the bodies render without the
     * diagnostics entry points.
     */
    readonly diagnostics?: ContextDiagnostics;
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
