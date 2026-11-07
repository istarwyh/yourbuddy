/** Host dispatcher for the codex-auth plugin's dedicated Connection RPC. */
import type { ConnectionRpcResult as RpcResult } from '@deepseek-ai/dsh-client-connection';
import type { CodexAuthService } from './codex-auth-service.ts';
export { CODEX_AUTH_RPC_CHANNEL, CODEX_AUTH_RPC_NAMESPACE } from './rpc-contract.ts';
/** Dispatch a decoded Host request without ever exposing token material. */
export declare function handleCodexAuthRpc(service: Pick<CodexAuthService, 'status' | 'usage' | 'login'>, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<RpcResult<unknown>>;
//# sourceMappingURL=rpc.d.ts.map