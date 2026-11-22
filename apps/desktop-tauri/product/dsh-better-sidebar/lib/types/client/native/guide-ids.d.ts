/**
 * Identity vocabulary shared by the native tab registration and the start-page
 * takeover. Kept dependency-free so the catalog and the slot registration can
 * both use it without importing each other.
 */
/** The kind the plugin's files window owns (page + file viewer). */
export declare const EDITOR_KIND = "editor";
/** The built-in page kind this plugin takes over. */
export declare const FILES_KIND = "files";
/** The plugin's implementation id for a descriptor (unique across kinds). */
export declare function nativeId(descriptorId: string): string;
/** Stable identity of one host guide card: provider implementation + entry id. */
export declare function guideKeyOf(providerId: string, entryId: string): string;
/** The native identity a Better Sidebar descriptor registers under. */
export declare function guideIdentityOfDescriptor(descriptorId: string): {
    providerId: string;
    entryId: string;
    kind: string;
};
/**
 * The Better Sidebar descriptor that owns one native guide card, when it is
 * one of ours. The files takeover is its own registration id but is the
 * editor descriptor's page.
 */
export declare function descriptorIdOfGuideEntry(providerId: string, entryId: string): string | undefined;
