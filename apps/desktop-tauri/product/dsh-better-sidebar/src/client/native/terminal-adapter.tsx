/** Adapt DSH's terminal factory to the slot-hosted Better Sidebar workbench. */
import type { ReactNode } from 'react'
import { PluginArtworkTerminal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TerminalSurfaceInputProps } from '@deepseek-ai/dsh-client-ui-sidebar-terminal/client'
import type { Context } from '../../context-types.ts'
import type { BetterSidebarService, TabComponentProps } from '../service.ts'
import { allLeaves, type SidebarStore } from '../state.ts'
import { t } from '../locales.ts'

type TerminalSessionId = TerminalSurfaceInputProps['sessionId']

interface TerminalControllerFace {
  close(sessionId: TerminalSessionId, key: string, contentId: string): void
  retainTab(tab: { sessionId: TerminalSessionId; tabId: string; contentId: string }): () => void
}

function contentIdOf(sessionId: string, tabId: string): string {
  return `better-sidebar:${sessionId}:${tabId}`
}

function terminalController(ctx: Context): TerminalControllerFace | undefined {
  return ctx.get('webTerminals') as TerminalControllerFace | undefined
}

/** Register the workbench terminal tab and retain every cached Session occurrence. */
export function registerWorkbenchTerminal(ctx: Context, store: SidebarStore, service: BetterSidebarService): () => void {
  const component = ({ scope, tab, visible, renderFactorySlot }: TabComponentProps): ReactNode => {
    if (renderFactorySlot === undefined) return null
    const replace = (): void => {
      service.closeTab(tab.id, scope)
      service.openTab({ type: 'terminal' }, scope)
    }
    const input: TerminalSurfaceInputProps = {
      sessionId: scope.sessionId as TerminalSessionId,
      tabId: tab.id,
      contentId: contentIdOf(scope.sessionId, tab.id),
      visible,
      replace,
    }
    return renderFactorySlot('terminal.surface', input)
  }
  const disposeDescriptor = service.registerTab({
    id: 'terminal',
    title: () => t('terminal'),
    description: () => t('guideDescTerminal'),
    icon: size => <PluginArtworkTerminal size={size} />,
    order: 40,
    native: false,
    available: () => terminalController(ctx) !== undefined,
    createTab: () => ({
      tab: {
        id: `terminal:${crypto.randomUUID()}`,
        type: 'terminal',
        title: t('terminal'),
      },
    }),
    onClose: (tab, scope) => {
      terminalController(ctx)?.close(scope.sessionId as TerminalSessionId, tab.id, contentIdOf(scope.sessionId, tab.id))
    },
    component,
  })
  const holds = new Map<string, () => void>()
  const syncHolds = (): void => {
    const terminals = terminalController(ctx)
    const wanted = new Set<string>()
    for (const [sessionId, state] of store.getSessionStates()) {
      for (const leaf of allLeaves(state.bottomSplits)) {
        for (const tab of leaf.tabs) {
          if (tab.type !== 'terminal') continue
          const contentId = contentIdOf(sessionId, tab.id)
          wanted.add(contentId)
          if (!holds.has(contentId) && terminals !== undefined) {
            holds.set(contentId, terminals.retainTab({ sessionId: sessionId as TerminalSessionId, tabId: tab.id, contentId }))
          }
        }
      }
    }
    for (const [contentId, release] of holds) {
      if (wanted.has(contentId)) continue
      release()
      holds.delete(contentId)
    }
  }
  const unsubscribe = store.subscribe(syncHolds)
  syncHolds()
  return () => {
    unsubscribe()
    for (const release of holds.values()) release()
    holds.clear()
    disposeDescriptor()
  }
}
