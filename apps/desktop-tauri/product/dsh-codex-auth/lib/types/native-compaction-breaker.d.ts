export declare const CODEX_NATIVE_DEFAULT_RATE_LIMIT_OPEN_MS: number;
type NativeFailureKind = 'auth' | 'protocol' | 'rate-limit' | 'size' | 'transient';
export declare class NativeCompactionFailure extends Error {
    readonly kind: NativeFailureKind;
    readonly retryAfterMs?: number | undefined;
    constructor(kind: NativeFailureKind, retryAfterMs?: number | undefined);
}
export interface NativeCompactionBreakerLease {
    readonly state: 'closed' | 'half-open';
    succeed(): void;
    fail(failure: NativeCompactionFailure): 'closed' | 'open';
    ignore(): void;
}
/** Process-local failure gate; it never retries or affects Portable operations. */
declare class NativeCompactionBreaker {
    private readonly states;
    acquire(key: string, now?: number): NativeCompactionBreakerLease | undefined;
    private releaseIgnoredState;
    private pruneStaleTransientStates;
    private recordFailure;
}
export declare function nativeCompactionBreakerKey(accountHash: string, model: string, endpoint: string): string;
export declare const nativeCompactionBreaker: NativeCompactionBreaker;
export {};
//# sourceMappingURL=native-compaction-breaker.d.ts.map