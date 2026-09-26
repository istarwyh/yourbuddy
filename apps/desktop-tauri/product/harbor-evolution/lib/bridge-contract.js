import { createHash } from 'node:crypto'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  }
  return value
}

export function canonicalDigest(value, namespace) {
  const payload = JSON.stringify(canonical(value))
  return `sha256:${createHash('sha256').update(String(namespace)).update('\0').update(payload).digest('hex')}`
}

export const BRIDGE_CONTRACT = Object.freeze({
  schema_version: 1,
  protocol: 'harbor-dsh-bridge-contract/v1',
  protocols: {
    candidate_context: { schema_version: 3 },
    historical_context: { schema_version: 3, protocol: 'historical-generation-evaluation-context/v3' },
    artifact_registry: { schema_version: 2 },
    candidate_trial_assessment: { schema_version: 2 },
    historical_trial_assessment: { schema_version: 3 },
    candidate_summary: { schema_version: 3 },
    historical_summary: { schema_version: 4 },
    evaluation_report: { schema_version: 1, protocol: 'evaluation-report/v1' },
    effective_evaluator: { schema_version: 1, protocol: 'effective-evaluator/v1' },
    candidate_materialization: { schema_version: 1, protocol: 'candidate-evaluation-materialization/v1' },
    business_observation: { schema_version: 1, protocol: 'business-observation/v1' },
  },
  digest_namespaces: {
    candidate: 'harbor-dsh-candidate-v1',
    dataset: 'harbor-dsh-dataset-v2',
    evaluator_portable: 'harbor-dsh-evaluator-portable-v1',
    promotion_policy: 'harbor-dsh-promotion-policy-v2',
    business_observation: 'harbor-dsh-business-observation-v1',
  },
})
