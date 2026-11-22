// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { authoredText, pageContext } from '../src/page-context.ts'
import { PageContextAttachments } from '../src/PageContextAttachments.tsx'

afterEach(cleanup)

describe('generated page context', () => {
  it('keeps authored copy separate from inspectable appended context', () => {
    const context = '<dsh-page-context source="research" label="Current &amp; source">\nLiteral source\n</dsh-page-context>'
    const texts = ['  Review @file.ts  ', context]
    expect(authoredText(texts)).toBe('  Review @file.ts  ')
    expect(authoredText(context)).toBe(context)
    expect(authoredText([context])).toBe(context)
    expect(pageContext(context)).toEqual({ source: 'research', label: 'Current & source', text: 'Literal source' })
    const view = render(<PageContextAttachments texts={texts} />)
    expect(view.getByText('Current & source')).toBeTruthy()
    expect(view.container.querySelector('details')?.open).toBe(false)
    expect(view.container.querySelector('pre')?.textContent).toBe('Literal source')
    expect(texts[1]).toBe(context)
  })
})
