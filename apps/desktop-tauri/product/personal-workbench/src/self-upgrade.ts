/** Session-owned self-upgrade handoff to the surviving native installer. */

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { brandString, type Branded } from '@deepseek-ai/dsh-brand'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ContentBlock, ToolCallId } from '@deepseek-ai/dsh-llm'
import { defineTool, type ToolExecution, type ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import { isJsonValue, type JsonValue } from '@deepseek-ai/dsh-util-values'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-jobs'
import type {} from '@deepseek-ai/dsh-session-persistence'

type OperationId = Branded<'YourBuddyUpgradeOperationId'>

/** Authenticated, read-only status remains reachable while new work is paused. */
export const UPGRADE_STATUS_PATH = '/api/yourbuddy/upgrade/status'

/** Deployment budgets for native command receipts and failed status-reader retries. */
export interface UpgradePolicy {
  /** Maximum wait for a local command receipt, not for downloading or installation. */
  receiptTimeoutMs: number
  /** Delay before restarting a failed, read-only terminal-status reader. */
  statusRetryMs: number
}

/** Product Loader settings; status readers wait until settlement without an installation deadline. */
export const UpgradePolicySchema = Schema.object({
  receiptTimeoutMs: Schema.number().step(1).min(1).default(30_000),
  statusRetryMs: Schema.number().step(1).min(1).default(1_000),
}).default({ receiptTimeoutMs: 30_000, statusRetryMs: 1_000 })

/** Installation identity supplied by the desktop process that owns this Host. */
export interface DesktopInstallation {
  /** Native executable, never selected from model arguments or PATH. */
  readonly executable: string
  /** Running application bundle, never a caller-selected installation. */
  readonly app: string
}

/** Native command adapter; tests replace only this external process. */
export type InstallerCommand = (arguments_: readonly string[], signal: AbortSignal) => Promise<JsonValue>

interface UpgradeTransaction {
  readonly agent: Agent
  readonly rootCallId: ToolCallId
  readonly callId: ToolCallId
  readonly token: ToolExecutionToken
  operation?: OperationId
  resultRecorded: boolean
  receiptRecorded: boolean
  committing?: Promise<void>
}

/** Run a native installer command and wait for its child to exit, including after cancellation. */
function nativeCommand(installation: DesktopInstallation): InstallerCommand {
  return (arguments_, signal) => new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const env = Object.fromEntries(Object.entries(process.env)
      .filter(([key]) => !/KEY|SECRET|TOKEN|PASSWORD/iu.test(key)))
    const child = execFile(installation.executable, ['--yourbuddy-installer', ...arguments_], {
      env, encoding: 'utf8', maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      signal.removeEventListener('abort', cancel)
      if (signal.aborted) { reject(signal.reason); return }
      if (error !== null) { reject(new Error(stderr.trim() || error.message)); return }
      try {
        const value: unknown = JSON.parse(stdout)
        if (!isJsonValue(value)) throw new Error('YourBuddy installer returned non-JSON output')
        resolve(value as JsonValue)
      } catch (parseError) { reject(parseError) }
    })
    const cancel = (): void => { child.kill() }
    signal.addEventListener('abort', cancel, { once: true })
    if (signal.aborted) cancel()
  })
}

function operationRecord(value: JsonValue): { id: OperationId; phase: string } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || typeof value.id !== 'string' || typeof value.phase !== 'string') {
    throw new Error('YourBuddy installer did not return an operation record')
  }
  return { id: brandString<OperationId>(value.id), phase: value.phase }
}

function isTerminal(phase: string): boolean {
  return ['succeeded', 'unchanged', 'failed', 'needsUserAction'].includes(phase)
}

function carriesReceipt(content: readonly ContentBlock[], id: OperationId): boolean {
  return content.some(block => {
    if (block.type !== 'text') return false
    let value: unknown
    try { value = JSON.parse(block.text) }
    catch (_error) { return false /* Other text is not the installer receipt. */ }
    if (value === null || typeof value !== 'object' || !('status' in value) || value.status !== 'accepted'
      || !('operation' in value) || value.operation === null || typeof value.operation !== 'object') return false
    return 'id' in value.operation && value.operation.id === id
  })
}

/**
 * Register upgrade tools only for the actual desktop installation. Admission is
 * exclusive, the current call is not counted as another task, and replay never
 * dispatches either installation or handoff. Native success is read through status.
 * @param ctx - Product scope with agent, tool, session, persistence, and job services.
 * @param installation - Application identity inherited from the native owner.
 * @param policy - Loader-resolved command deadline and status retry delay.
 * @param command - Native command adapter; omitted in the shipped product.
 */
export function installSelfUpgrade(
  ctx: Context,
  installation: DesktopInstallation,
  policy: UpgradePolicy,
  command: InstallerCommand = nativeCommand(installation),
): void {
  const lifetime = new AbortController()
  const executions = new Map<ToolExecutionToken, Readonly<ToolExecution>>()
  const commands = new Set<Promise<JsonValue>>()
  let transaction: UpgradeTransaction | undefined
  const logger = ctx.logger('yourbuddy-upgrade')
  const runCommand: InstallerCommand = (arguments_, signal) => {
    const pending = command(arguments_, arguments_.includes('--wait') ? signal
      : AbortSignal.any([signal, AbortSignal.timeout(policy.receiptTimeoutMs)]))
    commands.add(pending)
    return pending.finally(() => { commands.delete(pending) })
  }

  const busy = (initiator: Agent, token: ToolExecutionToken): boolean => {
    const agents = ctx.agents.list()
    const ancestors = new Set<ToolExecutionToken>()
    let execution = executions.get(token)
    while (execution !== undefined) {
      ancestors.add(execution.token)
      execution = execution.parent === undefined ? undefined : executions.get(execution.parent)
    }
    return agents.some(agent => (agent !== initiator && agent.status === 'running')
      || agent.inbox.nextTurn.length > 0 || agent.inbox.nextStep.length > 0)
      || [...executions.keys()].some(key => !ancestors.has(key))
      || [undefined, ...agents].some(agent => ctx.jobs.list(agent?.id)
        .some(job => job.status === 'running' || job.status === 'stopping'))
  }
  const flush = async (session: Session): Promise<void> => {
    if (!await ctx.sessions.flush(session)) throw new Error('YourBuddy upgrade requires durable Session storage')
  }

  ctx.on('connection/request', async (request, response, next) => {
    if (request.method === 'GET' && new URL(request.url ?? '/', 'http://localhost').pathname === UPGRADE_STATUS_PATH) {
      try {
        const result = await runCommand(['status', '--app', installation.app], lifetime.signal)
        if (transaction?.operation !== undefined) {
          const operation = operationRecord(result)
          if (operation.id === transaction.operation && isTerminal(operation.phase)) transaction = undefined
        }
        response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        response.end(JSON.stringify(result))
      } catch (error) {
        response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
      return
    }
    if (transaction === undefined) return next()
    response.writeHead(503, { 'Retry-After': '5' })
    response.end('YourBuddy upgrade is restarting this application')
  })
  ctx.on('agent/pre-step', async (_payload, next) => transaction === undefined ? next() : { kind: 'reject' })
  ctx.on('tools/execute', async (exec, next) => {
    if (transaction !== undefined) throw new Error('YourBuddy upgrade is pending; new tool work is paused')
    executions.set(exec.token, exec)
    try { return await next() }
    finally { executions.delete(exec.token) }
  })

  ctx.on('session/event', (session, event) => {
    const pending = transaction
    if (pending === undefined || pending.agent.session !== session || pending.operation === undefined) return
    if (event.type === 'tool/result' && event.data.message.toolCallId === pending.rootCallId) {
      pending.resultRecorded = event.data.message.isError !== true
      if (pending.callId === pending.rootCallId) pending.receiptRecorded = carriesReceipt(event.data.message.content, pending.operation)
    }
    if (event.type === 'tool/ptc-dispatch' && event.data.subCallId === pending.callId) {
      pending.receiptRecorded = !event.data.isError && carriesReceipt(event.data.content, pending.operation)
    }
    if (event.type !== 'turn/end' || pending.committing !== undefined) return
    const id = pending.operation
    pending.committing = (async () => {
      try {
        if (!pending.resultRecorded || !pending.receiptRecorded) throw new Error('The upgrade acceptance was not recorded as a successful tool result')
        await flush(session)
        if (busy(pending.agent, pending.token)) throw new Error('Other work arrived before the upgrade handoff')
        await runCommand(['handoff', '--operation', id], lifetime.signal)
      } catch (error) {
        if (lifetime.signal.aborted) return
        logger.error('Session upgrade handoff failed: %s', error)
        // Cancellation writes needsUserAction before releasing admission. If
        // replacement already started, native refuses it and still owns the outcome.
        try {
          await runCommand(['cancel', '--operation', id, '--reason', 'session-handoff-not-committed'], lifetime.signal)
          if (transaction === pending) transaction = undefined
          return
        } catch (cancelError) {
          logger.error('Upgrade cancellation was not confirmed; awaiting the installer result: %s', cancelError)
        }
      }
      let reportedFailure = false
      while (transaction === pending && !lifetime.signal.aborted) {
        try {
          const result = await runCommand(['status', '--operation', id, '--wait'], lifetime.signal)
          if (!isTerminal(operationRecord(result).phase)) throw new Error('YourBuddy installer status wait returned before settlement')
          if (transaction === pending) transaction = undefined
        } catch (error) {
          if (lifetime.signal.aborted) return
          if (!reportedFailure) logger.error('Upgrade status reader failed; retrying without permitting new work: %s', error)
          reportedFailure = true
          await delay(policy.statusRetryMs, undefined, { signal: lifetime.signal })
        }
      }
    })().catch((error: unknown) => {
      if (!lifetime.signal.aborted) logger.error('Upgrade status is unavailable; inspect the saved installer operation: %s', error)
    })
  })
  ctx.effect(() => async () => {
    lifetime.abort(new Error('YourBuddy upgrade plugin stopped'))
    await transaction?.committing
    await Promise.allSettled(commands)
  })

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'yourbuddy_upgrade',
    description: 'Upgrade this running YourBuddy application to the latest release or a specified version. '
      + 'Requires every other task and background job to be idle. Saves this conversation before restarting. '
      + 'Returns an accepted operation, not completed installation. Ends this turn; previous tools are never replayed automatically. '
      + 'Use yourbuddy_upgrade_status after restart to read the final result.',
    parameters: { version: { type: 'string', description: 'latest or an exact release version; defaults to latest.' } },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      presentationMeta: (_args, value) => value,
    },
    presentCall: args => ({ card: 'generic', title: 'yourbuddy_upgrade', input: args.version ?? 'latest' }),
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('YourBuddy upgrade requires a current Session')
      if (transaction !== undefined || busy(agent, exec.token)) throw new Error('Other tasks are active; wait until they finish before upgrading YourBuddy')
      const pending: UpgradeTransaction = { agent, rootCallId: exec.rootCallId, callId: exec.callId, token: exec.token, resultRecorded: false, receiptRecorded: false }
      transaction = pending
      try {
        await flush(agent.session)
        exec.signal.throwIfAborted()
        if (busy(agent, exec.token)) throw new Error('Other tasks became active before the upgrade request was saved')
        const requestId = createHash('sha256').update(JSON.stringify([agent.id, exec.callId])).digest('hex')
        const result = await runCommand([
          'install', '--app', installation.app, '--version', args.version ?? 'latest',
          '--request-id', requestId, '--session-id', agent.id, '--defer-stop',
        ], AbortSignal.any([exec.signal, lifetime.signal]))
        const operation = operationRecord(result)
        if (isTerminal(operation.phase)) {
          transaction = undefined
          return { status: ['succeeded', 'unchanged'].includes(operation.phase) ? 'no-change' : operation.phase, operation: result }
        }
        pending.operation = operation.id
        exec.concludeTurn()
        return { status: 'accepted', operation: result, statusPath: UPGRADE_STATUS_PATH, continuation: 'No previous tool is automatically rerun.' }
      } catch (error) {
        if (transaction === pending) transaction = undefined
        throw error
      }
    },
  })))

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'yourbuddy_upgrade_status',
    description: 'Read a saved YourBuddy upgrade operation. Succeeded means the target version and its Host and workbench are ready; accepted does not mean completed.',
    parameters: { operation_id: { type: 'string', description: 'Operation ID returned by yourbuddy_upgrade; omit for this application’s latest operation.' } },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    presentCall: args => ({ card: 'generic', title: 'yourbuddy_upgrade_status', input: args.operation_id ?? installation.app }),
    execute: (args, exec) => runCommand(args.operation_id === undefined
      ? ['status', '--app', installation.app]
      : ['status', '--operation', args.operation_id], AbortSignal.any([exec.signal, lifetime.signal])),
  })))
}
