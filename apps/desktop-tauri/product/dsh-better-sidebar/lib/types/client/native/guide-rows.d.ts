/** Props of the shared row-count input. */
export interface GuideRowsInputProps {
    /** The stored maximum row count. */
    value: number;
    /** Called with a validated count (safe integer >= 1). */
    onCommit: (rows: number) => void;
    /** Accessible name. */
    label: string;
}
/** A compact number input that commits on blur or Enter. */
export declare function GuideRowsInput({ value, onCommit, label }: GuideRowsInputProps): import("react").JSX.Element;
