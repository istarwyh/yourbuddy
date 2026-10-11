/** Browser capabilities consumed by the product's parent-window protocols. */

/** Message fields used for payload parsing and parent identity checks. */
export interface DesktopBridgeMessage {
  data: unknown
  source: object | null
}

/** Parent messaging and listener capabilities, also implemented by a real Window. */
export interface DesktopBridgeWindow {
  parent: { postMessage(message: unknown, targetOrigin: string): void }
  postMessage(message: unknown, targetOrigin: string): void
  addEventListener(type: 'message', listener: (event: DesktopBridgeMessage) => void): void
  removeEventListener(type: 'message', listener: (event: DesktopBridgeMessage) => void): void
}

/** Browser timer capabilities needed by request-response protocols. */
export interface DesktopRequestWindow extends DesktopBridgeWindow {
  setTimeout(handler: () => void, milliseconds: number): number
  clearTimeout(timeout: number): void
}
