/**
 * Versioned, provider-owned durable state for replaying Codex Responses v2
 * compaction without widening DSH's core content vocabulary.
 *
 * @module dsh-codex-auth/native-checkpoint
 */
/** Stable declaration-merged content tag owned by this package. */
export declare const CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE: "codex-native-checkpoint";
/** Initial durable schema generation. */
export declare const CODEX_NATIVE_CHECKPOINT_SCHEMA_VERSION: 1;
/** Provider codec interpreted by the Codex Adapter. */
export declare const CODEX_NATIVE_CHECKPOINT_CODEC: "openai-responses-v2";
/** Initial provider codec generation. */
export declare const CODEX_NATIVE_CHECKPOINT_CODEC_GENERATION: 1;
/** Retained-history policy pinned by the parent specification. */
export declare const CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY: "codex-v2-retained-message-groups";
/** Initial retained-history policy generation. */
export declare const CODEX_NATIVE_CHECKPOINT_RETENTION_GENERATION: 1;
/** Replay estimate identity pinned by the parent specification. */
export declare const CODEX_NATIVE_CHECKPOINT_ESTIMATOR: "codex-v2-retained-json-plus-opaque-base64-v1";
/** Serialized custom-block ceiling, including its JSON carrier. */
export declare const MAX_CODEX_NATIVE_CHECKPOINT_BYTES: number;
/** Exact runtime pair whose rc.2 message and pi payload conversion this replay uses. */
export declare const CODEX_NATIVE_REPLAY_COMPATIBILITY: Readonly<{
    dsh: "0.1.1-rc.2";
    piAi: "0.82.1";
}>;
/** Installed package facts that decide whether marker replay is safe. */
export interface CodexNativeReplayRuntimeVersions {
    readonly dshLlm: string;
    readonly dshPiAi: string;
    readonly piAi: string;
}
/** Return false on an unobserved converter/runtime pair so callers can use Portable text. */
export declare function isCodexNativeReplayRuntimeCompatible(actual?: CodexNativeReplayRuntimeVersions): boolean;
/** Lossless JSON values accepted by the checkpoint carrier. */
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
/** Canonical Responses items are JSON objects with provider-owned fields. */
export type CodexResponsesItem = {
    readonly [key: string]: JsonValue;
};
/** Optional provider usage facts retained for diagnostics only. */
export interface CodexNativeCheckpointUsage {
    readonly source: 'reported' | 'estimated';
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
    readonly reasoningTokens?: number;
}
/** First durable Codex Native Checkpoint schema. */
export interface CodexNativeCheckpointV1 {
    readonly schemaVersion: typeof CODEX_NATIVE_CHECKPOINT_SCHEMA_VERSION;
    readonly codec: {
        readonly kind: typeof CODEX_NATIVE_CHECKPOINT_CODEC;
        readonly generation: typeof CODEX_NATIVE_CHECKPOINT_CODEC_GENERATION;
    };
    readonly retention: {
        readonly policy: typeof CODEX_NATIVE_CHECKPOINT_RETENTION_POLICY;
        readonly generation: typeof CODEX_NATIVE_CHECKPOINT_RETENTION_GENERATION;
    };
    readonly provenance: {
        readonly provider: 'openai-codex';
        readonly model: string;
        readonly accountHash: string;
    };
    readonly compatibilityDigest: string;
    readonly replay: {
        readonly estimator: typeof CODEX_NATIVE_CHECKPOINT_ESTIMATOR;
        readonly estimatedTokens: number;
    };
    readonly usage?: CodexNativeCheckpointUsage;
    readonly replacementItems: readonly CodexResponsesItem[];
}
/** Opaque durable carrier duplicated by Basic into summary and replacement events. */
export interface CodexNativeCheckpointBlock {
    readonly type: typeof CODEX_NATIVE_CHECKPOINT_BLOCK_TYPE;
    /** Empty generic-presenter sentinel; prevents clients from stringifying opaque state. */
    readonly text: '';
    /** Serialized schema JSON; kept opaque so unknown canonical item fields round-trip. */
    readonly state: string;
}
declare module '@deepseek-ai/dsh-llm' {
    interface ContentBlockMap {
        /** Package-owned opaque Codex replay state; clients present only sibling text. */
        'codex-native-checkpoint': CodexNativeCheckpointBlock;
    }
}
export type CodexNativeCheckpointDecodeResult = {
    readonly ok: true;
    readonly checkpoint: CodexNativeCheckpointV1;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Semantic request controls included in the canonical replay compatibility digest. */
export interface CodexNativeCheckpointCompatibilityInput {
    readonly provider: string;
    readonly model: string;
    readonly accountHash: string;
    readonly instructions: string;
    readonly tools: JsonValue;
    readonly parallelToolCalls: boolean;
    readonly toolChoice: JsonValue;
    readonly reasoning: JsonValue;
    readonly text: JsonValue;
    readonly serviceTier: JsonValue;
}
/** Hash one non-secret account identity without persisting the raw identifier. */
export declare function hashCodexAccountIdentity(accountId: string): string;
/** Canonical compatibility identity for one effective Codex Responses request. */
export declare function codexNativeCheckpointCompatibilityDigest(input: CodexNativeCheckpointCompatibilityInput): string;
/** Encode one validated v1 state into its opaque declaration-merged block. */
export declare function encodeCodexNativeCheckpoint(checkpoint: CodexNativeCheckpointV1): CodexNativeCheckpointBlock;
/** Decode and validate one candidate without exposing malformed state to replay. */
export declare function decodeCodexNativeCheckpoint(block: unknown): CodexNativeCheckpointDecodeResult;
//# sourceMappingURL=native-checkpoint.d.ts.map