// @vitest-environment jsdom
/** Sidebar reference insertion through the conversation owner's scoped event. */
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { makeTranslate, SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { ConversationController } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ComposerBlockRegistry } from '../../../packages/client/ui-conversation/src/client/input/blocks.ts'
import { InputHub } from '../../../packages/client/ui-conversation/src/client/input/hub.ts'
import { zh } from '../../../packages/client/ui-conversation/src/client/locales.ts'
import { insertFileReference } from '../product/dsh-better-sidebar/src/client/conversation-draft.ts'

async function bench() {
  const runtime = await SlotTestRuntime.create()
  const references: SessionReference[] = []
  onTestFinished(async () => {
    for (const reference of references) reference.release()
    await runtime.dispose()
  })
  const ownerId = SessionId('reference-owner')
  const otherId = SessionId('reference-other')
  for (const id of [ownerId, otherId]) {
    await runtime.sessions.add({ id })
    const reference = runtime.sessions.retain(id)
    references.push(reference)
    await reference.ready
  }
  const hub = new InputHub(runtime.ctx, makeTranslate(zh, {}))
  await runtime.ctx.plugin(ConversationController, {
    input: hub,
    blocks: new ComposerBlockRegistry(),
    activeView: () => 'page',
    contextFailure: reason => `context ${reason}`,
    maxConcurrentFileUploads: 2,
  }).await()
  const owner = runtime.sessions.scope(ownerId)!
  const other = runtime.sessions.scope(otherId)!
  const otherInput = hub.for(other)
  const input = hub.for(owner)
  input.setDraft('inspect ')
  otherInput.setDraft('other draft')
  return { runtime, ownerId, owner, other, input, otherInput }
}

describe('Better Sidebar composer file references', () => {
  it('inserts once in the requested Session with the original reference and revision span', async () => {
    const b = await bench()
    const before = b.input.state.getSnapshot()
    const otherBefore = b.otherInput.state.getSnapshot()
    const insert = vi.spyOn(b.input, 'insertReference')
    const otherInsert = vi.spyOn(b.otherInput, 'insertReference')
    const later = vi.fn(() => undefined)
    const otherListener = vi.fn(() => undefined)
    b.owner.on('slash/input-insert-reference', later)
    b.other.on('slash/input-insert-reference', otherListener)

    expect(insertFileReference(b.runtime.ctx, b.ownerId, 'notes/my file.ts')).toBe(true)

    expect(insert).toHaveBeenCalledExactlyOnceWith({
      source: 'reference',
      ref: '@"notes/my file.ts"',
      label: 'my file.ts',
      appearance: 'file',
      clipboardText: '@"notes/my file.ts"',
    }, {
      draftRev: before.draftRev,
      start: before.draft.length,
      end: before.draft.length,
    })
    expect(b.input.state.getSnapshot().occurrences).toHaveLength(1)
    expect(b.input.state.getSnapshot().draftRev).not.toBe(before.draftRev)
    expect(later).not.toHaveBeenCalled()
    expect(otherListener).not.toHaveBeenCalled()
    expect(otherInsert).not.toHaveBeenCalled()
    expect(b.otherInput.state.getSnapshot()).toBe(otherBefore)
  })

  it('returns false and leaves both drafts unchanged when the editor declines the insertion', async () => {
    const b = await bench()
    const before = b.input.state.getSnapshot()
    const otherBefore = b.otherInput.state.getSnapshot()
    const insert = vi.spyOn(b.input, 'insertReference').mockReturnValue(false)

    expect(insertFileReference(b.runtime.ctx, b.ownerId, 'readme.md')).toBe(false)

    expect(insert).toHaveBeenCalledOnce()
    expect(b.input.state.getSnapshot()).toBe(before)
    expect(b.otherInput.state.getSnapshot()).toBe(otherBefore)
  })
})
