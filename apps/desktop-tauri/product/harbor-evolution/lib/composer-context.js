const TOKEN_PATTERN = 'hctx_[A-Za-z0-9_-]{20,80}'

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rawReferencePattern(token, global = false) {
  const ref = token ? escapeRegExp(token) : TOKEN_PATTERN
  return new RegExp(`@harbor(?:\\[[^\\]\\r\\n]{0,300}\\])?\\(${ref}\\)[ \\t]?`, global ? 'g' : '')
}

function occurrenceRanges(occurrences, token) {
  return (Array.isArray(occurrences) ? occurrences : [])
    .filter(item => item?.source === 'harbor' && (!token || item.ref === token))
    .map(item => ({ start: Number(item.offset), end: Number(item.offset) + Number(item.length) }))
    .filter(item => Number.isSafeInteger(item.start) && Number.isSafeInteger(item.end) && item.start >= 0 && item.end >= item.start)
    .sort((left, right) => right.start - left.start)
}

/** Locate literal Harbor references that are not owned by another structured chip. */
export function rawHarborReferenceRanges(value, occurrences = [], token) {
  const draft = String(value ?? '')
  const occupied = (Array.isArray(occurrences) ? occurrences : [])
    .map(item => ({ start: Number(item?.offset), end: Number(item?.offset) + Number(item?.length) }))
    .filter(item => Number.isSafeInteger(item.start) && Number.isSafeInteger(item.end) && item.start >= 0 && item.end >= item.start)
  return [...draft.matchAll(rawReferencePattern(token, true))]
    .map(match => ({ start: match.index, end: match.index + match[0].length }))
    .filter(range => !occupied.some(item => range.start < item.end && item.start < range.end))
    .sort((left, right) => right.start - left.start)
}

/** Remove Harbor references while preserving all non-reference draft text. */
export function stripHarborReferences(value, occurrences = [], token) {
  let draft = String(value ?? '')
  const ranges = [...occurrenceRanges(occurrences, token), ...rawHarborReferenceRanges(draft, occurrences, token)]
    .sort((left, right) => right.start - left.start)
  for (const range of ranges) {
    if (range.end > draft.length) continue
    const end = draft[range.end] === ' ' ? range.end + 1 : range.end
    draft = draft.slice(0, range.start) + draft.slice(end)
  }
  return draft
}

export function hasHarborReference(value, occurrences = [], token) {
  if (!token) return false
  if ((Array.isArray(occurrences) ? occurrences : []).some(item => item?.source === 'harbor' && item.ref === token)) return true
  return rawHarborReferenceRanges(value, occurrences, token).length > 0
}

/** Enforce one explicit Harbor reference and retain the latest user-authored body. */
export function withHarborReference(value, reference, prompt = '', occurrences = []) {
  const retained = stripHarborReferences(value, occurrences).replace(/^[ \t]+/, '')
  const body = retained || String(prompt ?? '')
  return `${reference}${body ? ` ${body}` : ''}`
}
