// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DESKTOP_WINDOW_CONTROLS_CHANNEL,
  DESKTOP_WINDOW_CONTROLS_VERSION,
  readDesktopWindowControlsLayout,
} from '../src/client/desktop-window-controls.ts'
import { WindowControls } from '../src/client/WindowControls.tsx'
import { installDesktopWindowControls } from '../src/client/index.tsx'
import { PERSONAL_WORKBENCH_CSS } from '../src/client/styles.ts'

class FakeParent {
  readonly messages: Array<{ message: unknown, targetOrigin: string }> = []

  postMessage(message: unknown, targetOrigin: string): void {
    this.messages.push({ message, targetOrigin })
  }
}

class FakeWindow {
  readonly parent = new FakeParent()
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>()

  addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void): void {
    if (type === 'message') this.listeners.add(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent<unknown>) => void): void {
    if (type === 'message') this.listeners.delete(listener)
  }

  emit(data: unknown, source: unknown = this.parent): void {
    for (const listener of this.listeners) listener({ data, source } as MessageEvent<unknown>)
  }
}

function layout() {
  return {
    channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
    version: DESKTOP_WINDOW_CONTROLS_VERSION,
    type: 'layout-response',
    os: 'macos',
    controls: ['close', 'minimize', 'maximize'],
    labels: { close: '关闭', minimize: '最小化', maximize: '最大化' },
  }
}

afterEach(cleanup)

describe('desktop window controls', () => {
  it('accepts only the fixed layout fields and controls', () => {
    expect(readDesktopWindowControlsLayout(layout())).toMatchObject({
      os: 'macos', controls: ['close', 'minimize', 'maximize'],
    })
    expect(readDesktopWindowControlsLayout({ ...layout(), command: 'restart_app' })).toBeUndefined()
    expect(readDesktopWindowControlsLayout({
      ...layout(), controls: ['close', 'close'],
    })).toBeUndefined()
  })

  it('mounts horizontal macOS controls and delegates only fixed actions', () => {
    const target = new FakeWindow()
    const view = render(<WindowControls target={target as unknown as Window} />)
    expect(target.parent.messages).toEqual([{
      message: {
        channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
        version: DESKTOP_WINDOW_CONTROLS_VERSION,
        type: 'mount-request',
      },
      targetOrigin: '*',
    }])

    act(() => { target.emit(layout()) })
    expect(screen.getByRole('button', { name: '关闭' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '最小化' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '最大化' })).toBeTruthy()
    expect(document.querySelector('.dpw-window-controls')?.getAttribute('data-platform')).toBe('macos')
    expect(target.parent.messages[1]?.message).toMatchObject({ type: 'ready' })

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(target.parent.messages[2]?.message).toEqual({
      channel: DESKTOP_WINDOW_CONTROLS_CHANNEL,
      version: DESKTOP_WINDOW_CONTROLS_VERSION,
      type: 'action-request',
      action: 'close',
    })

    view.unmount()
    expect(target.parent.messages[3]?.message).toMatchObject({ type: 'unmount' })
    expect(target.listeners.size).toBe(0)
  })

  it('uses compact dot spacing without a separator', () => {
    expect(PERSONAL_WORKBENCH_CSS).toContain('.dpw-window-controls[data-platform=macos]{gap:2px')
    expect(PERSONAL_WORKBENCH_CSS).not.toMatch(/dpw-window-controls[^}]*border-(?:left|right)/u)
  })

  it('registers one additive header action and removes it with its owner', async () => {
    const ctx = new Context()
    const registryFiber = ctx.plugin(SlotRegistry)
    await registryFiber.await()
    const slots = ctx.get('slots') as SlotRegistry
    const disposeRoot = slots.register({
      name: 'root',
      children: { sidebar: { kind: 'single', scope: 'root' } },
    } as never, () => null)
    const disposeSidebar = slots.register({
      name: 'sidebar',
      children: { 'sidebar.header.action': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    const fiber = ctx.plugin({
      inject: ['slots'],
      apply(clientCtx) { installDesktopWindowControls(clientCtx) },
    })
    try {
      await fiber.await()
      expect(slots.entries('sidebar.header.action').map(entry => entry.options)).toMatchObject([{
        id: 'yourbuddy-window-controls', order: 10,
      }])
      await fiber.dispose()
      expect(slots.entries('sidebar.header.action')).toHaveLength(0)
    } finally {
      await fiber.dispose()
      disposeSidebar()
      disposeRoot()
      await registryFiber.dispose()
    }
  })
})
