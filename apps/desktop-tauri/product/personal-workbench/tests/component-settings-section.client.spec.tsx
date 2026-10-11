// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComponentSettingsSection } from '../src/client/ComponentSettingsSection.tsx'
import { componentEn, componentZh, type ComponentLocaleKey } from '../src/client/component-locales.ts'
import type { ComponentController, ComponentOverview, InstallPlan } from '../src/client/component-model.ts'

const t = (key: ComponentLocaleKey): string => componentEn[key]
const fixture: ComponentOverview = {
  appVersion: '0.1.7',
  components: [{ key: 'harbor', kind: 'capability-on-demand', version: '0.1.7', purpose: 'Agent evaluation', archiveBytes: 2048, installedBytes: null, state: 'absent', policy: 'on-demand', canInstall: true, canChangePolicy: false, canClean: false, error: null, runtimeToken: null }],
  metrics: {
    formatVersion: 1, appVersion: '0.1.7', windowStartedAtUnixMs: 1791680400000, bootAttempts: 3, workbenchReadyCount: 2, workbenchReadyTotalMs: 810, workbenchReadyMaxMs: 500, readinessFailures: 1,
    components: { harness: { networkBytes: 123, retransferredBytes: 23, cacheArchiveBytes: 256, offlineSeedArchiveBytes: 512, resumeAttempts: 2, resumeSuccesses: 1, installs: 1, invocations: 4, successfulInvocations: 3 } },
  },
  metricsError: null,
}
const installPlan: InstallPlan = {
  components: [
    { component: 'harness', id: 'harness-0.1.7', action: 'reuse', archiveBytes: 1024 },
    { component: 'harbor', id: 'harbor-0.1.7', action: 'prepare', archiveBytes: 2048 },
  ],
  prepareArchiveBytes: 2048,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise })
  return { promise, resolve, reject }
}

function controller() {
  return {
    load: vi.fn<ComponentController['load']>().mockResolvedValue(fixture),
    plan: vi.fn<ComponentController['plan']>().mockResolvedValue(installPlan),
    install: vi.fn<ComponentController['install']>().mockResolvedValue({ restartRequired: false }),
  }
}

async function reviewPlan() {
  fireEvent.click(await screen.findByRole('button', { name: 'Review install plan' }))
  return await screen.findByRole('button', { name: 'Confirm component preparation' })
}

afterEach(cleanup)

describe('component settings', () => {
  it('shows local release-scoped counters and unmeasured sizes without preparing anything', async () => {
    const native = controller()
    render(<ComponentSettingsSection t={t} controller={native} />)
    await screen.findByText('Not measured')
    expect(screen.getByText('Current app version: 0.1.7')).toBeTruthy()
    expect(screen.getByText(/accumulated since/).textContent).toContain('Stored on this device only')
    expect(screen.getByText('Retransferred bytes (included above)')).toBeTruthy()
    expect(screen.getByText('Cached archive bytes reused')).toBeTruthy()
    expect(screen.getByText('Offline seed archive bytes')).toBeTruthy()
    expect(screen.getByText('Installations')).toBeTruthy()
    expect(screen.getByText('Pomodoro actions')).toBeTruthy()
    expect(screen.getByText('Successful Pomodoro actions')).toBeTruthy()
    expect(screen.getByText(/not overall core feature usage/)).toBeTruthy()
    expect(native.plan).not.toHaveBeenCalled()
    expect(native.install).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /clean|policy/i })).toBeNull()
    expect(screen.getByRole('region', { name: 'harbor' }).textContent).toMatchInlineSnapshot('"harborTypeOn-demand capabilityComponent version0.1.7PurposeAgent evaluationArchive size2,048 BInstalled sizeNot measuredStateNot installedPreparation policyOn demandReview install plan"')
  })

  it('keeps default features automatic and offers preparation only for Harbor', async () => {
    const native = controller()
    const component = fixture.components[0]!
    native.load.mockResolvedValue({ ...fixture, components: [
      { ...component, key: 'harness', kind: 'core-runtime', purpose: 'Default workbench features', policy: 'required', state: 'in-use', canInstall: true },
      { ...component, key: 'node', kind: 'runtime-fallback', policy: 'fallback', canInstall: true },
      { ...component, key: 'harborPlugin', kind: 'optional', policy: 'manual' },
      component,
    ] })
    render(<ComponentSettingsSection t={t} controller={native} />)
    await screen.findByText('In use')
    expect(screen.getByText(/Existing features start automatically/)).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'harness' })).queryByRole('button')).toBeNull()
    expect(screen.getByRole('region', { name: 'harness' }).textContent).toMatchInlineSnapshot('"harnessTypeCore runtimeComponent version0.1.7PurposeDefault workbench featuresArchive size2,048 BInstalled sizeNot measuredStateIn usePreparation policyRequired"')
    expect(within(screen.getByRole('region', { name: 'node' })).queryByRole('button')).toBeNull()
    expect(within(screen.getByRole('region', { name: 'harborPlugin' })).getByRole('button', { name: 'Review install plan' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'harbor' })).getByRole('button', { name: 'Review install plan' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'pomodoro' })).toBeNull()
    expect(native.plan).not.toHaveBeenCalled()
    expect(native.install).not.toHaveBeenCalled()
  })

  it('labels timer actions only under harness while retaining other archive statistics', async () => {
    const native = controller()
    const metrics = fixture.metrics!
    native.load.mockResolvedValue({ ...fixture, metrics: { ...metrics, components: { ...metrics.components, harbor: { ...metrics.components.harness!, invocations: 0, successfulInvocations: 0 } } } })
    render(<ComponentSettingsSection t={t} controller={native} />)
    await screen.findByText('Pomodoro actions')
    const harness = screen.getByText('harness', { selector: 'summary' }).parentElement!
    const harbor = screen.getByText('harbor', { selector: 'summary' }).parentElement!
    expect(within(harness).getByText('Pomodoro actions')).toBeTruthy()
    expect(within(harbor).queryByText('Pomodoro actions')).toBeNull()
    expect(within(harbor).queryByText('Successful Pomodoro actions')).toBeNull()
    expect(within(harbor).getByText('Installations')).toBeTruthy()
    expect(within(harbor).getByText('Downloaded payload bytes')).toBeTruthy()
  })

  it('reviews dependencies and archive total before preparing once, reloads, and reports restart separately', async () => {
    const native = controller()
    const preparing = deferred<{ restartRequired: boolean }>()
    native.install.mockReturnValue(preparing.promise)
    native.load.mockResolvedValueOnce(fixture).mockResolvedValue({ ...fixture, components: fixture.components.map(item => ({ ...item, state: 'prepared', canInstall: false })) })
    render(<ComponentSettingsSection t={t} controller={native} />)
    const confirm = await reviewPlan()
    const region = screen.getByRole('region', { name: 'Install plan: harbor' })
    expect(within(region).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'harness · harness-0.1.7 · Reuse verified installation · 1,024 B',
      'harbor · harbor-0.1.7 · Prepare · 2,048 B',
    ])
    expect(within(region).getByText('Total archive size requiring preparation')).toBeTruthy()
    expect(within(region).getByText(/not an estimated network transfer/)).toBeTruthy()
    expect(native.install).not.toHaveBeenCalled()
    act(() => { fireEvent.click(confirm); fireEvent.click(confirm) })
    expect(native.install).toHaveBeenCalledExactlyOnceWith('harbor')
    expect((screen.getByRole('button', { name: 'Close plan' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { preparing.resolve({ restartRequired: true }) })
    await screen.findByText('Prepared (startup not confirmed)')
    expect(native.load).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/Restart YourBuddy/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Install plan: harbor' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Refresh status' }))
  })

  it('closes an in-flight plan, restores focus, and ignores it after a newer plan finishes', async () => {
    const native = controller()
    const stale = deferred<InstallPlan>()
    native.plan.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(installPlan)
    render(<ComponentSettingsSection t={t} controller={native} />)
    const trigger = await screen.findByRole('button', { name: 'Review install plan' })
    act(() => { fireEvent.click(trigger); fireEvent.click(trigger) })
    expect(native.plan).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Close plan' }))
    expect(document.activeElement).toBe(trigger)
    await reviewPlan()
    await act(async () => { stale.resolve({ components: [], prepareArchiveBytes: 999 }) })
    expect(screen.queryByText('999 B')).toBeNull()
    expect(screen.getByText('harness-0.1.7')).toBeTruthy()
    expect(native.install).not.toHaveBeenCalled()
  })

  it('dismisses a review on Escape or Back without changing history or installing', async () => {
    const native = controller()
    render(<ComponentSettingsSection t={t} controller={native} />)
    await reviewPlan()
    const href = window.location.href
    fireEvent.keyDown(screen.getByRole('region', { name: 'Install plan: harbor' }), { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Confirm component preparation' })).toBeNull()
    await reviewPlan()
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.queryByRole('button', { name: 'Confirm component preparation' })).toBeNull()
    expect(window.location.href).toBe(href)
    expect(native.install).not.toHaveBeenCalled()
  })

  it('retries failed reads and plans without installing automatically', async () => {
    const native = controller()
    native.load.mockRejectedValueOnce(new Error('inventory offline')).mockResolvedValueOnce(fixture)
    native.plan.mockRejectedValueOnce(new Error('planner offline')).mockResolvedValueOnce(installPlan)
    render(<ComponentSettingsSection t={t} controller={native} />)
    await screen.findByText(/inventory offline/)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Review install plan' }))
    await screen.findByText(/planner offline/)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('button', { name: 'Confirm component preparation' })
    expect(native.load).toHaveBeenCalledTimes(2)
    expect(native.plan).toHaveBeenCalledTimes(2)
    expect(native.install).not.toHaveBeenCalled()
  })

  it('keeps failed preparation retryable through a fresh plan', async () => {
    const native = controller()
    native.install.mockRejectedValueOnce(new Error('download failed'))
    render(<ComponentSettingsSection t={t} controller={native} />)
    fireEvent.click(await reviewPlan())
    await screen.findByText(/download failed/)
    expect(screen.queryByRole('button', { name: 'Confirm component preparation' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Refresh status' }))
    fireEvent.click(await reviewPlan())
    await screen.findByText('Component preparation finished and status was refreshed.')
    expect(native.plan).toHaveBeenCalledTimes(2)
    expect(native.install).toHaveBeenCalledTimes(2)
  })

  it('preserves restart information when the post-install refresh fails', async () => {
    const native = controller()
    native.install.mockResolvedValue({ restartRequired: true })
    native.load.mockResolvedValueOnce(fixture).mockRejectedValueOnce(new Error('refresh offline')).mockResolvedValueOnce(fixture)
    render(<ComponentSettingsSection t={t} controller={native} />)
    fireEvent.click(await reviewPlan())
    await screen.findByText(/refresh offline/)
    expect(screen.getByText(/Restart YourBuddy/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Review install plan' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('button', { name: 'Review install plan' })
    expect(native.install).toHaveBeenCalledOnce()
    expect(screen.getByText(/Restart YourBuddy/)).toBeTruthy()
  })

  it('keeps an outstanding restart requirement after another preparation completes', async () => {
    const native = controller()
    native.install.mockResolvedValueOnce({ restartRequired: true }).mockResolvedValueOnce({ restartRequired: false })
    render(<ComponentSettingsSection t={t} controller={native} />)
    fireEvent.click(await reviewPlan())
    await screen.findByText(/Restart YourBuddy/)
    fireEvent.click(await reviewPlan())
    await act(async () => {})
    expect(native.install).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/Restart YourBuddy/)).toBeTruthy()
  })

  it('ignores a superseded controller response and an unmounted installation completion', async () => {
    const previous = controller()
    const oldRead = deferred<ComponentOverview>()
    previous.load.mockReturnValue(oldRead.promise)
    const native = controller()
    const view = render(<ComponentSettingsSection t={t} controller={previous} />)
    view.rerender(<ComponentSettingsSection t={t} controller={native} />)
    await screen.findByText('Current app version: 0.1.7')
    await act(async () => { oldRead.resolve({ ...fixture, appVersion: 'old' }) })
    expect(screen.queryByText('Current app version: old')).toBeNull()
    const pending = deferred<{ restartRequired: boolean }>()
    native.install.mockReturnValue(pending.promise)
    fireEvent.click(await reviewPlan())
    view.unmount()
    await act(async () => { pending.resolve({ restartRequired: true }) })
    expect(native.load).toHaveBeenCalledOnce()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows metric read errors independently and only exposes install when the owner allows it', async () => {
    const native = controller()
    native.load.mockResolvedValue({ ...fixture, components: fixture.components.map(item => ({ ...item, state: 'in-use', canInstall: false, canClean: false })), metrics: null, metricsError: 'metrics locked' })
    render(<ComponentSettingsSection t={t} controller={native} />)
    await screen.findByText('In use')
    expect(screen.getByText('Local statistics are unavailable.')).toBeTruthy()
    expect(screen.getByText('metrics locked')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Review install plan' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Refresh status' })).toBeTruthy()
  })

  it('renders Chinese with the same translation keys', async () => {
    const native = controller()
    expect(Object.keys(componentEn).sort()).toEqual(Object.keys(componentZh).sort())
    render(<ComponentSettingsSection t={key => componentZh[key]} controller={native} />)
    await screen.findByText('未测量')
    expect(screen.getByRole('button', { name: '查看安装计划' })).toBeTruthy()
    expect(screen.getByText('本机统计')).toBeTruthy()
    expect(screen.getByText('番茄钟操作次数')).toBeTruthy()
    expect(screen.getByText(/现有功能随工作台默认自动启动/)).toBeTruthy()
  })
})
