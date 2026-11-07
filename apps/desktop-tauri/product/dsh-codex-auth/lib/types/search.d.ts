import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { WebSearchProvider, WebSearchRequest, WebSearchResult } from '@deepseek-ai/dsh-web';
import type { CodexAuthService } from './codex-auth-service.ts';
import { type LiveValue } from './volatile-config.ts';
/** Stable provider id selected by DSH's stock `web_search` Capability Tool. */
export declare const CODEX_SEARCH_PROVIDER_ID = "codex";
/** Official standalone search endpoint used by Codex 0.147.0. */
export declare const CODEX_SEARCH_ENDPOINT = "https://chatgpt.com/backend-api/codex/alpha/search";
export declare const CODEX_SEARCH_SETTINGS_NAMESPACE = "codex-search";
export type CodexSearchMode = 'live' | 'cached' | 'indexed';
export type CodexSearchContextSize = 'low' | 'medium' | 'high';
/** Codex ChatGPT-sign-in replacement for retired `gpt-5.4`. */
export declare const DEFAULT_CODEX_SEARCH_FALLBACK_MODEL = "gpt-5.6-terra";
/** Independently live settings for the Global Codex Search Provider. */
export interface CodexSearchSettings {
    enabled: boolean;
    mode: CodexSearchMode;
    contextSize: CodexSearchContextSize;
    fallbackModel: string;
    maxOutputTokens: number;
}
export interface Config {
    enabled: LiveValue<boolean>;
    mode: LiveValue<CodexSearchMode>;
    contextSize: LiveValue<CodexSearchContextSize>;
    fallbackModel: LiveValue<string>;
    maxOutputTokens: LiveValue<number>;
}
export declare const Config: z<Config>;
export interface CodexSearchProviderOptions {
    auth: Pick<CodexAuthService, 'credential'>;
    settings: () => CodexSearchSettings;
    fetchImpl: typeof fetch;
    /** Stable request/session id for the current operation. */
    requestId?: () => string;
    /** Current initiating Codex model, or undefined to use the fallback setting. */
    initiatingModel?: () => string | undefined;
    /** Injectable only to make the public retry behavior deterministic in fixtures. */
    retryBaseDelayMs?: number;
}
/** Codex backend implementation behind DSH's existing stock `web_search` tool. */
export declare class CodexSearchProvider implements WebSearchProvider {
    private readonly options;
    readonly id = "codex";
    constructor(options: CodexSearchProviderOptions);
    available(): boolean;
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
    private dispatch;
}
/** Cordis plugin name for the independent Search row. */
export declare const name = "codex-search";
export declare const inject: string[];
/** Register the Global Codex Search Provider with independently live settings. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=search.d.ts.map