import { describe, expect, it } from 'vitest'
import { loadBootDecision } from '../product/dsh-better-sidebar/src/client/prefs.ts'

describe('YourBuddy Better Sidebar presentation', () => {
  it('carries the product slot selection through the boot decision', async () => {
    const decision = await loadBootDecision({
      settingsGet: async () => ({
        value: { bottomPanelAutoTerminal: false },
        externalDisable: false,
        presentation: 'slot' as const,
      }),
      settingsUpdate: async () => ({}),
    })

    expect(decision.presentation).toBe('slot')
    expect(decision.prefs.bottomPanelAutoTerminal).toBe(false)
    expect(decision.suspended).toBe(false)
  })

  it('falls back to portal when settings are unavailable', async () => {
    const decision = await loadBootDecision({
      settingsGet: async () => { throw new Error('offline') },
      settingsUpdate: async () => ({}),
    })

    expect(decision.presentation).toBe('portal')
  })
})
