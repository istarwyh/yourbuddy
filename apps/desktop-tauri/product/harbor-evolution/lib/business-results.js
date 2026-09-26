import { BRIDGE_CONTRACT, canonicalDigest } from './bridge-contract.js'

function float64Identity(value) {
  const buffer = Buffer.allocUnsafe(8)
  buffer.writeDoubleBE(Object.is(value, -0) ? 0 : value, 0)
  return `float64:${buffer.toString('hex')}`
}

function digestMaterial(value) {
  const material = structuredClone(value)
  delete material.digest
  for (const metric of material.metrics ?? []) metric.value = float64Identity(metric.value)
  for (const segment of material.segments ?? []) {
    for (const dimension of segment.dimensions ?? []) {
      if (typeof dimension.value === 'number') dimension.value = float64Identity(dimension.value)
    }
    for (const metric of segment.metrics ?? []) metric.value = float64Identity(metric.value)
  }
  return material
}

/** Cross-language digest helper. Python remains the validation and storage authority. */
export function businessObservationDigest(value) {
  return canonicalDigest(digestMaterial(value), BRIDGE_CONTRACT.digest_namespaces.business_observation)
}

/** Build the non-reward-affecting report projection from a Python-validated list response. */
export function businessObservationProjection(list, candidateDigest) {
  const available = list?.protocol === 'business-observation-list/v1'
  const bound = typeof candidateDigest === 'string' && /^sha256:[0-9a-f]{64}$/.test(candidateDigest)
  const subjectMatches = item => bound && item?.subject?.candidate_digest === candidateDigest
  const observations = available && Array.isArray(list.observations)
    ? list.observations.filter(subjectMatches).slice(0, 1000)
    : []
  const matchedIds = new Set(observations.map(item => item.observation_id))
  const trends = available && Array.isArray(list.trends)
    ? list.trends.filter(subjectMatches).slice(0, 1000).map(item => ({ ...item, points: Array.isArray(item?.points) ? item.points.slice(0, 1000) : [] }))
    : []
  const groups = available && Array.isArray(list.groups)
    ? list.groups.filter(subjectMatches).slice(0, 1000).map(item => ({ ...item, observation_ids: Array.isArray(item?.observation_ids) ? item.observation_ids.filter(id => matchedIds.has(id)).slice(0, 1000) : [] }))
    : []
  return {
    status: !bound ? 'candidate-unavailable' : observations.length ? 'matched-candidate' : available ? 'no-matching-observations' : 'unavailable',
    candidate_digest: bound ? candidateDigest : null,
    association_label: !bound
      ? 'No Candidate digest is available for this Job.'
      : observations.length
        ? 'These observations are bound to the same Candidate digest as this Job.'
        : available
          ? 'No imported observation is bound to this Job Candidate digest.'
          : 'Business observations are currently unavailable.',
    causality: {
      status: 'correlation-only',
      label: 'Associated observations are correlational and do not establish causation.',
      affects_offline_summary: false,
      affects_reward: false,
      affects_gate: false,
    },
    observations,
    trends,
    groups,
  }
}
