import { Context } from '@deepseek-ai/cordis'
import { setImmediate } from 'node:timers/promises'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ClientWorkspaceModel, type WorkspaceRemote } from '../../../../packages/api/workspace-controller/src/client/model.ts'
import { WorkspaceController } from '../../../../packages/api/workspace-controller/src/client/service.ts'
import type { WorkspaceView } from '../../../../packages/api/workspace-controller/src/types.ts'
import { LayoutController } from '../../../../packages/client/ui-layout/src/client/service.ts'
import { UiWorkspaceService } from '../../../../packages/client/ui-workspace/src/client/navigation.ts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startDesignDraft } from './client-start.mjs'

const cleanups: (() => void | Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})
const oldId = SessionId('old')
const newId = SessionId('new')
const workspace: WorkspaceView = {
  workspaceId: 'workspace' as WorkspaceView['workspaceId'], path: '/workspace', title: 'Workspace',
  sessionIds: [oldId], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}

function harness({ sessionsReady = true, workspacesReady = false } = {}) {
  const owner = new Context()
  cleanups.push(() => owner.fiber.dispose())
  const initializeDefault = vi.fn(async () => ({ ok: true as const, value: { workspace } }))
  const model = new ClientWorkspaceModel({ initializeDefault } as WorkspaceRemote)
  const workspaces = new WorkspaceController(owner, model)
  const sessionList = createSnapshotStore<SessionListState>({
    ids: [oldId], phase: sessionsReady ? 'ready' : 'pending', projectionsBySession: {},
    byId: { [oldId]: { id: oldId, displayTitle: 'Old', running: false, blank: true,
      updatedAt: 0, retainedBy: { mainView: 1 } } },
  })
  const layout = new LayoutController({ selectPanel() {} } as never, () => true, {} as never)
  cleanups.push(() => layout.dispose())
  const beginNavigation = vi.spyOn(layout, 'beginNavigation')
  owner.provide('layout', layout)
  const drafts = new Map([[oldId, 'Keep this unsent draft']])
  const create = vi.fn(async () => newId)
  const openSession = vi.fn(() => layout.selectPanel(null))
  const ctx = {
    layout, workspaces,
    sessions: {
      list: sessionList, create,
      retain(id: SessionId) {
        const binding = { sessionId: id, ctx: { id } }
        return { sessionId: id, binding, ready: Promise.resolve(binding), release() {}, [Symbol.dispose]() {} }
      },
      subagentAddress() {},
      async using(id: SessionId, _options: object, operation: (reference: object) => Promise<void>) {
        await operation({ ready: Promise.resolve(), binding: { ctx: { id } } })
      },
    },
    conversation: { input: { for: ({ id }: { id: SessionId }) => ({
      setDraft: (text: string) => drafts.set(id, text), focus() {},
    }) } },
    uiWorkspace: { openSession },
  }
  const baseline = (items: readonly WorkspaceView[] = [workspace]) => model.replaceBaseline({
    items, archivedSessionIds: [], pinnedSessionIds: [],
  })
  if (workspacesReady) baseline()
  return { owner, ctx, model, sessionList, baseline, initializeDefault, beginNavigation, create, openSession, drafts }
}

describe('design draft baseline readiness', () => {
  it('ignores a pending Workspace action without navigation or replay, then accepts a new ready action', async () => {
    const h = harness()
    await expect(startDesignDraft(h.ctx, '/claude-design pending')).resolves.toBeUndefined()
    expect(h.beginNavigation).not.toHaveBeenCalled()
    expect(h.initializeDefault).not.toHaveBeenCalled()
    expect(h.create).not.toHaveBeenCalled()
    h.baseline()
    expect(h.create).not.toHaveBeenCalled()
    await expect(startDesignDraft(h.ctx, '/claude-design ready')).resolves.toBe(newId)
    expect(h.create).toHaveBeenCalledWith({ workspaceId: workspace.workspaceId })
    expect(h.initializeDefault).not.toHaveBeenCalled()
    expect(h.drafts.get(oldId)).toBe('Keep this unsent draft')
    expect(h.drafts.get(newId)).toBe('/claude-design ready')
  })

  it('ignores a pending Session action even with a ready Workspace baseline', async () => {
    const h = harness({ sessionsReady: false, workspacesReady: true })
    await expect(startDesignDraft(h.ctx, '/claude-design pending')).resolves.toBeUndefined()
    expect(h.beginNavigation).not.toHaveBeenCalled()
    expect(h.create).not.toHaveBeenCalled()
    h.sessionList.set({ ...h.sessionList.getSnapshot(), phase: 'ready' })
    await expect(startDesignDraft(h.ctx, '/claude-design ready')).resolves.toBe(newId)
    expect(h.create).toHaveBeenCalledOnce()
  })

  it('newer navigation cancels an already-ready draft creation without opening it', async () => {
    const h = harness({ workspacesReady: true })
    const creation = Promise.withResolvers<SessionId>()
    h.create.mockImplementationOnce(() => creation.promise)
    const pending = startDesignDraft(h.ctx, '/claude-design')
    expect(h.create).toHaveBeenCalledOnce()
    h.ctx.layout.selectPanel('settings' as never)
    creation.resolve(newId)
    await expect(pending).resolves.toBeUndefined()
    expect(h.openSession).not.toHaveBeenCalled()
    expect(h.drafts.get(oldId)).toBe('Keep this unsent draft')
    expect(h.drafts.has(newId)).toBe(false)
  })

  it('repeated ready clicks reveal only the latest unsent draft', async () => {
    const h = harness({ workspacesReady: true })
    const creation = Promise.withResolvers<SessionId>()
    h.create.mockImplementationOnce(() => creation.promise)
    const first = startDesignDraft(h.ctx, '/claude-design first')
    const latest = startDesignDraft(h.ctx, '/claude-design latest')
    creation.resolve(SessionId('superseded'))
    await expect(first).resolves.toBeUndefined()
    await expect(latest).resolves.toBe(newId)
    expect(h.openSession).toHaveBeenCalledOnce()
    expect(h.openSession).toHaveBeenCalledWith(newId)
    expect(h.drafts.get(newId)).toBe('/claude-design latest')
    expect(h.drafts.get(oldId)).toBe('Keep this unsent draft')
  })

  it('uses first-use initialization only for an explicit ready-empty action', async () => {
    const h = harness()
    h.sessionList.set({ ids: [], byId: {}, phase: 'ready', projectionsBySession: {} })
    await expect(startDesignDraft(h.ctx, '/claude-design pending')).resolves.toBeUndefined()
    expect(h.initializeDefault).not.toHaveBeenCalled()
    h.baseline([])
    await expect(startDesignDraft(h.ctx, '/claude-design ready')).resolves.toBe(newId)
    expect(h.initializeDefault).toHaveBeenCalledOnce()
    expect(h.create).toHaveBeenCalledWith({ workspaceId: workspace.workspaceId })
  })

  it('keeps a failed initial Workspace stream inactive without navigation or mutations', async () => {
    const h = harness()
    h.model.handleStreamFailure(new RemoteError('gateway/internal', 'Workspace stream failed', {}))
    expect(h.model.getSnapshot()).toMatchObject({ phase: 'pending', state: 'error' })
    await expect(startDesignDraft(h.ctx, '/claude-design')).resolves.toBeUndefined()
    expect(h.beginNavigation).not.toHaveBeenCalled()
    expect(h.create).not.toHaveBeenCalled()
    expect(h.initializeDefault).not.toHaveBeenCalled()
    expect(h.drafts.get(oldId)).toBe('Keep this unsent draft')
  })

  it('allows a post-baseline action after real UiWorkspace startup begins automatic restoration', async () => {
    const h = harness({ sessionsReady: false })
    const restoreStarted = Promise.withResolvers<void>()
    const restoreFinished = Promise.withResolvers<SessionId>()
    cleanups.push(() => { restoreFinished.resolve(oldId) })
    const retain = vi.spyOn(h.ctx.sessions, 'retain')
    h.create.mockImplementationOnce(() => {
      restoreStarted.resolve()
      return restoreFinished.promise
    })
    const navigation = new UiWorkspaceService(h.owner, {} as never, h.ctx.workspaces,
      h.ctx.sessions as never, { pinSessionOrder() {} }, () => {})
    const open = vi.spyOn(navigation, 'openSession')
    const ctx = { ...h.ctx, uiWorkspace: navigation }
    const ignored = startDesignDraft(ctx, '/claude-design pending')
    expect(h.beginNavigation).not.toHaveBeenCalled()
    await expect(ignored).resolves.toBeUndefined()
    h.baseline()
    h.sessionList.set({ ...h.sessionList.getSnapshot(), phase: 'ready' })
    await restoreStarted.promise
    expect(h.beginNavigation).toHaveBeenCalledOnce()
    await expect(startDesignDraft(ctx, '/claude-design ready')).resolves.toBe(newId)
    expect(open).toHaveBeenCalledWith(newId)
    restoreFinished.resolve(oldId)
    // Drain UiWorkspace's asynchronous restore completion, including its navigation check.
    await setImmediate()
    expect(retain).toHaveBeenCalledOnce()
    expect(retain).toHaveBeenCalledWith(newId, { source: 'mainView' })
    expect(h.drafts.get(newId)).toBe('/claude-design ready')
    expect(h.drafts.get(oldId)).toBe('Keep this unsent draft')
  })
})
