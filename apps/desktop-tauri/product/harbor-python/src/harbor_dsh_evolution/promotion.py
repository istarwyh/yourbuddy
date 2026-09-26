from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from harbor_dsh_evolution.identity import canonical_digest
from harbor_dsh_evolution.job_seal import verify_job_bundle
from harbor_dsh_evolution.summary import load_or_create_summary, summarize_job


def _is_number(value: Any) -> bool:
    return isinstance(value, int | float) and not isinstance(value, bool)


def load_policy(path: Path) -> dict[str, Any]:
    policy = json.loads(
        path.expanduser().resolve(strict=True).read_text(),
        parse_constant=lambda value: (_ for _ in ()).throw(
            ValueError(f"Promotion Policy contains non-finite number: {value}")
        ),
    )
    if not isinstance(policy, dict):
        raise ValueError("Promotion Policy must be an object")
    allowed = {
        "schema_version", "policy_id", "version", "primary_metric",
        "primary_direction", "min_improvement", "minimums", "maximums",
        "non_regression", "non_regression_tolerance", "metric_directions",
        "hard_requirements", "diagnostic_only", "execution_environment",
    }
    required = {
        "schema_version", "policy_id", "version", "primary_metric",
        "primary_direction", "min_improvement", "minimums", "maximums",
        "non_regression", "execution_environment",
    }
    unknown = sorted(set(policy) - allowed)
    missing = sorted(required - set(policy))
    if unknown or missing:
        raise ValueError(
            "Promotion Policy fields are invalid: "
            + "; ".join(filter(None, [
                f"unknown={','.join(unknown)}" if unknown else "",
                f"missing={','.join(missing)}" if missing else "",
            ]))
        )
    if policy.get("schema_version") != 2:
        raise ValueError("Promotion Policy must use schema_version 2")
    for key in ("policy_id", "version", "primary_metric"):
        if not isinstance(policy.get(key), str) or not policy[key].strip():
            raise ValueError(f"Promotion Policy requires non-empty {key}")
    if policy.get("primary_direction") not in {"maximize", "minimize"}:
        raise ValueError("Promotion Policy primary_direction must be maximize or minimize")

    def finite_nonnegative(value: Any, label: str) -> float:
        if not _is_number(value) or not math.isfinite(float(value)) or float(value) < 0:
            raise ValueError(f"Promotion Policy {label} must be a finite non-negative number")
        return float(value)

    finite_nonnegative(policy.get("min_improvement"), "min_improvement")
    finite_nonnegative(policy.get("non_regression_tolerance", 0), "non_regression_tolerance")
    for field in ("minimums", "maximums"):
        mapping = policy.get(field)
        if not isinstance(mapping, dict):
            raise ValueError(f"Promotion Policy {field} must be an object")
        for metric, value in mapping.items():
            if not isinstance(metric, str) or not metric.strip() or not _is_number(value) or not math.isfinite(float(value)):
                raise ValueError(f"Promotion Policy {field} requires non-empty metric ids and finite numbers")
    non_regression = policy.get("non_regression")
    if (
        not isinstance(non_regression, list)
        or any(not isinstance(item, str) or not item.strip() for item in non_regression)
        or len(set(non_regression)) != len(non_regression)
    ):
        raise ValueError("Promotion Policy non_regression must contain unique non-empty metric ids")
    directions = policy.get("metric_directions", {})
    if not isinstance(directions, dict) or any(
        not isinstance(metric, str) or not metric.strip() or direction not in {"maximize", "minimize"}
        for metric, direction in directions.items()
    ):
        raise ValueError("Promotion Policy metric_directions must map metric ids to maximize or minimize")
    requirements = policy.get("hard_requirements", [])
    supported_requirements = {"exception_free", "artifact_schema_valid", "doctor_error_free"}
    if (
        not isinstance(requirements, list)
        or any(item not in supported_requirements for item in requirements)
        or len(set(requirements)) != len(requirements)
    ):
        raise ValueError("Promotion Policy hard_requirements contains an unsupported or duplicate value")
    if "diagnostic_only" in policy and not isinstance(policy["diagnostic_only"], bool):
        raise ValueError("Promotion Policy diagnostic_only must be a boolean")
    environment = policy.get("execution_environment")
    if not isinstance(environment, dict):
        raise ValueError("Promotion Policy execution_environment must be an object")
    strategy = environment.get("strategy")
    if strategy == "docker-required":
        if set(environment) != {"strategy", "require_image_identity"} or not isinstance(environment.get("require_image_identity"), bool):
            raise ValueError("docker-required Policy must declare boolean require_image_identity")
    elif strategy == "allow-unrestricted-host":
        rationale = environment.get("acceptance_rationale")
        if (
            set(environment) != {"strategy", "host_risk_accepted", "acceptance_rationale"}
            or environment.get("host_risk_accepted") is not True
            or not isinstance(rationale, str)
            or len(rationale.strip()) < 20
        ):
            raise ValueError("allow-unrestricted-host Policy requires explicit acceptance and a rationale")
    else:
        raise ValueError("Promotion Policy execution_environment strategy is unsupported")
    return policy


def evaluate_promotion(
    baseline: dict[str, Any],
    candidate: dict[str, Any],
    policy: dict[str, Any],
) -> dict[str, Any]:
    historical = any(
        summary.get("job_kind") == "historical-generation-evaluation"
        or (summary.get("evaluation_context") or {}).get("protocol")
        in {
            "historical-generation-evaluation-context/v1",
            "historical-generation-evaluation-context/v2",
            "historical-generation-evaluation-context/v3",
        }
        for summary in (baseline, candidate)
    )
    if historical:
        return {
            "schema_version": 2,
            "decision": "REJECT",
            "baseline_job": baseline.get("job"),
            "candidate_job": candidate.get("job"),
            "baseline_candidate": baseline.get("candidate") or {},
            "candidate": candidate.get("candidate") or {},
            "policy": {
                "policy_id": policy.get("policy_id"),
                "version": policy.get("version"),
            },
            "policy_digest": canonical_digest(
                policy, namespace="harbor-dsh-promotion-policy-v2"
            ),
            "policy_snapshot": policy,
            "baseline_metrics": baseline.get("metrics") or {},
            "candidate_metrics": candidate.get("metrics") or {},
            "metric_deltas": {},
            "population": {
                "baseline": baseline.get("n_trials", 0),
                "candidate": candidate.get("n_trials", 0),
                "baseline_valid": baseline.get("n_valid_scores"),
                "candidate_valid": candidate.get("n_valid_scores"),
            },
            "improved_trials": [],
            "regressed_trials": [],
            "new_exceptions": [],
            "artifact_regressions": [],
            "comparable": False,
            "gate_eligible": False,
            "reasons": [
                {
                    "code": "UNSUPPORTED_JOB_KIND_FOR_PROMOTION",
                    "message": "Historical Generation Evaluation is diagnostic-only and cannot enter a Candidate Promotion Gate.",
                }
            ],
        }
    reasons: list[dict[str, str]] = []

    def reject(code: str, message: str) -> None:
        if not any(item["code"] == code for item in reasons):
            reasons.append({"code": code, "message": message})

    if policy.get("diagnostic_only") is True:
        reject(
            "DIAGNOSTIC_ONLY_POLICY",
            "A quick diagnostic Policy cannot promote a Candidate; create an accepted formal Promotion Policy.",
        )

    baseline_candidate = baseline.get("candidate") or {}
    candidate_identity = candidate.get("candidate") or {}
    if baseline_candidate.get("candidate_id") != candidate_identity.get("candidate_id"):
        reject("CANDIDATE_PRODUCT_MISMATCH", "Baseline and Candidate are different Agent product lines")
    if not baseline_candidate.get("digest") or not candidate_identity.get("digest"):
        reject("CANDIDATE_IDENTITY_MISSING", "Candidate identity is missing")
    elif baseline_candidate["digest"] == candidate_identity["digest"]:
        reject("CANDIDATE_DIGEST_UNCHANGED", "Candidate digest is unchanged")

    base_context = baseline.get("evaluation_context") or {}
    next_context = candidate.get("evaluation_context") or {}
    if base_context.get("schema_version") != 3 or next_context.get("schema_version") != 3:
        reject("EVALUATION_CONTEXT_SCHEMA_INVALID", "Both Jobs require Evaluation Context v3")
    if base_context.get("mode") != "promotion-eligible" or next_context.get("mode") != "promotion-eligible":
        reject("JOB_MODE_NOT_PROMOTION_ELIGIBLE", "Both Jobs must be promotion-eligible")
    base_dataset = base_context.get("dataset") or {}
    next_dataset = next_context.get("dataset") or {}
    if base_dataset.get("promotion_eligible") is False or next_dataset.get("promotion_eligible") is False:
        reject("DATASET_NOT_PROMOTION_ELIGIBLE", "A reviewed Historical badcase draft cannot enter Gate until deterministic expectations or independent Ground Truth are supplied")
    if base_dataset.get("dataset_id") != next_dataset.get("dataset_id") or base_dataset.get("version") != next_dataset.get("version"):
        reject("DATASET_VERSION_MISMATCH", "Dataset id or version changed")
    if base_dataset.get("source_digest") != next_dataset.get("source_digest"):
        reject("DATASET_SOURCE_MISMATCH", "Dataset source digest changed")
    base_stack = base_context.get("evaluation_stack") or {}
    next_stack = next_context.get("evaluation_stack") or {}
    base_components = base_stack.get("components") or {}
    next_components = next_stack.get("components") or {}
    role_codes = {
        "integration": "INTEGRATION_MISMATCH",
        "renderer": "RENDERER_MISMATCH",
        "evaluator": "EVALUATOR_MISMATCH",
        "rubric": "RUBRIC_MISMATCH",
        "runner": "RUNNER_SEMANTICS_MISMATCH",
    }
    for role, code in role_codes.items():
        old = base_components.get(role) or {}
        new = next_components.get(role) or {}
        if old.get("reward_affecting") or new.get("reward_affecting"):
            if old.get("digest") != new.get("digest") or old.get("version") != new.get("version"):
                reject(code, f"Reward-affecting {role} identity changed")
    if base_stack.get("judge") != next_stack.get("judge"):
        reject("JUDGE_MODEL_MISMATCH", "Judge provider, model, version, or parameters changed")
    base_environment = base_context.get("execution_environment") or {}
    next_environment = next_context.get("execution_environment") or {}
    if base_environment.get("runtime_fingerprint") != next_environment.get("runtime_fingerprint"):
        reject("EXECUTION_ENVIRONMENT_MISMATCH", "Execution environment or Host runtime identity changed")
    environment_policy = policy["execution_environment"]
    for label, environment in (("Baseline", base_environment), ("Candidate", next_environment)):
        kind = environment.get("kind")
        if kind not in {"host", "docker"}:
            reject("EXECUTION_ENVIRONMENT_INVALID", f"{label} does not record a supported execution environment kind")
            continue
        if environment_policy.get("strategy") == "docker-required" and kind != "docker":
            reject("DOCKER_EXECUTION_REQUIRED", f"{label} did not run in the Docker isolation boundary required by Policy")
        if kind == "host" and environment_policy.get("strategy") != "allow-unrestricted-host":
            reject("HOST_EXECUTION_RISK_NOT_ACCEPTED", f"{label} ran without isolation and the Policy does not explicitly accept unrestricted Host execution")
        if (
            kind == "docker"
            and environment_policy.get("strategy") == "docker-required"
            and environment_policy.get("require_image_identity") is True
            and not environment.get("image_identity")
        ):
            reject("DOCKER_IMAGE_IDENTITY_MISSING", f"{label} does not record the immutable Docker image identity required by Policy")
    if not base_context.get("digest") or base_context.get("digest") != next_context.get("digest"):
        reject("EVALUATION_STACK_MISMATCH", "Evaluation contexts are not comparable")
    if not baseline.get("_measurement_digest") or baseline.get("_measurement_digest") != candidate.get("_measurement_digest"):
        reject("EVALUATION_SPEC_MISMATCH", "Baseline and Candidate use different Dataset/Generator/Evaluator/Metric/repeat measurement identities")
    if not baseline.get("_contract_digest") or baseline.get("_contract_digest") != candidate.get("_contract_digest"):
        reject("EVALUATION_CONTRACT_MISMATCH", "Baseline and Candidate use different Evaluation Contract semantics")

    for label, summary in (("Baseline", baseline), ("Candidate", candidate)):
        if summary.get("_job_bundle_error"):
            reject("JOB_BUNDLE_INTEGRITY_FAILED", f"{label} Job bundle is unsealed or changed: {summary['_job_bundle_error']}")
        effective = summary.get("effective_evaluator") or {}
        configured = effective.get("configured") or {}
        materialized = effective.get("materialized") or {}
        executed = effective.get("executed") or {}
        identity_keys = ("id", "version", "portable_digest")
        identity_verified = (
            effective.get("identity_match") is True
            and all(configured.get(key) and configured.get(key) == materialized.get(key) == executed.get(key) for key in identity_keys)
            and (effective.get("execution") or {}).get("status") == "succeeded"
        )
        if not identity_verified:
            reject("EFFECTIVE_EVALUATOR_UNVERIFIED", f"{label} does not have a verified executed Evaluator identity")
        if summary.get("n_infrastructure_exceptions", summary.get("n_exceptions", 0)):
            reject("INFRASTRUCTURE_EXCEPTION_PRESENT", f"{label} contains infrastructure exceptions")
        validation = summary.get("artifact_validation") or {}
        if not validation.get("valid", False) or not summary.get("_identity_artifacts_valid", False):
            reject("ARTIFACT_SCHEMA_INVALID", f"{label} contains schema-invalid artifacts")
        doctor = summary.get("_architecture_doctor") or {}
        if not doctor.get("promotion_ready", False):
            reject("ARCHITECTURE_DOCTOR_FAILED", f"{label} did not pass Architecture Doctor")
        if int(summary.get("n_invalid_scores", 0)) > 0:
            reject("INVALID_QUALITY_SCORE_PRESENT", f"{label} contains invalid Candidate quality scores")
        if int(summary.get("n_valid_scores", summary.get("n_trials", 0))) <= 0:
            reject("NO_VALID_QUALITY_SCORE", f"{label} has no valid Candidate quality score")
        if int(summary.get("n_discovered_trials", summary.get("n_trials", 0))) != int(summary.get("n_trials", 0)):
            reject("TRIAL_COVERAGE_INCOMPLETE", f"{label} does not cover the complete Dataset population")

    baseline_metrics = baseline.get("metrics") or {}
    candidate_metrics = candidate.get("metrics") or {}
    primary = policy["primary_metric"]
    old_primary = baseline_metrics.get(primary)
    new_primary = candidate_metrics.get(primary)
    if not _is_number(old_primary) or not _is_number(new_primary):
        reject("PRIMARY_METRIC_MISSING", f"Primary metric {primary!r} is missing")
    else:
        direction = policy["primary_direction"]
        improvement = new_primary - old_primary if direction == "maximize" else old_primary - new_primary
        if direction not in {"maximize", "minimize"}:
            reject("PRIMARY_METRIC_DIRECTION_INVALID", "primary_direction must be maximize or minimize")
        elif improvement < float(policy.get("min_improvement", 0)):
            reject("PRIMARY_METRIC_BELOW_DELTA", f"{primary} improvement is below the required delta")

    for metric, minimum in (policy.get("minimums") or {}).items():
        value = candidate_metrics.get(metric)
        if not _is_number(value) or value < float(minimum):
            reject("METRIC_MINIMUM_FAILED", f"{metric} is below minimum {minimum}")
    for metric, maximum in (policy.get("maximums") or {}).items():
        value = candidate_metrics.get(metric)
        if not _is_number(value) or value > float(maximum):
            reject("METRIC_MAXIMUM_FAILED", f"{metric} is above maximum {maximum}")
    tolerance = float(policy.get("non_regression_tolerance", 0))
    for metric in policy.get("non_regression") or []:
        old = baseline_metrics.get(metric)
        new = candidate_metrics.get(metric)
        if not _is_number(old) or not _is_number(new):
            reject("NON_REGRESSION_METRIC_MISSING", f"Non-regression metric {metric!r} is missing")
        else:
            direction = (policy.get("metric_directions") or {}).get(metric, "maximize")
            regressed = new + tolerance < old if direction == "maximize" else new - tolerance > old
            if regressed:
                reject("NON_REGRESSION_FAILED", f"{metric} regressed from {old:.6g} to {new:.6g}")

    baseline_trials = {
        str(item.get("datasetTrial") or item.get("name") or item.get("id")): item
        for item in baseline.get("trials") or []
    }
    candidate_trials = {
        str(item.get("datasetTrial") or item.get("name") or item.get("id")): item
        for item in candidate.get("trials") or []
    }
    improved_trials: list[dict[str, Any]] = []
    regressed_trials: list[dict[str, Any]] = []
    direction = policy.get("primary_direction", "maximize")
    for trial_id in sorted(set(baseline_trials) & set(candidate_trials)):
        old = (baseline_trials[trial_id].get("score") or {}).get("value")
        new = (candidate_trials[trial_id].get("score") or {}).get("value")
        if not _is_number(old) or not _is_number(new) or old == new:
            continue
        delta = new - old
        item = {"trial": trial_id, "baseline": old, "candidate": new, "delta": delta}
        improved = delta > 0 if direction == "maximize" else delta < 0
        (improved_trials if improved else regressed_trials).append(item)
    baseline_exception_trials = {str(item.get("trial")) for item in baseline.get("exceptions") or []}
    new_exceptions = [
        item for item in candidate.get("exceptions") or []
        if str(item.get("trial")) not in baseline_exception_trials
    ]
    artifact_regressions = []
    if (baseline.get("artifact_validation") or {}).get("valid") and not (candidate.get("artifact_validation") or {}).get("valid"):
        artifact_regressions.append("candidate-artifact-validation")

    return {
        "schema_version": 2,
        "decision": "PROMOTE" if not reasons else "REJECT",
        "baseline_job": baseline.get("job"),
        "candidate_job": candidate.get("job"),
        "baseline_candidate": baseline_candidate,
        "candidate": candidate_identity,
        "baseline_evaluation_context": base_context,
        "candidate_evaluation_context": next_context,
        "policy": {"policy_id": policy["policy_id"], "version": policy["version"]},
        "policy_digest": canonical_digest(policy, namespace="harbor-dsh-promotion-policy-v2"),
        "policy_snapshot": policy,
        "baseline_metrics": baseline_metrics,
        "candidate_metrics": candidate_metrics,
        "metric_deltas": {
            key: candidate_metrics[key] - baseline_metrics[key]
            for key in sorted(set(baseline_metrics) & set(candidate_metrics))
            if _is_number(baseline_metrics[key]) and _is_number(candidate_metrics[key])
        },
        "population": {
            "baseline": baseline.get("n_trials", 0),
            "candidate": candidate.get("n_trials", 0),
            "baseline_valid": baseline.get("n_valid_scores"),
            "candidate_valid": candidate.get("n_valid_scores"),
        },
        "improved_trials": improved_trials,
        "regressed_trials": regressed_trials,
        "new_exceptions": new_exceptions,
        "artifact_regressions": artifact_regressions,
        "comparable": not any(
            reason["code"].endswith("MISMATCH")
            or reason["code"] in {"EVALUATION_CONTEXT_SCHEMA_INVALID", "EVALUATION_STACK_MISMATCH"}
            for reason in reasons
        ),
        "gate_eligible": not reasons,
        "reasons": reasons,
    }


def _gate_summary(job_dir: Path) -> dict[str, Any]:
    job_dir = job_dir.expanduser().resolve(strict=True)
    summary = load_or_create_summary(job_dir)
    summary["_measurement_digest"] = None
    summary["_contract_digest"] = None
    try:
        verify_job_bundle(job_dir)
        evaluation_spec = json.loads((job_dir / "evaluation-spec.json").read_text())
        evaluation_contract = json.loads((job_dir / "evaluation-contract.json").read_text())
        measurement_digest = evaluation_spec.get("measurement_digest")
        if not isinstance(measurement_digest, str) or not measurement_digest.startswith("sha256:"):
            raise ValueError("EVALUATION_SPEC_MEASUREMENT_IDENTITY_MISSING")
        summary["_measurement_digest"] = measurement_digest
        summary["_contract_digest"] = canonical_digest(evaluation_contract, namespace="harbor-dsh-evaluation-contract-v1")
        recomputed = summarize_job(job_dir)
        invariant_keys = (
            "candidate", "dataset", "evaluation_context", "artifact_validation",
            "n_trials", "n_discovered_trials", "n_valid_scores", "n_invalid_scores",
            "n_infrastructure_exceptions", "n_evaluation_exceptions", "status_counts",
            "metrics", "trials", "effective_evaluator", "coverage",
        )
        stored_invariants = {key: summary.get(key) for key in invariant_keys}
        recomputed_invariants = {key: recomputed.get(key) for key in invariant_keys}
        if stored_invariants != recomputed_invariants:
            raise ValueError("JOB_SUMMARY_INVARIANT_MISMATCH")
        summary["_job_bundle_error"] = None
    except (OSError, ValueError, json.JSONDecodeError) as error:
        summary["_job_bundle_error"] = str(error)
    required = (
        "candidate-manifest.json",
        "dataset-manifest.json",
        "evaluation-stack-manifest.json",
        "evaluation-context.json",
        "evaluation-spec.json",
        "architecture-doctor.json",
        "evaluation-contract.json",
        "population-report.json",
    )
    summary["_identity_artifacts_valid"] = all((job_dir / name).is_file() for name in required)
    doctor_path = job_dir / "architecture-doctor.json"
    try:
        summary["_architecture_doctor"] = json.loads(doctor_path.read_text())
    except (OSError, json.JSONDecodeError):
        summary["_architecture_doctor"] = None
    return summary


def compare_jobs(baseline_job: Path, candidate_job: Path, policy_path: Path) -> dict[str, Any]:
    return evaluate_promotion(
        _gate_summary(baseline_job),
        _gate_summary(candidate_job),
        load_policy(policy_path),
    )


def write_report(report: dict[str, Any], output: Path) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise FileExistsError("PROMOTION_REPORT_ALREADY_EXISTS: Gate decisions are immutable; use a new output path")
    sealed = dict(report)
    sealed["report_digest"] = canonical_digest(sealed, namespace="harbor-dsh-promotion-report-v2")
    with output.open("x", encoding="utf-8") as destination:
        destination.write(json.dumps(sealed, ensure_ascii=False, indent=2) + "\n")
    output.chmod(0o444)
    return output
