import { Context } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { mountAgentLoopTestDependencies, mountAgentLoopTestHarness } from '@deepseek-ai/dsh-agent-loop-testkit'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logPath } from '../../../../packages/session/session-persistence-jsonl/src/format.ts'
import { registerCommentReceipts } from './comment-receipts.mjs'
import { commentReceiptId, deliverComment } from './editor-owner.mjs'

// Run against the actual patched upstream payload, never a copied formatter.
const upstream = process.env.YOURBUDDY_DESIGN_ARTIFACTS_ENTRY ?? 'dsh-claude-artifacts'
const { commentMessage } = await import(upstream.startsWith('/') ? pathToFileURL(upstream).href : upstream)
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

function thread(sentAt = 100) {
  return { id: 'thread-1', where: 'hero', messages: [{ from: 'user', text: 'Make the title larger' }], agent: { sentAt } }
}

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), 'yourbuddy-design-receipts-'))
  cleanups.push(() => rm(directory, { recursive: true, force: true }))
  const ctx = new Context()
  cleanups.push(() => ctx.fiber.dispose())
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(JsonlSessionPersistence, { root: directory, compression: 'none' })
  const persistence = ctx.sessionPersistence
  if (!(persistence instanceof JsonlSessionPersistence)) throw new Error('JSONL backend was not mounted')
  registerCommentReceipts(ctx)
  const loop = await mountAgentLoopTestHarness(ctx)
  const agent = await loop.create(SessionId('design-comments'))
  // Hold the production loop at a supported maintenance boundary without a network model.
  const gate = Promise.withResolvers<void>()
  const maintenance = agent.runMaintenance(() => gate.promise)
  let stopped = false
  const stopMaintenance = async () => {
    if (stopped) return
    stopped = true
    agent.cancel({ kind: 'disposed' })
    gate.resolve()
    await maintenance
  }
  cleanups.push(stopMaintenance)
  const resolveAgent = vi.fn(async () => ({ agent }))
  const deliveryContext = { sessionProjections: ctx.sessionProjections, sessions: ctx.sessions, sessionController: { resolveAgent } }
  const deliver = (value = thread()) => deliverComment(deliveryContext, commentMessage, agent.id, '/artifacts/landing', 'http://localhost:1234', 'thread', value)
  const diskEvents = async () => {
    let text: string
    try { text = await readFile(logPath(directory, undefined, agent.id, 'none'), 'utf8') }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
      throw error
    }
    return text.trim().split('\n').slice(1).map(line => JSON.parse(line))
  }
  const inserted = async () => (await diskEvents()).filter(event => event.type === 'agent/inbox/spliced')
    .flatMap(event => event.data.inserted ?? [])
  return { ctx, persistence, agent, deliver, inserted, resolveAgent, stop: async () => {
    await stopMaintenance()
    await ctx.fiber.dispose()
  } }
}

describe('design editor durable comment receipts', () => {
  it('writes the actual upstream chat card once and separates explicit send occurrences', async () => {
    const { agent, deliver, inserted } = await harness()
    await deliver()
    await deliver()
    await deliver(thread(200))
    const messages = await inserted()
    expect(messages).toHaveLength(2)
    expect(messages.map(message => message.id)).toEqual([100, 200].map(sentAt =>
      commentReceiptId(agent.id, '/artifacts/landing', 'thread', thread(sentAt))))
    expect(messages[0].source).toMatchObject({ plugin: 'dsh-claude-design', root: '/artifacts/landing', threads: [{ id: 'thread-1', text: 'Make the title larger' }] })
    expect(messages[0].content[0].text).toContain('do not run `comments --wait`')
  })

  it('admits concurrent identical deliveries once in the physical Session log', async () => {
    const { agent, deliver, inserted } = await harness()
    await Promise.all(Array.from({ length: 8 }, () => deliver()))
    expect(agent.inbox.nextTurn).toHaveLength(1)
    expect(await inserted()).toHaveLength(1)
  })

  it('retries a failed physical write without enqueuing the same comment twice', async () => {
    const { persistence, agent, deliver, inserted } = await harness()
    const persist = vi.spyOn(persistence, 'persistBatch').mockRejectedValue(new Error('disk full'))
    await expect(deliver()).rejects.toThrow('disk full')
    expect(agent.inbox.nextTurn).toHaveLength(1)
    persist.mockRestore()
    await deliver()
    expect(await inserted()).toHaveLength(1)
  })

  it('does not acknowledge while the physical JSONL write is blocked', async () => {
    const { persistence, deliver, inserted } = await harness()
    const entered = Promise.withResolvers<void>()
    const gate = Promise.withResolvers<void>()
    const original = persistence.persistBatch.bind(persistence)
    vi.spyOn(persistence, 'persistBatch').mockImplementation(async (...args) => {
      entered.resolve()
      await gate.promise
      return original(...args)
    })
    let acknowledged = false
    const delivery = deliver().then(() => { acknowledged = true })
    try {
      await entered.promise
      expect(acknowledged).toBe(false)
      expect(await inserted()).toHaveLength(0)
    } finally {
      gate.resolve()
    }
    await delivery
    expect(await inserted()).toHaveLength(1)
  })

  it('rejects a stale session instead of acknowledging its comment', async () => {
    const { deliver, stop } = await harness()
    await stop()
    await expect(deliver()).rejects.toThrow()
  })

  it('does not resurrect a canceled comment when its acknowledged send is retried', async () => {
    const { ctx, agent, deliver, inserted } = await harness()
    await deliver()
    agent.cancel({ kind: 'user' })
    await ctx.sessions.flush(agent.session)
    expect(agent.inbox.nextTurn).toHaveLength(0)
    await deliver()
    expect(agent.inbox.nextTurn).toHaveLength(0)
    expect(await inserted()).toHaveLength(1)
  })
})
