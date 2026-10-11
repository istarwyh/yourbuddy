/** Fixed component requests between the Host iframe and its runtime-owned loopback shell. */

import type { ComponentController, ComponentCounters, ComponentOverview, ComponentView, InstallPlan, MetricsSnapshot } from './component-model.ts'

/** Component-only shell protocol; this channel never accepts a native command name or path. */
export const DESKTOP_COMPONENT_CHANNEL = 'yourbuddy.desktop.components'
/** Version of the component request and response envelopes. */
export const DESKTOP_COMPONENT_VERSION = 1

const REQUEST_ID = /^[A-Za-z0-9_-]{1,64}$/
const COMPONENT_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
type Action = 'get' | 'plan' | 'install' | 'report' | 'ready' | 'invocation'
/** Actual Host Fiber state; undefined means no conclusive observation is available yet. */
export type ComponentRuntimeState = 'active' | 'failed' | 'inactive'
const RUNTIME_TOKEN = /^[A-Za-z0-9_-]{1,128}$/
type Result = ComponentOverview | InstallPlan | { readonly restartRequired: boolean } | { readonly recorded: boolean }
type Message = { readonly data: unknown; readonly origin: string; readonly source: object | null }

/** Browser facilities required by the component bridge, also supplied by a real Window. */
export interface DesktopComponentWindow {
  readonly parent: { postMessage(message: unknown, targetOrigin: string): void }
  postMessage(message: unknown, targetOrigin: string): void
  readonly document: { readonly referrer: string }
  readonly location: { readonly origin: string }
  addEventListener(type: 'message', listener: (event: Message) => void): void
  addEventListener(type: 'pagehide', listener: () => void): void
  removeEventListener(type: 'message', listener: (event: Message) => void): void
  removeEventListener(type: 'pagehide', listener: () => void): void
  setTimeout(handler: () => void, milliseconds: number): number
  clearTimeout(timeout: number): void
}

/** Browser request timing and deterministic test inputs. */
export interface DesktopComponentOptions {
  readonly target?: DesktopComponentWindow
  readonly requestId?: () => string
  readonly handshakeTimeoutMs?: number
  readonly completionTimeoutMs?: number
  /** Observe the exact catalog plugin through real Host inventory, never package presence. */
  readonly observeRuntime?: (component: ComponentView) => Promise<ComponentRuntimeState | undefined>
}

/** Cancel browser waits on view teardown; already-accepted native operations are not undone. */
export interface DesktopComponentController extends ComponentController {
  /** Cancel current waits. Later explicit requests can reuse the controller after React remount. */
  dispose(): void
  /** Record this Host generation's committed workbench once; no payload is transmitted. */
  reportWorkbenchReady(): Promise<{ readonly recorded: boolean }>
  /** Record one explicit Pomodoro start/resume result against the current native token. */
  reportPomodoroInvocation(runtimeToken: string, succeeded: boolean): Promise<{ readonly recorded: boolean }>
}

function shellOrigin(target: DesktopComponentWindow | undefined): string | undefined {
  if (target === undefined || target.parent === target) return undefined
  try {
    const url = new URL(target.document.referrer)
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port === ''
      || url.username !== '' || url.password !== '' || url.origin === target.location.origin) return undefined
    return url.origin
  }
  catch { return undefined }
}

/**
 * Report whether this Host frame has the desktop's loopback parent origin.
 * @param target Host browser window; defaults to the current window when present.
 * @returns False in standalone web previews and unrecognized embedding contexts.
 */
export function isDesktopComponentsAvailable(target: DesktopComponentWindow | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  return shellOrigin(target) !== undefined
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function keys(value: Record<string, unknown>, expected: string): boolean {
  return Object.keys(value).sort().join(',') === expected
}
function text(value: unknown): value is string { return typeof value === 'string' }
function count(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 }
function member<T extends string>(value: unknown, choices: readonly T[]): value is T { return typeof value === 'string' && choices.includes(value as T) }
function component(value: unknown): value is ComponentView {
  return record(value) && keys(value, 'archiveBytes,canChangePolicy,canClean,canInstall,error,installedBytes,key,kind,policy,purpose,runtimeToken,state,version')
    && text(value.key) && COMPONENT_KEY.test(value.key) && text(value.version) && text(value.purpose)
    && member(value.kind, ['core-runtime', 'runtime-fallback', 'capability-on-demand', 'optional'])
    && count(value.archiveBytes) && (value.installedBytes === null || count(value.installedBytes))
    && member(value.state, ['absent', 'prepared', 'active', 'in-use', 'installing', 'failed'])
    && member(value.policy, ['required', 'fallback', 'on-demand', 'manual'])
    && typeof value.canInstall === 'boolean' && typeof value.canChangePolicy === 'boolean' && typeof value.canClean === 'boolean'
    && (value.error === null || text(value.error))
    && (value.runtimeToken === null || (text(value.runtimeToken) && RUNTIME_TOKEN.test(value.runtimeToken)))
}
function counters(value: unknown): value is ComponentCounters {
  return record(value) && keys(value, 'cacheArchiveBytes,installs,invocations,networkBytes,offlineSeedArchiveBytes,resumeAttempts,resumeSuccesses,retransferredBytes,successfulInvocations')
    && Object.values(value).every(count)
}
function metrics(value: unknown): value is MetricsSnapshot {
  return record(value) && keys(value, 'appVersion,bootAttempts,components,formatVersion,readinessFailures,windowStartedAtUnixMs,workbenchReadyCount,workbenchReadyMaxMs,workbenchReadyTotalMs')
    && value.formatVersion === 1 && text(value.appVersion) && count(value.windowStartedAtUnixMs)
    && count(value.bootAttempts) && count(value.workbenchReadyCount) && count(value.workbenchReadyTotalMs)
    && count(value.workbenchReadyMaxMs) && count(value.readinessFailures) && record(value.components)
    && Object.entries(value.components).every(([key, value]) => COMPONENT_KEY.test(key) && counters(value))
}
function overview(value: unknown): value is ComponentOverview {
  return record(value) && keys(value, 'appVersion,components,metrics,metricsError') && text(value.appVersion)
    && Array.isArray(value.components) && value.components.every(component)
    && (value.metrics === null || (metrics(value.metrics) && value.metrics.appVersion === value.appVersion))
    && (value.metricsError === null || text(value.metricsError))
}
function plan(value: unknown): value is InstallPlan {
  return record(value) && keys(value, 'components,prepareArchiveBytes') && count(value.prepareArchiveBytes)
    && Array.isArray(value.components) && value.components.every(entry => record(entry)
      && keys(entry, 'action,archiveBytes,component,id') && text(entry.component) && COMPONENT_KEY.test(entry.component)
      && text(entry.id) && member(entry.action, ['prepare', 'reuse']) && count(entry.archiveBytes))
}
function installed(value: unknown): value is { readonly restartRequired: boolean } {
  return record(value) && keys(value, 'restartRequired') && typeof value.restartRequired === 'boolean'
}
function recorded(value: unknown): value is { readonly recorded: boolean } {
  return record(value) && keys(value, 'recorded') && typeof value.recorded === 'boolean'
}
function createRequestId(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a stable controller with correlated, bounded, origin-checked browser requests.
 * @param options Host window and optional request timing overrides.
 * @returns Three fixed native operations and a browser-wait disposer.
 */
export function createDesktopComponentController(options: DesktopComponentOptions = {}): DesktopComponentController {
  const target: DesktopComponentWindow | undefined = options.target ?? (typeof window === 'undefined' ? undefined : window)
  const origin = shellOrigin(target)
  const pending = new Map<string, () => void>()
  const inFlight = new Map<string, Promise<Result>>()
  const runtimeWaits = new Set<() => void>()
  const installations = new Map<string, Promise<{ readonly restartRequired: boolean }>>()
  let generation = 0
  let listening = false
  const dispose = (): void => {
    generation++
    for (const cancel of pending.values()) cancel()
    for (const cancel of runtimeWaits) cancel()
    inFlight.clear()
    installations.clear()
    target?.removeEventListener('pagehide', dispose)
    listening = false
  }
  const alive = (owner: number): void => {
    if (owner !== generation) throw new Error('desktop-component-request-cancelled')
  }
  const bounded = <T,>(work: Promise<T>, milliseconds: number): Promise<T> => new Promise((resolve, reject) => {
    const cleanup = (): void => { if (timer !== undefined) target?.clearTimeout(timer); runtimeWaits.delete(cancel) }
    const cancel = (): void => { cleanup(); reject(new Error('desktop-component-request-cancelled')) }
    const timer = target?.setTimeout(() => { cleanup(); reject(new Error('desktop-component-runtime-timeout')) }, milliseconds)
    runtimeWaits.add(cancel)
    void work.then(value => { cleanup(); resolve(value) }, error => { cleanup(); reject(error) })
  })
  const request = (action: Action, key?: string, report?: { readonly state: ComponentRuntimeState; readonly runtimeToken: string } | { readonly runtimeToken: string; readonly succeeded: boolean }): Promise<Result> => {
    if (target === undefined || origin === undefined) return Promise.reject(new Error('desktop-shell-unavailable'))
    if (!listening) { target.addEventListener('pagehide', dispose); listening = true }
    if (key !== undefined && !COMPONENT_KEY.test(key)) return Promise.reject(new Error('desktop-component-key-invalid'))
    const operationKey = `${action}:${key ?? ''}:${report?.runtimeToken ?? ''}:${report !== undefined && 'state' in report ? report.state : ''}`
    const existing = inFlight.get(operationKey)
    if (action !== 'invocation' && existing !== undefined) return existing
    if (report !== undefined && !RUNTIME_TOKEN.test(report.runtimeToken)) return Promise.reject(new Error('desktop-component-runtime-token-invalid'))
    const requestId = options.requestId?.() ?? createRequestId()
    if (!REQUEST_ID.test(requestId) || pending.has(requestId)) return Promise.reject(new Error('desktop-component-request-id-invalid'))
    const result = new Promise<Result>((resolve, reject) => {
      const parent = target.parent
      let acknowledged = false
      let timer: number | undefined
      const cleanup = (): void => {
        if (timer !== undefined) target.clearTimeout(timer)
        target.removeEventListener('message', onMessage)
        pending.delete(requestId)
      }
      const fail = (error: string): void => { cleanup(); reject(new Error(error)) }
      const cancel = (): void => { fail('desktop-component-request-cancelled') }
      const onMessage = (event: Message): void => {
        if (event.source !== parent || event.origin !== origin) return
        const value = event.data
        if (!record(value) || value.channel !== DESKTOP_COMPONENT_CHANNEL || value.version !== DESKTOP_COMPONENT_VERSION || value.requestId !== requestId) return
        if (value.type === `${action}-accepted` && keys(value, 'channel,requestId,type,version')) {
          if (acknowledged) return
          acknowledged = true
          if (timer !== undefined) target.clearTimeout(timer)
          timer = target.setTimeout(() => { fail(`desktop-component-${action}-timeout`) }, options.completionTimeoutMs ?? (action === 'install' ? 930_000 : 15_000))
          return
        }
        if (value.type !== `${action}-response`) return
        if (value.ok === false && keys(value, 'channel,error,ok,requestId,type,version') && text(value.error)) { fail(value.error); return }
        if (value.ok !== true || !keys(value, 'channel,ok,requestId,type,value,version')) { fail('desktop-component-response-invalid'); return }
        const valid = action === 'get' ? overview(value.value) : action === 'plan' ? plan(value.value) : action === 'ready' || action === 'invocation' ? recorded(value.value) : installed(value.value)
        if (!valid) { fail('desktop-component-response-invalid'); return }
        cleanup()
        resolve(value.value as Result)
      }
      pending.set(requestId, cancel)
      target.addEventListener('message', onMessage)
      timer = target.setTimeout(() => { fail('desktop-shell-unavailable') }, options.handshakeTimeoutMs ?? 5_000)
      try {
        parent.postMessage({ channel: DESKTOP_COMPONENT_CHANNEL, version: DESKTOP_COMPONENT_VERSION, type: `${action}-request`, requestId, ...(key === undefined ? {} : { component: key }), ...report }, origin)
      }
      catch (error) { cleanup(); reject(error) }
    })
    inFlight.set(operationKey, result)
    void result.then(() => { if (inFlight.get(operationKey) === result) inFlight.delete(operationKey) }, () => { if (inFlight.get(operationKey) === result) inFlight.delete(operationKey) })
    return result
  }
  const syncRuntime = async (value: ComponentView, owner: number): Promise<{ readonly restartRequired: boolean } | undefined> => {
    if (value.runtimeToken === null || options.observeRuntime === undefined) return undefined
    try {
      const state = await bounded(options.observeRuntime(value), 2_000)
      alive(owner)
      if (state === undefined) return undefined
      return await request('report', value.key, { state, runtimeToken: value.runtimeToken }) as { readonly restartRequired: boolean }
    }
    catch (error) {
      alive(owner)
      // Inventory, observation timeout, or stale-token failures never imply activation.
      return undefined
    }
  }
  return {
    load: async () => {
      const owner = generation
      const value = await request('get') as ComponentOverview
      alive(owner)
      let reported = false
      for (const item of value.components) {
        if (await syncRuntime(item, owner) !== undefined) reported = true
        alive(owner)
      }
      return reported ? await request('get') as ComponentOverview : value
    },
    plan: async key => await request('plan', key) as InstallPlan,
    install: key => {
      const existing = installations.get(key)
      if (existing !== undefined) return existing
      const owner = generation
      const run = (async () => {
        const result = await request('install', key) as { readonly restartRequired: boolean }
        alive(owner)
        if (options.observeRuntime === undefined) return result
        try {
          const value = await request('get') as ComponentOverview
          alive(owner)
          const item = value.components.find(component => component.key === key)
          if (item === undefined || item.runtimeToken === null) return result
          const report = await syncRuntime(item, owner)
          alive(owner)
          return report ?? { restartRequired: true }
        }
        catch (error) {
          alive(owner)
          // Completed preparation remains truthful even when runtime observation fails.
          return { restartRequired: true }
        }
      })()
      installations.set(key, run)
      void run.then(() => { if (installations.get(key) === run) installations.delete(key) }, () => { if (installations.get(key) === run) installations.delete(key) })
      return run
    },
    dispose,
    reportWorkbenchReady: async () => await request('ready') as { readonly recorded: boolean },
    reportPomodoroInvocation: async (runtimeToken, succeeded) => await request('invocation', 'pomodoro', { runtimeToken, succeeded }) as { readonly recorded: boolean },
  }
}
