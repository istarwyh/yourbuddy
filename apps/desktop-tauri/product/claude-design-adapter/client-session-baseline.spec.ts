import { Context } from '@deepseek-ai/cordis'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { ClientSessions } from '../../../../packages/api/session-controller/src/client/sessions/service.ts'
import type { SessionRemotes } from '../../../../packages/api/session-controller/src/client/sessions/remotes.ts'
import type { SessionListValue } from '../../../../packages/api/session-controller/src/types.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'

const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

function harness(list: SessionRemotes['session']['list']) {
  const ctx = new Context()
  contexts.push(ctx)
  // Catalog-only tests never open a Session or invoke the other Remote namespaces.
  return new ClientSessions(ctx, { session: { list } } as SessionRemotes)
}

const emptyBaseline = { ok: true as const, value: { items: [] } }

describe('public Session baseline completion', () => {
  it('single-flights refresh and exposes ready before its awaited continuation, without an extra tick', async () => {
    const response = Promise.withResolvers<RemoteResult<SessionListValue>>()
    const list = vi.fn(() => response.promise)
    const sessions = harness(list)
    const phases: string[] = []
    const stop = sessions.list.subscribe(() => { phases.push(sessions.list.getSnapshot().phase) })
    try {
      const first = sessions.refresh()
      const second = sessions.refresh()
      expect(second).toBe(first)
      expect(list).toHaveBeenCalledOnce()
      expect(sessions.list.getSnapshot().phase).toBe('pending')
      response.resolve(emptyBaseline)
      await first
      expect(sessions.list.getSnapshot()).toMatchObject({ phase: 'ready', ids: [], byId: {} })
      expect(phases).toContain('ready')
    } finally {
      response.resolve(emptyBaseline)
      stop()
    }
  })

  it.each(['result', 'remote-rejection', 'unexpected-rejection'] as const)(
    'leaves a failed initial %s pending and publishes ready on a later successful refresh', async failure => {
      const list = vi.fn<SessionRemotes['session']['list']>()
      const error = new RemoteError('gateway/internal', 'Session baseline unavailable', {})
      if (failure === 'result') list.mockResolvedValueOnce({ ok: false, error })
      else if (failure === 'remote-rejection') list.mockRejectedValueOnce(error)
      else list.mockRejectedValueOnce(new Error('Unexpected baseline failure'))
      list.mockResolvedValueOnce(emptyBaseline)
      const sessions = harness(list)
      if (failure === 'unexpected-rejection') {
        await expect(sessions.refresh()).rejects.toThrow('Unexpected baseline failure')
      } else {
        await expect(sessions.refresh()).resolves.toBeUndefined()
      }
      expect(sessions.list.getSnapshot()).toMatchObject({ phase: 'pending', ids: [], byId: {} })
      await sessions.refresh()
      expect(sessions.list.getSnapshot().phase).toBe('ready')
      expect(list).toHaveBeenCalledTimes(2)
    },
  )
})
