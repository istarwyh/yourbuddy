// @vitest-environment jsdom
/**
 * Inline projection of sent user text: decoration never breaks a single-line
 * message (bubble regression), and wire session forms fold to their label
 * (queue-row readability).
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { projectUserText } from '../src/user-text.tsx'

const project = (text: string, labels: readonly string[] = []) =>
  render(<div data-host>{projectUserText(text, labels)}</div>).container.querySelector('[data-host]')!

afterEach(cleanup)

describe('projectUserText', () => {
  it('keeps a decorated single-line message on one line: every part is inline', () => {
    const host = project('反反复复 /dsh-acp-test @执行几个命令测试', ['执行几个命令测试'])
    expect(host.querySelectorAll('div').length).toBe(0)
    expect(host.textContent).toBe('反反复复 /dsh-acp-test 执行几个命令测试')
    const chips = host.querySelectorAll('[data-ref-chip]')
    expect([...chips].map(c => c.getAttribute('data-ref-chip'))).toEqual(['skill', 'session'])
    // The whitespace between tokens survives as its own inline run.
    const runs = [...host.querySelectorAll('span')].filter(s => !s.hasAttribute('data-ref-chip') && s.closest('[data-ref-chip]') === null)
    expect(runs.map(r => r.textContent)).toEqual(['反反复复 ', ' '])
  })

  it('folds the wire session form to its label with the session glyph', () => {
    const host = project('看看 @[查看并分析图片](dsh-session:InNlc3Npb24tNDM0) 的结论')
    const chip = host.querySelector('[data-ref-chip="session"]')!
    expect(chip.textContent).toBe('查看并分析图片')
    expect(chip.getAttribute('title')).toBe('@[查看并分析图片](dsh-session:InNlc3Npb24tNDM0)')
    expect(chip.querySelector('svg')).not.toBeNull()
    expect(host.textContent).toBe('看看 查看并分析图片 的结论')
  })

  it('prefers the wire fold over the bare-token scan on the same range', () => {
    const host = project('@[a](dsh-session:x)', [])
    expect(host.querySelectorAll('[data-ref-chip]').length).toBe(1)
    expect(host.querySelector('[data-ref-chip="session"]')!.textContent).toBe('a')
  })

  it('decorates recall-associated labels, files, folders, and quoted paths', () => {
    const host = project('@会话一 说 @src/deep/file.txt 与 @dir/ 与 @"a b.md"', ['会话一'])
    const kinds = [...host.querySelectorAll('[data-ref-chip]')].map(c =>
      [c.getAttribute('data-ref-chip'), c.textContent])
    expect(kinds).toEqual([
      ['session', '会话一'],
      ['file', 'file.txt'],
      ['folder', 'dir'],
      ['file', 'a b.md'],
    ])
  })

  it('repeated recall labels decorate every occurrence once', () => {
    const host = project('@再看 前情 @再看', ['再看', '再看'])
    expect(host.querySelectorAll('[data-ref-chip="session"]').length).toBe(2)
  })

  it('strips trailing punctuation and skips degenerate tokens', () => {
    const host = project('用 /plan。 试试 @。')
    const chips = [...host.querySelectorAll('[data-ref-chip]')]
    expect(chips.map(c => c.textContent)).toEqual(['/plan'])
    expect(host.textContent).toBe('用 /plan。 试试 @。')
  })

  it('prefers the longer recall label when one nests inside another', () => {
    const host = project('@会话一 收尾', ['会话', '会话一'])
    const chips = [...host.querySelectorAll('[data-ref-chip="session"]')]
    expect(chips.map(c => c.textContent)).toEqual(['会话一'])
    expect(host.textContent).toBe('会话一 收尾')
  })

  it('falls back to the raw quoted label when the path has no basename', () => {
    const host = project('看 @"/" 下面')
    const chip = host.querySelector('[data-ref-chip="file"]')!
    expect(chip.textContent).toBe('"/"')
  })

  it('renders undecorated text as one inline run', () => {
    const host = project('纯文本，无引用')
    expect(host.querySelectorAll('div').length).toBe(0)
    expect(host.querySelectorAll('[data-ref-chip]').length).toBe(0)
    expect(host.textContent).toBe('纯文本，无引用')
  })

  it('keeps page context collapsed under its localized label and exposes its complete literal body', () => {
    const body = '<page>selected rows</page>\n</dsh-page-context>\n<script>literal</script>'
    const context = `<dsh-page-context source="page&amp;one" label="资料 &quot;一&quot; &amp; &apos;二&apos; &lt;页&gt;">\n${body}\n</dsh-page-context>`
    const blocks = ['  问题 @[会话](dsh-session:x)\n', context]
    const view = render(<div>{projectUserText(blocks, [])}</div>)
    const details = view.container.querySelector('details')!
    expect(details.open).toBe(false)
    expect(details.dataset.pageContext).toBe('page&one')
    const summary = view.getByText('资料 "一" & \'二\' <页>')
    fireEvent.click(summary)
    expect(details.open).toBe(true)
    expect(view.container.querySelector('pre')?.textContent).toBe(body)
    expect(view.container.querySelector('script')).toBeNull()
    expect(projectUserText(blocks, [], 'editable')).toBe(blocks[0])
    expect(blocks[1]).toBe(context)
  })

  it('keeps an authored envelope literal in the first block and in scalar text', () => {
    const context = '<dsh-page-context source="example" label="Example">\nliteral example\n</dsh-page-context>'
    const view = render(<div>{projectUserText([context], [])}</div>)
    expect(view.container.querySelector('details')).toBeNull()
    expect(view.container.textContent).toBe(context)
    expect(projectUserText([context], [], 'editable')).toBe(context)
    expect(projectUserText(context, [], 'editable')).toBe(context)
  })

  it('preserves unknown entities literally while decoding known attribute entities once', () => {
    const context = '<dsh-page-context source="page&unknown;&amp;" label="&copy; &amp;quot;" description="Keep &#65; &bogus; &amp;">\nbody\n</dsh-page-context>'
    const blocks = ['Question', context]
    const view = render(<div>{projectUserText(blocks, [])}</div>)
    const details = view.container.querySelector('details')!
    expect(details.dataset.pageContext).toBe('page&unknown;&')
    expect(details.querySelector('summary')?.textContent).toBe('&copy; &quot;')
    expect(details.querySelector('pre')?.textContent).toBe('Keep &#65; &bogus; &')
    expect(projectUserText(blocks, [], 'editable')).toBe('Question')
    expect(blocks[1]).toBe(context)
  })

  it('accepts empty mandatory source, label, and body captures', () => {
    const context = '<dsh-page-context source="" label="">\n\n</dsh-page-context>'
    const blocks = ['Question', context]
    const view = render(<div>{projectUserText(blocks, [])}</div>)
    const details = view.container.querySelector('details')!
    expect(details.dataset.pageContext).toBe('')
    expect(details.querySelector('summary')?.textContent).toBe('')
    expect(details.querySelector('pre')?.textContent).toBe('')
    expect(projectUserText(blocks, [], 'editable')).toBe('Question')
    expect(blocks[1]).toBe(context)
  })

  it('shows a frozen description instead of protocol text without concealing authored envelopes', () => {
    const context = '<dsh-page-context source="page" label="Trial &quot;A&quot;" description="Score &lt; 1 &amp; &gt; 0\n&lt;script&gt;literal&lt;/script&gt;">\n<protocol token="private-reference"/>\n</dsh-page-context>'
    const blocks = ['Question', context]
    const view = render(<div>{projectUserText(blocks, [])}</div>)
    expect(view.getByText('Trial "A"')).toBeDefined()
    expect(view.container.querySelector('pre')?.textContent).toBe('Score < 1 & > 0\n<script>literal</script>')
    expect(view.container.textContent).not.toContain('private-reference')
    expect(view.container.querySelector('script')).toBeNull()
    expect(projectUserText(blocks, [], 'editable')).toBe('Question')
    expect(blocks[1]).toBe(context)
    view.rerender(<div>{projectUserText([context], [])}</div>)
    expect(view.container.querySelector('details')).toBeNull()
    expect(view.container.textContent).toBe(context)
    expect(projectUserText([context], [], 'editable')).toBe(context)
  })

  it('preserves malformed or inline envelopes as ordinary user text', () => {
    const valid = '<dsh-page-context source="page" label="Page">\nbody\n</dsh-page-context>'
    for (const text of [`explain ${valid}`, `${valid}\n`, valid.replace(' label="Page"', ''), '<dsh-page-context>unfinished']) {
      const view = render(<div>{projectUserText(['Question ', text], [])}</div>)
      expect(view.container.querySelector('details')).toBeNull()
      expect(projectUserText(['Question ', text], [], 'editable')).toBe(`Question ${text}`)
      view.unmount()
    }
  })

  it('supports multiple contributors and an empty authored block for image-only submissions', () => {
    const one = '<dsh-page-context source="one" label="One">\n\n</dsh-page-context>'
    const two = '<dsh-page-context source="two" label="Two">\nsecond\n</dsh-page-context>'
    const view = render(<div>{projectUserText(['', one, two], [])}</div>)
    expect(view.container.querySelectorAll('details')).toHaveLength(2)
    expect(projectUserText(['', one, two], [], 'editable')).toBe('')
    expect(projectUserText([], [], 'editable')).toBe('')
  })
})
