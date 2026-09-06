export interface DiffFilesProps {
    /** Unified diff text (`git.diff` or `git.commit-diff` payloads). */
    diff: string;
    /** Untracked-file content: when present, renders as a full-file addition instead of parsing. */
    untrackedPath?: string;
    untrackedContent?: string;
}
export declare function DiffFiles({ diff, untrackedPath, untrackedContent }: DiffFilesProps): import("react").JSX.Element | null;
