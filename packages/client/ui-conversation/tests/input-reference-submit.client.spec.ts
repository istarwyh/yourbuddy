/**
 * Reference-submit transaction coverage: chips serialize through their
 * owner, stay resident through Host rejection, and clear only after an
 * accepted prompt.
 */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { InputTriggerController, SubmitOutcome } from '../src/client/contract/input.ts'
import { SessionInputShell } from '../src/client/input/facade.ts'
import type { DraftAttachmentId } from '../src/client/contract/input.ts'

const mention = '@[Research](dsh-session:InNvdXJjZSI)'
const spacedMention = '@[Research notes](dsh-session:InNvdXJjZSI)'
const commandImages = {
  serialize: () => Promise.resolve([]),
  release: () => {},
  unsupportedNotice: (token: string) => `${token.trim()} images-unsupported`,
}

function chip(shell: SessionInputShell): void {
  shell.setDraft('@res')
  const accepted = shell.insertReference({
    source: 'reference',
    ref: mention,
    label: 'Research',
    clipboardText: mention,
  }, {
    start: 0,
    end: 4,
    draftRev: shell.snapshot.draftRev,
  })
  expect(accepted).toBe(true)
}

describe('reference submission', () => {
  it('freezes page context before an explicit chip serializer yields, preserving the original draft and chip identity', async () => {
    let resolveReference: (text: string) => void = () => {}
    let page = 'first page'
    const dispose = vi.fn()
    const prepareContext = vi.fn(() => {
      const captured = page
      return { content: Promise.resolve([captured]), signal: new AbortController().signal, admitted: () => {}, dispose }
    })
    const sink = vi.fn(async (_text: string, _ids: readonly DraftAttachmentId[], _mode: 'queue' | 'steer', _signal: AbortSignal, prepared?: { content: Promise<readonly string[]> }) => {
      expect(await prepared?.content).toEqual(['first page'])
      return { kind: 'success' as const }
    })
    const inputTriggers = {
      serializeReference: () => new Promise<string>((resolve) => { resolveReference = resolve }),
      track: vi.fn(),
      lexicon: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    } as unknown as InputTriggerController
    const shell = new SessionInputShell({
      actx: {} as Context, inputTriggers: () => inputTriggers, prepareContext, defaultSink: sink, commandImages,
    })
    chip(shell)
    shell.submit()
    expect(prepareContext).toHaveBeenCalledWith(`${mention} `, [expect.objectContaining({ source: 'reference', ref: mention })], expect.any(AbortSignal))
    expect(shell.snapshot.draft).toBe('')
    page = 'later page'
    resolveReference('explicit reference')
    await vi.waitFor(() => { expect(sink).toHaveBeenCalledWith('explicit reference', [], 'queue', expect.any(AbortSignal), expect.any(Object)) })
    await vi.waitFor(() => { expect(dispose).toHaveBeenCalledOnce() })
    shell.dispose()
  })

  it('cancels page preparation when an explicit reference codec rejects', async () => {
    const dispose = vi.fn()
    const prepared = { content: Promise.resolve(['page']), signal: new AbortController().signal, admitted: () => {}, dispose }
    const inputTriggers = {
      serializeReference: () => Promise.reject(new Error('codec failed')),
      track: vi.fn(),
      lexicon: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    } as unknown as InputTriggerController
    const sink = vi.fn()
    const shell = new SessionInputShell({
      actx: {} as Context, inputTriggers: () => inputTriggers, prepareContext: () => prepared, defaultSink: sink, commandImages,
    })
    chip(shell)
    shell.submit()
    await vi.waitFor(() => { expect(shell.snapshot.occurrences).toHaveLength(1) })
    expect(dispose).toHaveBeenCalledOnce()
    expect(sink).not.toHaveBeenCalled()
    shell.dispose()
  })

  it('mirrors canonical reference text so a persisted draft remains resolvable after remount', async () => {
    const mirror = vi.fn()
    const first = new SessionInputShell({
      actx: {} as Context,
      defaultSink: vi.fn(),
      commandImages,
    })
    first.bindMirror(mirror)
    first.setDraft('@res')
    expect(first.insertReference({
      source: 'reference',
      ref: spacedMention,
      label: 'Research notes',
      appearance: 'session',
      clipboardText: spacedMention,
    }, {
      start: 0,
      end: 4,
      draftRev: first.snapshot.draftRev,
    })).toBe(true)
    // InputState.draft IS the clipboard projection now (chips expand to their
    // canonical text); the display label lives in the chip's decorator DOM.
    expect(first.snapshot.draft).toBe(`${spacedMention} `)
    expect(mirror).toHaveBeenLastCalledWith(`${spacedMention} `)

    const sink = vi.fn(() => Promise.resolve<SubmitOutcome>({ kind: 'success' }))
    const restored = new SessionInputShell({
      actx: {} as Context,
      defaultSink: sink,
      commandImages,
    })
    restored.setDraft(mirror.mock.calls.at(-1)?.[0] as string)
    restored.submit()
    await vi.waitFor(() => {
      expect(sink).toHaveBeenCalledWith(spacedMention, [], 'queue', expect.any(AbortSignal))
    })
  })

  it('retains the chip on Host failure and clears it only after a later accepted retry', async () => {
    const serializeReference = vi.fn(() => Promise.resolve(mention))
    const sink = vi.fn<(
      _text: string,
      _imageIds: readonly DraftAttachmentId[],
      _mode: 'queue' | 'steer',
      _signal: AbortSignal,
    ) => Promise<SubmitOutcome>>()
      .mockResolvedValueOnce({ kind: 'error', text: 'snapshot unavailable' })
      .mockResolvedValueOnce({ kind: 'success' })
    const inputTriggers = {
      serializeReference,
      track: vi.fn(),
      lexicon: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    } as unknown as InputTriggerController
    const shell = new SessionInputShell({
      actx: {} as Context,
      inputTriggers: () => inputTriggers,
      defaultSink: sink,
      commandImages,
    })
    chip(shell)
    expect(shell.snapshot).toMatchObject({
      draft: `${mention} `,
      occurrences: [{ source: 'reference', ref: mention, label: 'Research', offset: 0, length: mention.length }],
    })

    shell.submit('queue')
    // Optimistic commit: the composer clears at enter and stays unlocked
    // while the detached flight runs.
    expect(shell.snapshot.phase).toBe('plain')
    expect(shell.snapshot.draft).toBe('')
    await vi.waitFor(() => {
      expect(shell.snapshot.draft).toBe(`${mention} `)
    })
    expect(sink).toHaveBeenNthCalledWith(1, mention, [], 'queue', expect.any(AbortSignal))
    expect(shell.snapshot).toMatchObject({
      draft: `${mention} `,
      occurrences: [{ source: 'reference', ref: mention, label: 'Research', offset: 0, length: mention.length }],
    })
    expect(shell.notices.getSnapshot()).toMatchObject({
      level: 'error',
      text: 'snapshot unavailable',
    })

    shell.submit('queue')
    expect(shell.snapshot.draft).toBe('')
    await vi.waitFor(() => {
      expect(sink).toHaveBeenNthCalledWith(2, mention, [], 'queue', expect.any(AbortSignal))
    })
    expect(shell.snapshot.occurrences).toEqual([])
    expect(serializeReference).toHaveBeenCalledTimes(2)
  })

  it('blocks submission and retains the chip when its owner cannot serialize it', async () => {
    const sink = vi.fn()
    const inputTriggers = {
      serializeReference: () => Promise.reject(new Error('reference codec unavailable')),
      track: vi.fn(),
      lexicon: { getSnapshot: () => new Map(), subscribe: () => () => {} },
    } as unknown as InputTriggerController
    const shell = new SessionInputShell({
      actx: {} as Context,
      inputTriggers: () => inputTriggers,
      defaultSink: sink,
      commandImages,
    })
    chip(shell)
    shell.submit()
    // The serializer rejection restores the optimistic commit with its chip.
    await vi.waitFor(() => {
      expect(shell.snapshot.draft).toBe(`${mention} `)
    })
    expect(sink).not.toHaveBeenCalled()
    expect(shell.snapshot.occurrences).toHaveLength(1)
    expect(shell.notices.getSnapshot()).toMatchObject({
      level: 'error',
      text: 'reference codec unavailable',
    })
  })

  it('aborts Host-side preparation when the input shell is disposed', () => {
    let signal: AbortSignal | undefined
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: (_text, _imageIds, _mode, received) => {
        signal = received
        return new Promise<SubmitOutcome>(() => {})
      },
      commandImages,
    })
    shell.setDraft('send this')
    shell.submit()
    expect(signal?.aborted).toBe(false)
    shell.dispose()
    expect(signal?.aborted).toBe(true)
    expect(shell.snapshot.phase).toBe('plain')
    // The optimistic commit stands: disposal drops the settlement, so the
    // sent draft is not restored into the dying composer.
    expect(shell.snapshot.draft).toBe('')
  })

  it('retains a rejected default message without duplicating its prompt error notice', async () => {
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: () => Promise.resolve({ kind: 'error' }),
      commandImages,
    })
    shell.setDraft('retry this')
    shell.submit()
    await vi.waitFor(() => {
      expect(shell.snapshot.phase).toBe('plain')
    })
    expect(shell.snapshot.draft).toBe('retry this')
    expect(shell.notices.getSnapshot()).toBeNull()
  })

  it('recovers concurrent failures independently instead of merging their messages', async () => {
    const settlements: Array<(outcome: SubmitOutcome) => void> = []
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: () => new Promise<SubmitOutcome>((resolve) => { settlements.push(resolve) }),
      commandImages,
    })
    shell.setDraft('first')
    shell.submit()
    shell.setDraft('second')
    shell.submit()
    expect(shell.snapshot.draft).toBe('')

    settlements[0]?.({ kind: 'error' })
    await vi.waitFor(() => { expect(shell.snapshot.draft).toBe('first') })
    settlements[1]?.({ kind: 'error' })
    await vi.waitFor(() => { expect(shell.failedSubmissions.getSnapshot()).toHaveLength(1) })
    expect(shell.snapshot.draft).toBe('first')
    const failure = shell.failedSubmissions.getSnapshot()[0]!
    expect(failure.draft).toBe('second')
    expect(shell.restoreFailedSubmission(failure.id)).toBe(false)
    shell.setDraft('')
    expect(shell.restoreFailedSubmission(failure.id)).toBe(true)
    expect(shell.snapshot.draft).toBe('second')
  })

  it('retains A and its images while B is edited and sent, then recovers A with fresh context', async () => {
    let reject!: (error: Error) => void
    const release = vi.fn()
    const sink = vi.fn().mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise }))
      .mockResolvedValue({ kind: 'success' })
    const prepareContext = vi.fn(() => undefined)
    const shell = new SessionInputShell({
      actx: {} as Context, defaultSink: sink, prepareContext,
      commandImages: { ...commandImages, release },
    })
    const a = 'image-a' as DraftAttachmentId
    const b = 'image-b' as DraftAttachmentId
    shell.setDraft('A')
    shell.addImages([a])
    shell.submit()
    shell.setDraft('B')
    shell.addImages([b])
    reject(new Error('context failed'))
    await vi.waitFor(() => { expect(shell.failedSubmissions.getSnapshot()).toHaveLength(1) })
    const failure = shell.failedSubmissions.getSnapshot()[0]!
    expect(failure).toMatchObject({ draft: 'A', imageCount: 1, message: 'context failed' })
    expect(shell.snapshot.draft).toBe('B')
    expect(shell.snapshot.imageIds).toEqual([b])
    expect(shell.restoreFailedSubmission(failure.id)).toBe(false)
    shell.submit()
    await vi.waitFor(() => { expect(sink).toHaveBeenCalledTimes(2) })
    expect(sink.mock.calls[1]?.slice(0, 2)).toEqual(['B', [b]])
    expect(shell.failedSubmissions.getSnapshot()).toHaveLength(1)
    expect(shell.restoreFailedSubmission(failure.id, 'review current page')).toBe(true)
    expect(shell.notices.getSnapshot()?.text).toBe('review current page')
    expect(shell.snapshot.draft).toBe('A')
    expect(shell.snapshot.imageIds).toEqual([a])
    expect(sink).toHaveBeenCalledTimes(2)
    shell.submit()
    await vi.waitFor(() => { expect(sink).toHaveBeenCalledTimes(3) })
    expect(prepareContext.mock.calls).toHaveLength(3)
    expect(sink.mock.calls[2]?.slice(0, 2)).toEqual(['A', [a]])
    expect(release).not.toHaveBeenCalled()
    shell.dispose()
  })

  it.each(['discard', 'dispose'] as const)('keeps failed image-only ownership separate until %s', async (action) => {
    let settle!: (outcome: SubmitOutcome) => void
    const release = vi.fn()
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: () => new Promise((resolve) => { settle = resolve }),
      commandImages: { ...commandImages, release },
    })
    const a = 'image-a' as DraftAttachmentId
    const b = 'image-b' as DraftAttachmentId
    shell.addImages([a])
    shell.submit()
    shell.addImages([b])
    settle({ kind: 'error' })
    await vi.waitFor(() => { expect(shell.failedSubmissions.getSnapshot()).toHaveLength(1) })
    expect(shell.snapshot.imageIds).toEqual([b])
    const id = shell.failedSubmissions.getSnapshot()[0]!.id
    expect(shell.restoreFailedSubmission(id)).toBe(false)
    if (action === 'discard') {
      shell.discardFailedSubmission(id)
      shell.discardFailedSubmission(id)
      expect(release).toHaveBeenCalledExactlyOnceWith([a])
      expect(shell.snapshot.imageIds).toEqual([b])
      expect(shell.dispose()).toEqual([b])
    } else {
      expect(shell.dispose()).toEqual([b, a])
      expect(release).not.toHaveBeenCalled()
    }
    expect(shell.failedSubmissions.getSnapshot()).toEqual([])
    expect(shell.restoreFailedSubmission(id)).toBe(false)
  })
})

describe('submit transaction hardening', () => {
  it('sends one image-only prompt per settlement, ignoring Enter during the round-trip', async () => {
    let settle!: (outcome: SubmitOutcome) => void
    const sink = vi.fn(() => new Promise<SubmitOutcome>((resolve) => { settle = resolve }))
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: sink,
      commandImages,
    })
    expect(shell.addImages(['img-1' as DraftAttachmentId])).toBe(true)
    shell.submit('queue')
    shell.submit('queue')
    expect(sink).toHaveBeenCalledTimes(1)
    settle({ kind: 'success' })
    await vi.waitFor(() => {
      expect(shell.snapshot.imageIds).toEqual([])
    })

    expect(shell.addImages(['img-2' as DraftAttachmentId])).toBe(true)
    shell.submit('queue')
    expect(sink).toHaveBeenCalledTimes(2)
  })

  it('retains an image-only rejection without duplicating its prompt error notice', async () => {
    const sink = vi.fn(() => Promise.resolve<SubmitOutcome>({ kind: 'error' }))
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: sink,
      commandImages,
    })
    const imageId = 'img-1' as DraftAttachmentId
    shell.addImages([imageId])
    shell.submit()
    await Promise.resolve()
    await Promise.resolve()
    expect(shell.snapshot.imageIds).toEqual([imageId])
    expect(shell.notices.getSnapshot()).toBeNull()
  })

  it('aborts an unsettled image-only send and returns its image id at disposal', () => {
    let signal: AbortSignal | undefined
    const imageId = 'img-flight' as DraftAttachmentId
    const shell = new SessionInputShell({
      actx: {} as Context,
      defaultSink: (_text, _ids, _mode, received) => {
        signal = received
        return new Promise<SubmitOutcome>(() => {})
      },
      commandImages,
    })
    shell.addImages([imageId])
    shell.submit()
    expect(signal?.aborted).toBe(false)
    expect(shell.dispose()).toEqual([imageId])
    expect(signal?.aborted).toBe(true)
  })

  it('re-tracks at the caret when an insert-text splice lands (directory descent reopens the menu)', () => {
    const track = vi.fn()
    const lexicon = { getSnapshot: () => new Map(), subscribe: () => () => {} }
    const shell = new SessionInputShell({
      actx: {} as Context,
      inputTriggers: () => ({ track, lexicon } as unknown as InputTriggerController),
      defaultSink: vi.fn(),
      commandImages,
    })
    shell.setDraft('@sr')
    const applied = shell.insertText('@src/', { start: 0, end: 3, draftRev: shell.snapshot.draftRev }, true)
    expect(applied).toBe(true)
    expect(shell.snapshot.draft).toBe('@src/')
    // Every editor commit re-tracks at the settled caret (the continue flag
    // is a contract passenger now): a trailing '/' keeps the menu open.
    expect(track).toHaveBeenCalledWith('@src/', 5, { tier: 'plain' }, shell.snapshot.draftRev)
  })
})
