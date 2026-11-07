/** Lifecycle owner for the upstream foreground editor and its durable comment receipts. */
import { fork } from 'node:child_process'
import { createHash } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** Stable identity for one explicit Send to Agent occurrence, including retries after restart. */
export function commentReceiptId(sessionId, root, kind, value) {
  return `yourbuddy-design:${createHash('sha256').update(JSON.stringify([
    sessionId, root, kind, value.id, kind === 'thread' ? value.agent.sentId ?? value.agent.sentAt : value,
  ])).digest('hex')}`
}

/** Admit a comment once, preserve its upstream chat card, and wait for the Session writer. */
export async function deliverComment(ctx, commentMessage, sessionId, root, url, kind, value) {
  const resolved = await ctx.sessionController.resolveAgent(sessionId)
  if ('error' in resolved) throw resolved.error
  const agent = resolved.agent
  const id = commentReceiptId(sessionId, root, kind, value)
  const receipts = ctx.sessionProjections.stateOf(agent.session, 'yourbuddy-design/comment-receipts')
  if (receipts === undefined) throw new Error('The design comment receipt projection is not registered.')
  // Projection lookup and admission are synchronous: concurrent deliveries cannot interleave here.
  const seen = agent.inbox.nextTurn.some(message => message.id === id)
    || agent.inbox.nextStep.some(message => message.id === id)
    || receipts.includes(id)
  if (!seen) {
    const out = { root, url, ...(kind === 'thread' ? { threads: [value] } : { requests: [value] }) }
    const message = commentMessage({ name: 'claude-design' }, 'dsh-claude-design', out, root)
    agent.followup(Object.freeze({ ...message, id }))
  }
  if (!await ctx.sessions.flush(agent.session)) throw new Error('The Session writer did not acknowledge the design comment. Reopen the artifact to retry.')
}

/** Own only child processes started by this instance; never signal a PID from a state file. */
export class EditorOwner {
  #entries = new Map()
  #closing = false
  constructor({ deliver, startupTimeoutMs, stopTimeoutMs }) {
    this.deliver = deliver
    this.startupTimeoutMs = startupTimeoutMs
    this.stopTimeoutMs = stopTimeoutMs
  }
  async open(script, root, sessionId) {
    root = await realpath(root)
    if (this.#closing) throw new Error('The design plugin is stopping.')
    const current = this.#entries.get(root)
    if (current) {
      if (current.stopping) { await current.done; return this.open(script, root, sessionId) }
      if (current.sessionId !== sessionId) throw new Error('This artifact is already associated with another Session.')
      return { ...await current.ready, reused: true }
    }
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|SECRET|TOKEN|PASSWORD/i.test(key)))
    const child = fork(new URL('./editor-worker.mjs', import.meta.url), [join(dirname(script), 'server.mjs'), root], {
      execPath: process.execPath, execArgv: [], env, stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true,
    })
    let resolveReady, rejectReady
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
    const entry = { child, sessionId, ready, deliveries: new Set(), url: null }
    this.#entries.set(root, entry)
    let stderr = ''
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-2000) })
    entry.done = new Promise(resolve => child.once('close', () => {
      clearTimeout(timer)
      if (this.#entries.get(root) === entry) this.#entries.delete(root)
      rejectReady(new Error(stderr || 'The design editor stopped before it was ready.'))
      resolve()
    }))
    child.on('error', rejectReady)
    child.on('message', message => {
      if (message.type === 'ready') {
        clearTimeout(timer)
        entry.url = message.url
        resolveReady({ url: message.url, reused: false })
      } else if (message.type === 'failed') rejectReady(new Error(message.error))
      else if (message.type === 'comment') {
        const delivery = ready.then(() => this.deliver(sessionId, root, entry.url, message.kind, message.value))
        entry.deliveries.add(delivery)
        const reply = receipt => {
          if (!child.connected) return
          try { child.send(receipt, () => { /* A lost receipt remains pending and retries by its stable id. */ }) }
          catch (error) { /* A concurrent IPC close leaves the upstream comment pending. */ }
        }
        void delivery.then(
          () => reply({ id: message.id }),
          error => reply({ id: message.id, error: error instanceof Error ? error.message : String(error) }),
        ).finally(() => entry.deliveries.delete(delivery))
      }
    })
    const timer = setTimeout(() => rejectReady(new Error('The design editor did not start in time.')), this.startupTimeoutMs)
    try { return await ready }
    catch (error) { await this.close(root); throw error }
  }
  async close(root) {
    const entry = this.#entries.get(root)
    if (!entry) return false
    entry.stopping = true
    entry.child.kill('SIGTERM')
    const timer = setTimeout(() => entry.child.kill('SIGKILL'), this.stopTimeoutMs)
    try { await entry.done; await Promise.allSettled([...entry.deliveries]) }
    finally { clearTimeout(timer) }
    return true
  }
  async dispose() {
    this.#closing = true
    await Promise.all([...this.#entries.keys()].map(root => this.close(root)))
  }
}
