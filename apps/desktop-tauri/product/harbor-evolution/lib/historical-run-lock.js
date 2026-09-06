import { realpathSync } from 'node:fs'
import path from 'node:path'

const LOCKED_MESSAGE = 'HISTORICAL_JOB_ALREADY_RUNNING: wait for the current Historical Session Job to finish'

function lockError(code, message) {
  const error = new Error(`${code}: ${message}`)
  error.code = code
  return error
}

function realpathIfPresent(value) {
  try {
    return realpathSync.native(value)
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw lockError('HISTORICAL_LOCK_SCOPE_INVALID', 'the Historical workspace path could not be resolved safely')
  }
}

function realpathFromDeepestExistingAncestor(value) {
  let current = path.resolve(value)
  const missingSegments = []
  while (true) {
    const physical = realpathIfPresent(current)
    if (physical) return path.resolve(physical, ...missingSegments)
    const parent = path.dirname(current)
    if (parent === current) {
      throw lockError('HISTORICAL_LOCK_SCOPE_INVALID', 'the Historical workspace path has no resolvable ancestor')
    }
    missingSegments.unshift(path.basename(current))
    current = parent
  }
}

/**
 * Resolve the write target used by Historical evaluation. The absolute Jobs
 * directory, rather than a UI workspace label, is the collision boundary:
 * nested project roots that point at the same directory must share a lock.
 */
export function historicalRunScope(config = {}) {
  const projectRoot = String(config.projectRoot ?? '')
  const jobsDir = String(config.jobsDir ?? 'jobs')
  if (!projectRoot || !path.isAbsolute(projectRoot)) {
    throw lockError('HISTORICAL_LOCK_SCOPE_INVALID', 'projectRoot must be an absolute path')
  }
  if (!jobsDir) {
    throw lockError('HISTORICAL_LOCK_SCOPE_INVALID', 'jobsDir must be a non-empty path inside projectRoot')
  }
  const root = path.resolve(projectRoot)
  const target = path.resolve(root, jobsDir)
  const relative = path.relative(root, target)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw lockError('HISTORICAL_LOCK_SCOPE_INVALID', 'jobsDir must stay inside projectRoot')
  }
  return realpathFromDeepestExistingAncestor(target)
}

/** Process-local, fail-closed lease registry for Historical Job writers. */
export class HistoricalRunLock {
  constructor() {
    this.active = new Map()
  }

  acquire(config, owner = {}) {
    const scope = historicalRunScope(config)
    if (this.active.has(scope)) {
      const error = new Error(LOCKED_MESSAGE)
      error.code = 'HISTORICAL_JOB_ALREADY_RUNNING'
      throw error
    }

    const token = Symbol('historical-run-lease')
    this.active.set(scope, { token, owner: { ...owner } })
    let released = false
    return Object.freeze({
      scope,
      release: () => {
        if (released) return false
        released = true
        const current = this.active.get(scope)
        if (current?.token === token) this.active.delete(scope)
        return true
      },
    })
  }

  async runExclusive(config, task, owner = {}) {
    if (typeof task !== 'function') {
      throw lockError('HISTORICAL_LOCK_TASK_INVALID', 'the protected operation must be a function')
    }
    const lease = this.acquire(config, owner)
    try {
      return await task()
    } finally {
      lease.release()
    }
  }
}

/** Shared across every Harbor plugin/controller instance in this Node process. */
export const historicalRunLock = new HistoricalRunLock()
