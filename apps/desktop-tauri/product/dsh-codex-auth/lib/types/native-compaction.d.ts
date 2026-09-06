import type { StreamOptions } from '@earendil-works/pi-ai';
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { GenerateOptions, Message } from '@deepseek-ai/dsh-llm';
import { CODEX_NATIVE_CHECKPOINT_CODEC, CODEX_NATIVE_CHECKPOINT_CODEC_GENERATION } from './native-checkpoint.ts';
import type { CodexNativeCheckpointBlock } from './native-checkpoint.ts';
type NativeCompactionTrigger = 'manual' | 'pressure' | 'context-overflow';
type AutomaticCompactionTrigger = Exclude<NativeCompactionTrigger, 'manual'>;
type NativeCompactionFallback = 'auth' | 'circuit-open' | 'protocol' | 'rate-limit' | 'size' | 'strict-shrink' | 'transient' | 'unsupported-payload';
type NativeCompactionDiagnosticDetail = {
    readonly event: 'eligibility';
    readonly eligibility: 'eligible' | 'ineligible';
} | {
    readonly event: 'attempt';
    readonly breakerState: 'closed' | 'half-open';
    readonly requestBytes: number;
} | {
    readonly event: 'response';
    readonly durationMs: number;
    readonly outputItems: number;
    readonly ignoredOutputItems: number;
    readonly artifactBytes: number;
    readonly opaqueBytes: number;
    readonly usageAvailability: 'estimated' | 'reported' | 'unavailable';
} | {
    readonly event: 'candidate';
    readonly checkpointBytes: number;
    readonly replayTokens: number;
} | {
    readonly event: 'fallback';
    readonly breakerState: 'closed' | 'half-open' | 'not-acquired' | 'open';
    readonly durationMs?: number;
    readonly reason: NativeCompactionFallback;
} | {
    readonly event: 'result';
    readonly result: 'dual-committed' | 'failed' | 'no-commit' | 'portable-committed';
};
export type CodexNativeCompactionDiagnostic = {
    readonly codec: typeof CODEX_NATIVE_CHECKPOINT_CODEC;
    readonly codecGeneration: typeof CODEX_NATIVE_CHECKPOINT_CODEC_GENERATION;
    readonly compactionId: string;
    readonly model: string;
    readonly trigger: NativeCompactionTrigger;
} & NativeCompactionDiagnosticDetail;
interface RoutedTarget {
    readonly provider: string;
    readonly model: string;
}
interface ProviderRequestInput {
    readonly provider: string;
    readonly model: string;
    readonly baseUrl?: string;
    readonly sessionId?: string;
    readonly headers?: Readonly<Record<string, string | null>>;
    readonly modelHeaders?: Readonly<Record<string, string>>;
    readonly fetchImpl: typeof fetch;
    readonly timeoutMs: number;
    readonly streamIdleTimeoutMs: number;
}
type PayloadCallback = NonNullable<StreamOptions['onPayload']>;
/**
 * Host-only coordinator joining one inherited Basic operation to the exact
 * Codex payload and credential resolved by its successful Portable summary.
 */
declare class CodexNativeCompactionCoordinator {
    private readonly storage;
    private readonly boundaryStorage;
    /** Install read-only wrappers before Basic registers its automatic listeners. */
    installAutomaticBoundaries(ctx: Context): void;
    runManual<T>(input: {
        readonly sessionId: string;
        readonly target: RoutedTarget | undefined;
        readonly signal: AbortSignal;
        readonly diagnostic: (diagnostic: CodexNativeCompactionDiagnostic) => void;
    }, task: () => Promise<T>): Promise<T>;
    /** Scope pressure/overflow without taking any lifecycle work away from Basic. */
    runAutomatic<T>(input: {
        readonly agent: Agent;
        readonly trigger: AutomaticCompactionTrigger;
        readonly target: RoutedTarget | undefined;
        readonly signal: AbortSignal;
        readonly diagnostic: (diagnostic: CodexNativeCompactionDiagnostic) => void;
    }, task: () => Promise<T>): Promise<T>;
    /** Arm only after the inherited automatic transaction reports a Dual commit. */
    commitAutomaticContinuation(committedNative: boolean): void;
    private runOperation;
    noteCompactionId(compactionId: string): void;
    noteStrictShrink(model: string): void;
    noteResult(model: string, result: Extract<NativeCompactionDiagnosticDetail, {
        event: 'result';
    }>['result']): void;
    /** Capture the one inherited Portable call made inside the active Basic operation. */
    withPortableCapture<T>(input: readonly Message[], signal: AbortSignal | undefined, reasoningEffort: GenerateOptions['reasoningEffort'], task: () => Promise<T>): Promise<T>;
    /** Capture Basic's appended instruction and align its omitted explicit reasoning control. */
    preparePortableCall(options: GenerateOptions): GenerateOptions;
    /** Retain the already resolved Codex Login State only for this request scope. */
    noteCredential(accessToken: string, accountId: string | undefined): void;
    /** Retain public provider routing inputs and the existing transport policy in memory. */
    noteProviderRequest(input: ProviderRequestInput): void;
    /** Compose final payload capture after marker restoration and all existing callbacks. */
    payloadCallback(previous?: PayloadCallback): PayloadCallback | undefined;
    /**
     * After Portable success, make at most one dedicated v2 request and return a
     * credential-free block. Every ordinary native failure is a Portable fallback.
     */
    createCheckpoint(input: readonly Message[], portableProvider: string, portableModel: string, signal?: AbortSignal): Promise<CodexNativeCheckpointBlock | undefined>;
}
export declare const codexNativeCompactionCoordinator: CodexNativeCompactionCoordinator;
export {};
//# sourceMappingURL=native-compaction.d.ts.map