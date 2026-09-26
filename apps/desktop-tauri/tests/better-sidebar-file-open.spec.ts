import { afterEach, describe, expect, it, vi } from 'vitest'
import { openNativeFile } from '../product/dsh-better-sidebar/src/client/native/tab-adapter.tsx'
import { createBetterSidebarService } from '../product/dsh-better-sidebar/src/client/service.ts'
import { createSidebarStore } from '../product/dsh-better-sidebar/src/client/state.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('YourBuddy Better Sidebar file opens', () => {
  it('uses the native tab occurrence for a new file tab', () => {
    const openResource = vi.fn()
    const info = { tab: { actions: { openResource } } }

    openNativeFile(info as never, 'owner-session', '/workspace', '/workspace/notes/readme.md', 'tab')

    expect(openResource).toHaveBeenCalledWith(
      'dsh-resource://file/session/owner-session/notes/readme.md',
      { revealIfOpened: true },
    )
  })

  it('replaces the owning native tab for an in-place file open', () => {
    const openResource = vi.fn()
    const info = { tab: { actions: { openResource } } }

    openNativeFile(info as never, 'owner-session', '/workspace', '/workspace/notes/readme.md', 'replace')

    expect(openResource).toHaveBeenCalledWith(
      'dsh-resource://file/session/owner-session/notes/readme.md',
      { replaceTab: true, revealIfOpened: false },
    )
  })

  it('routes product opens into the durable workbench and reveals only user intent', () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout })
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
    const store = createSidebarStore()
    store.setSession('session')
    let preferWorkbench = true
    const onOpenIntent = vi.fn()
    const service = createBetterSidebarService(store, {
      preferWorkbench: () => preferWorkbench,
      onOpenIntent,
    })
    service.registerTab({
      id: 'editor',
      title: 'Editor',
      component: () => null,
    })
    const openResource = vi.fn()
    service.setSurface({
      openTab: vi.fn(),
      openResource,
      fileAddress: () => 'dsh-resource://file/session/readme.md',
      close: () => undefined,
      update: () => undefined,
      activate: () => undefined,
    } as never)

    service.openTab({ type: 'editor', path: '/readme.md', intent: 'background' })
    expect(openResource).not.toHaveBeenCalled()
    expect(onOpenIntent).toHaveBeenLastCalledWith('background')
    expect(store.getSnapshot().state?.bottomOpen).toBe(true)

    service.openTab({ type: 'editor', path: '/readme.md', intent: 'user' })
    expect(onOpenIntent).toHaveBeenLastCalledWith('user')

    preferWorkbench = false
    service.openTab({ type: 'editor', path: '/native.md', intent: 'user' })
    expect(openResource).toHaveBeenCalledTimes(1)
  })

  it('uses the native tab occurrence for an open-to-the-side file action', () => {
    const openResource = vi.fn()
    const info = { tab: { actions: { openResource } } }

    openNativeFile(info as never, 'owner-session', '/workspace', '/workspace/notes/readme.md', 'side')

    expect(openResource).toHaveBeenCalledWith(
      'dsh-resource://file/session/owner-session/notes/readme.md',
      { toSide: true, revealIfOpened: false },
    )
  })
})
