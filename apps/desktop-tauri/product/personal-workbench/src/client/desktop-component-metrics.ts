/** Best-effort local observations from committed product UI actions, never remote telemetry. */

import { createDesktopComponentController, isDesktopComponentsAvailable, type DesktopComponentController } from './desktop-components.ts'

/** Same-document event emitted only after an explicit Pomodoro start/resume settles. */
export const COMPONENT_INVOCATION_EVENT = 'yourbuddy:component-invocation'

/** Lifecycle of the committed workbench's local metric adapter. */
export interface DesktopComponentMetrics {
  /** Report workbench commit once for this adapter; native deduplicates the Host generation. */
  ready(): void
  /** Remove the local listener and ignore/cancel outstanding metric waits. */
  dispose(): void
}

/**
 * Connect committed workbench and Pomodoro observations to the fixed native bridge.
 * @param target Current Host window; omitted outside a browser.
 * @param suppliedController Optional bridge controller for deterministic local tests.
 * @returns A ready notification and disposer; standalone web previews remain untouched.
 */
export function installDesktopComponentMetrics(
  target: Window | undefined = typeof window === 'undefined' ? undefined : window,
  suppliedController?: DesktopComponentController,
): DesktopComponentMetrics {
  if (target === undefined || !isDesktopComponentsAvailable(target)) return { ready() {}, dispose() {} }
  const controller = suppliedController ?? createDesktopComponentController({ target })
  let active = true
  let readyAttempted = false
  const diagnose = (): void => { if (active) console.warn('YourBuddy local component statistics were not recorded.') }
  const recordInvocation = async (succeeded: boolean): Promise<void> => {
    try {
      const overview = await controller.load()
      if (!active) return
      const token = overview.components.find(component => component.key === 'pomodoro')?.runtimeToken
      if (token === undefined || token === null) { diagnose(); return }
      await controller.reportPomodoroInvocation(token, succeeded)
    }
    catch (error) {
      // Metrics never reject or delay the user's already-settled Pomodoro operation.
      diagnose()
    }
  }
  const onInvocation = (event: Event): void => {
    if (!active || !(event instanceof CustomEvent)) return
    const value: unknown = event.detail
    if (value === null || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !== 'component,succeeded'
      || !('component' in value) || value.component !== 'pomodoro'
      || !('succeeded' in value) || typeof value.succeeded !== 'boolean') return
    void recordInvocation(value.succeeded)
  }
  const dispose = (): void => {
    if (!active) return
    active = false
    target.removeEventListener(COMPONENT_INVOCATION_EVENT, onInvocation)
    target.removeEventListener('pagehide', dispose)
    controller.dispose()
  }
  target.addEventListener(COMPONENT_INVOCATION_EVENT, onInvocation)
  target.addEventListener('pagehide', dispose)
  return {
    ready: () => {
      if (!active || readyAttempted) return
      readyAttempted = true
      void controller.reportWorkbenchReady().catch(diagnose)
    },
    dispose,
  }
}
