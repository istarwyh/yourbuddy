// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installDesktopComponentMetrics, COMPONENT_INVOCATION_EVENT } from '../src/client/desktop-component-metrics.ts'
import type { DesktopComponentController } from '../src/client/desktop-components.ts'
import type { ComponentOverview } from '../src/client/component-model.ts'

const originalParent = window.parent
const snapshot: ComponentOverview = { appVersion: '0.4.9', components: [{ key: 'pomodoro', kind: 'optional', version: '0.5.5', purpose: 'Focus timer', archiveBytes: 42, installedBytes: 100, state: 'active', policy: 'manual', canInstall: false, canChangePolicy: false, canClean: false, error: null, runtimeToken: 'host_install_1' }], metrics: null, metricsError: null }
const tick = async (): Promise<void> => { for (let index = 0; index < 8; index++) await Promise.resolve() }
function controller() {
  return { load: vi.fn<DesktopComponentController['load']>().mockResolvedValue(snapshot), plan: vi.fn(), install: vi.fn(), dispose: vi.fn(), reportWorkbenchReady: vi.fn<DesktopComponentController['reportWorkbenchReady']>().mockResolvedValue({ recorded: true }), reportPomodoroInvocation: vi.fn<DesktopComponentController['reportPomodoroInvocation']>().mockResolvedValue({ recorded: true }) }
}
function emit(detail: unknown): void { window.dispatchEvent(new CustomEvent(COMPONENT_INVOCATION_EVENT, { detail })) }
beforeEach(() => {
  Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage() {} } })
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('http://127.0.0.1:45678/')
})
afterEach(() => { Object.defineProperty(window, 'parent', { configurable: true, value: originalParent }); vi.restoreAllMocks() })

describe('committed workbench local metrics adapter', () => {
  it('does not report on registration and records ready only after the commit notification', async () => {
    const native = controller()
    const value = installDesktopComponentMetrics(window, native)
    expect(native.reportWorkbenchReady).not.toHaveBeenCalled()
    expect(native.load).not.toHaveBeenCalled()
    value.ready(); value.ready()
    expect(native.reportWorkbenchReady).toHaveBeenCalledOnce()
    expect(native.reportPomodoroInvocation).not.toHaveBeenCalled()
    value.dispose()
    value.ready()
    expect(native.reportWorkbenchReady).toHaveBeenCalledOnce()
  })

  it('records each explicit committed result separately using only the current eligible token', async () => {
    const native = controller()
    const value = installDesktopComponentMetrics(window, native)
    emit({ component: 'pomodoro', succeeded: true })
    emit({ component: 'pomodoro', succeeded: false })
    await tick()
    expect(native.reportPomodoroInvocation.mock.calls).toEqual([['host_install_1', true], ['host_install_1', false]])
    expect(native.install).not.toHaveBeenCalled()
    expect(native.plan).not.toHaveBeenCalled()
    expect(native.reportWorkbenchReady).not.toHaveBeenCalled()
    value.dispose()
  })

  it('rejects non-Pomodoro, malformed, and data-bearing same-document events', async () => {
    const native = controller()
    const value = installDesktopComponentMetrics(window, native)
    for (const event of [null, { component: 'harbor', succeeded: true }, { component: 'pomodoro', succeeded: 'true' }, { component: 'pomodoro', succeeded: true, task: 'must not leave this page' }]) emit(event)
    await tick()
    expect(native.load).not.toHaveBeenCalled()
    expect(native.reportPomodoroInvocation).not.toHaveBeenCalled()
    value.dispose()
  })

  it('keeps metric failures local and suppresses reports from disposed or navigated instances', async () => {
    const diagnostic = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const native = controller()
    native.reportPomodoroInvocation.mockRejectedValueOnce(new Error('stale token'))
    const value = installDesktopComponentMetrics(window, native)
    emit({ component: 'pomodoro', succeeded: true })
    await tick()
    expect(diagnostic).toHaveBeenCalledOnce()
    let finish!: (value: ComponentOverview) => void
    native.load.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    emit({ component: 'pomodoro', succeeded: true })
    window.dispatchEvent(new Event('pagehide'))
    finish(snapshot)
    await tick()
    expect(native.reportPomodoroInvocation).toHaveBeenCalledOnce()
    emit({ component: 'pomodoro', succeeded: false })
    await tick()
    expect(native.load).toHaveBeenCalledTimes(2)
    expect(native.dispose).toHaveBeenCalledOnce()
    value.dispose()
  })

  it('does not count an ineligible component or retain duplicate listeners across HMR', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const old = controller()
    const previous = installDesktopComponentMetrics(window, old)
    previous.dispose()
    const native = controller()
    native.load.mockResolvedValue({ ...snapshot, components: snapshot.components.map(item => ({ ...item, runtimeToken: null })) })
    const current = installDesktopComponentMetrics(window, native)
    emit({ component: 'pomodoro', succeeded: true })
    await tick()
    expect(old.load).not.toHaveBeenCalled()
    expect(native.reportPomodoroInvocation).not.toHaveBeenCalled()
    current.dispose()
  })
})
