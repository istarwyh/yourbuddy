import type { CodexNativeCheckpointUsage, CodexResponsesItem, JsonValue } from './native-checkpoint.ts';
export interface CodexNativeTransportRequest {
    readonly baseUrl?: string;
    readonly publicHeaders: Readonly<Record<string, string>>;
    readonly fetchImpl: typeof fetch;
    readonly timeoutMs: number;
    readonly streamIdleTimeoutMs: number;
}
export interface CodexNativeTransportCredential {
    readonly accessToken: string;
    readonly accountId: string;
}
export interface CodexNativeTransportOperation {
    readonly sessionId: string;
    readonly windowId: string;
}
export interface CodexNativeTransportResponse {
    readonly artifact: CodexResponsesItem;
    readonly usage?: CodexNativeCheckpointUsage;
    readonly ignoredOutputItems: number;
    /** Ephemeral provider continuation; never encoded, logged, or persisted. */
    readonly turnState?: string;
}
/** One no-retry v2 request using the existing Host fetch and timeout policy. */
export declare function sendCodexNativeCompaction(request: CodexNativeTransportRequest, credential: CodexNativeTransportCredential, operation: CodexNativeTransportOperation, body: Record<string, JsonValue>, signal: AbortSignal): Promise<CodexNativeTransportResponse>;
export declare function codexResponsesUrl(baseUrl?: string): string;
//# sourceMappingURL=native-compaction-transport.d.ts.map