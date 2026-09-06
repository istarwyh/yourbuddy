"""A Candidate-owned, content-addressed ACP launch contract.

The descriptor and npm lockfile are Candidate source, not Host defaults. Reading
old snapshots remains supported; executing one requires an explicit binding.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlsplit

DESCRIPTOR_NAME = "candidate-runtime.json"
LOCKFILE_NAME = "package-lock.json"
_FIELDS = {"schema_version", "transport", "entrypoint", "config_path", "agent_entry_id", "node_version"}
_SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$", re.ASCII)
_NODE_VERSION = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$", re.ASCII)
_ENTRY_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_DEPENDENCIES = ("dependencies", "optionalDependencies", "devDependencies", "peerDependencies")


def _invalid(message: str) -> None:
    raise ValueError(f"CANDIDATE_RUNTIME_INVALID: {message}")


def _file(root: Path, relative: Any, *, label: str) -> Path:
    if (not isinstance(relative, str) or not relative or len(relative) > 1024 or relative.strip() != relative
        or "\\" in relative or ":" in relative
        or any(ord(char) < 32 or ord(char) == 127 for char in relative)
        or any(part in {"", ".", "..", "node_modules", ".git", ".harbor-runtime"} for part in relative.split("/"))
        or PurePosixPath(relative).is_absolute()):
        _invalid(f"{label} must be a safe Candidate-relative source file")
    current = root
    for part in relative.split("/"):
        current = current / part
        if current.is_symlink():
            _invalid(f"{label} must not traverse symlinks")
    if not current.is_file() or not current.resolve().is_relative_to(root):
        _invalid(f"{label} must be an existing Candidate source file")
    return current


def _json(path: Path) -> dict[str, Any]:
    if path.stat().st_size > 4 * 1024 * 1024:
        _invalid(f"{path.name} exceeds the runtime metadata size limit")
    try:
        value = json.loads(path.read_text(encoding="utf-8"), parse_constant=lambda _: _invalid("runtime metadata must use standard JSON numbers"))
    except (OSError, UnicodeError, ValueError) as error:
        _invalid(f"{path.name} is not valid UTF-8 JSON: {type(error).__name__}")
    if not isinstance(value, dict):
        _invalid(f"{path.name} must be an object")
    return value


def _sha(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def _locked_dependencies(package: dict[str, Any], lock: dict[str, Any]) -> None:
    packages = lock.get("packages")
    if lock.get("lockfileVersion") != 3 or not isinstance(packages, dict) or not isinstance(packages.get(""), dict):
        _invalid("execution requires package-lock.json v3 with its root package")
    locked_root = packages[""]
    for key in ("name", "version"):
        if not isinstance(package.get(key), str) or not package[key] or locked_root.get(key) != package[key]:
            _invalid(f"package-lock.json root {key} must match package.json")
    for kind in _DEPENDENCIES:
        declared = package.get(kind, {})
        if not isinstance(declared, dict) or locked_root.get(kind, {}) != declared:
            _invalid(f"package-lock.json root {kind} must match package.json")
        for name, version in declared.items():
            if not isinstance(version, str) or not _SEMVER.fullmatch(version):
                _invalid(f"root {kind} must use exact package versions, not tags or ranges")
            target = packages.get(f"node_modules/{name}")
            if not isinstance(target, dict) or target.get("version") != version:
                _invalid(f"root {kind} dependency must resolve to its exact locked version")
    for relative, entry in packages.items():
        if relative == "":
            continue
        if (not isinstance(relative, str) or not relative.startswith("node_modules/")
            or "\\" in relative or ":" in relative
            or any(ord(char) < 32 or ord(char) == 127 for char in relative)
            or any(part in {"", ".", "..", ".git", ".harbor-runtime"} for part in relative.split("/"))
            or not isinstance(entry, dict) or entry.get("link") or entry.get("inBundle")):
            _invalid("lockfile must contain registry packages, not local links or bundled entries")
        if not isinstance(entry.get("version"), str) or not _SEMVER.fullmatch(entry["version"]):
            _invalid("every locked package must have an exact version")
        resolved = entry.get("resolved")
        if (not isinstance(resolved, str) or not resolved.startswith("https://") or any(char in resolved for char in "\\?#")
            or any(ord(char) <= 32 or ord(char) == 127 for char in resolved)):
            _invalid("every locked package requires a credential-free HTTPS archive URL")
        try:
            url = urlsplit(resolved)
            # Accessing port also validates malformed or out-of-range values.
            url.port
        except ValueError:
            _invalid("locked package archive URL is invalid")
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment:
            _invalid("every locked package requires a credential-free HTTPS archive URL")
        integrity = entry.get("integrity")
        try:
            decoded = base64.b64decode(integrity[7:], validate=True) if isinstance(integrity, str) and integrity.startswith("sha512-") else b""
        except ValueError:
            decoded = b""
        if len(decoded) != 64 or base64.b64encode(decoded).decode() != integrity[7:]:
            _invalid("every locked package requires a SHA-512 archive integrity")


def load_candidate_runtime(candidate_dir: Path, *, required: bool = False) -> dict[str, Any]:
    root = candidate_dir.expanduser().resolve(strict=True)
    descriptor_path = root / DESCRIPTOR_NAME
    if not descriptor_path.exists() and not descriptor_path.is_symlink():
        if required:
            raise ValueError("CANDIDATE_RUNTIME_UNBOUND: this historical Candidate has no candidate-runtime.json; create a new Candidate with a locked local ACP entrypoint, then establish a fresh baseline. No demo/latest fallback is permitted.")
        return {"kind": "deepseek-harness", "policy": "unbound", "transport": "acp"}
    descriptor_path = _file(root, DESCRIPTOR_NAME, label="runtime descriptor")
    descriptor = _json(descriptor_path)
    if set(descriptor) != _FIELDS or isinstance(descriptor.get("schema_version"), bool) or descriptor.get("schema_version") != 1 or descriptor.get("transport") != "acp":
        _invalid("candidate-runtime.json requires the supported v1 ACP fields only")
    entrypoint = _file(root, descriptor.get("entrypoint"), label="entrypoint")
    if entrypoint.suffix not in {".js", ".mjs", ".cjs"}:
        _invalid("entrypoint must be a Candidate-owned Node.js source file")
    _file(root, descriptor.get("config_path"), label="config_path")
    entry_id = descriptor.get("agent_entry_id")
    if not isinstance(entry_id, str) or not _ENTRY_ID.fullmatch(entry_id):
        _invalid("agent_entry_id must be a bounded Cordis entry ID")
    node_version = descriptor.get("node_version")
    if not isinstance(node_version, str) or not _NODE_VERSION.fullmatch(node_version) or int(node_version.split(".")[0]) < 22:
        _invalid("node_version must be an exact Node.js version >= 22")
    package = _json(_file(root, "package.json", label="package manifest"))
    lockfile = _file(root, LOCKFILE_NAME, label="npm lockfile")
    _locked_dependencies(package, _json(lockfile))
    return {
        "kind": "deepseek-harness", "policy": "candidate-locked", "transport": "acp",
        "descriptor": DESCRIPTOR_NAME,
        **{key: descriptor[key] for key in ("entrypoint", "config_path", "agent_entry_id", "node_version")},
        "lockfile": LOCKFILE_NAME,
        "descriptor_digest": _sha(descriptor_path),
        "entrypoint_digest": _sha(entrypoint),
        "lockfile_digest": _sha(lockfile),
    }
