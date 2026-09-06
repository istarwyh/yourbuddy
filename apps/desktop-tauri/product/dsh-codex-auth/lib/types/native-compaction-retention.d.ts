import type { CodexResponsesItem, JsonValue } from './native-checkpoint.ts';
export declare const CODEX_NATIVE_RETENTION_TOKEN_BUDGET = 64000;
/** Retain newest eligible text-only user groups and one safe boundary prefix. */
export declare function retainRecentCodexUserMessages(inputWithTrigger: readonly JsonValue[], budgetTokens?: number): CodexResponsesItem[];
/** Canonical JSON UTF-8 estimate used for retained text-only items. */
export declare function estimateCodexJsonTokens(value: unknown): number;
/**
 * Versioned replay estimate matching Codex's pinned model-visible compaction
 * heuristic: retained items use canonical JSON, while opaque base64 first pays
 * the provider's 650-byte envelope deduction before four-bytes-per-token.
 */
export declare function estimateCodexReplayTokens(retainedItems: readonly CodexResponsesItem[], artifact: CodexResponsesItem): number;
//# sourceMappingURL=native-compaction-retention.d.ts.map