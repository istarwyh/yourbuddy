/** Injected terminal commands and keyed observable state. */
import type { WebTerminalId } from '@deepseek-ai/dsh-api-terminal-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TerminalView, TerminalViewState } from '@deepseek-ai/dsh-api-terminal-controller/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThemeSnapshot } from '@deepseek-ai/dsh-client-ui-theme/client'

/** The terminal's React-free model is resolved by sidebar occurrence. */
export interface TerminalInjected {
  /** @param key - sidebar occurrence key. @returns its terminal commands. */
  readonly view: (key: string) => TerminalView
  readonly keyedHooks: { readonly terminal: (key: string) => HostObservable<TerminalViewState> }
}


/** The terminal screen follows the resolved application theme through a framework hook. */
export interface TerminalBodyInjected extends TerminalInjected {
  readonly hooks: { readonly theme: HostObservable<ThemeSnapshot> }
}

/** Caller-owned identity, visibility, and replacement action for one reusable terminal occurrence. */
export interface TerminalSurfaceInputProps {
  readonly sessionId: SessionId
  readonly tabId: string
  readonly contentId: string
  readonly visible: boolean
  readonly replace: () => void
}

/** Terminal model and observable inputs supplied to the reusable occurrence factory. */
export interface TerminalSurfaceInjected {
  readonly view: (input: Pick<TerminalSurfaceInputProps, 'sessionId' | 'tabId' | 'contentId'>) => TerminalView
  readonly release: (contentId: string) => void
  readonly keyedHooks: { readonly terminal: (contentId: string) => HostObservable<TerminalViewState> }
  readonly hooks: { readonly theme: HostObservable<ThemeSnapshot> }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotFactoryMap {
    /** Terminal UI and model attachment reusable by an alternate tab host. */
    'terminal.surface': {
      scope: 'root'
      props: TerminalSurfaceInputProps
      inject: TerminalSurfaceInjected
      locale: 'sidebarTerminal'
    }
  }
}

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightTabParamsMap {
    /** An existing Host terminal selected from the Session terminal list. */
    terminal: { terminalId: WebTerminalId } | { shellPath: string }
  }
}
