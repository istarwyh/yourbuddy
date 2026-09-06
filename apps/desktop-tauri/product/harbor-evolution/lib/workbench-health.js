export const ATTENTION_FILTERS = ['all', 'running', 'blocked', 'stalled', 'infrastructure', 'invalid', 'regressed', 'gate', 'fresh-baseline']

export function jobAttention(job) {
  const total = Number(job.nTrials ?? job.progress?.total ?? 0)
  const infrastructure = Number(job.nInfrastructureExceptions ?? 0)
  const invalid = Number(job.nInvalidScores ?? 0)
  const reasons = job.promotion?.reasons ?? []
  if (total > 0 && infrastructure >= total) return { kind: 'blocked', rank: 0, count: infrastructure }
  if (job.progress?.health === 'stalled') return { kind: 'stalled', rank: 1, count: Math.max(1, total - Number(job.progress?.completed ?? 0)) }
  if (infrastructure > 0) return { kind: 'infrastructure', rank: 2, count: infrastructure }
  if (invalid > 0 || job.nEvaluationExceptions > 0 || job.status === 'failed') return { kind: 'invalid', rank: 3, count: invalid || job.nEvaluationExceptions || 1 }
  if (job.promotion?.regressions > 0) return { kind: 'regressed', rank: 4, count: job.promotion.regressions }
  if (reasons.some(reason => /fresh.?baseline|context.*mismatch|not.comparable/i.test(typeof reason === 'string' ? reason : reason?.code ?? ''))) return { kind: 'fresh-baseline', rank: 6, count: 1 }
  if (job.promotion && job.promotion.decision !== 'PROMOTE') return { kind: 'gate', rank: 5, count: reasons.length || 1 }
  return { kind: job.progress?.active ? 'running' : 'healthy', rank: 9, count: 0 }
}

export function matchesJobFilter(job, filter) {
  if (!filter || filter === 'all') return true
  if (filter === 'running') return Boolean(job.progress?.active)
  const kind = jobAttention(job).kind
  return filter === 'infrastructure' ? kind === 'infrastructure' || kind === 'blocked' : kind === filter
}

export function attentionCounts(jobs) {
  return Object.fromEntries(ATTENTION_FILTERS.map(filter => [filter, jobs.filter(job => matchesJobFilter(job, filter)).length]))
}
