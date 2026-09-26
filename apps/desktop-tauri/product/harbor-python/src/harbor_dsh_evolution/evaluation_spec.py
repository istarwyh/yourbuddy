"""Stable user-level projection of the strict executable evaluation architecture."""

from __future__ import annotations

from typing import Any

from harbor_dsh_evolution.identity import canonical_digest


def _evaluator_identity(stack: dict[str, Any]) -> dict[str, Any]:
    component = (stack.get("components") or {}).get("evaluator") or {}
    interface = component.get("interface") or {}
    portable = interface.get("portable_digest") or component.get("portable_digest")
    identity = {
        "id": str(component.get("id") or interface.get("evaluator_id") or ""),
        "version": str(component.get("version") or interface.get("version") or ""),
        "portable_digest": str(portable or ""),
        "metric_template": None,
    }
    descriptor_template = interface.get("metric_template")
    if isinstance(descriptor_template, dict):
        identity["metric_template"] = f"{descriptor_template.get('id')}@{descriptor_template.get('version')}"
    if not identity["id"] or not identity["version"] or not identity["portable_digest"].startswith("sha256:"):
        raise ValueError("Evaluation Spec requires the exact portable Evaluator identity")
    return identity


def build_evaluation_spec(
    *,
    context: dict[str, Any],
    stack: dict[str, Any],
    repeats: int = 1,
    seed_policy: str = "harbor-managed",
    seed: int | str | None = None,
) -> dict[str, Any]:
    if not isinstance(repeats, int) or isinstance(repeats, bool) or not 1 <= repeats <= 10:
        raise ValueError("Evaluation Spec repeats must be an integer from 1 through 10")
    if seed_policy not in {"observed-record", "harbor-managed", "fixed"}:
        raise ValueError("Evaluation Spec seed_policy is invalid")
    if seed_policy == "fixed" and seed is None:
        raise ValueError("Evaluation Spec fixed seed_policy requires a seed")
    profile = str(context.get("artifact_profile") or ("governed" if context.get("mode") == "promotion-eligible" else "experiment"))
    historical = context.get("job_kind") == "historical-generation-evaluation"
    dataset_source = context.get("dataset") or {}
    dataset = {
        "id": str(dataset_source.get("dataset_id") or ""),
        "version": str(dataset_source.get("version") or ""),
        "digest": str(dataset_source.get("source_digest") or ""),
    }
    if historical:
        target = context.get("evaluation_target") or {}
        generator = {
            "kind": "dsh-session",
            "id": str(target.get("batch_id") or "historical-sessions"),
            "version": str(target.get("observation_protocol") or "dsh-session-observation/v1"),
            "digest": str(target.get("digest") or ""),
        }
        mode = "experience-diagnostic"
    else:
        source = context.get("candidate") or {}
        generator = {
            "kind": "candidate",
            "id": str(source.get("candidate_id") or ""),
            "version": str(source.get("version") or ""),
            "digest": str(source.get("digest") or ""),
        }
        mode = profile
    evaluator = _evaluator_identity(stack)
    contract = stack.get("evaluation_contract") or {}
    metrics = {
        "primary": contract.get("primary_metric"),
        "definitions": list(contract.get("metrics") or []),
    }
    optimizer_component = (stack.get("components") or {}).get("optimizer") or {}
    optimizer = {
        "kind": str(optimizer_component.get("id") or "dsh-agent"),
        "enabled": bool(optimizer_component),
    }
    repeat_policy = {"repeats": repeats, "seed_policy": seed_policy, "seed": seed}
    measurement = {
        "dataset": dataset,
        "evaluator": evaluator,
        "metrics": metrics,
        "judge": stack.get("judge") or {},
        "repeat_policy": repeat_policy,
    }
    spec: dict[str, Any] = {
        "schema_version": 1,
        "protocol": "evaluation-spec/v1",
        "evaluation_id": f"{stack.get('stack_id', 'evaluation')}@{stack.get('version', 'unknown')}",
        "mode": mode,
        "artifact_profile": profile,
        "dataset": dataset,
        "generator": generator,
        "evaluator": evaluator,
        "metrics": metrics,
        "optimizer": optimizer,
        "repeat_policy": repeat_policy,
        "measurement_digest": canonical_digest(measurement, namespace="harbor-dsh-evaluation-measurement-v1"),
    }
    spec["digest"] = canonical_digest(spec, namespace="harbor-dsh-evaluation-spec-v1")
    return spec
