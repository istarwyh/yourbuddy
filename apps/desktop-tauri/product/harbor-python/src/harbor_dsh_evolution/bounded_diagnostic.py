"""Plan and materialize a frozen diagnostic subset; never launch a Job here.

The Host owns authorization and execution. This subprocess consumes only its
project, source Job and selected Trial IDs, and rediscovers executable inputs
from that Job. It does not accept an Agent-provided command, source path, model,
or arbitrary limits. The materialized Dataset is a new identity, not a rewrite
of the registered source Dataset.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tomllib
from pathlib import Path
from typing import Any

from harbor_dsh_evolution.candidate import verify_candidate
from harbor_dsh_evolution.candidate_runtime import load_candidate_runtime
from harbor_dsh_evolution.runtime_binding import render_runtime_config
from harbor_dsh_evolution.context import normalize_candidate_model_binding
from harbor_dsh_evolution.dataset import load_validated_dataset, snapshot_dataset
from harbor_dsh_evolution.identity import canonical_digest, files_under, tree_digest
from harbor_dsh_evolution.stack import snapshot_stack

PROTOCOL = "harbor-bounded-diagnostic-plan/v1"
LIMITS = {
    "maxTrials": 12,
    "concurrency": 2,
    "attempts": 1,
    "maxRetries": 0,
    "wallTimeoutMs": 900_000,
    "maxModelRequests": 96,
    "maxResponseBytes": 1_048_576,
}
MAX_JSON_BYTES = 4 * 1024 * 1024
MAX_SUBSET_BYTES = 64 * 1024 * 1024
MAX_SUBSET_FILES = 4096
_OPERATION = re.compile(r"^hop_[A-Za-z0-9_-]{1,100}$")


def _fail(code: str, message: str) -> None:
    raise ValueError(f"HARBOR_DIAGNOSTIC_{code}: {message}")


def _inside(root: Path, value: Any, *, directory: bool = False) -> Path:
    if not isinstance(value, (str, Path)) or not str(value):
        _fail("SOURCE_UNAVAILABLE", "The source Job does not record executable local inputs.")
    requested = Path(value)
    candidate = requested if requested.is_absolute() else root / requested
    try:
        relative = candidate.relative_to(root)
    except ValueError:
        _fail("SOURCE_DENIED", "Source inputs must stay in this project.")
    if ".." in relative.parts:
        _fail("SOURCE_DENIED", "Source inputs must not traverse parent directories.")
    cursor = root
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            _fail("SOURCE_DENIED", "Source inputs must not traverse symlinks.")
    if not candidate.exists() or (directory and not candidate.is_dir()):
        _fail("SOURCE_UNAVAILABLE", "An immutable source input is no longer available.")
    return candidate


def _json(root: Path, value: Any) -> dict[str, Any]:
    candidate = _inside(root, value)
    if not candidate.is_file() or candidate.stat().st_size > MAX_JSON_BYTES:
        _fail("SOURCE_INVALID", "A source artifact is not a bounded regular JSON file.")
    try:
        result = json.loads(candidate.read_text())
    except (UnicodeError, json.JSONDecodeError):
        _fail("SOURCE_INVALID", "A source artifact is invalid JSON.")
    if not isinstance(result, dict):
        _fail("SOURCE_INVALID", "A source artifact must be a JSON object.")
    return result


def _stack_path(root: Path, manifest: dict[str, Any]) -> Path:
    candidates: set[Path] = set()
    for component in (manifest.get("components") or {}).values():
        if not isinstance(component, dict) or not component.get("entry"):
            continue
        entry = _inside(root, component["entry"])
        cursor = entry if entry.is_dir() else entry.parent
        while cursor == root or root in cursor.parents:
            possible = cursor / ".harbor" / "evaluation-stack.yml"
            if possible.exists():
                candidates.add(_inside(root, possible))
            if cursor == root:
                break
            cursor = cursor.parent
    matches = []
    for candidate in sorted(candidates):
        try:
            if snapshot_stack(candidate, project_root=root).get("digest") == manifest.get("digest"):
                matches.append(candidate)
        except (ValueError, OSError):
            continue
    if len(matches) != 1:
        _fail("STACK_CHANGED", "The historical Evaluation Stack is unavailable or changed. Run a fresh baseline first.")
    return matches[0]


def _selection(root: Path, job: Path, dataset: Path, manifest: dict[str, Any], ids: list[str]) -> list[dict[str, str]]:
    lifecycle = _json(root, job / "trial-lifecycle.json")
    rows = lifecycle.get("trials")
    if not isinstance(rows, list):
        _fail("SELECTION_INVALID", "The source Job has no authoritative Trial lifecycle.")
    tasks = manifest["tasks"]
    aliases: dict[str, list[dict[str, Any]]] = {}
    for task in tasks:
        task_root = _inside(root, dataset / task["path"], directory=True)
        config = tomllib.loads((task_root / "task.toml").read_text())
        for alias in {task["id"], task["path"], (config.get("task") or {}).get("name")} - {None}:
            aliases.setdefault(str(alias), []).append(task)
    selected = []
    seen_tasks = set()
    for identifier in ids:
        matching = [row for index, row in enumerate(rows) if isinstance(row, dict) and identifier == str(row.get("id") or row.get("execution_id") or f"dataset-{row.get('dataset_order', index)}")]
        if len(matching) != 1 or matching[0].get("terminal") is not True:
            _fail("SELECTION_INVALID", "Select completed Trials from the source Job; pending or ambiguous Trials cannot run.")
        row = matching[0]
        task_matches = aliases.get(str(row.get("dataset_trial")), [])
        if len(task_matches) != 1:
            _fail("SELECTION_INVALID", "A selected Trial cannot be uniquely matched to the registered Dataset.")
        task = task_matches[0]
        if task["id"] in seen_tasks:
            _fail("SELECTION_INVALID", "Select only one attempt per Dataset task.")
        seen_tasks.add(task["id"])
        digest, _ = tree_digest(dataset / task["path"], namespace="harbor-diagnostic-task/v1")
        selected.append({"trialId": identifier, "taskId": task["id"], "taskPath": task["path"], "taskDigest": digest})
    return selected


def plan_diagnostic(*, project_root: Path, source_job_dir: Path, trial_ids: list[str]) -> dict[str, Any]:
    root = project_root.expanduser().resolve(strict=True)
    job = _inside(root, source_job_dir, directory=True)
    if not isinstance(trial_ids, list) or not 1 <= len(trial_ids) <= LIMITS["maxTrials"]:
        _fail("QUOTA", f"Select 1–{LIMITS['maxTrials']} completed Trials for one bounded diagnostic.")
    if any(not isinstance(item, str) or not item or len(item) > 240 for item in trial_ids) or len(set(trial_ids)) != len(trial_ids):
        _fail("SELECTION_INVALID", "Trial IDs must be unique bounded strings.")
    context = _json(root, job / "evaluation-context.json")
    if context.get("schema_version") != 2 or not context.get("candidate") or context.get("job_kind") == "historical-generation-evaluation":
        _fail("UNSUPPORTED_JOB", "This action requires a recorded Candidate evaluation, not historical generation evidence.")
    configuration = _json(root, job / "config.json")
    agents = configuration.get("agents") or []
    if len(agents) != 1 or not isinstance(agents[0], dict):
        _fail("SOURCE_UNAVAILABLE", "The source Job must record exactly one local Candidate.")
    candidate = _inside(root, (agents[0].get("kwargs") or {}).get("candidate_path"), directory=True)
    try:
        candidate_manifest = verify_candidate(candidate, expected_digest=context["candidate"].get("digest"))
        candidate_runtime = load_candidate_runtime(candidate, required=True)
        try:
            render_runtime_config(candidate, gateway_provider="readiness-placeholder", model="readiness-placeholder", config_path=candidate_runtime["config_path"], agent_entry_id=candidate_runtime["agent_entry_id"])
        except (ValueError, OSError) as error:
            raise ValueError(f"CANDIDATE_RUNTIME_INVALID: {error}") from error
    except ValueError as error:
        if "CANDIDATE_RUNTIME_" not in str(error):
            raise
        _fail(
            "RUNTIME_UNAVAILABLE",
            "The recorded Candidate has no valid, locked local ACP runtime. "
            "Create a new Candidate with an explicit runtime descriptor and run a fresh baseline; "
            "the historical Job is unchanged and no Job was started.",
        )
    recorded_candidate = _json(root, job / "candidate-manifest.json")
    if recorded_candidate.get("digest") != candidate_manifest.digest:
        _fail("CANDIDATE_CHANGED", "The Candidate no longer matches the source Job.")
    configured = [item for item in [*(configuration.get("datasets") or []), *(configuration.get("tasks") or [])] if isinstance(item, dict)]
    if len(configured) != 1 or not configured[0].get("path") or any(configured[0].get(key) for key in ("name", "repo", "git_url", "registry_url")):
        _fail("SOURCE_UNAVAILABLE", "Only a single registered local Dataset can be rerun.")
    dataset = _inside(root, configured[0]["path"], directory=True)
    dataset_manifest = load_validated_dataset(dataset, project_root=root)
    recorded_dataset = _json(root, job / "dataset-manifest.json")
    if dataset_manifest.get("source_digest") != context["dataset"].get("source_digest") or recorded_dataset.get("source_digest") != dataset_manifest.get("source_digest"):
        _fail("DATASET_CHANGED", "The registered Dataset changed after the source Job. Run a fresh baseline first.")
    if dataset_manifest.get("dataset_kind") == "historical-generation":
        _fail("UNSUPPORTED_JOB", "Historical generation records are not Candidate execution tasks.")
    stack_manifest = _json(root, job / "evaluation-stack-manifest.json")
    if stack_manifest.get("digest") != context["evaluation_stack"].get("digest"):
        _fail("STACK_CHANGED", "The recorded Stack and Context do not match.")
    stack = _stack_path(root, stack_manifest)
    selection = _selection(root, job, dataset, dataset_manifest, trial_ids)
    model = normalize_candidate_model_binding(context.get("candidate_model_binding"))
    if model.get("transport") != "dsh-host-broker" or model.get("protocol") != "dsh-host-model-gateway/v1":
        _fail("MODEL_UNSUPPORTED", "Only the recorded Host Broker model can run; credentials cannot be copied into a Candidate.")
    inventory = [file for item in selection for file in files_under(dataset / item["taskPath"])]
    byte_count = sum(file.stat().st_size for file in inventory)
    if len(inventory) > MAX_SUBSET_FILES or byte_count > MAX_SUBSET_BYTES:
        _fail("QUOTA", "The selected Dataset exceeds the bounded materialization size.")
    result = {
        "protocol": PROTOCOL,
        "mode": "diagnostic",
        "productionImpact": "none",
        "promotionEligible": False,
        "sourceJob": job.relative_to(root).as_posix(),
        "candidatePath": candidate.relative_to(root).as_posix(),
        "datasetPath": dataset.relative_to(root).as_posix(),
        "stackPath": stack.relative_to(root).as_posix(),
        "candidateModelBinding": model,
        "identities": {"candidate": {"candidate_id": candidate_manifest.candidate_id, "version": candidate_manifest.version, "digest": candidate_manifest.digest, "runtime": candidate_runtime}, "dataset": {key: dataset_manifest[key] for key in ("dataset_id", "version", "source_digest", "task_count")}, "stack": {key: stack_manifest[key] for key in ("stack_id", "version", "digest", "comparison_digest")}, "contextDigest": context["digest"]},
        "selection": selection,
        "limits": dict(LIMITS),
        "sourceBytes": byte_count,
        "sourceFiles": len(inventory),
        "freshBaselineRequired": True,
        "comparability": "Selected-subset diagnostic only; it is not comparable to the full source Dataset.",
    }
    result["planDigest"] = canonical_digest(result, namespace=PROTOCOL)
    return result


def materialize_diagnostic(*, project_root: Path, source_job_dir: Path, trial_ids: list[str], expected_plan_digest: str, operation_id: str) -> dict[str, Any]:
    if not _OPERATION.fullmatch(operation_id):
        _fail("OPERATION_INVALID", "A stable Host-owned Operation ID is required.")
    plan = plan_diagnostic(project_root=project_root, source_job_dir=source_job_dir, trial_ids=trial_ids)
    if expected_plan_digest != plan["planDigest"]:
        _fail("REVISION_CONFLICT", "Diagnostic inputs changed after preflight. Review a new preview; no Job was started.")
    root = project_root.expanduser().resolve(strict=True)
    parent = root
    for part in (".harbor", "diagnostic-datasets"):
        parent = parent / part
        if parent.is_symlink():
            _fail("SOURCE_DENIED", "Diagnostic storage must not traverse symlinks.")
        parent.mkdir(mode=0o700, exist_ok=True)
    destination = parent / operation_id
    if destination.exists() or destination.is_symlink():
        _fail("ALREADY_MATERIALIZED", "This Operation already has a Dataset; it cannot launch a duplicate Job.")
    destination.mkdir(mode=0o700)
    source = root / plan["datasetPath"]
    for item in plan["selection"]:
        origin = _inside(root, source / item["taskPath"], directory=True)
        target = destination / item["taskPath"]
        target.mkdir(mode=0o700)
        for file in files_under(origin):
            # Recheck every file immediately before copying and never follow links.
            file = _inside(root, file)
            output = target / file.relative_to(origin)
            output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            descriptor = os.open(file, os.O_RDONLY | os.O_NOFOLLOW)
            with os.fdopen(descriptor, "rb") as reader, output.open("xb") as writer:
                shutil.copyfileobj(reader, writer)
            output.chmod(file.stat().st_mode & 0o777)
        copied_digest, _ = tree_digest(target, namespace="harbor-diagnostic-task/v1")
        if copied_digest != item["taskDigest"]:
            _fail("REVISION_CONFLICT", "Task content changed while preparing the subset. No Job was started.")
    # Recheck before publishing the manifest. Partial copies never become Jobs.
    again = plan_diagnostic(project_root=root, source_job_dir=source_job_dir, trial_ids=trial_ids)
    if again["planDigest"] != plan["planDigest"]:
        _fail("REVISION_CONFLICT", "Diagnostic inputs changed while preparing the subset. No Job was started.")
    provenance = {"protocol": "harbor-diagnostic-provenance/v1", "operationId": operation_id, "sourceJob": plan["sourceJob"], "sourceIdentities": plan["identities"], "selection": plan["selection"], "planDigest": plan["planDigest"], "limits": plan["limits"], "promotionEligible": False}
    manifest = snapshot_dataset(destination, dataset_id=f"diagnostic-{operation_id}", version="1.0.0", dataset_kind="candidate-execution", metadata={"diagnostic_provenance": provenance})
    return {**plan, "datasetPath": destination.relative_to(root).as_posix(), "datasetIdentity": {key: manifest[key] for key in ("dataset_id", "version", "source_digest", "task_count")}, "provenance": provenance}


def run_command(command: str) -> int:
    try:
        raw = sys.stdin.buffer.read(MAX_JSON_BYTES + 1)
        if len(raw) > MAX_JSON_BYTES:
            _fail("REQUEST_INVALID", "Request exceeds the bounded input size.")
        request = json.loads(raw)
        values = {"project_root": Path(request["projectRoot"]), "source_job_dir": Path(request["sourceJobDir"]), "trial_ids": request["trialIds"]}
        if command == "plan":
            result = plan_diagnostic(**values)
        else:
            result = materialize_diagnostic(**values, expected_plan_digest=request["expectedPlanDigest"], operation_id=request["operationId"])
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as error:
        # Source paths and artifact contents never go back to the Agent or logs.
        message = str(error)
        if not message.startswith("HARBOR_DIAGNOSTIC_"):
            message = "HARBOR_DIAGNOSTIC_SOURCE_INVALID: Recorded inputs are missing, invalid, or changed; no Job was started."
        print(json.dumps({"error": message}, ensure_ascii=False))
        return 2


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("plan", "materialize"))
    args = parser.parse_args()
    raise SystemExit(run_command(args.command))


if __name__ == "__main__":
    main()
