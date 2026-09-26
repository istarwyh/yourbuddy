"""Human-confirmed conversion of Historical findings into a regression Dataset draft."""

from __future__ import annotations

import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

from harbor_dsh_evolution.dataset import snapshot_dataset
from harbor_dsh_evolution.identity import canonical_digest, resolve_inside
from harbor_dsh_evolution.job_seal import verify_job_bundle

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def _output_inside(project_root: Path, output: Path) -> Path:
    requested = output.expanduser()
    if not requested.is_absolute():
        requested = project_root / requested
    candidate = requested.resolve(strict=False)
    if candidate != project_root and project_root not in candidate.parents:
        raise ValueError("badcase Dataset output must stay under the project root")
    return candidate


def _assessment_map(job_dir: Path, seal: dict[str, Any]) -> dict[str, Path]:
    values: dict[str, Path] = {}
    sealed_paths = {str(item.get("path")) for item in seal.get("artifacts") or [] if isinstance(item, dict)}
    for path in sorted((job_dir / "trial-assessments").glob("*.json")):
        relative = path.relative_to(job_dir).as_posix()
        if path.is_symlink() or not path.is_file() or relative not in sealed_paths:
            raise ValueError(f"Historical assessment is not a sealed regular file: {relative}")
        value = json.loads(path.read_text())
        for identity in (value.get("trial_id"), (value.get("evaluation_target") or {}).get("record_id"), value.get("dataset_trial")):
            if identity:
                alias = str(identity)
                if alias in values and values[alias] != path:
                    raise ValueError(f"Historical assessment alias is ambiguous: {alias}")
                values[alias] = path
    return values


def preview_badcase_dataset(
    *, project_root: Path, job_dir: Path, trial_ids: list[str], output: Path,
    dataset_id: str, version: str,
) -> dict[str, Any]:
    project_root = project_root.expanduser().resolve(strict=True)
    job_dir = resolve_inside(project_root, job_dir, label="Historical Job")
    output = _output_inside(project_root, output)
    if not dataset_id.strip() or not version.strip():
        raise ValueError("Badcase Dataset id and version are required")
    seal = verify_job_bundle(job_dir)
    if not trial_ids or len(trial_ids) > 20 or len(set(trial_ids)) != len(trial_ids):
        raise ValueError("Select 1-20 unique Historical Trial ids")
    assessments = _assessment_map(job_dir, seal)
    missing = [identity for identity in trial_ids if identity not in assessments]
    if missing:
        raise ValueError("Unknown Historical Trial ids: " + ", ".join(missing))
    selected = []
    for identity in trial_ids:
        value = json.loads(assessments[identity].read_text())
        selected.append({
            "trial_id": identity,
            "assessment_digest": canonical_digest(value, namespace="harbor-dsh-reviewed-badcase-assessment-v1"),
            "status": value.get("status"),
            "criterion_ids": [str(item.get("id")) for item in value.get("criteria") or [] if isinstance(item, dict) and item.get("id")],
        })
    plan: dict[str, Any] = {
        "schema_version": 1,
        "protocol": "historical-badcase-dataset-plan/v1",
        "source_job": job_dir.name,
        "source_job_bundle_digest": seal["digest"],
        "output": output.relative_to(project_root).as_posix(),
        "dataset_id": dataset_id,
        "version": version,
        "selected": selected,
        "review_required": True,
        "promotion_eligible": False,
        "privacy": "Only bounded goal/check summaries are copied; raw Session payloads and tool contents are excluded.",
    }
    plan["digest"] = canonical_digest(plan, namespace="harbor-dsh-historical-badcase-plan-v1")
    return plan


def materialize_badcase_dataset(
    *,
    project_root: Path,
    job_dir: Path,
    trial_ids: list[str],
    output: Path,
    expected_plan_digest: str,
    confirmed: bool,
    dataset_id: str,
    version: str,
) -> dict[str, Any]:
    if confirmed is not True:
        raise ValueError("HUMAN_CONFIRMATION_REQUIRED: review the plan before creating a regression Dataset draft")
    plan = preview_badcase_dataset(
        project_root=project_root, job_dir=job_dir, trial_ids=trial_ids, output=output,
        dataset_id=dataset_id, version=version,
    )
    if plan["digest"] != expected_plan_digest:
        raise ValueError("BADCASE_PLAN_STALE: preview again before confirming")
    project_root = project_root.expanduser().resolve(strict=True)
    job_dir = resolve_inside(project_root, job_dir, label="Historical Job")
    output = _output_inside(project_root, output)
    if output.exists():
        raise FileExistsError("Badcase Dataset output already exists")
    assessments = _assessment_map(job_dir, verify_job_bundle(job_dir))
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=output.parent))
    try:
        for index, identity in enumerate(trial_ids, start=1):
            assessment = json.loads(assessments[identity].read_text())
            safe_id = _SAFE.sub("-", identity).strip("-._") or f"case-{index}"
            task = temporary / f"{index:02d}-{safe_id[:60]}"
            (task / "tests").mkdir(parents=True)
            (task / "environment").mkdir()
            goal = str(assessment.get("query") or "Reviewed Historical badcase")[:4000]
            criteria = [item for item in assessment.get("criteria") or [] if isinstance(item, dict)]
            checks = [
                f"- {item.get('id')}: {str(item.get('recommendation') or item.get('reason') or 'Define reviewed expected behavior.')[:1000]}"
                for item in criteria
            ] or ["- Define the reviewed expected behavior before formal evaluation."]
            evidence = sorted({str(ref) for item in criteria for ref in item.get("evidence_refs") or []})[:20]
            instruction = "\n".join([
                "# Reviewed Historical badcase regression draft",
                "",
                "## Task",
                goal,
                "",
                "## Expected checks requiring human review",
                *checks,
                "",
                "## Required evidence references from the source assessment",
                *(f"- {item}" for item in evidence),
                "",
                "This draft is not promotion-eligible until a human supplies deterministic expectations or independent Ground Truth.",
            ])
            (task / "instruction.md").write_text(instruction + "\n")
            (task / "task.toml").write_text(
                f'''schema_version = "1.4"\n\n[task]\nname = "reviewed-badcase/{index:02d}-{safe_id[:57]}"\nversion = {json.dumps(version)}\ndescription = "Human-confirmed Historical badcase regression draft."\n\n[metadata]\nsource_trial = "{safe_id[:80]}"\nreview_required = true\n'''
            )
            (task / "environment" / "Dockerfile").write_text("FROM alpine:3.22\n")
            (task / "tests" / "test.sh").write_text("#!/bin/sh\necho 'Strict Candidate materialization is required before execution.' >&2\nexit 2\n")
            (task / "tests" / "test.sh").chmod(0o755)
        manifest = snapshot_dataset(
            temporary,
            dataset_id=dataset_id,
            version=version,
            dataset_kind="candidate-execution",
            metadata={
                "reviewed_badcases": {
                    "protocol": "historical-badcase-dataset/v1",
                    "source_job": plan["source_job"],
                    "source_job_bundle_digest": plan["source_job_bundle_digest"],
                    "plan_digest": plan["digest"],
                    "human_confirmed": True,
                    "promotion_eligible": False,
                }
            },
        )
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary.replace(output)
        return {"schema_version": 1, "protocol": "historical-badcase-dataset/v1", "dataset_path": str(output), "manifest": manifest, "plan": plan}
    except Exception:
        shutil.rmtree(temporary, ignore_errors=True)
        raise
