/**
 * Production client composition without the page: mount the Loader over a
 * module system, create every manifest row, wait for quiescence, and audit
 * activation. `AppWebEntry` and the whole-client test carrier both call it.
 * @module @deepseek-ai/dsh-client-web/src/boot-client
 */
import type { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import type { BootManifest, ClientModuleLoader } from '@deepseek-ai/dsh-client-modules/client'
import { STATE_LABELS } from './loader-status.ts'

/** Client entries whose absence prevents the application shell from operating. */
const REQUIRED_CLIENT_ENTRIES = new Set([
  '@deepseek-ai/dsh-client-modules',
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-client-ui-renderer',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-session',
  '@deepseek-ai/dsh-client-ui-conversation',
])

/** Entry state label as the boot page renders it. */
export type EntryStateLabel = (typeof STATE_LABELS)[keyof typeof STATE_LABELS] | 'loading' | 'failed'

/** Inputs of {@link bootClient}. */
export interface ClientBootOptions {
  /** Fresh root Context that will own the plugin tree. */
  readonly ctx: Context
  /** Module system installed as `loader.internal`. */
  readonly modules: ClientModuleLoader
  /** Parsed manifest whose `plugins` rows become Loader entries (entry name = row id). */
  readonly manifest: BootManifest
  /** Per-entry state reporting (the boot page); omitted when no one renders progress. */
  readonly onEntryState?: (name: string, state: EntryStateLabel) => void
}

/**
 * Compose the client: `ctx.plugin(Loader)`, `loader.internal = modules`, one
 * `loader.create({ name })` per manifest row, `loader.await()`, then
 * {@link assertEntriesActive}. A row whose module cannot be imported is marked
 * failed; the Loader logs its import error and the audit applies the required
 * or optional startup policy with that error text.
 * @param options - context, module system, manifest, optional progress sink.
 * @returns resolves after required entries activate and optional failures are reported.
 */
export async function bootClient(options: ClientBootOptions): Promise<void> {
  const { ctx, manifest, onEntryState } = options
  await ctx.plugin(Loader)
  const loader = ctx.loader
  loader.internal = options.modules as never

  ctx.on('internal/status', (fiber) => {
    const entry = fiber.entry
    if (entry === undefined || entry.fiber === undefined) return
    onEntryState?.(entry.options.name, STATE_LABELS[entry.fiber.state])
  })

  const rows = manifest.plugins.map(row => row.id)
  for (const name of rows) onEntryState?.(name, 'loading')
  await options.modules.entries.start(loader, manifest)
  for (const entry of loader.entries()) {
    if (entry.fiber === undefined) onEntryState?.(entry.options.name, 'failed')
  }

  await loader.await()
  assertEntriesActive(ctx, options.modules, (diagnostic) => { ctx.logger.warn(diagnostic) })
}

/**
 * Reject required entries that failed import/apply or still wait on missing
 * services. Report other inactive entries without blocking the application.
 * @param ctx - root Context carrying the Loader.
 * @param modules - the module system whose recorded import failures name why an entry
 *   has no fiber; a row with no record points at the console.
 * @param warn - sink for optional-entry diagnostics.
 * @throws {Error} listing required non-active entries with their reasons.
 */
export function assertEntriesActive(
  ctx: Context,
  modules: Pick<ClientModuleLoader, 'importError'>,
  warn: (diagnostic: string) => void = () => {},
): void {
  const requiredFailures: string[] = []
  const optionalFailures: string[] = []
  for (const entry of ctx.loader.entries()) {
    const name = entry.options.name
    let failure: string
    if (entry.fiber === undefined) {
      const importError = modules.importError(name)
      failure = importError === undefined
        ? `${name}: import failed (see console for the import error)`
        : `${name}: import failed: ${importError.message}`
    } else {
      const state = STATE_LABELS[entry.fiber.state]
      if (state === 'active') continue
      if (state === 'pending') {
        const missing = Object.keys(entry.fiber.inject).filter(service => ctx.get(service) === undefined)
        failure = `${name}: pending (waiting for service${missing.length === 1 ? '' : 's'}: ${missing.join(', ') || 'unknown'})`
      } else {
        failure = `${name}: ${state}`
      }
    }
    const failures = REQUIRED_CLIENT_ENTRIES.has(name) ? requiredFailures : optionalFailures
    failures.push(failure)
  }
  if (requiredFailures.length > 0) {
    throw new Error(`web boot: ${String(requiredFailures.length)} required entr${requiredFailures.length === 1 ? 'y' : 'ies'} did not activate\n${requiredFailures.join('\n')}`)
  }
  if (optionalFailures.length > 0) {
    warn(`web boot: ${String(optionalFailures.length)} optional entr${optionalFailures.length === 1 ? 'y' : 'ies'} did not activate\n${optionalFailures.join('\n')}`)
  }
}
