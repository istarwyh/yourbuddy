import type { SidebarStore } from '../state.ts';
/** Persist one patch of start-page preferences. */
export declare function writeGuidePrefs(store: SidebarStore, patch: Record<string, unknown>): void;
/** Persist the full explicit order. */
export declare function saveGuideOrder(store: SidebarStore, order: readonly string[]): void;
/** Persist one card's start-page visibility. */
export declare function setGuideEntryHidden(store: SidebarStore, key: string, hidden: boolean): void;
/** Persist one Better Sidebar type's feature switch (the sidebar-content state). */
export declare function setGuideEntryEnabled(store: SidebarStore, descriptorId: string, enabled: boolean): void;
/** Persist the maximum row count. */
export declare function saveGuideRows(store: SidebarStore, rows: number): void;
