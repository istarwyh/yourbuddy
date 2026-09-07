/** Model-visible page context captured with one ordinary user submission. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Occurrence } from './input.ts'

/** Frozen composer values supplied before any asynchronous reference serialization. */
export interface ConversationContextRequest {
  readonly sessionId: SessionId
  readonly draft: string
  readonly occurrences: readonly Occurrence[]
  readonly signal: AbortSignal
}

/** Frozen attachment metadata and model text stored together in the user message. */
export interface ConversationContextAttachment {
  readonly text: string
  /** Localized title for this captured page, overriding the registration label. */
  readonly label: string
  /** Human-readable captured summary shown instead of protocol text when expanded. */
  readonly description?: string
}

/** A contribution can keep its registration label or supply per-message display metadata. */
export type ConversationContextResult = string | ConversationContextAttachment | undefined

/** A View-owned contribution to the same durable user message as the submitted draft. */
export interface ConversationContextContribution {
  readonly id: string
  readonly viewId: string
  /** Localized source label shown beside the user's unchanged message. */
  readonly label: string
  /** Maximum preparation duration; expiry rejects the send and preserves its draft. */
  readonly timeoutMs: number
  /**
   * Capture page and selection identity synchronously, then optionally resolve that snapshot.
   * Only the selected Session's selected View contributes. Explicit references remain
   * consumer-owned; inspect draft and occurrences before selecting implicit context.
   * @param request - frozen composer values and cancellation for this preparation.
   * @returns additional model text with optional frozen display metadata, or undefined to omit context.
   */
  prepare(request: ConversationContextRequest): ConversationContextResult | Promise<ConversationContextResult>
}

/** Public registration surface; callers own its disposer through a Cordis effect. */
export interface ConversationContexts {
  /**
   * Register one unique contributor; unload removes it and cancels pending preparations.
   * @param contribution - View identity, explicit deadline, and synchronous snapshot callback.
   * @returns idempotent disposer to return from the caller's ctx.effect().
   */
  register(contribution: ConversationContextContribution): () => void
}

/** Package-internal preparation retained by one detached composer attempt. */
export interface PreparedConversationContext {
  readonly content: Promise<readonly string[]>
  readonly signal: AbortSignal
  /** Release cancellation ownership once this message's durable admission is observed. */
  admitted(): void
  /** Release pending contribution work when the owning attempt settles. */
  dispose(): void
}
