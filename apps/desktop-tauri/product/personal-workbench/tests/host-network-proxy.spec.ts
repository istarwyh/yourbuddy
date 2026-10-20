import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { installProxyFromEnvironment, proxyRouteFor } from '@deepseek-ai/dsh-http-proxy'
import {
  createHostNetworkProxyRoute,
  HOST_NETWORK_PROXY_TEST_PATH,
  testHostNetworkProxy,
  type HostNetworkProxyFetch,
} from '../src/host-network-proxy.ts'

const servers = new Set<ReturnType<typeof createServer>>()

async function withProxyPolicy<T>(environment: NodeJS.ProcessEnv, run: () => Promise<T>): Promise<T> {
  const dispose = await installProxyFromEnvironment({
    get(name) {
      const value = environment[name]
      return value === undefined ? undefined : { value }
    },
  }, () => undefined)
  try {
    return await run()
  }
  finally {
    await dispose()
  }
}

async function invokeRoute(
  route: ReturnType<typeof createHostNetworkProxyRoute>,
  method: string,
  contentType?: string,
): Promise<{ body: unknown, status: number }> {
  const server = createServer((incoming, outgoing) => {
    void route.handler(incoming, outgoing)
  })
  servers.add(server)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = (server.address() as AddressInfo).port
  return await new Promise((resolve, reject) => {
    const outgoing = request({
      host: '127.0.0.1',
      port,
      method,
      path: HOST_NETWORK_PROXY_TEST_PATH,
      ...(contentType === undefined ? {} : { headers: { 'Content-Type': contentType } }),
    }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => resolve({
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
        status: response.statusCode ?? 0,
      }))
    })
    outgoing.once('error', reject)
    outgoing.end()
  })
}

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise<void>((resolve, reject) => {
    server.close(error => error === undefined ? resolve() : reject(error))
  })))
  servers.clear()
})

describe('Personal Workbench Host network proxy diagnostic', () => {
  it('reports the installed policy route without returning its URL', async () => {
    const fetcher: HostNetworkProxyFetch = async (input, init) => {
      expect(input).toBe('https://chatgpt.com/')
      expect(init.signal).toBeInstanceOf(AbortSignal)
      return { status: 204 }
    }
    const environment = {
      HTTPS_PROXY: 'http://proxy-user:proxy-password@127.0.0.1:7890',
      YOURBUDDY_NETWORK_PROXY_MODE: 'custom',
      YOURBUDDY_NETWORK_CA_SOURCE: 'environment',
      NODE_EXTRA_CA_CERTS: '/private/company-root.pem',
    }
    const result = await withProxyPolicy(environment,
      () => testHostNetworkProxy(fetcher, environment),
    )
    expect(result).toEqual({
      ok: true,
      status: 204,
      proxied: true,
      errorCode: '',
      proxyMode: 'custom',
      caSource: 'environment',
    })
    expect(JSON.stringify(result)).not.toContain('proxy-user')
    expect(JSON.stringify(result)).not.toContain('7890')
    expect(JSON.stringify(result)).not.toContain('/private/')
  })

  it('projects only a bounded transport cause code', async () => {
    const fetcher: HostNetworkProxyFetch = async () => {
      throw new TypeError('fetch failed for http://proxy-user:proxy-password@127.0.0.1:7890', {
        cause: Object.assign(new Error('connect timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' }),
      })
    }
    const environment = { HTTP_PROXY: 'http://127.0.0.1:7890' }
    const result = await withProxyPolicy(environment,
      () => testHostNetworkProxy(fetcher, environment),
    )
    expect(result).toEqual({
      ok: false,
      status: 0,
      proxied: true,
      errorCode: 'UND_ERR_CONNECT_TIMEOUT',
      proxyMode: 'unknown',
      caSource: 'unknown',
    })
    expect(JSON.stringify(result)).not.toContain('proxy-password')
  })

  it('preserves a bounded certificate cause without exposing its message', async () => {
    const fetcher: HostNetworkProxyFetch = async () => {
      throw new TypeError('fetch failed for an account-specific endpoint', {
        cause: Object.assign(new Error('certificate contained private details'), {
          code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        }),
      })
    }
    const environment = { HTTPS_PROXY: 'http://127.0.0.1:7890' }
    const result = await withProxyPolicy(environment,
      () => testHostNetworkProxy(fetcher, environment),
    )
    expect(result).toEqual({
      ok: false,
      status: 0,
      proxied: true,
      errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      proxyMode: 'unknown',
      caSource: 'unknown',
    })
    expect(JSON.stringify(result)).not.toContain('account-specific')
    expect(JSON.stringify(result)).not.toContain('private details')
  })

  it.each([
    { label: 'direct mode', environment: { YOURBUDDY_NETWORK_PROXY_MODE: 'direct' } },
    { label: 'NO_PROXY bypass', environment: { HTTPS_PROXY: 'http://127.0.0.1:7890', NO_PROXY: 'chatgpt.com' } },
    { label: 'rejected HTTPS proxy', environment: { HTTP_PROXY: 'http://127.0.0.1:7890', HTTPS_PROXY: 'socks5://127.0.0.1:7890' } },
    { label: 'invalid proxy URL', environment: { HTTPS_PROXY: 'invalid-proxy' } },
  ])('uses the fetch result for $label', async ({ environment }) => {
    await withProxyPolicy(environment, async () => {
      await expect(testHostNetworkProxy(async () => ({ status: 204 }), environment)).resolves.toMatchObject({
        ok: true,
        status: 204,
        proxied: false,
        errorCode: '',
      })
      await expect(testHostNetworkProxy(async () => {
        throw Object.assign(new Error('private connection details'), { code: 'ECONNREFUSED' })
      }, environment)).resolves.toMatchObject({
        ok: false,
        status: 0,
        proxied: false,
        errorCode: 'ECONNREFUSED',
      })
    })
  })

  it.each([407, 503])('preserves a failed HTTP %s result with the installed proxy', async (status) => {
    const environment = { HTTPS_PROXY: 'http://127.0.0.1:7890' }
    const result = await withProxyPolicy(environment,
      () => testHostNetworkProxy(async () => ({ status }), environment),
    )
    expect(result).toMatchObject({ ok: false, status, proxied: true, errorCode: `HTTP_${status}` })
  })

  it.each([401, 403])('reports HTTP %s as endpoint reachability', async (status) => {
    const environment = { HTTPS_PROXY: 'http://127.0.0.1:7890' }
    const result = await withProxyPolicy(environment,
      () => testHostNetworkProxy(async () => ({ status }), environment),
    )
    expect(result).toMatchObject({ ok: true, status, proxied: true, errorCode: '' })
  })

  it('does not infer an installed route from proxy environment variables', async () => {
    const environment = { HTTPS_PROXY: 'http://127.0.0.1:7890' }
    await expect(testHostNetworkProxy(async () => ({ status: 204 }), environment)).resolves.toMatchObject({
      ok: true,
      status: 204,
      proxied: false,
      errorCode: '',
    })
  })

  it('rejects cross-site simple requests and serves the fixed JSON POST', async () => {
    const route = createHostNetworkProxyRoute(async () => ({ status: 200 }), {})
    await expect(invokeRoute(route, 'GET')).resolves.toEqual({
      body: { ok: false, error: 'method-not-allowed' },
      status: 405,
    })
    await expect(invokeRoute(route, 'POST', 'text/plain')).resolves.toEqual({
      body: { ok: false, error: 'application-json-required' },
      status: 415,
    })
    await expect(invokeRoute(route, 'POST', 'application/json; charset=utf-8')).resolves.toEqual({
      body: {
        ok: true,
        status: 200,
        proxied: false,
        errorCode: '',
        proxyMode: 'unknown',
        caSource: 'unknown',
      },
      status: 200,
    })
  })

  it('reads the installed route when the request arrives and restores the previous policy', async () => {
    const environment = { HTTPS_PROXY: 'http://127.0.0.1:7890' }
    const target = new URL('https://chatgpt.com/')
    const previousRoute = proxyRouteFor(target)
    const route = createHostNetworkProxyRoute(async () => ({ status: 200 }), environment)
    await withProxyPolicy(environment, async () => {
      await expect(invokeRoute(route, 'POST', 'application/json')).resolves.toMatchObject({
        body: { ok: true, status: 200, proxied: true, errorCode: '' },
        status: 200,
      })
    })
    expect(proxyRouteFor(target)).toEqual(previousRoute)
    await expect(invokeRoute(route, 'POST', 'application/json')).resolves.toMatchObject({
      body: { ok: true, status: 200, proxied: false, errorCode: '' },
      status: 200,
    })
  })

  it('returns a completed failed diagnostic without an HTTP transport failure', async () => {
    const environment = { HTTPS_PROXY: 'http://127.0.0.1:7890' }
    const route = createHostNetworkProxyRoute(async () => {
      throw Object.assign(new Error('private certificate detail'), {
        code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      })
    }, environment)
    const result = await withProxyPolicy(environment,
      () => invokeRoute(route, 'POST', 'application/json'),
    )
    expect(result).toEqual({
      body: {
        ok: false,
        status: 0,
        proxied: true,
        errorCode: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        proxyMode: 'unknown',
        caSource: 'unknown',
      },
      status: 200,
    })
  })
})
