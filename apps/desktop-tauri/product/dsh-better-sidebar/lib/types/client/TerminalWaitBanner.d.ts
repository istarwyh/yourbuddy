/** Truncate one needle for inline display (title attr carries the full text).
 *  Cut by Unicode code points, not UTF-16 code units — a naive slice can split
 *  a surrogate pair at the cutoff and render a dangling replacement char. */
export declare function truncateNeedle(needle: string): string;
export declare function TerminalWaitBanner(props: {
    needle: string;
    onSkip: () => void;
}): import("react").JSX.Element;
