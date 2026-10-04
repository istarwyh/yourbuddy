// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EnvironmentPermissionsRow,
  type EnvironmentPermissionsRowProps,
} from '../src/client/EnvironmentPermissionsRow.tsx'
import { en } from '../src/client/locales.ts'

const mocks = vi.hoisted(() => ({
  openSettings: vi.fn(),
  requestEnvironment: vi.fn(),
  requestPermission: vi.fn(),
  requestPermissions: vi.fn(),
}))

vi.mock('../src/client/desktop-environment.ts', async () => {
  const actual = await vi.importActual<typeof import('../src/client/desktop-environment.ts')>(
    '../src/client/desktop-environment.ts',
  )
  return {
    ...actual,
    isDesktopEnvironmentAvailable: () => true,
    openMacosPermissionSettings: mocks.openSettings,
    requestMacosPermission: mocks.requestPermission,
    requestMacosPermissions: mocks.requestPermissions,
    requestShellEnvironmentSnapshot: mocks.requestEnvironment,
  }
})

const environment = {
  settings: { mode: 'inherit' as const, shellPath: null },
  status: {
    state: 'ready' as const,
    source: 'loginShell' as const,
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
  { id: 'accessibility' as const, status: 'unknown' as const, owner: 'yourBuddy' as const, canRequest: true, canOpenSettings: true },
  { id: 'microphone' as const, status: 'notDetermined' as const, owner: 'yourBuddy' as const, canRequest: true, canOpenSettings: true },
  { id: 'screenRecording' as const, status: 'notApplicable' as const, owner: 'externalFfmpeg' as const, canRequest: false, canOpenSettings: true },
  { id: 'fullDiskAccess' as const, status: 'unknown' as const, owner: 'macOS' as const, canRequest: false, canOpenSettings: true },
  { id: 'notifications' as const, status: 'denied' as const, owner: 'yourBuddy' as const, canRequest: false, canOpenSettings: true },
]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requestEnvironment.mockResolvedValue(environment)
  mocks.requestPermissions.mockResolvedValue(permissions)
})

afterEach(cleanup)

describe('environment and permissions settings card', () => {
  it('reads status on mount without requesting a permission', async () => {
    render(<EnvironmentPermissionsRow {...{
      t: (key: keyof typeof en) => en[key],
    } as EnvironmentPermissionsRowProps} />)

    await waitFor(() => expect(mocks.requestEnvironment).toHaveBeenCalledOnce())
    expect(screen.getByRole('status').textContent).toContain('Inherited 42 environment variables through /bin/zsh.')
    expect(mocks.requestPermissions).toHaveBeenCalledOnce()
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    expect(mocks.openSettings).not.toHaveBeenCalled()
  })
})
