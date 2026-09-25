/** YourBuddy's product-specific middle workbench coordinator. */

import { useEffect, useRef, type ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionEventSource } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {
  HostObservable, InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
const STORAGE_KEY = 'yourbuddy.workbench:v1'
const LEGACY_WIDTH_KEY = 'dsh-sidebar:v1:width'
const DEFAULT_SESSION_WIDTH = 560
const MIN_SESSION_WIDTH = 320
const MAX_SESSION_WIDTH = 800
const SESSION_REGION_ID = 'dsh-session-region'

/** User intent attached to Better Sidebar navigation. */
export type WorkbenchOpenIntent = 'user' | 'background'

/** Product-owned middle and auxiliary-region state. */
export interface ProductWorkbenchSnapshot {
  readonly mode: 'core' | 'content'
  readonly contentId: string | null
  readonly sessionExpanded: boolean
  readonly sessionWidth: number
}

interface PersistedWorkbenchState {
  readonly version: 1
  readonly sessionExpanded: boolean
  readonly sessionWidth: number
}

function clampSessionWidth(width: number): number {
  return Math.min(MAX_SESSION_WIDTH, Math.max(MIN_SESSION_WIDTH, Math.round(width)))
}

function loadState(storage: Storage | undefined): ProductWorkbenchSnapshot {
  if (storage === undefined) {
    return { mode: 'core', contentId: null, sessionExpanded: true, sessionWidth: DEFAULT_SESSION_WIDTH }
  }
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as Partial<PersistedWorkbenchState> | null
    if (parsed?.version === 1 && typeof parsed.sessionExpanded === 'boolean'
      && typeof parsed.sessionWidth === 'number' && Number.isFinite(parsed.sessionWidth)) {
      return {
        mode: 'core',
        contentId: null,
        sessionExpanded: parsed.sessionExpanded,
        sessionWidth: clampSessionWidth(parsed.sessionWidth),
      }
    }
    const legacyWidth = Number(storage.getItem(LEGACY_WIDTH_KEY))
    const sessionWidth = Number.isFinite(legacyWidth) && legacyWidth > 0
      ? clampSessionWidth(legacyWidth)
      : DEFAULT_SESSION_WIDTH
    const migrated: PersistedWorkbenchState = { version: 1, sessionExpanded: true, sessionWidth }
    storage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    return { mode: 'core', contentId: null, sessionExpanded: true, sessionWidth }
  } catch {
    return { mode: 'core', contentId: null, sessionExpanded: true, sessionWidth: DEFAULT_SESSION_WIDTH }
  }
}

/** Observable product coordinator shared by the host, navigation adapters, and layout binding. */
export class ProductWorkbenchController implements HostObservable<ProductWorkbenchSnapshot> {
  private snapshot: ProductWorkbenchSnapshot
  private readonly listeners = new Set<() => void>()

  /**
   * @param storage - Browser storage for the versioned Session-region preference.
   */
  constructor(private readonly storage: Storage | undefined) {
    this.snapshot = loadState(storage)
  }

  /** @returns the identity-stable current state. */
  getSnapshot = (): ProductWorkbenchSnapshot => this.snapshot

  /**
   * Subscribe to committed product-workbench transitions.
   * @param listener - Invalidation callback.
   * @returns the unsubscribe function.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Show the durable Better Sidebar workbench without changing Session geometry. */
  showCore(): void {
    this.commit({ ...this.snapshot, mode: 'core' })
  }

  /**
   * Show one creator detail in the middle seat.
   * @param id - Oil Creator content identity.
   */
  showContent(id: string): void {
    this.commit({ ...this.snapshot, mode: 'content', contentId: id })
  }

  /**
   * Apply the navigation policy for one Better Sidebar open.
   * @param intent - Explicit user navigation or a background update.
   */
  handleBetterSidebarOpen(intent: WorkbenchOpenIntent): void {
    if (intent === 'user') this.showCore()
  }

  /**
   * Expand or collapse the aggregate auxiliary main and rightbar region.
   * @param expanded - Requested rendered state.
   */
  setSessionExpanded(expanded: boolean): void {
    if (this.snapshot.sessionExpanded === expanded) return
    this.commit({ ...this.snapshot, sessionExpanded: expanded })
    this.persist()
  }

  /**
   * Save the positive Conversation width restored by the next expansion.
   * @param width - Requested width in pixels.
   */
  setSessionWidth(width: number): void {
    const sessionWidth = clampSessionWidth(width)
    if (this.snapshot.sessionWidth === sessionWidth) return
    this.commit({ ...this.snapshot, sessionWidth })
    this.persist()
  }

  private commit(next: ProductWorkbenchSnapshot): void {
    if (next.mode === this.snapshot.mode && next.contentId === this.snapshot.contentId
      && next.sessionExpanded === this.snapshot.sessionExpanded
      && next.sessionWidth === this.snapshot.sessionWidth) return
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }

  private persist(): void {
    try {
      const value: PersistedWorkbenchState = {
        version: 1,
        sessionExpanded: this.snapshot.sessionExpanded,
        sessionWidth: this.snapshot.sessionWidth,
      }
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Browser storage is optional; the in-memory preference remains authoritative for this activation.
    }
  }
}

/** Cordis service face consumed structurally by product feature adapters. */
export interface IProductWorkbench {
  showCore(): void
  showContent(id: string): void
  handleBetterSidebarOpen(intent: WorkbenchOpenIntent): void
  setSessionExpanded(expanded: boolean): void
  getSnapshot(): ProductWorkbenchSnapshot
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** YourBuddy-only coordinator for the shared middle seat and Session region. */
    yourBuddyWorkbench: IProductWorkbench
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Better Sidebar's durable product workbench. */
    'workbench.core': { kind: 'single'; scope: 'root' }
    /** Oil Creator's selected content detail. */
    'workbench.content': { kind: 'single'; scope: 'root' }
  }
}

interface CoordinatorInjection {
  readonly hooks: { readonly productWorkbench: HostObservable<ProductWorkbenchSnapshot> }
  readonly collapseSession: () => void
  readonly restoreSession: () => void
}

type WorkbenchHostProps =
  & PropsRuntime<'workbench'>
  & PropsRenderSlots<'workbench.core' | 'workbench.content'>
  & InjectFace<CoordinatorInjection>
  & PropsLocale<'settings.personal-workbench'>

/** Keep both middle children mounted and expose recovery outside the collapsed Session region. */
export function ProductWorkbenchHost({
  renderSlot, useProductWorkbench, collapseSession, restoreSession, t,
}: WorkbenchHostProps): ReactNode {
  const snapshot = useProductWorkbench(value => value)
  const previousMode = useRef(snapshot.mode)
  useEffect(() => {
    if (previousMode.current !== snapshot.mode) window.requestAnimationFrame(() => { window.dispatchEvent(new Event('resize')) })
    previousMode.current = snapshot.mode
  }, [snapshot.mode])
  const coreHidden = snapshot.mode !== 'core'
  const contentHidden = snapshot.mode !== 'content'
  return (
    <div className="dpw-workbench" data-product-workbench data-mode={snapshot.mode}>
      <div className="dpw-workbench-surface" data-workbench-surface="core" hidden={coreHidden} {...(coreHidden ? { inert: '' } : {})}>
        {renderSlot('workbench.core', {})}
      </div>
      <div className="dpw-workbench-surface" data-workbench-surface="content" hidden={contentHidden} {...(contentHidden ? { inert: '' } : {})}>
        {renderSlot('workbench.content', {})}
      </div>
      {snapshot.sessionExpanded
        ? (
            <button
              type="button"
              className="dpw-workbench-session-collapse"
              aria-label={t('workbench.session.collapse')}
              aria-controls={SESSION_REGION_ID}
              aria-expanded="true"
              title={t('workbench.session.collapse')}
              onClick={collapseSession}
            >
              <span aria-hidden="true">›</span>
            </button>
          )
        : (
            <button
              type="button"
              className="dpw-session-restore"
              aria-label={t('workbench.session.restore')}
              aria-controls={SESSION_REGION_ID}
              aria-expanded="false"
              title={t('workbench.session.restore')}
              onClick={restoreSession}
            >
              <span aria-hidden="true">‹</span>
              <span>{t('workbench.session.restore')}</span>
            </button>
          )}
    </div>
  )
}

interface CollapseInjection {
  readonly collapseSession: () => void
}

type CollapseActionProps =
  & PropsRuntime<'conversation.session.header.actions'>
  & InjectFace<CollapseInjection>
  & PropsLocale<'settings.personal-workbench'>

/** Conversation-header action that collapses the complete Session region. */
export function SessionRegionCollapseAction({
  collapseSession, t,
}: CollapseActionProps): ReactNode {
  return (
    <button
      type="button"
      className="dpw-session-collapse"
      aria-label={t('workbench.session.collapse')}
      aria-controls={SESSION_REGION_ID}
      aria-expanded="true"
      title={t('workbench.session.collapse')}
      onClick={collapseSession}
    >
      <span aria-hidden="true">›</span>
    </button>
  )
}

/**
 * Observe current-Session input requests and appended Turn completion events.
 * @param ctx - Client context owning Session services.
 * @param controller - Product coordinator to expand.
 * @returns disposer for every Session subscription.
 */
export function observeSessionAttention(ctx: Context, controller: ProductWorkbenchController): () => void {
  let current: SessionId | undefined
  let eventSource: SessionEventSource | undefined
  let disposeEvents: (() => void) | undefined
  let pendingKey: string | undefined
  let initialized = false

  const bindCurrent = (): void => {
    const next = Object.values(ctx.sessions.list.getSnapshot().byId)
      .find(candidate => (candidate.retainedBy.mainView ?? 0) > 0)?.id
    if (initialized && next === current && eventSource !== undefined) return
    const sessionChanged = initialized && next !== current
    initialized = true
    current = next
    pendingKey = next === undefined
      ? undefined
      : ctx.uiSession.sessionStatus.getSnapshot().get(next)?.pendingInteraction?.key
    if (sessionChanged) {
      controller.showCore()
      controller.setSessionExpanded(true)
    }
    disposeEvents?.()
    disposeEvents = undefined
    eventSource = next === undefined ? undefined : ctx.sessions.binding(next)?.eventSource
    if (eventSource === undefined) return
    disposeEvents = eventSource.subscribe(() => {
      const change = eventSource?.getSnapshot().change
      if (change?.kind !== 'append') return
      if (change.entries.some(entry => entry.type === 'event' && entry.event.type === 'turn/end')) {
        controller.setSessionExpanded(true)
      }
    })
  }

  const syncPending = (): void => {
    if (current === undefined) return
    const nextKey = ctx.uiSession.sessionStatus.getSnapshot().get(current)?.pendingInteraction?.key
    if (nextKey !== undefined && nextKey !== pendingKey) controller.setSessionExpanded(true)
    pendingKey = nextKey
  }

  bindCurrent()
  const disposeSessions = ctx.sessions.list.subscribe(bindCurrent)
  const disposePending = ctx.uiSession.sessionStatus.subscribe(syncPending)
  return () => {
    disposePending()
    disposeSessions()
    disposeEvents?.()
  }
}

/** Install the root workbench occupant, service, layout binding, and collapse action. */
export function installProductWorkbench(ctx: Context): () => void {
  const storage = typeof localStorage === 'undefined' ? undefined : localStorage
  const controller = new ProductWorkbenchController(storage)
  const disposeService = ctx.reflect.provide('yourBuddyWorkbench', controller)
  const disposeAttention = observeSessionAttention(ctx, controller)
  const collapseSession = (): void => { controller.setSessionExpanded(false) }
  const injection: CoordinatorInjection = {
    hooks: { productWorkbench: controller },
    collapseSession,
    restoreSession: () => { controller.setSessionExpanded(true) },
  }
  const collapseInjection: CollapseInjection = { collapseSession }
  const disposeHost = ctx.slots.inject('workbench', () => {
    const disposeRegistration = ctx.slots.register({
      name: 'workbench',
      locale: 'settings.personal-workbench',
      children: {
        'workbench.core': { kind: 'single', scope: 'root' },
        'workbench.content': { kind: 'single', scope: 'root' },
      },
      inject: () => injection,
    }, ProductWorkbenchHost)
    let disposeLayout: () => void
    try {
      disposeLayout = ctx.layout.registerWorkbench({
        getSnapshot: () => ({
          width: controller.getSnapshot().sessionWidth,
          expanded: controller.getSnapshot().sessionExpanded,
          reserveRightbar: true,
        }),
        subscribe: controller.subscribe,
        setWidth: width => { controller.setSessionWidth(width) },
      })
    } catch (error) {
      disposeRegistration()
      throw error
    }
    return () => {
      disposeRegistration()
      disposeLayout()
    }
  })
  const disposeCollapse = ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'yourbuddy-session-collapse',
    order: 1000,
    locale: 'settings.personal-workbench',
    inject: () => collapseInjection,
  }, SessionRegionCollapseAction))
  return () => {
    disposeCollapse()
    disposeHost()
    disposeAttention()
    controller.showCore()
    void disposeService()
  }
}
