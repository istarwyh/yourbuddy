import { type MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives';
import { type MarkdownCopyLabels } from './markdown-labels.tsx';
import type { SidechatTranscriptRow } from './sidechat-transcript.ts';
export interface SidechatRowSurfaceBinding {
    service: object | undefined;
    threadId: string | undefined;
    visible: boolean;
    sendPrompt: (text: string) => Promise<void>;
}
export declare function SidechatAssistantRow(props: {
    row: Extract<SidechatTranscriptRow, {
        kind: 'assistant';
    }>;
    labels: MarkdownCopyLabels;
    /** The view's row-level prose pass (image destinations first, then local
     *  links) — takes the ROW so an unchanged row reuses its cached rewrite. */
    rewrite: (row: Extract<SidechatTranscriptRow, {
        text: string;
    }>) => string;
    /** The thread's inline-code file-mention vocabulary (see
     *  sidechat-mentions.ts); absent leaves every token inert code. */
    fileMentions?: MarkdownFileMentions | undefined;
    surface: SidechatRowSurfaceBinding;
}): React.ReactNode;
