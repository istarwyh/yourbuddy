import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { nativeSessionTarget } from './session-target.ts'
/** Optional dsh-context navigation, owned by one better-sidebar activation. */
import type { Context, SidebarSubagentAddress } from '../context-types.ts'

// dsh-context 0.72.0 registers this type and keyed body; it exposes no service.
const CONTEXT_KIND = 'dsh-context'
const BODY_SLOT = 'sidebar.right.pane.tab'
const TIMEOUT_MS = 10_000
const RETRY_MS = 50

export interface ContextDiagnosticTarget {
  sessionId: string
  label?: string
  address?: SidebarSubagentAddress
}

export interface ContextDiagnosticError {
  reason: 'unavailable' | 'navigation' | 'timeout' | 'open'
  targetLabel: string
}

export interface ContextDiagnosticsSnapshot {
  available: boolean
  busy: boolean
  error?: ContextDiagnosticError
}

export interface ContextDiagnostics {
  getSnapshot(): ContextDiagnosticsSnapshot
  subscribe(listener: () => void): () => void
  open(target: ContextDiagnosticTarget): void
  dismissError(): void
  dispose(): void
}

interface Faces {
  right: Context['sidebarRight']
  registry: Context['sidebarRightTabs']
  slots: ClientContext['slots']
  workspace: Context['uiWorkspace']
  layout: Context['layout']
}

interface Request {
  target: ContextDiagnosticTarget
  cleanups: Array<() => void>
  ready: boolean
  working: boolean
  opened: boolean
  signal?: AbortSignal
  retry?: ReturnType<typeof setTimeout>
}

/** Read optional services from their registered public APIs. */
function facesOf(ctx: Context): Faces | undefined {
  const right = ctx.get('sidebarRight')
  const registry = ctx.get('sidebarRightTabs')
  const workspace = ctx.get('uiWorkspace')
  const layout = ctx.get('layout')
  const client: ClientContext = ctx
  const slots = client.get('slots')
  if (right === undefined || registry === undefined || workspace === undefined
    || layout === undefined || slots === undefined) return undefined
  return { right, registry, workspace, layout, slots }
}

function available(faces: Faces | undefined): boolean {
  if (faces === undefined) return false
  try {
    const type = faces.registry.get(CONTEXT_KIND)
    return type?.kind === CONTEXT_KIND && typeof type.id === 'string' && type.id !== ''
      && faces.slots.entriesOfSlot(BODY_SLOT).some(entry => entry.options.key === type.id)
  } catch {
    return false
  }
}

/** Create once in apply(), not once per keepMounted view. No idle timers or requests. */
export function createContextDiagnostics(ctx: Context): ContextDiagnostics {
  let snapshot: ContextDiagnosticsSnapshot = { available: false, busy: false }
  const listeners = new Set<() => void>()
  let faces: Faces | undefined
  let pending: Request | undefined
  let disposed = false

  const publish = (next: ContextDiagnosticsSnapshot): void => {
    if (disposed || (snapshot.available === next.available && snapshot.busy === next.busy && snapshot.error === next.error)) return
    snapshot = next
    for (const listener of listeners) listener()
  }

  const finish = (request: Request, reason?: ContextDiagnosticError['reason']): void => {
    if (pending !== request) return
    pending = undefined
    if (request.retry !== undefined) clearTimeout(request.retry)
    for (const cleanup of request.cleanups.splice(0).reverse()) cleanup()
    publish({
      available: available(faces), busy: false,
      ...(reason === undefined ? {} : { error: { reason, targetLabel: request.target.label ?? request.target.sessionId } }),
    })
  }

  const own = (request: Request, cleanup: () => void): void => {
    if (pending === request) request.cleanups.push(cleanup)
    else cleanup()
  }

  const refresh = (): void => {
    const ready = available(faces)
    if (!ready && pending !== undefined) finish(pending, 'unavailable')
    else publish({ ...snapshot, available: ready })
  }

  const retry = (request: Request): void => {
    if (pending !== request || request.retry !== undefined) return
    request.retry = setTimeout(() => {
      request.retry = undefined
      attempt(request)
    }, RETRY_MS)
  }

  const attempt = (request: Request): void => {
    if (pending !== request || !request.ready || request.working) return
    if (request.signal?.aborted === true) { finish(request); return }
    const current = faces
    if (current === undefined || !available(current)) { finish(request, 'unavailable'); return }
    request.working = true
    try {
      // mounted changes before React adopts the arriving session's sidebar store.
      if (current.right.mounted.getSnapshot() !== request.target.sessionId) return
      let tab = current.right.openTabs.getSnapshot().find(row => row.sessionId === request.target.sessionId && row.kind === CONTEXT_KIND)
      if (tab === undefined && !request.opened) {
        current.right.openTab(CONTEXT_KIND)
        request.opened = true
        tab = current.right.openTabs.getSnapshot().find(row => row.sessionId === request.target.sessionId && row.kind === CONTEXT_KIND)
      }
      if (pending !== request || request.signal?.aborted) return
      if (tab !== undefined) {
        // Native page deduplication is pane-local; focus the session's existing page.
        current.right.focus(tab.tabId)
        if (!current.right.isExpanded()) current.right.toggleExpanded()
        if (current.right.mounted.getSnapshot() === request.target.sessionId
          && current.right.active()?.id === tab.tabId && current.right.isExpanded()) {
          finish(request)
          return
        }
      }
      retry(request)
    } catch (error) {
      if (error instanceof Error && error.message === 'sidebarRight: no session surface is mounted') retry(request)
      else finish(request, 'open')
    } finally {
      request.working = false
    }
  }

  // These dependencies suspend only this child fiber, never the main plugin.
  const integration = ctx.inject(['sidebarRightTabs', 'sidebarRight', 'uiWorkspace', 'layout', 'slots'], (injected) => {
    const connected = facesOf(injected as Context)
    if (disposed || connected === undefined) return
    faces = connected
    const cleanups: Array<() => void> = []
    try {
      cleanups.push(connected.registry.subscribe(refresh))
      cleanups.push(connected.slots.subscribe(BODY_SLOT, refresh))
      refresh()
    } catch {
      faces = undefined
      for (const cleanup of cleanups.reverse()) cleanup()
      refresh()
      return
    }
    return () => {
      faces = undefined
      for (const cleanup of cleanups.reverse()) cleanup()
      refresh()
    }
  })

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => {}
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    open: (target) => {
      if (disposed || pending !== undefined) return
      const current = faces
      if (current === undefined || !available(current)) {
        publish({ available: false, busy: false, error: { reason: 'unavailable', targetLabel: target.label ?? target.sessionId } })
        return
      }
      if (target.sessionId === '' || (target.address !== undefined
        && (target.address.childSessionId !== target.sessionId || target.address.parentSessionId === ''))) {
        publish({ available: true, busy: false, error: { reason: 'navigation', targetLabel: target.label ?? target.sessionId } })
        return
      }
      const request: Request = { target: { ...target }, ready: false, working: false, opened: false, cleanups: [] }
      pending = request
      publish({ available: true, busy: true })
      if (pending !== request) return
      const deadline = setTimeout(() => { finish(request, 'timeout') }, TIMEOUT_MS)
      own(request, () => { clearTimeout(deadline) })
      try {
        own(request, current.right.mounted.subscribe(() => { attempt(request) }))
        own(request, current.right.openTabs.subscribe(() => { attempt(request) }))
        if (current.right.mounted.getSnapshot() !== target.sessionId) current.workspace.openSession(nativeSessionTarget(target.address ?? target.sessionId))
        if (pending !== request) return
        // openSession itself selects the conversation panel, aborting older signals.
        const signal = current.layout.beginNavigation()
        request.signal = signal
        const cancel = (): void => { finish(request) }
        signal.addEventListener('abort', cancel, { once: true })
        own(request, () => { signal.removeEventListener('abort', cancel) })
        request.ready = true
        attempt(request)
      } catch {
        finish(request, 'navigation')
      }
    },
    dismissError: () => { publish({ available: snapshot.available, busy: snapshot.busy }) },
    dispose: () => {
      if (disposed) return
      disposed = true
      if (pending !== undefined) finish(pending)
      snapshot = { available: false, busy: false }
      void integration?.dispose()
      listeners.clear()
    },
  }
}
