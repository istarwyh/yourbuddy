/** Compact projection of native window controls into the sidebar header. */

import { useEffect, useState, type PointerEvent } from 'react'
import {
  connectDesktopWindowControls,
  requestDesktopWindowControl,
  type DesktopWindowControl,
  type DesktopWindowControlsLayout,
} from './desktop-window-controls.ts'

function ControlIcon({ control }: { control: DesktopWindowControl }) {
  if (control === 'minimize') {
    return <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="5" width="8" height="1" fill="currentColor" /></svg>
  }
  if (control === 'maximize') {
    return <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
  }
  return <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.2" /></svg>
}

/** Test seam for the browser window hosting this component. */
export interface WindowControlsProps {
  /** Browser window; omitted in production so the current iframe window is used. */
  target?: Window
}

/**
 * Render the platform controls supplied by the native desktop shell.
 * @param props - Optional test window override.
 * @returns the compact control group after the Shell handshake, otherwise null.
 */
export function WindowControls({ target = window }: WindowControlsProps) {
  const [layout, setLayout] = useState<DesktopWindowControlsLayout>()
  useEffect(() => connectDesktopWindowControls(setLayout, target), [target])
  if (layout === undefined || layout.controls.length === 0) return null

  const beginDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) requestDesktopWindowControl('drag', target)
  }
  return (
    <div
      className="dpw-window-controls"
      data-platform={layout.os}
      onPointerDown={beginDrag}
    >
      {layout.controls.map(control => (
        <button
          key={control}
          type="button"
          className={`dpw-window-control dpw-window-control-${control}`}
          title={layout.labels[control]}
          aria-label={layout.labels[control]}
          onClick={() => { requestDesktopWindowControl(control, target) }}
        >
          <span className="dpw-window-control-dot" aria-hidden="true" />
          <ControlIcon control={control} />
        </button>
      ))}
    </div>
  )
}
