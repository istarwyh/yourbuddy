// @vitest-environment jsdom

import { createElement } from 'react'
import { render } from '@testing-library/react'
import type { Context } from '@deepseek-ai/cordis'
import { MutableSessionEventSource } from '@deepseek-ai/dsh-api-session-controller/client'
import { SessionSeq, type SessionId } from '@deepseek-ai/dsh-session/types'
import { describe, expect, it, vi } from 'vitest'
import {
  observeSessionAttention,
  ProductWorkbenchController,
  ProductWorkbenchHost,
} from '../src/client/workbench.tsx'
import { PERSONAL_WORKBENCH_CSS } from '../src/client/styles.ts'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

class Observable<T> {
  private readonly listeners = new Set<() => void>()

  constructor(private value: T) {}

  getSnapshot = (): T => this.value

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  publish(value: T): void {
    this.value = value
    for (const listener of [...this.listeners]) listener()
  }
}

describe('ProductWorkbenchController', () => {
  it('starts in core mode and migrates the legacy positive Session width once', () => {
    const storage = new MemoryStorage()
    storage.setItem('dsh-sidebar:v1:width', '612')
    const controller = new ProductWorkbenchController(storage)

    expect(controller.getSnapshot()).toEqual({
      mode: 'core', contentId: null, sessionExpanded: true, sessionWidth: 612,
    })
    expect(JSON.parse(storage.getItem('yourbuddy.workbench:v1') ?? '')).toEqual({
      version: 1, sessionExpanded: true, sessionWidth: 612,
    })
  })

  it('keeps middle mode independent from persisted Session geometry', () => {
    const storage = new MemoryStorage()
    const controller = new ProductWorkbenchController(storage)
    const changed = vi.fn()
    controller.subscribe(changed)

    controller.showContent('episode-a')
    controller.handleBetterSidebarOpen('background')
    expect(controller.getSnapshot()).toMatchObject({ mode: 'content', contentId: 'episode-a' })

    controller.setSessionExpanded(false)
    controller.setSessionWidth(700)
    controller.handleBetterSidebarOpen('user')
    expect(controller.getSnapshot()).toEqual({
      mode: 'core', contentId: 'episode-a', sessionExpanded: false, sessionWidth: 700,
    })
    expect(JSON.parse(storage.getItem('yourbuddy.workbench:v1') ?? '')).toEqual({
      version: 1, sessionExpanded: false, sessionWidth: 700,
    })
    expect(changed).toHaveBeenCalledTimes(4)
  })
})

describe('ProductWorkbenchHost', () => {
  it('keeps a Session collapse control outside the Session region', () => {
    const controller = new ProductWorkbenchController(undefined)
    const collapseSession = vi.fn()
    const view = render(createElement(ProductWorkbenchHost, {
      renderSlot: (name: string) => createElement('span', { 'data-child': name }, name),
      useProductWorkbench: (selector: (value: ReturnType<typeof controller.getSnapshot>) => unknown) => selector(controller.getSnapshot()),
      collapseSession,
      restoreSession: vi.fn(),
      t: (key: string) => key,
    } as never))

    const collapse = view.getByRole('button', { name: 'workbench.session.collapse' })
    expect(collapse.getAttribute('aria-controls')).toBe('dsh-session-region')
    expect(collapse.getAttribute('aria-expanded')).toBe('true')
    collapse.click()
    expect(collapseSession).toHaveBeenCalledOnce()
    view.unmount()
  })

  it('keeps both product surfaces mounted while hiding and inerting the inactive surface', () => {
    const controller = new ProductWorkbenchController(undefined)
    controller.showContent('episode-a')
    controller.setSessionExpanded(false)
    const view = render(createElement(ProductWorkbenchHost, {
      renderSlot: (name: string) => createElement('span', { 'data-child': name }, name),
      useProductWorkbench: (selector: (value: ReturnType<typeof controller.getSnapshot>) => unknown) => selector(controller.getSnapshot()),
      collapseSession: vi.fn(),
      restoreSession: vi.fn(),
      t: (key: string) => key,
    } as never))
    const markup = view.container.innerHTML

    expect(markup).toContain('data-child="workbench.core"')
    expect(markup).toContain('data-child="workbench.content"')
    expect(markup).toContain('data-workbench-surface="core" hidden="" inert=""')
    expect(markup).toContain('data-workbench-surface="content"')
    const restore = view.getByRole('button', { name: 'workbench.session.restore' })
    expect(restore.getAttribute('aria-controls')).toBe('dsh-session-region')
    expect(restore.getAttribute('aria-expanded')).toBe('false')
    expect(PERSONAL_WORKBENCH_CSS).toContain('.dpw-workbench-surface:not([hidden]){pointer-events:auto}')
    view.unmount()
  })
})

describe('observeSessionAttention', () => {
  it('expands only for a new current-Session interaction or appended turn completion', () => {
    const current = 'current' as SessionId
    const list = new Observable({ current })
    const pending = new Observable(new Map())
    const currentEvents = new MutableSessionEventSource()
    const otherEvents = new MutableSessionEventSource()
    const controller = new ProductWorkbenchController(undefined)
    controller.setSessionExpanded(false)
    const ctx = {
      sessions: {
        list,
        binding: (id: SessionId) => ({
          eventSource: id === current ? currentEvents : otherEvents,
        }),
      },
      uiSession: { pendingInteractions: pending },
    } as unknown as Context
    const dispose = observeSessionAttention(ctx, controller)

    currentEvents.append({
      type: 'event',
      event: { type: 'tool/call', seq: SessionSeq(1), time: 1, data: {} } as never,
    })
    otherEvents.append({
      type: 'event',
      event: { type: 'turn/end', seq: SessionSeq(2), time: 2, data: {} } as never,
    })
    expect(controller.getSnapshot().sessionExpanded).toBe(false)

    pending.publish(new Map([[current, { key: 'question:1', kind: 'question', sessionId: current }]]))
    expect(controller.getSnapshot().sessionExpanded).toBe(true)

    controller.setSessionExpanded(false)
    pending.publish(new Map([[current, { key: 'question:1', kind: 'question', sessionId: current }]]))
    expect(controller.getSnapshot().sessionExpanded).toBe(false)

    currentEvents.replace([{
      type: 'event',
      event: { type: 'turn/end', seq: SessionSeq(3), time: 3, data: {} } as never,
    }], false)
    expect(controller.getSnapshot().sessionExpanded).toBe(false)

    currentEvents.append({
      type: 'event',
      event: { type: 'turn/end', seq: SessionSeq(4), time: 4, data: {} } as never,
    })
    expect(controller.getSnapshot().sessionExpanded).toBe(true)

    controller.showContent('episode-a')
    controller.setSessionExpanded(false)
    list.publish({ current: 'other' as SessionId })
    expect(controller.getSnapshot()).toMatchObject({ mode: 'core', sessionExpanded: true })
    dispose()
  })
})
