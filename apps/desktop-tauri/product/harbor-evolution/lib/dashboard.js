import { access, constants, lstat, readdir, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

import {
  isSensitiveCredentialContainerKey,
  redactCredentialText,
  redactLocalPaths,
  redactOpaqueSecretText,
} from './credential-redaction.js'
import { listBusinessObservations, resolveWithin } from './evolution.js'
import { BRIDGE_CONTRACT, canonicalDigest } from './bridge-contract.js'
import { buildEvaluationReport } from './evaluation-report.js'
import { businessObservationProjection } from './business-results.js'
import { ATTENTION_FILTERS, attentionCounts, jobAttention, matchesJobFilter } from './workbench-health.js'

const SUMMARY_NAME = 'evaluation-summary.json'
const HISTORICAL_COMPLETION_NAME = 'historical-evaluation-complete.json'
const DEFAULT_JOB_PAGE_SIZE = 20
const MAX_JOB_PAGE_SIZE = 100
const MAX_JSON_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_BYTES = 128 * 1024
const MAX_PREVIEW_BYTES = 512 * 1024
const MAX_TRIAL_LIMIT = 100
const jsonCache = new Map()
const authoritativeRevisions = new WeakMap()
const WORKSPACE_SKIP_DIRECTORIES = new Set([
  '.cache', '.git', '.harbor', '.next', '.venv', '__pycache__',
  'build', 'candidates', 'coverage', 'datasets', 'dist', 'jobs', 'node_modules', 'public', 'vendor', 'venv',
])
const MAX_WORKSPACE_DEPTH = 5

function safeSegment(value, label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(String(value ?? ''))) throw new Error(`${label} is invalid`)
  return String(value)
}

function redact(value, depth = 0, maxText = 8_000) {
  if (depth > 10) return '[TRUNCATED depth]'
  if (Array.isArray(value)) return value.slice(0, 10_000).map(item => redact(item, depth + 1, maxText))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, isSensitiveCredentialContainerKey(key) ? '[REDACTED]' : redact(item, depth + 1, maxText)]))
  }
  if (typeof value === 'string') {
    const safe = redactSourceText(value)
    return safe.length > maxText ? `${safe.slice(0, maxText)}\n[TRUNCATED ${safe.length - maxText} chars]` : safe
  }
  return value
}

function redactSourceText(value) {
  return redactOpaqueSecretText(redactCredentialText(value))
}

function rawContentRevision(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

const REQUIRED_SEALED_ARTIFACTS = new Set([
  'evaluation-summary.json', 'evaluation-context.json', 'evaluation-stack-manifest.json', 'dataset-manifest.json',
])
const FIXED_REWARD_ARTIFACTS = new Set([
  'candidate-manifest.json', 'candidate-materialization.json', 'dataset-manifest.json',
  'evaluation-stack-manifest.json', 'evaluation-contract.json', 'evaluation-context.json',
  'evaluation-spec.json', 'architecture-doctor.json', 'evaluator-bundle-manifest.json', 'evaluation-summary.json',
])

async function currentRewardArtifactPaths(directory) {
  const values = new Set()
  for (const name of FIXED_REWARD_ARTIFACTS) {
    try {
      const details = await lstat(path.join(directory, name))
      if (details.isFile() && !details.isSymbolicLink()) values.add(name)
    } catch {}
  }
  const walk = async (root, prefix) => {
    let entries = []
    try { entries = await readdir(root, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const relative = `${prefix}/${entry.name}`
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) await walk(path.join(root, entry.name), relative)
      else if (entry.isFile()) values.add(relative)
    }
  }
  await walk(path.join(directory, 'evaluator-bundle'), 'evaluator-bundle')
  try {
    for (const entry of await readdir(path.join(directory, 'trial-assessments'), { withFileTypes: true })) {
      if (entry.isFile() && !entry.isSymbolicLink() && entry.name.endsWith('.json')) values.add(`trial-assessments/${entry.name}`)
    }
  } catch {}
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      try {
        const result = await lstat(path.join(directory, entry.name, 'result.json'))
        if (result.isFile() && !result.isSymbolicLink()) values.add(`${entry.name}/result.json`)
      } catch {}
    }
  } catch {}
  return values
}

async function verifyJobBundleSeal(directory, projectRoot) {
  const seal = await readJson(path.join(directory, 'job-bundle-manifest.json'), { root: projectRoot })
  if (!seal || seal.__readError || seal.protocol !== 'job-bundle/v1' || seal.schema_version !== 1) {
    return { status: 'invalid', error: 'JOB_BUNDLE_SEAL_MISSING_OR_INVALID' }
  }
  const { digest, ...content } = seal
  if (digest !== canonicalDigest(content, 'harbor-dsh-job-bundle-v1')) {
    return { status: 'invalid', error: 'JOB_BUNDLE_SEAL_DIGEST_MISMATCH' }
  }
  if (!Array.isArray(seal.artifacts) || !seal.artifacts.length) return { status: 'invalid', error: 'JOB_BUNDLE_SEAL_EMPTY' }
  if (seal.job !== path.basename(directory)) return { status: 'invalid', error: 'JOB_BUNDLE_JOB_ID_MISMATCH' }
  const seen = new Set()
  try {
    for (const entry of seal.artifacts) {
      if (!entry || typeof entry.path !== 'string' || seen.has(entry.path)) throw new Error('JOB_BUNDLE_SEAL_ENTRY_INVALID')
      seen.add(entry.path)
      const file = resolveWithin(directory, entry.path, 'sealedArtifact')
      const bytes = await readFile(file)
      const current = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
      if (bytes.length !== entry.size || current !== entry.digest) throw new Error(`JOB_BUNDLE_ARTIFACT_TAMPERED: ${entry.path}`)
    }
  } catch (error) {
    return { status: 'invalid', error: String(error?.message ?? error) }
  }
  if ([...REQUIRED_SEALED_ARTIFACTS].some(name => !seen.has(name))) {
    return { status: 'invalid', error: 'JOB_BUNDLE_REQUIRED_ARTIFACT_MISSING' }
  }
  const currentRewardPaths = await currentRewardArtifactPaths(directory)
  const declaredRewardPaths = new Set(seal.artifacts.filter(entry => entry.reward_affecting === true).map(entry => entry.path))
  if (currentRewardPaths.size !== declaredRewardPaths.size || [...currentRewardPaths].some(name => !declaredRewardPaths.has(name))) {
    return { status: 'invalid', error: 'JOB_BUNDLE_REWARD_ARTIFACT_SET_CHANGED' }
  }
  for (const entry of seal.artifacts) {
    const expectedReward = currentRewardPaths.has(entry.path)
    if (Boolean(entry.reward_affecting) !== expectedReward) return { status: 'invalid', error: 'JOB_BUNDLE_REWARD_FLAG_INVALID' }
  }
  return { status: 'valid', digest, artifactCount: seal.artifacts.length }
}

function rememberAuthoritativeRevision(value, ...sources) {
  if (!value || typeof value !== 'object') return value
  const revisions = sources
    .map(source => typeof source === 'string' ? source : authoritativeRevisions.get(source))
    .filter(Boolean)
  if (revisions.length) authoritativeRevisions.set(value, rawContentRevision(JSON.stringify(revisions)))
  return value
}

/** Return a non-serialized digest of the full artifact bytes used to build a bounded dashboard value. */
export function authoritativeArtifactRevision(value) {
  return value && typeof value === 'object' ? authoritativeRevisions.get(value) : undefined
}

async function safePathDetails(target, root) {
  const resolvedTarget = path.resolve(target)
  if (!root) return lstat(resolvedTarget)
  const resolvedRoot = path.resolve(root)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('path is outside trusted project root')
    error.code = 'HARBOR_UNSAFE_PATH'
    throw error
  }
  let current = resolvedRoot
  let details = await lstat(current)
  if (details.isSymbolicLink()) {
    const error = new Error('trusted project root may not be a symlink')
    error.code = 'HARBOR_UNSAFE_PATH'
    throw error
  }
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    details = await lstat(current)
    if (details.isSymbolicLink()) {
      const error = new Error('symlinked path component is not allowed')
      error.code = 'HARBOR_UNSAFE_PATH'
      throw error
    }
  }
  return details
}

async function readJson(file, { maxBytes = MAX_JSON_BYTES, maxText = 8_000, root } = {}) {
  try {
    const details = await safePathDetails(file, root)
    if (details.isSymbolicLink()) return { __readError: `${path.basename(file)} may not be a symlink` }
    if (!details.isFile()) return { __readError: `${path.basename(file)} is not a file` }
    if (details.size > maxBytes) return { __readError: `${path.basename(file)} exceeds ${maxBytes} bytes` }
    const cached = jsonCache.get(file)
    const identity = `${details.dev}:${details.ino}:${details.ctimeMs}:${details.mtimeMs}:${details.size}:${maxText}`
    if (cached?.identity === identity) return cached.value
    const source = await readFile(file, 'utf8')
    const value = redact(JSON.parse(source), 0, maxText)
    if (value && typeof value === 'object') authoritativeRevisions.set(value, rawContentRevision(source))
    jsonCache.set(file, { identity, value })
    return value
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    if (error.code === 'HARBOR_UNSAFE_PATH') return { __readError: `${path.basename(file)} is not a safe file` }
    if (error instanceof SyntaxError) return { __readError: `invalid JSON in ${path.basename(file)}` }
    throw error
  }
}

async function readSafeText(file, projectRoot) {
  const resolved = path.resolve(file)
  const root = path.resolve(projectRoot)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return { error: 'source is outside projectRoot' }
  try {
    const details = await safePathDetails(resolved, root)
    if (!details.isFile() || details.isSymbolicLink()) return { error: 'source is not a safe file' }
    if (details.size > MAX_SOURCE_BYTES) return { error: `source exceeds ${MAX_SOURCE_BYTES} bytes` }
    const text = redactLocalPaths(redactSourceText(await readFile(resolved, 'utf8')))
    return { text: redact(text) }
  } catch (error) {
    return { error: error.code === 'ENOENT' ? 'source is unavailable' : 'source is unreadable' }
  }
}

async function directoryCheck(directory, { optional = false, root } = {}) {
  try {
    const details = await safePathDetails(directory, root)
    if (details.isSymbolicLink() || !details.isDirectory()) return { status: 'error', detail: 'not a safe directory' }
    await access(directory, constants.R_OK)
    return { status: 'ok', detail: 'readable' }
  } catch (error) {
    if (optional && error.code === 'ENOENT') return { status: 'warning', detail: 'not created yet' }
    return { status: 'error', detail: error.code === 'ENOENT' ? 'not found' : 'not readable' }
  }
}

async function fileCheck(file, { root } = {}) {
  try {
    const details = await safePathDetails(file, root)
    return details.isFile() && !details.isSymbolicLink()
      ? { status: 'ok', detail: path.basename(file) }
      : { status: 'error', detail: 'not a safe file' }
  } catch (error) {
    return { status: 'error', detail: error.code === 'ENOENT' ? 'not found' : 'not readable' }
  }
}

async function executableCheck(command) {
  if (!command) return { status: 'error', detail: 'not configured' }
  if (!path.isAbsolute(command)) return { status: 'ok', detail: `${command} (PATH)` }
  try {
    await access(command, constants.X_OK)
    return { status: 'ok', detail: path.basename(command) }
  } catch (error) {
    return { status: 'error', detail: error.code === 'ENOENT' ? 'not found' : 'not executable' }
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const CANDIDATE_JOB_KIND = 'candidate-evaluation'
const HISTORICAL_JOB_KIND = 'historical-generation-evaluation'

function normalizedJobKind(summary, context) {
  const declared = summary?.job_kind ?? context?.job_kind
  if (typeof declared === 'string' && declared) return declared
  if ([
    'historical-generation-evaluation-context/v1',
    'historical-generation-evaluation-context/v2',
    BRIDGE_CONTRACT.protocols.historical_context.protocol,
  ].includes(context?.protocol)) return HISTORICAL_JOB_KIND
  return CANDIDATE_JOB_KIND
}

function coverageView(summary) {
  if (isObject(summary?.coverage)) return summary.coverage
  const total = Number(summary?.n_trials ?? 0)
  const scored = Number(summary?.scored_trial_count ?? summary?.n_valid_scores ?? 0)
  const unscored = Number(
    summary?.unscored_trial_count
    ?? summary?.status_counts?.['completed-unscored']
    ?? 0,
  )
  return {
    scored_trials: scored,
    unscored_trials: unscored,
    total_trials: total,
    trial_rate: total ? scored / total : undefined,
  }
}

function evaluatorMetaEvaluation(summary, context) {
  return summary?.evaluator_meta_evaluation
    ?? context?.downstream_analysis?.evaluator_meta_evaluation
    ?? (normalizedJobKind(summary, context) === HISTORICAL_JOB_KIND
      ? { status: 'not-run', validation_report_ref: null }
      : undefined)
}

function capabilityMap(summary, context, lifecycle, registry, stack) {
  const jobKind = normalizedJobKind(summary, context)
  const historicalGeneration = jobKind === HISTORICAL_JOB_KIND
  const candidateContextV3 = !historicalGeneration && context?.schema_version === BRIDGE_CONTRACT.protocols.candidate_context.schema_version
  const contextV2 = !historicalGeneration && context?.schema_version === 2
  const historicalContextV2 = historicalGeneration
    && [2, 3].includes(context?.schema_version)
    && [
      'historical-generation-evaluation-context/v2',
      BRIDGE_CONTRACT.protocols.historical_context.protocol,
    ].includes(context?.protocol)
  const historicalContextV1 = historicalGeneration
    && context?.schema_version === 1
    && context?.protocol === 'historical-generation-evaluation-context/v1'
  const contextSupported = candidateContextV3 || contextV2 || historicalContextV2 || historicalContextV1
  const scoreValidity = summary?.schema_version === 3
    || summary?.schema_version === 4
  return {
    jobKind,
    contextV2,
    candidateContextV3,
    historicalContextV2,
    contextSupported,
    historicalGeneration,
    candidateEvaluation: !historicalGeneration,
    trialLifecycle: lifecycle?.schema_version === 1,
    scoreValidity,
    evidenceProvenance: scoreValidity,
    artifactRegistry: registry?.schema_version === 2,
    source: historicalGeneration,
    compare: (candidateContextV3 || contextV2) && !historicalGeneration,
    evaluatorGovernance: stack?.schema_version === 1,
    evaluatorMetaEvaluation: evaluatorMetaEvaluation(summary, context),
    gate: (candidateContextV3 || contextV2) && !historicalGeneration && summary?.mode === 'promotion-eligible',
    readOnlyLegacy: !contextSupported,
  }
}

function primaryMetric(summary, contract) {
  const id = typeof contract?.primary_metric === 'string' && contract.primary_metric
    ? contract.primary_metric
    : undefined
  if (!id || typeof summary?.metrics?.[id] !== 'number') return undefined
  const definition = (contract?.metrics ?? []).find(item => item?.id === id) ?? {}
  const coverage = coverageView(summary)
  return {
    id,
    name: id,
    label: definition.label ?? id,
    value: summary.metrics[id],
    unit: definition.unit ?? null,
    direction: definition.direction ?? null,
    validCoverage: typeof coverage.trial_rate === 'number' ? coverage.trial_rate : null,
    source: 'evaluation-contract',
  }
}

function progressView(summary, lifecycle, updatedAt) {
  const total = Number(lifecycle?.dataset_total ?? summary?.n_trials ?? summary?.coverage?.total_trials ?? 0)
  const lifecycleTrials = selectedLifecycleTrials(lifecycle)
  const completed = lifecycle
    ? lifecycleTrials.filter(item => item.terminal).length
    : Number(summary?.n_completed_trials ?? summary?.n_discovered_trials ?? summary?.n_trials ?? 0)
  const active = lifecycle ? lifecycleTrials.some(item => !item.terminal) : !summary
  const lastProgressAt = lifecycle?.updated_at ?? updatedAt
  const ageMs = Math.max(0, Date.now() - Date.parse(lastProgressAt || updatedAt))
  const errorCount = Number(summary?.n_infrastructure_exceptions ?? 0) + Number(summary?.n_evaluation_exceptions ?? 0)
  const health = errorCount > 0 ? 'attention' : active && ageMs > 60_000 ? 'stalled' : active ? 'healthy' : 'completed'
  return {
    total,
    completed: Math.min(completed, total || completed),
    active,
    percent: total ? Math.min(100, Math.round((completed / total) * 100)) : 0,
    lastProgressAt,
    health,
  }
}

const HISTORICAL_COVERAGE_KEYS = [
  'scored_trials', 'unscored_trials', 'total_trials', 'trial_rate',
  'criterion_scored', 'criterion_total', 'criterion_rate',
]

function historicalCompletionValid(summary, completion, jobName) {
  return (
    summary?.schema_version === 4
    && summary?.job === jobName
    && summary?.job_kind === HISTORICAL_JOB_KIND
    && summary?.mode === 'diagnostic'
    && summary?.execution_mode === 'observe-existing'
    && summary?.artifact_validation?.valid === true
    && summary?.candidate === undefined
    && completion?.schema_version === 1
    && completion?.job_kind === HISTORICAL_JOB_KIND
    && completion?.status === 'completed'
    && completion?.valid === true
    && completion?.job === jobName
    && completion?.summary_path === SUMMARY_NAME
    && completion?.artifact_registry_path === 'artifact-registry.json'
    && HISTORICAL_COVERAGE_KEYS.every(key => (
      typeof summary?.coverage?.[key] === 'number'
      && summary.coverage[key] === completion?.coverage?.[key]
    ))
  )
}

function jobStatus(summary, lifecycle, progress, jobKind, completion, jobName) {
  if (summary?.__readError) return 'failed'
  if (!summary && !lifecycle) return 'pending'
  if (progress.active) return 'running'
  if (!summary && lifecycle) return 'running'
  if (summary?.artifact_validation?.valid === false) return 'failed'
  if (
    jobKind === HISTORICAL_JOB_KIND
    && !historicalCompletionValid(summary, completion, jobName)
  ) return 'failed'
  if (Number(summary.n_infrastructure_exceptions ?? summary.n_exceptions ?? 0) > 0 || Number(summary.n_evaluation_exceptions ?? 0) > 0) return 'partial'
  const invalidScores = Number(summary.n_invalid_scores ?? 0)
  if (invalidScores > 0) return 'attention'
  return 'completed'
}

async function readJob(jobsDir, entry, details, projectRoot) {
  const directory = path.join(jobsDir, entry.name)
  const [summary, contextFile, promotion, contract, lifecycle, registry, stack, completion, jobBundle] = await Promise.all([
    readJson(path.join(directory, SUMMARY_NAME), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-context.json'), { root: projectRoot }),
    readJson(path.join(directory, 'promotion-report.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-contract.json'), { root: projectRoot }),
    readJson(path.join(directory, 'trial-lifecycle.json'), { root: projectRoot }),
    readJson(path.join(directory, 'artifact-registry.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-stack-manifest.json'), { root: projectRoot }),
    readJson(path.join(directory, HISTORICAL_COMPLETION_NAME), { root: projectRoot }),
    verifyJobBundleSeal(directory, projectRoot),
  ])
  const evaluationContext = summary?.evaluation_context ?? contextFile
  if (!evaluationContext && !summary && !lifecycle) return undefined
  const updatedAt = details.mtime.toISOString()
  const progress = progressView(summary, lifecycle, updatedAt)
  const jobKind = normalizedJobKind(summary, evaluationContext)
  const capabilities = capabilityMap(summary, evaluationContext, lifecycle, registry, stack)
  const evaluationTarget = summary?.evaluation_target ?? evaluationContext?.evaluation_target
  const generationSource = summary?.generation_source ?? evaluationContext?.generation_source
  const coverage = coverageView(summary)
  const trustProjection = buildEvaluationReport({
    job: entry.name,
    summary: summary?.__readError ? {} : summary,
    context: evaluationContext ?? {},
    contract: contract?.__readError ? {} : contract,
    stack: stack?.__readError ? {} : stack,
    validation: { jobBundle },
  })
  const scoreTrusted = trustProjection.quality.score_trusted === true
  return {
    name: entry.name,
    updatedAt,
    status: jobStatus(summary, lifecycle, progress, jobKind, completion, entry.name),
    jobKind,
    mode: summary?.mode ?? evaluationContext?.mode,
    executionMode: summary?.execution_mode ?? evaluationContext?.execution_mode,
    nTrials: progress.total,
    nDiscoveredTrials: Number(summary?.n_discovered_trials ?? lifecycle?.attempt_count ?? 0),
    nValidScores: summary?.n_valid_scores,
    nInvalidScores: summary?.n_invalid_scores,
    nUnscoredTrials: Number(coverage.unscored_trials ?? 0),
    nExceptions: Number(summary?.n_exceptions ?? 0),
    nInfrastructureExceptions: Number(summary?.n_infrastructure_exceptions ?? 0),
    nEvaluationExceptions: Number(summary?.n_evaluation_exceptions ?? 0),
    primaryMetric: scoreTrusted ? primaryMetric(summary, contract) : undefined,
    metrics: scoreTrusted ? (summary?.metrics ?? {}) : {},
    scoreTrusted,
    jobBundleVerified: jobBundle.status === 'valid',
    candidate: summary?.candidate ?? evaluationContext?.candidate,
    evaluationTarget,
    generationSource,
    generatorPopulation: evaluationTarget?.generator_population,
    coverage,
    evaluatorMetaEvaluation: evaluatorMetaEvaluation(summary, evaluationContext),
    dataset: evaluationContext?.dataset,
    evaluationContext,
    progress,
    capabilities,
    artifactValidation: summary?.artifact_validation,
    promotion: promotion ? { decision: promotion.decision, reasons: promotion.reasons ?? [], baselineJob: promotion.baseline_job, regressions: promotion.regressed_trials?.length ?? 0 } : undefined,
    readError: summary?.__readError,
  }
}

async function listJobs(jobsDir, { offset = 0, limit = DEFAULT_JOB_PAGE_SIZE, root, attention = 'all' } = {}) {
  if (!ATTENTION_FILTERS.includes(attention)) throw new Error('HARBOR_FILTER_INVALID: Unknown attention filter')
  const check = await directoryCheck(jobsDir, { optional: true, root })
  if (check.status === 'warning') return { items: [], total: 0, offset, limit, hasMore: false }
  if (check.status !== 'ok') throw new Error('Jobs directory is not safe')
  let entries
  try {
    entries = await readdir(jobsDir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return { items: [], total: 0, offset, limit, hasMore: false }
    throw error
  }
  const directories = entries.filter(entry => entry.isDirectory() && !entry.isSymbolicLink())
  const recent = await Promise.all(directories.map(async entry => ({ entry, details: await stat(path.join(jobsDir, entry.name)) })))
  recent.sort((left, right) => right.details.mtimeMs - left.details.mtimeMs)
  const allJobs = []
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(8, recent.length) }, async () => {
    while (cursor < recent.length) {
      const { entry, details } = recent[cursor++]
      const job = await readJob(jobsDir, entry, details, root)
      if (job) allJobs.push(job)
    }
  }))
  allJobs.sort((a, b) => jobAttention(a).rank - jobAttention(b).rank || Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.name.localeCompare(b.name))
  const jobs = allJobs.filter(job => matchesJobFilter(job, attention))
  return { items: jobs.slice(offset, offset + limit), allJobs, attentionCounts: attentionCounts(allJobs), total: jobs.length, offset, limit, hasMore: offset + limit < jobs.length }
}

function relativePath(root, value) {
  return path.relative(root, value).split(path.sep).join('/') || '.'
}

function workspaceIdentity(projectRoot, workspaceRoot, jobsDir, preferred) {
  const digest = createHash('sha256').update(`${projectRoot}\0${workspaceRoot}\0${jobsDir}`).digest('hex').slice(0, 12)
  const label = String(preferred || path.basename(workspaceRoot) || 'root').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'root'
  return `${label}-${digest}`
}

async function regularFile(pathname, root) {
  try {
    const details = await safePathDetails(pathname, root)
    return details.isFile() && !details.isSymbolicLink()
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

/** Discover root and namespaced Harbor workspaces without interpreting YAML. */
export async function discoverWorkspaceConfigs(config) {
  const projectRoot = path.resolve(config.projectRoot)
  const found = []
  async function visit(directory, depth) {
    const harborDirectory = path.join(directory, '.harbor')
    const descriptorPath = path.join(harborDirectory, 'workspace.json')
    const stackPath = path.join(harborDirectory, 'evaluation-stack.yml')
    const descriptor = await readJson(descriptorPath, { root: projectRoot })
    if (descriptor?.schema_version === 1 && descriptor.jobs && descriptor.stack) {
      const jobs = relativePath(projectRoot, resolveWithin(projectRoot, path.resolve(directory, descriptor.jobs), 'workspace.jobs'))
      const stack = relativePath(projectRoot, resolveWithin(projectRoot, path.resolve(directory, descriptor.stack), 'workspace.stack'))
      const workspaceRoot = relativePath(projectRoot, directory)
      found.push({
        ...config,
        jobsDir: jobs,
        stackPath: stack,
        workspaceRoot,
        workspaceLabel: descriptor.workspace_id ?? workspaceRoot,
        workspaceId: workspaceIdentity(projectRoot, directory, jobs, descriptor.workspace_id),
      })
    } else if (await regularFile(stackPath, projectRoot)) {
      const workspaceRoot = relativePath(projectRoot, directory)
      const jobs = relativePath(projectRoot, path.join(directory, 'jobs'))
      found.push({
        ...config,
        jobsDir: jobs,
        stackPath: relativePath(projectRoot, stackPath),
        workspaceRoot,
        workspaceLabel: workspaceRoot,
        workspaceId: workspaceIdentity(projectRoot, directory, jobs, workspaceRoot),
      })
    }
    if (depth >= MAX_WORKSPACE_DEPTH) return
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EACCES') return
      throw error
    }
    await Promise.all(entries
      .filter(entry => entry.isDirectory() && !entry.isSymbolicLink() && !WORKSPACE_SKIP_DIRECTORIES.has(entry.name))
      .map(entry => visit(path.join(directory, entry.name), depth + 1)))
  }
  await visit(projectRoot, 0)
  if (!found.some(item => item.workspaceRoot === '.')) {
    found.unshift({
      ...config,
      stackPath: '.harbor/evaluation-stack.yml',
      workspaceRoot: '.',
      workspaceLabel: path.basename(projectRoot) || 'root',
      workspaceId: workspaceIdentity(projectRoot, projectRoot, config.jobsDir, path.basename(projectRoot)),
    })
  }
  return found.sort((left, right) => left.workspaceRoot.localeCompare(right.workspaceRoot))
}

function observationProjectConfig(config) {
  const projectRoot = path.resolve(config.projectRoot)
  const workspaceRoot = config.workspaceRoot && config.workspaceRoot !== '.'
    ? resolveWithin(projectRoot, config.workspaceRoot, 'workspaceRoot')
    : projectRoot
  return { ...config, projectRoot: workspaceRoot }
}

async function safeBusinessObservationList(config, args = {}) {
  if (typeof config.harborDshBin !== 'string' || !config.harborDshBin) return undefined
  try {
    return await listBusinessObservations(observationProjectConfig(config), { limit: 1000, ...args })
  } catch {
    return undefined
  }
}

function jobCandidateDigest(summary, context, candidate) {
  const values = [summary?.candidate?.digest, context?.candidate?.digest, candidate?.digest].filter(value => value !== undefined && value !== null)
  if (!values.length || values.some(value => typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(value))) return undefined
  return new Set(values).size === 1 ? values[0] : undefined
}

function jobsDirectory(config) {
  return resolveWithin(path.resolve(config.projectRoot), config.jobsDir, 'jobsDir')
}

function jobDirectory(config, job) {
  return path.join(jobsDirectory(config), safeSegment(job, 'job'))
}

/** Resolve legacy Job paths and current Job names to one immediate configured jobsDir child. */
export function resolveJobReference(config, value) {
  const projectRoot = path.resolve(config.projectRoot)
  const jobsRoot = jobsDirectory(config)
  const reference = String(value ?? '').trim()
  if (!reference) throw new Error('jobPath is required')
  if (/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(reference)) {
    const job = safeSegment(reference, 'job')
    return {
      job,
      directory: jobDirectory(config, job),
      jobPath: path.relative(projectRoot, jobDirectory(config, job)).split(path.sep).join('/'),
    }
  }
  const candidate = path.isAbsolute(reference)
    ? path.resolve(reference)
    : path.resolve(projectRoot, reference)
  const relative = path.relative(jobsRoot, candidate)
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new Error('jobPath must identify one immediate child of the configured jobs directory')
  }
  const job = safeSegment(relative, 'job')
  return {
    job,
    directory: jobDirectory(config, job),
    jobPath: path.relative(projectRoot, jobDirectory(config, job)).split(path.sep).join('/'),
  }
}

/** Read the stable Job Summary through the same bounded, redacting reader used by the Workbench. */
export async function readEvaluationSummary(config, args) {
  const projectRoot = path.resolve(config.projectRoot)
  const directory = args.job
    ? jobDirectory(config, safeSegment(args.job, 'job'))
    : resolveJobReference(config, args.jobPath).directory
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') return { __readError: 'Job path is not a safe directory' }
  const summary = await readJson(path.join(directory, SUMMARY_NAME), { root: projectRoot })
  return summary ?? { __readError: `${SUMMARY_NAME} is unavailable` }
}

export async function readDashboardSnapshot(config, metadata = {}, args = {}) {
  const projectRoot = path.resolve(config.projectRoot)
  const jobsDir = jobsDirectory(config)
  const offset = Math.max(0, Number.parseInt(args.offset ?? 0, 10) || 0)
  const limit = Math.min(MAX_JOB_PAGE_SIZE, Math.max(1, Number.parseInt(args.limit ?? DEFAULT_JOB_PAGE_SIZE, 10) || DEFAULT_JOB_PAGE_SIZE))
  const [jobPage, projectRootCheck, jobsDirCheck, harborCheck, harborDshCheck, stackCheck, businessList] = await Promise.all([
    listJobs(jobsDir, { offset, limit, root: projectRoot, attention: args.attention ?? 'all' }),
    directoryCheck(projectRoot),
    directoryCheck(jobsDir, { optional: true, root: projectRoot }),
    executableCheck(config.harborBin),
    executableCheck(config.harborDshBin),
    fileCheck(resolveWithin(projectRoot, config.stackPath ?? '.harbor/evaluation-stack.yml', 'stackPath'), { root: projectRoot }),
    safeBusinessObservationList(config),
  ])
  const observationCounts = new Map()
  if (Array.isArray(businessList?.groups) && businessList.groups.length > 0) {
    for (const group of businessList.groups) {
      const digest = group?.subject?.candidate_digest
      if (digest) observationCounts.set(digest, (observationCounts.get(digest) ?? 0) + Number(group.observation_count ?? 0))
    }
  } else {
    for (const observation of businessList?.observations ?? []) {
      const digest = observation?.subject?.candidate_digest
      if (digest) observationCounts.set(digest, (observationCounts.get(digest) ?? 0) + 1)
    }
  }
  const annotate = job => {
    const candidateDigest = job.jobBundleVerified ? jobCandidateDigest(job, job.evaluationContext) : undefined
    return {
      ...job,
      businessResults: {
        association: candidateDigest ? 'candidate-digest' : 'candidate-unavailable',
        observationCount: candidateDigest ? observationCounts.get(candidateDigest) ?? 0 : 0,
        causality: 'correlation-only',
      },
    }
  }
  const jobs = jobPage.items.map(annotate)
  const allJobs = (jobPage.allJobs ?? jobPage.items).map(annotate)
  const counts = allJobs.reduce((result, job) => ({ ...result, [job.status]: (result[job.status] ?? 0) + 1 }), {})
  const latestMetric = [...allJobs]
    .filter(job => job.primaryMetric)
    .sort((left, right) => Date.parse(right.updatedAt ?? 0) - Date.parse(left.updatedAt ?? 0) || left.name.localeCompare(right.name))[0]
    ?.primaryMetric
  const totalTrials = allJobs.reduce((total, job) => total + Number(job.nTrials ?? 0), 0)
  const totalExceptions = allJobs.reduce((total, job) => total + Math.max(
    Number(job.nExceptions ?? 0),
    Number(job.nInfrastructureExceptions ?? 0) + Number(job.nEvaluationExceptions ?? 0),
  ), 0)
  return {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    pluginVersion: metadata.pluginVersion ?? 'development',
    workspace: { id: config.workspaceId, label: config.workspaceLabel, root: config.workspaceRoot ?? '.', stackPath: config.stackPath },
    workspaces: metadata.workspaces ?? [],
    config: { projectRoot, projectRootSource: metadata.projectRootSource ?? 'configured', jobsDir: config.jobsDir, runtimePolicy: config.runtimePolicy ?? 'candidate-locked', agentImportPath: config.agentImportPath, pluginImportPath: config.pluginImportPath },
    checks: { projectRoot: projectRootCheck, jobsDir: jobsDirCheck, harbor: harborCheck, harborDsh: harborDshCheck, evaluationStack: stackCheck },
    overview: {
      totalJobs: allJobs.length,
      attention: jobPage.attentionCounts ?? attentionCounts(allJobs),
      visibleJobs: jobs.length,
      totalTrials,
      totalExceptions,
      completedJobs: (counts.completed ?? 0) + (counts.partial ?? 0) + (counts.attention ?? 0),
      activeJobs: (counts.pending ?? 0) + (counts.running ?? 0),
      failedJobs: counts.failed ?? 0,
      businessObservationCount: businessList?.pagination?.total ?? 0,
      businessObservationStatus: businessList ? 'available' : 'unavailable',
      latestMetric,
    },
    jobPagination: { offset: jobPage.offset, limit: jobPage.limit, total: jobPage.total, hasMore: jobPage.hasMore },
    jobs,
  }
}

const DETAIL_ARTIFACTS = {
  summary: 'evaluation-summary.json',
  candidate: 'candidate-manifest.json',
  dataset: 'dataset-manifest.json',
  datasetPreview: 'dataset-preview.json',
  stack: 'evaluation-stack-manifest.json',
  stackSources: 'evaluation-stack-sources.json',
  context: 'evaluation-context.json',
  contract: 'evaluation-contract.json',
  doctor: 'architecture-doctor.json',
  population: 'population-report.json',
  lifecycle: 'trial-lifecycle.json',
  registry: 'artifact-registry.json',
  diagnosis: 'diagnosis-report.json',
  optimization: 'optimization-report.json',
  promotion: 'promotion-report.json',
  completion: HISTORICAL_COMPLETION_NAME,
}

function schemaIssue(key, value) {
  if (value === undefined) return undefined
  if (value?.__readError) return value.__readError
  if (!isObject(value)) return 'artifact must be an object'
  const versions = {
    summary: [2, 3, 4], candidate: [1], dataset: [1], datasetPreview: [1], stack: [1], stackSources: [1], context: [1, 2, 3], contract: [1],
    doctor: [1], population: [1, 2, 3], lifecycle: [1], registry: [BRIDGE_CONTRACT.protocols.artifact_registry.schema_version], diagnosis: [1, 2], optimization: [1, 2, 3], promotion: [2], completion: [1],
  }[key]
  if (versions && !versions.includes(value.schema_version)) return `schema_version must be one of ${versions.join(', ')}`
  const required = {
    summary: ['job', 'metrics'], candidate: ['candidate_id', 'version', 'digest'], dataset: ['dataset_id', 'version', 'source_digest', 'tasks'], datasetPreview: ['dataset_id', 'version', 'source_digest', 'tasks'],
    stack: ['stack_id', 'version', 'digest', 'components', 'judge'], stackSources: ['stack_digest', 'components'], context: ['digest'], contract: ['contract_id', 'version', 'primary_metric', 'metrics'],
    doctor: ['promotion_ready', 'findings'], population: ['population_size', 'groups', 'metrics'], lifecycle: ['dataset_total', 'trials'],
    registry: ['artifacts'], diagnosis: ['diagnoses'], optimization: ['hypotheses'], promotion: ['decision', 'reasons', 'policy_digest'],
    completion: ['job_kind', 'status', 'valid', 'job', 'summary_path', 'artifact_registry_path', 'coverage'],
  }[key] ?? []
  const requiredFields = key === 'population' && value.schema_version === 3
    ? ['population_size', 'coverage', 'metrics']
    : required
  const missing = requiredFields.filter(field => value[field] === undefined)
  return missing.length ? `missing fields: ${missing.join(', ')}` : undefined
}

export async function readJobDetail(config, args) {
  const job = safeSegment(args.job, 'job')
  const directory = jobDirectory(config, job)
  const projectRoot = path.resolve(config.projectRoot)
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') throw new Error('Job not found')
  const values = await Promise.all(Object.values(DETAIL_ARTIFACTS).map(name => readJson(path.join(directory, name), { root: projectRoot })))
  const artifacts = Object.fromEntries(Object.keys(DETAIL_ARTIFACTS).map((key, index) => [key, values[index]]))
  if (artifacts.summary && !artifacts.summary.__readError) {
    const fullSummary = artifacts.summary
    const { trials: _trials, ...lightSummary } = fullSummary
    artifacts.summary = rememberAuthoritativeRevision(lightSummary, fullSummary)
  }
  const validation = Object.fromEntries(Object.entries(artifacts).map(([key, value]) => {
    const issue = schemaIssue(key, value)
    return [key, value === undefined ? { status: 'unavailable', reason: 'capability-not-produced' } : issue ? { status: 'invalid', error: issue } : { status: 'valid' }]
  }))
  validation.jobBundle = await verifyJobBundleSeal(directory, projectRoot)
  const context = artifacts.context ?? values[Object.keys(DETAIL_ARTIFACTS).indexOf('context')]
  const summary = values[Object.keys(DETAIL_ARTIFACTS).indexOf('summary')]
  const jobKind = normalizedJobKind(summary, context)
  if (
    jobKind === HISTORICAL_JOB_KIND
    && !historicalCompletionValid(summary, artifacts.completion, job)
  ) {
    validation.completion = {
      status: 'invalid',
      error: 'Historical completion sentinel is missing, stale, or inconsistent with the Summary',
    }
  }
  const capabilities = capabilityMap(
    summary, context, artifacts.lifecycle, artifacts.registry, artifacts.stack,
  )
  const evaluationTarget = summary?.evaluation_target ?? context?.evaluation_target
  const candidateDigest = validation.jobBundle.status === 'valid'
    ? jobCandidateDigest(summary, context, artifacts.candidate)
    : undefined
  const businessList = candidateDigest
    ? await safeBusinessObservationList(config, { candidateDigest })
    : undefined
  const businessResults = businessObservationProjection(businessList, candidateDigest)
  const report = buildEvaluationReport({
    job,
    summary: summary && !summary.__readError ? summary : {},
    context: context && !context.__readError ? context : {},
    contract: artifacts.contract && !artifacts.contract.__readError ? artifacts.contract : {},
    stack: artifacts.stack && !artifacts.stack.__readError ? artifacts.stack : {},
    diagnosis: artifacts.diagnosis && !artifacts.diagnosis.__readError ? artifacts.diagnosis : {},
    optimization: artifacts.optimization && !artifacts.optimization.__readError ? artifacts.optimization : {},
    validation,
    businessResults,
  })
  return {
    schemaVersion: 3,
    job,
    jobKind,
    evaluationTarget,
    generationSource: summary?.generation_source ?? context?.generation_source,
    generatorPopulation: evaluationTarget?.generator_population,
    executionMode: summary?.execution_mode ?? context?.execution_mode,
    coverage: coverageView(summary),
    evaluatorMetaEvaluation: evaluatorMetaEvaluation(summary, context),
    report,
    capabilities,
    artifacts,
    validation,
  }
}

/** Read the user-facing Evaluation Report derived from immutable Job artifacts. */
export async function readEvaluationReport(config, args) {
  const job = safeSegment(args.job, 'job')
  const directory = jobDirectory(config, job)
  const projectRoot = path.resolve(config.projectRoot)
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') throw new Error('Job not found')
  const [summary, context, contract, stack, diagnosis, optimization] = await Promise.all([
    readJson(path.join(directory, SUMMARY_NAME), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-context.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-contract.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-stack-manifest.json'), { root: projectRoot }),
    readJson(path.join(directory, 'diagnosis-report.json'), { root: projectRoot }),
    readJson(path.join(directory, 'optimization-report.json'), { root: projectRoot }),
  ])
  const bundleValidation = await verifyJobBundleSeal(directory, projectRoot)
  const candidateDigest = bundleValidation.status === 'valid' ? jobCandidateDigest(summary, context) : undefined
  const businessList = candidateDigest
    ? await safeBusinessObservationList(config, { candidateDigest })
    : undefined
  return buildEvaluationReport({
    job,
    summary: summary && !summary.__readError ? summary : {},
    context: context && !context.__readError ? context : {},
    contract: contract && !contract.__readError ? contract : {},
    stack: stack && !stack.__readError ? stack : {},
    diagnosis: diagnosis && !diagnosis.__readError ? diagnosis : {},
    optimization: optimization && !optimization.__readError ? optimization : {},
    validation: {
      summary: summary?.__readError
        ? { status: 'invalid', error: summary.__readError }
        : summary ? { status: 'valid' } : { status: 'unavailable' },
      jobBundle: bundleValidation,
    },
    businessResults: businessObservationProjection(businessList, candidateDigest),
  })
}

function selectedLifecycleTrials(lifecycle) {
  const selected = new Map()
  for (const trial of lifecycle?.trials ?? []) {
    const key = Number(trial.dataset_order ?? selected.size)
    if (!selected.has(key) || Number(trial.attempt ?? 1) > Number(selected.get(key).attempt ?? 1)) selected.set(key, trial)
  }
  return [...selected.values()].sort((left, right) => Number(left.dataset_order ?? 0) - Number(right.dataset_order ?? 0))
}

function normalizeTrial(trial, order) {
  const suppliedScore = isObject(trial.score)
  const score = suppliedScore
    ? trial.score
    : {
        value: null,
        valid: false,
        invalid_reasons: trial.exception ? ['infrastructure-error'] : ['score-unavailable'],
      }
  const datasetOrder = Number(trial.datasetOrder ?? trial.dataset_order ?? order)
  const status = trial.status ?? trial.phase ?? (trial.exception ? 'infrastructure-error' : 'completed')
  const executionId = trial.executionId ?? trial.execution_id ?? trial.id
  const assessmentId = trial.assessmentId
    ?? trial.assessment_id
    ?? trial.generationRecord?.record_id
    ?? trial.evaluation_target?.record_id
  const id = assessmentId ?? trial.id ?? trial.execution_id ?? `dataset-${datasetOrder}`
  const scored = suppliedScore && score.valid === true && typeof score.value === 'number'
  return {
    id,
    executionId,
    assessmentId: assessmentId ?? trial.id ?? trial.execution_id,
    name: trial.name ?? trial.trial_name ?? trial.dataset_trial ?? trial.trial,
    datasetTrial: trial.datasetTrial ?? trial.dataset_trial ?? trial.trial,
    datasetOrder,
    attempt: Number(trial.attempt ?? 1),
    status,
    scoringStatus: status === 'completed-unscored' ? 'unscored' : scored ? 'scored' : suppliedScore || trial.exception ? 'invalid' : 'unknown',
    terminal: trial.terminal ?? true,
    updatedAt: trial.updatedAt ?? trial.updated_at,
    score,
    rewards: trial.rewards ?? {},
    requirements: trial.requirements,
    population: trial.population ?? {},
    generationRecord: trial.generationRecord,
    evidenceAvailable: Boolean(trial.evidenceAvailable ?? trial.terminal),
    exception: trial.exception ? { type: trial.exception.type, classification: trial.exception.classification } : undefined,
  }
}

async function jobTrials(config, job) {
  const directory = jobDirectory(config, job)
  const projectRoot = path.resolve(config.projectRoot)
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') throw new Error('Job not found')
  const [summary, lifecycle] = await Promise.all([
    readJson(path.join(directory, SUMMARY_NAME), { root: projectRoot }),
    readJson(path.join(directory, 'trial-lifecycle.json'), { root: projectRoot }),
  ])
  if ((!summary || summary.__readError) && (!lifecycle || lifecycle.__readError)) throw new Error('Job progress is unavailable')
  const summaryTrials = (summary?.trials ?? []).map(normalizeTrial)
  if (!lifecycle?.trials) return { trials: summaryTrials, total: Number(summary?.n_trials ?? summaryTrials.length), lifecycle }
  const byExecution = new Map(summaryTrials.map(item => [String(item.executionId ?? item.id), item]))
  const byDataset = new Map(summaryTrials.map(item => [String(item.datasetTrial), item]))
  const trials = selectedLifecycleTrials(lifecycle).map((item, index) => {
    const evaluated = byExecution.get(String(item.execution_id)) ?? byDataset.get(String(item.dataset_trial))
    return normalizeTrial({ ...item, ...evaluated, dataset_order: item.dataset_order, attempt: item.attempt }, index)
  })
  return { trials, total: Number(lifecycle.dataset_total ?? summary?.n_trials ?? trials.length), lifecycle }
}

function datasetTaskAliases(task) {
  const values = [task?.id, task?.path, task?.metadata?.task_name]
  const aliases = new Set()
  for (const value of values) {
    const normalized = String(value ?? '').trim().replace(/^\/+|\/+$/g, '')
    if (!normalized || normalized === '.') continue
    aliases.add(normalized)
    aliases.add(normalized.split('/').at(-1))
  }
  return aliases
}

function taskDisplayName(task) {
  const direct = task?.query ?? task?.metadata?.query
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  if (typeof task?.instruction === 'string') {
    const lines = task.instruction.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    const labeled = lines.find(line => /^(?:query|question|问题|任务)\s*[:：]/i.test(line))
    const text = (labeled ?? lines[0] ?? '').replace(/^(?:query|question|问题|任务)\s*[:：]\s*/i, '')
    if (text) return text.length > 120 ? `${text.slice(0, 117)}…` : text
  }
  return String(task?.id ?? task?.path ?? '')
}

async function enrichTrialsWithDataset(config, job, trials) {
  let preview
  try { preview = await readDatasetPreview(config, { job }) } catch { return trials }
  const byAlias = new Map()
  for (const [datasetOrder, task] of (preview?.tasks ?? []).entries()) {
    for (const alias of datasetTaskAliases(task)) byAlias.set(alias, { task, datasetOrder })
  }
  return trials.map(trial => {
    const normalized = String(trial.datasetTrial ?? '').replace(/^\/+|\/+$/g, '')
    const matched = byAlias.get(normalized) ?? byAlias.get(normalized.split('/').at(-1))
    if (!matched) return { ...trial, displayName: trial.datasetTrial ?? trial.name }
    return {
      ...trial,
      displayName: taskDisplayName(matched.task) || trial.datasetTrial || trial.name,
      taskId: matched.task.id,
      datasetOrder: matched.datasetOrder,
    }
  })
}

export async function readTrialsPage(config, args) {
  const job = safeSegment(args.job, 'job')
  const offset = Math.max(0, Number.parseInt(args.offset ?? 0, 10) || 0)
  const limit = Math.min(MAX_TRIAL_LIMIT, Math.max(1, Number.parseInt(args.limit ?? 50, 10) || 50))
  const query = String(args.query ?? '').trim().toLowerCase()
  const status = String(args.status ?? '')
  const validity = String(args.validity ?? '')
  const evidence = String(args.evidence ?? '')
  const sort = String(args.sort ?? 'dataset-order')
  const source = await jobTrials(config, job)
  let trials = await enrichTrialsWithDataset(config, job, source.trials)
  // Internal fixed-set reads must not expand to the entire (possibly large) Job.
  if (Array.isArray(args.trialIds)) {
    const selectedIds = new Set(args.trialIds)
    trials = trials.filter(trial => [trial.id, trial.executionId, trial.assessmentId].some(id => selectedIds.has(id)))
  }
  if (query) trials = trials.filter(trial => `${trial.id ?? ''} ${trial.displayName ?? ''} ${trial.name ?? ''} ${trial.datasetTrial ?? ''}`.toLowerCase().includes(query))
  if (status) trials = trials.filter(trial => trial.status === status)
  if (validity) trials = trials.filter(trial => String(Boolean(trial.score?.valid)) === validity)
  if (evidence) trials = trials.filter(trial => String(Boolean(trial.evidenceAvailable)) === evidence)
  if (sort === 'dataset-order') trials = [...trials].sort((a, b) => a.datasetOrder - b.datasetOrder || a.attempt - b.attempt)
  if (sort === 'latest-completed') trials = [...trials].sort((a, b) => Date.parse(b.updatedAt ?? 0) - Date.parse(a.updatedAt ?? 0))
  if (sort === 'lowest-score') trials = [...trials].sort((a, b) => (a.score?.value ?? Number.POSITIVE_INFINITY) - (b.score?.value ?? Number.POSITIVE_INFINITY))
  if (sort === 'errors') trials = [...trials].sort((a, b) => Number(!b.exception && b.score?.valid !== false) - Number(!a.exception && a.score?.valid !== false))
  const items = trials.slice(offset, offset + limit)
  return {
    schemaVersion: 2, job, offset, limit, total: trials.length, datasetTotal: source.total,
    sort, items, hasMore: offset + items.length < trials.length, updatedAt: source.lifecycle?.updated_at,
  }
}

function assessmentName(id) {
  return `${String(id).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '') || 'trial'}.json`
}

function previewFromOutput(output, evidence = []) {
  if (typeof output === 'string' && output.trim()) return { kind: 'document', format: 'text', title: 'Agent output', content: output, provenance: evidence }
  if (!isObject(output)) return undefined
  if (typeof output.kind === 'string' && 'content' in output) return { ...output, provenance: evidence }
  const url = output.page_url ?? output.preview_url ?? output.url
  if (typeof url === 'string' && /^(https?:\/\/|\/)/.test(url)) return { kind: 'page', format: 'url', title: output.title ?? 'Generated page', url, content: output, provenance: evidence }
  if (typeof output.html === 'string') return { kind: 'page', format: 'html', title: output.title ?? 'Generated page', content: output.html, provenance: evidence }
  if (['answer', 'content', 'report', 'markdown', 'text'].some(key => typeof output[key] === 'string')) return { kind: 'document', format: 'json', title: output.title ?? 'Generated document', content: output, provenance: evidence }
  if ('metadata' in output && !['answer', 'content', 'report', 'markdown', 'text'].some(key => key in output)) return undefined
  return { kind: 'structured', format: 'json', title: output.title ?? 'Structured output', content: output, provenance: evidence }
}

async function previewFromTrialFiles(directory, lifecycle, projectRoot) {
  let trialName
  try { trialName = safeSegment(lifecycle?.name, 'trial directory') } catch { return undefined }
  const trialDirectory = path.join(directory, trialName)
  const check = await directoryCheck(trialDirectory, { root: projectRoot })
  if (check.status !== 'ok') return undefined
  const manifest = await readJson(path.join(trialDirectory, 'artifacts', 'manifest.json'), { maxBytes: MAX_PREVIEW_BYTES, maxText: 128_000, root: projectRoot })
  const candidates = []
  for (const entry of Array.isArray(manifest) ? manifest : []) {
    if (!isObject(entry) || !['ok', 'collected', 'mounted'].includes(entry.status) || typeof entry.destination !== 'string' || !entry.destination.startsWith('artifacts/')) continue
    const candidate = path.resolve(trialDirectory, entry.destination)
    const artifactRoot = path.resolve(trialDirectory, 'artifacts')
    if (candidate.startsWith(`${artifactRoot}${path.sep}`)) candidates.push(candidate)
  }
  const priority = new Map([['.html', 0], ['.htm', 0], ['.md', 1], ['.markdown', 1], ['.txt', 2], ['.json', 3]])
  candidates.sort((a, b) => (priority.get(path.extname(a).toLowerCase()) ?? 99) - (priority.get(path.extname(b).toLowerCase()) ?? 99) || a.localeCompare(b))
  for (const candidate of candidates) {
    try {
      const details = await safePathDetails(candidate, projectRoot)
      if (!details.isFile() || details.isSymbolicLink() || details.size > MAX_PREVIEW_BYTES) continue
      const format = path.extname(candidate).toLowerCase()
      const source = await readFile(candidate, 'utf8')
      const text = redactLocalPaths(redactSourceText(source))
      const content = format === '.json' ? redact(JSON.parse(text), 0, 128_000) : redact(text, 0, 128_000)
      const kind = ['.html', '.htm'].includes(format)
        ? 'page'
        : format === '.json' && !(isObject(content) && ['answer', 'content', 'report', 'markdown', 'text'].some(key => typeof content[key] === 'string'))
          ? 'structured'
          : 'document'
      return rememberAuthoritativeRevision(
        { kind, format: format.replace('.', '') || 'text', title: path.basename(candidate), content, artifact_ref: path.relative(trialDirectory, candidate), provenance: [{ label: 'Agent Artifact', kind: 'agent-artifact', artifact_ref: path.relative(trialDirectory, candidate) }] },
        rawContentRevision(source),
      )
    } catch { /* try the next declared artifact */ }
  }
  const trajectory = await readJson(path.join(trialDirectory, 'agent', 'trajectory.json'), { maxBytes: 2 * 1024 * 1024, maxText: 128_000, root: projectRoot })
  const messages = (trajectory?.steps ?? []).filter(step => step?.source === 'agent' && typeof step.message === 'string').map(step => step.message)
  return messages.length
    ? rememberAuthoritativeRevision(
        { kind: 'document', format: 'text', title: 'Agent final response', content: messages.at(-1), artifact_ref: 'agent/trajectory.json', provenance: [{ label: 'ACP Final Response', kind: 'acp-final-response', artifact_ref: 'agent/trajectory.json' }] },
        trajectory,
      )
    : undefined
}

async function datasetRoots(directory, projectRoot) {
  const entries = await readdir(directory, { withFileTypes: true })
  const roots = []
  for (const entry of entries.filter(item => item.isDirectory() && !item.isSymbolicLink()).sort((a, b) => a.name.localeCompare(b.name))) {
    const result = await readJson(path.join(directory, entry.name, 'result.json'), { root: projectRoot })
    const candidate = result?.task_id?.path
    if (typeof candidate !== 'string') continue
    try {
      const resolved = resolveWithin(projectRoot, path.relative(projectRoot, candidate), 'task path')
      const check = await directoryCheck(resolved, { root: projectRoot })
      if (check.status === 'ok') roots.push(resolved)
    } catch { /* ignore historical out-of-root task sources */ }
  }
  return [...new Set(roots)]
}

export async function readDatasetPreview(config, args) {
  const job = safeSegment(args.job, 'job')
  const directory = jobDirectory(config, job)
  const projectRoot = path.resolve(config.projectRoot)
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') throw new Error('Job not found')
  const snapshot = await readJson(path.join(directory, 'dataset-preview.json'), { maxBytes: MAX_JSON_BYTES, maxText: 128_000, root: projectRoot })
  if (snapshot && !snapshot.__readError) return rememberAuthoritativeRevision({ ...snapshot, source: 'job-snapshot' }, snapshot)
  const manifest = await readJson(path.join(directory, 'dataset-manifest.json'), { root: projectRoot })
  if (!manifest || manifest.__readError) throw new Error('Dataset Manifest is unavailable')
  const roots = await datasetRoots(directory, projectRoot)
  const tasks = []
  for (const [index, task] of (manifest.tasks ?? []).entries()) {
    const root = roots[Math.min(index, Math.max(0, roots.length - 1))]
    let instruction = { error: 'instruction source is unavailable for this historical Job' }
    if (root && typeof task?.instruction === 'string') {
      try { instruction = await readSafeText(resolveWithin(root, task.instruction, 'task.instruction'), projectRoot) } catch { instruction = { error: 'instruction path is invalid' } }
    }
    tasks.push({ id: task?.id ?? `task-${index + 1}`, path: task?.path ?? '.', instruction_file: task?.instruction, instruction: instruction.text, instruction_error: instruction.error, instruction_truncated: Boolean(instruction.text?.includes('[TRUNCATED')) })
  }
  return { schema_version: 1, dataset_id: manifest.dataset_id, version: manifest.version, source_digest: manifest.source_digest, task_count: tasks.length, tasks, source: 'historical-source-fallback' }
}

export async function readTrialDetail(config, args) {
  const job = safeSegment(args.job, 'job')
  const trial = safeSegment(args.trial, 'trial')
  const directory = jobDirectory(config, job)
  const projectRoot = path.resolve(config.projectRoot)
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') throw new Error('Job not found')
  let assessment = await readJson(path.join(directory, 'trial-assessments', assessmentName(trial)), { root: projectRoot })
  const source = await jobTrials(config, job)
  const lifecycle = source.trials.find(item => [item.id, item.executionId, item.assessmentId, item.datasetTrial, item.name].some(value => String(value) === trial))
  if (!assessment || assessment.__readError) {
    for (const candidate of [lifecycle?.assessmentId, lifecycle?.id, lifecycle?.executionId]) {
      if (!candidate || String(candidate) === trial) continue
      assessment = await readJson(path.join(directory, 'trial-assessments', assessmentName(candidate)), { root: projectRoot })
      if (assessment && !assessment.__readError) break
    }
  }
  if (assessment?.__readError) throw new Error('Trial assessment is invalid')
  if (!assessment && !lifecycle) throw new Error('Trial not found')
  const assessmentPreview = previewFromOutput(assessment?.output, assessment?.evidence_provenance)
  const realAssessmentOutput = assessment?.evidence_provenance?.some(item => item?.kind === 'real-renderer' || item?.kind === 'agent-artifact')
  const filePreview = realAssessmentOutput ? undefined : await previewFromTrialFiles(directory, lifecycle, projectRoot)
  const preview = realAssessmentOutput ? assessmentPreview : filePreview ?? assessmentPreview
  return {
    schemaVersion: 2, job, trial, lifecycle,
    status: lifecycle?.status ?? assessment?.status,
    assessment,
    preview,
    capability: assessment ? 'assessment-available' : 'running-evidence-not-yet-available',
  }
}

function historicalEvidenceSelection(record, evidenceRef) {
  if (evidenceRef === 'generation_record') return record
  if (!evidenceRef.startsWith('generation_record.')) return undefined
  const selector = evidenceRef.slice('generation_record.'.length)
  const segments = selector.split('/').filter(Boolean)
  if (
    segments.length === 0
    || segments.length > 20
    || segments.some(segment => !/^(?:[A-Za-z_][A-Za-z0-9_-]{0,127}|0|[1-9][0-9]{0,5})$/.test(segment))
  ) return undefined
  let selected = record
  for (const segment of segments) {
    if (Array.isArray(selected)) {
      const index = Number(segment)
      if (!Number.isSafeInteger(index) || index < 0 || index >= selected.length) return undefined
      selected = selected[index]
      continue
    }
    if (!isObject(selected) || !Object.hasOwn(selected, segment)) return undefined
    selected = selected[segment]
  }
  return selected
}

/**
 * Read the two immutable evidence containers produced by Historical Generation
 * evaluation. Criterion evidence refs are semantic selectors (for example,
 * generation_record.visible_transcript/1), not filesystem paths. Keep the
 * filesystem mapping here so neither the browser nor the Agent can choose an
 * arbitrary artifact path.
 */
export async function readHistoricalEvidence(config, args) {
  const job = safeSegment(args.job, 'job')
  const trial = safeSegment(args.trial, 'trial')
  const criterion = String(args.criterion ?? '')
  if (!criterion || criterion.length > 180 || /[\u0000-\u001f\u007f]/.test(criterion)) {
    return { available: false, reason: 'The requested Historical Generation Criterion is invalid.' }
  }
  const evidenceRef = String(args.evidenceRef ?? '')
  if (
    evidenceRef !== 'judge-gateway'
    && evidenceRef !== 'generation_record'
    && !/^generation_record\.[A-Za-z_][A-Za-z0-9_-]{0,127}(?:\/(?:[A-Za-z_][A-Za-z0-9_-]{0,127}|0|[1-9][0-9]{0,5})){0,19}$/.test(evidenceRef)
  ) return { available: false, reason: 'The requested ref is not a supported Historical Generation evidence selector.' }

  const projectRoot = path.resolve(config.projectRoot)
  const directory = jobDirectory(config, job)
  const source = await jobTrials(config, job)
  const lifecycle = source.trials.find(item => (
    [item.id, item.executionId, item.assessmentId, item.datasetTrial, item.name].some(value => String(value) === trial)
  ))
  if (!lifecycle) return { available: false, reason: 'The Historical Generation Trial is unavailable.' }
  let trialName
  try { trialName = safeSegment(lifecycle.name ?? lifecycle.id, 'trial directory') } catch {
    return { available: false, reason: 'The Historical Generation Trial directory is invalid.' }
  }
  const trialDirectory = path.join(directory, trialName)
  const trialCheck = await directoryCheck(trialDirectory, { root: projectRoot })
  if (trialCheck.status !== 'ok') return { available: false, reason: 'The Historical Generation Trial directory is unavailable.' }

  if (evidenceRef === 'judge-gateway') {
    const result = await readJson(path.join(trialDirectory, 'verifier', 'evaluation-result.json'), {
      maxBytes: 128_000,
      maxText: 32_000,
      root: projectRoot,
    })
    if (!result || result.__readError) return { available: false, reason: 'The frozen evaluator result is unavailable.' }
    const matches = (Array.isArray(result.criteria) ? result.criteria : [])
      .filter(item => isObject(item) && String(item.id) === criterion)
    if (matches.length !== 1) return { available: false, reason: 'The frozen evaluator result has no unique matching Criterion.' }
    return {
      available: true,
      content: matches[0],
      source: {
        id: 'evaluator-result-v2',
        kind: 'evaluator-result',
        artifactRef: 'verifier/evaluation-result.json',
        selector: `criteria[id=${criterion}]`,
      },
    }
  }

  const observationCandidates = [
    path.join(trialDirectory, 'artifacts', 'logs', 'artifacts', 'session-observation.json'),
    path.join(trialDirectory, 'artifacts', 'session-observation.json'),
  ]
  const observations = []
  for (const candidate of observationCandidates) {
    const value = await readJson(candidate, { maxBytes: MAX_PREVIEW_BYTES, maxText: 128_000, root: projectRoot })
    if (value && !value.__readError) {
      observations.push({ value, artifactRef: path.relative(trialDirectory, candidate) })
    }
  }
  if (observations.length === 0) return { available: false, reason: 'The frozen Session Observation is unavailable.' }
  if (observations.length > 1) return { available: false, reason: 'Multiple Session Observation containers are present; exact provenance is ambiguous.' }
  const [{ value: observation, artifactRef }] = observations
  const content = historicalEvidenceSelection(observation, evidenceRef)
  if (content === undefined) return { available: false, reason: 'The requested field is absent from the frozen Session Observation.' }
  return {
    available: true,
    content,
    source: {
      id: 'frozen-session-observation',
      kind: 'historical-generation-record',
      artifactRef,
      selector: evidenceRef,
    },
  }
}

export async function readJobProgress(config, args) {
  const job = safeSegment(args.job, 'job')
  const since = args.since ? Date.parse(args.since) : 0
  const source = await jobTrials(config, job)
  const changed = source.trials.filter(item => !since || Date.parse(item.updatedAt ?? 0) > since)
  return {
    schemaVersion: 1,
    job,
    updatedAt: source.lifecycle?.updated_at ?? new Date().toISOString(),
    datasetTotal: source.total,
    counts: source.lifecycle?.counts ?? {},
    changed,
  }
}

export async function readMetaEvaluation(config, args = {}) {
  const projectRoot = path.resolve(config.projectRoot)
  const evaluationRoot = resolveWithin(projectRoot, args.evaluationRoot ?? '.', 'evaluationRoot')
  const evaluationCheck = await directoryCheck(evaluationRoot, { root: projectRoot })
  if (evaluationCheck.status !== 'ok') throw new Error('Evaluation root is not a safe directory')
  const index = await readJson(path.join(evaluationRoot, '.harbor', 'meta-artifacts.json'), { root: projectRoot })
  const registered = index?.schema_version === 1 ? index.artifacts ?? {} : {}
  const groundTruthPath = resolveWithin(evaluationRoot, registered.ground_truth ?? '.harbor/ground-truth.json', 'groundTruthPath')
  const reportPath = resolveWithin(evaluationRoot, registered.meta_evaluation_report ?? '.harbor/meta-evaluation-report.json', 'metaEvaluationReportPath')
  const groundTruth = await readJson(groundTruthPath, { maxText: 64_000, root: projectRoot })
  const report = await readJson(reportPath, { maxText: 64_000, root: projectRoot })
  const availableGroundTruth = groundTruth && !groundTruth.__readError
  const availableReport = report && !report.__readError
  const cases = availableGroundTruth && Array.isArray(groundTruth.cases) ? groundTruth.cases : []
  const disagreementOffset = Math.max(0, Number.parseInt(args.offset ?? 0, 10) || 0)
  const disagreementLimit = Math.min(100, Math.max(1, Number.parseInt(args.limit ?? 20, 10) || 20))
  const disagreements = availableReport && Array.isArray(report.disagreements) ? report.disagreements : []
  const groundTruthDigest = availableGroundTruth
    ? canonicalDigest(groundTruth, 'harbor-dsh-ground-truth-v1')
    : null
  const expectedIdentity = args.currentEvaluationIdentity
  const identityParts = ['evaluator', 'rubric', 'judge', 'template']
  const identityMismatchReasons = expectedIdentity
    ? identityParts.flatMap(part => {
      if (!expectedIdentity[part]) return [`Current ${part} identity is unavailable.`]
      return JSON.stringify(report?.evaluation_identity?.[part] ?? null) === JSON.stringify(expectedIdentity[part])
        ? []
        : [`Current ${part} identity differs from this report.`]
    })
    : []
  const reportDigestValid = availableReport && report.digest === canonicalDigest(
    Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'digest')),
    'harbor-dsh-meta-evaluation-report-v1',
  )
  const reportStale = Boolean(availableReport && (
    report.ground_truth?.digest !== groundTruthDigest
    || !report.evaluation_identity?.digest
    || !reportDigestValid
    || identityMismatchReasons.length
  ))
  const pagedReport = availableReport ? {
    ...report,
    stale: reportStale,
    staleReasons: [
      ...(report.ground_truth?.digest !== groundTruthDigest ? ['Ground Truth changed after this report was generated.'] : []),
      ...(!report.evaluation_identity?.digest ? ['Exact Evaluator/Rubric/Judge/Template identity is missing.'] : []),
      ...(!reportDigestValid ? ['Meta-evaluation report digest is invalid.'] : []),
      ...identityMismatchReasons,
    ],
    disagreements: disagreements.slice(disagreementOffset, disagreementOffset + disagreementLimit),
  } : undefined
  return {
    schemaVersion: 1,
    evaluationRoot: path.relative(projectRoot, evaluationRoot) || '.',
    status: availableReport ? (reportStale ? 'stale-report' : 'evaluated') : availableGroundTruth ? (cases.length ? 'ground-truth-ready' : 'ground-truth-draft') : 'ground-truth-required',
    groundTruth: availableGroundTruth ? {
      id: groundTruth.ground_truth_id,
      version: groundTruth.version,
      source: groundTruth.source,
      criteria: groundTruth.criteria ?? [],
      caseCount: cases.length,
      badcaseCount: cases.filter(item => item?.badcase).length,
      path: path.relative(config.projectRoot, groundTruthPath),
    } : undefined,
    report: pagedReport,
    artifactIndex: index?.schema_version === 1 ? path.relative(config.projectRoot, path.join(evaluationRoot, '.harbor', 'meta-artifacts.json')) : undefined,
    disagreementPagination: {
      offset: disagreementOffset,
      limit: disagreementLimit,
      total: disagreements.length,
      hasMore: disagreementOffset + disagreementLimit < disagreements.length,
    },
    workflow: {
      candidate: 'Evaluator / Rubric / Judge identity',
      dataset: 'Fixed artifacts plus independent Ground Truth',
      output: 'Repeated evaluator-observations/v1',
      verifier: 'ESF / SCE / RCR reducer',
      automaticAgentBaseline: false,
      sourceKinds: ['human', 'programmatic', 'consensus', 'model', 'external'],
      nextAction: !availableGroundTruth
        ? 'Initialize Ground Truth with harbor_ground_truth_init, then add versioned cases.'
        : !cases.length
          ? 'Add cases with artifact_ref and ternary criterion labels before collecting observations.'
          : !availableReport
            ? 'Collect repeated evaluator observations and run harbor_evaluator_meta_evaluate.'
            : reportStale
              ? 'The Meta-evaluation report is stale; collect identity-bound observations and rerun harbor_evaluator_meta_evaluate.'
              : 'Review disagreements before adopting the evaluator and establishing a fresh Agent baseline.',
    },
  }
}

function comparisonTrials(summary, lifecycle) {
  const summaryTrials = (summary?.trials ?? []).map(normalizeTrial)
  if (!Array.isArray(lifecycle?.trials)) return summaryTrials
  const byExecution = new Map(summaryTrials.map(item => [String(item.id), item]))
  const byDataset = new Map(summaryTrials.map(item => [String(item.datasetTrial ?? item.name), item]))
  const matched = new Set()
  const current = selectedLifecycleTrials(lifecycle).map((item, index) => {
    const evaluated = byExecution.get(String(item.execution_id)) ?? byDataset.get(String(item.dataset_trial))
    if (evaluated) matched.add(evaluated)
    const lifecycleStatus = item.status ?? item.phase
    return normalizeTrial({
      ...evaluated,
      ...item,
      id: evaluated?.id ?? item.execution_id,
      name: evaluated?.name ?? item.trial_name ?? item.dataset_trial,
      datasetTrial: evaluated?.datasetTrial ?? item.dataset_trial,
      status: lifecycleStatus ?? evaluated?.status,
      score: item.score ?? evaluated?.score,
      rewards: evaluated?.rewards ?? {},
      exception: lifecycleStatus === 'infrastructure-error' ? evaluated?.exception : undefined,
      terminal: item.terminal,
    }, index)
  })
  return [...current, ...summaryTrials.filter(item => !matched.has(item))]
}

function compareTrialGroups(summary, lifecycle) {
  const groups = new Map()
  for (const item of comparisonTrials(summary, lifecycle)) {
    const key = String(item.datasetTrial ?? item.name ?? item.id)
    const current = groups.get(key) ?? []
    current.push(item)
    groups.set(key, current)
  }
  return groups
}

function compareTrialMaps(summary, lifecycle) {
  return new Map([...compareTrialGroups(summary, lifecycle)].map(([key, items]) => [key, items.at(-1)]))
}

function validComparisonValues(items) {
  return items.flatMap(item => {
    if (item.score?.valid !== true) return []
    const value = item.score.value ?? item.rewards?.reward
    return Number.isFinite(value) ? [value] : []
  })
}

function descriptiveStatistics(values) {
  if (!values.length) return { n: 0, mean: null, variance: null, standardDeviation: null, range: null }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.length < 2
    ? null
    : values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / (values.length - 1)
  return {
    n: values.length,
    mean: average,
    variance,
    standardDeviation: variance === null ? null : Math.sqrt(variance),
    range: values.length < 2 ? null : Math.max(...values) - Math.min(...values),
  }
}

function repeatabilityReport(baselineGroups, candidateGroups, repeatPolicy) {
  const expected = Math.max(Number(repeatPolicy?.baseline?.repeats ?? 1), Number(repeatPolicy?.candidate?.repeats ?? 1))
  const taskIds = [...new Set([...baselineGroups.keys(), ...candidateGroups.keys()])].sort()
  const tasks = taskIds.map(trial => {
    const baselineValues = validComparisonValues(baselineGroups.get(trial) ?? [])
    const candidateValues = validComparisonValues(candidateGroups.get(trial) ?? [])
    const paired = Array.from({ length: Math.min(baselineValues.length, candidateValues.length) }, (_, index) => candidateValues[index] - baselineValues[index])
    return {
      trial,
      baseline: descriptiveStatistics(baselineValues),
      candidate: descriptiveStatistics(candidateValues),
      paired_attempts: descriptiveStatistics(paired),
      complete: baselineValues.length >= expected && candidateValues.length >= expected,
    }
  })
  const repeated = expected > 1
  return {
    expected_repeats: expected,
    status: repeated ? (tasks.length > 0 && tasks.every(item => item.complete) ? 'complete' : 'partial') : 'single-attempt',
    baseline: descriptiveStatistics(tasks.flatMap(item => validComparisonValues(baselineGroups.get(item.trial) ?? []))),
    candidate: descriptiveStatistics(tasks.flatMap(item => validComparisonValues(candidateGroups.get(item.trial) ?? []))),
    tasks,
  }
}

function isInvalidComparisonTrial(trial) {
  return trial?.terminal !== false
    && trial?.score?.valid === false
    && !['completed-unscored', 'cancelled'].includes(trial?.status)
}

function isInfrastructureComparisonTrial(trial) {
  return trial?.terminal !== false && (
    trial?.status === 'infrastructure-error'
    || trial?.exception?.classification === 'infrastructure'
  )
}

function pairedUncertainty(pairs) {
  const deltas = pairs.map(item => item.improvement).filter(Number.isFinite)
  if (!deltas.length) return { method: 'paired-task-normal-approximation', n: 0, meanImprovement: null, standardError: null, confidence95: null, status: 'insufficient-pairs' }
  const meanDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length
  if (deltas.length < 2) return { method: 'paired-task-normal-approximation', n: 1, meanImprovement: meanDelta, standardError: null, confidence95: null, status: 'insufficient-pairs' }
  const variance = deltas.reduce((sum, value) => sum + ((value - meanDelta) ** 2), 0) / (deltas.length - 1)
  const standardError = Math.sqrt(variance / deltas.length)
  return {
    method: 'paired-task-normal-approximation',
    n: deltas.length,
    meanImprovement: meanDelta,
    standardError,
    confidence95: { low: meanDelta - 1.96 * standardError, high: meanDelta + 1.96 * standardError },
    status: 'estimated',
  }
}

export async function readComparison(config, args) {
  const baselineJob = safeSegment(args.baseline, 'baseline')
  const candidateJob = safeSegment(args.candidate, 'candidate')
  const projectRoot = path.resolve(config.projectRoot)
  const [baselineDirectoryCheck, candidateDirectoryCheck] = await Promise.all([
    directoryCheck(jobDirectory(config, baselineJob), { root: projectRoot }),
    directoryCheck(jobDirectory(config, candidateJob), { root: projectRoot }),
  ])
  if (baselineDirectoryCheck.status !== 'ok' || candidateDirectoryCheck.status !== 'ok') {
    throw new Error('Both Job directories must be safe')
  }
  const [baseline, candidate, baselineContract, candidateContract, baselineLifecycle, candidateLifecycle, baselineSpec, candidateSpec, baselineBundle, candidateBundle] = await Promise.all([
    readJson(path.join(jobDirectory(config, baselineJob), SUMMARY_NAME), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, candidateJob), SUMMARY_NAME), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, baselineJob), 'evaluation-contract.json'), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, candidateJob), 'evaluation-contract.json'), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, baselineJob), 'trial-lifecycle.json'), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, candidateJob), 'trial-lifecycle.json'), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, baselineJob), 'evaluation-spec.json'), { root: projectRoot }),
    readJson(path.join(jobDirectory(config, candidateJob), 'evaluation-spec.json'), { root: projectRoot }),
    verifyJobBundleSeal(jobDirectory(config, baselineJob), projectRoot),
    verifyJobBundleSeal(jobDirectory(config, candidateJob), projectRoot),
  ])
  if (!baseline || baseline.__readError || !candidate || candidate.__readError) throw new Error('Both Job summaries are required')
  const baselineContext = baseline.evaluation_context ?? await readJson(path.join(jobDirectory(config, baselineJob), 'evaluation-context.json'), { root: projectRoot })
  const candidateContext = candidate.evaluation_context ?? await readJson(path.join(jobDirectory(config, candidateJob), 'evaluation-context.json'), { root: projectRoot })
  const baselineKind = normalizedJobKind(baseline, baselineContext)
  const candidateKind = normalizedJobKind(candidate, candidateContext)
  if (baselineKind !== CANDIDATE_JOB_KIND || candidateKind !== CANDIDATE_JOB_KIND) {
    const error = {
      code: 'UNSUPPORTED_JOB_KIND_FOR_PROMOTION',
      message: 'Historical Generation Evaluation Jobs are diagnostic evidence and cannot be used as a Candidate baseline, comparison, or Promotion Gate input.',
    }
    return rememberAuthoritativeRevision({
      schemaVersion: 1,
      baselineJob,
      candidateJob,
      baselineJobKind: baselineKind,
      candidateJobKind: candidateKind,
      comparable: false,
      comparabilityReasons: [error],
      metrics: {},
      population: {},
      improvedTrials: [],
      regressedTrials: [],
      invalidTrials: [],
      newInfrastructureExceptions: [],
      newExceptions: [],
      artifactRegressions: [],
      gateEligibility: 'not-applicable',
      error,
      note: 'Convert reviewed badcases into a fixed regression Dataset before running Candidate comparison or Gate.',
    }, baseline, candidate, baselineContract, candidateContract, baselineLifecycle, candidateLifecycle, baselineContext, candidateContext)
  }
  const reasons = []
  const baselineTrust = buildEvaluationReport({ job: baselineJob, summary: baseline, context: baselineContext, contract: baselineContract, validation: { jobBundle: baselineBundle } }).quality.score_trusted === true
  const candidateTrust = buildEvaluationReport({ job: candidateJob, summary: candidate, context: candidateContext, contract: candidateContract, validation: { jobBundle: candidateBundle } }).quality.score_trusted === true
  if (!baselineTrust || !candidateTrust) reasons.push('Both Jobs require verified seals, successful exact Evaluator execution, valid artifacts, and complete required Trial coverage')
  if (baselineContext?.schema_version !== 3 || candidateContext?.schema_version !== 3) reasons.push('Context v3 is required')
  if (!baselineContext?.digest || baselineContext.digest !== candidateContext?.digest) reasons.push('Evaluation Context differs; establish a fresh baseline')
  if (baselineContract?.contract_id !== candidateContract?.contract_id || baselineContract?.version !== candidateContract?.version) reasons.push('Evaluation Contract identity differs')
  if (baselineSpec?.protocol !== 'evaluation-spec/v1' || candidateSpec?.protocol !== 'evaluation-spec/v1') {
    reasons.push('Evaluation Spec v1 is required for formal comparison')
  } else if (baselineSpec.measurement_digest !== candidateSpec.measurement_digest) {
    reasons.push('Evaluation Spec measurement identity differs; establish a fresh baseline')
  }
  const directions = Object.fromEntries((candidateContract?.metrics ?? []).map(item => [item.id, item.direction ?? 'maximize']))
  const metrics = !baselineTrust || !candidateTrust ? {} : Object.fromEntries([...new Set([...Object.keys(baseline.metrics ?? {}), ...Object.keys(candidate.metrics ?? {})])].map(key => [key, {
    baseline: baseline.metrics?.[key], candidate: candidate.metrics?.[key],
    delta: typeof baseline.metrics?.[key] === 'number' && typeof candidate.metrics?.[key] === 'number' ? candidate.metrics[key] - baseline.metrics[key] : undefined,
    direction: directions[key] ?? 'maximize',
    improvement: typeof baseline.metrics?.[key] === 'number' && typeof candidate.metrics?.[key] === 'number'
      ? (directions[key] === 'minimize' ? baseline.metrics[key] - candidate.metrics[key] : candidate.metrics[key] - baseline.metrics[key])
      : undefined,
  }]))
  const baselineGroups = baselineTrust ? compareTrialGroups(baseline, null) : new Map()
  const candidateGroups = candidateTrust ? compareTrialGroups(candidate, null) : new Map()
  const oldTrials = baselineTrust ? compareTrialMaps(baseline, null) : new Map()
  const nextTrials = candidateTrust ? compareTrialMaps(candidate, null) : new Map()
  const improved = []
  const regressed = []
  const tied = []
  const pairedTrials = []
  const primaryDirection = directions[candidateContract?.primary_metric] ?? 'maximize'
  for (const trial of [...baselineGroups.keys()].filter(key => candidateGroups.has(key)).sort()) {
    const baselineValues = validComparisonValues(baselineGroups.get(trial))
    const candidateValues = validComparisonValues(candidateGroups.get(trial))
    if (!baselineValues.length || !candidateValues.length) continue
    const oldValue = descriptiveStatistics(baselineValues).mean
    const newValue = descriptiveStatistics(candidateValues).mean
    const delta = newValue - oldValue
    const item = {
      trial, baseline: oldValue, candidate: newValue, delta,
      baselineAttempts: baselineValues.length, candidateAttempts: candidateValues.length,
      improvement: primaryDirection === 'minimize' ? -delta : delta,
    }
    pairedTrials.push(item)
    if (oldValue === newValue) tied.push(item)
    else (item.improvement > 0 ? improved : regressed).push(item)
  }
  const invalidTrials = [...nextTrials.entries()]
    .filter(([, trial]) => isInvalidComparisonTrial(trial))
    .map(([trial, candidateTrial]) => ({
      trial,
      status: candidateTrial.status,
      invalidReasons: Array.isArray(candidateTrial.score?.invalid_reasons)
        ? candidateTrial.score.invalid_reasons.slice(0, 20).map(String)
        : [],
      baselineValid: oldTrials.get(trial)?.score?.valid,
      candidateValid: false,
    }))
  const newInfrastructureExceptions = [...nextTrials.entries()]
    .filter(([trial, candidateTrial]) => (
      isInfrastructureComparisonTrial(candidateTrial)
      && !isInfrastructureComparisonTrial(oldTrials.get(trial))
    ))
    .map(([trial, candidateTrial]) => ({
      trial,
      baselineStatus: oldTrials.get(trial)?.status,
      candidateStatus: candidateTrial.status,
      ...(candidateTrial.exception ? { exception: candidateTrial.exception } : {}),
    }))
  const baselineExceptions = new Set((baseline.exceptions ?? []).map(item => String(item.trial)))
  const newExceptions = (candidate.exceptions ?? []).filter(item => !baselineExceptions.has(String(item.trial)))
  const artifactRegressions = (baseline.artifact_validation?.valid && !candidate.artifact_validation?.valid) ? ['artifact-validation'] : []
  const repeatPolicy = {
    baseline: baselineSpec?.repeat_policy ?? null,
    candidate: candidateSpec?.repeat_policy ?? null,
  }
  return rememberAuthoritativeRevision({
    schemaVersion: 1, baselineJob, candidateJob, comparable: reasons.length === 0, comparabilityReasons: reasons,
    metrics, population: { baseline: baseline.n_trials, candidate: candidate.n_trials, baselineValid: baseline.n_valid_scores, candidateValid: candidate.n_valid_scores },
    improvedTrials: improved, regressedTrials: regressed, tiedTrials: tied, pairedTrials,
    uncertainty: pairedUncertainty(pairedTrials),
    repeatPolicy,
    repeatability: repeatabilityReport(baselineGroups, candidateGroups, repeatPolicy),
    measurementIdentity: {
      baseline: baselineSpec?.measurement_digest ?? null,
      candidate: candidateSpec?.measurement_digest ?? null,
      match: Boolean(baselineSpec?.measurement_digest && baselineSpec.measurement_digest === candidateSpec?.measurement_digest),
    },
    invalidTrials, newInfrastructureExceptions, newExceptions, artifactRegressions,
    gateEligibility: reasons.length ? 'not-comparable' : 'requires-explicit-gate',
    note: 'This read-only comparison never runs Gate, promotes a Candidate, deploys, or publishes.',
  }, baseline, candidate, baselineContract, candidateContract, baselineLifecycle, candidateLifecycle, baselineContext, candidateContext)
}

export async function readEvaluatorGovernance(config, args) {
  const job = safeSegment(args.job, 'job')
  const directory = jobDirectory(config, job)
  const projectRoot = path.resolve(config.projectRoot)
  const check = await directoryCheck(directory, { root: projectRoot })
  if (check.status !== 'ok') throw new Error('Job not found')
  const [stack, sources, contract, context, summary] = await Promise.all([
    readJson(path.join(directory, 'evaluation-stack-manifest.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-stack-sources.json'), { maxText: MAX_SOURCE_BYTES, root: projectRoot }),
    readJson(path.join(directory, 'evaluation-contract.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-context.json'), { root: projectRoot }),
    readJson(path.join(directory, 'evaluation-summary.json'), { root: projectRoot }),
  ])
  if (!stack || stack.__readError) throw new Error('Evaluation Stack is unavailable')
  const effective = buildEvaluationReport({
    job,
    summary: summary && !summary.__readError ? summary : {},
    stack,
    context: context && !context.__readError ? context : {},
    contract: contract && !contract.__readError ? contract : {},
  }).effective_evaluator
  const historicalSources = sources?.schema_version === 1 && sources.stack_digest === stack.digest
    ? sources
    : undefined
  const components = {}
  for (const [role, component] of Object.entries(stack.components ?? {})) {
    const entry = component?.entry
    const snapshot = historicalSources?.components?.[role]
    // The descriptor is identity/configuration, not the editable prompt. Prefer
    // an authorized historical prompt/implementation without reading live text.
    const editable = role === 'evaluator' ? component?.interface?.editable_files ?? [] : []
    const preferred = editable.find(item => item.role === 'prompt') ?? editable.find(item => item.role === 'implementation')
    const snapshotFile = snapshot?.files?.find(item => item.path === preferred?.path && item.text)
      ?? snapshot?.files?.find(item => item.path === entry && item.text)
      ?? snapshot?.files?.find(item => item.text)
    const source = snapshotFile
      ? { ...snapshotFile, source: 'job-snapshot', readOnly: true }
      : entry
        ? { ...(await readSafeText(resolveWithin(projectRoot, entry, `${role}.entry`), projectRoot)), source: 'historical-live-fallback', readOnly: true }
        : { error: 'entry unavailable', source: 'unavailable', readOnly: true }
    components[role] = { ...component, source }
  }
  let comparison
  if (args.compareJob) {
    const compareDirectory = jobDirectory(config, safeSegment(args.compareJob, 'compareJob'))
    const compareCheck = await directoryCheck(compareDirectory, { root: projectRoot })
    if (compareCheck.status !== 'ok') throw new Error('Comparison Job not found')
    const other = await readJson(path.join(compareDirectory, 'evaluation-stack-manifest.json'), { root: projectRoot })
    const changes = []
    for (const role of new Set([...Object.keys(stack.components ?? {}), ...Object.keys(other?.components ?? {})])) {
      const before = other?.components?.[role]
      const after = stack.components?.[role]
      if (before?.digest !== after?.digest || before?.version !== after?.version) changes.push({ role, before, after, rewardAffecting: Boolean(before?.reward_affecting || after?.reward_affecting) })
    }
    comparison = {
      changes,
      freshBaselineRequired: changes.some(item => item.rewardAffecting) || JSON.stringify(other?.judge) !== JSON.stringify(stack.judge),
      createsNewIdentity: true,
      overwritesHistoricalIdentity: false,
    }
  }
  return {
    schemaVersion: 1, job, stackIdentity: { id: stack.stack_id, version: stack.version, digest: stack.digest, comparisonDigest: stack.comparison_digest },
    judge: stack.judge, contract, contextDigest: context?.digest, effectiveEvaluator: effective, components, comparison,
    editingPolicy: {
      browserWriteEnabled: false,
      saveBehavior: 'Create a new Stack/component identity in source control, then run a fresh baseline when reward-affecting semantics change.',
      automaticEvaluation: false, automaticGate: false,
    },
    upgradeWorkflow: {
      steps: [
        'Inspect the current Evaluator, Rubric, Judge, Contract, and representative false-positive/false-negative Trials.',
        'Create a new Evaluator/Rubric/Judge identity and source file; never overwrite the historical identity.',
        'Run meta-evaluation against independently maintained, provenance-bearing GT and report ESF, SCE, RCR, latency, and cost as applicable.',
        'Update Evaluation Stack identity and preview Context v3 impact.',
        'Establish a fresh Agent baseline before comparing Agent Candidates under the new reward semantics.',
      ],
      freshBaselineRequiredWhen: ['evaluator digest changes', 'rubric digest changes', 'judge identity or parameters change'],
      automaticActions: [],
      skillPrompt: 'Use evolve-agent-with-harbor to upgrade this evaluator. First inspect governance evidence, clarify GT source type, provenance, ownership, and target meta-metrics, then propose a new immutable evaluator identity and fresh-baseline plan. Do not edit or run anything until I approve the controlled change.',
    },
  }
}
