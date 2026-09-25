/**
 * The plugin's write face over DSH's native right Sidebar (`ctx.sidebarRight`).
 *
 * The service speaks in the plugin's own vocabulary (tab type, seed, session
 * scope); this module turns those into the native surface's vocabulary
 * (kind + navigation params, or a `dsh-resource://` address) and forwards
 * tab-record operations to the plugin's native record registry.
 *
 * Two native limits shape the implementation:
 *
 * - the surface exists only while a session's panel is mounted, and the
 *   service's public face (`ISidebarRight`) writes only into THAT session.
 *   The controller also carries `openTabIn` / `openResourceIn` /
 *   `closeIn`, which act on any Session whose store the runtime has minted;
 *   an open for a Session that has no store yet is queued and replayed in
 *   request order when that store is adopted;
 * - layout state is memory-only, so a queued open is not durable either.
 */
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { ISidebarRight } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Context } from '../../context-types.ts'
import { fileAddressFor } from '../resource-address.ts'
import type { NativeTabParams, SidebarSurface } from '../service.ts'
import type { NativeTabRecords } from './tab-adapter.tsx'

/** One open the surface could not place yet. */
type Pending =
  | { kind: 'tab'; sessionId: string; tabKind: string; params: NativeTabParams; revealIfOpened: boolean }
  | { kind: 'resource'; sessionId: string; address: string; line: number | undefined; revealIfOpened: boolean }

/** The plugin's write face over the native surface. */
export interface NativeSurface extends SidebarSurface {
  /** Stop observing Session-list and native-store lifecycle changes. */
  dispose(): void
}

/**
 * Bind the plugin's write face to the native controller.
 * @param ctx - the client context (session list + `ctx.sidebarRight`).
 * @param records - the plugin's native tab record registry.
 * @returns the surface, plus a disposer unbinding its session subscription.
 */
export function createNativeSurface(ctx: Context, records: NativeTabRecords): NativeSurface {
  const pending: Pending[] = []
  const controller = (): ISidebarRight | undefined =>
    ctx.get('sidebarRight') as unknown as ISidebarRight | undefined

  const place = (entry: Pending): boolean => {
    const api = controller()
    if (api === undefined) return false
    const sessionId = entry.sessionId as SessionId
    if (entry.kind === 'tab') {
      const options = { params: entry.params, revealIfOpened: entry.revealIfOpened }
      return api.openTabIn(sessionId, entry.tabKind, options)
    }
    const options = {
      ...(entry.line === undefined ? {} : { params: { line: entry.line } }),
      revealIfOpened: entry.revealIfOpened,
    }
    return api.openResourceIn(sessionId, entry.address, options)
  }

  const flushPending = (): void => {
    if (pending.length === 0) return
    const retained = pending.filter(entry => !place(entry))
    pending.splice(0, pending.length, ...retained)
  }

  const enqueue = (entry: Pending): void => {
    // A later open may follow a controller replacement, so it also retries
    // retained operations before placing the new request.
    flushPending()
    if (!place(entry)) pending.push(entry)
  }

  const unsubscribeSessionList = ctx.sessions.list.subscribe(flushPending)
  const unsubscribeAdoption = controller()?.onSessionAdopted(flushPending)
  return {
    openTab({ sessionId, kind, params, revealIfOpened }) {
      enqueue({ kind: 'tab', sessionId, tabKind: kind, params, revealIfOpened })
    },
    openResource({ sessionId, address, line, revealIfOpened }) {
      enqueue({ kind: 'resource', sessionId, address, line, revealIfOpened })
    },
    fileAddress(sessionId, cwd, path) {
      return fileAddressFor(sessionId, cwd, path)
    },
    close(sessionId, tabId) {
      const record = records.get(tabId)
      if (record === undefined) return undefined
      records.drop(tabId)
      controller()?.closeIn(sessionId as SessionId, tabId as TabId)
      return { type: record.tab.type, title: record.tab.title }
    },
    update(tabId, patch) {
      if (!records.has(tabId)) return false
      records.update(tabId, patch)
      return true
    },
    activate(tabId) {
      // The native surface has no cross-pane activation face the plugin needs:
      // a tab is focused by opening its (kind, address) again, which the
      // native open already de-duplicates.
      return records.has(tabId)
    },
    has: tabId => records.has(tabId),
    dispose: () => {
      unsubscribeSessionList()
      unsubscribeAdoption?.()
    },
  }
}
