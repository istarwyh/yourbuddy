from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

from harbor_dsh_evolution.dataset import MANIFEST_NAME, snapshot_dataset, validate_dataset
from harbor_dsh_evolution.identity import resolve_inside


ROLE_PATHS = {
    "integration": "integrations/default.py",
    "renderer": "renderers/default.py",
    "evaluator": "evaluators/default/evaluator.json",
    "rubric": "evaluators/default/rubric.md",
    "diagnoser": "diagnosers/default.py",
    "optimizer": "optimizers/default.py",
    "runner": "runners/harbor.py",
    "reporter": "reporters/default.py",
}


def _write_new(path: Path, content: str, created: list[str], existing: list[str], root: Path) -> None:
    relative = path.relative_to(root).as_posix()
    if path.exists():
        existing.append(relative)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    created.append(relative)


def initialize_project(
    *,
    project_root: Path,
    dataset_path: Path,
    stack_id: str,
    stack_version: str,
    dataset_id: str,
    dataset_version: str,
    contract_id: str,
    contract_version: str,
    primary_metric: str,
    primary_direction: str,
    judge_provider: str,
    judge_model: str,
    judge_version: str,
    policy_id: str,
    policy_version: str,
    min_improvement: float,
    workspace_subdir: str | Path = ".",
) -> dict[str, Any]:
    project_root = project_root.expanduser().resolve(strict=True)
    dataset_path = resolve_inside(project_root, dataset_path, label="dataset")
    requested_workspace = Path(workspace_subdir).expanduser()
    workspace_root = (
        requested_workspace if requested_workspace.is_absolute() else project_root / requested_workspace
    ).resolve()
    if workspace_root != project_root and project_root not in workspace_root.parents:
        raise ValueError(
            "WORKSPACE_OUTSIDE_PROJECT_ROOT: workspace_subdir must stay under project_root"
        )
    stack_path = workspace_root / ".harbor" / "evaluation-stack.yml"
    if stack_path.is_file():
        try:
            existing_stack = yaml.safe_load(stack_path.read_text())
        except (OSError, yaml.YAMLError) as error:
            raise ValueError(f"STACK_EXISTING_INVALID: {stack_path}: {error}") from error
        existing_id = existing_stack.get("stack_id") if isinstance(existing_stack, dict) else None
        if existing_id != stack_id:
            raise ValueError(
                "STACK_ALREADY_EXISTS_DIFFERENT_ID: "
                f"{stack_path} contains stack_id={existing_id!r}, requested={stack_id!r}. "
                "Choose a different --workspace-subdir (for example harbor-projects/<stack-id>) "
                "or explicitly update the existing Stack instead of reinitializing it."
            )
    if primary_direction not in {"maximize", "minimize"}:
        raise ValueError("primary_direction must be maximize or minimize")
    required = {
        "stack_id": stack_id,
        "stack_version": stack_version,
        "dataset_id": dataset_id,
        "dataset_version": dataset_version,
        "contract_id": contract_id,
        "contract_version": contract_version,
        "primary_metric": primary_metric,
        "judge_provider": judge_provider,
        "judge_model": judge_model,
        "judge_version": judge_version,
        "policy_id": policy_id,
        "policy_version": policy_version,
    }
    missing = [key for key, value in required.items() if not value.strip()]
    if missing:
        raise ValueError(f"Initialization requires: {', '.join(missing)}")

    created: list[str] = []
    existing: list[str] = []
    for directory in ("candidates", "datasets", "integrations", "renderers", "evaluators", "rubrics", "diagnosers", "optimizers", "reporters", "runners", "policies", "jobs", ".harbor"):
        (workspace_root / directory).mkdir(parents=True, exist_ok=True)

    evaluator_id = f"{stack_id}-evaluator"
    evaluator_implementation = '''"""Implement the strict Harbor Evaluator and its input builder for this business domain."""

import json
from pathlib import Path


def build_input(context):
    """Build evaluation-input/v2 from immutable Task and Agent artifacts."""
    trajectory_path = Path(context["agent_log_dir"]) / "trajectory.json"
    trajectory = json.loads(trajectory_path.read_text()) if trajectory_path.is_file() else {}
    messages = [
        step.get("message")
        for step in trajectory.get("steps", [])
        if isinstance(step, dict) and isinstance(step.get("message"), str)
    ]
    return {
        "schema_version": 2,
        "protocol": "evaluation-input/v2",
        "task": {"root": context["task_root"]},
        "candidate_output": messages[-1] if messages else None,
        "evidence": {"trajectory": trajectory},
    }


def evaluate(payload):
    return {
        "schema_version": 2,
        "protocol": "evaluation-result/v2",
        "criteria": [
            {
                "id": "quality",
                "status": "evaluation-error",
                "score": None,
                "reason": "The initialized Evaluator is a fail-closed placeholder.",
                "recommendation": "Implement and independently review the accepted business Rubric before running a formal Job.",
                "evidence_refs": ["evaluator-placeholder"],
            },
        ],
        "aggregate": {
            "metric_id": "__PRIMARY_METRIC__",
            "value": None,
            "scored_criteria": 0,
            "total_criteria": 1,
            "coverage": 0.0,
        },
    }
'''.replace("__PRIMARY_METRIC__", primary_metric)
    _write_new(workspace_root / "evaluators/default/evaluator.py", evaluator_implementation, created, existing, project_root)

    for role, relative in ROLE_PATHS.items():
        if role == "rubric":
            content = f"# {contract_id}\n\nDefine the evidence-backed rubric for `{primary_metric}` here.\n"
        elif role == "evaluator":
            content = json.dumps(
                {
                    "schema_version": 2,
                    "interface": "harbor-dsh-evaluator/v2",
                    "evaluator_id": evaluator_id,
                    "version": stack_version,
                    "kind": "script",
                    "protocol": {"input": "evaluation-input/v2", "output": "evaluation-result/v2"},
                    "implementation": {"entry": "evaluator.py", "language": "python", "callable": "evaluate"},
                    "input_builder": {"entry": "evaluator.py", "callable": "build_input"},
                    "editable_files": [
                        {"path": "evaluator.py", "role": "implementation", "language": "python", "affects": ["evaluator"]},
                        {"path": "rubric.md", "role": "rubric", "language": "markdown", "affects": ["evaluator", "rubric"]},
                    ],
                    "bundle_files": [
                        {"path": "evaluator.py", "role": "implementation"},
                        {"path": "rubric.md", "role": "rubric"},
                    ],
                    "criteria": [{"id": "quality", "label": "Quality", "values": [0, 0.5, 1], "required": True}],
                    "aggregate": {"metric_id": primary_metric, "method": "mean", "minimum_coverage": 1.0},
                },
                ensure_ascii=False,
                indent=2,
            ) + "\n"
        elif role == "runner":
            content = '"""Harbor orchestration only. Keep HTTP, rubric, judge, and promotion outside this Runner."""\n\nROLE = "runner"\n'
        else:
            content = f'"""Replace with the project-specific {role} implementation."""\n\nROLE = "{role}"\n'
        _write_new(workspace_root / relative, content, created, existing, project_root)

    if not (dataset_path / MANIFEST_NAME).exists():
        snapshot_dataset(dataset_path, dataset_id=dataset_id, version=dataset_version)
        created.append((dataset_path / MANIFEST_NAME).relative_to(project_root).as_posix())
    validation = validate_dataset(dataset_path, project_root=project_root)
    if not validation.valid:
        raise ValueError("Dataset initialization failed validation: " + ", ".join(item["code"] for item in validation.findings))

    workspace_relative = workspace_root.relative_to(project_root)
    component_entries = {
        role: (workspace_relative / relative).as_posix()
        for role, relative in ROLE_PATHS.items()
    }
    components = {
        role: {"id": f"{stack_id}-{role}", "version": stack_version, "entry": component_entries[role], **({"semantic": False} if role == "runner" else {})}
        for role, relative in ROLE_PATHS.items()
    }
    stack = {
        "schema_version": 1,
        "stack_id": stack_id,
        "version": stack_version,
        "components": components,
        "judge": {"provider": judge_provider, "model": judge_model, "version": judge_version, "parameters": {}},
        "evaluation_contract": {
            "contract_id": contract_id,
            "version": contract_version,
            "primary_metric": primary_metric,
            "metrics": [
                {"id": primary_metric, "label": primary_metric, "direction": primary_direction},
                {"id": "quality", "label": "Quality", "direction": primary_direction},
            ],
            "groups": [],
            "hard_requirements": [
                {"id": "input_integrity"},
                {"id": "agent_completed"},
                {"id": "integration_valid"},
                {"id": "renderer_valid"},
                {"id": "judge_completed"},
                {"id": "evaluator_identity_match"},
                {"id": "artifact_schema_valid"},
            ],
        },
        "labels": {},
    }
    _write_new(stack_path, yaml.safe_dump(stack, sort_keys=False, allow_unicode=True), created, existing, project_root)
    dataset_relative = dataset_path.relative_to(project_root).as_posix()
    stack_relative = stack_path.relative_to(project_root).as_posix()
    evolution = {
        "schema_version": 1,
        "stack": stack_relative,
        "dataset": dataset_relative,
        "jobs": (workspace_relative / "jobs").as_posix(),
        "promotion_policy": (workspace_relative / "policies/promotion.json").as_posix(),
        "candidate_root": (workspace_relative / "candidates").as_posix(),
    }
    _write_new(workspace_root / ".harbor/evolution.yml", yaml.safe_dump(evolution, sort_keys=False), created, existing, project_root)
    workspace_descriptor = {
        "schema_version": 1,
        "workspace_id": stack_id,
        "path_base": "workspace",
        "workspace_root": ".",
        "stack": ".harbor/evaluation-stack.yml",
        "jobs": "jobs",
        "promotion_policy": "policies/promotion.json",
        "candidate_root": "candidates",
        "meta_artifact_index": ".harbor/meta-artifacts.json",
    }
    _write_new(
        workspace_root / ".harbor/workspace.json",
        json.dumps(workspace_descriptor, ensure_ascii=False, indent=2) + "\n",
        created,
        existing,
        project_root,
    )
    policy = {
        "schema_version": 2,
        "policy_id": policy_id,
        "version": policy_version,
        "primary_metric": primary_metric,
        "primary_direction": primary_direction,
        "min_improvement": min_improvement,
        "minimums": {},
        "maximums": {},
        "non_regression": [],
        "metric_directions": {primary_metric: primary_direction},
        "non_regression_tolerance": 0,
        "hard_requirements": ["exception_free", "artifact_schema_valid", "doctor_error_free"],
        "execution_environment": {
            "strategy": "docker-required",
            "require_image_identity": True,
        },
    }
    _write_new(workspace_root / "policies/promotion.json", json.dumps(policy, ensure_ascii=False, indent=2) + "\n", created, existing, project_root)
    return {
        "schema_version": 1,
        "initialized": True,
        "project_root": str(project_root),
        "workspace": workspace_relative.as_posix(),
        "stack_path": stack_relative,
        "created": created,
        "preserved": existing,
        "dataset_validation": validation.to_dict(),
        "next_actions": [
            "Replace placeholder stack components with business implementations",
            "Add diagnostic and non-regression metrics to the Evaluation Contract and Promotion Policy",
            "Run harbor-dsh doctor --architecture before the first promotion-eligible Job",
        ],
    }
