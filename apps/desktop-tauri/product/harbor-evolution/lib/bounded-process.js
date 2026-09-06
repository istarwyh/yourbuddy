import { spawn } from 'node:child_process'
import { dockerDesktopAwareEnv } from './process.js'

const DEFAULT_TIMEOUT_MS = 30 * 60_000
const DEFAULT_OUTPUT_BYTES = 1024 * 1024
const MAX_TIMER_MS = 2_147_483_647

function processError(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code })
}

function integerOption(value, fallback, minimum, maximum, name) {
  const selected = value ?? fallback
  if (!Number.isSafeInteger(selected) || selected < minimum || selected > maximum) {
    throw processError('HARBOR_PROCESS_INVALID_OPTIONS', `${name} is outside the supported bounds.`)
  }
  return selected
}

function decodeBounded(chunks) {
  const raw = Buffer.concat(chunks)
  const decoded = raw.toString('utf8')
  const encoded = Buffer.from(decoded, 'utf8')
  if (encoded.length <= raw.length) return decoded
  // Invalid/incomplete UTF-8 expands into replacement characters. Keep even
  // the returned text within the original byte budget, at a code-point edge.
  let end = raw.length
  while (end > 0 && (encoded[end] & 0xc0) === 0x80) end -= 1
  return encoded.subarray(0, end).toString('utf8')
}

/**
 * Run a controller-owned, bounded subprocess. No command/arguments or Abort
 * reasons are copied into public error messages. Output in error.result is
 * bounded but still private diagnostic data: the caller must redact it.
 *
 * POSIX children get their own process group, so cancellation also signals
 * descendants that remain in that group. Windows supports direct-child
 * cancellation only; this is not a Windows process-tree isolation boundary.
 * A descendant that deliberately starts a new process group is outside this
 * primitive's ownership boundary and requires a separate sandbox supervisor.
 */
export function runBoundedProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let timeoutMs, maxOutputBytes, killGraceMs
    try {
      timeoutMs = integerOption(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1, MAX_TIMER_MS, 'timeoutMs')
      maxOutputBytes = integerOption(options.maxOutputBytes, DEFAULT_OUTPUT_BYTES, 0, 64 * 1024 * 1024, 'maxOutputBytes')
      const maxInputBytes = integerOption(options.maxInputBytes, DEFAULT_OUTPUT_BYTES, 0, 64 * 1024 * 1024, 'maxInputBytes')
      killGraceMs = integerOption(options.killGraceMs, 1500, 1, 30_000, 'killGraceMs')
      if (options.input !== undefined && typeof options.input !== 'string' && !Buffer.isBuffer(options.input) && !(options.input instanceof Uint8Array)) {
        throw processError('HARBOR_PROCESS_INVALID_OPTIONS', 'input must be text or bytes.')
      }
      if (options.input !== undefined && Buffer.byteLength(options.input) > maxInputBytes) {
        throw processError('HARBOR_PROCESS_INPUT_LIMIT', 'Process input exceeded its byte budget.')
      }
      if (options.signal && (typeof options.signal.addEventListener !== 'function' || typeof options.signal.removeEventListener !== 'function')) {
        throw processError('HARBOR_PROCESS_INVALID_OPTIONS', 'signal must be an AbortSignal.')
      }
      if (options.onSpawn !== undefined && typeof options.onSpawn !== 'function') {
        throw processError('HARBOR_PROCESS_INVALID_OPTIONS', 'onSpawn must be a function.')
      }
      if (options.allowedExitCodes !== undefined && (!Array.isArray(options.allowedExitCodes) || options.allowedExitCodes.some(code => !Number.isInteger(code)))) {
        throw processError('HARBOR_PROCESS_INVALID_OPTIONS', 'allowedExitCodes must contain integer exit codes.')
      }
    } catch (error) { reject(error); return }

    if (options.signal?.aborted) {
      reject(processError('HARBOR_PROCESS_ABORTED', 'Execution was cancelled before launch.'))
      return
    }

    const posixGroup = process.platform !== 'win32'
    let child
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: dockerDesktopAwareEnv(options.env ?? process.env),
        shell: false,
        detached: posixGroup,
        windowsHide: true,
        stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      })
    } catch {
      reject(processError('HARBOR_PROCESS_SPAWN_FAILED', 'The evaluation process could not be started.'))
      return
    }

    const stdout = [], stderr = []
    let retainedBytes = 0
    let closed = false, settled = false, terminating = false, terminationFinished = false
    let exitCode = null, exitSignal = null, terminalError, killTimer, deadline
    let spawnHookPending = false, groupRetired = false

    const groupExists = () => {
      if (!posixGroup || !child.pid || groupRetired) return false
      try { process.kill(-child.pid, 0); return true }
      catch (error) { return error.code !== 'ESRCH' }
    }
    const signalOwnedProcess = signal => {
      // Once the owned group disappeared, never signal a potentially reused
      // pid/group id while an asynchronous checkpoint is still pending.
      if (groupRetired) return
      if (posixGroup && child.pid) {
        try { process.kill(-child.pid, signal); return }
        catch (error) { if (error.code !== 'ESRCH') return }
      }
      // Failed spawns have no pid; Windows uses the direct child only.
      if (!closed && child.pid) {
        try { child.kill(signal) } catch {}
      }
    }
    const finish = () => {
      if (settled || !closed || (terminating && !terminationFinished) || (spawnHookPending && !terminalError)) return
      settled = true
      clearTimeout(deadline)
      clearTimeout(killTimer)
      options.signal?.removeEventListener('abort', abort)
      const result = { code: exitCode, stdout: decodeBounded(stdout), stderr: decodeBounded(stderr) }
      if (!terminalError && !(options.allowedExitCodes ?? [0]).includes(exitCode)) {
        terminalError = processError('HARBOR_PROCESS_EXIT_FAILED', exitSignal ? 'The evaluation process was terminated by a signal.' : 'The evaluation process exited unsuccessfully.')
      }
      if (terminalError) reject(Object.assign(terminalError, { result }))
      else resolve(result)
    }
    const terminate = error => {
      if (settled) return
      terminalError ??= error
      if (terminating) return
      terminating = true
      signalOwnedProcess('SIGTERM')
      killTimer = setTimeout(() => {
        signalOwnedProcess('SIGKILL')
        terminationFinished = true
        // Never resolve/reject until the actual ChildProcess close event.
        finish()
      }, killGraceMs)
    }
    const abort = () => terminate(processError('HARBOR_PROCESS_ABORTED', 'Execution was cancelled.'))
    const capture = target => chunk => {
      const available = Math.max(0, maxOutputBytes - retainedBytes)
      if (available > 0) {
        const retained = chunk.subarray(0, available)
        target.push(retained)
        retainedBytes += retained.length
      }
      if (chunk.length > available) terminate(processError('HARBOR_PROCESS_OUTPUT_LIMIT', 'Combined process output exceeded its byte budget.'))
    }
    child.stdout.on('data', capture(stdout))
    child.stderr.on('data', capture(stderr))
    child.once('spawn', () => {
      if (!options.onSpawn) return
      spawnHookPending = true
      Promise.resolve().then(() => options.onSpawn(child.pid)).then(
        () => { spawnHookPending = false; finish() },
        () => { spawnHookPending = false; terminate(processError('HARBOR_PROCESS_CHECKPOINT_FAILED', 'The process ownership checkpoint could not be recorded.')); finish() },
      )
    })
    child.once('error', () => {
      // Even ENOENT is followed by close; keep a single lifecycle boundary.
      terminalError ??= processError('HARBOR_PROCESS_SPAWN_FAILED', 'The evaluation process could not be started.')
      if (child.pid) terminate(terminalError)
    })
    child.once('close', (code, signal) => {
      closed = true
      exitCode = code
      exitSignal = signal
      // A successful parent must not leave background work in its owned group.
      const hasDescendants = groupExists()
      if (!hasDescendants) groupRetired = true
      if (!terminating && hasDescendants) terminate()
      if (terminating && !hasDescendants) {
        clearTimeout(killTimer)
        terminationFinished = true
      }
      finish()
    })
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    deadline = setTimeout(() => terminate(processError('HARBOR_PROCESS_TIMEOUT', 'Execution exceeded its time budget.')), timeoutMs)
    if (child.stdin) {
      child.stdin.on('error', error => {
        // EPIPE means the child has already stopped reading; close/exit still
        // decides the result. Other pipe failures stop the owned process.
        if (error.code !== 'EPIPE') terminate(processError('HARBOR_PROCESS_INPUT_FAILED', 'Process input could not be delivered.'))
      })
      child.stdin.end(options.input)
    }
  })
}
