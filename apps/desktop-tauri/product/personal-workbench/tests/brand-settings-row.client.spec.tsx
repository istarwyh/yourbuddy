// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ConfigForm, ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrandSettingsRow } from '../src/client/BrandSettingsRow.tsx'
import type { BrandSettingsRowProps } from '../src/client/BrandSettingsRow.tsx'
import type { WorkbenchSettingsValue } from '../src/client/brand.tsx'
import { en } from '../src/client/locales.ts'

class FakeScope implements ConfigForm<WorkbenchSettingsValue> {
  readonly set = vi.fn(async () => true)
  readonly unset = vi.fn<ConfigForm<WorkbenchSettingsValue>['unset']>(async () => true)
  readonly mutate = vi.fn(async () => true)
  private readonly snapshot: ConfigFormSnapshot<WorkbenchSettingsValue> = {
    status: 'ready',
    value: {
      enabled: false,
      name: '',
      logo: '',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: true,
    },
    base: {},
    user: {},
    revision: 0,
    writable: true,
    mode: 'host',
  }

  getSnapshot(): ConfigFormSnapshot<WorkbenchSettingsValue> { return this.snapshot }
  subscribe(): () => void { return () => {} }
}

function mount(scope: FakeScope) {
  const props = {
    scope,
    readLocale: () => 'en',
    t: (key: keyof typeof en) => en[key],
  } as BrandSettingsRowProps
  return render(<BrandSettingsRow {...props} />)
}

afterEach(() => { cleanup() })

describe('personal workbench branding card', () => {
  it('previews and saves custom Hero copy with an optional badge', async () => {
    const scope = new FakeScope()
    const view = mount(scope)

    expect(view.getByText('Into the Unknown')).toBeTruthy()
    expect(view.getByText('Preview')).toBeTruthy()

    fireEvent.change(view.getByLabelText('Workbench name'), { target: { value: 'Research Lab' } })
    fireEvent.change(view.getByLabelText('Home headline'), { target: { value: 'Explore together' } })
    fireEvent.change(view.getByLabelText('Headline badge'), { target: { value: 'Early access' } })
    expect(view.getByText('Explore together')).toBeTruthy()
    expect(view.getByText('Early access')).toBeTruthy()

    fireEvent.click(view.getByLabelText('Show headline badge'))
    expect(view.queryByText('Early access')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Apply to workbench' }))

    await waitFor(() => { expect(scope.mutate).toHaveBeenCalledOnce() })
    expect(scope.mutate).toHaveBeenCalledWith([
      { op: 'set', path: ['name'], value: 'Research Lab' },
      { op: 'set', path: ['logo'], value: '' },
      { op: 'set', path: ['heroHeadline'], value: 'Explore together' },
      { op: 'set', path: ['heroBadge'], value: 'Early access' },
      { op: 'set', path: ['showHeroBadge'], value: false },
      { op: 'set', path: ['enabled'], value: true },
    ])
  })

  it('clears every branding override when restoring defaults', async () => {
    const scope = new FakeScope()
    const view = mount(scope)
    fireEvent.click(view.getByRole('button', { name: 'Restore YourBuddy default' }))

    await waitFor(() => { expect(scope.mutate).toHaveBeenCalledOnce() })
    expect(scope.mutate).toHaveBeenCalledWith([
      { op: 'set', path: ['enabled'], value: false },
      { op: 'unset', path: ['name'] },
      { op: 'unset', path: ['logo'] },
      { op: 'unset', path: ['heroHeadline'] },
      { op: 'unset', path: ['heroBadge'] },
      { op: 'unset', path: ['showHeroBadge'] },
    ])
  })

  it('reports a refused atomic branding update', async () => {
    const scope = new FakeScope()
    scope.mutate.mockResolvedValueOnce(false)
    const view = mount(scope)
    fireEvent.change(view.getByLabelText('Workbench name'), { target: { value: 'Research Lab' } })
    fireEvent.click(view.getByRole('button', { name: 'Apply to workbench' }))

    expect(await view.findByText('Could not save. Check the settings document and try again.')).toBeTruthy()
    expect(view.queryByText('Applied')).toBeNull()
  })
})
