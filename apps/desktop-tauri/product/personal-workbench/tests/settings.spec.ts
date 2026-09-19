import { describe, expect, it } from 'vitest'
import { WorkbenchSettingsSchema } from '../src/settings.ts'

describe('personal-workbench settings schema', () => {
  it('defaults to the product identity without saved customization', () => {
    expect(WorkbenchSettingsSchema()).toEqual({
      enabled: false,
      name: '',
      logo: '',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: true,
    })
  })

  it('persists the user-selected name and image source', () => {
    expect(WorkbenchSettingsSchema({
      enabled: true,
      name: 'My Workbench',
      logo: 'data:image/png;base64,YQ==',
      heroHeadline: 'Build boldly',
      heroBadge: 'Beta',
      showHeroBadge: true,
    }).logo).toBe('data:image/png;base64,YQ==')
    expect(WorkbenchSettingsSchema({
      enabled: true,
      name: 'Remote Workbench',
      logo: 'https://example.com/logo.svg',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: false,
    }).logo).toBe('https://example.com/logo.svg')
  })
})
