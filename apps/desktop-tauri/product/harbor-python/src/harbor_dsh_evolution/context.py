from __future__ import annotations

import json
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Any

from harbor_dsh_evolution.bridge_contract import BRIDGE_CONTRACT
from harbor_dsh_evolution.candidate import CandidateManifest
from harbor_dsh_evolution.dataset import load_validated_dataset
from harbor_dsh_evolution.identity import canonical_digest, tree_digest
from harbor_dsh_evolution.execution_environment import execution_environment_identity
from harbor_dsh_evolution.stack import snapshot_stack

CONTEXT_NAME = "evaluation-context.json"


def _package_version(package: str) -> str:
    try:
        return version(package)
    except PackageNotFoundError:
        return "unknown"


def normalize_candidate_model_binding(value: dict[str, Any]) -> dict[str, str]:
    required = ("provider", "model", "transport", "protocol")
    if not isinstance(value, dict) or not all(
        isinstance(value.get(key), str) and value[key].strip() for key in required
    ):
        raise ValueError(
            "Candidate model binding requires provider, model, transport, and protocol"
        )
    return {
        key: value[key].strip()
        for key in (*required, "reasoning_effort")
        if isinstance(value.get(key), str) and value[key].strip()
    }


def build_evaluation_context(
    dataset_dir: Path,
    *,
    candidate: CandidateManifest,
    stack_path: Path,
    project_root: Path,
    mode: str,
    candidate_model_binding: dict[str, Any],
    execution_environment: str = "host",
    artifact_profile: str | None = None,
) -> dict[str, Any]:
    if mode not in {"diagnostic", "promotion-eligible"}:
        raise ValueError("mode must be diagnostic or promotion-eligible")
    profile = artifact_profile or ("governed" if mode == "promotion-eligible" else "experiment")
    if profile not in {"diagnostic", "experiment", "governed"}:
        raise ValueError("artifact_profile must be diagnostic, experiment, or governed")
    if (mode == "promotion-eligible") is not (profile == "governed"):
        raise ValueError("governed artifact profile must match promotion-eligible mode")
    project_root = project_root.expanduser().resolve(strict=True)
    dataset = load_validated_dataset(dataset_dir, project_root=project_root)
    stack = snapshot_stack(stack_path, project_root=project_root)
    model_binding = normalize_candidate_model_binding(candidate_model_binding)
    environment_identity = execution_environment_identity(execution_environment)
    integration_digest, _ = tree_digest(
        Path(__file__).parent,
        namespace="harbor-dsh-integration-runtime-v2",
    )
    runtime = {
        "harbor_version": _package_version("harbor"),
        "integration_version": _package_version("harbor-dsh-evolution"),
        "integration_digest": integration_digest,
    }
    candidate_identity = {
        "candidate_id": candidate.candidate_id,
        "version": candidate.version,
        "digest": candidate.digest,
        "runtime": candidate.runtime,
    }
    reviewed_badcases = ((dataset.get("metadata") or {}).get("reviewed_badcases") or {})
    dataset_identity = {
        "dataset_id": dataset["dataset_id"],
        "version": dataset["version"],
        "source_digest": dataset["source_digest"],
        "task_count": dataset["task_count"],
        "promotion_eligible": reviewed_badcases.get("promotion_eligible") is not False,
    }
    stack_identity = {
        "stack_id": stack["stack_id"],
        "version": stack["version"],
        "digest": stack["digest"],
        "comparison_digest": stack["comparison_digest"],
        "components": stack["components"],
        "judge": stack["judge"],
    }
    comparison_identity = {
        "dataset": dataset_identity,
        "stack_comparison_digest": stack["comparison_digest"],
        "candidate_model_binding": model_binding,
        "execution_environment": environment_identity,
        "runtime": runtime,
    }
    context = {
        "schema_version": BRIDGE_CONTRACT["protocols"]["candidate_context"]["schema_version"],
        "digest": canonical_digest(
            comparison_identity,
            namespace="harbor-dsh-evaluation-context-v3",
        ),
        "full_digest": canonical_digest(
            {
                "candidate": candidate_identity,
                "dataset": dataset_identity,
                "stack": stack_identity,
                "candidate_model_binding": model_binding,
                "execution_environment": environment_identity,
                "runtime": runtime,
                "mode": mode,
                "artifact_profile": profile,
            },
            namespace="harbor-dsh-evaluation-audit-v3",
        ),
        "mode": mode,
        "evaluation_type": profile,
        "artifact_profile": profile,
        "candidate": candidate_identity,
        "dataset": dataset_identity,
        "evaluation_stack": stack_identity,
        "candidate_model_binding": model_binding,
        "execution_environment": environment_identity,
        "runtime": runtime,
    }
    return context


def refresh_evaluation_context_digests(context: dict[str, Any]) -> dict[str, Any]:
    """Refresh Context v3 after runtime-only identities (for example image IDs) bind."""
    environment = context["execution_environment"]
    environment_material = {key: value for key, value in environment.items() if key != "runtime_fingerprint"}
    environment["runtime_fingerprint"] = canonical_digest(
        environment_material, namespace="harbor-dsh-execution-environment-v1"
    )
    comparison_identity = {
        "dataset": context["dataset"],
        "stack_comparison_digest": context["evaluation_stack"]["comparison_digest"],
        "candidate_model_binding": context["candidate_model_binding"],
        "execution_environment": environment,
        "runtime": context["runtime"],
    }
    context["digest"] = canonical_digest(comparison_identity, namespace="harbor-dsh-evaluation-context-v3")
    context["full_digest"] = canonical_digest(
        {
            "candidate": context["candidate"],
            "dataset": context["dataset"],
            "stack": context["evaluation_stack"],
            "candidate_model_binding": context["candidate_model_binding"],
            "execution_environment": environment,
            "runtime": context["runtime"],
            "mode": context["mode"],
            "artifact_profile": context.get("artifact_profile"),
        },
        namespace="harbor-dsh-evaluation-audit-v3",
    )
    return context


def _preview_identity(context: dict[str, Any]) -> dict[str, Any]:
    environment = dict(context.get("execution_environment") or {})
    for key in ("runtime_fingerprint", "image_identity", "image_identities", "identity_strength"):
        environment.pop(key, None)
    return {
        "dataset": context.get("dataset"),
        "stack_comparison_digest": (context.get("evaluation_stack") or {}).get("comparison_digest"),
        "candidate_model_binding": context.get("candidate_model_binding"),
        "execution_environment": environment,
        "runtime": context.get("runtime"),
        "mode": context.get("mode"),
        "artifact_profile": context.get("artifact_profile"),
    }


def context_preview(
    *,
    project_root: Path,
    candidate: CandidateManifest,
    dataset_dir: Path,
    stack_path: Path,
    jobs_dir: Path,
    mode: str,
    candidate_model_binding: dict[str, Any],
    execution_environment: str = "host",
    artifact_profile: str | None = None,
) -> dict[str, Any]:
    expected = build_evaluation_context(
        dataset_dir,
        candidate=candidate,
        stack_path=stack_path,
        project_root=project_root,
        mode=mode,
        candidate_model_binding=candidate_model_binding,
        execution_environment=execution_environment,
        artifact_profile=artifact_profile,
    )
    compatible: list[dict[str, Any]] = []
    incompatible: list[dict[str, Any]] = []
    jobs_dir = jobs_dir.expanduser().resolve()
    if jobs_dir.is_dir():
        for context_file in sorted(jobs_dir.glob(f"*/{CONTEXT_NAME}")):
            try:
                value = json.loads(context_file.read_text())
            except (OSError, json.JSONDecodeError):
                continue
            job = context_file.parent.name
            if value.get("schema_version") != BRIDGE_CONTRACT["protocols"]["candidate_context"]["schema_version"]:
                incompatible.append({"job": job, "reason": "CONTEXT_SCHEMA_UNSUPPORTED"})
            elif value.get("mode") != mode:
                incompatible.append({"job": job, "reason": "JOB_MODE_MISMATCH"})
            elif _preview_identity(value).get("execution_environment") != _preview_identity(expected).get("execution_environment"):
                incompatible.append({"job": job, "reason": "EXECUTION_ENVIRONMENT_MISMATCH"})
            elif _preview_identity(value) != _preview_identity(expected):
                incompatible.append({"job": job, "reason": "EVALUATION_CONTEXT_MISMATCH"})
            elif (value.get("candidate") or {}).get("digest") == candidate.digest:
                incompatible.append({"job": job, "reason": "CANDIDATE_DIGEST_UNCHANGED"})
            else:
                compatible.append(
                    {
                        "job": job,
                        "candidate": value.get("candidate"),
                        "context_digest": value.get("digest"),
                    }
                )
    return {
        "schema_version": 1,
        "expected_context": expected,
        "comparable_baselines": compatible,
        "incompatible_baselines": incompatible,
        "fresh_baseline_required": not compatible,
    }
