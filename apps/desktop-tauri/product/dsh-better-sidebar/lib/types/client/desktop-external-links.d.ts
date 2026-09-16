/** Open HTTP(S) destinations through the desktop shell or an ordinary browser tab. */
/**
 * Normalize an HTTP(S) destination accepted by the desktop shell.
 * @param value - Candidate absolute URL.
 * @returns The normalized URL, or undefined when the value is unsupported.
 */
export declare function resolveExternalHttpUrl(value: string): string | undefined;
/**
 * Dispatch an HTTP(S) destination without navigating the workbench.
 * @param value - Candidate absolute URL.
 * @returns True when the URL was sent to the desktop shell or browser API.
 */
export declare function openExternalHttpUrl(value: string): boolean;
