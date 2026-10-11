import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDesktopComponentController, DESKTOP_COMPONENT_CHANNEL, isDesktopComponentsAvailable, type DesktopComponentWindow } from '../src/client/desktop-components.ts'
import type { ComponentOverview } from '../src/client/component-model.ts'

type Message = { data: unknown; origin: string; source: object | null }
class FakeWindow implements DesktopComponentWindow {
  readonly messages: Array<{ message: Record<string, unknown>; origin: string }> = []
  readonly parent = { postMessage: (message: unknown, origin: string): void => { this.messages.push({ message: message as Record<string, unknown>, origin }) } }
  readonly document = { referrer: 'http://127.0.0.1:45678/' }
  readonly location = { origin: 'http://127.0.0.1:19387' }
  readonly listeners = new Set<(event: Message) => void>()
  readonly pages = new Set<() => void>()
  postMessage(): void {}
  addEventListener(type: 'message', listener: (event: Message) => void): void
  addEventListener(type: 'pagehide', listener: () => void): void
  addEventListener(type: string, listener: ((event: Message) => void) | (() => void)): void {
    if (type === 'message') this.listeners.add(listener as (event: Message) => void)
    else this.pages.add(listener as () => void)
  }
  removeEventListener(type: 'message', listener: (event: Message) => void): void
  removeEventListener(type: 'pagehide', listener: () => void): void
  removeEventListener(type: string, listener: ((event: Message) => void) | (() => void)): void {
    if (type === 'message') this.listeners.delete(listener as (event: Message) => void)
    else this.pages.delete(listener as () => void)
  }
  setTimeout(handler: () => void, milliseconds: number): number { return Number(setTimeout(handler, milliseconds)) }
  clearTimeout(timer: number): void { clearTimeout(timer) }
  emit(data: unknown, origin = 'http://127.0.0.1:45678', source: object | null = this.parent): void {
    for (const listener of this.listeners) listener({ data, origin, source })
  }
  reply(action: string, value: unknown, index = this.messages.length - 1): void {
    this.emit({ channel: DESKTOP_COMPONENT_CHANNEL, version: 1, type: `${action}-response`, requestId: this.messages[index]?.message.requestId, ok: true, value })
  }
  accepted(action: string): void {
    this.emit({ channel: DESKTOP_COMPONENT_CHANNEL, version: 1, type: `${action}-accepted`, requestId: this.messages.at(-1)?.message.requestId })
  }
}
const snapshot: ComponentOverview = { appVersion: '0.4.9', components: [{ key: 'pomodoro', kind: 'optional', version: '0.5.5', purpose: 'Focus timer', archiveBytes: 42, installedBytes: null, state: 'prepared', policy: 'manual', canInstall: true, canChangePolicy: false, canClean: false, error: null, runtimeToken: null }], metrics: null, metricsError: null }
const tick = async (): Promise<void> => { for (let index = 0; index < 8; index++) await Promise.resolve() }
afterEach(() => { vi.useRealTimers() })

describe('desktop component browser requests', () => {
  it('uses the exact loopback parent and refuses standalone or unrelated embeds', async () => {
    const target = new FakeWindow()
    expect(isDesktopComponentsAvailable(target)).toBe(true)
    for (const referrer of ['', 'https://example.com/', 'http://127.0.0.1:19387/', 'http://user@127.0.0.1:45678/']) {
      target.document.referrer = referrer
      expect(isDesktopComponentsAvailable(target)).toBe(false)
      const controller = createDesktopComponentController({ target })
      await expect(controller.load()).rejects.toThrow('desktop-shell-unavailable')
    }
    expect(target.messages).toEqual([])
  })

  it('correlates exact responses and ignores wrong origins, windows, methods, versions and IDs', async () => {
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target, requestId: () => 'read_1' })
    const result = controller.load()
    expect(target.messages[0]).toEqual({ origin: 'http://127.0.0.1:45678', message: { channel: DESKTOP_COMPONENT_CHANNEL, version: 1, type: 'get-request', requestId: 'read_1' } })
    const response = { channel: DESKTOP_COMPONENT_CHANNEL, version: 1, type: 'get-response', requestId: 'read_1', ok: true, value: snapshot }
    target.emit(response, 'http://127.0.0.1:45679')
    target.emit(response, 'http://127.0.0.1:45678', {})
    for (const fields of [{ type: 'install-response' }, { version: 2 }, { requestId: 'forged' }, { channel: 'other' }]) target.emit({ ...response, ...fields })
    expect(target.listeners.size).toBe(1)
    target.emit(response)
    await expect(result).resolves.toEqual(snapshot)
    expect(target.listeners.size).toBe(0)
    controller.dispose()
    expect(target.pages.size).toBe(0)
  })

  it('rejects malformed or unsafe native DTOs without inventing active state', async () => {
    for (const invalid of [{ ...snapshot, unknown: true }, { ...snapshot, components: [{ ...snapshot.components[0], archiveBytes: Number.MAX_SAFE_INTEGER + 1 }] }, { ...snapshot, components: [{ ...snapshot.components[0], runtimeToken: 'path/to/token' }] }, { ...snapshot, metrics: {} }]) {
      const target = new FakeWindow()
      const controller = createDesktopComponentController({ target })
      const result = controller.load()
      target.reply('get', invalid)
      await expect(result).rejects.toThrow('desktop-component-response-invalid')
      controller.dispose()
    }
  })

  it('bounds both handshake and acknowledged completion without extending duplicate acceptance', async () => {
    vi.useFakeTimers()
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target, handshakeTimeoutMs: 10, completionTimeoutMs: 20 })
    const missing = expect(controller.load()).rejects.toThrow('desktop-shell-unavailable')
    await vi.advanceTimersByTimeAsync(10)
    await missing
    const stalled = expect(controller.plan('pomodoro')).rejects.toThrow('desktop-component-plan-timeout')
    target.accepted('plan')
    await vi.advanceTimersByTimeAsync(15)
    target.accepted('plan')
    await vi.advanceTimersByTimeAsync(5)
    await stalled
    expect(target.listeners.size).toBe(0)
    controller.dispose()
  })

  it('deduplicates preparation and sends only catalog keys, never paths or commands', async () => {
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target })
    await expect(controller.install('../pomodoro')).rejects.toThrow('desktop-component-key-invalid')
    const first = controller.install('pomodoro')
    const second = controller.install('pomodoro')
    expect(first).toBe(second)
    expect(target.messages).toHaveLength(1)
    expect(target.messages[0]?.message).toMatchObject({ type: 'install-request', component: 'pomodoro' })
    target.reply('install', { restartRequired: true })
    await expect(first).resolves.toEqual({ restartRequired: true })
    controller.dispose()
  })

  it('parses dependency-first plans and refuses malformed plan and installation responses', async () => {
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target })
    const plan = { components: [{ component: 'pomodoro', id: 'pomodoro-verified-id', action: 'prepare', archiveBytes: 42 }], prepareArchiveBytes: 42 }
    const result = controller.plan('pomodoro')
    target.reply('plan', plan)
    await expect(result).resolves.toEqual(plan)
    const malformed = controller.plan('pomodoro')
    target.reply('plan', { ...plan, components: [{ ...plan.components[0], action: 'execute' }] })
    await expect(malformed).rejects.toThrow('response-invalid')
    const installed = controller.install('pomodoro')
    target.reply('install', { restartRequired: 'false' })
    await expect(installed).rejects.toThrow('response-invalid')
    controller.dispose()
  })

  it('matches schema-2 catalog keys including dots but excluding leading punctuation', async () => {
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target })
    for (const invalid of ['.plugin', '_plugin', '-plugin', 'plugin/path']) await expect(controller.plan(invalid)).rejects.toThrow('component-key-invalid')
    const read = controller.load()
    target.reply('get', { ...snapshot, components: snapshot.components.map(item => ({ ...item, key: 'plugin.v2' })) })
    await expect(read).resolves.toMatchObject({ components: [{ key: 'plugin.v2' }] })
    const result = controller.plan('plugin.v2')
    target.reply('plan', { components: [{ component: 'plugin.v2', id: 'exact-id', action: 'prepare', archiveBytes: 42 }], prepareArchiveBytes: 42 })
    await expect(result).resolves.toMatchObject({ components: [{ component: 'plugin.v2' }] })
    controller.dispose()
  })

  it('uses payload-free ready and exact independent invocation reports with boolean receipts', async () => {
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target })
    const ready = controller.reportWorkbenchReady()
    expect(Object.keys(target.messages[0]!.message).sort()).toEqual(['channel', 'requestId', 'type', 'version'])
    target.reply('ready', { recorded: true })
    await expect(ready).resolves.toEqual({ recorded: true })
    const first = controller.reportPomodoroInvocation('eligible_token', true)
    const second = controller.reportPomodoroInvocation('eligible_token', true)
    expect(target.messages).toHaveLength(3)
    expect(target.messages[1]?.message).toMatchObject({ type: 'invocation-request', component: 'pomodoro', runtimeToken: 'eligible_token', succeeded: true })
    expect(Object.keys(target.messages[1]!.message).sort()).toEqual(['channel', 'component', 'requestId', 'runtimeToken', 'succeeded', 'type', 'version'])
    target.reply('invocation', { recorded: true }, 1)
    target.reply('invocation', { recorded: false }, 2)
    await expect(first).resolves.toEqual({ recorded: true })
    await expect(second).resolves.toEqual({ recorded: false })
    const invalid = controller.reportPomodoroInvocation('eligible_token', false)
    target.reply('invocation', { recorded: 'true' })
    await expect(invalid).rejects.toThrow('response-invalid')
    await expect(controller.reportPomodoroInvocation('path/token', true)).rejects.toThrow('runtime-token-invalid')
    controller.dispose()
  })

  it('waits beyond the native 15-minute install deadline before timing out the browser wait', async () => {
    vi.useFakeTimers()
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target })
    let settled = false
    const result = controller.install('pomodoro')
    void result.then(() => { settled = true }, () => { settled = true })
    const failure = expect(result).rejects.toThrow('install-timeout')
    target.accepted('install')
    await vi.advanceTimersByTimeAsync(900_000)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(30_000)
    await failure
    controller.dispose()
  })

  it('cancels listeners on page navigation or unmount and allows StrictMode reuse', async () => {
    const target = new FakeWindow()
    const controller = createDesktopComponentController({ target })
    const old = expect(controller.load()).rejects.toThrow('request-cancelled')
    for (const page of target.pages) page()
    await old
    expect(target.listeners.size).toBe(0)
    expect(target.pages.size).toBe(0)
    const retry = controller.load()
    target.reply('get', snapshot)
    await expect(retry).resolves.toEqual(snapshot)
    const pending = expect(controller.plan('pomodoro')).rejects.toThrow('request-cancelled')
    controller.dispose()
    await pending
    expect(target.listeners.size).toBe(0)
  })

  it('reports only an eligible actual Host observation with the native runtime token', async () => {
    const target = new FakeWindow()
    const observeRuntime = vi.fn().mockResolvedValue('active')
    const controller = createDesktopComponentController({ target, observeRuntime })
    const result = controller.install('pomodoro')
    target.reply('install', { restartRequired: true })
    await tick()
    target.reply('get', { ...snapshot, components: snapshot.components.map(item => ({ ...item, runtimeToken: 'host_epoch_install_1' })) })
    await tick()
    expect(target.messages.at(-1)?.message).toMatchObject({ type: 'report-request', component: 'pomodoro', state: 'active', runtimeToken: 'host_epoch_install_1' })
    target.reply('report', { restartRequired: false })
    await expect(result).resolves.toEqual({ restartRequired: false })
    expect(observeRuntime).toHaveBeenCalledOnce()
    controller.dispose()
  })

  it('does not report package presence without an eligible token', async () => {
    const target = new FakeWindow()
    const observeRuntime = vi.fn().mockResolvedValue('active')
    const controller = createDesktopComponentController({ target, observeRuntime })
    const result = controller.install('pomodoro')
    target.reply('install', { restartRequired: true })
    await tick()
    target.reply('get', snapshot)
    await expect(result).resolves.toEqual({ restartRequired: true })
    expect(observeRuntime).not.toHaveBeenCalled()
    expect(target.messages.some(item => item.message.type === 'report-request')).toBe(false)
    controller.dispose()
  })

  it('ignores a pending runtime observation after pagehide and does not report its token', async () => {
    const target = new FakeWindow()
    let finish!: (value: 'active') => void
    const controller = createDesktopComponentController({ target, observeRuntime: () => new Promise(resolve => { finish = resolve }) })
    const result = expect(controller.load()).rejects.toThrow('request-cancelled')
    target.reply('get', { ...snapshot, components: snapshot.components.map(item => ({ ...item, runtimeToken: 'old_generation' })) })
    await tick()
    for (const page of target.pages) page()
    await result
    finish('active')
    await tick()
    expect(target.messages).toHaveLength(1)
    expect(target.listeners.size).toBe(0)
    expect(target.pages.size).toBe(0)
  })

  it('keeps restart required on observation timeout and never reports after navigation', async () => {
    vi.useFakeTimers()
    const target = new FakeWindow()
    let finishObservation!: (value: 'active') => void
    const controller = createDesktopComponentController({ target, observeRuntime: () => new Promise(resolve => { finishObservation = resolve }) })
    const result = controller.install('pomodoro')
    target.reply('install', { restartRequired: true })
    await tick()
    target.reply('get', { ...snapshot, components: snapshot.components.map(item => ({ ...item, runtimeToken: 'epoch' })) })
    await tick()
    await vi.advanceTimersByTimeAsync(2_000)
    await expect(result).resolves.toEqual({ restartRequired: true })
    controller.dispose()
    finishObservation('active')
    await tick()
    expect(target.messages.some(item => item.message.type === 'report-request')).toBe(false)
  })
})
