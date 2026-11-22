/** Standalone generated page-context blocks retain their source text outside authored copy. */

/** Display fields decoded from one generated context block. */
export interface PageContext {
  readonly source: string
  readonly label: string
  readonly text: string
  readonly description?: string
}

function attributeText(value: string): string {
  const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }
  return value.replace(/&(amp|quot|apos|lt|gt);/gu, (_entity: string, name: keyof typeof entities) => entities[name])
}

/**
 * Decode a complete generated context block, leaving ordinary authored text unchanged.
 * @param text - one original text block, not concatenated message content.
 * @returns decoded fields, or undefined when the block is not generated context.
 */
export function pageContext(text: string): PageContext | undefined {
  const pattern = /^<dsh-page-context source="([^"<]*)" label="([^"<]*)"(?: description="([^"<]*)")?>\n([\s\S]*)\n<\/dsh-page-context>$/u
  const match = pattern.exec(text)
  if (match === null || match[0].length !== text.length) return undefined
  return {
    source: attributeText(match[1] as string), label: attributeText(match[2] as string), text: match[4] as string,
    ...(match[3] === undefined ? {} : { description: attributeText(match[3]) }),
  }
}

/**
 * Recover authored text for copy and editing without appended generated context.
 * @param text - original text blocks with authored text first, or a single authored string.
 * @returns authored text with whitespace and reference wire forms unchanged.
 */
export function authoredText(text: string | readonly string[]): string {
  if (typeof text === 'string') return text
  return text.filter((value, index) => index === 0 || pageContext(value) === undefined).join('')
}
