/** Registered descriptor kinds retain their native navigation parameters. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBetterSidebarService, type SidebarSurface } from '../product/dsh-better-sidebar/src/client/service.ts'
import { createSidebarStore } from '../product/dsh-better-sidebar/src/client/state.ts'

afterEach(() => { vi.unstubAllGlobals() })

function bench() {
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() })
  const store = createSidebarStore()
  store.setSession('mounted-session')
  const service = createBetterSidebarService(store)
  const openTab = vi.fn<SidebarSurface['openTab']>()
  service.setSurface({
    openTab,
    openResource: vi.fn(),
    fileAddress: () => 'dsh-resource://file/session/test/readme.md',
    close: () => undefined,
    update: () => false,
    activate: () => false,
    has: () => false,
  })
  return { service, openTab }
}

describe('Better Sidebar native descriptor kinds', () => {
  it('forwards an external registered kind and all parameters to the target Session', () => {
    const b = bench()
    b.service.registerTab({ id: 'external:preview', title: 'Preview', component: () => null })
    const meta = { view: 'summary' }

    b.service.openTab({
      type: 'external:preview', title: 'Custom title', path: '/notes/readme.md',
      url: 'https://example.com', meta,
    }, { sessionId: 'target-session' })

    expect(b.openTab).toHaveBeenCalledExactlyOnceWith({
      sessionId: 'target-session', kind: 'external:preview',
      params: { title: 'Custom title', path: '/notes/readme.md', url: 'https://example.com', meta },
      revealIfOpened: true,
    })
  })

  it('does not admit an unregistered or disposed descriptor to the native surface', () => {
    const b = bench()
    b.service.openTab({ type: 'external:missing', meta: { ignored: true } })
    const dispose = b.service.registerTab({ id: 'external:removed', title: 'Removed', component: () => null })
    dispose()
    b.service.openTab({ type: 'external:removed' })
    expect(b.openTab).not.toHaveBeenCalled()
  })

  it('maps a registered editor descriptor to its files page without changing the kind', () => {
    const b = bench()
    b.service.registerTab({ id: 'editor', title: 'Editor', component: () => null })
    b.service.openTab({ type: 'editor' })
    expect(b.openTab).toHaveBeenCalledExactlyOnceWith({
      sessionId: 'mounted-session', kind: 'files', params: {}, revealIfOpened: true,
    })
  })
})
