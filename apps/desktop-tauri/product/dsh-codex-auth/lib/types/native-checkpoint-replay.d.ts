/**
 * Host-only request scope that carries a Native candidate around pi-ai's
 * provider-neutral message conversion and restores it at the Responses payload.
 *
 * @module dsh-codex-auth/native-checkpoint-replay
 */
import type { StreamOptions } from '@earendil-works/pi-ai';
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
type PayloadCallback = NonNullable<StreamOptions['onPayload']>;
/**
 * One Adapter-owned coordinator. AsyncLocalStorage is used only while advancing
 * the lazy upstream iterator, so concurrent calls never share candidates.
 */
export declare class CodexNativeCheckpointReplay {
    private readonly storage;
    private generation;
    /** Capture the replay generation owned by one prepared Adapter call. */
    captureGeneration(): number;
    /** Invalidate request-local Native candidates while leaving durable messages untouched. */
    invalidate(): void;
    /** Record the current request's hashed account after the auth coordinator resolves it. */
    noteAccount(accountId: string | undefined): void;
    /**
     * Clone checkpoint-bearing messages before pi-ai can flatten the custom block,
     * then bind the resulting plan to every advancement of the lazy stream.
     */
    stream(options: GenerateOptions, dispatch: (options: GenerateOptions) => AsyncIterable<StreamChunk>, generation?: number): AsyncIterable<StreamChunk>;
    /** Restore before prior callbacks, then choose the final compatible representation. */
    payloadCallback(previous?: PayloadCallback): PayloadCallback | undefined;
    private prepare;
    private scopedStream;
    private restorePayload;
    private materialize;
    private isCompatible;
    private finalizePayload;
    private validateFinalPayload;
}
export type { PayloadCallback as CodexProviderPayloadCallback };
//# sourceMappingURL=native-checkpoint-replay.d.ts.map