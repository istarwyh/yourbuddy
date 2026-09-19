import { describe, expect, it, vi } from 'vitest'
import { LayoutController } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import type { PanelActions } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'

function fakePanels(): PanelActions {
  return {
    setSidebar: vi.fn(),
    setDetails: vi.fn(),
    toggleSidebar: vi.fn(),
    setNarrow: vi.fn(),
    openDetails: vi.fn(),
    closeDetails: vi.fn(),
  }
}

describe('LayoutController', () => {
  it('forwards the three panel actions to the attached set', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    service.attachPanels(panels)

    service.toggleSidebar()
    service.openDetails()
    service.closeDetails()

    expect(panels.toggleSidebar).toHaveBeenCalledTimes(1)
    expect(panels.openDetails).toHaveBeenCalledTimes(1)
    expect(panels.closeDetails).toHaveBeenCalledTimes(1)
    expect(panels.setSidebar).not.toHaveBeenCalled()
    expect(panels.setDetails).not.toHaveBeenCalled()
  })

  it('fails loud before the root entry wired its actions', () => {
    const service = new LayoutController()
    expect(() => { service.toggleSidebar() }).toThrow(/panel actions not wired/)
    expect(() => { service.openDetails() }).toThrow(/panel actions not wired/)
    expect(() => { service.closeDetails() }).toThrow(/panel actions not wired/)
  })

  it('re-attach overwrites the stale action set (entry re-register)', () => {
    const service = new LayoutController()
    const stale = fakePanels()
    const fresh = fakePanels()
    service.attachPanels(stale)
    service.attachPanels(fresh)

    service.toggleSidebar()

    expect(stale.toggleSidebar).not.toHaveBeenCalled()
    expect(fresh.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('projects one workbench binding and releases it with the registration', () => {
    const service = new LayoutController()
    let width = 400
    let publish = (): void => {}
    const changed = vi.fn()
    const unsubscribe = service.subscribeWorkbench(changed)

    const dispose = service.registerWorkbench({
      getSnapshot: () => ({ width }),
      subscribe: (listener) => {
        publish = listener
        return () => { publish = () => {} }
      },
      setWidth: (next) => { width = next; publish() },
    })

    expect(service.getWorkbenchSnapshot()).toEqual({ present: true, width: 400 })
    service.setWorkbenchWidth(460)
    expect(service.getWorkbenchSnapshot()).toEqual({ present: true, width: 460 })
    expect(changed).toHaveBeenCalledTimes(2)

    expect(() => service.registerWorkbench({
      getSnapshot: () => ({ width: 320 }),
      subscribe: () => () => {},
      setWidth: () => {},
    })).toThrow(/workbench already registered/)

    dispose()
    expect(service.getWorkbenchSnapshot()).toEqual({ present: false, width: 0 })
    service.setWorkbenchWidth(520)
    expect(width).toBe(460)
    unsubscribe()
  })
})
