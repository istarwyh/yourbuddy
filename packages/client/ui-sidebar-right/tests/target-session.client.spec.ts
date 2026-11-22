/** Targeted navigation uses adopted Session stores without changing the on-screen Session. */
import { expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { activeDockPaneId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { createSidebarRightStore } from '../src/client/stores.ts'
import { controllerHarness, SESSION } from './controller-harness.client.ts'

it('notifies after adoption, accepts targeted opens off screen, and rejects released stores', () => {
  const h = controllerHarness()
  const target = 'target-session' as SessionId
  const store = createSidebarRightStore(() => ({ kind: 'guide', title: 'seed' })).create()
  const observer = vi.fn((sessionId: SessionId) => {
    expect(h.controller.openTabIn(sessionId, 'guide')).toBe(true)
    const tab = h.controller.tabsIn(sessionId)[0]!
    expect(h.controller.tabDomain.occurrence(sessionId, tab).signal.aborted).toBe(false)
  })
  const unsubscribe = h.controller.onSessionAdopted(observer)
  const address = 'dsh-resource://file/session/target-session/note.txt'
  expect(h.controller.openResourceIn(target, address)).toBe(false)
  expect(h.controller.openTabIn(target, 'guide')).toBe(false)
  const release = h.adopt(target, store)
  try {
    expect(observer).toHaveBeenCalledExactlyOnceWith(target)
    expect(h.controller.openResourceIn(target, address, { destination: 'float' })).toBe(true)
    expect(h.controller.mounted.getSnapshot()).toBeUndefined()
    const tab = h.controller.tabsIn(target).find(record => record.kind === 'text')!
    const occurrence = h.controller.tabDomain.occurrence(target, tab)
    expect(occurrence.sessionId).toBe(target)
    expect(occurrence.navigation.getSnapshot().address).toBe(address)
    expect(h.controller.splitIn(target, activeDockPaneId(store.getSnapshot().bySession[target]!.layout))).toBeUndefined()
    unsubscribe()
    release()
    expect(h.controller.openResourceIn(target, address)).toBe(false)
    expect(h.controller.openTabIn(target, 'guide')).toBe(false)
    const readopt = h.adopt(target, store)
    expect(observer).toHaveBeenCalledTimes(1)
    readopt()
    expect(h.controller.tabsIn(SESSION)).toEqual([])
  } finally {
    unsubscribe()
    release()
    h.unadopt()
    h.controller.tabDomain.dispose()
  }
})
