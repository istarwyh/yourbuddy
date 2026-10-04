import { describe, expect, it } from 'vitest'
import {
  DESKTOP_ENVIRONMENT_CHANNEL,
  DESKTOP_ENVIRONMENT_VERSION,
  readMacosPermissions,
  readShellEnvironmentSnapshot,
  requestShellEnvironmentSnapshot,
} from '../src/client/desktop-environment.ts'

class FakeParent {
  readonly messages: Array<{ message: unknown, targetOrigin: string }> = []
  postMessage(message: unknown, targetOrigin: string): void {
    this.messages.push({ message, targetOrigin })
  }
}

class FakeWindow {
  readonly parent = new FakeParent()
  readonly listeners = new Set<(event: { data: unknown, source: unknown }) => void>()
  addEventListener(type: string, listener: (event: { data: unknown, source: unknown }) => void): void {
    if (type === 'message') this.listeners.add(listener)
  }
  removeEventListener(type: string, listener: (event: { data: unknown, source: unknown }) => void): void {
    if (type === 'message') this.listeners.delete(listener)
  }
  setTimeout(handler: () => void, milliseconds: number): ReturnType<typeof setTimeout> {
    return setTimeout(handler, milliseconds)
  }
  clearTimeout(timeout: ReturnType<typeof setTimeout>): void { clearTimeout(timeout) }
  emit(data: unknown): void {
    for (const listener of this.listeners) listener({ data, source: this.parent })
  }
}

const snapshot = {
  settings: { mode: 'inherit', shellPath: null },
  status: {
    state: 'ready',
    source: 'loginShell',
    shellPath: '/bin/zsh',
    durationMs: 120,
    variableCount: 42,
    pathEntryCount: 8,
    errorCode: '',
  },
  restartRequired: false,
  overriddenNames: ['DSH_HOME', 'PATH'],
  tools: [
    { name: 'git', available: true },
    { name: 'python3', available: true },
    { name: 'ffmpeg', available: true },
    { name: 'ffprobe', available: true },
  ],
}

const permissions = [
  { id: 'accessibility', status: 'unknown', owner: 'yourBuddy', canRequest: true, canOpenSettings: true },
  { id: 'microphone', status: 'notDetermined', owner: 'yourBuddy', canRequest: true, canOpenSettings: true },
  { id: 'screenRecording', status: 'notApplicable', owner: 'externalFfmpeg', canRequest: false, canOpenSettings: true },
  { id: 'fullDiskAccess', status: 'unknown', owner: 'macOS', canRequest: false, canOpenSettings: true },
  { id: 'notifications', status: 'denied', owner: 'yourBuddy', canRequest: true, canOpenSettings: true },
]

describe('desktop environment browser bridge', () => {
  it('accepts redacted environment and permission snapshots only', () => {
    expect(readShellEnvironmentSnapshot(snapshot)).toEqual(snapshot)
    expect(readShellEnvironmentSnapshot({ ...snapshot, values: { TOKEN: 'secret' } })).toBeUndefined()
    expect(readMacosPermissions(permissions)).toEqual(permissions)
    expect(readMacosPermissions(permissions.map((item, index) => index === 0
      ? { ...item, status: 'prompted' }
      : item))).toBeUndefined()
  })

  it('rejects a request that stalls after shell acceptance', async () => {
    const target = new FakeWindow()
    const result = requestShellEnvironmentSnapshot({
      target: target as never,
      requestId: 'environment_timeout',
      handshakeTimeoutMs: 1_000,
      completionTimeoutMs: 5,
    })
    target.emit({
      channel: DESKTOP_ENVIRONMENT_CHANNEL,
      version: DESKTOP_ENVIRONMENT_VERSION,
      type: 'get-accepted',
      requestId: 'environment_timeout',
    })
    await expect(result).rejects.toThrow('desktop-environment-get-timeout')
  })

  it('loads one correlated shell environment snapshot', async () => {
    const target = new FakeWindow()
    const result = requestShellEnvironmentSnapshot({
      target: target as never,
      requestId: 'environment_1',
      handshakeTimeoutMs: 1_000,
    })
    expect(target.parent.messages[0]).toEqual({
      message: {
        channel: DESKTOP_ENVIRONMENT_CHANNEL,
        version: DESKTOP_ENVIRONMENT_VERSION,
        type: 'get-request',
        requestId: 'environment_1',
      },
      targetOrigin: '*',
    })
    target.emit({
      channel: DESKTOP_ENVIRONMENT_CHANNEL,
      version: DESKTOP_ENVIRONMENT_VERSION,
      type: 'get-accepted',
      requestId: 'environment_1',
    })
    target.emit({
      channel: DESKTOP_ENVIRONMENT_CHANNEL,
      version: DESKTOP_ENVIRONMENT_VERSION,
      type: 'get-response',
      requestId: 'environment_1',
      ok: true,
      value: snapshot,
    })
    await expect(result).resolves.toEqual(snapshot)
  })
})
