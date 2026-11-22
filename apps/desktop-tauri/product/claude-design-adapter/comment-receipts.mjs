import z from '@deepseek-ai/schemastery'

export const commentReceiptsKey = 'yourbuddy-design/comment-receipts'

/**
 * Restore receipt identity on resume and retain it when queued input is canceled.
 * @param ctx - Cordis context owning the projection registration and its disposal.
 * @returns the awaited reader; consumers publish only after registration resolves.
 */
export function registerCommentReceipts(ctx) {
  return ctx.sessionProjections.register({
    key: commentReceiptsKey,
    stateSchema: z.array(z.string()),
    stateVersion: 1,
    init: () => [],
    apply(state, event) {
      const messages = event.type === 'user/message' ? [event.data]
        : event.type === 'agent/inbox/spliced' ? event.data.inserted : []
      const ids = messages.map(message => message.id).filter(id => id.startsWith('yourbuddy-design:') && !state.includes(id))
      return ids.length ? [...state, ...new Set(ids)] : state
    },
  })
}
