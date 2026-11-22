import type { NativeGuideEntry } from './guide-catalog.ts';
/** The list's actions; callers own persistence. */
export interface GuideOrderListProps {
    entries: readonly NativeGuideEntry[];
    hidden: Readonly<Record<string, boolean>>;
    onMove: (key: string, delta: -1 | 1) => void;
    onToggle: (entry: NativeGuideEntry, hidden: boolean) => void;
}
/** The inline order/visibility list. */
export declare function GuideOrderList({ entries, hidden, onMove, onToggle }: GuideOrderListProps): import("react").JSX.Element;
/** The order editor opened from the guide's "More" menu. */
export declare function GuideOrderDialog(props: GuideOrderListProps & {
    open: boolean;
    onClose: () => void;
    rows: number;
    onRows: (rows: number) => void;
}): import("react").JSX.Element;
