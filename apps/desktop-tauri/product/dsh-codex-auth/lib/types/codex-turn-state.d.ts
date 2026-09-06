import type { StreamOptions } from '@earendil-works/pi-ai';
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
declare const CODEX_ROUTE = "openai-codex";
/** Provider-confirmed continuation lifetime from the issue contract. */
export declare const CODEX_TURN_STATE_TTL_MS = 60000;
/** One immutable prepared-Adapter generation with mutable retirement state. */
export declare class CodexAdapterGeneration {
    active: boolean;
}
export interface CodexTurnStateContinuationInput {
    readonly sessionId: string;
    readonly provider: typeof CODEX_ROUTE;
    readonly model: string;
    readonly accountHash: string;
    readonly generation: CodexAdapterGeneration;
    readonly turnState: string;
}
/**
 * Host-only one-shot handoff from inline native compaction to one loop request.
 * The original GenerateOptions identity is observed before LlmRuntime projects
 * or clones it; adapter code consumes only this request scope.
 */
declare class CodexTurnStateContinuity {
    private readonly requestStorage;
    private readonly generationStorage;
    private readonly pendingBySession;
    createGeneration(): CodexAdapterGeneration;
    /** Retire a route snapshot and synchronously erase every continuation it owns. */
    retireGeneration(generation: CodexAdapterGeneration): void;
    /**
     * Read the exact waterfall request, call next() without projecting or replacing
     * it, and keep the resulting identity around every lazy iterator advancement.
     */
    observeLlmStream(options: GenerateOptions, next: () => AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk>;
    /** Bind one prepared Adapter generation around its lazy provider dispatch. */
    withAdapterGeneration<T>(generation: CodexAdapterGeneration, dispatch: () => AsyncIterable<T>): AsyncIterable<T>;
    currentGeneration(): CodexAdapterGeneration | undefined;
    /** Record only a domain-separated account hash in the loop request scope. */
    noteAccount(accountId: string | undefined): void;
    /**
     * Consume a matching continuation immediately before the provider stream is
     * created. Any account/generation/request mismatch erases it without sending.
     */
    applyProviderOptions<Options extends StreamOptions | undefined>(options: Options, provider: string, model: string): Options;
    /** Arm only after Basic reports the inline Dual Checkpoint commit as successful. */
    arm(input: CodexTurnStateContinuationInput): void;
    private expired;
    private discard;
    private scopedStream;
}
export declare const codexTurnStateContinuity: CodexTurnStateContinuity;
export {};
//# sourceMappingURL=codex-turn-state.d.ts.map