/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry and main-panel selection live in the root layout store;
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (main-panel selection and sidebar toggle,
 * right-panel show/hide from ui-sidebar-right) — writes stay inside the
 * store's declared action set, shared with the root registration.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { createLayoutStore } from './stores.ts'

/** Identity shared by a sidebar panel entry and its main-slot occupant. */
export type MainPanelId = Branded<'MainPanelId'>

/** Root-scoped navigation state exposed to panel-aware components. */
export interface PanelInfo {
  /** Selected global panel; null displays the current Conversation. */
  readonly activePanelId: MainPanelId | null
}

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/** Live geometry supplied by the plugin occupying the optional workbench slot. */
export interface WorkbenchLayoutSnapshot {
  /** Preferred width of the auxiliary main-content column in pixels. */
  width: number
}

/** One workbench occupant's shared width state. */
export interface WorkbenchLayoutBinding {
  /** Read the current auxiliary main-content width. */
  getSnapshot(): WorkbenchLayoutSnapshot
  /** Subscribe to width changes. */
  subscribe(listener: () => void): () => void
  /** Persist a width chosen through the AppFrame drag handle. */
  setWidth(width: number): void
}

/** AppFrame-facing view of the optional workbench contribution. */
export interface WorkbenchLayoutState extends WorkbenchLayoutSnapshot {
  /** Whether a workbench contribution currently owns the primary region. */
  present: boolean
}

/** Panel navigation, geometry, and optional workbench actions exposed through ctx.layout. */
export interface ILayout {
  /**
   * Select a global central panel without changing the current Session.
   * @param panelId - registered main key, or null to show the Conversation.
   * @throws if the selected main key is not registered; preserves the current selection.
   */
  selectPanel(panelId: MainPanelId | null): void
  /**
   * Start an asynchronous navigation, superseding any earlier pending navigation.
   * @returns a signal aborted by the next navigation or layout disposal; check it before committing UI state.
   */
  beginNavigation(): AbortSignal
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /**
   * Report the right panel's presentation without changing its expanded state.
   * @param track - whether the normal panel width reserves a grid track,
   *   including beneath a fullscreen overlay.
   * @param fullscreen - whether the panel covers the frame and hides its outer
   *   resize handle; independent of the underlying grid track.
   */
  openRightbar(track: boolean, fullscreen: boolean): void
  /** Report the right panel as hidden: no track, no handle. */
  closeRightbar(): void
  /**
   * Register the workbench width binding for the lifetime of its slot occupant.
   * @param binding - Shared width state owned by the workbench provider.
   * @returns Disposer that restores the ordinary main-content layout.
   */
  registerWorkbench(binding: WorkbenchLayoutBinding): () => void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  private navigation = new AbortController()
  private workbench: WorkbenchLayoutBinding | undefined
  private offWorkbench: (() => void) | undefined
  private workbenchSnapshot: WorkbenchLayoutState = { present: false, width: 0 }
  private readonly workbenchListeners = new Set<() => void>()

  /** Subscribe to optional workbench geometry changes. */
  readonly subscribeWorkbench = (listener: () => void): (() => void) => {
    this.workbenchListeners.add(listener)
    return () => { this.workbenchListeners.delete(listener) }
  }

  /** Read the AppFrame-facing workbench geometry. */
  readonly getWorkbenchSnapshot = (): WorkbenchLayoutState => this.workbenchSnapshot

  /**
   * @param panels - actions of the instance shared with the root entry.
   * @param hasMainPanel - checks the live main-slot registry for a panel id.
   */
  constructor(
    private readonly panels: PanelActions,
    private readonly hasMainPanel: (id: MainPanelId) => boolean,
  ) {}

  /** Select a global panel or return to the Conversation. */
  selectPanel(panelId: MainPanelId | null): void {
    if (panelId !== null && !this.hasMainPanel(panelId)) {
      throw new Error(`layout.selectPanel: main panel "${panelId}" is not registered`)
    }
    this.navigation.abort()
    this.panels.selectPanel(panelId)
  }

  /** @returns the new pending navigation's cancellation signal. */
  beginNavigation(): AbortSignal {
    this.navigation.abort()
    this.navigation = new AbortController()
    return this.navigation.signal
  }

  /** Invalidate pending navigations and detach optional workbench geometry. */
  dispose(): void {
    this.navigation.abort()
    this.releaseWorkbench()
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.panels.toggleSidebar()
  }

  /** Report the right panel's track and fullscreen presentation. */
  openRightbar(track: boolean, fullscreen: boolean): void {
    this.panels.openRightbar(track, fullscreen)
  }

  /** Report the right panel as hidden: no track, no handle. */
  closeRightbar(): void {
    this.panels.closeRightbar()
  }

  /**
   * Register one workbench occupant and its shared auxiliary width.
   * @param binding - Shared width state owned by the workbench provider.
   * @returns Disposer that restores the ordinary main-content layout.
   */
  registerWorkbench(binding: WorkbenchLayoutBinding): () => void {
    if (this.workbench !== undefined) throw new Error('layout: workbench already registered')
    this.workbench = binding
    const sync = (): void => {
      this.workbenchSnapshot = { present: true, width: binding.getSnapshot().width }
      this.notifyWorkbench()
    }
    this.offWorkbench = binding.subscribe(sync)
    sync()
    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      if (this.workbench === binding) this.releaseWorkbench()
    }
  }

  /**
   * Persist an AppFrame drag through the registered workbench binding.
   * @param width - Requested auxiliary main-content width in pixels.
   */
  setWorkbenchWidth(width: number): void {
    this.workbench?.setWidth(width)
  }

  private releaseWorkbench(): void {
    if (this.workbench === undefined) return
    this.offWorkbench?.()
    this.offWorkbench = undefined
    this.workbench = undefined
    this.workbenchSnapshot = { present: false, width: 0 }
    this.notifyWorkbench()
  }

  private notifyWorkbench(): void {
    for (const listener of [...this.workbenchListeners]) listener()
  }
}
