import { once } from 'node:events'
import { request, ServerResponse } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { closeMockServers, mockServer, textEvents } from './mock-server.ts'

afterEach(async () => {
  await closeMockServers()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('cancels pending SSE writes when the client disconnects', async () => {
  vi.useFakeTimers()
  const server = await mockServer([{ kind: 'sse', events: textEvents, delayMs: 50 }])
  const scheduled = vi.spyOn(globalThis, 'setTimeout')
  const cleared = vi.spyOn(globalThis, 'clearTimeout')
  const written = vi.spyOn(ServerResponse.prototype, 'write')
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    const client = request(server.url, { method: 'POST' }, resolve)
    client.once('error', reject)
    client.end('{}')
  })
  try {
    await once(response, 'data')
    expect(scheduled).toHaveBeenCalledTimes(1)
    const pending = scheduled.mock.results[0]?.value
    expect(pending).toBeDefined()

    const closed = new Promise<void>((resolve) => { response.once('close', resolve) })
    response.destroy()
    await closed
    await server.close()

    expect(cleared).toHaveBeenCalledWith(pending)
    const writesAtClose = written.mock.calls.length
    await vi.advanceTimersByTimeAsync(500)
    expect(written).toHaveBeenCalledTimes(writesAtClose)
  } finally {
    response.destroy()
    await server.close()
  }
})
