import { describe, expect, it, vi } from 'vitest'
import { openSidebarFile } from '../product/dsh-better-sidebar/src/client/intercept.tsx'
import { openNativeFile } from '../product/dsh-better-sidebar/src/client/native/tab-adapter.tsx'

describe('YourBuddy Better Sidebar file opens', () => {
  it('targets the session that owns the native Files tab', () => {
    const openTab = vi.fn()
    const ctx = {
      sessions: {
        list: {
          getSnapshot: () => ({
            byId: { session: { cwd: '/workspace' } },
          }),
        },
      },
      get: (name: string) => name === 'betterSidebar' ? { openTab } : undefined,
    }

    openSidebarFile(ctx, {} as never, 'session', 'notes/readme.md')

    expect(openTab).toHaveBeenCalledWith(
      {
        type: 'editor',
        title: 'readme.md',
        path: '/workspace/notes/readme.md',
        id: 'editor:/workspace/notes/readme.md',
      },
      { sessionId: 'session', cwd: '/workspace' },
    )
  })

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
