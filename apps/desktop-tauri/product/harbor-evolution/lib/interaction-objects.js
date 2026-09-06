import { createHash } from 'node:crypto'

export const LOCAL_OBJECT_KINDS = new Set(['hypothesis', 'gate-reason', 'metric', 'finding', 'attempt', 'exception', 'evaluator-source', 'trial-set'])

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}

export function localObjectDigest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}`
}

/** Host-derived selectors. No paths or artifact prose enter message context. */
export function interactionObjectCatalog(job, jobState, trialState, governance) {
  const artifacts = jobState?.artifacts ?? {}
  const entries = []
  const add = (kind, stage, value, fields = {}) => {
    if (value === undefined || value === null) return
    const sourceDigest = localObjectDigest(value)
    const id = `${kind}-${sourceDigest.slice(7, 31)}`
    entries.push({ ref: { kind, id, job, stage, sourceDigest, ...fields }, value })
  }
  for (const value of (artifacts.optimization?.hypotheses ?? []).slice(0, 100)) add('hypothesis', 'optimizer', value)
  for (const value of (artifacts.promotion?.reasons ?? []).slice(0, 100)) add('gate-reason', 'gate', value)
  for (const [metric, value] of Object.entries(artifacts.summary?.metrics ?? {}).slice(0, 100)) {
    if (typeof value === 'number' && Number.isFinite(value)) add('metric', 'reporter', { metric, value })
  }
  if (trialState) {
    const trial = trialState.lifecycle?.id ?? trialState.trial
    for (const value of (trialState.assessment?.findings ?? []).slice(0, 100)) add('finding', 'judge', value, { trial })
    for (const reason of (trialState.assessment?.score?.invalid_reasons ?? trialState.lifecycle?.score?.invalid_reasons ?? []).slice(0, 100)) add('exception', 'judge', { reason, scoreValid: false }, { trial })
    if (trialState.lifecycle?.exception) add('exception', 'judge', trialState.lifecycle.exception, { trial })
    if (trialState.lifecycle) add('attempt', 'judge', trialState.lifecycle, { trial })
  }
  for (const role of ['evaluator', 'rubric']) {
    const source = governance?.components?.[role]?.source
    if (typeof source?.text === 'string' && !source.error) {
      add('evaluator-source', 'judge', { role, text: source.text }, { sourceRole: role })
    }
  }
  return entries
}

export function resolveCatalogSelection(ref, catalog) {
  const entry = catalog.find(item => item.ref.job === ref.job && item.ref.kind === ref.kind && item.ref.id === ref.id && item.ref.sourceDigest === ref.sourceDigest && item.ref.trial === ref.trial)
  if (!entry) throw new Error('HARBOR_CONTEXT_STALE_SELECTION: Selected artifact item has changed or is unavailable; select it again.')
  if (ref.kind !== 'evaluator-source') return entry
  if (ref.sourceRole !== entry.ref.sourceRole) throw new Error('HARBOR_CONTEXT_STALE_SELECTION: Source role does not match the selected artifact.')
  const lines = entry.value.text.split('\n')
  const start = ref.startLine ?? 1
  const end = ref.endLine ?? Math.min(lines.length, 200)
  if (start < 1 || end < start || end > lines.length || end - start >= 200) throw new Error('HARBOR_CONTEXT_INVALID: Select between 1 and 200 saved source lines.')
  return { ref: { ...entry.ref, startLine: start, endLine: end }, value: { role: ref.sourceRole, startLine: start, endLine: end, text: lines.slice(start - 1, end).join('\n') } }
}
