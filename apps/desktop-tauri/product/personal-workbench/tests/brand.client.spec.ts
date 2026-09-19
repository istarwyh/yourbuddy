import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import {
  installPersonalBrandOccupants, resolveWorkbenchBrand,
  type WorkbenchSettingsValue,
} from '../src/client/index.tsx'
import { PERSONAL_WORKBENCH_CSS } from '../src/client/styles.ts'

class FakeScope implements SettingsScope<WorkbenchSettingsValue> {
  private listeners = new Set<() => void>()
  private snapshot: SettingsScopeSnapshot<WorkbenchSettingsValue>

  constructor(value: WorkbenchSettingsValue) {
    this.snapshot = {
      status: 'ready', value, base: {}, user: {}, revision: 0, writable: true, mode: 'host',
    }
  }

  getSnapshot(): SettingsScopeSnapshot<WorkbenchSettingsValue> { return this.snapshot }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  async mutate(): Promise<void> {}
  async set(): Promise<void> {}
  async unset(): Promise<void> {}

  replace(value: WorkbenchSettingsValue): void {
    this.snapshot = { ...this.snapshot, value, revision: (this.snapshot.revision ?? 0) + 1 }
    for (const listener of this.listeners) listener()
  }
}

const PRODUCT_HOLES = [
  'sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark',
] as const
const HERO_TEXT_HOLES = [
  'conversation.hero.brand.headline', 'conversation.hero.brand.badge',
] as const
const HOLES = [...PRODUCT_HOLES, ...HERO_TEXT_HOLES] as const

function declareBrandHoles(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: Object.fromEntries(HOLES.map(name => [name, { kind: 'single', scope: 'root' }])),
  } as never, () => null)
}

describe('personal workbench browser behavior', () => {
  it('pairs the primary button fill with the theme foreground token', () => {
    expect(PERSONAL_WORKBENCH_CSS).toContain('background:var(--dsw-alias-button-primary-fill)')
    expect(PERSONAL_WORKBENCH_CSS).toContain('color:var(--dsw-alias-label-primary-foreground)')
    expect(PERSONAL_WORKBENCH_CSS).not.toContain('color:white')
  })

  it('normalizes only enabled identity and Hero text', () => {
    expect(resolveWorkbenchBrand({
      enabled: false, name: 'A', logo: 'data:image/png;base64,YQ==',
      heroHeadline: 'Build boldly', heroBadge: 'Beta', showHeroBadge: true,
    })).toEqual({})
    expect(resolveWorkbenchBrand({
      enabled: true, name: '  My Lab  ', logo: 'data:image/webp;base64,YQ==',
      heroHeadline: '  Build boldly  ', heroBadge: '  Beta  ', showHeroBadge: true,
    })).toEqual({
      name: 'My Lab', logo: 'data:image/webp;base64,YQ==',
      heroHeadline: 'Build boldly', heroBadge: 'Beta',
    })
    expect(resolveWorkbenchBrand({
      enabled: true, name: 'A', logo: 'https://example.com/a.svg',
      heroHeadline: '', heroBadge: '', showHeroBadge: false,
    })).toEqual({ name: 'A', logo: 'https://example.com/a.svg', heroBadge: null })
  })

  it('restores product occupants on reset and removes them when disposed', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.get('slots') as SlotRegistry
    declareBrandHoles(slots)
    const scope = new FakeScope({
      enabled: false,
      name: '',
      logo: '',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: true,
    })
    const fiber = ctx.plugin({
      inject: ['slots'],
      apply(clientCtx) { installPersonalBrandOccupants(clientCtx as never, scope) },
    })
    await fiber.await()
    const visibleName = () => {
      const Component = slots.entries('sidebar.brand.name')[0]!.component as () => ReactElement<{ children: string }>
      return Component().props.children
    }
    for (const hole of PRODUCT_HOLES) expect(slots.entries(hole)).toHaveLength(1)
    for (const hole of HERO_TEXT_HOLES) expect(slots.entries(hole)).toHaveLength(0)
    expect(visibleName()).toBe('YourBuddy')

    scope.replace({
      enabled: true,
      name: 'My Lab',
      logo: 'data:image/png;base64,YQ==',
      heroHeadline: 'Build boldly',
      heroBadge: 'Beta',
      showHeroBadge: true,
    })
    expect(visibleName()).toBe('My Lab')
    for (const hole of HOLES) {
      expect(slots.entries(hole)).toHaveLength(1)
      expect(slots.entries(hole)[0]?.options.priority).toBe(-10)
    }
    const Headline = slots.entries('conversation.hero.brand.headline')[0]?.component as
      | ((props: { className: string }) => ReactElement<{ children: string }>) | undefined
    expect(Headline?.({ className: 'headline' }).props.children).toBe('Build boldly')

    scope.replace({
      enabled: true,
      name: 'My Lab',
      logo: '',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: false,
    })
    expect(slots.entries('conversation.hero.brand.headline')).toHaveLength(0)
    const HiddenBadge = slots.entries('conversation.hero.brand.badge')[0]?.component as
      | ((props: { className: string }) => ReactElement | null) | undefined
    expect(HiddenBadge?.({ className: 'badge' })).toBeNull()

    scope.replace({
      enabled: false,
      name: '',
      logo: '',
      heroHeadline: '',
      heroBadge: '',
      showHeroBadge: true,
    })
    for (const hole of PRODUCT_HOLES) expect(slots.entries(hole)).toHaveLength(1)
    for (const hole of HERO_TEXT_HOLES) expect(slots.entries(hole)).toHaveLength(0)
    expect(visibleName()).toBe('YourBuddy')
    await fiber.dispose()
    for (const hole of HOLES) expect(slots.entries(hole)).toHaveLength(0)
  })
})
