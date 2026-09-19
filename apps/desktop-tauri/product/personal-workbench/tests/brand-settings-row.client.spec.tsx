// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrandSettingsRow } from '../src/client/BrandSettingsRow.tsx'
import type { BrandSettingsRowProps } from '../src/client/BrandSettingsRow.tsx'
import type { WorkbenchSettingsValue } from '../src/client/brand.tsx'
import { en } from '../src/client/locales.ts'

class FakeScope implements SettingsScope<WorkbenchSettingsValue> {
  readonly set = vi.fn(async () => {})
  readonly unset = vi.fn(async () => {})
  readonly mutate = vi.fn(async () => {})
  private readonly snapshot: SettingsScopeSnapshot<WorkbenchSettingsValue> = {
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

  getSnapshot(): SettingsScopeSnapshot<WorkbenchSettingsValue> { return this.snapshot }
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

    await waitFor(() => { expect(scope.set).toHaveBeenCalledWith('enabled', true) })
    expect(scope.set.mock.calls).toEqual([
      ['name', 'Research Lab'],
      ['logo', ''],
      ['heroHeadline', 'Explore together'],
      ['heroBadge', 'Early access'],
      ['showHeroBadge', false],
      ['enabled', true],
    ])
  })

  it('clears every branding override when restoring defaults', async () => {
    const scope = new FakeScope()
    const view = mount(scope)
    fireEvent.click(view.getByRole('button', { name: 'Restore YourBuddy default' }))

    await waitFor(() => { expect(scope.unset).toHaveBeenCalledTimes(5) })
    expect(scope.set).toHaveBeenCalledWith('enabled', false)
    expect(scope.unset.mock.calls.map(call => call[0])).toEqual([
      'name', 'logo', 'heroHeadline', 'heroBadge', 'showHeroBadge',
    ])
  })
})
