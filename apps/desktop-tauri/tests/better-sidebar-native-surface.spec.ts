import { describe, expect, it, vi } from 'vitest'
import { createNativeSurface } from '../product/dsh-better-sidebar/src/client/native/surface.ts'

describe('YourBuddy Better Sidebar native surface', () => {
  it('replays rejected Session-targeted opens in request order when the store is adopted', () => {
    let accepted = false
    let notifyAdopted: (() => void) | undefined
    const openResource = vi.fn()
    const openResourceIn = vi.fn(() => accepted)
    const unsubscribeSessionList = vi.fn()
    const unsubscribeMountedList = vi.fn()
    const unsubscribeMounted = vi.fn()
    const unsubscribeAdoption = vi.fn()
    const ctx = {
      get: (name: string) => {
        if (name !== 'sidebarRight') return undefined
        return {
          openResource,
          openResourceIn,
          mounted: {
            getSnapshot: () => 'other-session',
            subscribe: () => unsubscribeMounted,
          },
          onSessionAdopted: (listener: () => void) => {
            notifyAdopted = listener
            return unsubscribeAdoption
          },
        }
      },
      sessions: {
        list: {
          getSnapshot: () => ({ byId: { 'other-session': {}, 'owner-session': {} } }),
          subscribe: vi.fn()
            .mockReturnValueOnce(unsubscribeSessionList)
            .mockReturnValueOnce(unsubscribeMountedList),
        },
      },
    }
    const records = {
      get: () => undefined,
      drop: vi.fn(),
      update: vi.fn(),
      has: () => false,
      retain: vi.fn(),
    }
    const surface = createNativeSurface(ctx, records as never)
    const first = {
      sessionId: 'owner-session',
      address: 'dsh-resource://file/session/owner-session/notes/first.md',
      revealIfOpened: true,
    }
    const second = {
      sessionId: 'owner-session',
      address: 'dsh-resource://file/session/owner-session/notes/second.md',
      revealIfOpened: true,
    }

    surface.openResource(first)
    surface.openResource(second)
    expect(openResource).not.toHaveBeenCalled()

    accepted = true
    notifyAdopted?.()
    const acceptedCalls = openResourceIn.mock.calls.filter(([, address]) => (
      address === first.address || address === second.address
    )).slice(-2)
    expect(acceptedCalls.map(([, address]) => address)).toEqual([first.address, second.address])

    const callCount = openResourceIn.mock.calls.length
    notifyAdopted?.()
    expect(openResourceIn).toHaveBeenCalledTimes(callCount)
    surface.dispose()
    expect(unsubscribeSessionList).toHaveBeenCalledOnce()
    expect(unsubscribeMountedList).toHaveBeenCalledOnce()
    expect(unsubscribeMounted).toHaveBeenCalledOnce()
    expect(unsubscribeAdoption).toHaveBeenCalledOnce()
  })
})
