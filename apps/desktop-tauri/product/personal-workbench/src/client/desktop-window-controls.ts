/** Fixed browser-to-desktop protocol for the compact native window controls. */

import type { DesktopBridgeMessage, DesktopBridgeWindow } from './desktop-bridge-window.ts'

/** Message channel accepted by the YourBuddy desktop shell. */
export const DESKTOP_WINDOW_CONTROLS_CHANNEL = 'yourbuddy.desktop.window-controls'

/** Current browser-to-shell protocol version. */
export const DESKTOP_WINDOW_CONTROLS_VERSION = 1

/** Window actions exposed by the trusted desktop shell. */
export type DesktopWindowControl = 'close' | 'minimize' | 'maximize'

/** Platform presentation returned by the desktop shell. */
export interface DesktopWindowControlsLayout {
  os: 'linux' | 'macos' | 'windows'
  controls: readonly DesktopWindowControl[]
  labels: Readonly<Record<DesktopWindowControl, string>>
}

function hasExactKeys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(',') === expected
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validate the platform layout returned by the trusted parent shell.
 * @param value - Untrusted postMessage payload.
 * @returns the validated layout, or undefined when fields do not match.
 */
export function readDesktopWindowControlsLayout(
  value: unknown,
): DesktopWindowControlsLayout | undefined {
  if (!isRecord(value)
    || !hasExactKeys(value, 'channel,controls,labels,os,type,version')
    || value.channel !== DESKTOP_WINDOW_CONTROLS_CHANNEL
    || value.version !== DESKTOP_WINDOW_CONTROLS_VERSION
    || value.type !== 'layout-response'
    || (value.os !== 'linux' && value.os !== 'macos' && value.os !== 'windows')
    || !Array.isArray(value.controls)
    || value.controls.length > 3
    || new Set(value.controls).size !== value.controls.length
    || !isRecord(value.labels)
    || !hasExactKeys(value.labels, 'close,maximize,minimize')
    || typeof value.labels.close !== 'string' || value.labels.close.length > 128
    || typeof value.labels.minimize !== 'string' || value.labels.minimize.length > 128
    || typeof value.labels.maximize !== 'string' || value.labels.maximize.length > 128) {
    return undefined
  }
  const controls: DesktopWindowControl[] = []
  const candidates: readonly unknown[] = value.controls
  for (const control of candidates) {
    if (control !== 'close' && control !== 'minimize' && control !== 'maximize') return undefined
    controls.push(control)
  }
  return {
    os: value.os,
    controls,
    labels: { close: value.labels.close, minimize: value.labels.minimize, maximize: value.labels.maximize },
  }
}

/**
 * Report whether a distinct parent can service the desktop window protocol.
 * @param target - Browser window hosting the product Client.
 * @returns whether a distinct parent window is available.
 */
export function isDesktopWindowControlsAvailable(
  target: DesktopBridgeWindow | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  return target !== undefined && target.parent !== target
}

/**
 * Subscribe to native layout and announce when the in-page controls are ready.
 * The disposer restores the shell's compact fallback controls.
 * @param onLayout - Receives each validated native layout.
 * @param target - Browser window hosting the product Client.
 * @returns a lifecycle disposer for the listener and Shell projection.
 */
export function connectDesktopWindowControls(
  onLayout: (layout: DesktopWindowControlsLayout) => void,
  target: DesktopBridgeWindow = window,
): () => void {
  if (!isDesktopWindowControlsAvailable(target)) return () => {}
  const parent = target.parent
  const onMessage = (event: DesktopBridgeMessage): void => {
    if (event.source !== parent) return
    const layout = readDesktopWindowControlsLayout(event.data)
    if (layout === undefined) return
    onLayout(layout)
    parent.postMessage({
      channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
      version: DESKTOP_WINDOW_CONTROLS_VERSION,
      type: 'ready',
    }, '*')
  }
  target.addEventListener('message', onMessage)
  parent.postMessage({
    channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
    version: DESKTOP_WINDOW_CONTROLS_VERSION,
    type: 'mount-request',
  }, '*')
  return () => {
    target.removeEventListener('message', onMessage)
    parent.postMessage({
      channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
      version: DESKTOP_WINDOW_CONTROLS_VERSION,
      type: 'unmount',
    }, '*')
  }
}

/**
 * Ask the trusted parent shell to perform one fixed window action.
 * @param action - Allowlisted window action.
 * @param target - Browser window hosting the product Client.
 */
export function requestDesktopWindowControl(
  action: DesktopWindowControl | 'drag',
  target: DesktopBridgeWindow = window,
): void {
  if (!isDesktopWindowControlsAvailable(target)) return
  target.parent.postMessage({
    channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
    version: DESKTOP_WINDOW_CONTROLS_VERSION,
    type: 'action-request',
    action,
  }, '*')
}
