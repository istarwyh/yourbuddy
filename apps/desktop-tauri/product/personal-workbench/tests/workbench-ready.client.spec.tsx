// @vitest-environment jsdom
import { createElement, Suspense } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductWorkbenchController, ProductWorkbenchHost } from '../src/client/workbench.tsx'

const metrics = vi.hoisted(() => ({ ready: vi.fn(), dispose: vi.fn(), install: vi.fn() }))
vi.mock('../src/client/desktop-component-metrics.ts', () => ({ installDesktopComponentMetrics: () => { metrics.install(); return { ready: metrics.ready, dispose: metrics.dispose } } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const controller = new ProductWorkbenchController(undefined)
const props = { renderSlot: (name: string) => createElement('span', null, name), useProductWorkbench: (selector: (value: ReturnType<typeof controller.getSnapshot>) => unknown) => selector(controller.getSnapshot()), collapseSession() {}, restoreSession() {}, t: (key: string) => key }

describe('workbench commit readiness', () => {
  it('reports only after the actual workbench DOM commits and cleans up its adapter', () => {
    metrics.ready.mockImplementation(() => { expect(document.querySelector('[data-product-workbench]')).not.toBeNull() })
    expect(metrics.ready).not.toHaveBeenCalled()
    const view = render(createElement(ProductWorkbenchHost, props as never))
    expect(metrics.ready).toHaveBeenCalledOnce()
    view.rerender(createElement(ProductWorkbenchHost, { ...props, t: (key: string) => `localized:${key}` } as never))
    expect(metrics.ready).toHaveBeenCalledOnce()
    view.unmount()
    expect(metrics.dispose).toHaveBeenCalledOnce()
  })

  it('does not report a render suspended before the workbench commits', () => {
    const pending = new Promise(() => {})
    const view = render(createElement(Suspense, { fallback: createElement('div', null, 'Pending') }, createElement(ProductWorkbenchHost, { ...props, renderSlot() { throw pending } } as never)))
    expect(view.queryByText('Pending')).not.toBeNull()
    expect(metrics.install).not.toHaveBeenCalled()
    expect(metrics.ready).not.toHaveBeenCalled()
    view.unmount()
  })
})
