import { Context, Service } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startDesignDraft } from './client-start.mjs'

const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

const originalInject = ['slots', 'locale', 'uiConversation']
const draftInject = ['layout', 'sessions', 'workspaces', 'conversation', 'uiWorkspace', 'remote', 'remote.agentPresets']

function patchedClientInject(): string[] {
  const entry = process.env.YOURBUDDY_DESIGN_ARTIFACTS_ENTRY
  let source: string
  if (entry !== undefined) {
    const resolved = entry.startsWith('file:') ? fileURLToPath(entry) : createRequire(import.meta.url).resolve(entry)
    source = readFileSync(join(dirname(resolved), 'client.js'), 'utf8')
  } else {
    // Only resulting Client lines count: exclude deleted lines and later Host hunks.
    const patch = readFileSync(new URL('../patches/dsh-claude-artifacts-2.11.1-yourbuddy.patch', import.meta.url), 'utf8')
    const client = patch.split('--- a/lib/client.js\n')[1]?.split('\n--- a/')[0]
    if (client === undefined) throw new Error('The artifacts patch has no Client section')
    source = client.split('\n').filter(line => line.startsWith('+') || line.startsWith(' '))
      .map(line => line.slice(1)).join('\n')
  }
  const assignments = [...source.matchAll(/^\s*var inject = (\[[^\n]*\]);$/gm)]
  if (assignments.length !== 1) throw new Error('Expected one artifacts Client runtime inject declaration')
  const inject: unknown = JSON.parse(assignments[0]![1]!)
  if (!Array.isArray(inject) || !inject.every(name => typeof name === 'string')) {
    throw new Error('The artifacts Client inject declaration must be a string array')
  }
  return inject
}

// Remote namespaces are separately traced Cordis services in the real Gateway.
class PresetRemote extends Service {
  constructor(ctx: Context) { super(ctx, 'remote') }
  get agentPresets() { return Reflect.get(this.ctx, 'remote.agentPresets') }
}

async function harness(inject: string[]) {
  const ctx = new Context()
  contexts.push(ctx)
  const scope = { sessionId: 'new' }
  const create = vi.fn(async () => 'new')
  const select = vi.fn(async () => ({ ok: true }))
  const setDraft = vi.fn()
  const openSession = vi.fn()
  const focus = vi.fn()
  const release = vi.fn()
  const inputFor = vi.fn((inputScope: object) => {
    expect(inputScope).toBe(scope)
    return { setDraft, focus }
  })
  // A sibling provider is essential: a root-provided mock bypasses inject enforcement.
  await ctx.plugin({ apply(provider) {
    for (const name of originalInject) provider.provide(name, {} as never)
    provider.provide('layout', { beginNavigation: () => new AbortController().signal } as never)
    provider.provide('sessions', {
      list: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'ready', byId: {
        current: { id: 'current', retainedBy: { mainView: 1 }, projectionValues: { agentPreset: 'selected' } },
      } }) },
      create,
      async using(_id: string, _options: object, operation: (reference: object) => Promise<void>) {
        try { await operation({ ready: Promise.resolve(), binding: { ctx: scope } }) }
        finally { release() }
      },
    } as never)
    provider.provide('workspaces', {
      list: { subscribe: () => () => {}, getSnapshot: () => ({ phase: 'ready', state: 'idle', error: null, items: [{ workspaceId: 'workspace', sessionIds: ['current'] }] }) },
    } as never)
    provider.provide('conversation', { input: { for: inputFor } } as never)
    provider.provide('uiWorkspace', { openSession } as never)
    provider.provide('remote.agentPresets', { select } as never)
    new PresetRemote(provider)
  } }).await()
  let start: (() => Promise<unknown>) | undefined
  await ctx.plugin({ inject, apply(consumer) {
    start = () => startDesignDraft(consumer, '/claude-design')
  } }).await()
  if (start === undefined) throw new Error('Draft consumer did not activate')
  return { start, create, select, setDraft, openSession, focus, release }
}

describe('design draft in a real Cordis plugin context', () => {
  it('the upstream injection list rejects before creating a Session', async () => {
    const h = await harness(originalInject)
    await expect(h.start()).rejects.toThrow('cannot get property "workspaces" without inject')
    expect(h.create).not.toHaveBeenCalled()
    expect(h.openSession).not.toHaveBeenCalled()
  })

  it('requires the independently injected preset Remote namespace', async () => {
    const h = await harness(patchedClientInject().filter(name => name !== 'remote.agentPresets'))
    await expect(h.start()).rejects.toThrow('cannot get property "remote.agentPresets" without inject')
    expect(h.select).not.toHaveBeenCalled()
    expect(h.setDraft).not.toHaveBeenCalled()
  })

  it('declared services create and reveal the unsent draft with the selected preset', async () => {
    const inject = patchedClientInject()
    expect(inject).toEqual(expect.arrayContaining([...originalInject, ...draftInject]))
    const h = await harness(inject)
    await expect(h.start()).resolves.toBe('new')
    expect(h.create).toHaveBeenCalledWith({ workspaceId: 'workspace' })
    expect(h.select).toHaveBeenCalledWith('new', 'selected')
    expect(h.setDraft).toHaveBeenCalledWith('/claude-design')
    expect(h.openSession).toHaveBeenCalledWith('new')
    expect(h.focus).toHaveBeenCalledOnce()
    expect(h.release).toHaveBeenCalledOnce()
  })
})
