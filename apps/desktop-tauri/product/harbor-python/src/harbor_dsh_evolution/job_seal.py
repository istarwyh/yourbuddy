"""Content-addressed immutable receipt for completed evaluation Jobs."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from harbor_dsh_evolution.identity import canonical_digest

SEAL_NAME = "job-bundle-manifest.json"
SEAL_PROTOCOL = "job-bundle/v1"

_FIXED_ARTIFACTS = (
    "candidate-manifest.json",
    "candidate-materialization.json",
    "generation-batch-manifest.json",
    "historical-generation-batch.json",
    "historical-evaluation-complete.json",
    "dataset-manifest.json",
    "evaluation-stack-manifest.json",
    "evaluation-contract.json",
    "evaluation-context.json",
    "evaluation-spec.json",
    "architecture-doctor.json",
    "evaluator-bundle-manifest.json",
    "evaluation-summary.json",
    "artifact-registry.json",
    "population-report.json",
    "diagnosis-report.json",
    "optimization-report.json",
)
_REWARD_AFFECTING = {
    "candidate-manifest.json",
    "candidate-materialization.json",
    "dataset-manifest.json",
    "evaluation-stack-manifest.json",
    "evaluation-contract.json",
    "evaluation-context.json",
    "evaluation-spec.json",
    "architecture-doctor.json",
    "evaluator-bundle-manifest.json",
    "evaluation-summary.json",
}


def _file_digest(path: Path) -> tuple[str, int]:
    content = path.read_bytes()
    return "sha256:" + hashlib.sha256(content).hexdigest(), len(content)


def _artifact_paths(job_dir: Path) -> list[Path]:
    values = [job_dir / name for name in _FIXED_ARTIFACTS]
    values.extend(sorted((job_dir / "evaluator-bundle").rglob("*")) if (job_dir / "evaluator-bundle").is_dir() else [])
    values.extend(sorted((job_dir / "trial-assessments").glob("*.json")) if (job_dir / "trial-assessments").is_dir() else [])
    values.extend(sorted(job_dir.glob("*/result.json")))
    return [path for path in values if path.is_file() and not path.is_symlink()]


def _entry(job_dir: Path, path: Path) -> dict[str, Any]:
    digest, size = _file_digest(path)
    relative = path.relative_to(job_dir).as_posix()
    reward_affecting = (
        relative in _REWARD_AFFECTING
        or relative.startswith("evaluator-bundle/")
        or relative.startswith("trial-assessments/")
        or relative.endswith("/result.json")
    )
    return {
        "path": relative,
        "digest": digest,
        "size": size,
        "reward_affecting": reward_affecting,
    }


def seal_job_bundle(job_dir: Path) -> dict[str, Any]:
    job_dir = job_dir.expanduser().resolve(strict=True)
    destination = job_dir / SEAL_NAME
    if destination.exists():
        raise FileExistsError("JOB_ALREADY_SEALED: completed Jobs are immutable; create a new Job")
    entries = [_entry(job_dir, path) for path in _artifact_paths(job_dir)]
    required = {"evaluation-summary.json", "evaluation-context.json", "evaluation-stack-manifest.json", "dataset-manifest.json"}
    paths = {item["path"] for item in entries}
    missing = sorted(required - paths)
    if missing:
        raise ValueError("JOB_SEAL_REQUIRED_ARTIFACT_MISSING: " + ", ".join(missing))
    manifest: dict[str, Any] = {
        "schema_version": 1,
        "protocol": SEAL_PROTOCOL,
        "job": job_dir.name,
        "created_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "artifacts": entries,
    }
    manifest["digest"] = canonical_digest(manifest, namespace="harbor-dsh-job-bundle-v1")
    descriptor, temporary = tempfile.mkstemp(prefix=f".{SEAL_NAME}-", dir=job_dir)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(manifest, output, ensure_ascii=False, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, destination)
        destination.chmod(0o444)
    except Exception:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise
    return manifest


def verify_job_bundle(job_dir: Path) -> dict[str, Any]:
    job_dir = job_dir.expanduser().resolve(strict=True)
    path = job_dir / SEAL_NAME
    if path.is_symlink() or not path.is_file():
        raise ValueError("JOB_BUNDLE_SEAL_MISSING")
    manifest = json.loads(path.read_text())
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1 or manifest.get("protocol") != SEAL_PROTOCOL:
        raise ValueError("JOB_BUNDLE_SEAL_INVALID")
    digest = manifest.get("digest")
    content = {key: value for key, value in manifest.items() if key != "digest"}
    if digest != canonical_digest(content, namespace="harbor-dsh-job-bundle-v1"):
        raise ValueError("JOB_BUNDLE_SEAL_DIGEST_MISMATCH")
    entries = manifest.get("artifacts")
    if not isinstance(entries, list) or not entries:
        raise ValueError("JOB_BUNDLE_SEAL_EMPTY")
    declared: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            raise ValueError("JOB_BUNDLE_SEAL_ENTRY_INVALID")
        relative = Path(entry["path"])
        if relative.is_absolute() or ".." in relative.parts or entry["path"] in declared:
            raise ValueError("JOB_BUNDLE_SEAL_PATH_INVALID")
        declared.add(entry["path"])
        artifact = (job_dir / relative).resolve(strict=True)
        if job_dir != artifact and job_dir not in artifact.parents:
            raise ValueError("JOB_BUNDLE_SEAL_PATH_ESCAPE")
        if artifact.is_symlink() or not artifact.is_file():
            raise ValueError(f"JOB_BUNDLE_ARTIFACT_UNSAFE: {entry['path']}")
        current_digest, current_size = _file_digest(artifact)
        if current_digest != entry.get("digest") or current_size != entry.get("size"):
            raise ValueError(f"JOB_BUNDLE_ARTIFACT_TAMPERED: {entry['path']}")
    current_reward_paths = {
        _entry(job_dir, artifact)["path"]
        for artifact in _artifact_paths(job_dir)
        if _entry(job_dir, artifact)["reward_affecting"]
    }
    declared_reward_paths = {entry["path"] for entry in entries if entry.get("reward_affecting") is True}
    if current_reward_paths != declared_reward_paths:
        raise ValueError("JOB_BUNDLE_REWARD_ARTIFACT_SET_CHANGED")
    return {**manifest, "verified": True}
