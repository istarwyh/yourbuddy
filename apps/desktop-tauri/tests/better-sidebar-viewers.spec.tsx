// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { builtinViewers } from '../product/dsh-better-sidebar/src/client/builtins/viewers.tsx'

describe('Better Sidebar built-in file viewers', () => {
  it('keeps an image fallback for plugin-owned editor workbenches', () => {
    const image = builtinViewers().find(viewer => viewer.id === 'image')

    expect(image).toMatchObject({
      exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
      fetchStrategy: 'mediaUrl',
    })
  })
})
