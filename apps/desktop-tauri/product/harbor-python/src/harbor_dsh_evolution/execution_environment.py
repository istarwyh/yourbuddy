from __future__ import annotations

import platform
import subprocess
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from harbor_dsh_evolution.identity import canonical_digest

HOST_ENVIRONMENT_IMPORT = "harbor_dsh_evolution.host_environment:HostEnvironment"
EXECUTION_ENVIRONMENTS = frozenset({"host", "docker"})


def normalize_execution_environment(value: str | None) -> str:
    kind = str(value or "host").strip().lower()
    if kind not in EXECUTION_ENVIRONMENTS:
        raise ValueError("execution_environment must be host or docker")
    return kind


def _package_version(name: str) -> str:
    try:
        return version(name)
    except PackageNotFoundError:
        return "unknown"


def _command_version(*command: str) -> str:
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return "unavailable"
    return result.stdout.strip() or result.stderr.strip() or "unknown"


def execution_environment_identity(value: str | None) -> dict[str, Any]:
    kind = normalize_execution_environment(value)
    if kind == "docker":
        identity: dict[str, Any] = {
            "kind": "docker",
            "provider": "harbor.environments.docker:LocalDockerEnvironment",
            "isolation": "container",
            "network_policy_enforced": True,
            "resource_limits_enforced": True,
            "user_switch_enforced": True,
            "docker_version": _command_version("docker", "version", "--format", "{{.Server.Version}}"),
            "docker_platform": _command_version("docker", "info", "--format", "{{.OSType}}/{{.Architecture}}"),
            "image_identity": None,
            "identity_strength": "runtime-engine-only",
        }
    else:
        identity = {
            "kind": "host",
            "provider": HOST_ENVIRONMENT_IMPORT,
            "isolation": "none",
            "network_policy_enforced": False,
            "resource_limits_enforced": False,
            "user_switch_enforced": False,
            "identity_strength": "unrestricted-host",
            "platform": platform.system().lower(),
            "platform_release": platform.release(),
            "architecture": platform.machine(),
            "python_version": platform.python_version(),
            "node_version": _command_version("node", "-p", "process.versions.node"),
            "npm_version": _command_version("npm", "--version"),
            "harbor_version": _package_version("harbor"),
            "integration_version": _package_version("harbor-dsh-evolution"),
        }
    identity["runtime_fingerprint"] = canonical_digest(
        identity, namespace="harbor-dsh-execution-environment-v1"
    )
    return identity
