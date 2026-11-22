import type { SidechatImageLimits, SidechatImageUpload } from '../sidechat-images.ts';
export interface DraftImage {
    id: number;
    file: File;
    preview: string;
}
export interface SidechatDraftOwner {
    childId?: string;
    active: boolean;
    revision: number;
    text: string;
    images: DraftImage[];
}
export interface SidechatSendAttempt {
    owner: SidechatDraftOwner;
    revision: number;
    text: string;
    images: readonly DraftImage[];
}
/**
 * Drop every saved draft and release the previews they kept alive. The app has
 * no reason to call this (a saved draft is bounded and cheap); it exists so a
 * test can start from a clean cache between cases.
 */
export declare function clearSavedSidechatDrafts(): void;
export declare function useSidechatDraft(childId: string | undefined): {
    owner: SidechatDraftOwner;
    setText(text: string): void;
    add(files: readonly File[], limits: SidechatImageLimits | undefined): void;
    remove(id: number): void;
    capture(): SidechatSendAttempt;
    /** The prompt never started (the request failed): the draft is the reader's again. */
    abandon(attempt: SidechatSendAttempt): void;
    accept(attempt: SidechatSendAttempt): void;
};
export declare function encodeSidechatImages(attempt: SidechatSendAttempt): Promise<SidechatImageUpload[]>;
