/**
 * Experimental Dual Checkpoint Adapter for custom Codex agent presets.
 *
 * Native generation deepens BasicCompactionEngine's public manual and automatic
 * entries plus its protected summarization Seam; every compaction decision and
 * durable mutation remains owned by the inherited Basic lifecycle.
 *
 * @module dsh-codex-auth/compaction
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { BasicCompactionEngine } from '@deepseek-ai/dsh-compaction-basic';
import type { BasicCompactionConfig } from '@deepseek-ai/dsh-compaction-basic';
import type { ContentBlock, Message, TokenUsage, ToolSchema } from '@deepseek-ai/dsh-llm';
/** The replayed prefix accepted by Basic's protected summarization Seam. */
interface PortableSummarizationInput {
    readonly system?: string;
    readonly tools?: readonly ToolSchema[];
    readonly messages: readonly Message[];
}
/** The complete result contract returned by Basic's protected summarization Seam. */
type PortableSummaryResult = {
    summary: ContentBlock[];
    provider: string;
    model: string;
    maxTokens?: number;
    usage?: TokenUsage;
} & ({
    rawOutput: ContentBlock[];
    llmStreamCall: true;
} | {
    rawOutput?: ContentBlock[];
    llmStreamCall?: never;
});
declare const DSH_RUNTIME_PACKAGES: readonly ["@deepseek-ai/dsh-agent", "@deepseek-ai/dsh-compaction", "@deepseek-ai/dsh-compaction-basic", "@deepseek-ai/dsh-llm", "@deepseek-ai/dsh-session", "@deepseek-ai/dsh-token-meter"];
type DshRuntimePackage = typeof DSH_RUNTIME_PACKAGES[number];
/** Exact runtime pair whose rc.2 framing and pi conversion behavior this Adapter uses. */
export declare const CODEX_COMPACTION_COMPATIBILITY: Readonly<{
    dsh: "0.1.1-rc.2";
    piAi: "0.82.1";
}>;
/** Runtime facts accepted by the compatibility assertion. */
export interface CodexCompactionRuntimeVersions {
    readonly dsh: Readonly<Record<DshRuntimePackage, string>>;
    readonly piAi: string;
}
/**
 * Refuse an unverified runtime before mounting the experimental Adapter.
 * The stock DSH preset remains the supported fallback for every other pair.
 */
export declare function assertCodexCompactionCompatibility(actual?: CodexCompactionRuntimeVersions): void;
/** Stable Loader id for the experimental custom-preset Adapter. */
export declare const name = "codex-compaction";
/** Preserve Basic's dependency Interface at the custom Loader Seam. */
export declare const inject: string[];
/** Preserve Basic's validated configuration Interface. */
export declare const Config: import("@deepseek-ai/schemastery").default<BasicCompactionConfig>;
export type Config = BasicCompactionConfig;
type ManualCommandId = Parameters<BasicCompactionEngine['compactNow']>[2];
type AutomaticCompactionTrigger = Parameters<BasicCompactionEngine['compactIfNeeded']>[1];
/**
 * Basic-derived Adapter that preserves Basic's transaction while augmenting one
 * eligible manual or automatic Portable summary with a Native Checkpoint.
 */
export declare class CodexCompactionEngine extends BasicCompactionEngine {
    private readonly lifecycleController;
    constructor(ctx: Context, config?: Config);
    private operationSignal;
    compactNow(agent: Agent, signal: AbortSignal, sourceCommandId?: ManualCommandId): Promise<Awaited<ReturnType<BasicCompactionEngine['compactNow']>>>;
    compactIfNeeded(agent: Agent, trigger: AutomaticCompactionTrigger, signal: AbortSignal): Promise<Awaited<ReturnType<BasicCompactionEngine['compactIfNeeded']>>>;
    protected summarize(input: PortableSummarizationInput, agent: Agent, signal?: AbortSignal): Promise<PortableSummaryResult>;
}
/** Mount the experimental Adapter inside a user-authored custom preset realm. */
export declare function apply(ctx: Context, config?: Config): void;
export {};
//# sourceMappingURL=compaction.d.ts.map