import { type DiffSegment } from './rows.ts';
export interface DiffRowsProps {
    /** Precomputed segments (hunks and folds) for one file's diff. */
    segments: readonly DiffSegment[];
    /** Syntax language id (langOfPath); undefined renders plain text. */
    lang?: string;
}
/** One file's diff rows: fold chips between hunks, highlighted code rows. */
export declare function DiffRows({ segments, lang }: DiffRowsProps): import("react").JSX.Element;
export interface ReadRowsProps {
    /** The file lines with their real line numbers (parseReadLines output). */
    lines: ReadonlyArray<{
        line: number;
        text: string;
    }>;
    /** Syntax language id (langOfPath); undefined renders plain text. */
    lang?: string;
}
/** The read view: a line-numbered, syntax-colored slice of a read file. */
export declare function ReadRows({ lines, lang }: ReadRowsProps): import("react").JSX.Element;
