/** Convert sidebar HTTP identities to the workspace navigation API. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Context, SidebarSubagentAddress } from '../context-types.ts'

/**
 * Brand Session identities decoded from the sidebar's HTTP responses.
 * @param target - Session identity or parent/child address from the sidebar API.
 * @returns the workspace service's navigation target.
 */
export function nativeSessionTarget(target: string | SidebarSubagentAddress): Parameters<Context['uiWorkspace']['openSession']>[0] {
  return typeof target === 'string' ? target as SessionId : {
    ...target,
    parentSessionId: target.parentSessionId as SessionId,
    childSessionId: target.childSessionId as SessionId,
  }
}
