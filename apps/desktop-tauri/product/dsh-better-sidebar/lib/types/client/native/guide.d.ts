import type { SidebarPrefs } from '../../prefs-shared.ts';
import type { HostShellCatalog } from '../terminal-client.ts';
import type { SidebarStore } from '../state.ts';
import type { BetterSidebarService } from '../service.ts';
import { type NativeGuideCatalog, type NativeGuideEntry } from './guide-catalog.ts';
/** The terminal service slice the card's native menu needs. */
export interface GuideShellMenu {
    launchShells: (signal: AbortSignal) => Promise<HostShellCatalog>;
    selectShell: (path: string) => void;
}
/** The native tab actions a guide card opens through (structurally the host's). */
interface GuideActions {
    openTab: (kind: string, options: {
        replaceTab?: boolean;
        params?: Record<string, unknown>;
    }) => void;
    close: () => void;
}
/** What the chain component receives from the native registration. */
export interface NativeGuideProps {
    /** Host-injected hook for the guide tab's own record. */
    useTabInfo?: () => {
        tab: {
            actions: GuideActions;
        };
    } | undefined;
    catalog: NativeGuideCatalog;
    store: SidebarStore;
    /** The plugin registry, so disabled types stay in the reorder inventory. */
    service: BetterSidebarService;
    /** Present only when the host exposes both shell catalog and selection. */
    shellMenu?: GuideShellMenu | undefined;
    /** Host plugin discovery action, when the service exists. */
    onBrowsePlugins?: () => void;
    /** Host "create your plugin" action, when the workspace can start a session. */
    onCreatePlugin?: () => void;
}
/** The grid's inputs, extracted for direct rendering in tests. */
export interface GuideGridProps {
    entries: readonly NativeGuideEntry[];
    prefs: Pick<SidebarPrefs, 'guideOrder' | 'guideHidden' | 'guideRows' | 'guideAlign' | 'tabsEnabled'>;
    /** Pane width in CSS pixels. */
    width: number;
    onOpen: (entry: NativeGuideEntry, params?: Record<string, unknown>) => void;
    onSaveOrder?: (order: readonly string[]) => void;
    onToggleHidden?: (entry: NativeGuideEntry, hidden: boolean) => void;
    onSaveRows?: (rows: number) => void;
    /** The editable inventory (live cards plus disabled plugin descriptors). */
    inventory?: readonly NativeGuideEntry[];
    /** Host "Browse other plugins" action, when the navigation service exists. */
    onBrowsePlugins?: () => void;
    /** Host "Create your plugin" action, when the workspace can start a session. */
    onCreatePlugin?: () => void;
    shellMenu?: GuideShellMenu | undefined;
}
/** The whole start-page grid, including the More card and the order dialog. */
export declare function GuideGrid(props: GuideGridProps): import("react").JSX.Element;
/** The chain component registered into the host's guide slot. */
export declare function NativeGuide(props: NativeGuideProps): import("react").JSX.Element;
export {};
