import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, it, onTestFinished } from 'vitest'
import { runSdkSnapshotLifecycle } from './sdk-snapshot-lifecycle.ts'

it('an outer rejection does not run a suspended operation finally', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sdk-cleanup-control-'))
  const child = spawn(process.execPath, ['-e', "process.send('ready'); setInterval(() => {}, 1000)"], {
    cwd: root, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  })
  const exited = once(child, 'exit')
  const wait = Promise.withResolvers<undefined>()
  let finalized = false
  const operation = (async () => {
    try { await wait.promise } finally { finalized = true }
  })()
  try {
    await once(child, 'message')
    await expect(Promise.race([operation, Promise.reject(new Error('outer timeout'))]))
      .rejects.toThrow('outer timeout')
    expect(finalized).toBe(false)
    expect(child.exitCode).toBeNull()
    expect(child.signalCode).toBeNull()
  } finally {
    child.kill()
    await exited
    wait.resolve(undefined)
    await operation
    await rm(root, { recursive: true, force: true })
  }
})

it('cleans normal and failed operations once and leaves adjacent roots untouched', async () => {
  for (const fails of [false, true]) {
    const root = await mkdtemp(join(tmpdir(), 'sdk-cleanup-owned-'))
    const neighbor = await mkdtemp(join(tmpdir(), 'sdk-cleanup-neighbor-'))
    let finished: (() => Promise<void>) | undefined
    let closes = 0
    let subscriptions = 0
    const failure = new Error('scenario failure')
    try {
      const result = runSdkSnapshotLifecycle(root, (hook) => { finished = hook }, async (scope) => {
        await scope.startRuntime({ start: async () => {}, close: async () => { closes++ } })
        scope.ownSubscription({ close: () => { subscriptions++ } })
        if (fails) throw failure
        return 'result'
      })
      if (fails) await expect(result).rejects.toBe(failure)
      else await expect(result).resolves.toBe('result')
      await Promise.all([finished?.(), finished?.()])
      expect(closes).toBe(1)
      expect(subscriptions).toBe(1)
      expect(existsSync(root)).toBe(false)
      expect(existsSync(neighbor)).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(neighbor, { recursive: true, force: true })
    }
  }
})

it('waits for suspended operation cleanup before removing its root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sdk-cleanup-settle-'))
  const ready = Promise.withResolvers<undefined>()
  const notification = Promise.withResolvers<undefined>()
  const reading = Promise.withResolvers<undefined>()
  const release = Promise.withResolvers<undefined>()
  let finished: (() => Promise<void>) | undefined
  const operation = runSdkSnapshotLifecycle(root, (hook) => { finished = hook }, async (scope) => {
    scope.ownSubscription({ close: () => { notification.reject(new Error('closed')) } })
    ready.resolve(undefined)
    try {
      await notification.promise
    } finally {
      reading.resolve(undefined)
      await release.promise
      await writeFile(join(root, 'final-read-evidence'), 'owned')
    }
  })
  const failure = expect(operation).rejects.toThrow('closed')
  try {
    await ready.promise
    const cleaned = finished?.()
    await reading.promise
    expect(existsSync(root)).toBe(true)
    release.resolve(undefined)
    await cleaned
    await failure
    expect(existsSync(root)).toBe(false)
  } finally {
    release.resolve(undefined)
    await finished?.()
  }
})

it('does not start a runtime after a test ends during setup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sdk-cleanup-setup-'))
  const setup = Promise.withResolvers<undefined>()
  const release = Promise.withResolvers<undefined>()
  let finished: (() => Promise<void>) | undefined
  let starts = 0
  const operation = runSdkSnapshotLifecycle(root, (hook) => { finished = hook }, async (scope) => {
    setup.resolve(undefined)
    await release.promise
    await scope.startRuntime({ start: async () => { starts++ }, close: async () => {} })
  })
  const failure = expect(operation).rejects.toThrow('SDK snapshot test finished')
  try {
    await setup.promise
    const cleaned = finished?.()
    expect(existsSync(root)).toBe(true)
    release.resolve(undefined)
    await cleaned
    await failure
    expect(starts).toBe(0)
    expect(existsSync(root)).toBe(false)
  } finally {
    release.resolve(undefined)
    await finished?.()
  }
})

it('retains the root and both errors when runtime shutdown fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sdk-cleanup-failure-'))
  const original = new Error('operation failed')
  const closing = new Error('not reaped')
  try {
    const result = runSdkSnapshotLifecycle(root, () => {}, async (scope) => {
      await scope.startRuntime({ start: async () => {}, close: async () => { throw closing } })
      throw original
    })
    await expect(result).rejects.toMatchObject({ errors: [original, closing] })
    expect(existsSync(root)).toBe(true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

const timeoutRoot = process.env.DSH_SDK_CLEANUP_TEST_ROOT
let timeoutChild: ReturnType<typeof spawn> | undefined
let timeoutExited: Promise<unknown> | undefined
let timeoutStarted: Promise<void> | undefined
let timeoutClosing: Promise<void> | undefined
const timeoutRuntime = {
  start(): Promise<void> {
    timeoutStarted ??= (async () => {
      if (timeoutRoot === undefined) throw new Error('missing test root')
      timeoutChild = spawn(process.execPath, ['-e', "process.on('disconnect', () => process.exit(0)); process.send('ready'); setInterval(() => {}, 1000)"], {
        cwd: timeoutRoot, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      })
      timeoutExited = once(timeoutChild, 'exit')
      await Promise.race([
        once(timeoutChild, 'message'),
        timeoutExited.then(() => { throw new Error('owned child exited before readiness') }),
      ])
      const pidFile = process.env.DSH_SDK_CLEANUP_TEST_PID_FILE
      if (pidFile === undefined) throw new Error('missing PID evidence path')
      await writeFile(pidFile, String(timeoutChild.pid))
    })()
    return timeoutStarted
  },
  close(): Promise<void> {
    timeoutClosing ??= (async () => {
      if (timeoutChild?.exitCode === null && timeoutChild.signalCode === null) timeoutChild.kill()
      await timeoutExited
    })()
    return timeoutClosing
  },
}

// Startup uses the ordinary hook budget; the case deadline measures only the ready wait.
beforeAll(async () => {
  if (timeoutRoot !== undefined) await timeoutRuntime.start()
})
afterAll(async () => {
  if (timeoutRoot !== undefined) await timeoutRuntime.close()
})

it.skipIf(timeoutRoot === undefined)('timeout cleanup child', async () => {
  if (timeoutRoot === undefined) throw new Error('missing test root')
  const wait = Promise.withResolvers<undefined>()
  const runtime = timeoutRuntime
  if (process.env.DSH_SDK_CLEANUP_TEST_LEGACY === '1') {
    let reachedFinally = false
    const operation = (async () => {
      try {
        await runtime.start()
        await wait.promise
      } finally {
        reachedFinally = true
        await runtime.close()
        await rm(timeoutRoot, { recursive: true, force: true })
      }
    })()
    onTestFinished(async () => {
      try {
        expect(reachedFinally).toBe(false)
        expect(timeoutChild?.exitCode).toBeNull()
        expect(timeoutChild?.signalCode).toBeNull()
        expect(existsSync(timeoutRoot)).toBe(true)
        const pidFile = process.env.DSH_SDK_CLEANUP_TEST_PID_FILE
        if (pidFile === undefined) throw new Error('missing PID evidence path')
        await writeFile(`${pidFile}.legacy`, 'outer timeout left operation suspended')
      } finally {
        // This test-owned fallback releases the negative control without orphaning its child.
        wait.resolve(undefined)
        await operation
      }
    })
    await operation
    return
  }
  await runSdkSnapshotLifecycle(timeoutRoot, (hook) => { onTestFinished(hook) }, async (scope) => {
    await scope.startRuntime(runtime)
    scope.ownSubscription({ close: () => { wait.reject(new Error('subscription closed')) } })
    await wait.promise
  })
}, 1_000)

it.skipIf(timeoutRoot !== undefined)('reaps only its owned process after a real Vitest timeout', async () => {
  for (const legacy of [true, false]) {
    const control = await mkdtemp(join(tmpdir(), 'sdk-cleanup-timeout-'))
    const root = await mkdtemp(join(control, 'owned-'))
    const pidFile = join(control, 'pid')
    const runner = spawn(process.execPath, [
      'node_modules/vitest/vitest.mjs', 'run', 'scripts/sdk-snapshot-lifecycle.spec.ts', '-t', '^timeout cleanup child$',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DSH_SDK_CLEANUP_TEST_ROOT: root, DSH_SDK_CLEANUP_TEST_PID_FILE: pidFile, DSH_SDK_CLEANUP_TEST_LEGACY: legacy ? '1' : '0' },
    })
    const runnerExited = new Promise<number | null>((resolve) => { runner.once('exit', resolve) })
    const stopRunner = async (): Promise<void> => {
      if (runner.exitCode === null && runner.signalCode === null) runner.kill()
      await runnerExited
    }
    onTestFinished(stopRunner)
    let output = ''
    runner.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
    runner.stderr.on('data', (chunk: Buffer) => { output += chunk.toString() })
    try {
      const code = await runnerExited
      const ownedPid = Number(await readFile(pidFile, 'utf8'))
      expect(code, output).toBe(1)
      expect(output).toContain('Test timed out in 1000ms')
      expect(existsSync(root)).toBe(false)
      expect(() => process.kill(ownedPid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }))
      expect(existsSync(`${pidFile}.legacy`)).toBe(legacy)
    } finally {
      await stopRunner()
      await rm(control, { recursive: true, force: true })
    }
  }
}, 30_000)
