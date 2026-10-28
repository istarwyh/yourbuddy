import { rm } from 'node:fs/promises'

interface SnapshotRuntime {
  start(): Promise<void>
  close(): Promise<void>
}

interface SnapshotSubscription {
  close(): void
}

/** Runtime resources owned by one SDK recorded-session scenario. */
export interface SdkSnapshotScope {
  /** Stops setup or later work when the test runner has ended the scenario. */
  readonly signal: AbortSignal
  /** Own the runtime before starting it, rejecting starts after test completion. */
  startRuntime(runtime: SnapshotRuntime): Promise<void>
  /** Own the root subscription so test completion releases pending notification waits. */
  ownSubscription<T extends SnapshotSubscription>(subscription: T): T
}

/**
 * Reap one SDK scenario on ordinary completion, failure, or an outer test timeout.
 * @param root - exclusively owned mkdtemp root; never a shared workspace.
 * @param registerFinished - the current test's onTestFinished registration.
 * @param execute - setup, runtime interaction, and final reads; must observe signal before later side effects.
 * @returns the scenario result, retaining its error if cleanup also fails.
 */
export function runSdkSnapshotLifecycle<T>(
  root: string,
  registerFinished: (cleanup: () => Promise<void>) => void,
  execute: (scope: SdkSnapshotScope) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  let runtime: SnapshotRuntime | undefined
  let subscription: SnapshotSubscription | undefined
  let stopped: Promise<void> | undefined
  let cleaned: Promise<void> | undefined
  const stop = (): Promise<void> => {
    stopped ??= Promise.resolve().then(async () => {
      try {
        subscription?.close()
      } finally {
        await runtime?.close()
      }
    })
    return stopped
  }
  const cleanup = (): Promise<void> => {
    controller.abort(new Error('SDK snapshot test finished'))
    cleaned ??= (async () => {
      await stop()
      // The caller receives the operation's error; this wait only establishes quiescence.
      try { await operation } catch (error) { void error }
      await rm(root, { recursive: true, force: true })
    })()
    return cleaned
  }
  registerFinished(cleanup)
  const scope: SdkSnapshotScope = {
    signal: controller.signal,
    async startRuntime(owned) {
      controller.signal.throwIfAborted()
      runtime = owned
      await owned.start()
      controller.signal.throwIfAborted()
    },
    ownSubscription(owned) {
      if (controller.signal.aborted) {
        owned.close()
        controller.signal.throwIfAborted()
      }
      subscription = owned
      return owned
    },
  }
  const operation = Promise.resolve().then(async () => {
    controller.signal.throwIfAborted()
    return execute(scope)
  })
  return operation.then(async (result) => {
    await cleanup()
    return result
  }, async (error: unknown) => {
    try {
      await cleanup()
    } catch (cleanupError: unknown) {
      if (cleanupError !== error) throw new AggregateError([error, cleanupError], 'SDK snapshot and cleanup failed')
    }
    throw error
  })
}
