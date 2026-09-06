// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HelpMenu, type HelpMenuProps } from '../src/client/HelpMenu.tsx'
import { HELP_ROUTES, helpUrl, openHelpUrl } from '../src/client/help-links.ts'
import { en, zh } from '../src/client/locales.ts'
import { DESKTOP_EXTERNAL_LINK_CHANNEL, DESKTOP_EXTERNAL_LINK_VERSION } from '../src/client/desktop-external-links.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function mount(locale = 'en', wide = true) {
  const dictionary = locale === 'zh' ? zh : en
  return render(<HelpMenu {...{
    wide, readLocale: () => locale, t: (key: keyof typeof en) => dictionary[key],
  } as HelpMenuProps} />)
}

describe('YourBuddy help', () => {
  it('keeps localized guides under the product prefix and feedback outside it', () => {
    expect(helpUrl('develop', 'zh-CN')).toBe('https://istarwyh.github.io/yourbuddy/docs/develop/')
    expect(helpUrl('start', 'en')).toBe('https://istarwyh.github.io/yourbuddy/en/docs/start/')
    expect(helpUrl('settings', 'fr')).toBe('https://istarwyh.github.io/yourbuddy/en/docs/settings/')
    for (const locale of ['zh', 'en']) expect(helpUrl('feedback', locale)).toBe(HELP_ROUTES.feedback)
  })

  it.each(['javascript:alert(1)', 'file:///private', 'https://user:secret@example.org', window.location.href])(
    'rejects an unsafe or workbench-local destination: %s', async (url) => {
      const open = vi.spyOn(window, 'open')
      await expect(openHelpUrl(url)).rejects.toThrow('invalid-help-url')
      expect(open).not.toHaveBeenCalled()
    },
  )

  it('supports keyboard navigation, Escape, and a collapsed translated trigger', () => {
    mount('zh', false)
    const trigger = screen.getByRole('button', { name: '帮助与指南' })
    fireEvent.click(trigger)
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '快速开始' }))
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '反馈问题' }))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '快速开始' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('opens a browser tab without giving it an opener or replacing the session', async () => {
    const replace = vi.fn()
    const popup = { opener: window, location: { replace } }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const location = window.location.href
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Help and guides' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Extend Y8' }))
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(popup.opener).toBeNull()
    expect(replace).toHaveBeenCalledWith(helpUrl('develop', 'en'))
    expect(window.location.href).toBe(location)
  })

  it('keeps an address available for copying after a blocked popup', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const copy = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText: copy } })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Help and guides' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Getting started' }))
    await screen.findByRole('alert')
    expect((screen.getByRole('textbox', { name: 'Help page address' }) as HTMLInputElement).value).toBe(helpUrl('start', 'en'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy link address' }))
    await screen.findByRole('status')
    expect(copy).toHaveBeenCalledWith(helpUrl('start', 'en'))
  })

  it('uses the correlated desktop request and ignores a late failure after dismissal', async () => {
    const parent = { postMessage: vi.fn() }
    vi.spyOn(window, 'parent', 'get').mockReturnValue(parent as unknown as Window)
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Help and guides' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Default plugins' }))
    const request = parent.postMessage.mock.calls[0]![0] as { requestId: string, url: string }
    expect(request.url).toBe(helpUrl('plugins', 'en'))
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Help and guides' }))
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        source: parent as unknown as Window,
        data: { channel: DESKTOP_EXTERNAL_LINK_CHANNEL, version: DESKTOP_EXTERNAL_LINK_VERSION,
          type: 'open-response', requestId: request.requestId, ok: false, error: 'browser-unavailable' },
      }))
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('menu')).toBeTruthy()
  })
})
