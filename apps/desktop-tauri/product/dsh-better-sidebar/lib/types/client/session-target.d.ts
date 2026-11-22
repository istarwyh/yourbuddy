import type { Context, SidebarSubagentAddress } from '../context-types.ts';
/**
 * Brand Session identities decoded from the sidebar's HTTP responses.
 * @param target - Session identity or parent/child address from the sidebar API.
 * @returns the workspace service's navigation target.
 */
export declare function nativeSessionTarget(target: string | SidebarSubagentAddress): Parameters<Context['uiWorkspace']['openSession']>[0];
