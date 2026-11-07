/** Bounded browser-owned Blob URLs over session-authorized attachment reads. */
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Owns only this plugin's image URLs; clearing never evicts conversation-owned URLs. */
export declare class SessionImageUrls {
    private readonly sessions;
    private readonly maxEntries;
    private readonly entries;
    constructor(sessions: Pick<ISessions, 'binding'>, maxEntries?: number);
    resolve(sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string>;
    clear(): void;
    private read;
    private evictOverflow;
}
//# sourceMappingURL=SessionImageUrls.d.ts.map