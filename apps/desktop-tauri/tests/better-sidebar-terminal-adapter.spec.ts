import { describe, expect, it, vi } from 'vitest'
import { registerWorkbenchTerminal } from '../product/dsh-better-sidebar/src/client/native/terminal-adapter.tsx'
import { nativeTabDescriptors } from '../product/dsh-better-sidebar/src/client/native/index.ts'
import type { BetterSidebarService, TabDescriptor } from '../product/dsh-better-sidebar/src/client/service.ts'
import type { SidebarState } from '../product/dsh-better-sidebar/src/client/state.ts'

function stateWith(...tabs: Array<{ id: string; type: string; title: string }>): SidebarState {
  return {
    activePane: 'pane', nextBrowser: 1, expanded: [], revealed: [], bottomOpen: true, bottomHeight: 220,
    bottomSplits: { kind: 'leaf', id: 'pane', tabs, active: tabs[0]?.id ?? null },
  }
}

describe('Better Sidebar terminal adapter', () => {
  it('renders the DSH terminal factory and retains cached Session occurrences until close', () => {
    const releaseA = vi.fn()
    const releaseB = vi.fn()
    const retainTab = vi.fn()
      .mockReturnValueOnce(releaseA)
      .mockReturnValueOnce(releaseB)
    const close = vi.fn()
    const terminals = { retainTab, close }
    const ctx = { get: (name: string) => name === 'webTerminals' ? terminals : undefined }
    const states = new Map<string, SidebarState>([
      ['session-a', stateWith({ id: 'terminal:a', type: 'terminal', title: 'Terminal' })],
      ['session-b', stateWith({ id: 'terminal:b', type: 'terminal', title: 'Terminal' })],
    ])
    let notify = (): void => {}
    const store = {
      getSessionStates: () => new Map(states),
      subscribe: (listener: () => void) => { notify = listener; return vi.fn() },
    }
    let descriptor: TabDescriptor | undefined
    const disposeDescriptor = vi.fn()
    const openTab = vi.fn()
    const closeTab = vi.fn()
    const service = {
      registerTab: (value: TabDescriptor) => { descriptor = value; return disposeDescriptor },
      openTab,
      closeTab,
      getTabs: () => descriptor === undefined ? [] : [descriptor],
      isTabEnabled: () => true,
    }

    const dispose = registerWorkbenchTerminal(ctx, store, service as never)
    expect(retainTab.mock.calls).toEqual([
      [{ sessionId: 'session-a', tabId: 'terminal:a', contentId: 'better-sidebar:session-a:terminal:a' }],
      [{ sessionId: 'session-b', tabId: 'terminal:b', contentId: 'better-sidebar:session-b:terminal:b' }],
    ])
    expect(descriptor?.native).toBe(false)

    notify()
    expect(releaseA).not.toHaveBeenCalled()
    expect(releaseB).not.toHaveBeenCalled()

    const renderFactorySlot = vi.fn((_name: string, _input: { replace: () => void }) => 'terminal-view')
    const rendered = descriptor?.component({
      scope: { sessionId: 'session-a' }, tab: { id: 'terminal:a', type: 'terminal', title: 'Terminal' },
      visible: true, renderFactorySlot,
    } as never)
    expect(rendered).toBe('terminal-view')
    expect(renderFactorySlot).toHaveBeenCalledOnce()
    const [factoryId, factoryInput] = renderFactorySlot.mock.calls[0]
    expect(factoryId).toBe('terminal.surface')
    expect(factoryInput).toMatchObject({
      sessionId: 'session-a', tabId: 'terminal:a', contentId: 'better-sidebar:session-a:terminal:a',
      visible: true,
    })
    expect(typeof factoryInput.replace).toBe('function')
    factoryInput.replace()
    expect(closeTab).toHaveBeenCalledWith('terminal:a', { sessionId: 'session-a' })
    expect(openTab).toHaveBeenCalledWith({ type: 'terminal' }, { sessionId: 'session-a' })

    descriptor?.onClose?.({ id: 'terminal:a', type: 'terminal', title: 'Terminal' }, { sessionId: 'session-a' })
    expect(close).toHaveBeenCalledWith('session-a', 'terminal:a', 'better-sidebar:session-a:terminal:a')
    states.set('session-a', stateWith())
    notify()
    expect(releaseA).toHaveBeenCalledOnce()
    expect(releaseB).not.toHaveBeenCalled()

    dispose()
    expect(releaseB).toHaveBeenCalledOnce()
    expect(disposeDescriptor).toHaveBeenCalledOnce()
  })

  it('keeps workbench-only descriptors out of the native right Sidebar', () => {
    const descriptors = [
      { id: 'terminal', title: 'Terminal', native: false, component: () => null },
      { id: 'git', title: 'Changes', component: () => null },
    ] satisfies TabDescriptor[]
    const service = {
      getTabs: () => descriptors,
      isTabEnabled: (id: string) => id !== 'disabled',
    } as BetterSidebarService
    expect(nativeTabDescriptors(service).map(descriptor => descriptor.id)).toEqual(['git'])
  })
})
