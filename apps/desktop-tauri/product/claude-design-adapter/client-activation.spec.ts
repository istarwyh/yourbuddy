// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ClientWorkspaceModel, type WorkspaceRemote } from '../../../../packages/api/workspace-controller/src/client/model.ts'
import { afterEach, expect, it, vi } from 'vitest'

const cleanups: (() => void | Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Load the installed bundle unchanged except for exposing its private mount entry to the test. */
function mountEntry() {
  const require = createRequire(join(process.cwd(), 'apps/desktop-tauri/bundled/harness/apps/cli/package.json'))
  const entry = process.env.YOURBUDDY_DESIGN_ARTIFACTS_ENTRY ?? require.resolve('dsh-claude-artifacts')
  const source = readFileSync(join(dirname(entry), 'client.js'), 'utf8')
  expect(source.match(/return module\.exports;/g)).toHaveLength(1)
  let mount: ((ctx: object) => () => void) | undefined
  vi.stubGlobal('__ModuleLoader__', {
    load(definition: { factory(resolve: (name: string) => object): { mountPage: (ctx: object) => () => void } }) {
      mount = definition.factory(name => {
        if (name === 'react') return React
        if (name === 'react/jsx-runtime') return jsxRuntime
        // These decorative primitives do not own the creation controls under test.
        if (name === '@deepseek-ai/dsh-client-ui-primitives') {
          return { Button: 'button', Tag: 'span', IconRefreshOutlineRegular: 'svg' }
        }
        throw new Error(`Unexpected Client dependency: ${name}`)
      }).mountPage
    },
  })
  new Function(source.replace('return module.exports;', 'return { mountPage };'))()
  if (mount === undefined) throw new Error('Artifacts Client did not register its module')
  return mount
}

it('installed creation controls activate only after both real list baselines and unsubscribe on unmount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const workspaceModel = new ClientWorkspaceModel({} as WorkspaceRemote)
  const sessionList = createSnapshotStore({ phase: 'pending', ids: [], byId: {} })
  let workspaceSubscribers = 0, sessionSubscribers = 0
  const subscribeWorkspace = workspaceModel.subscribe.bind(workspaceModel)
  vi.spyOn(workspaceModel, 'subscribe').mockImplementation(listener => {
    workspaceSubscribers++
    const stop = subscribeWorkspace(listener)
    return () => { workspaceSubscribers--; stop() }
  })
  const subscribeSessions = sessionList.subscribe.bind(sessionList)
  vi.spyOn(sessionList, 'subscribe').mockImplementation(listener => {
    sessionSubscribers++
    const stop = subscribeSessions(listener)
    return () => { sessionSubscribers--; stop() }
  })
  const create = vi.fn()
  const sessionRead = Promise.withResolvers<void>()
  const refresh = vi.fn(() => sessionRead.promise)
  const dictionaries = new Map<string, Record<string, string>>()
  let page: { component: ComponentType<Record<string, unknown>>, props: Record<string, unknown> } | undefined
  const ctx = {
    sessions: { list: sessionList, create, refresh },
    workspaces: { list: workspaceModel },
    uiWorkspace: { startSession: vi.fn() },
    locale: {
      register: (namespace: string, locales: { en: Record<string, string> }) => {
        dictionaries.set(namespace, locales.en)
        return () => dictionaries.delete(namespace)
      },
      bind: (namespace: string) => (key: string, params: Record<string, string> = {}) =>
        (dictionaries.get(namespace)?.[key] ?? key).replace(/\{(\w+)\}/g, (_match, name: string) => params[name] ?? ''),
    },
    slots: {
      inject: (_name: string, register: () => () => void) => register(),
      register: (spec: { name: string, locale: string, inject: () => Record<string, unknown> }, component: ComponentType<Record<string, unknown>>): (() => void) => {
        if (spec.name === 'main') page = { component, props: { ...spec.inject(), t: ctx.locale.bind(spec.locale) } }
        return () => {}
      },
    },
    get(name: string): unknown { return name === 'sessions' ? this.sessions : name === 'uiWorkspace' ? this.uiWorkspace : undefined },
  }
  vi.stubGlobal('fetch', async (url: string) => {
    expect(url).toBe('api/baoyu-design.artifacts')
    return Response.json({ artifacts: [], skills: [{ skill: 'claude-design', everywhere: true, plugin: 'dsh-claude-design' }] })
  })
  const disposeMount = mountEntry()(ctx)
  cleanups.push(disposeMount)
  if (page === undefined) throw new Error('Artifacts page did not mount')
  const { component, props } = page
  const container = document.createElement('div')
  document.body.append(container)
  cleanups.push(() => container.remove())
  const root = createRoot(container)
  cleanups.push(async () => { await act(async () => root.unmount()) })
  await act(async () => root.render(React.createElement(component, props)))
  const tile = container.querySelector<HTMLButtonElement>('button.bda-tile[data-skill="claude-design"]')
  const add = container.querySelector<HTMLButtonElement>('button[aria-label="New"]')
  expect(tile).not.toBeNull()
  expect(add).not.toBeNull()
  expect(tile!.disabled).toBe(true)
  expect(add!.disabled).toBe(true)
  expect(tile!.getAttribute('aria-busy')).toBe('true')
  expect(refresh).toHaveBeenCalledOnce()
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading workspaces and sessions…')
  await act(async () => { tile!.click(); add!.click() })
  const createFromMenu = props.create as (skill?: string) => void
  createFromMenu()
  expect(create).not.toHaveBeenCalled()
  expect(ctx.uiWorkspace.startSession).not.toHaveBeenCalled()
  await act(async () => workspaceModel.handleStreamFailure(new RemoteError('gateway/internal', 'Workspace feed failed', {})))
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Could not load workspaces: Workspace feed failed')
  expect(tile!.getAttribute('aria-busy')).toBe('false')
  expect(tile!.disabled).toBe(true)
  await act(async () => workspaceModel.replaceBaseline({ items: [], archivedSessionIds: [], pinnedSessionIds: [] }))
  expect(tile!.disabled).toBe(true)
  expect(add!.disabled).toBe(true)
  await act(async () => sessionRead.resolve())
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Could not load sessions. Reload the app and try again.')
  expect(tile!.getAttribute('aria-busy')).toBe('false')
  await act(async () => sessionList.set({ ...sessionList.getSnapshot(), phase: 'ready' }))
  expect(tile!.disabled).toBe(false)
  expect(add!.disabled).toBe(false)
  expect(container.querySelector('[role="alert"]')).toBeNull()
  await act(async () => add!.click())
  const menuItems = [...container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
  expect(menuItems.length).toBe(2)
  expect(menuItems.every(item => !item.disabled)).toBe(true)
  // Verify the menu's own controls retain the same guard, including a currently open menu.
  await act(async () => sessionList.set({ ...sessionList.getSnapshot(), phase: 'pending' }))
  expect(menuItems.every(item => item.disabled)).toBe(true)
  expect(workspaceSubscribers).toBe(1)
  expect(sessionSubscribers).toBe(1)
  await act(async () => root.unmount())
  cleanups.pop()
  expect(workspaceSubscribers).toBe(0)
  expect(sessionSubscribers).toBe(0)
})
