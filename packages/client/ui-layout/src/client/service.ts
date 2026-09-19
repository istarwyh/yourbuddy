/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry itself lives in the root entry's layout store (stores.ts);
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (sidebar toggle from ui-sidebar,
 * details open/close from ui-conversation) — writes stay inside the store's
 * declared action set, delivered as the registration's bound actions.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore } from './stores.ts'

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/** Live geometry supplied by the plugin occupying the workbench slot. */
export interface WorkbenchLayoutSnapshot {
  /** Preferred width of the auxiliary conversation column in pixels. */
  width: number
}

/** One workbench occupant's shared width state. */
export interface WorkbenchLayoutBinding {
  /** Read the current auxiliary conversation width. */
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

/**
 * The outward layout face (`ctx.layout`): the panel transitions other
 * plugins may trigger — and exactly what a test fake must supply. The
 * attachPanels wiring hook stays on the concrete class (root-entry assembly
 * only).
 */
export interface ILayout {
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /** Open the details panel (no-op when already open). */
  openDetails(): void
  /** Close the details panel. */
  closeDetails(): void
  /**
   * Register the workbench width binding for the lifetime of its slot occupant.
   * @param binding - Shared width state owned by the workbench provider.
   * @returns Disposer that restores the ordinary conversation layout.
   */
  registerWorkbench(binding: WorkbenchLayoutBinding): () => void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  #panels: PanelActions | undefined
  #workbench: WorkbenchLayoutBinding | undefined
  #offWorkbench: (() => void) | undefined
  #workbenchSnapshot: WorkbenchLayoutState = { present: false, width: 0 }
  readonly #workbenchListeners = new Set<() => void>()

  /** Subscribe to optional workbench geometry changes. */
  readonly subscribeWorkbench = (listener: () => void): (() => void) => {
    this.#workbenchListeners.add(listener)
    return () => { this.#workbenchListeners.delete(listener) }
  }

  /** Read the AppFrame-facing workbench geometry. */
  readonly getWorkbenchSnapshot = (): WorkbenchLayoutState => this.#workbenchSnapshot

  /**
   * Adopt the root entry's bound store actions. Called from the root
   * registration's inject hook (a sanctioned assembly side effect), so the
   * face is live from the entry's first render; on entry re-register the
   * fresh actions overwrite the stale set.
   * @param actions - bound actions of the entry's layout store instance.
   */
  attachPanels(actions: PanelActions): void {
    this.#panels = actions
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.#require().toggleSidebar()
  }

  /** Open the details panel (no-op when already open). */
  openDetails(): void {
    this.#require().openDetails()
  }

  /** Close the details panel. */
  closeDetails(): void {
    this.#require().closeDetails()
  }

  /**
   * Register one workbench occupant and its shared auxiliary width.
   * @param binding - Shared width state owned by the workbench provider.
   * @returns Disposer that restores the ordinary conversation layout.
   */
  registerWorkbench(binding: WorkbenchLayoutBinding): () => void {
    if (this.#workbench !== undefined) throw new Error('layout: workbench already registered')
    this.#workbench = binding
    const sync = (): void => {
      this.#workbenchSnapshot = { present: true, width: binding.getSnapshot().width }
      this.#notifyWorkbench()
    }
    this.#offWorkbench = binding.subscribe(sync)
    sync()
    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      this.#offWorkbench?.()
      this.#offWorkbench = undefined
      this.#workbench = undefined
      this.#workbenchSnapshot = { present: false, width: 0 }
      this.#notifyWorkbench()
    }
  }

  /**
   * Persist an AppFrame drag through the registered workbench binding.
   * @param width - Requested auxiliary conversation width in pixels.
   */
  setWorkbenchWidth(width: number): void {
    this.#workbench?.setWidth(width)
  }

  #notifyWorkbench(): void {
    for (const listener of [...this.#workbenchListeners]) listener()
  }

  #require(): PanelActions {
    // Callers are UI gestures, which cannot fire before the root entry
    // rendered (the inject hook runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#panels === undefined) throw new Error('layout: panel actions not wired (root entry not mounted)')
    return this.#panels
  }
}
