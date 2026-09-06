/** Official destinations shared by the sidebar help and settings guidance. */

import { requestDesktopExternalLinkOpen, resolveDesktopExternalHttpUrl } from './desktop-external-links.ts'

/** Canonical product website, including its GitHub Pages repository prefix. */
export const HELP_SITE_URL = 'https://istarwyh.github.io/yourbuddy/'

/** Stable help destinations; locale dictionaries own their labels. */
export const HELP_ROUTES = {
  start: 'docs/start/',
  plugins: 'plugins/',
  develop: 'docs/develop/',
  troubleshooting: 'docs/troubleshooting/',
  feedback: 'https://github.com/istarwyh/yourbuddy/issues',
  settings: 'docs/settings/',
} as const

/**
 * Resolve a help destination in a supported website language.
 * @param destination - Named product guide or feedback entry.
 * @param locale - Current workbench locale; languages other than Chinese use English.
 * @returns Absolute official URL, preserving the Pages prefix.
 */
export function helpUrl(destination: keyof typeof HELP_ROUTES, locale: string): string {
  const route = HELP_ROUTES[destination]
  const prefix = /^zh(?:-|$)/i.test(locale) ? '' : 'en/'
  return new URL(route, `${HELP_SITE_URL}${prefix}`).href
}

/**
 * Open guidance without navigating the workbench away from its session.
 * @param value - Absolute external HTTP(S) destination.
 * @returns Completion of the desktop request or browser popup creation; not page-load success.
 */
export async function openHelpUrl(value: string): Promise<void> {
  const url = resolveDesktopExternalHttpUrl(value, window.location.origin)
  if (url === undefined) throw new Error('invalid-help-url')
  if (window.parent !== window) {
    await requestDesktopExternalLinkOpen(url)
    return
  }
  const opened = window.open('about:blank', '_blank')
  if (opened === null) throw new Error('browser-popup-blocked')
  opened.opener = null
  opened.location.replace(url)
}
