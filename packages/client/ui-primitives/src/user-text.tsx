/**
 * Display projection of reference forms in sent user text (bubble and queue
 * rows). The logged model text remains the single truth; this is presentation
 * only. User-authored runs remain inline; standalone page-context blocks
 * render as collapsed attachments. Three decoration sources, by precedence:
 * the wire session form
 * `@[label](dsh-session:...)` folds to its label; exact session labels
 * supplied by an adjacent recall decorate their bare `@label` mention; and
 * plain `/name` / `@name` word-boundary tokens decorate by shape alone (sent
 * tokens were validated at compose time).
 */
import { Fragment, type ReactNode } from 'react'
import { ReferenceIcon } from './ReferenceIcon.tsx'
import css from './user-text.module.css'

/** The wire form a session chip serializes to; label is the display text. */
const SESSION_WIRE_RE = /@\[([^\]\n]+)\]\(dsh-session:[^)\s]+\)/gu

interface PageContext {
  readonly source: string
  readonly label: string
  readonly text: string
  readonly description?: string
}

function attributeText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }
  return value.replace(/&(amp|quot|apos|lt|gt);/gu, (entity: string, name: string) => entities[name] ?? entity)
}

function pageContext(text: string): PageContext | undefined {
  const pattern = /^<dsh-page-context source="([^"<]*)" label="([^"<]*)"(?: description="([^"<]*)")?>\n([\s\S]*)\n<\/dsh-page-context>$/u
  const match = pattern.exec(text)
  if (match === null || match[0].length !== text.length) return undefined
  return {
    source: attributeText(match[1] ?? ''), label: attributeText(match[2] ?? ''), text: match[4] ?? '',
    ...(match[3] === undefined ? {} : { description: attributeText(match[3]) }),
  }
}

interface DecorationRange {
  readonly start: number
  readonly end: number
  /** Matched source text (hover title). */
  readonly label: string
  readonly kind: 'session' | 'plain'
  /** Pre-resolved display text (wire folds); derived from label when absent. */
  readonly display?: string
}

/**
 * Project user text and standalone context blocks without changing their logged content.
 * @param text - authored text, or separate blocks with authored text first (empty for image-only sends).
 * @param sessionLabels - exact session mention labels associated by an adjacent recall.
 * @returns user text with reference chips and collapsed, inspectable page-context attachments.
 */
export function projectUserText(text: string | readonly string[], sessionLabels: readonly string[]): ReactNode
/**
 * Recover authored text for copy and editing; automatic context is prepared separately.
 * @param text - authored text, or separate blocks with authored text first (empty for image-only sends).
 * @param sessionLabels - recall labels retained by the display overload.
 * @param mode - selects undecorated authored text without standalone page-context blocks.
 * @returns authored text with its whitespace and reference wire forms unchanged.
 */
export function projectUserText(text: string | readonly string[], sessionLabels: readonly string[], mode: 'editable'): string
/**
 * @param text - authored text or separate logged text blocks.
 * @param sessionLabels - exact adjacent recall labels.
 * @param mode - optional authored-text projection for editing or copying.
 * @returns rendered text and attachments, or unchanged authored text.
 */
export function projectUserText(
  text: string | readonly string[], sessionLabels: readonly string[], mode?: 'editable',
): ReactNode {
  const parts = typeof text === 'string'
    ? [{ text, context: undefined }]
    : text.map((value, index) => ({ text: value, context: index === 0 ? undefined : pageContext(value) }))
  if (mode === 'editable') return parts.filter(part => part.context === undefined).map(part => part.text).join('')
  return <>{parts.map((part, index) => part.context === undefined
    ? <Fragment key={index}>{decorateText(part.text, sessionLabels)}</Fragment>
    : <details key={index} className={css.pageContext} data-page-context={part.context.source}>
      <summary className={css.contextLabel}>{part.context.label}</summary>
      <pre className={css.contextText}>{part.context.description ?? part.context.text}</pre>
    </details>)}</>
}

function decorateText(text: string, sessionLabels: readonly string[]): ReactNode {
  const ranges: DecorationRange[] = []
  SESSION_WIRE_RE.lastIndex = 0
  let wire: RegExpExecArray | null
  while ((wire = SESSION_WIRE_RE.exec(text)) !== null) {
    ranges.push({
      start: wire.index,
      end: wire.index + wire[0].length,
      label: wire[0],
      kind: 'session',
      display: wire[1] as string, // non-optional capture in SESSION_WIRE_RE
    })
  }
  for (const rawLabel of [...new Set(sessionLabels)].sort((a, b) => b.length - a.length)) {
    const label = `@${rawLabel}`
    let start = text.indexOf(label)
    while (start >= 0) {
      ranges.push({ start, end: start + label.length, label, kind: 'session' })
      start = text.indexOf(label, start + label.length)
    }
  }
  const re = /(^|\s)(\/[\w-]+|@"[^"\n]+"|@[^\s]+)/gu
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const tokenStart = m.index + (m[1] as string).length // (^|\s) captures '' at line start
    const rawLabel = m[2] as string // non-optional alternation capture
    const label = rawLabel.startsWith('@"')
      ? rawLabel
      : rawLabel.replace(/[.,;:!?，。；：！？]+$/gu, '')
    if (label.length <= 1) continue
    ranges.push({ start: tokenStart, end: tokenStart + label.length, label, kind: 'plain' })
  }
  const rankOf = (range: DecorationRange): number => range.kind === 'session' ? 0 : 1
  ranges.sort((a, b) => a.start - b.start || rankOf(a) - rankOf(b) || b.end - a.end)
  const parts: ReactNode[] = []
  let cursor = 0
  const pushPlain = (from: number, to: number): void => {
    parts.push(<span key={`t${from}`} className={css.plainRun}>{text.slice(from, to)}</span>)
  }
  for (const range of ranges) {
    if (range.start < cursor) continue
    const { start: tokenStart, end, label, kind } = range
    if (tokenStart > cursor) pushPlain(cursor, tokenStart)
    const referenceKind = kind === 'session'
      ? 'session'
      : label.startsWith('@')
        ? label.endsWith('/') ? 'folder' : 'file'
        : undefined
    const displayLabel = range.display
      ?? (referenceKind === undefined
        ? label
        : referenceKind === 'session'
          ? label.slice(1)
          : label.slice(1).replace(/^"|"$/gu, '').split(/[\\/]/u).filter(Boolean).at(-1) ?? label.slice(1))
    parts.push(
      <span
        key={tokenStart}
        className={css.refChip}
        data-ref-chip={referenceKind ?? 'skill'}
        title={label}
      >
        {referenceKind !== undefined && (
          <ReferenceIcon kind={referenceKind} size={16} className={css.refIcon} />
        )}
        {displayLabel}
      </span>,
    )
    cursor = end
  }
  if (parts.length === 0) return <span className={css.plainRun}>{text}</span>
  if (cursor < text.length) pushPlain(cursor, text.length)
  return <>{parts}</>
}
