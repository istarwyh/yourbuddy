import { rm } from 'node:fs/promises'

interface SnapshotRuntime {
  start(): Promise<void>
  close(): Promise<void>
}

interface SnapshotSubscription {
  close(): void
}

/** Diagnostic phases contain no scenario paths or session identifiers. */
export type SdkSnapshotPhase = 'setup' | 'runtime-start' | 'session-run' | 'turn-end'
  | 'post-turn-event' | 'runtime-close' | 'persisted-output' | 'cleanup-root'

/** Only lifecycle event names are retained; all other wire event types become `other`. */
export type SdkSnapshotEvent = 'turn/start' | 'turn/end' | 'step/start' | 'step/end' | 'other'

interface SnapshotObservation {
  event: SdkSnapshotEvent
  turn: number | undefined
}

/** Runtime resources owned by one SDK recorded-session scenario. */
export interface SdkSnapshotScope {
  /** Stops setup or later work when the test runner has ended the scenario. */
  readonly signal: AbortSignal
  /** Record the current wait without retaining payloads; turn is the expected fixture turn. */
  phase(phase: SdkSnapshotPhase, turn?: number): void
  /** Retain at most eight lifecycle event types and turn numbers, never notification payloads. */
  observe(event: SdkSnapshotEvent, turn?: number): void
  /** Own the runtime before starting it, rejecting starts after test completion. */
  startRuntime(runtime: SnapshotRuntime): Promise<void>
  /** Own the root subscription so test completion releases pending notification waits. */
  ownSubscription<T extends SnapshotSubscription>(subscription: T): T
}

/**
 * Reap one SDK scenario on ordinary completion, failure, or an outer test timeout.
 * Scenario execution failures and unfinished test completion emit one bounded phase/event diagnostic.
 * The diagnostic identifies the observed wait, not the cause of an earlier CI failure.
 * Successful scenarios emit nothing; reporting errors never replace scenario or cleanup errors.
 * @param root - exclusively owned mkdtemp root; never a shared workspace.
 * @param registerFinished - the current test's onTestFinished registration.
 * @param execute - setup, runtime interaction, and final reads; must observe signal before later side effects.
 * @param report - synchronous diagnostic sink; receives no paths, session identifiers, or error messages.
 * @returns the scenario result, retaining its error if cleanup also fails.
 */
export function runSdkSnapshotLifecycle<T>(
  root: string,
  registerFinished: (cleanup: () => Promise<void>) => void,
  execute: (scope: SdkSnapshotScope) => Promise<T>,
  report: (diagnostic: string) => void = (diagnostic) => { console.error(diagnostic) },
): Promise<T> {
  let phase: SdkSnapshotPhase = 'setup'
  let turn: number | undefined
  const events: SnapshotObservation[] = []
  let settled = false
  let reported = false
  const diagnose = (): void => {
    if (reported) return
    reported = true
    try {
      report(`SDK snapshot diagnostic: ${JSON.stringify({ phase, turn, events })}`)
    } catch (error) { void error /* Diagnostics must not interfere with teardown or the original failure. */ }
  }
  const controller = new AbortController()
  let runtime: SnapshotRuntime | undefined
  let subscription: SnapshotSubscription | undefined
  let stopped: Promise<void> | undefined
  let cleaned: Promise<void> | undefined
  const stop = (): Promise<void> => {
    stopped ??= Promise.resolve().then(async () => {
      phase = 'runtime-close'
      turn = undefined
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
      phase = 'cleanup-root'
      turn = undefined
      await rm(root, { recursive: true, force: true })
    })()
    return cleaned
  }
  registerFinished(async () => {
    if (!settled) diagnose()
    await cleanup()
  })
  const scope: SdkSnapshotScope = {
    signal: controller.signal,
    phase(value, expectedTurn) { phase = value; turn = expectedTurn },
    observe(event, observedTurn) {
      events.push({ event, turn: observedTurn })
      if (events.length > 8) events.shift()
    },
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
    try {
      await cleanup()
    } catch (error) {
      diagnose()
      throw error
    } finally {
      settled = true
    }
    return result
  }, async (error: unknown) => {
    settled = true
    diagnose()
    try {
      await cleanup()
    } catch (cleanupError: unknown) {
      if (cleanupError !== error) throw new AggregateError([error, cleanupError], 'SDK snapshot and cleanup failed')
    }
    throw error
  })
}
