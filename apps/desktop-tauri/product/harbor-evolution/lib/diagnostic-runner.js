import { lstat, open, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { runBoundedProcess } from './bounded-process.js'
import { buildEvaluationRunReceipt, redactDiagnostic, resolveWithin } from './evolution.js'
import { inspectDiagnostic, observeDiagnostic, pinDiagnosticEnvironment, readDiagnosticRuntimeIdentity } from './diagnostic-observation.js'

export const DIAGNOSTIC_LIMITS = Object.freeze({ maxTrials: 12, concurrency: 2, attempts: 1, maxRetries: 0, wallTimeoutMs: 900_000, maxModelRequests: 96, maxResponseBytes: 1_048_576 })
const AGENT = 'harbor_dsh_evolution.agent:DshCandidateAgent'
const PLUGIN = 'harbor_dsh_evolution.diagnostic_plugin:BoundedDiagnosticPlugin'
const PLAN_PROTOCOL = 'harbor-bounded-diagnostic-plan/v1'
const OPERATION_ID = /^hop_[A-Za-z0-9_-]{1,100}$/

function failure(code, message) { return Object.assign(new Error(`${code}: ${message}`), { code }) }
function aborted(signal) { if (signal?.aborted) throw failure('HARBOR_PROCESS_ABORTED', 'Diagnostic cancelled before launch.') }
function bindingIdentity(binding) {
  return Object.fromEntries(['provider', 'model', 'transport', 'protocol', 'reasoning_effort'].filter(key => binding?.[key] !== undefined).map(key => [key, binding[key]]))
}
function hasLockedRuntime(runtime) {
  const safeSourcePath = value => typeof value === 'string' && value.length <= 1024 && value.trim() === value && !/[\\:\x00-\x1f\x7f]/.test(value) && !value.split('/').some(part => ['', '.', '..', 'node_modules', '.harbor-runtime', '.git'].includes(part))
  return runtime?.kind === 'deepseek-harness' && runtime.policy === 'candidate-locked' && runtime.transport === 'acp'
    && runtime.descriptor === 'candidate-runtime.json' && runtime.lockfile === 'package-lock.json'
    && safeSourcePath(runtime.entrypoint) && /\.(?:js|mjs|cjs)$/.test(runtime.entrypoint)
    && safeSourcePath(runtime.config_path) && typeof runtime.agent_entry_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runtime.agent_entry_id)
    && typeof runtime.node_version === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(runtime.node_version) && Number(runtime.node_version.split('.')[0]) >= 22
    && ['descriptor_digest', 'entrypoint_digest', 'lockfile_digest'].every(key => /^sha256:[a-f0-9]{64}$/.test(runtime[key] ?? ''))
}
function assertPlan(plan) {
  if (plan?.protocol !== PLAN_PROTOCOL || !/^sha256:[a-f0-9]{64}$/.test(plan.planDigest ?? '') || plan.mode !== 'diagnostic' || plan.promotionEligible !== false || !Array.isArray(plan.selection) || !plan.selection.length || plan.selection.length > DIAGNOSTIC_LIMITS.maxTrials || Object.entries(DIAGNOSTIC_LIMITS).some(([key, value]) => plan.limits?.[key] !== value)) {
    throw failure('HARBOR_DIAGNOSTIC_PLAN_INVALID', 'The installed adapter did not produce the bounded diagnostic contract.')
  }
  if (!hasLockedRuntime(plan.identities?.candidate?.runtime)) {
    throw failure('HARBOR_DIAGNOSTIC_RUNTIME_ADAPTER_UNSUPPORTED', 'Update the Python Adapter and review a new plan; it has not verified a locked Candidate-owned ACP runtime. No Job was started.')
  }
}
function safeProcessError(error) {
  const code = /^HARBOR_[A-Z_]+$/.test(error?.code ?? '') ? error.code : 'HARBOR_DIAGNOSTIC_EXECUTION_FAILED'
  return failure(code, redactDiagnostic(error?.message ?? 'Diagnostic execution failed.').slice(0, 600))
}

async function safeJsonArtifact(root, file, maxBytes = 4 * 1024 * 1024) {
  const target = resolveWithin(root, file, 'diagnostic artifact')
  const relative = path.relative(root, target)
  let cursor = root
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part)
    if ((await lstat(cursor)).isSymbolicLink()) throw failure('HARBOR_DIAGNOSTIC_ARTIFACT_INVALID', 'Diagnostic artifacts must not traverse symlinks.')
  }
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stats = await handle.stat()
    if (!stats.isFile() || stats.size > maxBytes) throw failure('HARBOR_DIAGNOSTIC_ARTIFACT_INVALID', 'Diagnostic artifacts exceeded the bounded regular-file contract.')
    return JSON.parse(await handle.readFile('utf8'))
  } finally { await handle.close() }
}

/** Fixed CLI adapter. Authorization, idempotency and persistent Operation state belong to the Host controller. */
export class DiagnosticRunner {
  constructor(config, modelRuntime, { runProcess = runBoundedProcess, platform = process.platform, processProbe } = {}) {
    this.config = config
    this.modelRuntime = modelRuntime
    this.runProcess = runProcess
    this.platform = platform
    this.processProbe = processProbe
  }

  async observe(operation, { owner } = {}) {
    return observeDiagnostic(this.config, operation, { root: await this._root(owner) })
  }

  async inspect(operation, { owner } = {}) {
    return inspectDiagnostic(this.config, operation, { root: await this._root(owner), runProcess: this.runProcess, processProbe: this.processProbe, platform: this.platform })
  }

  async _root(owner) {
    if (!owner?.sessionId || !owner.projectRoot) throw failure('HARBOR_DIAGNOSTIC_OWNER_REQUIRED', 'A current Session project is required.')
    const root = await realpath(owner.projectRoot)
    if (root !== await realpath(this.config.projectRoot)) throw failure('HARBOR_DIAGNOSTIC_SOURCE_DENIED', 'The diagnostic runner belongs to a different project.')
    if (this.platform === 'win32') throw failure('HARBOR_DIAGNOSTIC_RUNTIME_UNSUPPORTED', 'This runner requires POSIX process-group cancellation; Windows execution is not enabled.')
    return root
  }

  _environment() { return { ...process.env, HARBOR_TELEMETRY: '0', ...(this.config.pythonPath ? { PYTHONPATH: this.config.pythonPath } : {}) } }

  async _json(args, root, { input, signal, timeoutMs = 30_000 } = {}) {
    let result
    try {
      result = await this.runProcess(this.config.harborDshBin, args, { cwd: root, env: this._environment(), timeoutMs, signal, allowedExitCodes: [0, 2], maxOutputBytes: 4 * 1024 * 1024, ...(input ? { input: JSON.stringify(input) } : {}) })
    } catch (error) { throw safeProcessError(error) }
    let value
    try { value = JSON.parse(result.stdout) } catch { throw failure('HARBOR_DIAGNOSTIC_ADAPTER_UNAVAILABLE', 'Update the Python Adapter; its bounded diagnostic response is missing or invalid.') }
    if (value?.error) {
      const message = redactDiagnostic(value.error).slice(0, 600)
      throw failure(message.match(/^(HARBOR_[A-Z_]+):/)?.[1] ?? 'HARBOR_DIAGNOSTIC_SOURCE_INVALID', message)
    }
    return value
  }

  async _binding(plan) {
    if (!this.modelRuntime?.resolve || !this.modelRuntime?.openLease) throw failure('HARBOR_DIAGNOSTIC_MODEL_UNAVAILABLE', 'The Host model broker is not connected.')
    const pinned = plan.candidateModelBinding
    const binding = await this.modelRuntime.resolve({}, pinned, { ignoreConfigured: true })
    if (JSON.stringify(bindingIdentity(binding)) !== JSON.stringify(bindingIdentity(pinned))) throw failure('HARBOR_DIAGNOSTIC_MODEL_CHANGED', 'The recorded Candidate model cannot be resolved exactly.')
    return binding
  }

  async prepare({ owner, sourceJobDir, trialIds, signal }) {
    const root = await this._root(owner)
    const source = resolveWithin(root, sourceJobDir, 'source Job')
    const plan = await this._json(['diagnostic-subset', 'plan'], root, { input: { projectRoot: root, sourceJobDir: source, trialIds }, signal })
    assertPlan(plan)
    const binding = await this._binding(plan)
    if (typeof this.modelRuntime.assertLeaseLimits !== 'function') throw failure('HARBOR_DIAGNOSTIC_MODEL_LIMIT_UNSUPPORTED', 'The Host broker cannot prove the requested model budget; update the runtime before running.')
    const budget = await this.modelRuntime.assertLeaseLimits(binding, { maxRequests: DIAGNOSTIC_LIMITS.maxModelRequests, maxResponseBytes: DIAGNOSTIC_LIMITS.maxResponseBytes })
    if (!Number.isSafeInteger(budget?.maxRequests) || budget.maxRequests < 1 || budget.maxRequests > DIAGNOSTIC_LIMITS.maxModelRequests || !Number.isSafeInteger(budget?.maxResponseBytes) || budget.maxResponseBytes < 1 || budget.maxResponseBytes > DIAGNOSTIC_LIMITS.maxResponseBytes) throw failure('HARBOR_DIAGNOSTIC_MODEL_LIMIT_UNSUPPORTED', 'The Host broker returned an invalid effective budget.')
    const runtime = await this._json(['docker-check'], root, { signal })
    if (runtime?.valid !== true) {
      const codes = (runtime?.findings ?? []).filter(item => item.level === 'error').map(item => String(item.code)).filter(code => /^DOCKER_[A-Z_]+$/.test(code))
      throw failure('HARBOR_DIAGNOSTIC_RUNTIME_BLOCKED', `Docker is not ready (${codes.join(', ') || 'DOCKER_UNAVAILABLE'}). Fix the runtime and check parameters again; no Job was started.`)
    }
    // This is a read-only capability check. Unsupported remote/TLS transports
    // must be visible in preflight, not discovered after user confirmation.
    await pinDiagnosticEnvironment(this.runProcess, this._environment())
    try {
      const version = await this.runProcess(this.config.harborBin, ['--version'], { cwd: root, env: this._environment(), timeoutMs: 10_000, signal, maxOutputBytes: 4096 })
      if (!/\b0\.21\.\d+(?:\b|[-+])/.test(version.stdout)) throw failure('HARBOR_DIAGNOSTIC_RUNTIME_UNSUPPORTED', 'The bounded runner requires the installed Harbor 0.21 adapter contract.')
    } catch (error) { throw safeProcessError(error) }
    return { ...plan, effectiveLimits: { ...plan.limits, maxModelRequests: budget.maxRequests, maxResponseBytes: budget.maxResponseBytes } }
  }

  async execute(plan, { owner, operationId, signal, onSpawn, onUsage } = {}) {
    if (!OPERATION_ID.test(operationId ?? '')) throw failure('HARBOR_DIAGNOSTIC_OPERATION_INVALID', 'A stable Host Operation ID is required.')
    assertPlan(plan)
    aborted(signal)
    const root = await this._root(owner)
    const trialIds = plan.selection.map(item => item.trialId)
    const fresh = await this.prepare({ owner, sourceJobDir: plan.sourceJob, trialIds, signal })
    if (fresh.planDigest !== plan.planDigest) throw failure('HARBOR_DIAGNOSTIC_REVISION_CONFLICT', 'Inputs changed since preflight. Review a new preview; no Job was started.')
    if (plan.effectiveLimits && JSON.stringify(plan.effectiveLimits) !== JSON.stringify(fresh.effectiveLimits)) throw failure('HARBOR_DIAGNOSTIC_REVISION_CONFLICT', 'The effective diagnostic budget changed. Review a new preview; no Job was started.')
    const binding = await this._binding(fresh)
    const jobName = `diagnostic-${operationId.slice(4)}`
    if (jobName.length > 100) throw failure('HARBOR_DIAGNOSTIC_OPERATION_INVALID', 'The Operation ID exceeds the fixed Job-name bound.')
    const jobs = resolveWithin(root, this.config.jobsDir ?? 'jobs', 'jobs directory')
    let cursor = root
    for (const part of path.relative(root, jobs).split(path.sep).filter(Boolean)) {
      cursor = path.join(cursor, part)
      try { if ((await lstat(cursor)).isSymbolicLink()) throw failure('HARBOR_DIAGNOSTIC_SOURCE_DENIED', 'The Job output directory must not traverse symlinks.') }
      catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    const jobDir = path.join(jobs, jobName)
    try { await lstat(jobDir); throw failure('HARBOR_DIAGNOSTIC_ALREADY_STARTED', 'This Operation already has a Job; it cannot be launched again.') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    aborted(signal)
    const materialized = await this._json(['diagnostic-subset', 'materialize'], root, { input: { projectRoot: root, sourceJobDir: plan.sourceJob, trialIds, expectedPlanDigest: plan.planDigest, operationId }, signal, timeoutMs: 60_000 })
    assertPlan(materialized)
    const candidate = resolveWithin(root, materialized.candidatePath, 'Candidate')
    const dataset = resolveWithin(root, materialized.datasetPath, 'diagnostic Dataset')
    const stack = resolveWithin(root, materialized.stackPath, 'Evaluation Stack')
    const identity = materialized.identities.candidate
    const args = [
      'run', '-p', dataset, '-a', AGENT,
      '--ak', `candidate_path=${candidate}`, '--ak', `candidate_version=${identity.version}`, '--ak', `candidate_digest=${identity.digest}`,
      '--ak', `candidate_model_provider=${binding.provider}`, '--ak', `candidate_model=${binding.model}`,
      '--job-name', jobName, '--jobs-dir', jobs, '-n', String(DIAGNOSTIC_LIMITS.concurrency), '-k', '1', '--max-retries', '0', '-e', 'docker', '--delete',
      '--plugin', PLUGIN, '--plugin-kwarg', `candidate_manifest=${path.join(candidate, 'candidate-manifest.json')}`,
      '--plugin-kwarg', `dataset_path=${dataset}`, '--plugin-kwarg', `stack_path=${stack}`, '--plugin-kwarg', `project_root=${root}`, '--plugin-kwarg', 'mode=diagnostic',
      '--plugin-kwarg', `candidate_model_provider=${binding.provider}`, '--plugin-kwarg', `candidate_model=${binding.model}`,
      '--plugin-kwarg', `candidate_model_transport=${binding.transport}`, '--plugin-kwarg', `candidate_model_protocol=${binding.protocol}`,
      '--plugin-kwarg', `expected_dataset_digest=${materialized.datasetIdentity.source_digest}`, '--plugin-kwarg', `expected_stack_digest=${materialized.identities.stack.digest}`,
      '--plugin-kwarg', `operation_id=${operationId}`, '--plugin-kwarg', `source_plan_digest=${materialized.planDigest}`,
    ]
    if (binding.reasoning_effort !== undefined) args.push('--ak', `candidate_reasoning_effort=${binding.reasoning_effort}`, '--plugin-kwarg', `candidate_reasoning_effort=${binding.reasoning_effort}`)
    aborted(signal)
    const environment = await pinDiagnosticEnvironment(this.runProcess, this._environment())
    const runtimeIdentity = await readDiagnosticRuntimeIdentity({ runProcess: this.runProcess, platform: this.platform, env: environment })
    aborted(signal)
    const lease = await this.modelRuntime.openLease(binding, { candidateDigest: identity.digest, jobName, maxRequests: fresh.effectiveLimits.maxModelRequests, maxResponseBytes: fresh.effectiveLimits.maxResponseBytes })
    let processStarted = false
    // A lightweight in-memory counter is sampled by the controller; unlike
    // lifecycle evidence, request usage cannot be reconstructed after restart.
    onUsage?.(() => lease.usage?.())
    const executionError = error => {
      const safe = safeProcessError(error)
      if (processStarted) Object.assign(safe, { cleanupRequired: true, jobName, diagnosticOnly: true })
      return safe
    }
    try {
      const result = await this.runProcess(this.config.harborBin, args, {
        cwd: root, env: { ...environment, HSE_MODEL_GATEWAY_URL: lease.endpoint, HSE_MODEL_GATEWAY_TOKEN: lease.token, HSE_MODEL_GATEWAY_PROVIDER: lease.candidateProvider, HSE_MODEL_GATEWAY_INFO: JSON.stringify(lease.modelInfo), HSE_MODEL_GATEWAY_PROTOCOL: lease.protocol },
        timeoutMs: DIAGNOSTIC_LIMITS.wallTimeoutMs, maxOutputBytes: 2 * 1024 * 1024, killGraceMs: 30_000, signal,
        onSpawn: pid => { processStarted = true; return onSpawn?.(pid, { job: jobName, dataset: materialized.datasetIdentity, operationId, process: { pid, groupId: pid, platform: this.platform, dockerTransport: 'pinned-local-unix/v1', ...runtimeIdentity } }) },
      })
      const summary = await safeJsonArtifact(root, path.join(jobDir, 'evaluation-summary.json'))
      const context = await safeJsonArtifact(root, path.join(jobDir, 'evaluation-context.json'))
      const count = plan.selection.length
      if (summary?.schema_version !== 3 || summary.job !== jobName || summary.mode !== 'diagnostic' || summary.n_trials !== count || summary.n_discovered_trials !== count || summary.artifact_validation?.valid !== true || context.mode !== 'diagnostic' || context.candidate?.digest !== identity.digest || context.dataset?.source_digest !== materialized.datasetIdentity.source_digest || context.evaluation_stack?.digest !== materialized.identities.stack.digest || summary.evaluation_context?.full_digest !== context.full_digest) {
        throw failure('HARBOR_DIAGNOSTIC_ARTIFACT_INVALID', 'The Job process ended without complete, identity-matching diagnostic artifacts. Inspect the Job; it is not a successful evaluation.')
      }
      return { ...buildEvaluationRunReceipt({ jobName, mode: 'diagnostic', summary, processCode: result.code }), schema: 'harbor-diagnostic-operation-result/v1', operationId, jobName, productionImpact: 'none', promotionEligible: false, sourceJob: path.basename(plan.sourceJob), selectionCount: count, freshBaselineRequired: true, limits: fresh.effectiveLimits }
    } catch (error) { throw executionError(error) }
    finally {
      try { await lease.close() }
      catch (error) { throw executionError(error) }
    }
  }
}
