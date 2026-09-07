// @vitest-environment jsdom
// ConversationController scope addressing over the runtime's real scope tag:
// TestSessions mints tagged scopes through the production createScope, so the
// service's scopeOf/binding path runs against production resolution (no local
// tag probe).
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { makeTranslate, RemoteError, SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import type { QueuedMessage } from '@deepseek-ai/dsh-api-session-controller/client'
import { ComposerBlockRegistry } from '../src/client/input/blocks.ts'
import { InputHub } from '../src/client/input/hub.ts'
import { ConversationController, UnsupportedImageMediaTypeError } from '../src/client/service.ts'
import { zh } from '../src/client/locales.ts'

async function bench() {
  const runtime = await SlotTestRuntime.create()
  const prompt = vi.fn(() => Promise.resolve({ ok: true as const, value: { accepted: true as const } }))
  const updateQueue = vi.fn(() => Promise.resolve({ ok: true as const, value: { accepted: true as const } }))
  const cancel = vi.fn(() => Promise.resolve({ ok: true as const, value: { accepted: true as const } }))
  const loadOlder = vi.fn(() => Promise.resolve())
  await runtime.sessions.add({
    id: 's1',
    session: { prompt, updateQueue, cancel, loadOlder },
  })
  // config.input is required (the apply shares its hub with the inject
  // factories); the bench passes its own instance explicitly.
  const hub = new InputHub(runtime.ctx, makeTranslate(zh, {}))
  const fiber = runtime.ctx.plugin(ConversationController, {
    input: hub,
    blocks: new ComposerBlockRegistry(),
    activeView: () => 'page',
    contextFailure: reason => `context ${reason}`,
  })
  await fiber.await()
  const root = runtime.ctx.get('conversation') as ConversationController
  const scoped = runtime.sessions.scope('s1')!.get('conversation') as ConversationController
  const shell = hub.shellFor(runtime.sessions.binding('s1')!)
  return { runtime, fiber, root, scoped, hub, shell, prompt, updateQueue, cancel, loadOlder }
}

describe('ConversationController', () => {
  it('adds View context to scoped send as one prompt and removes contributions with their plugin fiber', async () => {
    const b = await bench()
    const prepare = vi.fn(() => 'frozen page')
    const plugin = b.runtime.ctx.plugin({
      inject: ['conversation'],
      apply(ctx: Context) {
        ctx.effect(() => ctx.conversation.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare }))
      },
    })
    await plugin.await()
    const sending = b.scoped.send('ordinary message')
    expect(prepare).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', draft: 'ordinary message', occurrences: [] }))
    await sending
    expect(b.prompt).toHaveBeenLastCalledWith([
      { type: 'text', text: 'ordinary message' }, { type: 'text', text: '<dsh-page-context source="page" label="Page">\nfrozen page\n</dsh-page-context>' },
    ], 'queue', expect.any(AbortSignal), expect.any(String))
    await plugin.dispose()
    await b.scoped.send('after unload')
    expect(b.prompt).toHaveBeenLastCalledWith([{ type: 'text', text: 'after unload' }], 'queue')
    expect(prepare).toHaveBeenCalledOnce()
    await b.runtime.dispose()
  })

  it('captures a plain composer send synchronously and admits context through the original queue/steer request', async () => {
    const b = await bench()
    const session = b.runtime.sessions.binding('s1')!.session
    const beginSubmission = vi.spyOn(session, 'beginSubmission')
    let page = 'original'
    const prepare = vi.fn(() => { const captured = page; return Promise.resolve(captured) })
    b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare })
    b.shell.setDraft('why?')
    b.shell.submit('steer')
    expect(prepare).toHaveBeenCalledOnce()
    expect(b.shell.snapshot.draft).toBe('')
    page = 'new page'
    await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
    expect(beginSubmission).toHaveBeenCalledWith(expect.objectContaining({ text: 'why?', mode: 'steer' }))
    expect(b.prompt).toHaveBeenCalledWith([
      { type: 'text', text: 'why?' }, { type: 'text', text: '<dsh-page-context source="page" label="Page">\noriginal\n</dsh-page-context>' },
    ], 'steer', expect.any(AbortSignal), expect.any(String))
    await b.runtime.dispose()
  })

  it('restores a failed context preparation without sending and permits an ordinary retry', async () => {
    const b = await bench()
    const prepare = vi.fn(() => Promise.resolve('page')).mockRejectedValueOnce(new Error('page unavailable'))
    b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare })
    b.shell.setDraft('retry this')
    b.shell.submit()
    await vi.waitFor(() => { expect(b.shell.snapshot.draft).toBe('retry this') })
    expect(b.prompt).not.toHaveBeenCalled()
    expect(b.shell.notices.getSnapshot()).toMatchObject({ text: 'page unavailable', level: 'error' })
    b.shell.submit()
    await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
    expect(b.shell.snapshot.draft).toBe('')
    await b.runtime.dispose()
  })

  it('cancels a direct send when its Session binding is disposed during page preparation', async () => {
    const b = await bench()
    b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: () => new Promise(() => {}) })
    const rejected = expect(b.scoped.send('pending')).rejects.toThrow('cancelled')
    await b.runtime.sessions.remove('s1')
    await rejected
    expect(b.prompt).not.toHaveBeenCalled()
    await b.runtime.dispose()
  })

  it('stops pending context preparation and restores its draft without a later prompt', async () => {
    const b = await bench()
    let signal: AbortSignal | undefined
    let complete: (text: string) => void = () => {}
    b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: (request) => {
      signal = request.signal
      return new Promise((resolve) => { complete = resolve })
    } })
    b.shell.setDraft('still preparing')
    b.shell.submit()
    await b.scoped.cancel()
    expect(signal?.aborted).toBe(true)
    await vi.waitFor(() => { expect(b.shell.snapshot.draft).toBe('still preparing') })
    complete('late page')
    await Promise.resolve()
    expect(b.prompt).not.toHaveBeenCalled()
    await b.runtime.dispose()
  })

  it('routes operations through the public Session binding', async () => {
    const b = await bench()
    await b.scoped.send('hello')
    await b.scoped.updateQueue('item-1' as never, { kind: 'remove' })
    await b.scoped.cancel()
    await b.scoped.loadOlder()
    expect(b.prompt).toHaveBeenCalledWith([{ type: 'text', text: 'hello' }], 'queue')
    expect(b.updateQueue).toHaveBeenCalledWith('item-1', { kind: 'remove' })
    expect(b.cancel).toHaveBeenCalledOnce()
    expect(b.loadOlder).toHaveBeenCalledOnce()
    await b.runtime.dispose()
  })

  it('folds Session business failures into callback rejections', async () => {
    const b = await bench()
    b.prompt.mockResolvedValueOnce({ ok: false, error: new RemoteError('session/agent-busy', 'busy', { reason: 'busy' }) } as never)
    await expect(b.scoped.send('x')).rejects.toThrow('conversation.send failed: session/agent-busy: busy')
    b.cancel.mockResolvedValueOnce({ ok: false, error: new RemoteError('gateway/internal', 'nope', {}) } as never)
    await expect(b.scoped.cancel()).rejects.toThrow('conversation.cancel failed: gateway/internal: nope')
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('gateway/internal', 'broken', {}),
    } as never)
    await expect(b.scoped.updateQueue('item-1' as never, { kind: 'steer' }))
      .rejects.toThrow('conversation.updateQueue failed: gateway/internal: broken')
    await b.runtime.dispose()
  })

  it('treats strict-steer races as converged Queue delivery', async () => {
    const b = await bench()
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('session/steer-unavailable', 'closed', { itemId: 'item-1' as QueuedMessage['id'] }),
    } as never)
    await expect(b.scoped.updateQueue('item-1' as never, { kind: 'steer' })).resolves.toBeUndefined()
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('session/queue-item-not-found', 'claimed', { itemId: 'item-1' as QueuedMessage['id'] }),
    } as never)
    await expect(b.scoped.updateQueue('item-2' as never, { kind: 'steer' })).resolves.toBeUndefined()
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('session/queue-item-not-found', 'claimed', { itemId: 'item-1' as QueuedMessage['id'] }),
    } as never)
    await expect(b.scoped.updateQueue('item-3' as never, { kind: 'remove' }))
      .rejects.toThrow('conversation.updateQueue failed: session/queue-item-not-found: claimed')
    await b.runtime.dispose()
  })

  it('releases draft previews when their session scope is disposed', async () => {
    const b = await bench()
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:draft-1')
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
    try {
      const [attachment] = b.root.createDraftImages([
        new File([new Uint8Array(4)], 'a.png', { type: 'image/png' }),
      ])
      if (attachment === undefined) throw new Error('draft attachment missing')
      b.root.input.for(b.runtime.sessions.scope('s1')!).addImages([attachment.id])
      await b.runtime.sessions.remove('s1')
      expect(b.root.draftImages([attachment.id])).toEqual([])
      expect(revoked).toHaveBeenCalledWith('blob:draft-1')
    } finally {
      created.mockRestore()
      revoked.mockRestore()
    }
    await b.runtime.dispose()
  })

  it('releases an image removed from the rail by an unsettled optimistic send', async () => {
    const b = await bench()
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:detached')
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
    try {
      const [attachment] = b.root.createDraftImages([
        new File([Uint8Array.of(1)], 'detached.png', { type: 'image/png' }),
      ])
      if (attachment === undefined) throw new Error('draft attachment missing')
      b.shell.addImages([attachment.id])
      b.shell.submit()
      expect(b.shell.snapshot.imageIds).toEqual([])
      await b.runtime.sessions.remove('s1')
      expect(b.root.draftImages([attachment.id])).toEqual([])
      expect(revoked).toHaveBeenCalledWith('blob:detached')
    } finally {
      created.mockRestore()
      revoked.mockRestore()
    }
    await b.runtime.dispose()
  })

  it('validates every MIME type before allocating previews', async () => {
    const b = await bench()
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    expect(() => b.root.createDraftImages([
      new File([Uint8Array.of(1)], 'valid.png', { type: 'image/png' }),
      new File([Uint8Array.of(2)], 'invalid.svg', { type: 'image/svg+xml' }),
    ])).toThrow(UnsupportedImageMediaTypeError)
    expect(created).not.toHaveBeenCalled()
    created.mockRestore()
    await b.runtime.dispose()
  })

  it('fails loudly from the root scope, on an unbound session, or without Client Sessions', async () => {
    const b = await bench()
    await expect(b.root.send('x')).rejects.toThrow(/requires a session scope/)
    await b.runtime.sessions.remove('s1')
    await expect(b.scoped.send('x')).rejects.toThrow(/resolved no binding/)
    await b.runtime.dispose()
    // No Client Sessions service at all: a bare context lacks the assembled controller.
    const bare = new Context()
    await bare.plugin(ConversationController, {
      input: new InputHub(bare, makeTranslate(zh, {})),
      blocks: new ComposerBlockRegistry(),
      activeView: () => undefined,
      contextFailure: reason => `context ${reason}`,
    }).await()
    const orphan = bare.get('conversation') as ConversationController
    await expect(orphan.send('x')).rejects.toThrow(/sessions service unavailable/)
  })
})

describe('sendSession submission echo', () => {
  /** Bench with an observable beginSubmission on the session face. */
  async function echoBench() {
    const b = await bench()
    const retire: { onRetire?: ((retirement: unknown) => void) | undefined } = {}
    const abandon = vi.fn()
    const beginSubmission = vi.fn((input: { onRetire?: (retirement: unknown) => void }) => {
      retire.onRetire = input.onRetire
      return { requestId: 'req-echo' as never, abandon }
    })
    await b.runtime.sessions.updateSessionSnapshot('s1', () => {})
    const face = b.runtime.sessions.binding('s1')!.session as unknown as Record<string, unknown>
    face['beginSubmission'] = beginSubmission
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:echo-1')
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
    const restore = () => {
      created.mockRestore()
      revoked.mockRestore()
    }
    return { ...b, beginSubmission, abandon, retire, revoked, restore }
  }

  it.each(['stop', 'unload'] as const)('keeps public send admitted when %s arrives before its acknowledgement', async (action) => {
    const b = await echoBench()
    try {
      const removeContext = b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: () => 'page' })
      let acknowledge: () => void = () => {}
      let signal: AbortSignal | undefined
      b.prompt.mockImplementationOnce((...args: unknown[]) => new Promise((resolve) => {
        signal = args[2] as AbortSignal
        signal.addEventListener('abort', () => {
          resolve({ ok: false, error: new RemoteError('gateway/internal', 'receipt cancelled', {}) } as never)
        }, { once: true })
        acknowledge = () => { resolve({ ok: true, value: { accepted: true } }) }
      }))
      const sending = b.scoped.send('public message')
      expect(b.beginSubmission).toHaveBeenCalledWith(expect.objectContaining({ text: 'public message', mode: 'queue' }))
      await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
      expect(b.prompt).toHaveBeenCalledWith(expect.any(Array), 'queue', expect.any(AbortSignal), 'req-echo')
      b.retire.onRetire?.({ reason: 'observed', attachments: [] })
      if (action === 'stop') await b.scoped.cancel()
      else removeContext()
      expect(signal?.aborted).toBe(false)
      acknowledge()
      await expect(sending).resolves.toBeUndefined()
      expect(b.abandon).not.toHaveBeenCalled()
    } finally { b.restore(); await b.runtime.dispose() }
  })

  it('abandons a public-send echo if context preparation fails before admission', async () => {
    const b = await echoBench()
    try {
      b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: () => Promise.reject(new Error('page failed')) })
      await expect(b.scoped.send('not admitted')).rejects.toThrow('page failed')
      expect(b.abandon).toHaveBeenCalledOnce()
      expect(b.prompt).not.toHaveBeenCalled()
    } finally { b.restore(); await b.runtime.dispose() }
  })

  it('keeps an image-only user text position before its automatic context', async () => {
    const b = await echoBench()
    try {
      b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: () => 'image context' })
      const [attachment] = b.root.createDraftImages([new File([Uint8Array.of(1)], 'a.png', { type: 'image/png' })])
      const session = b.runtime.sessions.binding('s1')!.session
      const controller = new AbortController()
      const prepared = b.root.prepareContext(session.sessionId, '', [], controller.signal)!
      const sending = b.root.sendSession(session, '', [attachment!.id], 'queue', controller.signal, prepared)
      await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
      expect(b.prompt).toHaveBeenCalledWith([
        expect.objectContaining({ type: 'image' }),
        { type: 'text', text: '' },
        { type: 'text', text: '<dsh-page-context source="page" label="Page">\nimage context\n</dsh-page-context>' },
      ], 'queue', prepared.signal, 'req-echo')
      b.retire.onRetire?.({ reason: 'observed', attachments: [] })
      await sending
      prepared.dispose()
    } finally { b.restore(); await b.runtime.dispose() }
  })

  it.each(['stop', 'unload'] as const)('cancels a resolved context on %s before admission and abandons its unsent echo', async (action) => {
    const b = await echoBench()
    try {
      const removeContext = b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: () => 'resolved page' })
      const session = b.runtime.sessions.binding('s1')!.session
      const prepared = b.root.prepareContext(session.sessionId, 'question', [], new AbortController().signal)!
      await prepared.content
      const sending = b.root.sendSession(session, 'question', [], 'queue', undefined, prepared)
      const rejected = expect(sending).rejects.toThrow('cancelled')
      if (action === 'stop') await b.scoped.cancel()
      else removeContext()
      await rejected
      expect(b.abandon).toHaveBeenCalledOnce()
      expect(b.prompt).not.toHaveBeenCalled()
      prepared.dispose()
    } finally { b.restore(); await b.runtime.dispose() }
  })

  it.each(['stop', 'unload', 'scope'] as const)('keeps an observed admission successful when %s precedes its RPC acknowledgement', async (action) => {
    const b = await echoBench()
    try {
      const removeContext = b.root.contexts.register({ id: 'page', label: 'Page', viewId: 'page', timeoutMs: 100, prepare: () => 'page' })
      const controller = new AbortController()
      const session = b.runtime.sessions.binding('s1')!.session
      const prepared = b.root.prepareContext(session.sessionId, 'already admitted', [], controller.signal)!
      let acknowledge: () => void = () => {}
      b.prompt.mockImplementationOnce((...args: unknown[]) => new Promise((resolve) => {
        const signal = args[2] as AbortSignal
        signal.addEventListener('abort', () => {
          resolve({ ok: false, error: new RemoteError('gateway/internal', 'receipt cancelled', {}) } as never)
        }, { once: true })
        acknowledge = () => { resolve({ ok: true, value: { accepted: true } }) }
      }))
      const sending = b.root.sendSession(session, 'already admitted', [], 'queue', controller.signal, prepared)
      await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
      b.retire.onRetire?.({ reason: 'observed', attachments: [] })
      if (action === 'stop') await b.scoped.cancel()
      else if (action === 'unload') removeContext()
      else controller.abort()
      expect(prepared.signal.aborted).toBe(false)
      acknowledge()
      await expect(sending).resolves.toEqual({ kind: 'success' })
      expect(b.abandon).not.toHaveBeenCalled()
      prepared.dispose()
    } finally { b.restore(); await b.runtime.dispose() }
  })

  it('registers the echo before serialization and prompts with its identity', async () => {
    const b = await echoBench()
    try {
      const [attachment] = b.root.createDraftImages([
        new File([Uint8Array.of(1, 2, 3)], 'a.png', { type: 'image/png' }),
      ])
      const session = b.runtime.sessions.binding('s1')!.session
      const sending = b.root.sendSession(session, '带图', [attachment!.id], 'queue')
      // Synchronous: the echo is registered before any encoding starts.
      expect(b.beginSubmission).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'queue',
        text: '带图',
        images: [expect.objectContaining({ previewUrl: 'blob:echo-1', name: 'a.png' })],
      }))
      expect(b.prompt).not.toHaveBeenCalled()
      await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
      expect(b.prompt).toHaveBeenCalledWith(
        [
          { type: 'image', mediaType: 'image/png', data: expect.any(String) as string, name: 'a.png' },
          { type: 'text', text: '带图' },
        ],
        'queue',
        undefined,
        'req-echo',
      )
      // The draft stays registered until the echo's observed retirement.
      expect(b.root.draftImages([attachment!.id])).toHaveLength(1)
      b.retire.onRetire?.({ reason: 'observed', attachments: [] })
      await expect(sending).resolves.toEqual({ kind: 'success' })
      expect(b.root.draftImages([attachment!.id])).toEqual([])
      expect(b.revoked).toHaveBeenCalledWith('blob:echo-1')
    } finally {
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('passes each delivery mode before image serialization', async () => {
    const b = await echoBench()
    try {
      await b.runtime.sessions.updateSessionSnapshot('s1', (draft) => { draft.running = true })
      const session = b.runtime.sessions.binding('s1')!.session
      await expect(b.root.sendSession(session, '立即纠偏', [], 'steer'))
        .resolves.toEqual({ kind: 'success' })
      expect(b.beginSubmission).toHaveBeenLastCalledWith(expect.objectContaining({
        mode: 'steer',
        text: '立即纠偏',
      }))
      await expect(b.root.sendSession(session, '稍后处理', [], 'queue'))
        .resolves.toEqual({ kind: 'success' })
      expect(b.beginSubmission).toHaveBeenLastCalledWith(expect.objectContaining({
        mode: 'queue',
        text: '稍后处理',
      }))
    } finally {
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('hands the preview URL to the image cache on observed retirement instead of revoking it', async () => {
    const b = await echoBench()
    try {
      const seedImageUrl = vi.fn(() => true)
      b.runtime.ctx.provide('uiConversation')
      b.runtime.ctx.set('uiConversation', { seedImageUrl })
      const [attachment] = b.root.createDraftImages([
        new File([Uint8Array.of(9)], 'seeded.png', { type: 'image/png' }),
      ])
      const session = b.runtime.sessions.binding('s1')!.session
      const sending = b.root.sendSession(session, '', [attachment!.id], 'queue')
      await vi.waitFor(() => { expect(b.prompt).toHaveBeenCalledOnce() })
      const ref = { attachmentId: 'att-1' }
      b.retire.onRetire?.({ reason: 'observed', attachments: [ref] })
      await expect(sending).resolves.toEqual({ kind: 'success' })
      expect(seedImageUrl).toHaveBeenCalledWith('s1', ref, 'blob:echo-1')
      expect(b.root.draftImages([attachment!.id])).toEqual([])
      expect(b.revoked).not.toHaveBeenCalled()
      // Failed retirement keeps nothing to do; a second retire of released ids is a no-op.
      b.retire.onRetire?.({ reason: 'observed', attachments: [ref] })
    } finally {
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('keeps the drafts registered when the echo retires as failed (composer restore path)', async () => {
    const b = await echoBench()
    try {
      b.prompt.mockResolvedValueOnce({
        ok: false, error: new RemoteError('session/attachment-invalid', 'nope', { reason: 'nope' }),
      } as never)
      const [attachment] = b.root.createDraftImages([
        new File([Uint8Array.of(7)], 'kept.png', { type: 'image/png' }),
      ])
      const session = b.runtime.sessions.binding('s1')!.session
      await expect(b.root.sendSession(session, '失败', [attachment!.id], 'queue'))
        .resolves.toEqual({ kind: 'error' })
      b.retire.onRetire?.({ reason: 'failed' })
      expect(b.root.draftImages([attachment!.id])).toHaveLength(1)
      expect(b.revoked).not.toHaveBeenCalled()
    } finally {
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('abandons the echo when encoding fails before the prompt', async () => {
    const b = await echoBench()
    class FailingReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error('read failed')
      readAsDataURL(): void {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('FileReader', FailingReader)
    try {
      const [attachment] = b.root.createDraftImages([
        new File([Uint8Array.of(1)], 'broken.png', { type: 'image/png' }),
      ])
      const session = b.runtime.sessions.binding('s1')!.session
      await expect(b.root.sendSession(session, 'x', [attachment!.id], 'queue'))
        .rejects.toThrow('read failed')
      expect(b.abandon).toHaveBeenCalledOnce()
      expect(b.prompt).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('yields through the macrotask fallback where no frame clock exists', async () => {
    const b = await echoBench()
    vi.stubGlobal('requestAnimationFrame', undefined)
    try {
      const session = b.runtime.sessions.binding('s1')!.session
      await expect(b.root.sendSession(session, '纯文本', [], 'queue')).resolves.toEqual({ kind: 'success' })
      expect(b.prompt).toHaveBeenCalledWith([{ type: 'text', text: '纯文本' }], 'queue', undefined, 'req-echo')
    } finally {
      vi.unstubAllGlobals()
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('bounds the paint yield when the frame clock is throttled', async () => {
    const b = await echoBench()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    try {
      const session = b.runtime.sessions.binding('s1')!.session
      const sending = b.root.sendSession(session, '后台标签', [], 'queue')
      expect(b.prompt).not.toHaveBeenCalled()
      await expect(sending).resolves.toEqual({ kind: 'success' })
      expect(b.prompt).toHaveBeenCalledWith([{ type: 'text', text: '后台标签' }], 'queue', undefined, 'req-echo')
    } finally {
      vi.unstubAllGlobals()
      b.restore()
    }
    await b.runtime.dispose()
  })

  it('sends a subagent continuation without registering an unobservable echo', async () => {
    const b = await bench()
    const session = b.runtime.sessions.binding('s1')!.session
    const snapshot = session.getSnapshot()
    const beginSubmission = vi.spyOn(session, 'beginSubmission')
    vi.spyOn(session, 'getSnapshot').mockReturnValue({
      ...snapshot,
      subagent: {
        address: { parentSessionId: 'parent', childSessionId: 'child', mode: 'continuable' } as never,
      },
    })
    const prompt = vi.spyOn(session, 'prompt').mockResolvedValue({ ok: true, value: { accepted: true } })
    await expect(b.root.sendSession(session, '继续', [], 'queue')).resolves.toEqual({ kind: 'success' })
    expect(beginSubmission).not.toHaveBeenCalled()
    expect(prompt).toHaveBeenCalledWith([{ type: 'text', text: '继续' }], 'queue', undefined)
    await b.runtime.dispose()
  })
})

describe('draft image dimension probe', () => {
  it('fills intrinsic dimensions from the header probe and skips runtimes without Image', async () => {
    const b = await bench()
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:probe')
    class InstantImage {
      onload: (() => void) | null = null
      naturalWidth = 0
      naturalHeight = 0
      set src(_value: string) {
        this.naturalWidth = 640
        this.naturalHeight = 480
        this.onload?.()
      }
    }
    vi.stubGlobal('Image', InstantImage)
    try {
      const [probed] = b.root.createDraftImages([
        new File([Uint8Array.of(1)], 'probed.png', { type: 'image/png' }),
      ])
      expect(probed).toMatchObject({ width: 640, height: 480 })
      vi.stubGlobal('Image', undefined)
      const [unprobed] = b.root.createDraftImages([
        new File([Uint8Array.of(2)], 'unprobed.png', { type: 'image/png' }),
      ])
      expect(unprobed?.width).toBeUndefined()
    } finally {
      vi.unstubAllGlobals()
      created.mockRestore()
    }
    await b.runtime.dispose()
  })
})

describe('InputHub queue steering (empty-draft accelerated Enter)', () => {
  const row = (id: string): QueuedMessage => ({
    id: id as never,
    messageId: `message-${id}` as never,
    placement: 'queued',
    content: [{ type: 'text', text: id }],
    preview: id,
    text: id,
  })

  it('steers every queued row in FIFO order and leaves steering rows alone', async () => {
    const b = await bench()
    await b.runtime.sessions.updateSessionSnapshot('s1', (draft) => {
      draft.queue = [row('q-1'), { ...row('q-2'), placement: 'steering' }, row('q-3')]
    })
    b.shell.steerQueue()
    await vi.waitFor(() => {
      expect(b.updateQueue).toHaveBeenCalledTimes(2)
    })
    expect(b.updateQueue).toHaveBeenNthCalledWith(1, 'q-1', { kind: 'steer' })
    expect(b.updateQueue).toHaveBeenNthCalledWith(2, 'q-3', { kind: 'steer' })
    expect(b.shell.notices.getSnapshot()).toBeNull()
    await b.runtime.dispose()
  })

  it('converges silently when the turn closes or a row is claimed mid-steer', async () => {
    const b = await bench()
    await b.runtime.sessions.updateSessionSnapshot('s1', (draft) => {
      draft.queue = [row('q-1'), row('q-2')]
    })
    // The turn closes before the second row: the flush stops, silently.
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('session/steer-unavailable', 'closed', { itemId: 'item-1' as QueuedMessage['id'] }),
    } as never)
    b.shell.steerQueue()
    await vi.waitFor(() => { expect(b.updateQueue).toHaveBeenCalledTimes(1) })
    expect(b.shell.notices.getSnapshot()).toBeNull()

    // A row the host already claimed (e.g. a repeated empty-draft chord):
    // the duplicate strict steer is a silent no-op.
    await b.runtime.sessions.updateSessionSnapshot('s1', (draft) => {
      draft.queue = [row('q-3')]
    })
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('session/queue-item-not-found', 'claimed', { itemId: 'item-1' as QueuedMessage['id'] }),
    } as never)
    b.shell.steerQueue()
    await vi.waitFor(() => { expect(b.updateQueue).toHaveBeenCalledTimes(2) })
    expect(b.shell.notices.getSnapshot()).toBeNull()
    await b.runtime.dispose()
  })

  it('surfaces one notice on a genuine steer failure and stops', async () => {
    const b = await bench()
    await b.runtime.sessions.updateSessionSnapshot('s1', (draft) => {
      draft.queue = [row('q-1'), row('q-2')]
    })
    b.updateQueue.mockResolvedValueOnce({
      ok: false, error: new RemoteError('gateway/internal', 'broken', {}),
    } as never)
    b.shell.steerQueue()
    await vi.waitFor(() => {
      expect(b.shell.notices.getSnapshot()).toEqual(
        expect.objectContaining({ level: 'error', text: '插话发送失败，请重试。' }),
      )
    })
    expect(b.updateQueue).toHaveBeenCalledTimes(1)
    await b.runtime.dispose()
  })

  it('no-ops without queued rows', async () => {
    const b = await bench()
    b.shell.steerQueue()
    expect(b.updateQueue).not.toHaveBeenCalled()
    await b.runtime.dispose()
  })
})
