// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkProxyRow, type NetworkProxyRowProps } from '../src/client/NetworkProxyRow.tsx'
import { en } from '../src/client/locales.ts'

const mocks = vi.hoisted(() => ({
  requestSave: vi.fn(),
  requestSnapshot: vi.fn(),
  requestTest: vi.fn(),
  requestHostTest: vi.fn(),
  requestRestart: vi.fn(),
}))

vi.mock('../src/client/desktop-network-proxy.ts', async () => {
  const actual = await vi.importActual<typeof import('../src/client/desktop-network-proxy.ts')>(
    '../src/client/desktop-network-proxy.ts',
  )
  return {
    ...actual,
    isDesktopNetworkProxyAvailable: () => true,
    requestDesktopCaCertificateSelection: vi.fn(),
    requestDesktopNetworkProxySave: mocks.requestSave,
    requestDesktopNetworkProxySnapshot: mocks.requestSnapshot,
    requestDesktopNetworkProxyTest: mocks.requestTest,
  }
})

vi.mock('../src/client/host-network-proxy.ts', () => ({
  requestHostNetworkProxyTest: mocks.requestHostTest,
}))

vi.mock('../src/client/desktop-lifecycle.ts', () => ({
  requestDesktopRestart: mocks.requestRestart,
}))

const settings = {
  mode: 'custom' as const,
  httpProxy: 'http://127.0.0.1:7890',
  httpsProxy: 'http://127.0.0.1:7890',
  noProxy: '*.local',
  caCertificatePath: '',
}

const snapshot = {
  settings,
  system: {
    supported: true,
    configured: true,
    httpProxy: 'http://127.0.0.1:7890',
    httpsProxy: 'http://127.0.0.1:7890',
    noProxy: 'localhost,127.0.0.1,::1,*.local',
    autoConfigUrl: '',
    error: '',
  },
  effective: {
    ...settings,
    noProxy: 'localhost,127.0.0.1,::1,*.local',
    caSource: 'environment' as const,
  },
  effectiveError: '',
}

const nativeResult = {
  ok: true,
  status: 200,
  proxied: true,
  errorCode: '',
  proxyMode: 'custom' as const,
  caSource: 'environment' as const,
}

const nodeResult = { ...nativeResult, status: 403 }
const hostResult = {
  ok: true,
  status: 200,
  proxied: false,
  errorCode: '',
  proxyMode: 'direct' as const,
  caSource: 'system' as const,
}

function mount() {
  return render(<NetworkProxyRow {...{
    t: (key: keyof typeof en) => en[key],
  } as NetworkProxyRowProps} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requestSnapshot.mockResolvedValue(snapshot)
  mocks.requestTest.mockResolvedValue({ native: nativeResult, node: nodeResult })
  mocks.requestHostTest.mockResolvedValue(hostResult)
  mocks.requestRestart.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe('network proxy settings card', () => {
  it('shows native draft, fresh managed Node, active Host, and inherited CA separately', async () => {
    mount()
    expect(await screen.findByText('Using the validated NODE_EXTRA_CA_CERTS from the launch environment')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Test ChatGPT connection' }))
    expect(await screen.findByText(/Desktop draft: HTTP 200.*bundled Node draft: HTTP 403.*current Node Host: HTTP 200/u)).toBeTruthy()
    expect(screen.getByText(/still reflects the previous launch/u)).toBeTruthy()
  })

  it('does not restart when either save preflight fails', async () => {
    mocks.requestSave.mockResolvedValue({
      saved: false,
      preflight: {
        native: nativeResult,
        node: {
          ...nodeResult,
          ok: false,
          status: 0,
          errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        },
      },
    })
    mount()
    await screen.findByText('Using the validated NODE_EXTRA_CA_CERTS from the launch environment')
    fireEvent.click(screen.getByRole('button', { name: 'Save and restart YourBuddy' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Not saved: desktop draft: HTTP 200.*bundled Node draft: failed: UNABLE_TO_VERIFY_LEAF_SIGNATURE/u)
    await waitFor(() => expect(mocks.requestSave).toHaveBeenCalledWith(settings))
    expect(mocks.requestRestart).not.toHaveBeenCalled()
  })
})
