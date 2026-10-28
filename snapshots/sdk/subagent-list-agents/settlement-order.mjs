/** Keep this recording's settlement turn separate from its initial user turn. */
export const inject = ['agents']

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx - The scenario's runtime.
 */
export function apply(ctx) {
  const pending = new Set()
  let disposed = false
  ctx.effect(() => async () => {
    disposed = true
    const waits = [...pending]
    for (const wait of waits) wait.reject(new Error('List-agents snapshot barrier disposed'))
    await Promise.allSettled(waits.map(wait => wait.done))
  })
  ctx.on('agent/pre-step', async ({ agent, turn, step, signal }, next) => {
    const parentId = agent.session.header.parentSession
    if (parentId === undefined || turn !== 1 || step !== 1) return next()
    const parent = ctx.agents.get(parentId)
    if (parent === undefined) throw new Error('List-agents replay parent is unavailable')
    signal.throwIfAborted()
    if (disposed) throw new Error('List-agents snapshot barrier disposed')
    if (parent.status !== 'idle') {
      const wait = Promise.withResolvers()
      const stop = ctx.on('agent/status', ({ agent: subject, status }) => {
        if (subject === parent && status === 'idle') wait.resolve()
      })
      const abort = () => { wait.reject(signal.reason) }
      wait.done = wait.promise.finally(() => {
        stop()
        signal.removeEventListener('abort', abort)
        pending.delete(wait)
      })
      pending.add(wait)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
      else if (parent.status === 'idle') wait.resolve()
      await wait.done
    }
    signal.throwIfAborted()
    if (disposed) throw new Error('List-agents snapshot barrier disposed')
    return next()
  })
}
