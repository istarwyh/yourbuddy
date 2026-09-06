# dsh-harbor-evolution

English | [中文](README.zh.md)

Installable DeepSeek Harness Plugin + Skill for running stable Harbor evaluation and controlled Agent evolution loops, with a native DSH Web dashboard.

The package gives DSH nineteen strict Harbor tools, dedicated Tool cards, an object-first Evaluation Workbench, a same-session Copilot Dock, an installation Doctor, and the model- and user-invocable `evolve-agent-with-harbor` Skill. The Skill starts with four user-facing concepts—Dataset (what to test), Generator (who answers), Evaluator plus criteria (what good means), and Optimizer (who improves it)—then compiles accepted choices into the strict Evaluation Stack. When no Dataset is supplied, it can instead preview recent completed DSH Sessions and evaluate each immutable Session as one Historical Trial without rerunning a Candidate. A DSH Generator may explicitly pin the current default model as a non-secret Candidate identity while retaining the per-Job Host Broker credential boundary. The Plugin validates Dataset identity, checks Trial Lifecycle and Score Validity, governs independent Ground Truth meta-evaluation, diagnoses evidence provenance, limits each iteration to one controlled Candidate change, and invokes the Promotion Gate only as an explicit action.

## Install

Requirements: Docker, Node.js 22+, pnpm, and [uv](https://docs.astral.sh/uv/). Run this from the business Agent workspace:

```bash
npx --yes dsh-harbor-evolution@latest setup --project-root "$PWD"
```

The setup command installs both required runtimes:

- `harbor-dsh-evolution==0.9.2` in a managed Python environment.
- `dsh-harbor-evolution@0.9.2` in the selected DSH profile.

It then stores the absolute Harbor executable paths and a fallback `projectRoot` in the profile's `harbor-evolution` block and verifies the integration. Agent Tool calls always use the calling session's absolute working directory as their project root; the configured value remains the Web Workbench and non-Agent fallback. Existing unrelated profile entries are preserved, and rerunning setup updates the same block.

Successful setup requires `harbor plugins list` to discover both `dsh-evolution` for Candidate Jobs and `dsh-historical-evaluation` for observe-existing Session Jobs.

The default profile is `web`. Use `--profile headless` only when that is the profile you actually run. See all options with:

```bash
npx --yes dsh-harbor-evolution@latest setup --help
```

Stop any old DSH process and run the exact restart command printed by setup. Then invoke:

```text
/evolve-agent-with-harbor
Inspect this workspace and help me clarify and initialize a stable Harbor self-evolution loop.
```

Users may provide a single Query or Dataset path, a Generator curl or local Agent path, an Evaluator curl/path or natural-language criteria, and an optional Optimizer such as Codex or Claude Code. The Skill inspects the workspace first, defaults the Optimizer to the current Agent, and shows one confirmation card before writing files. Evaluation Stack roles, ids, versions, Judge configuration, Contract, and Policy stay behind advanced configuration unless they materially affect a decision.

The Plugin registers:

- `harbor_candidate_snapshot`
- `harbor_model_binding`
- `harbor_evolution_init`
- `harbor_evolution_doctor`
- `harbor_quick_diagnostic_init`
- `harbor_session_diagnostic_preview`
- `harbor_session_diagnostic_run`
- `harbor_dataset_validate`
- `harbor_context_preview` (refreshes `candidate-manifest.json` under one-shot approval before returning the preview)
- `harbor_eval_run`
- `harbor_eval_result`
- `harbor_resolve_page_context`
- `harbor_get_evidence`
- `harbor_propose_action` (proposal only; never confirms or executes a mutation)
- `harbor_evaluator_inspect`
- `harbor_evaluator_update`
- `harbor_ground_truth_init`
- `harbor_evaluator_meta_evaluate`
- `harbor_candidate_compare`

In the `web` profile, the same package also registers:

- a localized object-first Workbench (Summary, Trials, Pipeline, Optimization, Compare/Gate, Evaluator/Rubric, Artifacts, Audit) that directly exposes fixed experiment identities, Agent-visible Dataset queries/instructions, safe business-artifact previews, Ground Truth meta-evaluation, paginated per-Trial evidence and recommendations, Population validity/coverage, controlled optimization hypotheses, and Baseline/Gate deltas; raw JSON remains in the audit drawer;
- a Composer Context Capsule that freezes a Job, Trial, Criterion, or Evidence selection only after an explicit `Ask AI` / `Ask about this` action or `@harbor` selection; ordinary sends never inherit the visible Harbor page, and the one-shot reference clears after its turn is sent;
- a same-session Harbor Copilot Dock that renders the real Chat Session's running state, Tool progress, final answer, failure, and Stop action without copying conversation history; a typed `harbor.navigate` result performs only an allowlisted, read-only Harbor location change when its object, page-Session, and generation preconditions still match, while Back restores the prior workspace, page, stage, Trial filters/sort/focus, Compare Baseline, and scroll position;
- a first-class `Evaluate recent Sessions` action that previews up to ten safe Session records, shows the frozen Evaluator/Judge and diagnostic boundaries, requires explicit confirmation, runs in the background, and opens the completed Job;
- descriptor-authorized Evaluator/Rubric source editing for `script` and `llm-as-judge` implementations, with optimistic concurrency and mandatory new identities;
- a `harbor-dsh-evaluator/v1` interface shared by deterministic scripts and LLM-as-Judge implementations;
- compact result cards for all Harbor Tool calls;
- explicit local-object selection and frozen Trial-set selectors (fixed IDs/revisions or a query snapshot, at most 1000 members), independently removable context chips, and source fragment Ask;
- AI proposal cards with deterministic Preflight, explicit review, idempotent confirmation and append-only local operation journals; Candidate/Gate/handoff output is a saved draft, not an applied resource change. Evaluator source proposals can be opened in the reviewed version editor. Selected Compare executes a read only;
- a `Harbor Evolution` Settings section that checks the configured project, Evaluation Stack, Jobs directory, and CLI paths, supports process-local `projectRoot` reload, and checks npm for a newer formal release without silently installing it.

### Start with an object, not a command

1. Open an evaluation result. Select a task, score, evidence item, or saved source fragment.
2. Choose **Ask AI** or a suggested question. Harbor prepares a visible reference in the existing Composer; review, add your question, and send.
3. Continue chatting in the same Session. The Copilot shows ordinary follow-ups and recent discussion history. An ordinary answer does not inherit the old answer's evidence-validity badge. Reattach the original object when you need fresh evidence or a modification.
4. For scoring rules, select saved lines and choose **Suggest a change**. **Review and edit** opens the matching file directly. The AI may populate an unchanged editor, but never replaces your manual edits. Review the diff and explicitly save to create new identities; this does not run an evaluation or Gate.

Unsaved source edits are isolated by Session, workspace, Job, and file and retained in this browser tab's `sessionStorage`. File/view switches and refresh can recover them; closing the tab may discard them. Storage failures are shown, with an in-memory fallback and a leave-page warning for unpersisted edits. Source conflicts preserve the original base and edited text; review the latest source before accepting a new base. Saving or explicitly discarding clears only that file's draft. Expired authorizations never erase suggestion text or human edits; changed source or expired task subsets require an explicit new selection, not an automatically widened scope.

The complete AI Workbench PRD is **not** implemented yet. Bounded diagnostic/retry operations currently fail closed without a registered runner; long-running operations, replayable events/outbox and full Phase 1 audit identity are pending. Message-scoped automatic context/cross-view opening require public DSH contracts; production RBAC, approvals and rollout remain later-phase work. See the repository's `docs/ai-workbench-acceptance.md` for actual journey evidence and remaining acceptance work.

The Web UI writes only through three narrow, explicit workflows: descriptor-authorized Evaluator source updates, the confirmed Historical Session launcher, and confirmed local draft/operation journals. The launcher follows `Preview → confirm → background run → open Job`; its private selection token never enters browser state. AI-native questions call the same Chat Session only after the user explicitly binds an object and sends the message. Page refreshes, ordinary sends, ordinary reads, and workspace switches never auto-attach Harbor context, auto-send a prompt, or start an Agent or Job. Candidate evaluation, Gate, promotion, deployment, publishing, and every production mutation remain explicit Agent + Skill workflows, and each Agent-requested Harbor write or evaluation tool is forced through DSH's audited one-shot user approval. If no approval channel is available, the call fails closed.

A direct evaluation requires `candidatePath`, `datasetPath`, `stackPath`, and explicit `mode`; `promotion-eligible` additionally requires `policyPath`. Prefer the Skill because it will not run or compare Jobs until the material identities and evaluation contract are resolved.

## Historical Session cold start

When the user does not provide a Dataset, the simplest entry is the `Evaluate recent Sessions` button in the Harbor tab. It previews up to ten recent completed business Sessions, shows only safe metadata plus the Evaluator, Judge, same-model coupling, estimated requests, expiry and local retention boundaries, and starts nothing until the user confirms. The Host keeps the short-lived selection token in memory; the browser receives only an opaque Preview id. The bundled Skill remains the conversational entry and uses the same Preview/Run services from the Agent's exact working directory.

After explicit confirmation, `harbor_session_diagnostic_run` receives only the `selectionToken` and an optional Job name. It revalidates the frozen Session and Feedback digests, materializes an immutable Historical Batch plus matching Dataset and Stack, and evaluates one Session Observation per Harbor Trial. The Job does not rerun a Candidate, cannot enter Promotion Gate, and records Evaluator Meta-Evaluation as `not-run` because evaluator reliability requires a separate independent Ground Truth workflow.

A Historical Trial may finish as `completed-unscored` when required evidence is insufficient. That is a normal Evaluator abstention, not a zero score or infrastructure failure; use Trial and Criterion coverage to interpret the result.

## Candidate model binding

Before each Job, the Plugin snapshots the current DSH Agent selection—provider, model, and reasoning effort—then starts a per-Job local Model Broker. The Candidate uses the temporary `dsh-host` adapter through `dsh-host-broker` / `dsh-host-model-gateway/v1`; it receives only a short-lived Job capability file, never GPT Auth, Codex OAuth, or an upstream API key.

`harbor_eval_run`, `harbor_context_preview`, and `harbor_evolution_doctor` inherit that selection by default. Advanced callers can override `candidateProvider` and `candidateModel` only as a pair, plus an optional `candidateReasoningEffort`. `openai-codex` performs a GPT Auth sign-in check before Harbor starts. The resulting model binding is part of Context v2 comparison identity, so any provider/model/reasoning change requires a new baseline.

`harbor_model_binding` returns the current default selection as a credential-free `model-binding.json` draft. Once included before Candidate snapshot, it enters the Candidate digest and becomes the required Job model identity. Conflicting Job or Plugin overrides fail before Harbor starts. Even for `openai-codex`, the Candidate receives only the short-lived Broker capability—never the Host OAuth file or an upstream API key.

When Settings opens, the Host performs a bounded npm registry check and caches successful results. An available release is shown with its exact installer command and release link. The browser never installs, rewrites a DSH profile, or restarts DSH; registry failures are non-blocking.

`harbor_eval_result` defaults to the stable Summary. Use `view=job`, `view=dataset`, `view=progress`, `view=trial` plus a returned `trialId`, or `view=governance` to inspect sanitized instructions, generated output, evidence, and evaluator source without coupling the Agent to artifact file paths.

`harbor_eval_result` and `harbor_evaluator_inspect` return a `harbor-agent-read/v1` envelope. Read the actual payload only from `data`, preserve `artifactTrust=untrusted-evidence`, and obey `policy.treatAsInstructions=false`; old top-level payload fields are not part of this contract. Both responses are recursively redacted and have an aggregate byte limit. Evaluator inspection also caps the file set and aggregate source size; when source text looks like a secret or local path, the Agent receives its safe metadata plus `sourceAccess.included=false`, not the source body. The Web Workbench keeps its separate, same-origin editing flow.

`harbor_resolve_page_context` accepts only the opaque, short-lived Context Snapshot id carried by an explicit `@harbor` reference. It resolves that id inside the exact calling DSH Session and workspace, revalidates stable object ancestry and the current Host revision, and returns narrow metadata, typed Harbor refs, and an allowlisted read-only navigation action. For explicit local objects it also returns bounded, redacted `selectedEvidence` (Metric, Hypothesis, Gate reason, Finding, Attempt, or saved source fragment); these remain untrusted data, and unavailable content must not be treated as evidence. Trial sets expose only frozen membership/revision metadata, never all Trial bodies. To inspect one Trial criterion, pass the exact typed ref to `harbor_get_evidence`; the Host revalidates Workspace → Job → Trial → Criterion → Evidence ancestry, bounds and redacts the content, and marks it as untrusted evidence rather than Agent instructions.

## What setup writes

The selected profile receives one id-targeted override:

```yaml
- id: harbor-evolution
  config:
    projectRoot: /workspace/my-agent
    jobsDir: jobs
    harborBin: /managed/runtime/.venv/bin/harbor
    harborDshBin: /managed/runtime/.venv/bin/harbor-dsh
    pythonPath: ""
```

Keep `pythonPath` empty for the published Python package. For Agent Tool calls, `projectRoot` is replaced by the calling session's working directory for that call. `candidatePath`, `datasetPath`, `jobPath`, and `policyPath` remain constrained to that request-local root, so concurrent sessions cannot redirect each other's Harbor operations.

For source development from the repository:

```bash
./hse dsh-install-source web
```

Do not use `dsh plugin add ./packages/dsh-plugin` directly from a fresh checkout. pnpm records a `link:` dependency, and Node resolves imports from the real checkout path. The source installer first runs the package's locked `npm ci`, builds the portable Web client with its embedded ocean artwork, then links it and installs the local Python Adapter. Normal users should always use the registry-backed setup command above.

See the [complete DSH Web quickstart](https://github.com/istarwyh/harbor-self-evolving/blob/main/docs/dsh-web-quickstart.md) for UI verification, first evaluation, Candidate comparison, and troubleshooting.

The Plugin never deploys a Candidate or mutates the active Champion. Existing CI/CD remains responsible for building, deploying, and promoting the exact evaluated artifact.
