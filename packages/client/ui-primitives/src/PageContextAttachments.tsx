/** Collapsed attachments for generated context appended after authored text. */
import type { ReactNode } from 'react'
import { pageContext } from './page-context.ts'
import css from './user-text.module.css'

/** Original block boundaries distinguish generated context from literal user input. */
export interface PageContextAttachmentsProps {
  readonly texts: readonly string[]
}

/**
 * Render generated context as inspectable disclosures without reference interpretation.
 * @param props - original message text blocks, with authored text first.
 * @returns collapsed attachments for recognized non-leading blocks.
 */
export function PageContextAttachments({ texts }: PageContextAttachmentsProps): ReactNode {
  return <>{texts.map((text, index) => {
    const context = index === 0 ? undefined : pageContext(text)
    return context === undefined ? null : <details key={index} className={css.pageContext} data-page-context={context.source}>
      <summary className={css.contextLabel}>{context.label}</summary>
      <pre className={css.contextText}>{context.description ?? context.text}</pre>
    </details>
  })}</>
}
