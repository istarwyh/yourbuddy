/** Open HTTP(S) destinations through the desktop shell or an ordinary browser tab. */

const DESKTOP_EXTERNAL_LINK_CHANNEL = 'yourbuddy.desktop.external-link'
const DESKTOP_EXTERNAL_LINK_VERSION = 1
const MAX_EXTERNAL_URL_LENGTH = 4096

let externalLinkSequence = 0

/**
 * Normalize an HTTP(S) destination accepted by the desktop shell.
 * @param value - Candidate absolute URL.
 * @returns The normalized URL, or undefined when the value is unsupported.
 */
export function resolveExternalHttpUrl(value: string): string | undefined {
  if (value.length === 0 || value.length > MAX_EXTERNAL_URL_LENGTH) return undefined
  try {
    const url = new URL(value)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.hostname === ''
      || url.username !== ''
      || url.password !== ''
      || url.href.length > MAX_EXTERNAL_URL_LENGTH) return undefined
    return url.href
  } catch {
    return undefined
  }
}

/**
 * Dispatch an HTTP(S) destination without navigating the workbench.
 * @param value - Candidate absolute URL.
 * @returns True when the URL was sent to the desktop shell or browser API.
 */
export function openExternalHttpUrl(value: string): boolean {
  if (typeof window === 'undefined') return false
  const url = resolveExternalHttpUrl(value)
  if (url === undefined) return false
  if (window.parent !== window) {
    externalLinkSequence += 1
    window.parent.postMessage({
      channel: DESKTOP_EXTERNAL_LINK_CHANNEL,
      version: DESKTOP_EXTERNAL_LINK_VERSION,
      type: 'open-request',
      requestId: `${Date.now()}_${externalLinkSequence}`,
      url,
    }, '*')
    return true
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened !== null) opened.opener = null
  return true
}
