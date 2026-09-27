import { describe, expect, it } from 'vitest'
import {
  DESKTOP_DIRECTORY_PICKER_CHANNEL,
  DESKTOP_DIRECTORY_PICKER_VERSION,
  readDesktopDirectoryPickerResponse,
  requestDesktopDirectory,
} from '../src/client/desktop-directory-picker.ts'

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

  setTimeout(handler: () => void, milliseconds: number): ReturnType<typeof setTimeout> {
    return setTimeout(handler, milliseconds)
  }

  clearTimeout(timeout: ReturnType<typeof setTimeout>): void {
    clearTimeout(timeout)
  }

  emit(data: unknown, source: unknown = this.parent): void {
    for (const listener of this.listeners) listener({ data, source } as MessageEvent<unknown>)
  }
}

function accepted(requestId: string) {
  return {
    channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
    version: DESKTOP_DIRECTORY_PICKER_VERSION,
    type: 'pick-accepted',
    requestId,
  }
}

function result(requestId: string, value: string | null) {
  return {
    channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
    version: DESKTOP_DIRECTORY_PICKER_VERSION,
    type: 'pick-response',
    requestId,
    ok: true,
    value,
  }
}

describe('desktop directory-picker browser bridge', () => {
  it('accepts only exact correlated responses', () => {
    expect(readDesktopDirectoryPickerResponse(accepted('request_1'), 'request_1'))
      .toMatchObject({ type: 'pick-accepted' })
    expect(readDesktopDirectoryPickerResponse(result('request_1', '/workspace'), 'request_1'))
      .toMatchObject({ value: '/workspace' })
    expect(readDesktopDirectoryPickerResponse(result('request_2', null), 'request_1'))
      .toBeUndefined()
    expect(readDesktopDirectoryPickerResponse({ ...result('request_1', '/workspace'), command: 'open' }, 'request_1'))
      .toBeUndefined()
  })

  it('waits without a selection deadline after the shell accepts the request', async () => {
    const target = new FakeWindow()
    const picked = requestDesktopDirectory({
      target,
      requestId: 'request_1',
      acceptTimeoutMs: 5,
    })
    expect(target.parent.messages).toEqual([{
      message: {
        channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
        version: DESKTOP_DIRECTORY_PICKER_VERSION,
        type: 'pick-request',
        requestId: 'request_1',
      },
      targetOrigin: '*',
    }])
    target.emit(accepted('request_1'))
    await new Promise(resolve => setTimeout(resolve, 10))
    target.emit(result('request_1', '/workspace'))
    await expect(picked).resolves.toBe('/workspace')
    expect(target.listeners.size).toBe(0)
  })

  it('returns cancellation and rejects native or unavailable-shell failures', async () => {
    const cancelledTarget = new FakeWindow()
    const cancelled = requestDesktopDirectory({
      target: cancelledTarget,
      requestId: 'request_1',
      acceptTimeoutMs: 1_000,
    })
    cancelledTarget.emit(result('request_1', null))
    await expect(cancelled).resolves.toBeNull()

    const failedTarget = new FakeWindow()
    const failed = requestDesktopDirectory({
      target: failedTarget,
      requestId: 'request_2',
      acceptTimeoutMs: 1_000,
    })
    failedTarget.emit({
      channel: DESKTOP_DIRECTORY_PICKER_CHANNEL,
      version: DESKTOP_DIRECTORY_PICKER_VERSION,
      type: 'pick-response',
      requestId: 'request_2',
      ok: false,
      error: 'dialog failed',
    })
    await expect(failed).rejects.toThrow('dialog failed')

    const timeoutTarget = new FakeWindow()
    await expect(requestDesktopDirectory({
      target: timeoutTarget,
      requestId: 'request_3',
      acceptTimeoutMs: 1,
    })).rejects.toThrow('desktop-shell-unavailable')
  })
})
