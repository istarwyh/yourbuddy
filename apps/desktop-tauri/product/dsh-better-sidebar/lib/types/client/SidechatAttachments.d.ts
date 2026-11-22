import type { Context } from '../context-types.ts';
import type { SidechatAttachment, SidechatImageAttachment } from './sidechat-transcript.ts';
/** What one attachment read is currently worth rendering. */
type AttachmentImageState = {
    status: 'loading';
} | {
    status: 'ready';
    url: string;
} | {
    status: 'failed';
};
/**
 * The current state of one attachment's shared read, subscribing for the
 * component's lifetime (and starting the read on the first subscriber).
 * @param ctx - client context (the Host Remote is read off it).
 * @param sessionId - the THREAD whose log references the attachment.
 * @param image - the narrowed image block.
 * @returns the state the thumbnail renders.
 */
export declare function useAttachmentImage(ctx: Context, sessionId: string, image: SidechatImageAttachment): AttachmentImageState;
/**
 * Render one row's `image` / `file` blocks in content order.
 * @param props.ctx - client context (Host Remote byte source).
 * @param props.sessionId - the thread that owns the referencing log.
 * @param props.attachments - the narrowed blocks (see sidechat-transcript.ts).
 * @returns the attachment strip, or null when the row has none.
 */
export declare function SidechatAttachments(props: {
    ctx: Context;
    sessionId: string;
    attachments: readonly SidechatAttachment[];
}): React.ReactNode;
export {};
