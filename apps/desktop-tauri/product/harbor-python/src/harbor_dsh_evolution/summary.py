from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean
from typing import Any, Iterable

from harbor_dsh_evolution.artifacts import (
    load_trial_assessments,
    trial_assessment,
    validate_job_artifacts,
)
from harbor_dsh_evolution.bridge_contract import BRIDGE_CONTRACT
from harbor_dsh_evolution.context import CONTEXT_NAME

SUMMARY_NAME = "evaluation-summary.json"


def _effective_evaluator(assessments: list[dict[str, Any]]) -> dict[str, Any] | None:
    identities = [item.get("effective_evaluator") for item in assessments]
    identities = [item for item in identities if isinstance(item, dict)]
    if not identities:
        return None
    first = identities[0]
    return {
        "schema_version": 1,
        "protocol": "effective-evaluator/v1",
        "configured": first.get("configured"),
        "materialized": first.get("materialized") if all(item.get("materialized") == first.get("materialized") for item in identities) else None,
        "executed": first.get("executed") if all(item.get("executed") == first.get("executed") for item in identities) else None,
        "identity_match": len(identities) == len(assessments)
        and all(item.get("identity_match") is True for item in identities)
        and all(item == first for item in identities),
        "execution": first.get("execution") if all(item.get("execution") == first.get("execution") for item in identities) else None,
    }


def _trial_payloads(job_dir: Path) -> list[dict[str, Any]]:
    payloads = []
    for path in sorted(job_dir.glob("*/result.json")):
        payload = json.loads(path.read_text())
        if "agent_info" in payload:
            payloads.append(payload)
    return payloads


def summarize_payloads(
    payloads: Iterable[dict[str, Any]],
    *,
    job_name: str,
    candidate: dict[str, Any] | None = None,
    evaluation_context: dict[str, Any] | None = None,
    artifact_validation: dict[str, Any] | None = None,
    evaluation_contract: dict[str, Any] | None = None,
    dataset_manifest: dict[str, Any] | None = None,
    evaluation_spec: dict[str, Any] | None = None,
    assessments: Iterable[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    payloads = list(payloads)
    values: dict[str, list[float]] = defaultdict(list)
    exceptions: list[dict[str, str]] = []
    trials: list[dict[str, Any]] = []
    criterion_scored = 0
    criterion_total = 0
    statuses: Counter[str] = Counter()
    contract = evaluation_contract or {
        "primary_metric": "reward",
        "metrics": [{"id": "reward", "direction": "maximize"}],
        "hard_requirements": [],
    }
    task_lookup = {
        str(task.get("id")): task
        for task in (dataset_manifest or {}).get("tasks", [])
        if isinstance(task, dict) and task.get("id")
    }
    canonical_assessments = list(assessments) if assessments is not None else [
        trial_assessment(
            payload,
            evaluation_contract=contract,
            task=task_lookup.get(str(payload.get("task_name"))) or {},
        )
        for payload in payloads
    ]
    for assessment in canonical_assessments:
        statuses[assessment["status"]] += 1
        if assessment["score"]["valid"]:
            for key, value in assessment.get("evaluator_metrics", {}).items():
                values[key].append(value)
        current_exception = assessment["exception"]
        if current_exception:
            exceptions.append({"trial": assessment["trial_id"], **current_exception})
        bounded_criteria = []
        for item in (assessment.get("criteria") or [])[:100]:
            if not isinstance(item, dict) or not item.get("id"):
                continue
            criterion_total += 1
            if item.get("status") in {"scored", "measured"} and isinstance(item.get("score"), (int, float)):
                criterion_scored += 1
            bounded_criteria.append({
                "id": str(item["id"]),
                "label": str(item.get("label") or item["id"])[:256],
                "status": item.get("status"),
                "score": item.get("score"),
                "reason": str(item.get("reason") or "")[:2000],
                "recommendation": str(item.get("recommendation") or "")[:2000],
                "evidence_refs": [str(value)[:512] for value in (item.get("evidence_refs") or [])[:20]],
            })
        trials.append(
            {
                "id": assessment["trial_id"],
                "name": assessment["trial_name"],
                "datasetTrial": assessment["dataset_trial"],
                "status": assessment["status"],
                "score": assessment["score"],
                "requirements": assessment["requirements"],
                "criteria": bounded_criteria,
                "evidence_provenance": (assessment.get("evidence_provenance") or [])[:20],
                "rewards": assessment.get("evaluator_metrics", {}),
                "raw_rewards": assessment["raw_rewards"],
                "effective_evaluator": assessment.get("effective_evaluator"),
                "population": assessment["population"],
                "exception": current_exception,
            }
        )

    attempt_counts: Counter[str] = Counter()
    for trial in trials:
        task_id = str(trial.get("datasetTrial") or trial.get("name") or trial.get("id"))
        attempt_counts[task_id] += 1
        trial["attempt"] = attempt_counts[task_id]
    dataset_total = int(
        (evaluation_context or {}).get("dataset", {}).get("task_count")
        or (dataset_manifest or {}).get("task_count")
        or len(trials)
    )
    repeats = int(((evaluation_spec or {}).get("repeat_policy") or {}).get("repeats") or 1)
    expected_trials = dataset_total * repeats
    valid_scores = sum(bool(trial["score"]["valid"]) for trial in trials)
    return {
        "schema_version": BRIDGE_CONTRACT["protocols"]["candidate_summary"]["schema_version"],
        "job": job_name,
        "job_kind": "candidate-evaluation",
        "mode": (evaluation_context or {}).get("mode"),
        "candidate": candidate,
        "evaluation_context": evaluation_context,
        "n_tasks": dataset_total,
        "repeat_policy": (evaluation_spec or {}).get("repeat_policy") or {"repeats": 1},
        "n_trials": expected_trials,
        "n_discovered_trials": len(trials),
        "n_completed_trials": sum(statuses.values()),
        "n_valid_scores": valid_scores,
        "n_invalid_scores": len(trials) - valid_scores,
        "n_unscored_trials": statuses["completed-unscored"],
        "coverage": {
            "total_trials": expected_trials,
            "scored_trials": valid_scores,
            "unscored_trials": statuses["completed-unscored"],
            "trial_rate": valid_scores / expected_trials if expected_trials else 0.0,
            "criterion_scored": criterion_scored,
            "criterion_total": criterion_total,
            "criterion_rate": criterion_scored / criterion_total if criterion_total else 0.0,
        },
        "n_exceptions": len(exceptions),
        "n_infrastructure_exceptions": statuses["infrastructure-error"],
        "n_evaluation_exceptions": statuses["evaluation-error"],
        "status_counts": dict(sorted(statuses.items())),
        "metrics": {key: mean(items) for key, items in sorted(values.items())},
        "exceptions": exceptions,
        "trials": trials,
        "effective_evaluator": _effective_evaluator(canonical_assessments),
        "artifact_validation": artifact_validation or {"valid": False, "findings": [{"level": "error", "code": "ARTIFACT_VALIDATION_MISSING", "message": "Artifacts were not validated"}]},
    }


def summarize_job(job_dir: Path) -> dict[str, Any]:
    job_dir = job_dir.expanduser().resolve(strict=True)
    context_path = job_dir / CONTEXT_NAME
    evaluation_context = json.loads(context_path.read_text()) if context_path.exists() else None
    if (evaluation_context or {}).get("protocol") in {
        "historical-generation-evaluation-context/v1",
        "historical-generation-evaluation-context/v2",
        "historical-generation-evaluation-context/v3",
    }:
        from harbor_dsh_evolution.historical_summary import summarize_historical_job

        return summarize_historical_job(job_dir)
    candidate_path = job_dir / "candidate-manifest.json"
    candidate = json.loads(candidate_path.read_text()) if candidate_path.exists() else None
    contract_path = job_dir / "evaluation-contract.json"
    evaluation_contract = json.loads(contract_path.read_text()) if contract_path.exists() else None
    dataset_path = job_dir / "dataset-manifest.json"
    dataset_manifest = json.loads(dataset_path.read_text()) if dataset_path.exists() else None
    spec_path = job_dir / "evaluation-spec.json"
    evaluation_spec = json.loads(spec_path.read_text()) if spec_path.exists() else None
    payloads = _trial_payloads(job_dir)
    assessments = load_trial_assessments(job_dir)
    return summarize_payloads(
        payloads,
        job_name=job_dir.name,
        candidate=candidate,
        evaluation_context=evaluation_context,
        artifact_validation=validate_job_artifacts(job_dir, expected_trials=len(payloads)),
        evaluation_contract=evaluation_contract,
        dataset_manifest=dataset_manifest,
        evaluation_spec=evaluation_spec,
        assessments=assessments or None,
    )


def write_summary(job_dir: Path, summary: dict[str, Any]) -> Path:
    output = job_dir / SUMMARY_NAME
    output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    return output


def load_or_create_summary(job_dir: Path) -> dict[str, Any]:
    job_dir = job_dir.expanduser().resolve(strict=True)
    path = job_dir / SUMMARY_NAME
    if path.exists():
        return json.loads(path.read_text())
    summary = summarize_job(job_dir)
    write_summary(job_dir, summary)
    return summary
