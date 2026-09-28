/** Reusable terminal occurrence for workbench hosts outside the right Sidebar. */
import { useEffect, type ReactNode } from 'react'
import type { FactoryComponentPropsOf } from '@deepseek-ai/dsh-client-ui-slots'
import { TerminalSurface } from './terminal.tsx'
import type {} from './face.ts'

/** Render one independently placed terminal while its host keeps the tab mounted. */
export function TerminalSurfaceFactory(props: FactoryComponentPropsOf<'terminal.surface'>): ReactNode {
  const { sessionId, tabId, contentId, visible, replace, view, release, useTerminal, useTheme } = props
  const model = view({ sessionId, tabId, contentId })
  const state = useTerminal(contentId)
  const theme = useTheme(value => value)
  useEffect(() => () => { release(contentId) }, [release, contentId])
  return <TerminalSurface model={model} state={state} visible={visible} theme={theme} t={props.t} onNew={replace} />
}
