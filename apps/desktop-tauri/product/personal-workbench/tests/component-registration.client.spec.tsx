// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installDesktopComponentSettings } from '../src/client/index.tsx'
import { componentEn, componentZh, type ComponentLocaleKey } from '../src/client/component-locales.ts'
import type { ComponentOverview } from '../src/client/component-model.ts'

const snapshot: ComponentOverview = { appVersion: '0.4.9', components: [{ key: 'harborPlugin', kind: 'optional', version: '0.5.5', purpose: 'Agent evaluation interface', archiveBytes: 42, installedBytes: null, state: 'prepared', policy: 'manual', canInstall: true, canChangePolicy: false, canClean: false, error: null, runtimeToken: null }], metrics: null, metricsError: null }
const originalParent = window.parent
const parent = { postMessage: vi.fn() }
const t = (key: ComponentLocaleKey): string => componentEn[key]
const message = async (value: unknown): Promise<void> => {
  const request = parent.postMessage.mock.calls.at(-1)?.[0] as { type: string; requestId: string }
  await act(async () => { window.dispatchEvent(new MessageEvent('message', { source: parent as never, origin: 'http://127.0.0.1:45678', data: { channel: 'yourbuddy.desktop.components', version: 1, type: request.type.replace('-request', '-response'), requestId: request.requestId, ok: true, value } })) })
}

async function setup(inventoryEntryId = 'harbor_live') {
  const ctx = new Context()
  const registry = ctx.plugin(SlotRegistry)
  await registry.await()
  const slots = ctx.get('slots') as SlotRegistry
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const listBundles = vi.fn().mockResolvedValue({ ok: true, value: [{ name: 'dsh-harbor-evolution', rows: [{ rowId: 'harbor-evolution', moduleName: 'dsh-harbor-evolution', entryId: 'harbor_live' }] }] })
  const list = vi.fn().mockResolvedValue({ ok: true, value: { entries: [{ entryId: inventoryEntryId, moduleName: 'dsh-harbor-evolution', enabled: true, fiberPhase: 'active' }] } })
  ctx.provide('remote', { pluginManager: { listBundles }, pluginInventory: { list } } as never)
  const removeRoot = slots.register({ name: 'root', children: { 'settings.general.item': { kind: 'list', scope: 'root' } } } as never, () => null)
  const fiber = ctx.plugin({ inject: ['slots', 'locale', 'remote'], apply(clientCtx) { installDesktopComponentSettings(clientCtx) } })
  await fiber.await()
  return { slots, listBundles, list, async dispose() { await fiber.dispose(); removeRoot(); await registry.dispose() } }
}

afterEach(() => {
  cleanup()
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent })
  vi.restoreAllMocks()
  parent.postMessage.mockClear()
})

function embed(): void {
  Object.defineProperty(window, 'parent', { configurable: true, value: parent })
  vi.spyOn(document, 'referrer', 'get').mockReturnValue('http://127.0.0.1:45678/')
}

describe('component settings registration', () => {
  it('adds no native controls or requests to a standalone Host preview', async () => {
    const value = await setup()
    try { expect(value.slots.entries('settings.general.item')).toEqual([]); expect(parent.postMessage).not.toHaveBeenCalled() }
    finally { await value.dispose() }
  })

  it('keeps one controller across locale rerenders and removes pending work with the view and owner', async () => {
    embed()
    const value = await setup()
    try {
      const entry = value.slots.entries('settings.general.item')[0]!
      expect(entry.options).toMatchObject({ id: 'yourbuddy-components', order: 37 })
      const Component = entry.component as ComponentType<{ t: typeof t }>
      const view = render(<Component t={t} />)
      expect(parent.postMessage).toHaveBeenCalledOnce()
      await message(snapshot)
      view.rerender(<Component t={key => componentZh[key]} />)
      expect(parent.postMessage).toHaveBeenCalledOnce()
      fireEvent.click(screen.getByRole('button', { name: '查看安装计划' }))
      expect(parent.postMessage).toHaveBeenCalledTimes(2)
      view.unmount()
      await act(async () => {})
      await value.dispose()
      expect(value.slots.entries('settings.general.item')).toEqual([])
    }
    finally { await value.dispose() }
  })

  it('joins only the Harbor plugin row and real active Fiber by exact entry identity before reporting', async () => {
    embed()
    const value = await setup()
    try {
      const Component = value.slots.entries('settings.general.item')[0]!.component as ComponentType<{ t: typeof t }>
      render(<Component t={t} />)
      const eligible = { ...snapshot, components: snapshot.components.map(item => ({ ...item, runtimeToken: 'epoch_install_1' })) }
      await message(eligible)
      expect(value.listBundles).toHaveBeenCalledOnce()
      expect(value.list).toHaveBeenCalledOnce()
      expect(parent.postMessage.mock.calls.at(-1)?.[0]).toMatchObject({ type: 'report-request', component: 'harborPlugin', state: 'active', runtimeToken: 'epoch_install_1' })
      await message({ restartRequired: false })
      await message({ ...eligible, components: eligible.components.map(item => ({ ...item, state: 'active' })) })
      expect(screen.getByText('Active')).toBeTruthy()
    }
    finally { cleanup(); await value.dispose() }
  })

  it('does not treat the default harness or Harbor Python environment as a plugin mount', async () => {
    embed()
    const value = await setup()
    try {
      const Component = value.slots.entries('settings.general.item')[0]!.component as ComponentType<{ t: typeof t }>
      render(<Component t={t} />)
      const component = snapshot.components[0]!
      await message({ ...snapshot, components: [
        { ...component, key: 'harness', kind: 'core-runtime', policy: 'required', canInstall: false, state: 'in-use', runtimeToken: 'core_token' },
        { ...component, key: 'harbor', runtimeToken: 'python_token' },
      ] })
      expect(value.listBundles).not.toHaveBeenCalled()
      expect(value.list).not.toHaveBeenCalled()
      expect(parent.postMessage).toHaveBeenCalledOnce()
      expect(screen.getByText('In use')).toBeTruthy()
      expect(screen.getByText('Prepared (startup not confirmed)')).toBeTruthy()
    }
    finally { cleanup(); await value.dispose() }
  })

  it('does not treat a different active entry or an installed package as the catalog mount', async () => {
    embed()
    const value = await setup('other_live_entry')
    try {
      const Component = value.slots.entries('settings.general.item')[0]!.component as ComponentType<{ t: typeof t }>
      render(<Component t={t} />)
      await message({ ...snapshot, components: snapshot.components.map(item => ({ ...item, runtimeToken: 'epoch_install_1' })) })
      expect(parent.postMessage).toHaveBeenCalledOnce()
      expect(screen.getByText('Prepared (startup not confirmed)')).toBeTruthy()
      expect(screen.queryByText('Active')).toBeNull()
    }
    finally { cleanup(); await value.dispose() }
  })
})
