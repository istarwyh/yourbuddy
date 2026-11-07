/** Human command for inspecting and starting the shared Codex login. */
import type { CommandDefinition } from '@deepseek-ai/dsh-commands';
import type { CodexAuthService } from './codex-auth-service.ts';
import { type LoopbackRpcMode } from './loopback-rpc.ts';
type AuthCommandService = Pick<CodexAuthService, 'login' | 'status'>;
/**
 * Build the slash command shared by every interactive DSH surface.
 * @param service - the shared Host auth service.
 * @param accountMode - live account-control activation for this Host
 * composition (enabled on a local terminal Host with no WebServer or a
 * loopback-bound WebServer, blocked on a public Web bind); when blocked the
 * command denies every operation without touching the auth service.
 */
export declare function createCodexAuthCommand(service: AuthCommandService, accountMode: () => LoopbackRpcMode): CommandDefinition;
export {};
//# sourceMappingURL=auth-command.d.ts.map