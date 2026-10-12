import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Pool } from 'undici'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { installProxyFromEnvironment } from '../src/index.ts'
import { proxyForUrl, resolveProxyPolicy } from '../src/policy.ts'

const { directLookups } = vi.hoisted(() => ({ directLookups: [] as string[] }))

// Keep the installed dispatcher and its real proxy transport; only the direct Pool's DNS is local.
vi.mock('undici', async (importOriginal) => {
  const undici = await importOriginal<typeof import('undici')>()
  return {
    ...undici,
    Pool: class extends undici.Pool {
      constructor(origin: string | URL, options?: Pool.Options) {
        super(origin, {
          ...options,
          connect: {
            lookup(hostname, _options, callback) {
              directLookups.push(hostname)
              const error = hostname === 'probe.invalid'
                ? Object.assign(new Error('fixture DNS miss'), { code: 'ENOTFOUND', hostname })
                : new Error(`unexpected direct lookup: ${hostname}`)
              queueMicrotask(() => { callback(error, []) })
            },
          },
        })
      }
    },
  }
})

/**
 * `proxyForUrl` answers where a URL goes; these cases check that answer against where a real `fetch`
 * actually went, for every form in the documented bypass vocabulary. The installed dispatcher routes
 * by this same predicate, so the two cannot drift apart by parsing the list twice — what a case can
 * still catch is `bypassesProxy` reading a form differently from how the vocabulary documents it,
 * and any future dispatcher that reintroduces a second matcher.
 *
 * The remaining second matcher is Node's, in a spawned child: it reads the published `NO_PROXY` and
 * applies its own rules, which differ in separators and IPv4-range support. That seam is documented
 * rather than asserted here, because the difference is real.
 */
const CASES: readonly { readonly noProxy: string; readonly path: string; readonly bypassed: boolean }[] = [
  { noProxy: '', path: '/plain', bypassed: false },
  { noProxy: 'probe.invalid', path: '/exact', bypassed: true },
  { noProxy: '.probe.invalid', path: '/dot-suffix', bypassed: true },
  { noProxy: '*.probe.invalid', path: '/star-suffix', bypassed: true },
  { noProxy: 'other.invalid', path: '/miss', bypassed: false },
  { noProxy: '*', path: '/all', bypassed: true },
  { noProxy: 'probe.invalid:80', path: '/with-default-port', bypassed: true },
  { noProxy: 'probe.invalid:8443', path: '/wrong-port', bypassed: false },
  { noProxy: 'a.invalid, probe.invalid', path: '/comma-list', bypassed: true },
]

let seen: string[] = []
let proxy: Server
let proxyUrl: string

beforeAll(async () => {
  proxy = createServer((request, response) => {
    seen.push(request.url ?? '')
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('VIA-PROXY')
  })
  const address = await new Promise<AddressInfo>((resolve) => {
    proxy.listen(0, '127.0.0.1', () => { resolve(proxy.address() as AddressInfo) })
  })
  proxyUrl = `http://127.0.0.1:${String(address.port)}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => { proxy.close(() => { resolve() }) })
})

/** The launch environment of a user who exported one proxy for both schemes plus one bypass list. */
function proxyEnv(noProxy: string): { get(name: string): { value: string } | undefined } {
  const values: Record<string, string> = { HTTP_PROXY: proxyUrl, HTTPS_PROXY: proxyUrl, NO_PROXY: noProxy }
  return { get: name => (name in values ? { value: values[name] as string } : undefined) }
}

describe('bypass matcher parity', () => {
  it.each(CASES)('agrees on $noProxy for $path', async ({ noProxy, path, bypassed }) => {
    seen = []
    directLookups.length = 0
    const url = new URL(`http://probe.invalid${path}`)
    const env = proxyEnv(noProxy)
    const { policy } = resolveProxyPolicy(env)
    const dispose = await installProxyFromEnvironment(env, () => undefined)
    try {
      // An explicit DNS result lets dispose drain the connection; aborting fetch alone does not
      // settle a pending system lookup. A proxied hop must reach the real loopback recorder.
      const response = fetch(url, { signal: AbortSignal.timeout(1500) })
      if (bypassed) {
        await expect(response).rejects.toMatchObject({ cause: { code: 'ENOTFOUND', hostname: 'probe.invalid' } })
      } else {
        await expect(response.then(value => value.text())).resolves.toBe('VIA-PROXY')
      }
      expect(directLookups).toEqual(bypassed ? ['probe.invalid'] : [])
      const agentProxied = seen.length > 0
      expect({ ours: proxyForUrl(policy, url) !== undefined, agent: agentProxied })
        .toEqual({ ours: !bypassed, agent: !bypassed })
    } finally {
      await dispose()
    }
  })
})
