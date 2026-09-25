/**
 * Shell frame registered into the built-in 'root' slot. Its default grid is
 * sidebar | main | rightbar. An occupied workbench slot changes the desktop
 * grid to sidebar | workbench | rightbar | auxiliary main. Narrow viewports
 * keep an expanded auxiliary region primary and render the workbench as an
 * overlay; collapsing that region makes the workbench primary at every width.
 * The frame owns drag handles, the column solve, and child-slot placement.
 *
 * The right column is a track, not a box: its occupant draws its panel anchored
 * to the frame's right edge at the resolved normal width, and the
 * track only decides whether the centre makes room for it. The occupant reports
 * shown/track/fullscreen through `ctx.layout`; fullscreen keeps the reported
 * track but hides the outer resize handle. Everything arrives through the framework
 * shares — zero cordis or framework imports, zero self-made hooks.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore, SnapshotSelectorHook,
} from '@deepseek-ai/dsh-client-ui-slots'
import { CENTER_MIN, clampWidth, computeColumns, RIGHTBAR_DEFAULT_RATIO, RIGHTBAR_MAX_RATIO, RIGHTBAR_MIN, SIDEBAR_AUTO_COLLAPSE, SIDEBAR_COLLAPSED, SIDEBAR_DEFAULT } from './columns.ts'
import { DocumentTitle } from './DocumentTitle.tsx'
import type { createLayoutStore } from './stores.ts'
import type { WorkbenchLayoutState } from './service.ts'
import css from './AppFrame.module.css'

/** Below this width main content stays primary and the workbench uses the overlay. */
export const WORKBENCH_DRAWER_BREAKPOINT = 768
const SESSION_REGION_ID = 'dsh-session-region'

/** Full composed props: runtime share + child-slot render share + store share. */
export type AppFrameProps =
  & PropsRuntime<'root'>
  & PropsRenderSlots<'sidebar' | 'main' | 'workbench' | 'rightbar' | 'shell.overlay' | 'shell.leading'>
  & PropsStore<ReturnType<typeof createLayoutStore>>
  & PropsLocale<'common'>
  & {
    useWorkbenchLayout: SnapshotSelectorHook<WorkbenchLayoutState>
    readonly setWorkbenchWidth: (width: number) => void
  }

/** Center column grid item (session-body building block). */
function CenterColumn(props: { children?: ReactNode }) {
  return <div className={css.centerCol}>{props.children}</div>
}

/** Primary workbench grid item. */
function WorkbenchColumn(props: { children?: ReactNode }) {
  return <div className={css.workbenchCol}>{props.children}</div>
}

/** Aggregate Session region kept mounted while the workbench takes its tracks. */
function SessionRegion(props: { children?: ReactNode; visible: boolean }) {
  const regionRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const region = regionRef.current
    /* v8 ignore next -- the ref is attached whenever this mounted component's effect runs. */
    if (region === null) return
    if (!props.visible && region.contains(document.activeElement)) {
      document.querySelector<HTMLElement>(
        `[aria-controls="${SESSION_REGION_ID}"][aria-expanded="false"]`,
      )?.focus()
    }
    region.inert = !props.visible
  }, [props.visible])
  return (
    <div
      id={SESSION_REGION_ID}
      ref={regionRef}
      className={css.sessionRegion}
      aria-hidden={!props.visible || undefined}
    >
      {props.children}
    </div>
  )
}

/** Auxiliary main-content grid item. */
function AuxiliaryColumn(props: { children?: ReactNode }) {
  return <div className={css.auxiliaryCol}>{props.children}</div>
}

/** Subscribe to the main key without subscribing the column frame to each panel id. */
function MainPanel({ usePanelInfo, renderSlot }: Pick<PropsRuntime<'root'>, 'usePanelInfo'> & PropsRenderSlots<'main'>) {
  const panelId = usePanelInfo(info => info.activePanelId)
  return renderSlot('main', {}, { entryKey: panelId ?? 'conversation' })
}

/**
 * Right column grid item. Zero-width unless the occupant asked for a track; the
 * occupant's panel is positioned against the column's right edge, which never
 * moves, so it can hang over the centre when there is no track.
 */
function RightbarColumn(props: { children?: ReactNode }) {
  return <div className={css.rightbarCol} data-rightbar-col>{props.children}</div>
}

/**
 * One drag handle: pointer capture, rAF-throttled dx reports against the drag-start origin.
 * `side` keys the hover-reveal CSS to the owning column.
 */
function DragHandle(props: { side: 'sidebar' | 'rightbar' | 'main'; left: number; onStart: () => void; onDrag: (dx: number) => void; onEnd: () => void }) {
  const [dragging, setDragging] = useState(false)
  const origin = useRef(0)
  const latest = useRef(0)
  const frame = useRef<number | null>(null)
  const capture = useRef<{ element: HTMLDivElement; id: number } | null>(null)
  const callbacks = useRef({ onStart: props.onStart, onDrag: props.onDrag, onEnd: props.onEnd })
  callbacks.current = { onStart: props.onStart, onDrag: props.onDrag, onEnd: props.onEnd }

  const endDrag = useCallback(() => {
    const active = capture.current
    if (active === null) return
    capture.current = null
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null }
    if (active.element.hasPointerCapture(active.id)) active.element.releasePointerCapture(active.id)
    setDragging(false)
    callbacks.current.onEnd()
  }, [])
  useEffect(() => endDrag, [endDrag])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || capture.current !== null) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    capture.current = { element: e.currentTarget, id: e.pointerId }
    origin.current = e.clientX
    latest.current = e.clientX
    callbacks.current.onStart()
    setDragging(true)
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (capture.current?.id !== e.pointerId) return
    latest.current = e.clientX
    frame.current ??= requestAnimationFrame(() => {
      frame.current = null
      callbacks.current.onDrag(latest.current - origin.current)
    })
  }, [])
  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (capture.current?.id !== e.pointerId) return
    callbacks.current.onDrag(e.clientX - origin.current)
    endDrag()
  }, [endDrag])
  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (capture.current?.id === e.pointerId) endDrag()
  }, [endDrag])

  return (
    <div
      className={css.handle}
      style={{ left: props.left }}
      data-side={props.side}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
    />
  )
}

/** The three-column frame (see module doc). */
export function AppFrame({
  useStore,
  useSessions,
  usePanelInfo,
  useWorkbenchLayout,
  actions,
  renderSlot,
  setWorkbenchWidth,
  t,
}: AppFrameProps) {
  const layoutInfo = useStore(state => state.layoutInfo)
  const workbench = useWorkbenchLayout(state => state)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const viewport = layoutInfo.viewportWidth

  // Track the frame's own box (not the window): rAF-throttled ResizeObserver.
  useLayoutEffect(() => {
    const el = frameRef.current
    /* v8 ignore next -- the ref is always attached by effect time: the frame div renders unconditionally. */
    if (el === null) return
    let raf: number | null = null
    let disposed = false
    const measure = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) actions.setViewportWidth(width)
    }
    measure()
    const observer = new ResizeObserver(() => {
      if (disposed) return
      raf ??= requestAnimationFrame(() => {
        raf = null
        measure()
      })
    })
    observer.observe(el)
    return () => {
      disposed = true
      observer.disconnect()
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [actions])

  const narrow = viewport < SIDEBAR_AUTO_COLLAPSE
  const sidebarCollapsed = narrow ? !layoutInfo.narrowExpanded : layoutInfo.sidebar === 0
  const sidebarPreference = sidebarCollapsed
    ? 0
    : layoutInfo.sidebar === 0 ? SIDEBAR_DEFAULT : layoutInfo.sidebar
  // Desktop reopen controls occupy the frame's shell.leading seat (macOS) or
  // the Windows caption row; neither platform keeps an icon rail.
  const darwin = document.documentElement.dataset.platform === 'darwin'
  const collapsedWidth = darwin
    || document.documentElement.hasAttribute('data-windows-titlebar') ? 0 : SIDEBAR_COLLAPSED
  const workbenchDesktop = workbench.present && viewport >= WORKBENCH_DRAWER_BREAKPOINT
  const sessionRegionVisible = !workbench.present || workbench.expanded
  const workbenchPrimary = workbenchDesktop || (workbench.present && !sessionRegionVisible)
  const frameSidebarWidth = computeColumns(viewport, sidebarPreference, 0, collapsedWidth).sidebar
  const preferredAuxiliaryWidth = workbenchDesktop
    ? Math.min(workbench.width, Math.max(0, viewport - frameSidebarWidth - CENTER_MIN))
    : 0
  const auxiliaryWidth = sessionRegionVisible ? preferredAuxiliaryWidth : 0
  // Solve against the restored auxiliary width even while hidden, so reopening
  // cannot retain a rightbar that fits only because the Session region is absent.
  const layoutViewport = Math.max(0, viewport - preferredAuxiliaryWidth)
  const rightbarPreference = layoutInfo.rightbar ?? layoutViewport * RIGHTBAR_DEFAULT_RATIO
  // Opening on a narrow frame collapses the left sidebar. Eligibility must
  // include that space before the occupant's first shown report arrives.
  const normal = computeColumns(
    layoutViewport,
    !layoutInfo.rightbarShown && narrow ? 0 : sidebarPreference,
    rightbarPreference,
    collapsedWidth,
  )
  const reserveRightbar = sessionRegionVisible
    && (!workbenchDesktop || workbench.reserveRightbar)
    && layoutInfo.rightbarTrack
  const cols = computeColumns(
    layoutViewport,
    sidebarPreference,
    reserveRightbar ? rightbarPreference : 0,
    collapsedWidth,
  )
  const effectiveRightbarWidth = sessionRegionVisible ? cols.rightbar : 0
  const colsRef = useRef(cols)
  colsRef.current = cols
  const rightbarWidth = useRef(normal.rightbar)
  rightbarWidth.current = normal.rightbar

  // The drag base is the rendered width captured at drag start (grabbing a
  // concession-clamped panel must not jump back to the stored preference);
  // it stays frozen for the whole gesture so dx deltas do not compound.
  const sidebarBase = useRef(0)
  const rightbarBase = useRef(0)
  const mainBase = useRef(0)
  // Track-level transitions pause for the whole gesture: eased tracks would
  // detach the column edge from the pointer (AppFrame.module.css).
  const [dragging, setDragging] = useState(false)
  // Track easing is scoped to a discrete open/close toggle: data-animating
  // goes up when the collapse state or the rightbar track flips and comes down
  // at transition end (timeout as the reduced-motion/covered-frame fallback).
  // Steady-state viewport updates stay instant (AppFrame.module.css), and so
  // does a toggle arriving together with a viewport change — that is the
  // responsive auto-collapse firing mid window-resize, where easing would
  // chase the live window edge. The counter restarts the settle window when a
  // re-toggle interrupts a running transition.
  const [animating, setAnimating] = useState(0)
  const trackToggle = `${sidebarCollapsed}:${layoutInfo.rightbarTrack}:${sessionRegionVisible}`
  const previousToggle = useRef(trackToggle)
  const previousViewport = useRef(viewport)
  useLayoutEffect(() => {
    const viewportChanged = previousViewport.current !== viewport
    previousViewport.current = viewport
    if (previousToggle.current === trackToggle) return
    previousToggle.current = trackToggle
    if (viewportChanged) return
    setAnimating(token => token + 1)
  }, [trackToggle, viewport])
  useEffect(() => {
    if (animating === 0) return
    const frame = frameRef.current
    /* v8 ignore next -- the ref is always attached by effect time: the frame div renders unconditionally. */
    if (frame === null) return
    const settle = () => { setAnimating(0) }
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === frame && event.propertyName === 'grid-template-columns') settle()
    }
    frame.addEventListener('transitionend', onTransitionEnd)
    const timer = setTimeout(settle, 600)
    return () => {
      frame.removeEventListener('transitionend', onTransitionEnd)
      clearTimeout(timer)
    }
  }, [animating])
  const onDragEnd = useCallback(() => { setDragging(false) }, [])
  const onSidebarStart = useCallback(() => { sidebarBase.current = colsRef.current.sidebar; setDragging(true) }, [])
  const onSidebarDrag = useCallback((dx: number) => {
    actions.setSidebar(sidebarBase.current + dx)
  }, [actions])
  const onRightbarStart = useCallback(() => { rightbarBase.current = rightbarWidth.current; setDragging(true) }, [])
  const onRightbarDrag = useCallback((dx: number) => {
    actions.setRightbar(rightbarBase.current - dx)
  }, [actions])
  const onMainStart = useCallback(() => { mainBase.current = workbench.width; setDragging(true) }, [workbench.width])
  const onMainDrag = useCallback((dx: number) => {
    setWorkbenchWidth(mainBase.current - dx)
  }, [setWorkbenchWidth])
  const productTitle = process.env.DSH_CLIENT_TITLE ?? t('brand.localBuild')
  // The rendered template lets the grid solve the squeeze natively: the centre
  // declares its protected minimum and the right column bids up to the clamped
  // preference, so a window resize lands in the same layout pass as the frame
  // edge. The JS solve lags the viewport by a ResizeObserver + rAF frame; when
  // it priced the squeeze itself, the centre column absorbed each width change
  // whole and was corrected two frames later — visible jitter. cols keeps only
  // the discrete decisions (track present, collapse state) and the drag base.
  const rightbarMax = effectiveRightbarWidth === 0
    ? 0
    : clampWidth(rightbarPreference, RIGHTBAR_MIN, layoutViewport * RIGHTBAR_MAX_RATIO)
  const centerMinimum = effectiveRightbarWidth === 0 ? 0 : CENTER_MIN
  const sidebar = useMemo(() => renderSlot('sidebar', {
    collapsed: sidebarCollapsed,
    width: cols.sidebar,
  }), [renderSlot, sidebarCollapsed, cols.sidebar])
  const main = useMemo(() => (
    <MainPanel usePanelInfo={usePanelInfo} renderSlot={renderSlot} />
  ), [usePanelInfo, renderSlot])
  const overlays = useMemo(() => renderSlot('shell.overlay', {}), [renderSlot])
  // Window-chrome seat over the main panels' top-left corner: only a fully
  // hidden sidebar column on macOS desktop leaves window chrome without a
  // home — the Windows zero-width collapse keeps its controls in the caption
  // row (ui-sidebar). AppFrame.module.css publishes the matching
  // --dsh-frame-leading-clearance under the same collapsed condition.
  const leading = useMemo(() => renderSlot('shell.leading', {}), [renderSlot])
  const leadingMounted = darwin && sidebarCollapsed

  return (
    <div
      ref={frameRef}
      className={css.frame}
      style={{
        ...(document.documentElement.hasAttribute('data-windows-titlebar')
          ? { '--dsh-windows-sidebar-width': `${cols.sidebar}px` } : {}),
        gridTemplateColumns: workbenchPrimary
          ? `${cols.sidebar}px minmax(${centerMinimum}px, 1fr) minmax(0px, ${rightbarMax}px) ${auxiliaryWidth}px`
          : `${cols.sidebar}px minmax(${centerMinimum}px, 1fr) minmax(0px, ${rightbarMax}px)`,
      }}
      data-dsh-frame
      data-workbench-primary={workbenchPrimary || undefined}
      data-session-region-collapsed={!sessionRegionVisible || undefined}
      data-sidebar-collapsed={sidebarCollapsed || undefined}
      data-rightbar-collapsed={effectiveRightbarWidth === 0 || undefined}
      data-rightbar-fullscreen={sessionRegionVisible && layoutInfo.rightbarFullscreen || undefined}
      data-rightbar-instant={layoutInfo.rightbarInstant || undefined}
      data-dragging={dragging || undefined}
      data-animating={animating > 0 || undefined}
    >
      <DocumentTitle
        productTitle={productTitle}
        useSessions={useSessions}
        usePanelInfo={usePanelInfo}
      />
      <div className={css.sidebarCol}>
        {sidebar}
      </div>
      {workbenchPrimary && <WorkbenchColumn>{renderSlot('workbench', {})}</WorkbenchColumn>}
      <SessionRegion visible={sessionRegionVisible}>
        {!workbenchPrimary && <CenterColumn key="main">{main}</CenterColumn>}
        <RightbarColumn key="rightbar">
          {renderSlot('rightbar', {
            width: normal.rightbar,
            viewportWidth: viewport,
            canShow: !sessionRegionVisible || normal.rightbar > 0,
          })}
        </RightbarColumn>
        {workbenchPrimary && <AuxiliaryColumn key="main">{main}</AuxiliaryColumn>}
      </SessionRegion>
      <div className={css.overlayLayer} data-shell-overlay>
        {overlays}
        {workbench.present && !workbenchPrimary && renderSlot('workbench', {})}
      </div>
      {leadingMounted && (
        <div className={css.leadingSeat} data-shell-leading>
          {leading}
        </div>
      )}
      {/* The collapsed rail is fixed-width: no resize handle while closed. */}
      {!sidebarCollapsed && <DragHandle side="sidebar" left={cols.sidebar} onStart={onSidebarStart} onDrag={onSidebarDrag} onEnd={onDragEnd} />}
      {sessionRegionVisible && layoutInfo.rightbarShown && !layoutInfo.rightbarFullscreen && normal.rightbar > 0 && (
        <DragHandle side="rightbar" left={viewport - auxiliaryWidth - normal.rightbar} onStart={onRightbarStart} onDrag={onRightbarDrag} onEnd={onDragEnd} />
      )}
      {workbenchDesktop && sessionRegionVisible && <DragHandle side="main" left={viewport - auxiliaryWidth} onStart={onMainStart} onDrag={onMainDrag} onEnd={onDragEnd} />}
    </div>
  )
}
