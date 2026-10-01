// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import {
  createClientModuleSystem, parseBootManifest,
  type ClientBundleRegistration, type ClientModuleLoader, type ClientModuleLoaderTarget, type WebBootEntry, type WebBootGraph,
} from '@deepseek-ai/dsh-client-modules/client'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { assertEntriesActive, bootClient, type EntryStateLabel } from '../src/boot-client.ts'
import { FIBER_STATE } from '../src/loader-status.ts'

const BOOTSTRAP_ID = '@deepseek-ai/dsh-client-modules'

function graphOf(ids: readonly string[]): WebBootGraph {
  const entries: WebBootEntry[] = ids.map(id => ({ id, url: `/${id}.js`, rev: '1' }))
  return {
    rev: 'graph',
    entries,
    batches: [{ phase: 'application', url: '/application.js', rev: 'batch', entries: [...ids] }],
  }
}

/** Module system seeded with inline plugin modules; `loaded` records every transport call. */
function modulesOf(graph: WebBootGraph, staticModules: Record<string, unknown>): { modules: ClientModuleLoader; loaded: string[] } {
  const loaded: string[] = []
  const pendingQueue: ClientBundleRegistration[] = []
  const target: ClientModuleLoaderTarget = {
    mode: 'queue',
    pendingQueue,
    load: (registration) => { pendingQueue.push(registration) },
    create: options => createClientModuleSystem(target, { id: BOOTSTRAP_ID, exports: {} }, options),
  }
  const modules = target.create({
    boot: graph,
    staticModules,
    loadBundle: async (url) => { loaded.push(url) },
  })
  return { modules, loaded }
}

/** Recording progress sink. */
function stateSink(): { states: Map<string, EntryStateLabel[]>; onEntryState: (name: string, state: EntryStateLabel) => void } {
  const states = new Map<string, EntryStateLabel[]>()
  return {
    states,
    onEntryState: (name, state) => { states.set(name, [...(states.get(name) ?? []), state]) },
  }
}

describe('bootClient', () => {
  it('activates every seeded row without touching the bundle transport', async () => {
    const graph = graphOf(['provider', 'consumer'])
    const { modules, loaded } = modulesOf(graph, {
      provider: { apply: (ctx: Context) => { ctx.reflect.provide('x', { marker: 'x' }) } },
      consumer: { inject: ['x'], apply: () => {} },
    })
    const ctx = new Context()
    const sink = stateSink()

    await bootClient({ ctx, modules, manifest: modules.manifest, onEntryState: sink.onEntryState })

    expect(loaded).toEqual([])
    const consumer = sink.states.get('consumer') ?? []
    expect(consumer[0]).toBe('loading')
    expect(consumer.at(-1)).toBe('active')
    expect(sink.states.get('provider')?.at(-1)).toBe('active')
    await ctx.fiber.dispose()
  })

  it('warns without blocking when an optional row waits on a missing service', async () => {
    const graph = graphOf(['orphan'])
    const { modules } = modulesOf(graph, { orphan: { inject: ['nothing'], apply: () => {} } })
    const ctx = new Context()
    const warn = vi.spyOn(ctx.logger, 'warn').mockImplementation(() => {})

    await expect(bootClient({ ctx, modules, manifest: modules.manifest })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('orphan: pending (waiting for service: nothing)'))
    await ctx.fiber.dispose()
  })

  it('reports and logs an import failure for a row that is neither seeded nor a graph row', async () => {
    const { modules } = modulesOf(graphOf(['seeded']), { seeded: { apply: () => {} } })
    const manifest = parseBootManifest(graphOf(['@deepseek-ai/dsh-client-ui-renderer']))
    const ctx = new Context()
    onTestFinished(() => ctx.fiber.dispose())
    const error = vi.spyOn(ctx.logger, 'error').mockImplementation(() => {})
    onTestFinished(() => { error.mockRestore() })
    const sink = stateSink()

    await expect(bootClient({ ctx, modules, manifest, onEntryState: sink.onEntryState })).rejects.toThrow(
      'web boot: 1 required entry did not activate\n@deepseek-ai/dsh-client-ui-renderer: import failed (see console for the import error)',
    )
    expect(sink.states.get('@deepseek-ai/dsh-client-ui-renderer')).toEqual(['loading', 'failed'])
    expect(error).toHaveBeenCalledOnce()
    expect(error.mock.calls[0]?.[0]).toHaveProperty('message', expect.stringContaining('client-modules: cannot resolve'))
  })
})

describe('assertEntriesActive', () => {
  interface FakeEntry { name: string; fiber?: { state: number; inject: Record<string, null> } }

  /** Loader-shaped double: entries with scripted fiber states, services by name. */
  function auditCtx(entries: readonly FakeEntry[], services: Record<string, unknown> = {}): Context {
    return {
      loader: {
        * entries() {
          for (const entry of entries) yield { options: { name: entry.name }, fiber: entry.fiber }
        },
      },
      get: (name: string) => services[name],
    } as unknown as Context
  }

  const silent = { importError: () => undefined }

  it('passes when every entry is active', () => {
    expect(() => { assertEntriesActive(auditCtx([{ name: 'a', fiber: { state: FIBER_STATE.ACTIVE, inject: {} } }]), silent) }).not.toThrow()
  })

  it('warns about optional import failures, missing services, and other non-active states', () => {
    const ctx = auditCtx([
      { name: 'lost' },
      { name: 'waiting', fiber: { state: FIBER_STATE.PENDING, inject: { present: null, a: null, b: null } } },
      { name: 'opaque', fiber: { state: FIBER_STATE.PENDING, inject: {} } },
      { name: 'broken', fiber: { state: FIBER_STATE.FAILED, inject: {} } },
    ], { present: {} })

    const warn = vi.fn()
    expect(() => { assertEntriesActive(ctx, silent, warn) }).not.toThrow()
    expect(warn).toHaveBeenCalledWith([
      'web boot: 4 optional entries did not activate',
      'lost: import failed (see console for the import error)',
      'waiting: pending (waiting for services: a, b)',
      'opaque: pending (waiting for services: unknown)',
      'broken: failed',
    ].join('\n'))
  })

  it('uses the singular form for one required failing entry', () => {
    expect(() => { assertEntriesActive(auditCtx([{ name: '@deepseek-ai/dsh-client-ui-layout' }]), silent) }).toThrow('web boot: 1 required entry did not activate\n')
  })

  it('names the recorded import error of a required fiberless entry', () => {
    const recorded = new Map([['@deepseek-ai/dsh-client-ui-renderer', new Error('client-modules: renderer bundle failed to load')]])
    const modules = { importError: (id: string) => recorded.get(id) }
    expect(() => { assertEntriesActive(auditCtx([{ name: '@deepseek-ai/dsh-client-ui-renderer' }, { name: 'quiet' }]), modules) }).toThrow([
      'web boot: 1 required entry did not activate',
      '@deepseek-ai/dsh-client-ui-renderer: import failed: client-modules: renderer bundle failed to load',
    ].join('\n'))
  })
})
