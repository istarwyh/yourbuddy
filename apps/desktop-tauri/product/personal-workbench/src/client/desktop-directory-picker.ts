/** Desktop-owned directory picker for the loopback Host iframe. */

import type { Context } from '@deepseek-ai/cordis'

/** Versioned channel shared with the YourBuddy desktop shell. */
export const DESKTOP_DIRECTORY_PICKER_CHANNEL = 'yourbuddy.desktop.directory-picker'
/** Protocol version for desktop directory-picker requests. */
export const DESKTOP_DIRECTORY_PICKER_VERSION = 1

const ACCEPT_TIMEOUT_MS = 5_000
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

interface DirectoryPickerParent {
  postMessage(message: unknown, targetOrigin: string): void
}

interface DirectoryPickerTarget {
  readonly parent: DirectoryPickerParent
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  setTimeout(handler: () => void, milliseconds: number): ReturnType<typeof setTimeout>
  clearTimeout(timeout: ReturnType<typeof setTimeout>): void
}

interface DirectoryPickerRequestOptions {
  target?: DirectoryPickerTarget
  requestId?: string
  acceptTimeoutMs?: number
}

interface DirectoryPickerAccepted {
  channel: typeof DESKTOP_DIRECTORY_PICKER_CHANNEL
  version: typeof DESKTOP_DIRECTORY_PICKER_VERSION
  type: 'pick-accepted'
  requestId: string
}

interface DirectoryPickerResult {
  channel: typeof DESKTOP_DIRECTORY_PICKER_CHANNEL
  version: typeof DESKTOP_DIRECTORY_PICKER_VERSION
  type: 'pick-response'
  requestId: string
  ok: boolean
  value?: string | null
  error?: string
}

interface DesktopDirectoryPicker {
  pick(): Promise<string | null>
}

function createRequestId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Parse one accepted or final response with exact fields. */
export function readDesktopDirectoryPickerResponse(
  value: unknown,
  requestId: string,
): DirectoryPickerAccepted | DirectoryPickerResult | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const response = value as Record<string, unknown>
  if (response.channel !== DESKTOP_DIRECTORY_PICKER_CHANNEL
    || response.version !== DESKTOP_DIRECTORY_PICKER_VERSION
    || response.requestId !== requestId) return undefined
  if (response.type === 'pick-accepted') {
    return Object.keys(response).sort().join(',') === 'channel,requestId,type,version'
      ? {
          channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
          version: DESKTOP_DIRECTORY_PICKER_VERSION,
          type: 'pick-accepted',
          requestId,
        }
      : undefined
  }
  if (response.type !== 'pick-response' || typeof response.ok !== 'boolean') return undefined
  const expectedKeys = response.ok
    ? 'channel,ok,requestId,type,value,version'
    : 'channel,error,ok,requestId,type,version'
  if (Object.keys(response).sort().join(',') !== expectedKeys) return undefined
  if (response.ok) {
    if (response.value !== null && typeof response.value !== 'string') return undefined
    return {
      channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
      version: DESKTOP_DIRECTORY_PICKER_VERSION,
      type: 'pick-response',
      requestId,
      ok: true,
      value: response.value,
    }
  }
  if (typeof response.error !== 'string' || response.error.length > 2048) return undefined
  return {
    channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
    version: DESKTOP_DIRECTORY_PICKER_VERSION,
    type: 'pick-response',
    requestId,
    ok: false,
    error: response.error,
  }
}

/**
 * Ask the trusted parent shell to choose one directory.
 * @param options - Test seams for the target window, request id, and bridge-acceptance deadline.
 * @returns The selected directory, or null when the user cancels.
 */
export function requestDesktopDirectory(
  options: DirectoryPickerRequestOptions = {},
): Promise<string | null> {
  const target: DirectoryPickerTarget = options.target ?? window
  if (Object.is(target.parent, target)) return Promise.reject(new Error('desktop-shell-unavailable'))
  const requestId = options.requestId ?? createRequestId()
  if (!REQUEST_ID_PATTERN.test(requestId)) return Promise.reject(new Error('invalid-request-id'))

  return new Promise((resolve, reject) => {
    const parent = target.parent
    let accepted = false
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== parent) return
      const response = readDesktopDirectoryPickerResponse(event.data, requestId)
      if (response === undefined) return
      if (response.type === 'pick-accepted') {
        accepted = true
        target.clearTimeout(timeout)
        return
      }
      cleanup()
      if (response.ok) resolve(response.value ?? null)
      else reject(new Error(response.error))
    }
    const timeout = target.setTimeout(() => {
      if (accepted) return
      cleanup()
      reject(new Error('desktop-shell-unavailable'))
    }, options.acceptTimeoutMs ?? ACCEPT_TIMEOUT_MS)
    const cleanup = (): void => {
      target.clearTimeout(timeout)
      target.removeEventListener('message', onMessage)
    }
    target.addEventListener('message', onMessage)
    parent.postMessage({
      channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
      version: DESKTOP_DIRECTORY_PICKER_VERSION,
      type: 'pick-request',
      requestId,
    }, '*')
  })
}

/** Install the desktop picker global consumed by the shared Workspace service. */
export function installDesktopDirectoryPicker(ctx: Context): void {
  if (window.parent === window) return
  const target = globalThis as typeof globalThis & {
    __DSH_DIRECTORY_PICKER__?: DesktopDirectoryPicker
  }
  if (target.__DSH_DIRECTORY_PICKER__ !== undefined) return
  const picker: DesktopDirectoryPicker = { pick: () => requestDesktopDirectory() }
  ctx.effect(() => {
    target.__DSH_DIRECTORY_PICKER__ = picker
    return () => {
      if (target.__DSH_DIRECTORY_PICKER__ === picker) delete target.__DSH_DIRECTORY_PICKER__
    }
  }, 'personal-workbench: desktop directory picker')
}
