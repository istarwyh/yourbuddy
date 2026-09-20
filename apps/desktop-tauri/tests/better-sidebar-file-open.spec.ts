import { describe, expect, it, vi } from 'vitest'
import { openSidebarFile } from '../product/dsh-better-sidebar/src/client/intercept.tsx'

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
})
