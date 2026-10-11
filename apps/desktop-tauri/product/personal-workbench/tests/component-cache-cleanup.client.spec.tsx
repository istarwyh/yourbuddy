// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComponentSettingsSection } from '../src/client/ComponentSettingsSection.tsx'
import { componentEn, componentZh, type ComponentLocaleKey } from '../src/client/component-locales.ts'
import type { CacheCleanupPreview, CacheCleanupResult, ComponentController, ComponentOverview } from '../src/client/component-model.ts'

const t = (key: ComponentLocaleKey): string => componentEn[key]
const overview: ComponentOverview = { appVersion: '0.4.9', components: [], metrics: null, metricsError: null }
const preview: CacheCleanupPreview = { token: 'preview_1', files: [{ component: 'harbor', kind: 'archive', bytes: 100 }, { component: 'harborPlugin', kind: 'partial', bytes: 10 }, { component: 'harborPlugin', kind: 'resume-metadata', bytes: 2 }], totalBytes: 112 }
const complete: CacheCleanupResult = { deletedBytes: 112, deletedFiles: 3, failures: [], complete: true }
function native() {
  return { load: vi.fn<ComponentController['load']>().mockResolvedValue(overview), plan: vi.fn(), install: vi.fn(), previewCacheCleanup: vi.fn<NonNullable<ComponentController['previewCacheCleanup']>>().mockResolvedValue(preview), cleanCache: vi.fn<NonNullable<ComponentController['cleanCache']>>().mockResolvedValue(complete) }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { resolve, promise }
}
async function showPreview() {
  await screen.findByRole('button', { name: 'Refresh status' })
  await act(async () => {})
  fireEvent.click(screen.getByRole('button', { name: 'Preview download cache' }))
  return await screen.findByRole('button', { name: 'Delete the listed download cache' })
}
afterEach(cleanup)

describe('download cache cleanup confirmation', () => {
  it('hides cleanup unless both optional methods exist', async () => {
    const controller = native()
    const { cleanCache: _clean, ...previewOnly } = controller
    const view = render(<ComponentSettingsSection t={t} controller={previewOnly} />)
    await act(async () => {})
    expect(screen.queryByRole('button', { name: 'Preview download cache' })).toBeNull()
    const { previewCacheCleanup: _preview, ...cleanOnly } = controller
    view.rerender(<ComponentSettingsSection t={t} controller={cleanOnly} />)
    await act(async () => {})
    expect(screen.queryByRole('button', { name: 'Preview download cache' })).toBeNull()
    expect(controller.cleanCache).not.toHaveBeenCalled()
  })

  it('requires an explicit bounded preview and confirmation, and deduplicates deletion clicks', async () => {
    const controller = native()
    const deletion = deferred<CacheCleanupResult>()
    controller.cleanCache.mockReturnValueOnce(deletion.promise)
    render(<ComponentSettingsSection t={t} controller={controller} />)
    const confirm = await showPreview()
    const panel = screen.getByRole('region', { name: 'Review download cache cleanup' })
    expect(screen.getByText(/Cleanup discards resume progress/)).toBeTruthy()
    expect(within(panel).getAllByRole('listitem').map(item => item.textContent)).toMatchInlineSnapshot(`
      [
        "harbor · Downloaded archive · 100 B",
        "harborPlugin · Partial download · 10 B",
        "harborPlugin · Resume metadata · 2 B",
      ]
    `)
    expect(within(panel).getByText('112 B')).toBeTruthy()
    expect(controller.cleanCache).not.toHaveBeenCalled()
    act(() => { fireEvent.click(confirm); fireEvent.click(confirm) })
    expect(controller.cleanCache).toHaveBeenCalledExactlyOnceWith('preview_1')
    expect((screen.getByRole('button', { name: 'Cancel cleanup' }) as HTMLButtonElement).disabled).toBe(true)
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(controller.cleanCache).toHaveBeenCalledOnce()
    await act(async () => { deletion.resolve(complete) })
    expect(screen.getByText('Items actually removed: 3; total size: 112 B.')).toBeTruthy()
    expect(screen.getByText('Download cache cleanup finished.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Delete the listed download cache' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Preview cache again' }))
    expect(controller.install).not.toHaveBeenCalled()
  })

  it('shares the operation lock with installation and never uses per-component runtime cleanup flags', async () => {
    const controller = native()
    controller.load.mockResolvedValue({ ...overview, components: [{ key: 'harbor', kind: 'capability-on-demand', version: '1', purpose: 'Evaluation', archiveBytes: 0, installedBytes: null, state: 'absent', policy: 'on-demand', canInstall: true, canChangePolicy: false, canClean: false, error: null, runtimeToken: null }] })
    render(<ComponentSettingsSection t={t} controller={controller} />)
    await showPreview()
    const install = screen.getByRole('button', { name: 'Review install plan' })
    expect((install as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Refresh status' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(install)
    expect(controller.plan).not.toHaveBeenCalled()
    expect(controller.cleanCache).not.toHaveBeenCalled()
  })

  it('disables confirmation for an empty preview', async () => {
    const controller = native()
    controller.previewCacheCleanup.mockResolvedValue({ token: 'empty_1', files: [], totalBytes: 0 })
    render(<ComponentSettingsSection t={t} controller={controller} />)
    const confirm = await showPreview()
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(confirm)
    expect(screen.getByText('No download cache can be removed.')).toBeTruthy()
    expect(controller.cleanCache).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'escape', 'back'])('never deletes on %s and restores focus', async action => {
    const controller = native()
    render(<ComponentSettingsSection t={t} controller={controller} />)
    await showPreview()
    if (action === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel cleanup' }))
    else if (action === 'escape') fireEvent.keyDown(screen.getByRole('region', { name: 'Review download cache cleanup' }), { key: 'Escape' })
    else act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.queryByRole('region', { name: 'Review download cache cleanup' })).toBeNull()
    expect(controller.cleanCache).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Preview download cache' }))
  })

  it('ignores a dismissed preview after a newer request completes', async () => {
    const controller = native()
    const old = deferred<CacheCleanupPreview>()
    controller.previewCacheCleanup.mockReturnValueOnce(old.promise)
    render(<ComponentSettingsSection t={t} controller={controller} />)
    await act(async () => {})
    const trigger = screen.getByRole('button', { name: 'Preview download cache' })
    act(() => { fireEvent.click(trigger); fireEvent.click(trigger) })
    expect(controller.previewCacheCleanup).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel cleanup' }))
    await showPreview()
    await act(async () => { old.resolve({ token: 'old', files: [], totalBytes: 0 }) })
    expect(screen.getByText('112 B')).toBeTruthy()
    expect(screen.queryByText('No download cache can be removed.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Delete the listed download cache' }))
    await screen.findByText('Download cache cleanup finished.')
    expect(controller.cleanCache).toHaveBeenCalledExactlyOnceWith('preview_1')
  })

  it.each([
    ['CACHE_CLEANUP_BUSY: transaction locked', 'A download or installation is running. Preview again later.'],
    ['CACHE_CLEANUP_UNSUPPORTED: windows', 'Download cache cleanup is not supported on this platform yet.'],
    ['CACHE_CLEANUP_UNSAFE: changed link', 'Cleanup stopped because the cache state is unsafe. Check local diagnostics.'],
  ])('shows %s without deleting or retrying automatically', async (error, message) => {
    const controller = native()
    controller.previewCacheCleanup.mockRejectedValueOnce(new Error(error))
    render(<ComponentSettingsSection t={t} controller={controller} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Preview download cache' }))
    await screen.findByText(message)
    expect(controller.previewCacheCleanup).toHaveBeenCalledOnce()
    expect(controller.cleanCache).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Delete the listed download cache' })).toBeNull()
  })

  it('consumes a stale preview and requires a fresh preview and confirmation', async () => {
    const controller = native()
    controller.cleanCache.mockRejectedValueOnce(new Error('CACHE_CLEANUP_STALE: different cache'))
    controller.previewCacheCleanup.mockResolvedValueOnce(preview).mockResolvedValue({ ...preview, token: 'preview_2' })
    render(<ComponentSettingsSection t={t} controller={controller} />)
    fireEvent.click(await showPreview())
    await screen.findByText('The preview expired or the cache changed. Preview again before confirming.')
    expect(controller.previewCacheCleanup).toHaveBeenCalledOnce()
    expect(controller.cleanCache).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Delete the listed download cache' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Preview cache again' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete the listed download cache' }))
    await screen.findByText('Download cache cleanup finished.')
    expect(controller.cleanCache.mock.calls).toEqual([['preview_1'], ['preview_2']])
  })

  it('displays actual partial deletion and every unfinished item without claiming rollback', async () => {
    const controller = native()
    controller.cleanCache.mockResolvedValue({ deletedBytes: 100, deletedFiles: 1, complete: false, failures: [{ component: 'harborPlugin', kind: 'partial', error: 'file busy' }] })
    render(<ComponentSettingsSection t={t} controller={controller} />)
    fireEvent.click(await showPreview())
    await screen.findByText('Items actually removed: 1; total size: 100 B.')
    expect(screen.getByText(/Only part of the download cache was removed/)).toBeTruthy()
    expect(screen.getByText('harborPlugin · Partial download · file busy')).toBeTruthy()
    expect(screen.queryByText('Download cache cleanup finished.')).toBeNull()
    expect(controller.cleanCache).toHaveBeenCalledOnce()
  })

  it('ignores a late deletion result after unmount', async () => {
    const controller = native()
    const deletion = deferred<CacheCleanupResult>()
    controller.cleanCache.mockReturnValue(deletion.promise)
    const view = render(<ComponentSettingsSection t={t} controller={controller} />)
    fireEvent.click(await showPreview())
    view.unmount()
    await act(async () => { deletion.resolve(complete) })
    expect(controller.cleanCache).toHaveBeenCalledOnce()
    expect(screen.queryByText('Download cache cleanup finished.')).toBeNull()
    expect(controller.load).toHaveBeenCalledOnce()
  })

  it('uses locale-owned Chinese scope and confirmation text', async () => {
    const controller = native()
    render(<ComponentSettingsSection t={key => componentZh[key]} controller={controller} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: '预览下载缓存' }))
    await screen.findByRole('button', { name: '确认删除以上下载缓存' })
    expect(screen.getByText(/不会清理已安装组件或运行目录/)).toBeTruthy()
    expect(screen.getByText(/将失去相应下载的断点续传进度/)).toBeTruthy()
    expect(controller.cleanCache).not.toHaveBeenCalled()
  })
})
