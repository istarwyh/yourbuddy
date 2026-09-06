import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadBundledSkill } from './lib/official-skill.js'
import { CandidateModelRuntime } from './lib/model-runtime.js'
import { RUNTIME_POLICY } from './lib/runtime-identity.js'
import { SessionDiagnosticService } from './lib/session-diagnostic.js'
import { HistoricalWebController } from './lib/historical-web.js'
import { historicalRunLock } from './lib/historical-run-lock.js'
import { EvolutionService } from './lib/service.js'
import { runHistoricalEvaluation } from './lib/evolution.js'
import { installDashboardWeb } from './lib/web.js'

export const name = 'harbor-evolution'
export const inject = ['tools', 'skills', 'llm', 'agentDefaultModel', 'sessions']

const packageDir = path.dirname(fileURLToPath(import.meta.url))
const checkoutPythonPackage = path.resolve(packageDir, '../harbor-plugin')
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

function checkoutExecutable(name) {
  const candidate = path.join(checkoutPythonPackage, '.venv', 'bin', name)
  return existsSync(candidate) ? candidate : name
}

export const Config = Schema.object({
  projectRoot: Schema.string().default('.'),
  jobsDir: Schema.string().default('jobs'),
  harborBin: Schema.string().default(''),
  harborDshBin: Schema.string().default(''),
  agentImportPath: Schema.string().default('harbor_dsh_evolution.agent:DshCandidateAgent'),
  pluginImportPath: Schema.string().default('dsh-evolution'),
  historicalAgentImportPath: Schema.string().default('harbor_dsh_evolution.session_agent:SessionObservationAgent'),
  historicalPluginImportPath: Schema.string().default('dsh-historical-evaluation'),
  pythonPath: Schema.string().default(''),
  timeoutMs: Schema.number().default(1800000),
  candidateProvider: Schema.string().default(''),
  candidateModel: Schema.string().default(''),
  candidateReasoningEffort: Schema.string().default(''),
  modelBrokerBindHost: Schema.string().default('127.0.0.1'),
  modelBrokerAdvertisedHost: Schema.string().default('host.docker.internal'),
  modelBrokerMaxRequests: Schema.number().min(1).default(1000),
  modelBrokerMaxResponseBytes: Schema.number().min(1).default(4194304),
  modelBrokerMaxRequestBytes: Schema.number().min(1024).default(33554432),
  sessionMaxReads: Schema.number().min(1).default(100),
  sessionReadConcurrency: Schema.number().min(1).default(4),
})

function jsonTool(definition, execute) {
  return defineTool({
    ...definition,
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      return JSON.stringify(await execute(args, exec), null, 2)
    },
  })
}

function objectTool(definition, execute) {
  return defineTool({
    ...definition,
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    execute,
  })
}

function toolProjectRoot(exec) {
  const cwd = exec?.agent?.session?.header?.cwd
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) {
    throw new Error('Harbor tools require an Agent session with an absolute working directory')
  }
  return path.resolve(cwd)
}

function toolSessionId(exec) {
  const sessionId = exec?.agent?.session?.header?.id
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new Error('Harbor tools require an Agent session identity')
  }
  return sessionId
}

export function synchronizeWorkbenchProjectRoot(service, exec) {
  const projectRoot = toolProjectRoot(exec)
  service.activateProjectRoot(projectRoot, 'agent-session', toolSessionId(exec))
  return projectRoot
}

export function apply(ctx, config) {
  const resolved = {
    ...config,
    runtimePolicy: RUNTIME_POLICY,
    projectRoot: path.resolve(config.projectRoot),
    harborBin: config.harborBin || process.env.HARBOR_BIN || checkoutExecutable('harbor'),
    harborDshBin: config.harborDshBin || process.env.HARBOR_DSH_BIN || checkoutExecutable('harbor-dsh'),
    pythonPath: config.pythonPath || (
      existsSync(path.join(checkoutPythonPackage, 'src'))
        ? path.join(checkoutPythonPackage, 'src')
        : ''
    ),
  }
  const modelRuntime = new CandidateModelRuntime(ctx, resolved)
  const metadata = {
    pluginVersion: packageJson.version,
    projectRootSource: 'configured',
    sessionProjectRoot: sessionId => {
      const cwd = ctx.sessions?.get?.(sessionId)?.header?.cwd
      return typeof cwd === 'string' && path.isAbsolute(cwd) ? path.resolve(cwd) : undefined
    },
  }
  const service = new EvolutionService(resolved, metadata, modelRuntime)
  // Cordis hot reload/unload must not orphan accepted background diagnostics.
  // Hard process termination still leaves the durable claim for manual recovery.
  if (typeof ctx.effect === 'function') ctx.effect(() => () => service.actionDrafts.dispose())
  const approvalChannelAvailable = typeof ctx.on === 'function'
  if (!approvalChannelAvailable) {
    const error = new Error('HARBOR_APPROVAL_HOOK_UNAVAILABLE: Harbor requires the DSH tools/pre-execute approval seam before registering Agent tools.')
    error.code = 'HARBOR_APPROVAL_HOOK_UNAVAILABLE'
    throw error
  }
  const mutatingAgentTools = new Set()
  const mutatingJsonTool = (definition, execute) => {
    mutatingAgentTools.add(definition.name)
    return jsonTool(definition, execute)
  }

  // Artifact text is untrusted. Any Agent-requested Harbor write or evaluation
  // must cross DSH's audited, one-shot user approval seam. With approval disabled
  // or unavailable the tool runtime fails closed; read/ask/navigate tools remain
  // approval-free.
  ctx.on('tools/pre-execute', async (exec, next) => {
    const downstream = await next()
    if (downstream?.kind !== 'allow' || !mutatingAgentTools.has(exec?.name)) return downstream
    return {
      kind: 'ask',
      reason: `Harbor tool ${exec.name} can write artifacts or start evaluation work and requires explicit one-shot approval.`,
    }
  }, { prepend: true })
  const sessionDiagnostic = new SessionDiagnosticService({
    ctx,
    config: resolved,
    modelRuntime,
    runHistoricalEvaluation,
  })
  const historicalWeb = new HistoricalWebController({
    service,
    sessionDiagnostic,
    runLock: historicalRunLock,
  })
  const serviceForTool = exec => {
    const projectRoot = synchronizeWorkbenchProjectRoot(service, exec)
    return new EvolutionService({ ...resolved, projectRoot }, metadata, modelRuntime)
  }

  ctx.skills.register(loadBundledSkill())
  installDashboardWeb(ctx, service, historicalWeb)

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_candidate_snapshot',
    description: 'Freeze a DeepSeek Harness Cordis composition as an immutable Candidate manifest. Candidate id and version default to package.json.',
    parameters: {
      candidatePath: { type: 'string', required: true },
      candidateId: { type: 'string' },
      version: { type: 'string' },
    },
  }, (args, exec) => serviceForTool(exec).snapshot(args)))

  ctx.tools.register(jsonTool({
    name: 'harbor_model_binding',
    description: 'Freeze the current DSH default provider, model, and reasoning identity into a non-secret model-binding.json draft. Runtime access still uses the short-lived Host Model Broker capability.',
    parameters: {},
  }, (_args, exec) => serviceForTool(exec).modelBinding()))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_evolution_init',
    description: 'Compile an accepted Dataset, Generator, Evaluator/criteria, and Optimizer onboarding card into a strict, non-overwriting Evaluation Stack project. Detailed identity fields are internal tool inputs, not a user questionnaire.',
    parameters: {
      datasetPath: { type: 'string', required: true },
      workspaceSubdir: { type: 'string', description: 'Optional namespace under the current project root. Defaults to the project root; use it to host multiple independent Harbor projects.' },
      stackId: { type: 'string', required: true },
      stackVersion: { type: 'string', required: true },
      datasetId: { type: 'string', required: true },
      datasetVersion: { type: 'string', required: true },
      contractId: { type: 'string', required: true },
      contractVersion: { type: 'string', required: true },
      primaryMetric: { type: 'string', required: true },
      primaryDirection: { type: 'string', required: true },
      judgeProvider: { type: 'string', required: true },
      judgeModel: { type: 'string', required: true },
      judgeVersion: { type: 'string', required: true },
      policyId: { type: 'string', required: true },
      policyVersion: { type: 'string', required: true },
      minImprovement: { type: 'number', required: true },
    },
  }, (args, exec) => serviceForTool(exec).initialize(args)))

  ctx.tools.register(jsonTool({
    name: 'harbor_evolution_doctor',
    description: 'Validate the Evaluation Stack architecture, Dataset manifest, Candidate, and optional Promotion Policy before an expensive Harbor Job.',
    parameters: {
      candidatePath: { type: 'string', required: true },
      datasetPath: { type: 'string', required: true },
      stackPath: { type: 'string', required: true },
      policyPath: { type: 'string' },
      mode: { type: 'string', required: true },
      candidateProvider: { type: 'string', description: 'Optional Candidate provider. Supply it together with candidateModel; defaults to the current DSH Agent model.' },
      candidateModel: { type: 'string' },
      candidateReasoningEffort: { type: 'string' },
    },
  }, (args, exec) => serviceForTool(exec).doctor(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_quick_diagnostic_init',
    description: 'Create a non-overwriting Harbor 1.4 wiring diagnostic with one Query, a minimal Host-model Candidate, a runnable Task, and an explicit non-promotion Evaluator. The supplied Rubric is recorded as a draft but is not treated as executed.',
    parameters: {
      query: { type: 'string', required: true },
      rubric: { type: 'string', required: true },
      workspaceSubdir: { type: 'string', description: 'Defaults to harbor-diagnostic under the current Agent session directory.' },
    },
  }, (args, exec) => serviceForTool(exec).quickDiagnostic(args)))

  ctx.tools.register(jsonTool({
    name: 'harbor_session_diagnostic_preview',
    description: 'Preview up to 10 recently active, completed top-level DSH Sessions in the exact current workspace as an observe-existing Historical Generation Job. Returns only safe metadata and an owner-bound 15-minute selection token; it never exposes raw Session ids or transcript/tool payloads.',
    parameters: {
      limit: { type: 'number', description: 'Number of eligible recent Sessions, from 1 to 10. Defaults to 10.' },
      createdAfter: { type: 'string', description: 'Optional ISO-8601 lower bound on Session creation time. Use it to narrow an exact scan when the workspace exceeds the configured read budget.' },
      includeFeedback: { type: 'boolean', description: 'Include only feedback counts in Preview and redacted feedback in the frozen Batch. Defaults to true.' },
      evaluatorProvider: { type: 'string', description: 'Optional Judge provider; supply together with evaluatorModel. Defaults to the calling DSH Agent model and is frozen into the confirmation token.' },
      evaluatorModel: { type: 'string' },
      evaluatorReasoningEffort: { type: 'string', description: 'Optional Judge reasoning effort; requires explicit evaluatorProvider and evaluatorModel.' },
    },
  }, (args, exec) => {
    synchronizeWorkbenchProjectRoot(service, exec)
    return sessionDiagnostic.preview(args, exec)
  }))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_session_diagnostic_run',
    description: 'Consume a confirmed Session selection token, revalidate every immutable source boundary, write a private redacted Historical Generation Batch, materialize one Harbor Trial per Session, and run the non-promotion Historical Job.',
    parameters: {
      selectionToken: { type: 'string', required: true },
      jobName: { type: 'string' },
    },
  }, (args, exec) => {
    const projectRoot = synchronizeWorkbenchProjectRoot(service, exec)
    return historicalRunLock.runExclusive(
      { projectRoot, jobsDir: resolved.jobsDir },
      () => sessionDiagnostic.run(args, exec),
      { channel: 'agent' },
    )
  }))

  ctx.tools.register(jsonTool({
    name: 'harbor_dataset_validate',
    description: 'Validate dataset-manifest.json, task uniqueness, instructions, paths, sensitive metadata, and the immutable source digest.',
    parameters: {
      datasetPath: { type: 'string', required: true },
    },
  }, (args, exec) => serviceForTool(exec).validateDataset(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_context_preview',
    description: 'Refresh the Candidate manifest, then preview Evaluation Context v2 and find comparable baselines before launching a Job. The manifest write requires one-shot approval.',
    parameters: {
      candidatePath: { type: 'string', required: true },
      candidateId: { type: 'string' },
      version: { type: 'string' },
      datasetPath: { type: 'string', required: true },
      stackPath: { type: 'string', required: true },
      mode: { type: 'string', required: true },
      candidateProvider: { type: 'string', description: 'Optional Candidate provider. Supply it together with candidateModel; defaults to the current DSH Agent model.' },
      candidateModel: { type: 'string' },
      candidateReasoningEffort: { type: 'string' },
    },
  }, (args, exec) => serviceForTool(exec).previewContext(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_eval_run',
    description: 'Run a strict diagnostic or promotion-eligible Harbor Job bound to Candidate, Dataset Manifest, Evaluation Stack, and Context v2 identities.',
    parameters: {
      candidatePath: { type: 'string', required: true },
      candidateId: { type: 'string' },
      version: { type: 'string' },
      datasetPath: { type: 'string', required: true },
      stackPath: { type: 'string', required: true },
      mode: { type: 'string', required: true },
      policyPath: { type: 'string' },
      jobName: { type: 'string' },
      candidateProvider: { type: 'string', description: 'Optional Candidate provider. Supply it together with candidateModel; defaults to the current DSH Agent model and is frozen before the Job starts.' },
      candidateModel: { type: 'string' },
      candidateReasoningEffort: { type: 'string' },
    },
  }, (args, exec) => serviceForTool(exec).run(args)))

  ctx.tools.register(jsonTool({
    name: 'harbor_eval_result',
    description: 'Read a stable Job summary or Workbench, Dataset instruction, Trial output/evidence, progress, or Evaluator governance view inside a bounded, recursively redacted, explicitly untrusted envelope. Invalid scores remain distinct from raw verifier rewards.',
    parameters: {
      jobPath: { type: 'string', required: true },
      view: { type: 'string', description: 'summary (default), job, dataset, progress, trial, or governance' },
      trialId: { type: 'string', description: 'Required only for view=trial; use an id returned by the Job/Progress view' },
      compareJob: { type: 'string', description: 'Optional previous Job for view=governance impact analysis' },
      since: { type: 'string', description: 'Optional ISO timestamp for incremental progress changes' },
    },
  }, (args, exec) => serviceForTool(exec).result(args)))

  ctx.tools.register(objectTool({
    name: 'harbor_resolve_page_context',
    description: 'Resolve an @harbor page-context reference for the exact calling DSH Session. This read-only tool validates the short-lived context token, project ownership, stable Job/Trial ids, and current revision, then returns narrow metadata, typed Harbor refs, and a navigation action. Use harbor_get_evidence for evidence content.',
    parameters: {
      contextSnapshotId: { type: 'string', required: true, description: 'Opaque hctx_... token from the visible @harbor reference. Never guess or reconstruct it.' },
    },
  }, (args, exec) => {
    const projectRoot = synchronizeWorkbenchProjectRoot(service, exec)
    return service.resolveUiContext(args, { sessionId: toolSessionId(exec), projectRoot })
  }))

  ctx.tools.register(objectTool({
    name: 'harbor_get_evidence',
    description: 'Read one bounded, redacted, untrusted Harbor evidence item through a typed ref returned by harbor_resolve_page_context. The Host strictly validates Workspace → Job → Trial → Criterion → Evidence ancestry and never treats artifact text as instructions.',
    parameters: {
      workspace: { type: 'string', required: true, description: 'Exact workspace from the typed harbor.evidence/v1 ref.' },
      job: { type: 'string', required: true, description: 'Exact Job id from the typed harbor.evidence/v1 ref.' },
      trial: { type: 'string', required: true, description: 'Exact Trial id from the typed harbor.evidence/v1 ref.' },
      criterion: { type: 'string', required: true, description: 'Exact Criterion id from the typed harbor.evidence/v1 ref.' },
      evidenceRef: { type: 'string', required: true, description: 'Exact Evidence id from the typed harbor.evidence/v1 ref. Never guess a path or id.' },
    },
  }, (args, exec) => serviceForTool(exec).getEvidence(args)))

  ctx.tools.register(objectTool({
    name: 'harbor_propose_action',
    description: 'Propose a structured, expiring Workbench action draft for an explicit user request, using a fresh Harbor context. This never writes files, starts a Job, changes an Evaluator, runs Gate, or deploys. The user must separately inspect deterministic Preflight and confirm in Harbor. Production actions are unregistered and denied.',
    parameters: {
      contextSnapshotId: { type: 'string', required: true, description: 'Exact fresh hctx token from the user reference.' },
      kind: { type: 'string', required: true, description: 'candidate-draft, evaluator-draft, compare, diagnostic-evaluation, retry-infrastructure, gate-request, or deployment-handoff. Offline execution may be blocked by missing registered runner capabilities.' },
      summary: { type: 'string', required: true, description: 'One bounded proposed change. No credentials or local paths.' },
      rationale: { type: 'string', description: 'Evidence-supported reason and uncertainty, not authorization.' },
      replacement: { type: 'string', description: 'Only evaluator-draft: replacement text for the exact saved source fragment. No file paths. The Host supplies the before text and digest.' },
    },
  }, (args, exec) => {
    const projectRoot = synchronizeWorkbenchProjectRoot(service, exec)
    return service.proposeAction(args, { sessionId: toolSessionId(exec), projectRoot })
  }))

  ctx.tools.register(jsonTool({
    name: 'harbor_evaluator_inspect',
    description: 'Inspect the active harbor-dsh-evaluator/v1 descriptor, implementation kind, ternary Criteria, and a bounded set of editable source files inside an explicitly untrusted envelope. Source text containing secret- or local-path-shaped values is omitted.',
    parameters: {
      stackPath: { type: 'string', description: 'Defaults to .harbor/evaluation-stack.yml' },
    },
  }, (args, exec) => serviceForTool(exec).evaluatorInspect(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_evaluator_update',
    description: 'Update one descriptor-authorized Evaluator source file with optimistic concurrency. Requires new Evaluator and Stack identities and never runs evaluation or Gate automatically.',
    parameters: {
      stackPath: { type: 'string', description: 'Defaults to .harbor/evaluation-stack.yml' },
      filePath: { type: 'string', required: true },
      content: { type: 'string', required: true },
      expectedDigest: { type: 'string', required: true },
      newEvaluatorVersion: { type: 'string', required: true },
      newStackVersion: { type: 'string', required: true },
    },
  }, (args, exec) => serviceForTool(exec).evaluator(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_ground_truth_init',
    description: 'Create a non-overwriting Ground Truth draft for evaluator meta-evaluation. GT may be human, programmatic, consensus, model, or external, but must have explicit provenance and remain independent of the Candidate evaluator.',
    parameters: {
      outputPath: { type: 'string', description: 'Defaults to .harbor/ground-truth.json' },
      evaluationRoot: { type: 'string', description: 'Optional evaluation workspace root used to register custom Ground Truth paths.' },
      groundTruthId: { type: 'string', required: true },
      version: { type: 'string', required: true },
      sourceKind: { type: 'string', required: true, description: 'human, programmatic, consensus, model, or external' },
      sourceDescription: { type: 'string', required: true },
      provenance: { type: 'string', required: true },
      criteria: { type: 'string', required: true, description: 'Comma-separated criterion ids' },
    },
  }, (args, exec) => serviceForTool(exec).groundTruthInitialize(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_evaluator_meta_evaluate',
    description: 'Compare repeated evaluator-observations/v1 with independent ground-truth/v1 and write an ESF, SCE, and RCR meta-evaluation report.',
    parameters: {
      groundTruthPath: { type: 'string', description: 'Defaults to .harbor/ground-truth.json' },
      observationsPath: { type: 'string', required: true },
      outputPath: { type: 'string', description: 'Defaults to .harbor/meta-evaluation-report.json' },
      evaluationRoot: { type: 'string', description: 'Optional evaluation workspace root used to register custom report paths.' },
    },
  }, (args, exec) => serviceForTool(exec).evaluatorMetaEvaluate(args)))

  ctx.tools.register(mutatingJsonTool({
    name: 'harbor_candidate_compare',
    description: 'Apply the deterministic Promotion Gate to a baseline Job and a Candidate Job.',
    parameters: {
      baselineJob: { type: 'string', required: true },
      candidateJob: { type: 'string', required: true },
      policyPath: { type: 'string', required: true },
    },
  }, (args, exec) => serviceForTool(exec).compare(args)))
}
