import { getEventListeners } from 'node:events'
import { Context } from '@deepseek-ai/cordis'
import { agentEvents, type Agent, type PreStepDecision } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { SessionId } from '@deepseek-ai/dsh-session'
import { afterEach, expect, it, vi } from 'vitest'
// @ts-expect-error Scenario plugins are runtime JavaScript without declaration artifacts.
import * as fixtureModule from '../snapshots/sdk/subagent-list-agents/settlement-order.mjs'

const fixture = fixtureModule as { inject: string[]; apply(ctx: Context): void }
const cleanups: (() => Promise<unknown>)[] = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); vi.restoreAllMocks() })

async function harness() {
  const ctx = new Context()
  cleanups.push(() => ctx.fiber.dispose())
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  const parent = await ctx.agentLoop.create(SessionId('order-parent'))
  const status = vi.spyOn(parent, 'status', 'get').mockReturnValue('running')
  const session = ctx.sessions.create(SessionId('order-child'), { meta: { parentSession: parent.id } })
  // The dispatcher uses the identity; the fixture reads only the child's Session.
  const child = { id: session.id, session } as Agent
  const fiber = ctx.plugin(fixture)
  await fiber
  const controller = new AbortController()
  const decision: PreStepDecision = { kind: 'enter', messages: [] }
  const next = vi.fn(async () => decision)
  const step = (turn = 1, index = 1) => agentEvents(ctx, child).waterfall('agent/pre-step', {
    turn, step: index, messages: [], signal: controller.signal,
  }, next)
  const idle = () => { status.mockReturnValue('idle'); agentEvents(ctx, parent).emit('agent/status', { status: 'idle' }) }
  return { ctx, parent, child, status, fiber, controller, decision, next, step, idle }
}

it('holds the child until its own parent is idle and detaches the abort listener', async () => {
  const h = await harness()
  const pending = h.step()
  await Promise.resolve()
  expect(h.next).not.toHaveBeenCalled()
  h.idle()
  expect(await pending).toBe(h.decision)
  expect(h.next).toHaveBeenCalledOnce()
  expect(getEventListeners(h.controller.signal, 'abort')).toHaveLength(0)
})

it('observes idle reached during listener installation without missing the transition', async () => {
  const h = await harness()
  h.status.mockReturnValueOnce('running').mockReturnValue('idle')
  expect(await h.step()).toBe(h.decision)
  expect(h.next).toHaveBeenCalledOnce()
  expect(getEventListeners(h.controller.signal, 'abort')).toHaveLength(0)
})

it.each([[1, 2], [2, 1]])('does not hold a later turn/step %s/%s', async (turn, step) => {
  const h = await harness()
  expect(await h.step(turn, step)).toBe(h.decision)
})

it.each([false, true])('rejects cancellation without admitting the child (already aborted %s)', async (alreadyAborted) => {
  const h = await harness()
  const reason = new Error('owned child cancelled')
  if (alreadyAborted) h.controller.abort(reason)
  const pending = h.step()
  const rejected = expect(pending).rejects.toBe(reason)
  h.controller.abort(reason)
  await rejected
  h.idle()
  expect(h.next).not.toHaveBeenCalled()
  expect(getEventListeners(h.controller.signal, 'abort')).toHaveLength(0)
})

it('settles waiting children when the scenario is disposed', async () => {
  const h = await harness()
  const rejected = expect(h.step()).rejects.toThrow('List-agents snapshot barrier disposed')
  await h.fiber.dispose()
  await rejected
  h.idle()
  expect(h.next).not.toHaveBeenCalled()
  expect(getEventListeners(h.controller.signal, 'abort')).toHaveLength(0)
})

it('ignores another parent becoming idle', async () => {
  const h = await harness()
  const other = await h.ctx.agentLoop.create(SessionId('other-parent'))
  const pending = h.step()
  agentEvents(h.ctx, other).emit('agent/status', { status: 'idle' })
  await Promise.resolve()
  expect(h.next).not.toHaveBeenCalled()
  h.idle()
  expect(await pending).toBe(h.decision)
})

it('does not admit a child cancelled in the same tick as its parent becomes idle', async () => {
  const h = await harness()
  const reason = new Error('cancelled at idle')
  const pending = h.step()
  const rejected = expect(pending).rejects.toBe(reason)
  h.idle()
  h.controller.abort(reason)
  await rejected
  expect(h.next).not.toHaveBeenCalled()
  expect(getEventListeners(h.controller.signal, 'abort')).toHaveLength(0)
})
