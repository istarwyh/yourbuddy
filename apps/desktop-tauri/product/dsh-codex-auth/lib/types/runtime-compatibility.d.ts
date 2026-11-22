/** Each supported DSH graph is verified independently; mixed graphs are never accepted. */
export declare const SUPPORTED_DSH_RUNTIMES: readonly string[];
/** Only the two observed prereleases; future RCs and stable releases need their own verification. */
export declare const SUPPORTED_DSH_PEER_RANGE = "0.2.1-rc.1 || 0.2.1-rc.2";
export declare function isSupportedDshGraph(versions: readonly string[]): boolean;
//# sourceMappingURL=runtime-compatibility.d.ts.map