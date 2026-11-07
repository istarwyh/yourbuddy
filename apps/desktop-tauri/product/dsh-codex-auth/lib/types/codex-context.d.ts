/** Live Codex catalog overlay and context-capacity policy owned by the LLM route. */
import type { Api, Model } from '@earendil-works/pi-ai';
import z from '@deepseek-ai/schemastery';
/** Durable settings namespace for Codex LLM route preferences. */
export declare const CODEX_LLM_SETTINGS_NAMESPACE = "codex-llm";
/** Conservative Codex default that avoids automatic long-context usage. */
export declare const CODEX_STANDARD_CONTEXT_WINDOW = 272000;
/** Legacy opt-in budget for the supported GPT-5.6 family. */
export declare const CODEX_LONG_CONTEXT_WINDOW = 1000000;
/** GPT-6 Codex OAuth maximum, distinct from public API total-context limits. */
export declare const CODEX_GPT_6_LONG_CONTEXT_WINDOW = 872000;
/** GPT-6 model ids exposed on the Codex route. */
export declare const CODEX_GPT_6_ASTRA_MODEL_ID = "gpt-6-astra";
export declare const CODEX_GPT_6_SOL_MODEL_ID = "gpt-6-sol";
export declare const CODEX_GPT_6_LUNA_MODEL_ID = "gpt-6-luna";
export declare const CODEX_GPT_6_1_SOL_MODEL_ID = "gpt-6.1-sol";
/** Models with a model-specific opt-in long-context budget. */
export declare const CODEX_LONG_CONTEXT_MODEL_IDS: readonly ["gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-6-astra", "gpt-6-sol", "gpt-6-luna", "gpt-6.1-sol"];
/** Codex catalog source and API estimate provenance: docs/codex-model-policy.md. */
export declare function codexLongContextWindow(modelId: string): number | undefined;
/** Independently live settings that affect the openai-codex model catalog. */
export interface CodexLlmSettings {
    longContextEnabled: boolean;
    /** Exact model IDs hidden from this profile's catalog; omission preserves the catalog. */
    excludedModelIds?: string[];
}
export declare const CodexLlmSettingsConfig: z<CodexLlmSettings>;
/**
 * Keep the generated pi-ai catalog intact and overlay GPT-6 models only when
 * that installed catalog omits them. Enabling Long Context Mode then changes
 * only the known long-context family; every other descriptor and every
 * non-capacity field remains provider-owned. Exact ID exclusions apply last,
 * including to descriptors added by the overlay; source objects stay intact.
 */
export declare function applyCodexContextPolicy(models: readonly Model<Api>[], settings: CodexLlmSettings): readonly Model<Api>[];
//# sourceMappingURL=codex-context.d.ts.map