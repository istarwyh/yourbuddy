from __future__ import annotations

import copy
import json
import math
import os
import re
import struct
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

from harbor_dsh_evolution.bridge_contract import BRIDGE_CONTRACT
from harbor_dsh_evolution.identity import canonical_digest

PROTOCOL = "business-observation/v1"
LIST_PROTOCOL = "business-observation-list/v1"
STORE_DIRECTORY = Path(".harbor/business-observations")
MAX_IMPORT_BYTES = 256 * 1024
MAX_LIST_LIMIT = 1000
SAFE_INTEGER = 9_007_199_254_740_991

_SENSITIVE_KEYS = {
    "authorization",
    "cookie",
    "cookies",
    "token",
    "auth_token",
    "access_token",
    "refresh_token",
    "api_key",
    "access_key",
    "secret",
    "client_secret",
    "private_key",
    "password",
    "passwd",
    "headers",
    "request_headers",
    "environment",
    "credentials",
    "raw_payload",
    "payload",
    "records",
    "users",
    "emails",
    "phone_numbers",
}
_PERSONAL_DIMENSION = re.compile(r"(?:^|_)(?:email|phone|mobile|user|customer|account|device|session|ip|name|address|identifier|id)(?:_|$)", re.I)
_EMAIL = re.compile(r"(?<![\w.+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![\w.-])", re.I)
_IP_ADDRESS = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[0-9a-f]{1,4}:){2,}[0-9a-f:]{1,}\b", re.I)
_PHONE = re.compile(r"(?<!\d)(?:\+?\d[\s().-]*){8,15}(?!\d)")
_LOCAL_PATH = re.compile(r"(?:^|[\s\"'`])(?:/(?:Users|home|tmp|var|private|etc)/|[A-Za-z]:\\\\|\\\\\\\\)", re.I)
_SECRET_PATTERNS = (
    re.compile(r"-----BEGIN [^-\r\n]{1,80}-----", re.I),
    re.compile(r"\b(?:Bearer|Basic)\s+[^\s,;\"'`<>]+", re.I),
    re.compile(r"\b(?:sk|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{12,}\b", re.I),
    re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b", re.I),
    re.compile(r"\bxox[a-z]?-[A-Za-z0-9-]{10,}\b", re.I),
    re.compile(r"\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b"),
    re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
)


class DuplicateObservationError(ValueError):
    """Raised when immutable storage already contains an observation id."""

    code = "BUSINESS_OBSERVATION_DUPLICATE"


class ObservationIdConflictError(DuplicateObservationError):
    """Raised when an observation id already names different content."""

    code = "BUSINESS_OBSERVATION_ID_CONFLICT"


_SCHEMA_PATH = Path(__file__).with_name("schemas") / "business-observation.schema.json"
_SCHEMA = json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))
_VALIDATOR = Draft202012Validator(_SCHEMA, format_checker=FormatChecker())


def _error_path(error: Any) -> str:
    path = ".".join(str(item) for item in error.absolute_path)
    return path or "observation"


def _reject_sensitive(value: Any, path: tuple[str, ...] = ()) -> None:
    if isinstance(value, dict):
        if "segments" in path and isinstance(value.get("id"), str) and _PERSONAL_DIMENSION.search(value["id"]):
            raise ValueError(
                f"BUSINESS_OBSERVATION_PERSONAL_DIMENSION: personal segment dimensions are not allowed at {'.'.join(path) or 'observation'}"
            )
        for key, item in value.items():
            normalized = re.sub(r"[^a-z0-9]+", "_", str(key).lower()).strip("_")
            if normalized in _SENSITIVE_KEYS:
                raise ValueError(
                    f"BUSINESS_OBSERVATION_SENSITIVE_FIELD: sensitive field is not allowed at {'.'.join((*path, str(key)))}"
                )
            _reject_sensitive(item, (*path, str(key)))
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            _reject_sensitive(item, (*path, str(index)))
        return
    if isinstance(value, str):
        ip_shaped = path[:1] != ("window",) and _IP_ADDRESS.search(value)
        if _EMAIL.search(value) or ip_shaped or ("segments" in path and _PHONE.search(value)):
            raise ValueError(
                f"BUSINESS_OBSERVATION_PERSONAL_DATA: personal data is not allowed at {'.'.join(path) or 'observation'}"
            )
        if any(pattern.search(value) for pattern in _SECRET_PATTERNS):
            raise ValueError(
                f"BUSINESS_OBSERVATION_SENSITIVE_VALUE: secret-shaped text is not allowed at {'.'.join(path) or 'observation'}"
            )
        if _LOCAL_PATH.search(value):
            raise ValueError(
                f"BUSINESS_OBSERVATION_SENSITIVE_VALUE: local paths are not allowed at {'.'.join(path) or 'observation'}"
            )


def _parse_timestamp(value: str, label: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"BUSINESS_OBSERVATION_WINDOW_INVALID: {label} must be an RFC 3339 date-time") from error
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"BUSINESS_OBSERVATION_WINDOW_INVALID: {label} must include a timezone")
    return parsed


def _metric_map(metrics: list[dict[str, Any]], label: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for metric in metrics:
        metric_id = metric["id"]
        if metric_id in result:
            raise ValueError(f"BUSINESS_OBSERVATION_METRIC_INVALID: duplicate metric id {metric_id!r} in {label}")
        number = metric["value"]
        if isinstance(number, bool) or not isinstance(number, (int, float)):
            raise ValueError(f"BUSINESS_OBSERVATION_METRIC_INVALID: {label}.{metric_id}.value must be a number")
        try:
            finite = math.isfinite(float(number))
        except OverflowError:
            finite = False
        if not finite:
            raise ValueError(f"BUSINESS_OBSERVATION_METRIC_INVALID: {label}.{metric_id}.value must be finite")
        if isinstance(number, int) and abs(number) > SAFE_INTEGER:
            raise ValueError(
                f"BUSINESS_OBSERVATION_METRIC_INVALID: {label}.{metric_id}.value exceeds the cross-language safe integer range"
            )
        if metric["unit"] == "ratio" and not 0 <= number <= 1:
            raise ValueError(f"BUSINESS_OBSERVATION_METRIC_INVALID: ratio metric {metric_id!r} must be between 0 and 1")
        if metric["unit"] == "percent" and not 0 <= number <= 100:
            raise ValueError(f"BUSINESS_OBSERVATION_METRIC_INVALID: percent metric {metric_id!r} must be between 0 and 100")
        result[metric_id] = metric
    return result


def _validate_semantics(value: dict[str, Any]) -> None:
    start = _parse_timestamp(value["window"]["from"], "window.from")
    end = _parse_timestamp(value["window"]["through"], "window.through")
    if start >= end:
        raise ValueError("BUSINESS_OBSERVATION_WINDOW_INVALID: window.from must be earlier than window.through")

    metrics = _metric_map(value["metrics"], "metrics")
    segment_ids: set[str] = set()
    for segment in value["segments"]:
        segment_id = segment["id"]
        if segment_id in segment_ids:
            raise ValueError(f"BUSINESS_OBSERVATION_SEGMENT_INVALID: duplicate segment id {segment_id!r}")
        segment_ids.add(segment_id)
        dimension_ids: set[str] = set()
        for dimension in segment["dimensions"]:
            if dimension["id"] in dimension_ids:
                raise ValueError(
                    f"BUSINESS_OBSERVATION_SEGMENT_INVALID: duplicate dimension id {dimension['id']!r} in segment {segment_id!r}"
                )
            dimension_ids.add(dimension["id"])
            number = dimension["value"]
            if isinstance(number, float) and not math.isfinite(number):
                raise ValueError("BUSINESS_OBSERVATION_SEGMENT_INVALID: dimension values must be finite")
            if isinstance(number, int) and not isinstance(number, bool) and abs(number) > SAFE_INTEGER:
                raise ValueError("BUSINESS_OBSERVATION_SEGMENT_INVALID: numeric dimension exceeds the cross-language safe integer range")
        segment_metrics = _metric_map(segment["metrics"], f"segments.{segment_id}.metrics")
        for metric_id, metric in segment_metrics.items():
            parent = metrics.get(metric_id)
            if parent is None:
                raise ValueError(
                    f"BUSINESS_OBSERVATION_SEGMENT_INVALID: segment metric {metric_id!r} is not declared in top-level metrics"
                )
            if metric["unit"] != parent["unit"] or metric["direction"] != parent["direction"]:
                raise ValueError(
                    f"BUSINESS_OBSERVATION_SEGMENT_INVALID: segment metric {metric_id!r} must preserve unit and direction"
                )
            if metric["sample_size"] > parent["sample_size"]:
                raise ValueError(
                    f"BUSINESS_OBSERVATION_SEGMENT_INVALID: segment metric {metric_id!r} sample_size exceeds the observation sample"
                )


def _float64_identity(value: int | float) -> str:
    try:
        number = float(value)
        packed = struct.pack(">d", 0.0 if number == 0 else number)
    except (OverflowError, struct.error) as error:
        raise ValueError("BUSINESS_OBSERVATION_METRIC_INVALID: number is outside finite float64 range") from error
    return f"float64:{packed.hex()}"


def _digest_material(value: dict[str, Any]) -> dict[str, Any]:
    material = copy.deepcopy(value)
    material.pop("digest", None)
    for metric in material.get("metrics", []):
        metric["value"] = _float64_identity(metric["value"])
    for segment in material.get("segments", []):
        for dimension in segment.get("dimensions", []):
            if isinstance(dimension.get("value"), (int, float)) and not isinstance(dimension.get("value"), bool):
                dimension["value"] = _float64_identity(dimension["value"])
        for metric in segment.get("metrics", []):
            metric["value"] = _float64_identity(metric["value"])
    return material


def business_observation_digest(value: dict[str, Any]) -> str:
    """Return the canonical digest, using explicit float64 identities for metric numbers."""

    return canonical_digest(
        _digest_material(value),
        namespace=BRIDGE_CONTRACT["digest_namespaces"]["business_observation"],
    )


def validate_business_observation(value: Any, *, require_digest: bool = True) -> dict[str, Any]:
    """Validate one finalized observation and return a defensive copy."""

    if not isinstance(value, dict):
        raise ValueError("BUSINESS_OBSERVATION_SCHEMA_INVALID: observation must be a JSON object")
    candidate = copy.deepcopy(value)
    _reject_sensitive(candidate)
    errors = sorted(_VALIDATOR.iter_errors(candidate), key=lambda item: list(item.absolute_path))
    if errors:
        first = errors[0]
        if not require_digest and list(first.absolute_path) == [] and "digest" in first.message:
            candidate["digest"] = business_observation_digest(candidate)
            errors = sorted(_VALIDATOR.iter_errors(candidate), key=lambda item: list(item.absolute_path))
        if errors:
            first = errors[0]
            raise ValueError(f"BUSINESS_OBSERVATION_SCHEMA_INVALID: {_error_path(first)}: {first.message}")
    _validate_semantics(candidate)
    expected = business_observation_digest(candidate)
    supplied = candidate.get("digest")
    if supplied is None and not require_digest:
        candidate["digest"] = expected
    elif supplied != expected:
        raise ValueError("BUSINESS_OBSERVATION_DIGEST_MISMATCH: digest does not match the canonical observation")
    return candidate


def prepare_business_observation(value: Any) -> dict[str, Any]:
    """Finalize an import payload by adding its digest when omitted, then validate it strictly."""

    if not isinstance(value, dict):
        raise ValueError("BUSINESS_OBSERVATION_SCHEMA_INVALID: observation must be a JSON object")
    candidate = copy.deepcopy(value)
    _reject_sensitive(candidate)
    if "digest" not in candidate:
        draft = {**candidate, "digest": "sha256:" + "0" * 64}
        errors = sorted(_VALIDATOR.iter_errors(draft), key=lambda item: list(item.absolute_path))
        if errors:
            first = errors[0]
            raise ValueError(f"BUSINESS_OBSERVATION_SCHEMA_INVALID: {_error_path(first)}: {first.message}")
        _validate_semantics(draft)
        candidate["digest"] = business_observation_digest(candidate)
    return validate_business_observation(candidate)


def _project_root(project_root: Path) -> Path:
    root = project_root.expanduser().resolve(strict=True)
    if not root.is_dir():
        raise ValueError("BUSINESS_OBSERVATION_PROJECT_INVALID: project root must be a directory")
    return root


def _ensure_safe_existing_components(root: Path, target: Path) -> None:
    relative = target.relative_to(root)
    current = root
    if root.is_symlink():
        raise ValueError("BUSINESS_OBSERVATION_UNSAFE_PATH: project root may not be a symlink")
    for part in relative.parts:
        current = current / part
        if current.exists() and current.is_symlink():
            raise ValueError("BUSINESS_OBSERVATION_UNSAFE_PATH: symlink path components are not allowed")


def _resolve_input(root: Path, value: Path) -> Path:
    requested = value.expanduser()
    if not requested.is_absolute():
        requested = root / requested
    try:
        lexical = requested.relative_to(root)
    except ValueError as error:
        raise ValueError("BUSINESS_OBSERVATION_UNSAFE_PATH: input file must stay inside project root") from error
    if ".." in lexical.parts:
        raise ValueError("BUSINESS_OBSERVATION_UNSAFE_PATH: input file must stay inside project root")
    current = root
    for part in lexical.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("BUSINESS_OBSERVATION_UNSAFE_PATH: symlink input components are not allowed")
    candidate = requested.resolve(strict=True)
    if candidate == root or root not in candidate.parents:
        raise ValueError("BUSINESS_OBSERVATION_UNSAFE_PATH: input file must stay inside project root")
    if not candidate.is_file():
        raise ValueError("BUSINESS_OBSERVATION_INPUT_INVALID: input must be a regular file")
    if candidate.stat().st_size > MAX_IMPORT_BYTES:
        raise ValueError("BUSINESS_OBSERVATION_INPUT_TOO_LARGE: input exceeds 256 KiB")
    return candidate


def _read_payload(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except UnicodeDecodeError as error:
        raise ValueError("BUSINESS_OBSERVATION_INPUT_INVALID: input must be UTF-8 JSON") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"BUSINESS_OBSERVATION_INPUT_INVALID: invalid JSON at line {error.lineno}") from error


def load_business_observation_file(
    *, project_root: Path, input_path: Path, prepare: bool = False
) -> dict[str, Any]:
    """Read one bounded, non-symlink JSON file inside the project and validate it."""

    root = _project_root(project_root)
    value = _read_payload(_resolve_input(root, input_path))
    return prepare_business_observation(value) if prepare else validate_business_observation(value)


def _store_directory(root: Path, *, create: bool) -> Path:
    directory = root / STORE_DIRECTORY
    _ensure_safe_existing_components(root, directory)
    if create:
        directory.mkdir(parents=True, exist_ok=True)
        _ensure_safe_existing_components(root, directory)
    return directory


def import_business_observation(
    *,
    project_root: Path,
    observation: Any | None = None,
    input_path: Path | None = None,
) -> dict[str, Any]:
    """Import one reviewed aggregate result without overwriting an existing id."""

    root = _project_root(project_root)
    if (observation is None) == (input_path is None):
        raise ValueError("BUSINESS_OBSERVATION_IMPORT_INVALID: provide exactly one file or structured payload")
    source_path: str | None = None
    if input_path is not None:
        resolved = _resolve_input(root, input_path)
        source_path = resolved.relative_to(root).as_posix()
        observation = _read_payload(resolved)
    finalized = prepare_business_observation(observation)
    directory = _store_directory(root, create=True)
    destination = directory / f"{finalized['observation_id']}.json"
    _ensure_safe_existing_components(root, destination)
    serialized = json.dumps(finalized, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    try:
        with destination.open("x", encoding="utf-8") as stream:
            stream.write(serialized)
            stream.flush()
            os.fsync(stream.fileno())
    except FileExistsError as error:
        existing = _read_payload(destination)
        existing_digest = existing.get("digest") if isinstance(existing, dict) else None
        if existing_digest == finalized["digest"]:
            duplicate = DuplicateObservationError(
                f"{DuplicateObservationError.code}: observation_id {finalized['observation_id']!r} is already imported"
            )
        else:
            duplicate = ObservationIdConflictError(
                f"{ObservationIdConflictError.code}: observation_id {finalized['observation_id']!r} already identifies different content"
            )
        raise duplicate from error
    return {
        "schema_version": 1,
        "protocol": "business-observation-import/v1",
        "status": "imported",
        "observation_id": finalized["observation_id"],
        "digest": finalized["digest"],
        "stored_path": destination.relative_to(root).as_posix(),
        "source_path": source_path,
        "network_access": False,
    }


def _matches_subject(
    observation: dict[str, Any],
    *,
    candidate_digest: str | None,
    generator_id: str | None,
    deployment_id: str | None,
) -> bool:
    subject = observation["subject"]
    return (
        (candidate_digest is None or subject.get("candidate_digest") == candidate_digest)
        and (generator_id is None or subject.get("generator_id") == generator_id)
        and (deployment_id is None or subject.get("deployment_id") == deployment_id)
    )


def _selected_metrics(observation: dict[str, Any], segment_id: str | None) -> list[dict[str, Any]]:
    if segment_id is None:
        return observation["metrics"]
    for segment in observation["segments"]:
        if segment["id"] == segment_id:
            return segment["metrics"]
    return []


def _trends(observations: list[dict[str, Any]], metric_id: str | None, segment_id: str | None) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    subjects: dict[str, dict[str, Any]] = {}
    for observation in observations:
        subject_key = json.dumps(observation["subject"], ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        subjects[subject_key] = observation["subject"]
        for metric in _selected_metrics(observation, segment_id):
            if metric_id is not None and metric["id"] != metric_id:
                continue
            key = (subject_key, metric["id"], metric["unit"], metric["direction"])
            grouped[key].append(
                {
                    "observation_id": observation["observation_id"],
                    "candidate_digest": observation["subject"].get("candidate_digest"),
                    "window": observation["window"],
                    "value": metric["value"],
                    "sample_size": metric["sample_size"],
                }
            )
    return [
        {
            "subject": subjects[key[0]],
            "metric_id": key[1],
            "unit": key[2],
            "direction": key[3],
            "segment_id": segment_id,
            "points": sorted(points, key=lambda item: (item["window"]["from"], item["observation_id"])),
        }
        for key, points in sorted(grouped.items())
    ]


def _groups(observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for observation in observations:
        subject = observation["subject"]
        identity = json.dumps(subject, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        current = grouped.setdefault(identity, {"subject": subject, "observation_ids": []})
        current["observation_ids"].append(observation["observation_id"])
    return [
        {
            "subject": item["subject"],
            "observation_count": len(item["observation_ids"]),
            "observation_ids": sorted(item["observation_ids"]),
        }
        for _, item in sorted(grouped.items())
    ]


def list_business_observations(
    *,
    project_root: Path,
    candidate_digest: str | None = None,
    generator_id: str | None = None,
    deployment_id: str | None = None,
    metric_id: str | None = None,
    segment_id: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> dict[str, Any]:
    """List validated observations with deterministic trend and identity grouping projections."""

    root = _project_root(project_root)
    if offset < 0:
        raise ValueError("BUSINESS_OBSERVATION_LIST_INVALID: offset must be non-negative")
    if limit < 1 or limit > MAX_LIST_LIMIT:
        raise ValueError(f"BUSINESS_OBSERVATION_LIST_INVALID: limit must be between 1 and {MAX_LIST_LIMIT}")
    if candidate_digest is not None and not re.fullmatch(r"sha256:[0-9a-f]{64}", candidate_digest):
        raise ValueError("BUSINESS_OBSERVATION_LIST_INVALID: candidate_digest is invalid")
    directory = _store_directory(root, create=False)
    if not directory.exists():
        observations: list[dict[str, Any]] = []
    elif not directory.is_dir():
        raise ValueError("BUSINESS_OBSERVATION_STORE_INVALID: observation store is not a directory")
    else:
        observations = []
        for entry in sorted(directory.iterdir(), key=lambda item: item.name):
            if entry.is_symlink():
                raise ValueError("BUSINESS_OBSERVATION_STORE_INVALID: symlink entries are not allowed")
            if not entry.is_file() or entry.suffix != ".json":
                continue
            try:
                validated = validate_business_observation(_read_payload(entry))
            except ValueError as error:
                raise ValueError(f"BUSINESS_OBSERVATION_STORE_INVALID: {entry.name} failed validation") from error
            if entry.name != f"{validated['observation_id']}.json":
                raise ValueError(f"BUSINESS_OBSERVATION_STORE_INVALID: {entry.name} does not match observation_id")
            if not _matches_subject(
                validated,
                candidate_digest=candidate_digest,
                generator_id=generator_id,
                deployment_id=deployment_id,
            ):
                continue
            selected = _selected_metrics(validated, segment_id)
            if segment_id is not None and not selected:
                continue
            if metric_id is not None and not any(metric["id"] == metric_id for metric in selected):
                continue
            observations.append(validated)
    observations.sort(key=lambda item: (item["window"]["through"], item["observation_id"]), reverse=True)
    total = len(observations)
    page = observations[offset : offset + limit]
    return {
        "schema_version": 1,
        "protocol": LIST_PROTOCOL,
        "filters": {
            "candidate_digest": candidate_digest,
            "generator_id": generator_id,
            "deployment_id": deployment_id,
            "metric_id": metric_id,
            "segment_id": segment_id,
        },
        "pagination": {
            "offset": offset,
            "limit": limit,
            "total": total,
            "has_more": offset + limit < total,
        },
        "observations": page,
        "trends": _trends(page, metric_id, segment_id)[:limit],
        "groups": _groups(page)[:limit],
        "causality": {
            "status": "correlation-only",
            "label": "Associated observations are correlational and do not establish causation.",
            "affects_offline_evaluation": False,
            "affects_reward": False,
            "affects_gate": False,
        },
    }
