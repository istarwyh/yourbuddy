/** Fixed browser-to-desktop protocol for the compact native window controls. */

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
    || !['linux', 'macos', 'windows'].includes(String(value.os))
    || !Array.isArray(value.controls)
    || value.controls.length > 3
    || !value.controls.every(control => ['close', 'minimize', 'maximize'].includes(String(control)))
    || new Set(value.controls).size !== value.controls.length
    || !isRecord(value.labels)
    || !hasExactKeys(value.labels, 'close,maximize,minimize')
    || !Object.values(value.labels).every(label => typeof label === 'string' && label.length <= 128)) {
    return undefined
  }
  return {
    os: value.os as DesktopWindowControlsLayout['os'],
    controls: value.controls as DesktopWindowControl[],
    labels: value.labels as unknown as DesktopWindowControlsLayout['labels'],
  }
}

/**
 * Report whether a distinct parent can service the desktop window protocol.
 * @param target - Browser window hosting the product Client.
 * @returns whether a distinct parent window is available.
 */
export function isDesktopWindowControlsAvailable(
  target: Window | undefined = typeof window === 'undefined' ? undefined : window,
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
  target: Window = window,
): () => void {
  if (!isDesktopWindowControlsAvailable(target)) return () => {}
  const parent = target.parent
  const onMessage = (event: MessageEvent<unknown>): void => {
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
  target: Window = window,
): void {
  if (!isDesktopWindowControlsAvailable(target)) return
  target.parent.postMessage({
    channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
    version: DESKTOP_WINDOW_CONTROLS_VERSION,
    type: 'action-request',
    action,
  }, '*')
}
