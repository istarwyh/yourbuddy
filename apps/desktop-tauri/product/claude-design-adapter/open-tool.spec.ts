import { describe, expect, it } from 'vitest'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { designOpenToolDefinition } from './open-tool.mjs'

describe('design open tool on the current Host', () => {
  it('compiles required root input and closed structured output through real defineTool', () => {
    const value = { url: 'http://127.0.0.1:43100/', root: '/workspace/design' }
    const tool = defineTool(designOpenToolDefinition(async () => value))
    expect(tool.name).toBe('yourbuddy_design_open')
    expect(tool.parameters).toMatchObject({
      type: 'object', required: ['root'],
      properties: { root: { type: 'string' } },
    })
    expect(tool.output.schema).toEqual({
      type: 'object', additionalProperties: false, required: ['url', 'root'],
      properties: { url: { type: 'string' }, root: { type: 'string' } },
    })
    expect(tool.output.render({ root: 'design' }, value)).toEqual([{ type: 'text', text: JSON.stringify(value) }])
    expect(tool.presentCall({ root: 'design' })).toMatchObject({ title: 'Open design', rawInput: 'design' })
  })
})
