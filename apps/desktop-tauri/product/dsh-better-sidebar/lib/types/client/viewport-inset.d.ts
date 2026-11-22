/** The slice of `navigator.windowControlsOverlay` this module needs. */
export interface WindowControlsOverlayLike {
    readonly visible: boolean;
    getTitlebarAreaRect(): {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
    };
    addEventListener(type: 'geometrychange', listener: () => void): void;
    removeEventListener(type: 'geometrychange', listener: () => void): void;
}
/** The current inset in CSS pixels (0 when there is none). */
export declare function getViewportInset(): number;
/** Subscribe to geometry changes; returns the disposer. */
export declare function subscribeViewportInset(listener: () => void): () => void;
/** Swap the overlay source (tests). `undefined` = no overlay API. */
export declare function setViewportInsetSourceForTests(next: WindowControlsOverlayLike | undefined): void;
/** React consumer: the inset, re-rendering only when the shell band changes. */
export declare function useViewportInsetTop(): number;
