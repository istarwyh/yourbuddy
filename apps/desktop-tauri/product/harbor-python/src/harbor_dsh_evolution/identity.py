from __future__ import annotations

import hashlib
import json
import math
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable

EXCLUDED_DIRS = {".git", "node_modules", "__pycache__", ".venv"}
EXCLUDED_FILES = {".DS_Store"}


def canonical_json(value: Any) -> str:
    """Serialize the protocol subset exactly like sorted-key JSON.stringify.

    This closes Python/JavaScript identity drift for integral floats, negative
    zero, and exponent formatting while rejecting non-JSON numbers.
    """
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int) and not isinstance(value, bool):
        try:
            round_trip = int(float(value))
        except (OverflowError, ValueError):
            round_trip = None
        if round_trip != value:
            raise ValueError("Canonical protocol JSON forbids integers that cannot round-trip through an IEEE-754 Number")
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("Canonical protocol JSON forbids non-finite numbers")
        if value == 0:
            return "0"
        absolute = abs(value)
        representation = repr(value)
        if 1e-6 <= absolute < 1e21:
            fixed = format(Decimal(representation), "f")
            return fixed.rstrip("0").rstrip(".") if "." in fixed else fixed
        mantissa, exponent = representation.lower().split("e")
        exponent_value = int(exponent)
        return f"{mantissa}e{'+' if exponent_value >= 0 else ''}{exponent_value}"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list) or isinstance(value, tuple):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise ValueError("Canonical protocol JSON requires string object keys")
        return "{" + ",".join(
            canonical_json(key) + ":" + canonical_json(value[key])
            for key in sorted(value, key=lambda item: item.encode("utf-16-be", "surrogatepass"))
        ) + "}"
    raise ValueError(f"Canonical protocol JSON does not support {type(value).__name__}")


def canonical_digest(value: Any, *, namespace: str) -> str:
    payload = canonical_json(value).encode("utf-8")
    digest = hashlib.sha256()
    digest.update(namespace.encode("utf-8"))
    digest.update(b"\0")
    digest.update(payload)
    return f"sha256:{digest.hexdigest()}"


def files_under(root: Path, *, excluded: Iterable[str] = ()) -> list[Path]:
    root = root.expanduser().resolve(strict=True)
    excluded_names = EXCLUDED_FILES | set(excluded)
    files: list[Path] = []
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if any(part in EXCLUDED_DIRS for part in relative.parts):
            continue
        if path.name in excluded_names:
            continue
        if path.is_symlink():
            raise ValueError(f"Symlinks are not allowed: {relative.as_posix()}")
        if path.is_file():
            files.append(path)
    return sorted(files, key=lambda item: item.relative_to(root).as_posix())


def tree_digest(
    root: Path, *, namespace: str, excluded: Iterable[str] = ()
) -> tuple[str, list[dict[str, Any]]]:
    root = root.expanduser().resolve(strict=True)
    inventory: list[dict[str, Any]] = []
    digest = hashlib.sha256()
    digest.update(namespace.encode("utf-8"))
    digest.update(b"\0")
    for path in files_under(root, excluded=excluded):
        relative = path.relative_to(root).as_posix()
        content = path.read_bytes()
        file_digest = hashlib.sha256(content).hexdigest()
        inventory.append(
            {"path": relative, "size": len(content), "sha256": file_digest}
        )
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(str(len(content)).encode("ascii"))
        digest.update(b"\0")
        digest.update(content)
        digest.update(b"\0")
    return f"sha256:{digest.hexdigest()}", inventory


def resolve_inside(root: Path, value: str | Path, *, label: str) -> Path:
    root = root.expanduser().resolve(strict=True)
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        candidate = root / candidate
    candidate = candidate.resolve(strict=True)
    if candidate != root and root not in candidate.parents:
        raise ValueError(f"{label} must stay under the project root")
    return candidate


def public_relative(root: Path, path: Path) -> str:
    return path.resolve(strict=True).relative_to(root.resolve(strict=True)).as_posix()
