/** Deferred terminal occurrence for workbench hosts outside the right Sidebar. */
import { lazy, Suspense, type ReactNode } from 'react'
import type { FactoryComponentPropsOf } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './face.ts'

const LoadedTerminalSurfaceFactory = lazy(async () => ({ default: (await import('./terminal.tsx')).LoadedTerminalSurfaceFactory }))

/** Load xterm only after an independently placed terminal is mounted. */
export function TerminalSurfaceFactory(props: FactoryComponentPropsOf<'terminal.surface'>): ReactNode {
  return <Suspense fallback={null}><LoadedTerminalSurfaceFactory {...props} /></Suspense>
}
