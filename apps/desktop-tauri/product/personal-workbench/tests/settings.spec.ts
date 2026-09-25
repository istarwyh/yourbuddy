import { describe, expect, it } from 'vitest'
import { WorkbenchSettingsSchema, type WorkbenchSettings } from '../src/settings.ts'

function resolveSettings(input?: Partial<WorkbenchSettings>): WorkbenchSettings {
  const config = WorkbenchSettingsSchema(input)
  return {
    enabled: config.enabled.get(),
    name: config.name.get(),
    logo: config.logo.get(),
    heroHeadline: config.heroHeadline.get(),
    heroBadge: config.heroBadge.get(),
    showHeroBadge: config.showHeroBadge.get(),
  }
}

describe('personal-workbench settings schema', () => {
  it('defaults to the product identity without saved customization', () => {
    expect(resolveSettings()).toEqual({
      enabled: false,
      name: '',
      logo: '',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: true,
    })
  })

  it('persists the user-selected name and image source', () => {
    expect(resolveSettings({
      enabled: true,
      name: 'My Workbench',
      logo: 'data:image/png;base64,YQ==',
      heroHeadline: 'Build boldly',
      heroBadge: 'Beta',
      showHeroBadge: true,
    }).logo).toBe('data:image/png;base64,YQ==')
    expect(resolveSettings({
      enabled: true,
      name: 'Remote Workbench',
      logo: 'https://example.com/logo.svg',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: false,
    }).logo).toBe('https://example.com/logo.svg')
  })
})
