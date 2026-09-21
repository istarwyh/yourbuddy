from __future__ import annotations

import asyncio
import os
import re
import shutil
import signal
import sys
from pathlib import Path, PurePosixPath
from typing import override

from harbor.environments.base import BaseEnvironment, ExecResult
from harbor.environments.capabilities import EnvironmentCapabilities
from harbor.models.task.config import NetworkPolicy


class HostEnvironment(BaseEnvironment):
    """Run Harbor task commands directly on the current host.

    Harbor still speaks in its conventional container paths. This provider maps
    those paths into a trial-local directory (and the real mounted log paths),
    while intentionally applying no isolation, network policy, user switch, or
    resource limit.
    """

    _LOGICAL_ROOTS = (
        "/opt/harbor-dsh-candidate",
        "/opt/harbor-acp-venv",
        "/installed-agent",
        "/run/secrets",
        "/harbor/skills",
        "/solution",
        "/workspace",
        "/tests",
        "/logs",
        "/opt/harbor-dsh",
    )

    def __init__(self, *args, **kwargs) -> None:
        trial_paths = kwargs.get("trial_paths")
        if trial_paths is None and len(args) >= 4:
            trial_paths = args[3]
        if trial_paths is None:
            raise ValueError("HostEnvironment requires trial_paths")
        self._host_root = Path(trial_paths.trial_dir) / ".host-environment"
        self._path_map: dict[str, Path] = {}
        self._processes: set[asyncio.subprocess.Process] = set()
        super().__init__(*args, **kwargs)

    @staticmethod
    @override
    def type() -> str:
        return "host"

    @property
    @override
    def capabilities(self) -> EnvironmentCapabilities:
        # These flags mean Harbor may proceed. Host mode deliberately ignores
        # the corresponding policies rather than enforcing them.
        return EnvironmentCapabilities(
            gpus=True,
            tpus=True,
            disable_internet=True,
            network_allowlist=True,
            network_allowlist_hostnames=True,
            network_allowlist_wildcard_hostnames=True,
            network_allowlist_ipv4_addresses=True,
            network_allowlist_ipv6_addresses=True,
            network_allowlist_ipv4_cidrs=True,
            network_allowlist_ipv6_cidrs=True,
            dynamic_network_policy=True,
            mounted=True,
        )

    @override
    def _validate_definition(self) -> None:
        # Dockerfile and docker-compose.yaml are Docker-provider inputs only.
        return None

    @override
    async def _apply_network_policy(self, network_policy: NetworkPolicy) -> None:
        # Host mode is intentionally unrestricted.
        del network_policy

    def _build_path_map(self) -> dict[str, Path]:
        mapping = {
            root: self._host_root / root.lstrip("/") for root in self._LOGICAL_ROOTS
        }
        mapping["/opt/harbor-acp-venv"] = Path(sys.executable).resolve().parent.parent
        for mount in self._mounts:
            if mount.get("type") == "bind" and mount.get("target"):
                mapping[str(mount["target"])] = Path(str(mount["source"])).expanduser().resolve()
        return mapping

    def resolve_environment_path(self, path: str | Path) -> Path:
        """Resolve a Harbor/container path to its actual host path."""
        value = str(path)
        for logical in sorted(self._path_map, key=len, reverse=True):
            if value == logical:
                return self._path_map[logical]
            if value.startswith(f"{logical}/"):
                suffix = value[len(logical) + 1 :]
                return self._path_map[logical] / PurePosixPath(suffix)
        if value.startswith("/"):
            return Path(value)
        return self._host_root / "workspace" / value

    def _translate_command(self, command: str) -> str:
        logical_paths = sorted(self._path_map, key=len, reverse=True)
        placeholder_prefix = "__HARBOR_RESOLVED_PATH_"
        while placeholder_prefix in command:
            placeholder_prefix = f"_{placeholder_prefix}"
        protected: dict[str, str] = {}
        translated = command
        resolved_paths = sorted(
            {str(path) for path in self._path_map.values()}, key=len, reverse=True
        )
        for index, resolved in enumerate(resolved_paths):
            if resolved not in translated:
                continue
            placeholder = f"{placeholder_prefix}{index}__"
            translated = translated.replace(resolved, placeholder)
            protected[placeholder] = resolved
        pattern = re.compile("|".join(re.escape(path) for path in logical_paths))
        translated = pattern.sub(
            lambda match: str(self._path_map[match.group(0)]), translated
        )
        for placeholder, resolved in protected.items():
            translated = translated.replace(placeholder, resolved)
        return translated

    def _host_env(self, env: dict[str, str] | None = None) -> dict[str, str]:
        merged = dict(os.environ)
        runtime_bin = str(Path(sys.executable).resolve().parent)
        helper_bin = str(self._host_root / "bin")
        merged.update(
            {
                "PATH": os.pathsep.join(
                    [helper_bin, runtime_bin, merged.get("PATH", "")]
                ),
                "HARBOR_HOST_MODE": "1",
                "HARBOR_WORKSPACE_DIR": str(self.resolve_environment_path("/workspace")),
                "HARBOR_TESTS_DIR": str(self.resolve_environment_path("/tests")),
                "HARBOR_SOLUTION_DIR": str(self.resolve_environment_path("/solution")),
                "HARBOR_LOGS_DIR": str(self.resolve_environment_path("/logs")),
                "HARBOR_AGENT_LOG_DIR": str(self.resolve_environment_path("/logs/agent")),
                "HARBOR_VERIFIER_LOG_DIR": str(self.resolve_environment_path("/logs/verifier")),
                "HARBOR_ARTIFACTS_DIR": str(self.resolve_environment_path("/logs/artifacts")),
                "HSE_SESSION_OBSERVATION_PATH": str(self.resolve_environment_path("/opt/harbor-dsh/session-observation.json")),
                "HSE_VERIFIER_LOG_DIR": str(self.resolve_environment_path("/logs/verifier")),
            }
        )
        merged.update(self._merge_env(env) or {})
        return merged

    @override
    async def start(self, force_build: bool) -> None:
        del force_build
        self._host_root.mkdir(parents=True, exist_ok=True)
        self._path_map = self._build_path_map()
        for path in self._path_map.values():
            path.mkdir(parents=True, exist_ok=True)
        helper_bin = self._host_root / "bin"
        helper_bin.mkdir(parents=True, exist_ok=True)
        # Harbor's ACP runner uses GNU stdbuf. macOS does not ship it, so host
        # mode provides a transparent compatibility shim.
        stdbuf = helper_bin / "stdbuf"
        stdbuf.write_text(
            "#!/bin/sh\nwhile [ \"${1#-}\" != \"$1\" ]; do shift; done\nexec \"$@\"\n"
        )
        stdbuf.chmod(0o755)

    @override
    async def stop(self, delete: bool) -> None:
        for process in list(self._processes):
            if process.returncode is None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
        if delete and self._host_root.exists():
            shutil.rmtree(self._host_root)

    @override
    async def upload_file(self, source_path: Path | str, target_path: str) -> None:
        source = Path(source_path)
        target = self.resolve_environment_path(target_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    @override
    async def upload_dir(self, source_dir: Path | str, target_dir: str) -> None:
        source = Path(source_dir)
        target = self.resolve_environment_path(target_dir)
        target.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, target, dirs_exist_ok=True)

    @override
    async def download_file(self, source_path: str, target_path: Path | str) -> None:
        source = self.resolve_environment_path(source_path)
        target = Path(target_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    @override
    async def download_dir(self, source_dir: str, target_dir: Path | str) -> None:
        source = self.resolve_environment_path(source_dir)
        target = Path(target_dir)
        target.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, target, dirs_exist_ok=True)

    @override
    async def exec(
        self,
        command: str,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        timeout_sec: int | None = None,
        user: str | int | None = None,
    ) -> ExecResult:
        del user
        translated = self._translate_command(command)
        host_cwd = self.resolve_environment_path(cwd or self.task_env_config.workdir or "/workspace")
        host_cwd.mkdir(parents=True, exist_ok=True)
        process = await asyncio.create_subprocess_shell(
            translated,
            cwd=str(host_cwd),
            env=self._host_env(env),
            executable="/bin/bash",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            start_new_session=True,
        )
        self._processes.add(process)
        try:
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=timeout_sec
                )
            except TimeoutError:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    await asyncio.wait_for(process.wait(), timeout=2)
                except TimeoutError:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    await process.wait()
                return ExecResult(
                    stdout="",
                    stderr=f"Command timed out after {timeout_sec} seconds",
                    return_code=124,
                )
            stdout_text = stdout.decode(errors="replace")
            stderr_text = stderr.decode(errors="replace")
            callback = self._output_callback()
            if callback is not None:
                if stdout_text:
                    await callback(stdout_text, "stdout")
                if stderr_text:
                    await callback(stderr_text, "stderr")
            return ExecResult(
                stdout=stdout_text,
                stderr=stderr_text,
                return_code=process.returncode or 0,
            )
        finally:
            self._processes.discard(process)
