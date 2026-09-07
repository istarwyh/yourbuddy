/** View-scoped context preparation for one atomic user-message admission. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  ConversationContextContribution, ConversationContextRequest, ConversationContextResult, ConversationContexts,
  PreparedConversationContext,
} from './contract/submission-context.ts'

/** Package-owned registry; registrations and preparations are independently disposable. */
export class ConversationContextRegistry implements ConversationContexts {
  private readonly entries = new Map<string, {
    readonly contribution: ConversationContextContribution
    readonly controller: AbortController
  }>()
  private readonly attempts = new Map<SessionId, Set<AbortController>>()

  /**
   * @param activeView - authoritative selected View, absent for a background Session.
   * @param failure - localized preparation cancellation and deadline messages.
   */
  constructor(
    private readonly activeView: (sessionId: SessionId) => string | undefined,
    private readonly failure: (reason: 'cancelled' | 'timeout') => string,
  ) {}

  /** @inheritdoc */
  register(contribution: ConversationContextContribution): () => void {
    if (this.entries.has(contribution.id)) throw new Error(`duplicate conversation context: ${contribution.id}`)
    if (!Number.isFinite(contribution.timeoutMs) || contribution.timeoutMs <= 0) {
      throw new Error(`invalid conversation context timeout: ${contribution.id}`)
    }
    const entry = { contribution, controller: new AbortController() }
    this.entries.set(contribution.id, entry)
    return () => {
      if (this.entries.get(contribution.id) !== entry) return
      this.entries.delete(contribution.id)
      entry.controller.abort()
    }
  }

  /**
   * Invoke all matching snapshot callbacks synchronously, before the caller yields.
   * @param request - the locked composer draft and Session identity.
   * @returns a bounded preparation, absent for commands or unrelated Views.
   */
  capture(request: ConversationContextRequest): PreparedConversationContext | undefined {
    if (request.draft.trimStart().startsWith('/')) return undefined
    const viewId = this.activeView(request.sessionId)
    const entries = [...this.entries.values()].filter(entry => entry.contribution.viewId === viewId)
    if (entries.length === 0) return undefined
    const controller = new AbortController()
    let attempts = this.attempts.get(request.sessionId)
    if (attempts === undefined) { attempts = new Set(); this.attempts.set(request.sessionId, attempts) }
    attempts.add(controller)
    const cancel = (): void => { controller.abort(new Error(this.failure('cancelled'))) }
    const lifetimes = [request.signal, ...entries.map(entry => entry.controller.signal)]
    const release = (): void => {
      controller.signal.removeEventListener('abort', release)
      for (const signal of lifetimes) signal.removeEventListener('abort', cancel)
      const current = this.attempts.get(request.sessionId)
      current?.delete(controller)
      if (current?.size === 0) this.attempts.delete(request.sessionId)
    }
    controller.signal.addEventListener('abort', release, { once: true })
    for (const signal of lifetimes) signal.addEventListener('abort', cancel, { once: true })
    if (lifetimes.some(signal => signal.aborted)) cancel()
    const pending = entries.map(entry => this.prepare(entry, request, controller.signal).then((result) => {
      if (result === undefined) return undefined
      const { text, label, description } = typeof result === 'string'
        ? { text: result, label: entry.contribution.label, description: undefined }
        : result
      if (text === '') return undefined
      const descriptionAttribute = description === undefined ? '' : ` description="${escapeAttribute(description)}"`
      return `<dsh-page-context source="${escapeAttribute(entry.contribution.id)}" label="${escapeAttribute(label)}"${descriptionAttribute}>\n${text}\n</dsh-page-context>`
    }))
    const content = Promise.all(pending).then(parts => parts.filter((text): text is string => text !== undefined))
    // A reference codec may still be serializing before the sink can observe this rejection.
    void content.catch(cancel)
    return { content, signal: controller.signal, admitted: release, dispose: cancel }
  }

  /**
   * Cancel only unadmitted context-backed submissions belonging to the stopped Session.
   * @param sessionId - Session whose pending context-backed submissions the user stopped.
   */
  cancelSession(sessionId: SessionId): void {
    const attempts = this.attempts.get(sessionId)
    if (attempts === undefined) return
    for (const controller of attempts) controller.abort(new Error(this.failure('cancelled')))
    this.attempts.delete(sessionId)
  }

  /** Cancel all pending work and remove every registration with the owning service. */
  dispose(): void {
    for (const id of this.attempts.keys()) this.cancelSession(id)
    for (const entry of this.entries.values()) entry.controller.abort()
    this.entries.clear()
  }

  private prepare(
    entry: { readonly contribution: ConversationContextContribution; readonly controller: AbortController },
    request: ConversationContextRequest,
    attemptSignal: AbortSignal,
  ): Promise<ConversationContextResult> {
    const controller = new AbortController()
    const signals = [request.signal, attemptSignal, entry.controller.signal]
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (outcome: { ok: true; value: ConversationContextResult } | { ok: false; error: unknown }): void => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        for (const signal of signals) signal.removeEventListener('abort', abort)
        if (!outcome.ok) {
          controller.abort()
          reject(outcome.error instanceof Error ? outcome.error : new Error(String(outcome.error)))
        } else resolve(outcome.value)
      }
      const abort = (): void => { finish({ ok: false, error: new Error(this.failure('cancelled')) }) }
      const timeout = setTimeout(() => { finish({ ok: false, error: new Error(this.failure('timeout')) }) }, entry.contribution.timeoutMs)
      if (signals.some(signal => signal.aborted)) { abort(); return }
      for (const signal of signals) signal.addEventListener('abort', abort, { once: true })
      try {
        const result = entry.contribution.prepare({ ...request, signal: controller.signal })
        Promise.resolve(result).then((value) => { finish({ ok: true, value }) }, (error: unknown) => { finish({ ok: false, error }) })
      } catch (error) { finish({ ok: false, error }) }
    })
  }
}

/** Preserve source labels as XML attribute data, never markup. */
function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&apos;')
}
