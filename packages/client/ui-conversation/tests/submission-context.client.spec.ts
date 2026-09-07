import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationContextRegistry } from '../src/client/submission-context.ts'
import type { ConversationContextRequest } from '../src/client/contract/submission-context.ts'

const request = (): ConversationContextRequest => ({
  sessionId: 's1' as never, draft: 'Why did this fail?', occurrences: [], signal: new AbortController().signal,
})
const registry = () => new ConversationContextRegistry(id => id === 's1' ? 'workbench' : undefined, reason => `context ${reason}`)
const wrapped = (source: string, text: string) => `<dsh-page-context source="${source}" label="Page">\n${text}\n</dsh-page-context>`

afterEach(() => { vi.useRealTimers() })

describe('View submission contexts', () => {
  it('stores captured display metadata and unchanged model text in the same envelope', async () => {
    const contexts = registry()
    contexts.register({
      id: 'page', viewId: 'workbench', label: 'Page', timeoutMs: 100,
      prepare: () => ({ text: '<protocol token="frozen"/>', label: 'Trial "A"', description: '2 selections\nScore < 1 & > 0' }),
    })
    await expect(contexts.capture(request())!.content).resolves.toEqual([
      '<dsh-page-context source="page" label="Trial &quot;A&quot;" description="2 selections\nScore &lt; 1 &amp; &gt; 0">\n<protocol token="frozen"/>\n</dsh-page-context>',
    ])
    contexts.dispose()
  })
  it('cancels only the stopped Session even after its context has resolved', async () => {
    const contexts = new ConversationContextRegistry(() => 'workbench', reason => `context ${reason}`)
    contexts.register({ id: 'page', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: () => 'page' })
    const first = contexts.capture(request())!
    const second = contexts.capture({ ...request(), sessionId: 's2' as never })!
    await Promise.all([first.content, second.content])
    contexts.cancelSession('s1' as never)
    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
    contexts.cancelSession('absent' as never)
    second.dispose()
    contexts.dispose()
  })
  it('escapes source labels while preserving provider text verbatim in an independent envelope', async () => {
    const contexts = registry()
    const text = '<owner-data>literal & source</owner-data>'
    contexts.register({ id: 'page"<&\'>', viewId: 'workbench', label: 'Page "<&\'>', timeoutMs: 100, prepare: () => text })
    await expect(contexts.capture(request())!.content).resolves.toEqual([
      `<dsh-page-context source="page&quot;&lt;&amp;&apos;&gt;" label="Page &quot;&lt;&amp;&apos;&gt;">\n${text}\n</dsh-page-context>`,
    ])
    contexts.dispose()
  })
  it('captures synchronously, keeps registration order, and ignores other Views, Sessions, and slash commands', async () => {
    const contexts = registry()
    let page = 'first'
    const prepare = vi.fn(() => {
      const captured = page
      return Promise.resolve(captured)
    })
    contexts.register({ id: 'first', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare })
    contexts.register({ id: 'empty', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: () => undefined })
    contexts.register({ id: 'blank', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: () => '' })
    contexts.register({ id: 'second', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: () => 'second' })
    const other = vi.fn(() => 'unrelated')
    contexts.register({ id: 'other', label: 'Page', viewId: 'chat', timeoutMs: 100, prepare: other })
    const captured = contexts.capture(request())!
    expect(prepare).toHaveBeenCalledOnce()
    page = 'later'
    expect(contexts.capture({ ...request(), sessionId: 's2' as never })).toBeUndefined()
    expect(contexts.capture({ ...request(), draft: ' /command' })).toBeUndefined()
    await expect(captured.content).resolves.toEqual([wrapped('first', 'first'), wrapped('second', 'second')])
    expect(other).not.toHaveBeenCalled()
    captured.dispose()
    contexts.dispose()
  })

  it('rejects duplicate ids and invalid deadlines, and an old disposer cannot remove a replacement', async () => {
    const contexts = registry()
    const contribution = { id: 'page', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: () => 'page' }
    const dispose = contexts.register(contribution)
    expect(() => contexts.register(contribution)).toThrow('duplicate')
    for (const timeoutMs of [0, -1, Infinity, NaN]) {
      expect(() => contexts.register({ ...contribution, id: 'invalid', timeoutMs })).toThrow('invalid')
    }
    dispose()
    contexts.register(contribution)
    dispose()
    await expect(contexts.capture(request())!.content).resolves.toEqual([wrapped('page', 'page')])
    contexts.dispose()
    expect(contexts.capture(request())).toBeUndefined()
  })

  it('bounds a provider that ignores cancellation and aborts its signal when the deadline expires', async () => {
    vi.useFakeTimers()
    const contexts = registry()
    let signal: AbortSignal | undefined
    contexts.register({ id: 'page', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: (input) => {
      signal = input.signal
      return new Promise(() => {})
    } })
    const captured = contexts.capture(request())!
    const rejected = expect(captured.content).rejects.toThrow('context timeout')
    await vi.advanceTimersByTimeAsync(100)
    await rejected
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    contexts.dispose()
  })

  it.each(['request', 'attempt', 'registration', 'service'] as const)('cancels pending work when its %s owner leaves', async (owner) => {
    const contexts = registry()
    const controller = new AbortController()
    let signal: AbortSignal | undefined
    let complete: (value: string) => void = () => {}
    const dispose = contexts.register({ id: 'page', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: (input) => {
      signal = input.signal
      return new Promise((resolve) => { complete = resolve })
    } })
    const captured = contexts.capture({ ...request(), signal: controller.signal })!
    const rejected = expect(captured.content).rejects.toThrow('context cancelled')
    if (owner === 'request') controller.abort()
    if (owner === 'attempt') captured.dispose()
    if (owner === 'registration') dispose()
    if (owner === 'service') contexts.dispose()
    await rejected
    expect(signal?.aborted).toBe(true)
    complete('too late')
    await Promise.resolve()
    contexts.dispose()
  })

  it('does not invoke a contributor after its attempt is already cancelled', async () => {
    const contexts = registry()
    const prepare = vi.fn(() => 'page')
    contexts.register({ id: 'page', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare })
    const controller = new AbortController()
    controller.abort()
    await expect(contexts.capture({ ...request(), signal: controller.signal })!.content).rejects.toThrow('cancelled')
    expect(prepare).not.toHaveBeenCalled()
    contexts.dispose()
  })

  it.each(['throw', 'reject', 'undefined-rejection'] as const)('contains %s and permits a clean retry', async (mode) => {
    const contexts = registry()
    let failed = false
    contexts.register({ id: 'page', label: 'Page', viewId: 'workbench', timeoutMs: 100, prepare: () => {
      if (failed) return 'recovered'
      failed = true
      if (mode === 'throw') throw new Error('provider failed')
      // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- provider callbacks can reject without an Error.
      return Promise.reject(mode === 'reject' ? new Error('provider failed') : undefined)
    } })
    const first = contexts.capture(request())!
    if (mode === 'undefined-rejection') await expect(first.content).rejects.toThrow('undefined')
    else await expect(first.content).rejects.toThrow('provider failed')
    await expect(contexts.capture(request())!.content).resolves.toEqual([wrapped('page', 'recovered')])
    contexts.dispose()
  })
})
