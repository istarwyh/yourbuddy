"""Versioned metric templates and evidence requirements for user-facing evaluation."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


_STATUS_POLICY = {
    "not_applicable": "exclude",
    "insufficient_evidence": "abstain",
    "evaluation_error": "invalidate",
}

GENERAL_AGENT_SESSION_V1: dict[str, Any] = {
    "schema_version": 1,
    "protocol": "metric-template/v1",
    "template_id": "general-agent-session",
    "version": "1.0.0",
    "description": "Experience-oriented signals for an already completed DSH Agent session; not a business-quality standard.",
    "criteria": [
        {
            "id": "goal_progress",
            "label": "Goal progress",
            "direction": "maximize",
            "scale": [0, 0.5, 1],
            "required": True,
            "applicability": {"task_kinds": ["dsh-session"]},
            "evidence_requirements": ["initial_user_goal", "assistant_output"],
            "status_policy": _STATUS_POLICY,
            "quality_affecting": True,
            "weight": 1,
        },
        {
            "id": "execution_reliability",
            "label": "Execution reliability",
            "direction": "maximize",
            "scale": [0, 0.5, 1],
            "required": True,
            "applicability": {"task_kinds": ["dsh-session"], "when": "task includes execution or tool use"},
            "evidence_requirements": ["tool_outcome_or_artifact"],
            "status_policy": _STATUS_POLICY,
            "quality_affecting": True,
            "weight": 1,
        },
        {
            "id": "evidence_alignment",
            "label": "Evidence alignment",
            "direction": "maximize",
            "scale": [0, 0.5, 1],
            "required": True,
            "applicability": {"task_kinds": ["dsh-session"], "when": "assistant makes verifiable completion claims"},
            "evidence_requirements": ["assistant_claim", "tool_outcome_or_artifact"],
            "status_policy": _STATUS_POLICY,
            "quality_affecting": True,
            "weight": 1,
        },
        {
            "id": "interaction_quality",
            "label": "Interaction quality",
            "direction": "maximize",
            "scale": [0, 0.5, 1],
            "required": True,
            "applicability": {"task_kinds": ["dsh-session"]},
            "evidence_requirements": ["user_message", "assistant_output"],
            "status_policy": _STATUS_POLICY,
            "quality_affecting": True,
            "weight": 1,
        },
    ],
    "aggregation": {"method": "weighted-mean", "minimum_required_coverage": 1.0},
}

_TEMPLATES = {"general-agent-session@1": GENERAL_AGENT_SESSION_V1}


def validate_metric_template(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("schema_version") != 1 or value.get("protocol") != "metric-template/v1":
        raise ValueError("Metric Template must use metric-template/v1")
    if not str(value.get("template_id") or "").strip() or not str(value.get("version") or "").strip():
        raise ValueError("Metric Template requires template_id and version")
    criteria = value.get("criteria")
    if not isinstance(criteria, list) or not criteria:
        raise ValueError("Metric Template requires at least one Criterion")
    seen: set[str] = set()
    for criterion in criteria:
        if not isinstance(criterion, dict):
            raise ValueError("Metric Template criteria must be objects")
        criterion_id = str(criterion.get("id") or "").strip()
        if not criterion_id or criterion_id in seen:
            raise ValueError("Metric Template criterion ids must be non-empty and unique")
        seen.add(criterion_id)
        if criterion.get("scale") != [0, 0.5, 1] or criterion.get("direction") not in {"maximize", "minimize"}:
            raise ValueError(f"Metric Template Criterion {criterion_id} has an unsupported scale or direction")
        if not isinstance(criterion.get("required"), bool) or not isinstance(criterion.get("quality_affecting"), bool):
            raise ValueError(f"Metric Template Criterion {criterion_id} requires boolean policy fields")
        applicability = criterion.get("applicability")
        if not isinstance(applicability, dict) or not applicability.get("task_kinds"):
            raise ValueError(f"Metric Template Criterion {criterion_id} requires applicability")
        requirements = criterion.get("evidence_requirements")
        if not isinstance(requirements, list) or not requirements or not all(isinstance(item, str) and item for item in requirements):
            raise ValueError(f"Metric Template Criterion {criterion_id} requires evidence requirements")
        if criterion.get("status_policy") != _STATUS_POLICY:
            raise ValueError(f"Metric Template Criterion {criterion_id} has an unsupported status policy")
    aggregation = value.get("aggregation")
    coverage = aggregation.get("minimum_required_coverage") if isinstance(aggregation, dict) else None
    if aggregation is None or aggregation.get("method") not in {"mean", "weighted-mean"} or not isinstance(coverage, (int, float)) or isinstance(coverage, bool) or not 0 <= coverage <= 1:
        raise ValueError("Metric Template aggregation is invalid")
    return value


def load_metric_template(reference: str) -> dict[str, Any]:
    try:
        template = _TEMPLATES[reference]
    except KeyError as error:
        raise ValueError(f"Unknown Metric Template: {reference}") from error
    return validate_metric_template(deepcopy(template))


def evaluator_criteria(reference: str) -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "label": item["label"],
            "values": item["scale"],
            "required": item["required"],
            "direction": item["direction"],
            "applicability": item["applicability"],
            "evidence_requirements": item["evidence_requirements"],
            "status_policy": item["status_policy"],
            "quality_affecting": item["quality_affecting"],
            "weight": item.get("weight", 1),
        }
        for item in load_metric_template(reference)["criteria"]
    ]
