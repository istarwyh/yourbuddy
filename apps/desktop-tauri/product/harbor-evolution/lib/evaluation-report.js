import { BRIDGE_CONTRACT } from './bridge-contract.js'
import { businessObservationProjection } from './business-results.js'

const HISTORICAL_JOB_KIND = 'historical-generation-evaluation'

const VERDICTS = new Set([
  'reliable-result',
  'actionable-with-limitations',
  'insufficient-evidence',
  'evaluation-failed',
  'run-failed',
])

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value)
}

function count(value) {
  const normalized = Number(value ?? 0)
  return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : 0
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null
}

function jobKind(summary, context) {
  const declared = summary?.job_kind ?? context?.job_kind
  if (typeof declared === 'string' && declared) return declared
  return ['historical-generation-evaluation-context/v1', 'historical-generation-evaluation-context/v2', 'historical-generation-evaluation-context/v3'].includes(context?.protocol)
    ? HISTORICAL_JOB_KIND
    : 'candidate-evaluation'
}

function coverage(summary) {
  const declared = object(summary?.coverage) ? summary.coverage : {}
  const total = count(declared.total_trials ?? summary?.n_trials)
  const scored = count(declared.scored_trials ?? summary?.n_valid_scores ?? summary?.scored_trial_count)
  const unscored = count(
    declared.unscored_trials
    ?? summary?.n_unscored_trials
    ?? summary?.unscored_trial_count
    ?? summary?.status_counts?.['completed-unscored'],
  )
  const criterionScored = count(declared.criterion_scored)
  const criterionTotal = count(declared.criterion_total)
  return {
    total,
    scored,
    unscored,
    trialRate: finite(declared.trial_rate) ? declared.trial_rate : ratio(scored, total),
    criterionScored,
    criterionTotal,
    criterionRate: finite(declared.criterion_rate) ? declared.criterion_rate : ratio(criterionScored, criterionTotal),
  }
}

function metricDefinitions(contract) {
  return new Map((contract?.metrics ?? [])
    .filter(object)
    .map(item => [String(item.id ?? ''), item])
    .filter(([id]) => id))
}

function metricProfile(summary, contract, sample) {
  const definitions = metricDefinitions(contract)
  const metrics = Object.entries(summary?.metrics ?? {})
    .filter(([, value]) => finite(value))
    .map(([id, value]) => {
      const definition = definitions.get(id) ?? {}
      return {
        id,
        label: definition.label ?? id,
        value,
        direction: definition.direction ?? null,
        unit: definition.unit ?? null,
        valid_coverage: ratio(sample.scored, sample.total),
        source: 'evaluation-summary.metrics',
      }
    })
  const primaryId = typeof contract?.primary_metric === 'string' && contract.primary_metric
    ? contract.primary_metric
    : null
  const primary = primaryId ? metrics.find(item => item.id === primaryId) : undefined
  return {
    primary_metric_id: primaryId,
    primary_metric_status: !primaryId
      ? 'not-configured'
      : !primary ? 'unavailable'
        : sample.scored > 0 ? 'available' : 'insufficient-coverage',
    overall_score: primary && sample.scored > 0 ? primary.value : null,
    metrics,
  }
}

function partialSignals(summary) {
  const signals = new Map()
  for (const trial of summary?.trials ?? []) {
    for (const criterion of trial?.criteria ?? []) {
      if (!object(criterion) || !criterion.id) continue
      const id = String(criterion.id)
      const entry = signals.get(id) ?? {
        id,
        label: criterion.label ?? id,
        scores: [],
        scored: 0,
        unscored: 0,
        evaluation_errors: 0,
      }
      const status = criterion.status ?? (finite(criterion.score) ? 'scored' : 'unknown')
      if (['scored', 'measured'].includes(status) && finite(criterion.score)) {
        entry.scores.push(criterion.score)
        entry.scored += 1
      } else {
        entry.unscored += 1
        if (status === 'evaluation-error') entry.evaluation_errors += 1
      }
      signals.set(id, entry)
    }
  }
  return [...signals.values()].map(({ scores, ...entry }) => ({
    ...entry,
    mean: scores.length ? scores.reduce((total, value) => total + value, 0) / scores.length : null,
  }))
}

function configuredEvaluator(stack, context) {
  const component = stack?.components?.evaluator ?? context?.evaluation_stack?.components?.evaluator
  if (!object(component)) return null
  const descriptor = object(component.interface) ? component.interface : {}
  return {
    id: component.id ?? descriptor.evaluator_id ?? null,
    version: component.version ?? descriptor.version ?? null,
    digest: descriptor.portable_digest ?? component.digest ?? descriptor.digest ?? null,
    portable_digest: descriptor.portable_digest ?? null,
    interface: descriptor.interface ?? null,
    editable: Array.isArray(descriptor.editable_files) && descriptor.editable_files.length > 0,
    criteria: (descriptor.criteria ?? []).filter(object).map(item => ({
      id: item.id,
      label: item.label ?? item.id,
      required: item.required ?? null,
    })),
  }
}

function effectiveEvaluator(summary, stack, context, experienceOnly) {
  const declared = object(summary?.effective_evaluator) ? summary.effective_evaluator : {}
  const configured = object(declared.configured)
    ? declared.configured
    : configuredEvaluator(stack, context)
  const materialized = object(declared.materialized) ? declared.materialized : null
  const executed = object(declared.executed) ? declared.executed : null
  const identityMatch = typeof declared.identity_match === 'boolean' ? declared.identity_match : null
  const executionStatus = declared?.execution?.status ?? null
  const identity = value => value && ({ id: value.id ?? null, version: value.version ?? null, portable_digest: value.portable_digest ?? null })
  const expectedIdentity = identity(configured)
  const fullyExecuted = identityMatch === true
    && executionStatus === 'succeeded'
    && configured && materialized && executed
    && expectedIdentity.id && expectedIdentity.version && expectedIdentity.portable_digest
    && JSON.stringify(identity(materialized)) === JSON.stringify(expectedIdentity)
    && JSON.stringify(identity(executed)) === JSON.stringify(expectedIdentity)
    && materialized.bundle_complete === true
    && executed.bundle_complete === true
  return {
    status: fullyExecuted ? 'verified' : executionStatus === 'failed' ? 'execution-failed' : identityMatch === false ? 'mismatch' : configured ? 'unattested' : 'unknown',
    configured: configured ?? null,
    materialized,
    executed,
    identity_match: identityMatch,
    execution: object(declared.execution) ? declared.execution : null,
    experience_only: experienceOnly,
  }
}

function evaluatorReliability(summary, context) {
  const meta = summary?.evaluator_meta_evaluation ?? context?.downstream_analysis?.evaluator_meta_evaluation
  const status = meta?.status
  if (status === 'evaluated' || status === 'validated') return { status: 'validated', report_ref: meta.validation_report_ref ?? null }
  if (status === 'limited') return { status: 'limited', report_ref: meta.validation_report_ref ?? null }
  if (status === 'stale') return { status: 'stale', report_ref: meta.validation_report_ref ?? null }
  if (status === 'failed') return { status: 'failed', report_ref: meta.validation_report_ref ?? null }
  return { status: 'unvalidated', report_ref: meta?.validation_report_ref ?? null }
}

function verdictFor({ total, scored, unscored, evaluationErrors, infrastructureErrors, artifactValid, evaluatorStatus }) {
  if (artifactValid === false || (total > 0 && infrastructureErrors >= total)) return 'run-failed'
  if (evaluatorStatus === 'mismatch' || evaluatorStatus === 'execution-failed') return 'evaluation-failed'
  if (total > 0 && evaluationErrors >= total) return 'evaluation-failed'
  if (scored === 0) return unscored > 0 ? 'insufficient-evidence' : evaluationErrors > 0 ? 'evaluation-failed' : 'insufficient-evidence'
  if (evaluatorStatus !== 'verified') return 'actionable-with-limitations'
  if (scored < total || unscored > 0 || evaluationErrors > 0 || infrastructureErrors > 0) return 'actionable-with-limitations'
  return 'reliable-result'
}

function headline(code) {
  return {
    'reliable-result': 'The evaluation produced a reliable result.',
    'actionable-with-limitations': 'The result is actionable, with stated limitations.',
    'insufficient-evidence': 'Evidence is insufficient for a reliable overall score.',
    'evaluation-failed': 'The evaluator did not complete reliably.',
    'run-failed': 'The evaluation run did not produce trustworthy evidence.',
  }[code]
}

function verdictSummary(code, sample) {
  if (code === 'reliable-result') return `${sample.scored} of ${sample.total} Trials produced valid scores.`
  if (code === 'actionable-with-limitations') return `${sample.scored} of ${sample.total} Trials produced valid scores; ${sample.unscored} were unscored and ${sample.evaluation_errors + sample.infrastructure_errors} ended with evaluation or infrastructure errors.`
  if (code === 'insufficient-evidence') return `No valid overall Trial score is available; ${sample.unscored} Trials were unscored and Criterion coverage is ${sample.criterion_coverage ?? 'unknown'}.`
  if (code === 'evaluation-failed') return `${sample.evaluation_errors} of ${sample.total} Trials ended in evaluation errors.`
  return `${sample.infrastructure_errors} of ${sample.total} Trials ended in infrastructure errors or the Job artifacts are invalid.`
}

function ownerCategory(owner, rootCause) {
  if (owner === 'generator') return 'generator'
  if (owner === 'evaluation-stack' || rootCause?.includes('evaluation-error')) return 'evaluator'
  if (owner === 'generation-record' || rootCause?.includes('unscored') || rootCause?.includes('coverage')) return 'evaluation-evidence'
  if (rootCause?.includes('infrastructure')) return 'infrastructure'
  return owner || 'unknown'
}

function derivedFindings(summary, sample, effective) {
  const trials = (summary?.trials ?? []).filter(object)
  const caseIds = status => trials
    .filter(trial => status.includes(trial.status))
    .slice(0, 20)
    .map((trial, index) => publicTrialId(trial, index))
  const result = []
  if (effective.status === 'mismatch') result.push({
    id: 'evaluator-identity-mismatch', owner: 'evaluator-runtime',
    root_cause: 'evaluator-identity-mismatch', criterion_id: null,
    summary: 'Configured, materialized, and executed Evaluator identities do not match.',
    recommendation: 'Restore the exact configured bundle or create and run a new Evaluator version.',
    affected_count: sample.total, case_ids: caseIds(['completed', 'completed-unscored', 'evaluation-error']), evidence_refs: [],
  })
  if (sample.unscored > 0) result.push({
    id: 'required-evidence-gap', owner: 'evaluation-evidence',
    root_cause: 'required-evidence-insufficient', criterion_id: null,
    summary: 'Required evidence was insufficient for a valid Trial score.',
    recommendation: 'Collect bounded execution evidence for the required Criteria before changing the Generator.',
    affected_count: sample.unscored, case_ids: caseIds(['completed-unscored']), evidence_refs: [],
  })
  if (sample.evaluation_errors > 0) result.push({
    id: 'evaluator-runtime-failure', owner: 'evaluator-runtime',
    root_cause: 'evaluation-error', criterion_id: null,
    summary: 'The Evaluator or Judge did not complete reliably.',
    recommendation: 'Repair the Evaluator runtime and rerun the same frozen records.',
    affected_count: sample.evaluation_errors, case_ids: caseIds(['evaluation-error']), evidence_refs: [],
  })
  if (sample.infrastructure_errors > 0) result.push({
    id: 'evaluation-infrastructure-failure', owner: 'infrastructure',
    root_cause: 'infrastructure-error', criterion_id: null,
    summary: 'Evaluation infrastructure failed before trustworthy evidence was produced.',
    recommendation: 'Repair the runtime and retry only the failed Trials.',
    affected_count: sample.infrastructure_errors, case_ids: caseIds(['infrastructure-error']), evidence_refs: [],
  })
  return result
}

function findings(diagnosis) {
  return (diagnosis?.diagnoses ?? []).filter(object).slice(0, 20).map((item, index) => ({
    id: item.id ?? `finding-${index + 1}`,
    owner: ownerCategory(item.owner, item.root_cause),
    root_cause: item.root_cause ?? 'unknown',
    criterion_id: item.criterion_id ?? null,
    summary: item.reason ?? null,
    recommendation: item.recommendation ?? null,
    affected_count: (item.affected_records ?? item.affected_trials ?? []).length,
    case_ids: (item.affected_records ?? item.affected_trials ?? []).slice(0, 20),
    evidence_refs: (item.evidence_refs ?? []).slice(0, 20),
  }))
}

function publicTrialId(trial, index) {
  return trial?.generationRecord?.record_id
    ?? trial?.evaluation_target?.record_id
    ?? trial?.assessment_id
    ?? trial?.id
    ?? trial?.trial_id
    ?? `trial-${index + 1}`
}

function representativeCases(summary) {
  const ranked = [...(summary?.trials ?? [])].filter(object).sort((left, right) => {
    const statusRank = value => value === 'evaluation-error' || value === 'infrastructure-error'
      ? 0
      : value === 'completed-unscored' ? 1 : 2
    const rank = statusRank(left.status) - statusRank(right.status)
    if (rank) return rank
    const leftScore = finite(left?.score?.value) ? left.score.value : Number.POSITIVE_INFINITY
    const rightScore = finite(right?.score?.value) ? right.score.value : Number.POSITIVE_INFINITY
    return leftScore - rightScore
  })
  return ranked.slice(0, 10).map((trial, index) => ({
    trial_id: publicTrialId(trial, index),
    execution_id: trial.id ?? trial.trial_id ?? null,
    dataset_trial: trial.datasetTrial ?? trial.dataset_trial ?? null,
    status: trial.status ?? null,
    score: finite(trial?.score?.value) && trial?.score?.valid === true ? trial.score.value : null,
    score_valid: trial?.score?.valid === true && finite(trial?.score?.value),
    criterion_statuses: Object.fromEntries((trial.criteria ?? []).filter(object).map(item => [item.id, item.status ?? (finite(item.score) ? 'scored' : 'unknown')])),
  }))
}

function nextAction(sample, optimization, effective) {
  if (effective.status === 'mismatch') {
    return {
      owner: 'evaluator-runtime',
      change: 'Restore the configured Evaluator bundle or materialize a new version before trusting any score.',
      verification: 'Rerun the same frozen Trials and require configured, materialized, and executed portable digests to match.',
      evidence_refs: [],
    }
  }
  if (effective.status === 'unattested' && sample.scored > 0) {
    return {
      owner: 'evaluator-runtime',
      change: 'Run the Evaluation through an attested Evaluator adapter before treating the score as reliable.',
      verification: 'Confirm that every Trial records one matching executed Evaluator identity.',
      evidence_refs: [],
    }
  }
  if (sample.scored === 0 && sample.unscored > 0) {
    return {
      owner: 'evaluation-evidence',
      change: 'Collect bounded, verifiable execution evidence for every required Criterion.',
      verification: 'Rerun the same frozen metric template and confirm required Criterion coverage before changing the Generator.',
      evidence_refs: [],
    }
  }
  if (sample.evaluation_errors > 0 && sample.scored === 0) {
    return {
      owner: 'evaluator',
      change: 'Repair the Evaluator execution or result contract.',
      verification: 'Rerun the failed Trials with the same Generator records and verify that the Evaluator completes.',
      evidence_refs: [],
    }
  }
  if (sample.infrastructure_errors > 0 && sample.scored === 0) {
    return {
      owner: 'infrastructure',
      change: 'Repair the evaluation runtime before drawing a quality conclusion.',
      verification: 'Retry only the infrastructure-failed Trials while preserving the original attempts.',
      evidence_refs: [],
    }
  }
  const hypothesis = (optimization?.hypotheses ?? []).find(object)
  if (!hypothesis) return null
  return {
    owner: ownerCategory(hypothesis.owner, hypothesis.root_cause),
    hypothesis_id: hypothesis.id ?? null,
    change: hypothesis.next_experiment ?? hypothesis.recommendation ?? hypothesis.reason ?? 'Review the highest-priority hypothesis.',
    verification: hypothesis.expected_metric_effect ?? null,
    evidence_refs: (hypothesis.evidence_refs ?? []).slice(0, 20),
  }
}

/**
 * Build a bounded user-facing projection from immutable Harbor artifacts.
 * This function never changes scores and never treats an abstention as zero.
 */
export function buildEvaluationReport({
  job,
  summary = {},
  context = {},
  contract = {},
  stack = {},
  diagnosis = {},
  optimization = {},
  validation = {},
  businessResults,
} = {}) {
  const kind = jobKind(summary, context)
  const experience = kind === HISTORICAL_JOB_KIND
  const sourceCoverage = coverage(summary)
  const evaluationErrors = count(summary?.n_evaluation_exceptions ?? summary?.status_counts?.['evaluation-error'])
  const infrastructureErrors = count(summary?.n_infrastructure_exceptions ?? summary?.n_exceptions ?? summary?.status_counts?.['infrastructure-error'])
  const sample = {
    total: sourceCoverage.total,
    evaluated: Math.max(0, sourceCoverage.total - infrastructureErrors - evaluationErrors),
    scored: sourceCoverage.scored,
    unscored: sourceCoverage.unscored,
    invalid: count(summary?.n_invalid_scores),
    evaluation_errors: evaluationErrors,
    infrastructure_errors: infrastructureErrors,
    trial_coverage: sourceCoverage.trialRate,
    criterion_scored: sourceCoverage.criterionScored,
    criterion_total: sourceCoverage.criterionTotal,
    criterion_coverage: sourceCoverage.criterionRate,
  }
  const artifactValid = summary?.artifact_validation?.valid
    ?? (validation?.summary?.status ? validation.summary.status === 'valid' : undefined)
  const effective = effectiveEvaluator(summary, stack, context, experience)
  const requiredCoverageComplete = sample.total > 0
    && sample.scored === sample.total
    && sample.unscored === 0
    && sample.invalid === 0
  const jobBundleTrusted = validation?.jobBundle?.status === 'valid'
  const scoreTrusted = !experience
    && artifactValid === true
    && jobBundleTrusted
    && effective.status === 'verified'
    && requiredCoverageComplete
    && evaluationErrors === 0
    && infrastructureErrors === 0
  let code = verdictFor({
    ...sample,
    evaluationErrors,
    infrastructureErrors,
    artifactValid,
    evaluatorStatus: effective.status,
  })
  if (code === 'reliable-result' && (!scoreTrusted || experience)) code = 'actionable-with-limitations'
  if (!VERDICTS.has(code)) throw new Error('evaluation report verdict is invalid')
  const quality = metricProfile(summary, contract, sample)
  quality.partial_signals = partialSignals(summary)
  quality.score_trusted = scoreTrusted
  quality.trust_requirements = {
    artifact_validation: artifactValid === true,
    job_bundle_verified: jobBundleTrusted,
    evaluator_executed_and_attested: effective.status === 'verified',
    required_coverage_complete: requiredCoverageComplete,
  }
  if (!scoreTrusted) {
    quality.overall_score = null
    quality.primary_metric_status = 'untrusted'
    quality.metrics = quality.metrics.map(item => ({ ...item, value: null, suppressed: true }))
    quality.partial_signals = quality.partial_signals.map(item => ({ ...item, mean: null, suppressed: true }))
  }
  const healthLimited = effective.status !== 'verified' || evaluationErrors > 0 || infrastructureErrors > 0 || sample.unscored > 0 || (sample.criterion_coverage !== null && sample.criterion_coverage < 1)
  const runHealth = {
    status: artifactValid !== true || !jobBundleTrusted || infrastructureErrors > 0 ? 'failed' : 'healthy',
    artifact_validation: artifactValid === true,
    job_bundle_verified: jobBundleTrusted,
    infrastructure_errors: infrastructureErrors,
  }
  const cases = representativeCases(summary).map(item => scoreTrusted
    ? item
    : { ...item, score: null, score_valid: false, score_suppressed: true })
  const generatorQuality = {
    status: scoreTrusted ? (experience ? 'experience-only' : 'measured') : sample.scored > 0 ? 'untrusted' : 'insufficient-evidence',
    overall_score: scoreTrusted ? quality.overall_score : null,
    primary_metric_id: quality.primary_metric_id,
    evidence_scope: experience ? 'observed-historical-sessions' : 'fixed-dataset',
  }
  return {
    schema_version: BRIDGE_CONTRACT.protocols.evaluation_report.schema_version,
    protocol: BRIDGE_CONTRACT.protocols.evaluation_report.protocol,
    run: {
      id: job ?? summary?.job ?? null,
      job_kind: kind,
      mode: summary?.mode ?? context?.mode ?? null,
      evaluation_type: experience
        ? 'experience-diagnostic'
        : context?.artifact_profile ?? ((summary?.mode ?? context?.mode) === 'promotion-eligible' ? 'governed' : 'experiment'),
      artifact_profile: experience ? 'diagnostic' : context?.artifact_profile ?? ((summary?.mode ?? context?.mode) === 'promotion-eligible' ? 'governed' : 'experiment'),
      status: code === 'reliable-result' ? 'completed' : code === 'run-failed' ? 'failed' : 'completed-with-limitations',
      experience_diagnostic: experience,
      promotion_eligible: !experience && (summary?.mode ?? context?.mode) === 'promotion-eligible',
    },
    verdict: {
      code,
      headline: headline(code),
      summary: verdictSummary(code, sample),
    },
    sample,
    quality,
    generator_quality: generatorQuality,
    evaluation_health: {
      status: code === 'run-failed' || code === 'evaluation-failed' ? 'failed' : healthLimited ? 'limited' : 'healthy',
      evidence_adequacy: sample.scored === sample.total && sample.total > 0
        ? 'sufficient'
        : sample.scored > 0 || sample.criterion_scored > 0 ? 'partial' : 'insufficient',
      evaluator_reliability: evaluatorReliability(summary, context).status,
      judge_completed: sample.evaluated,
      judge_failed: evaluationErrors,
      evaluation_errors: evaluationErrors,
      infrastructure_errors: infrastructureErrors,
    },
    run_health: runHealth,
    dataset_validity: { status: 'not-assessed' },
    evaluator_reliability: evaluatorReliability(summary, context),
    optimization_generalization: { status: 'not-assessed' },
    business_results: businessResults ?? businessObservationProjection(undefined, context?.candidate?.digest ?? summary?.candidate?.digest),
    effective_evaluator: effective,
    findings: [...derivedFindings(summary, sample, effective), ...findings(diagnosis)].slice(0, 20),
    representative_cases: cases,
    next_action: nextAction(sample, optimization, effective),
    source: {
      kind: 'dynamic-projection',
      summary_schema_version: summary?.schema_version ?? null,
      legacy_projection: ![3, 4].includes(summary?.schema_version),
      persisted: false,
    },
    experiment_details_ref: null,
    advanced: {
      experiment_details_available: true,
      source_artifacts: [
        'evaluation-summary.json',
        'evaluation-context.json',
        'evaluation-spec.json',
        'job-bundle-manifest.json',
        'evaluation-contract.json',
        'evaluation-stack-manifest.json',
        'diagnosis-report.json',
        'optimization-report.json',
      ],
    },
  }
}
