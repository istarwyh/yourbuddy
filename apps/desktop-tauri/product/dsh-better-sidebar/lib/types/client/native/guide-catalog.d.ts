/**
 * The live inventory of host guide cards (the native start page), as the
 * plugin's own start page and settings section consume it.
 *
 * The host's tab registry is the single authority: a type disabled in the
 * side-card settings unregisters its native type, so its card leaves this
 * catalog too. Entries are kept as thunks/components rather than resolved
 * strings so a language switch re-renders without a registry notification.
 */
import type { ComponentType } from 'react';
import type { Context } from '../../context-types.ts';
import type { TabDescriptor } from '../service.ts';
/** One host guide card, normalized for the plugin's own surfaces. */
export interface NativeGuideEntry {
    /** Stable identity: providerId::entryId. */
    readonly key: string;
    /** Implementation id of the type that contributed the card. */
    readonly providerId: string;
    /** Entry id inside that provider. */
    readonly entryId: string;
    /** The kind openTab accepts. */
    readonly kind: string;
    /** Card title in the active language. */
    readonly title: () => string;
    /** Optional one-line description in the active language. */
    readonly description?: () => string;
    /** Optional card glyph component. */
    readonly icon?: ComponentType<{
        size?: number;
    }>;
    /** The Better Sidebar descriptor that owns this card, when it is ours. */
    readonly descriptorId?: string;
}
/** The catalog face the guide body and the settings section share. */
export interface NativeGuideCatalog {
    /** Reference-stable snapshot of the registered guide cards. */
    getSnapshot(): readonly NativeGuideEntry[];
    /** Observe registry changes. */
    subscribe(listener: () => void): () => void;
}
/**
 * Merge the live guide cards with every enabled descriptor's synthetic card.
 *
 * A disabled Better Sidebar type unregisters its native type, so it vanishes
 * from the live catalog; the settings/reorder inventory still needs its row so
 * the switch can turn it back on. These synthetic rows never enter the grid
 * (the grid receives the live catalog), only the editable inventory.
 */
export declare function mergeGuideEntries(entries: readonly NativeGuideEntry[], descriptors: readonly TabDescriptor[], tabsEnabled: Readonly<Record<string, boolean>>): NativeGuideEntry[];
/**
 * Create the catalog and wait for the host registry.
 * @param ctx - the client context.
 * @returns the catalog plus the disposer releasing its registry subscription.
 */
export declare function createNativeGuideCatalog(ctx: Context): {
    catalog: NativeGuideCatalog;
    dispose: () => void;
};
