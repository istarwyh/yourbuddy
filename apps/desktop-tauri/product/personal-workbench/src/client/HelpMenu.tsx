/** Sidebar help uses external guides without depending on an active model or session. */

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { copyLinkAddress } from './desktop-external-links.ts'
import { helpUrl, openHelpUrl } from './help-links.ts'

/** Live language reader supplied by the plugin's locale service. */
export interface HelpMenuInjected {
  /** Read the active language when resolving an external destination. */
  readLocale: () => string
}

/** Props supplied by the sidebar, slot runtime, and product registration. */
export type HelpMenuProps = SidebarFooterActionOwnerProps & HelpMenuInjected
  & PropsRuntime<'sidebar.footer.action'> & PropsLocale<'settings.personal-workbench'>

const DESTINATIONS = ['start', 'plugins', 'develop', 'troubleshooting', 'feedback'] as const

/**
 * Render accessible guide navigation and a recoverable external-link failure.
 * @param props - Sidebar width, live locale reader, and localized copy.
 * @returns Help trigger and its locally rendered menu.
 */
export function HelpMenu({ wide, readLocale, t }: HelpMenuProps) {
  const [position, setPosition] = useState<{ left: number, bottom: number }>()
  const [failedUrl, setFailedUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const firstItem = useRef<HTMLButtonElement>(null)
  const attempt = useRef(0)
  const id = useId()
  const open = position !== undefined

  const close = (restoreFocus = true): void => {
    attempt.current += 1
    setPosition(undefined)
    setBusy(false)
    if (restoreFocus) trigger.current?.focus()
  }

  useEffect(() => () => { attempt.current += 1 }, [])
  useEffect(() => {
    if (!open) return
    firstItem.current?.focus()
    const outside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close(false)
    }
    const resize = (): void => { close() }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', resize)
    }
  }, [open])

  const toggle = (): void => {
    if (open) { close(); return }
    const rect = trigger.current!.getBoundingClientRect()
    setFailedUrl('')
    setCopyStatus('idle')
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)), bottom: Math.max(8, window.innerHeight - rect.top + 8) })
  }

  const visit = async (destination: typeof DESTINATIONS[number]): Promise<void> => {
    const current = ++attempt.current
    const url = helpUrl(destination, readLocale())
    setBusy(true)
    setFailedUrl('')
    setCopyStatus('idle')
    try {
      await openHelpUrl(url)
      if (attempt.current === current) close()
    }
    catch {
      // Opening can fail at the desktop bridge or browser popup; the address remains usable.
      if (attempt.current === current) setFailedUrl(url)
    }
    finally {
      if (attempt.current === current) setBusy(false)
    }
  }

  const copy = async (): Promise<void> => {
    const current = attempt.current
    try {
      await copyLinkAddress(failedUrl)
      if (attempt.current === current) setCopyStatus('done')
    }
    catch {
      // The selectable address remains available when clipboard permission is denied.
      if (attempt.current === current) setCopyStatus('error')
    }
  }

  const navigate = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (!(event.target instanceof HTMLButtonElement) || event.target.role !== 'menuitem') return
    const items = Array.from(root.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'))
    const index = items.indexOf(event.target)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (index + 1) % items.length
        : event.key === 'ArrowUp' ? (index + items.length - 1) % items.length : undefined
    if (next !== undefined) { event.preventDefault(); items[next]?.focus() }
  }

  return (
    <div ref={root} className="dpw-help" onKeyDown={navigate} onBlur={event => {
      if (open && event.relatedTarget instanceof Node && !root.current?.contains(event.relatedTarget)) close(false)
    }}>
      <button ref={trigger} type="button" className="dpw-help-trigger" aria-label={t('help.title')}
        title={t('help.title')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}>
        <span className="dpw-help-icon" aria-hidden="true">?</span>{wide && <span>{t('help.title')}</span>}
      </button>
      {position !== undefined && <div className="dpw-help-panel" style={position}>
        <div id={id} role="menu" aria-label={t('help.title')} aria-busy={busy}>
          {DESTINATIONS.map((destination, index) => <button key={destination} ref={index === 0 ? firstItem : undefined}
            type="button" role="menuitem" className="dpw-link-menu-item" disabled={busy} onClick={() => { void visit(destination) }}>
            {t(`help.${destination}`)}
          </button>)}
        </div>
        <p className="dpw-hint">{t('help.external')}</p>
        {failedUrl !== '' && <div className="dpw-help-recovery">
          <p className="dpw-error" role="alert">{t('help.error')}</p>
          <input className="dpw-input" aria-label={t('help.address')} value={failedUrl} readOnly onFocus={event => event.currentTarget.select()} />
          <button type="button" className="dpw-button" onClick={() => { void copy() }}>{t('link.menu.copy')}</button>
          {copyStatus !== 'idle' && <p role="status" className="dpw-hint">{t(copyStatus === 'done' ? 'link.copy.done' : 'link.error.copy')}</p>}
        </div>}
      </div>}
    </div>
  )
}
