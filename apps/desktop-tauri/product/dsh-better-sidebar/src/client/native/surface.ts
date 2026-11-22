/** Session-targeted writes and FIFO deferred opens for the native right Sidebar. */
import { brandString } from '@deepseek-ai/dsh-brand'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ISidebarRight, TabId } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import type { Context } from '../../context-types.ts'
import { addressBaseOf } from '../address-base.ts'
import { fileAddressFor } from '../resource-address.ts'
import type { NativePathTab, NativeTabKind, NativeTabParams, SidebarSurface } from '../service.ts'
import type { NativeTabRecords } from './tab-adapter.tsx'

/** One open retained until its target Session adopts a Sidebar store. */
type Pending =
  | { kind: 'tab'; sessionId: string; tabKind: string; params: NativeTabParams; revealIfOpened: boolean; preferNewPane: boolean }
  | { kind: 'resource'; sessionId: string; address: string; line: number | undefined; revealIfOpened: boolean; preferNewPane: boolean }

/** The Session currently displayed by the native Sidebar controller. */
export interface MountedSessions {
  getSnapshot(): string | undefined
  subscribe(listener: () => void): () => void
}

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  /** Page parameters owned by Better Sidebar's descriptor adapter. */
  interface SidebarRightTabParamsMap extends Record<NativeTabKind, NativeTabParams> {}
}

/** Native operations and the observer cleanup owned by this adapter. */
export interface NativeSurface extends SidebarSurface {
  /** Retry queued opens after a host store is adopted. */
  flushPending(): void
  /** Release observers and pending opens. */
  dispose(): void
  /** Every native tab associated with a path. */
  pathTabs(): NativePathTab[]
}

/** Read the optional controller at the time of an operation. */
function controllerOf(ctx: Context): ISidebarRight | undefined {
  return ctx.get('sidebarRight')
}

/**
 * Observe the on-screen Session; the list also discovers a late controller.
 * @param ctx - client context.
 * @returns current Session observation.
 */
export function mountedSessions(ctx: Context): MountedSessions {
  return {
    getSnapshot: () => controllerOf(ctx)?.mounted.getSnapshot(),
    subscribe: listener => {
      let stopMounted = controllerOf(ctx)?.mounted.subscribe(listener)
      const stopList = ctx.sessions.list.subscribe(() => {
        stopMounted ??= controllerOf(ctx)?.mounted.subscribe(listener)
        listener()
      })
      return () => { stopList(); stopMounted?.() }
    },
  }
}

/**
 * Read the Session whose native panel is on screen.
 * @param ctx - client context.
 * @returns on-screen Session, or undefined.
 */
export function mountedSessionId(ctx: Context): string | undefined {
  return controllerOf(ctx)?.mounted.getSnapshot()
}

/**
 * Bind native records to Session-targeted controller operations.
 * @param ctx - client context.
 * @param records - per-Session tab records.
 * @returns surface with observer cleanup.
 */
export function createNativeSurface(ctx: Context, records: NativeTabRecords): NativeSurface {
  const pending: Pending[] = []
  const place = (entry: Pending): boolean => {
    const api = controllerOf(ctx)
    if (api === undefined) return false
    const options = {
      revealIfOpened: entry.revealIfOpened,
      ...(entry.preferNewPane ? { preferNewPane: true } : {}),
    }
    const sessionId = SessionId(entry.sessionId)
    return entry.kind === 'tab'
      ? api.openTabIn(sessionId, brandString<NativeTabKind>(entry.tabKind), { ...options, params: entry.params })
      : api.openResourceIn(sessionId, entry.address, {
          ...options,
          ...(entry.line === undefined ? {} : { params: { line: entry.line } }),
        })
  }
  const flushPending = (): void => {
    const retained = pending.filter(entry => !place(entry))
    pending.splice(0, pending.length, ...retained)
  }
  const enqueue = (entry: Pending): void => {
    flushPending()
    if (!place(entry)) pending.push(entry)
  }
  const sessionOf = (tabId: string, sessionId?: string): string | undefined => {
    if (sessionId !== undefined) return records.has(sessionId, tabId) ? sessionId : undefined
    const mounted = mountedSessionId(ctx)
    if (mounted !== undefined && records.has(mounted, tabId)) return mounted
    let found: string | undefined
    for (const candidate of Object.keys(ctx.sessions.list.getSnapshot().byId)) {
      if (!records.has(candidate, tabId)) continue
      if (found !== undefined) return undefined
      found = candidate
    }
    return found
  }
  const evictGoneSessions = (): void => {
    const live = new Set(Object.keys(ctx.sessions.list.getSnapshot().byId))
    const mounted = mountedSessionId(ctx)
    if (mounted !== undefined) live.add(mounted)
    records.retain(live)
  }
  let stopAdoption = controllerOf(ctx)?.onSessionAdopted(flushPending)
  const stopList = ctx.sessions.list.subscribe(() => {
    stopAdoption ??= controllerOf(ctx)?.onSessionAdopted(flushPending)
    flushPending()
    evictGoneSessions()
  })
  const stopMounted = mountedSessions(ctx).subscribe(flushPending)
  evictGoneSessions()
  return {
    openTab({ sessionId, kind, params, revealIfOpened, preferNewPane }) {
      enqueue({ kind: 'tab', sessionId, tabKind: kind, params, revealIfOpened, preferNewPane: preferNewPane === true })
    },
    openResource({ sessionId, address, line, revealIfOpened, preferNewPane }) {
      enqueue({ kind: 'resource', sessionId, address, line, revealIfOpened, preferNewPane: preferNewPane === true })
    },
    fileAddress: (sessionId, cwd, path) => fileAddressFor(sessionId, addressBaseOf(ctx, sessionId) ?? cwd, path),
    tabTypeOf: (sessionId, tabId) => records.get(sessionId, tabId)?.tab.type,
    close(sessionId, tabId) {
      const record = records.get(sessionId, tabId)
      if (record === undefined) return undefined
      records.drop(sessionId, tabId)
      controllerOf(ctx)?.closeIn(SessionId(sessionId), brandString<TabId>(tabId))
      return {
        type: record.tab.type,
        title: record.tab.title,
        ...(record.tab.meta === undefined ? {} : { meta: record.tab.meta }),
      }
    },
    update(tabId, patch, sessionId) {
      const owner = sessionOf(tabId, sessionId)
      if (owner === undefined) return false
      records.update(owner, tabId, patch)
      return true
    },
    activate(tabId, sessionId) {
      const owner = sessionOf(tabId, sessionId)
      if (owner === undefined || owner !== mountedSessionId(ctx)) return false
      controllerOf(ctx)?.focus(brandString<TabId>(tabId))
      return true
    },
    has: (tabId, sessionId) => sessionOf(tabId, sessionId) !== undefined,
    pathTabs: () => records.pathTabs(),
    flushPending,
    dispose: () => { stopList(); stopAdoption?.(); stopMounted(); pending.length = 0 },
  }
}
