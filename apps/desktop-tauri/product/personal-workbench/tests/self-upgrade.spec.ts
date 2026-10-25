/** Real Loader, agent-loop, and JSONL tests; only model and native installer are substituted. */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer, request } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime, { createUserMessage, LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import LocalJobRegistry from '@deepseek-ai/dsh-jobs-local'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { installSelfUpgrade, UPGRADE_STATUS_PATH, type InstallerCommand } from '../src/self-upgrade.ts'

const contexts = new Set<Context>()
const directories: string[] = []
const installation = { executable: '/Applications/YourBuddy.app/Contents/MacOS/YourBuddy', app: '/Applications/YourBuddy.app' }
const accepted = { id: 'upgrade-operation', phase: 'accepted', targetVersion: '1.2.3' }

class ScriptedModel extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  constructor(private readonly responses: StreamChunk[][]) { super() }
  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const response = this.responses.shift()
    if (response === undefined) throw new Error('Unexpected model request after upgrade acceptance')
    yield* response
  }
}

function call(name: string, args: object = {}, id = 'upgrade-call'): StreamChunk[] {
  const block = { type: 'tool-call' as const, id: ToolCallId(id), name, arguments: JSON.stringify(args) }
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 0, id: block.id, name, argumentsDelta: block.arguments },
    { type: 'block-end', index: 0, block },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

function waitForAbort(signal: AbortSignal): Promise<JsonValue> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return }
    signal.addEventListener('abort', () => { reject(signal.reason) }, { once: true })
  })
}

async function fixture(model: ScriptedModel, command: InstallerCommand, existingRoot?: string): Promise<{ ctx: Context; root: string }> {
  const root = existingRoot ?? await mkdtemp(join(tmpdir(), 'yourbuddy-upgrade-'))
  if (existingRoot === undefined) directories.push(root)
  const template = await readFile(new URL('./fixtures/self-upgrade.cordis.yml', import.meta.url), 'utf8')
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, template.replace('{{root}}', join(root, 'sessions').replaceAll('\\', '/')))
  const ctx = new Context()
  contexts.add(ctx)
  await ctx.plugin(Loader, { baseUrl: pathToFileURL(root).href + '/' })
  Object.assign(ctx.loader.builtins, {
    include: Include, llm: LlmRuntime, sessions: SessionStore, projections: SessionProjectionRegistry,
    prompt: SystemPrompt, tools: ToolRuntime, agents: AgentRegistry,
    persistence: JsonlSessionPersistence, jobs: LocalJobRegistry, loop: AgentLoop,
    upgrade: {
      name: 'yourbuddy-upgrade-fixture',
      inject: ['agents', 'tools', 'sessions', 'sessionPersistence', 'jobs'],
      apply(upgradeCtx: Context) { installSelfUpgrade(upgradeCtx, installation, { receiptTimeoutMs: 30_000, statusRetryMs: 10 }, command) },
    },
  })
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  ctx.llm.registerAdapter(['upgrade-test'], model)
  return { ctx, root }
}

async function stored(ctx: Context, id: SessionId): Promise<readonly SessionEvent[]> {
  const handle = await ctx.sessionPersistence.open(id, 'read')
  try { return (await handle.read()).events }
  finally { await handle.close() }
}

async function createAgent(ctx: Context, id = 'upgrading-session'): Promise<Agent> {
  return (await ctx.agents.create({ sessionId: SessionId(id), agentOptions: { provider: 'upgrade-test', model: 'fixture' } })).agent
}

function send(agent: Agent, text = 'Upgrade YourBuddy'): void {
  agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }))
}

afterEach(async () => {
  for (const ctx of contexts) await ctx.fiber.dispose()
  contexts.clear()
  for (const root of directories.splice(0)) await rm(root, { recursive: true, force: true })
})

describe('YourBuddy Session upgrade handoff', () => {
  it('persists the request before acceptance and the accepted result before handoff, without replay on resume', async () => {
    const model = new ScriptedModel([call('yourbuddy_upgrade', { version: '1.2.3' })])
    const handoff = Promise.withResolvers<void>()
    const commands: string[][] = []
    let ctx: Context
    let agent: Agent
    const setup = await fixture(model, async (args, signal) => {
      commands.push([...args])
      if (args[0] === 'install') {
        const log = await stored(ctx, agent.id)
        expect(log.some(event => event.type === 'user/message')).toBe(true)
        expect(log.at(-1)?.type).toBe('tool/call')
        expect(args).toContain(installation.app)
        expect(args).toContain('--defer-stop')
        return accepted
      }
      if (args[0] === 'handoff') {
        const log = await stored(ctx, agent.id)
        expect(log.at(-1)?.type).toBe('turn/end')
        const result = log.find(event => event.type === 'tool/result')
        expect(result?.type === 'tool/result' && result.data.message.content).toEqual([{ type: 'text', text: JSON.stringify({
          status: 'accepted', operation: accepted, statusPath: '/api/yourbuddy/upgrade/status',
          continuation: 'No previous tool is automatically rerun.',
        }) }])
        handoff.resolve()
        return accepted
      }
      return waitForAbort(signal)
    })
    ctx = setup.ctx
    agent = await createAgent(ctx)
    send(agent)
    await agent.whenIdle()
    expect(agent.session.snapshotEvents().filter(event => event.type === 'tool/result')).toMatchObject([
      { data: { message: { content: [{ text: JSON.stringify({ status: 'accepted', operation: accepted, statusPath: '/api/yourbuddy/upgrade/status', continuation: 'No previous tool is automatically rerun.' }) }] } } },
    ])
    await handoff.promise
    expect(model.requests).toHaveLength(1)
    expect(commands.filter(args => args[0] === 'install')).toHaveLength(1)
    await ctx.fiber.dispose()
    contexts.delete(ctx)

    const restartedModel = new ScriptedModel([])
    const resumedCommands: string[][] = []
    const restarted = await fixture(restartedModel, async args => {
      resumedCommands.push([...args])
      return { ...accepted, phase: 'succeeded' }
    }, setup.root)
    const resumed = await restarted.ctx.agents.resume({ resumeSessionId: agent.id, agentOptions: { provider: 'upgrade-test', model: 'fixture' } })
    await resumed.agent.whenIdle()
    expect(resumed.agent.session.snapshotEvents()).toEqual(await stored(restarted.ctx, agent.id))
    expect(restartedModel.requests).toHaveLength(0)
    expect(resumedCommands).toEqual([])
    const status = await restarted.ctx.tools.execute({
      callId: ToolCallId('status-call'), name: 'yourbuddy_upgrade_status', arguments: {},
      agent: resumed.agent, signal: new AbortController().signal,
    })
    expect(status).toMatchObject({ isError: false, value: { phase: 'succeeded' } })
    expect(resumedCommands[0]?.[0]).toBe('status')
  })

  it('refuses a live other task before asking the native installer, while excluding the initiating call', async () => {
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const model = new ScriptedModel([call('waiting-task', {}, 'busy-call')])
    let nativeCalls = 0
    const { ctx } = await fixture(model, async () => { nativeCalls++; return accepted })
    const initiator = await createAgent(ctx)
    const other = await createAgent(ctx, 'other-session')
    ctx.effect(() => ctx.tools.register({
      name: 'waiting-task', description: 'Test-owned task', parameters: {},
      output: { schema: { type: 'null' }, render: () => [] },
      async execute(_args, exec) { entered.resolve(); await release.promise; exec.concludeTurn(); return null },
    }))
    send(other, 'Run another task')
    await entered.promise
    try {
      const result = await ctx.tools.execute({ callId: ToolCallId('blocked-upgrade'), name: 'yourbuddy_upgrade', arguments: {}, agent: initiator, signal: new AbortController().signal })
      expect(other.status).toBe('running')
      expect(result.isError).toBe(true)
      expect(JSON.stringify(result.content)).toContain('Other tasks are active')
      expect(nativeCalls).toBe(0)
    } finally {
      release.resolve()
      await other.whenIdle()
    }
  })

  it('releases admission when the surviving installer fails before stopping the Host', async () => {
    const terminal = Promise.withResolvers<JsonValue>()
    const watching = Promise.withResolvers<void>()
    const model = new ScriptedModel([call('yourbuddy_upgrade'), [{ type: 'finish', reason: { kind: 'stop' } }]])
    const { ctx } = await fixture(model, async (args, signal) => {
      if (args.includes('--wait')) { watching.resolve(); return Promise.race([terminal.promise, waitForAbort(signal)]) }
      return accepted
    })
    const agent = await createAgent(ctx)
    send(agent)
    await agent.whenIdle()
    expect(agent.session.snapshotEvents().filter(event => event.type === 'tool/result')).toMatchObject([
      { data: { message: { content: [{ text: JSON.stringify({ status: 'accepted', operation: accepted, statusPath: '/api/yourbuddy/upgrade/status', continuation: 'No previous tool is automatically rerun.' }) }] } } },
    ])
    await watching.promise
    terminal.resolve({ ...accepted, phase: 'failed', error: 'Download failed', userAction: 'Retry the upgrade' })
    await expect.poll(async () => (await ctx.tools.execute({
      callId: ToolCallId('recovery-status'), name: 'yourbuddy_upgrade_status', arguments: {},
      agent, signal: new AbortController().signal,
    })).isError).toBe(false)
    send(agent, 'Continue ordinary work')
    await agent.whenIdle()
    expect(model.requests).toHaveLength(2)
  })

  it('records a recoverable native cancellation instead of stopping when the final Session flush fails', async () => {
    const cancelled = Promise.withResolvers<void>()
    const commands: string[][] = []
    const model = new ScriptedModel([call('yourbuddy_upgrade')])
    const { ctx } = await fixture(model, async args => {
      commands.push([...args])
      if (args[0] === 'cancel') {
        cancelled.resolve()
        return { ...accepted, phase: 'needsUserAction', userAction: args.at(-1) ?? '' }
      }
      return accepted
    })
    const agent = await createAgent(ctx)
    const removeFailure = ctx.on('session/flush', session => {
      if (session.snapshotEvents().some(event => event.type === 'tool/result')) throw new Error('Final checkpoint failed')
    })
    send(agent)
    await agent.whenIdle()
    await cancelled.promise
    removeFailure()
    expect(commands.some(args => args[0] === 'handoff')).toBe(false)
    expect(commands.find(args => args[0] === 'cancel')).toEqual([
      'cancel', '--operation', accepted.id, '--reason', 'session-handoff-not-committed',
    ])
    expect(model.requests).toHaveLength(1)
  })

  it('does not hand off when a result policy removes the durable accepted receipt', async () => {
    const cancelled = Promise.withResolvers<void>()
    const commands: string[] = []
    const model = new ScriptedModel([call('yourbuddy_upgrade')])
    const { ctx } = await fixture(model, async args => {
      commands.push(args[0] ?? '')
      if (args[0] === 'cancel') { cancelled.resolve(); return { ...accepted, phase: 'needsUserAction' } }
      return accepted
    })
    ctx.on('tools/post-execute', async (exec, _result, next) => exec.name === 'yourbuddy_upgrade'
      ? { kind: 'accept', content: [{ type: 'text', text: 'Receipt removed by policy' }] }
      : next())
    const agent = await createAgent(ctx)
    send(agent)
    await agent.whenIdle()
    await cancelled.promise
    expect(commands).toEqual(['install', 'cancel'])
  })

  it.each(['succeeded', 'unchanged'])('leaves the Session usable for a terminal %s operation', async phase => {
    const commands: string[] = []
    const model = new ScriptedModel([call('yourbuddy_upgrade'), [{ type: 'finish', reason: { kind: 'stop' } }]])
    const { ctx } = await fixture(model, async args => {
      commands.push(args[0] ?? '')
      return { ...accepted, phase }
    })
    const agent = await createAgent(ctx)
    send(agent)
    await agent.whenIdle()
    expect(commands).toEqual(['install'])
    expect(model.requests).toHaveLength(2)
    expect(JSON.stringify(agent.session.snapshotEvents())).toContain('no-change')
  })

  it('keeps status readable and admission paused across a transient native status-reader failure', async () => {
    const retryStarted = Promise.withResolvers<void>()
    const terminal = Promise.withResolvers<JsonValue>()
    let reads = 0
    const model = new ScriptedModel([call('yourbuddy_upgrade')])
    const { ctx } = await fixture(model, async (args, signal) => {
      if (args.includes('--wait')) {
        reads++
        if (reads === 1) throw new Error('Transient native status read failure')
        retryStarted.resolve()
        return Promise.race([terminal.promise, waitForAbort(signal)])
      }
      return accepted
    })
    const agent = await createAgent(ctx)
    send(agent)
    await agent.whenIdle()
    await retryStarted.promise
    const paused = await ctx.tools.execute({
      callId: ToolCallId('paused-call'), name: 'yourbuddy_upgrade_status', arguments: {},
      agent, signal: new AbortController().signal,
    })
    expect(paused.isError).toBe(true)
    const server = createServer((incoming, outgoing) => {
      void ctx.waterfall('connection/request', incoming, outgoing, async () => { outgoing.writeHead(404); outgoing.end() })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const status = await new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
        const read = request({ hostname: '127.0.0.1', port: (server.address() as AddressInfo).port, path: UPGRADE_STATUS_PATH }, response => {
          let body = ''
          response.setEncoding('utf8')
          response.on('data', chunk => { body += String(chunk) })
          response.on('end', () => resolve({ status: response.statusCode, body }))
        })
        read.once('error', reject)
        read.end()
      })
      expect(status.status).toBe(200)
      expect(JSON.parse(status.body)).toEqual(accepted)
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)))
    }
    terminal.resolve({ ...accepted, phase: 'failed' })
    await expect.poll(async () => (await ctx.tools.execute({
      callId: ToolCallId('recovered-call'), name: 'yourbuddy_upgrade_status', arguments: {},
      agent, signal: new AbortController().signal,
    })).isError).toBe(false)
    expect(reads).toBe(2)
  })
})
