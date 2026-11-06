// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { LayoutController } from '../../../../packages/client/ui-layout/src/client/service.ts'
import { UiWorkspaceService } from '../../../../packages/client/ui-workspace/src/client/navigation.ts'
import { createSidebarRightController } from '../../../../packages/client/ui-sidebar-right/src/client/service.ts'
import { SidebarRightTabRegistry } from '../../../../packages/client/ui-sidebar-right/src/client/tab-registry.ts'
import { createSidebarRightStore } from '../../../../packages/client/ui-sidebar-right/src/client/stores.ts'
import { browserDefinition } from '../../../../packages/client/ui-sidebar-browser/src/client/definition.tsx'
import { afterEach, expect, it, vi } from 'vitest'

type OpenThread = (ctx: Context, sessionId: string, root: string, threadId?: string) => Promise<string | undefined>
const cleanups: (() => void | Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Expose the managed opener from the installed payload, without mounting its page. */
function installedOpen(): OpenThread {
  const require = createRequire(join(process.cwd(), 'apps/desktop-tauri/bundled/harness/apps/cli/package.json'))
  const entry = process.env.YOURBUDDY_DESIGN_ARTIFACTS_ENTRY ?? require.resolve('dsh-claude-artifacts')
  const source = readFileSync(join(dirname(entry), 'client.js'), 'utf8')
  expect(source.match(/return module\.exports;/g)).toHaveLength(1)
  let open: OpenThread | undefined
  vi.stubGlobal('__ModuleLoader__', { load(definition: {
    factory(resolve: (name: string) => object): { openDesignThread: OpenThread }
  }) {
    open = definition.factory(name => {
      if (name === 'react') return React
      if (name === 'react/jsx-runtime') return jsxRuntime
      if (name === '@deepseek-ai/dsh-client-ui-primitives') {
        return { Button: 'button', Tag: 'span', IconRefreshOutlineRegular: 'svg' }
      }
      throw new Error(`Unexpected Client dependency: ${name}`)
    }).openDesignThread
  } })
  new Function(source.replace('return module.exports;', 'return { openDesignThread };'))()
  if (open === undefined) throw new Error('Installed Artifacts Client did not expose its managed opener')
  return open
}

async function harness(browserRegistered = true) {
  vi.stubGlobal('localStorage', undefined)
  const root = new Context()
  cleanups.push(() => root.fiber.dispose())
  const original = SessionId('original')
  const panels = createSnapshotStore({ activePanelId: 'artifacts' as string | null })
  const layout = new LayoutController({ selectPanel: (id: string | null) => panels.set({ activePanelId: id }) } as never,
    () => true, panels as never)
  const beginNavigation = vi.spyOn(layout, 'beginNavigation')
  const tabs = new SidebarRightTabRegistry(root)
  if (browserRegistered) tabs.register(browserDefinition(((key: string) => key) as Parameters<typeof browserDefinition>[0]))
  const sidebar = createSidebarRightController(tabs, () => {})
  const store = createSidebarRightStore(() => ({ kind: 'guide', title: 'Guide' })).create()
  // History opening is independent of navigation in this test; no model or wire is involved.
  const list = createSnapshotStore({ phase: 'pending', ids: [], byId: {}, items: [], archivedSessionIds: [] })
  const retain = vi.fn((sessionId: string) => ({ sessionId, release() {}, ready: Promise.resolve(), binding: {} }))
  let consumer: Context | undefined
  await root.plugin({ apply(ctx) {
    ctx.provide('layout', layout)
    ctx.provide('sidebarRightTabs', tabs)
    ctx.provide('sidebarRight', sidebar.controller)
    new UiWorkspaceService(ctx, {} as never, { list } as never,
      { list, retain, subagentAddress() {} } as never, { pinSessionOrder() {} }, () => {})
    ctx.effect(() => () => layout.dispose())
  } }).await()
  await root.plugin({ inject: ['layout', 'uiWorkspace'], apply(ctx) { consumer = ctx } }).await()
  if (consumer === undefined) throw new Error('Consumer did not activate')
  const adoptionSubscribed = Promise.withResolvers<void>()
  const subscribe = sidebar.controller.onSessionAdopted.bind(sidebar.controller)
  vi.spyOn(sidebar.controller, 'onSessionAdopted').mockImplementation(listener => {
    const stop = subscribe(listener)
    adoptionSubscribed.resolve()
    return stop
  })
  const adopt = () => { cleanups.push(sidebar.adopt(original, store)) }
  const fetch = vi.fn(async () => Response.json({ url: 'http://127.0.0.1:43100/editor/' }))
  vi.stubGlobal('fetch', fetch)
  return { consumer, original, panels, layout, beginNavigation, sidebar, store, retain, adopt,
    adoptionSubscribed, fetch, open: installedOpen() }
}

/** Own the request before assertions, and fail promptly if it never subscribes. */
async function ownOpening(h: Awaited<ReturnType<typeof harness>>, opening: Promise<string | undefined>) {
  cleanups.push(async () => {
    h.layout.beginNavigation()
    await opening.catch(() => {})
  })
  await Promise.race([
    h.adoptionSubscribed.promise,
    opening.then(() => { throw new Error('Managed opening completed before sidebar adoption subscribed') }),
  ])
}

it('installed opener refuses an unregistered Browser before fetch or navigation', async () => {
  const h = await harness(false)
  await expect(h.open(h.consumer, h.original, '/design')).rejects.toThrow('Enable the Browser sidebar tab')
  expect(h.fetch).not.toHaveBeenCalled()
  expect(h.beginNavigation).not.toHaveBeenCalled()
  expect(h.retain).not.toHaveBeenCalled()
  expect(h.panels.getSnapshot().activePanelId).toBe('artifacts')
})

it('installed opener reveals the original Session through Cordis and delivers URL after real sidebar adoption', async () => {
  const h = await harness()
  const opening = h.open(h.consumer, h.original, '/design', 'thread-1')
  await ownOpening(h, opening)
  expect(h.retain).toHaveBeenCalledWith(h.original, { source: 'mainView' })
  expect(h.panels.getSnapshot().activePanelId).toBeNull()
  expect(h.store.getSnapshot().bySession[h.original]).toBeUndefined()
  h.adopt()
  const url = await opening
  expect(url).toBe('http://127.0.0.1:43100/editor/?comment=thread-1')
  const records = Object.values(h.store.getSnapshot().bySession[h.original]!.layout.tabs)
  expect(records).toHaveLength(1)
  expect(records[0]!.kind).toBe('browser')
  const occurrence = h.sidebar.controller.tabDomain.occurrence(h.original, records[0]!)
  expect(occurrence.navigation.getSnapshot().params).toEqual({ url })
})

it('Settings navigation cancels pending adoption so a late Session store cannot open a stale Browser', async () => {
  const h = await harness()
  const opening = h.open(h.consumer, h.original, '/design')
  await ownOpening(h, opening)
  h.layout.selectPanel('settings' as never)
  await expect(opening).resolves.toBeUndefined()
  h.adopt()
  expect(h.store.getSnapshot().bySession[h.original]).toBeUndefined()
  expect(h.panels.getSnapshot().activePanelId).toBe('settings')
})
