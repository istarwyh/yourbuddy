from __future__ import annotations

import inspect
import json
import os
import shlex
import tempfile
from pathlib import Path
from typing import override

from harbor.agents.installed.acp import AcpAgent, DistributionKind
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext

from harbor_dsh_evolution.candidate import CandidateManifest, verify_candidate
from harbor_dsh_evolution.artifacts import redact
from harbor_dsh_evolution.candidate_runtime import load_candidate_runtime
from harbor_dsh_evolution.runtime_binding import render_runtime_config
from harbor_dsh_evolution.runtime_identity import ACP_RUNNER_SDK_VERSION


def _required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"DSH Candidate model bridge requires {name}")
    return value


class DshCandidateAgent(AcpAgent):
    """Run one immutable DeepSeek Harness Candidate through Harbor's ACP runner."""

    _REMOTE_ROOT = "/opt/harbor-dsh-candidate"
    _GATEWAY_SECRET_PATH = "/run/secrets/hse-model-gateway-token"
    _RUNTIME_DIR = f"{_REMOTE_ROOT}/.harbor-runtime"
    _RUNTIME_CONFIG = f"{_RUNTIME_DIR}/cordis.yml"
    _GATEWAY_PLUGIN = f"{_RUNTIME_DIR}/llm_gateway.mjs"

    def __init__(
        self,
        logs_dir: Path,
        candidate_path: str,
        candidate_digest: str,
        candidate_version: str | None = None,
        candidate_model_provider: str | None = None,
        candidate_model: str | None = None,
        candidate_reasoning_effort: str | None = None,
        **kwargs,
    ) -> None:
        self.candidate_path = Path(candidate_path).expanduser().resolve(strict=True)
        self.manifest: CandidateManifest = verify_candidate(
            self.candidate_path, expected_digest=candidate_digest
        )
        if candidate_version is not None and candidate_version != self.manifest.version:
            raise ValueError(
                "Candidate version mismatch: "
                f"requested={candidate_version}, manifest={self.manifest.version}"
            )
        self.candidate_digest = candidate_digest
        self._candidate_runtime = load_candidate_runtime(self.candidate_path, required=True)
        if self._candidate_runtime != self.manifest.runtime:
            raise ValueError("CANDIDATE_RUNTIME_INVALID: runtime changed after manifest verification; no launcher was selected")
        self._model_binding = {
            "provider": str(candidate_model_provider or "").strip(),
            "model": str(candidate_model or "").strip(),
            **(
                {"reasoning_effort": candidate_reasoning_effort.strip()}
                if candidate_reasoning_effort and candidate_reasoning_effort.strip()
                else {}
            ),
            "transport": "dsh-host-broker",
            "protocol": _required_environment("HSE_MODEL_GATEWAY_PROTOCOL"),
        }
        if not self._model_binding["provider"] or not self._model_binding["model"]:
            raise ValueError("Candidate model provider and model are required")
        pinned_binding = self.manifest.metadata.get("model_binding")
        if isinstance(pinned_binding, dict):
            pinned_identity = {
                "provider": str(pinned_binding.get("provider") or "").strip(),
                "model": str(pinned_binding.get("model") or "").strip(),
                **(
                    {
                        "reasoning_effort": str(
                            pinned_binding["reasoning_effort"]
                        ).strip()
                    }
                    if pinned_binding.get("reasoning_effort")
                    else {}
                ),
            }
            runtime_identity = {
                key: self._model_binding[key]
                for key in ("provider", "model", "reasoning_effort")
                if key in self._model_binding
            }
            if pinned_identity != runtime_identity:
                raise ValueError(
                    "Candidate model-binding.json does not match the Host Broker "
                    "binding; create a new Candidate for a different model identity"
                )
        self._gateway_url = _required_environment("HSE_MODEL_GATEWAY_URL")
        self._gateway_token = _required_environment("HSE_MODEL_GATEWAY_TOKEN")
        self._gateway_provider = _required_environment("HSE_MODEL_GATEWAY_PROVIDER")
        self._gateway_info = _required_environment("HSE_MODEL_GATEWAY_INFO")
        try:
            gateway_info = json.loads(self._gateway_info)
        except json.JSONDecodeError as error:
            raise ValueError("HSE_MODEL_GATEWAY_INFO must be valid JSON") from error
        if gateway_info.get("id") != self._model_binding["model"]:
            raise ValueError("Candidate model binding does not match gateway model metadata")

        registry_entry = {
            "id": self.manifest.candidate_id,
            "name": f"DeepSeek Harness Candidate {self.manifest.candidate_id}",
            "version": self.manifest.version,
            "description": "Immutable Cordis composition evaluated through ACP.",
            "distribution": {
                "npx": {
                    # Upstream requires distribution metadata; install() never
                    # interprets this explicit local marker as an npm package.
                    "package": f"candidate-local:{self.candidate_digest}",
                    "args": ["--config", self._RUNTIME_CONFIG],
                    "env": {
                        "DSH_SESSION_ROOT": f"{self._REMOTE_ROOT}/.sessions",
                        "HSE_MODEL_GATEWAY_URL": self._gateway_url,
                        "HSE_MODEL_GATEWAY_TOKEN_FILE": self._GATEWAY_SECRET_PATH,
                        "HSE_MODEL_GATEWAY_INFO": self._gateway_info,
                    },
                }
            },
        }
        super().__init__(
            logs_dir=logs_dir,
            registry_entry=registry_entry,
            distribution_preference="npx",
            auth_policy="disabled",
            **kwargs,
        )

    @staticmethod
    @override
    def name() -> str:
        return "dsh-candidate"

    @override
    def version(self) -> str:
        return self.manifest.version

    @override
    def _build_dependencies_command(self, kind: DistributionKind) -> str:
        """Check the prepared Task runtime; never change Node/SDK at run time."""
        return f"""
set -euo pipefail
for tool in bash python3 node npm stdbuf; do command -v "$tool" >/dev/null; done
test "$(node -p 'process.versions.node')" = {shlex.quote(self._candidate_runtime['node_version'])}
test -x {self._RUNNER_VENV_PATH}/bin/python
{self._RUNNER_VENV_PATH}/bin/python -c 'import acp; from importlib.metadata import version; assert version("agent-client-protocol") == "{ACP_RUNNER_SDK_VERSION}"'
""".strip()

    @override
    def _build_node_install_command(self) -> str:
        return f"test \"$(node -p 'process.versions.node')\" = {shlex.quote(self._candidate_runtime['node_version'])}"

    @override
    def _build_launcher_script(self, kind=None, target=None) -> str:
        exports = {
            "DSH_SESSION_ROOT": f"{self._REMOTE_ROOT}/.sessions",
            "DSH_HOME": f"{self._RUNTIME_DIR}/home",
            "DSH_AGENTS_HOME": f"{self._RUNTIME_DIR}/agents",
            "HSE_MODEL_GATEWAY_URL": self._gateway_url,
            "HSE_MODEL_GATEWAY_TOKEN_FILE": self._GATEWAY_SECRET_PATH,
            "HSE_MODEL_GATEWAY_INFO": self._gateway_info,
        }
        env = "\n".join(f"export {key}={shlex.quote(value)}" for key, value in exports.items())
        command = " ".join(map(shlex.quote, ["node", f"{self._REMOTE_ROOT}/{self._candidate_runtime['entrypoint']}", "--config", self._RUNTIME_CONFIG]))
        # Keep the Task cwd; the Candidate application's directory is not the
        # task workspace passed to ACP session/new.
        return f"#!/bin/sh\nset -eu\n{env}\n{self._build_node_install_command()}\npython3 {self._RUNTIME_DIR}/check_source.py\nexec {command} \"$@\"\n"

    @override
    async def install(self, environment: BaseEnvironment) -> None:
        checked = await environment.exec(self._build_dependencies_command("npx"), user="root", timeout_sec=30)
        if checked.return_code != 0:
            self._setup_diagnostic("environment", checked)
            raise RuntimeError(
                "CANDIDATE_RUNTIME_ENVIRONMENT_UNREADY: prepare the Task image with "
                f"Node {self._candidate_runtime['node_version']}, bash/npm/python3/stdbuf and "
                f"{self._RUNNER_VENV_PATH} containing agent-client-protocol=={ACP_RUNNER_SDK_VERSION}. "
                "No automatic Node, SDK or ACP application installation was attempted."
            )
        self._selected_distribution_kind = "candidate-local"  # type: ignore[assignment]
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        launcher = self.logs_dir / "acp-launch.sh"
        launcher.write_text(self._build_launcher_script())
        await environment.upload_file(launcher, self._LAUNCHER_REMOTE_PATH)
        await environment.upload_file(Path(inspect.getfile(AcpAgent)).with_name("acp_runner.py"), self._RUNNER_REMOTE_PATH)
        await environment.upload_file(Path(__file__).with_name("acp_readiness.py"), "/installed-agent/acp_readiness.py")
        await environment.exec(f"chmod +x {self._LAUNCHER_REMOTE_PATH} {self._RUNNER_REMOTE_PATH}", user="root")

    @override
    async def setup(self, environment: BaseEnvironment) -> None:
        await super().setup(environment)
        await environment.exec("mkdir -p /run/secrets", user="root")
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as secret:
            secret.write(self._gateway_token)
            secret.flush()
            await environment.upload_file(Path(secret.name), self._GATEWAY_SECRET_PATH)
        await environment.exec(
            f"chmod 600 {shlex.quote(self._GATEWAY_SECRET_PATH)}",
            user="root",
        )
        preflight_code = (
            "import json,sys,urllib.request;"
            "token=open(sys.argv[2], encoding='utf-8').read().strip();"
            "request=urllib.request.Request(sys.argv[1],headers={'Authorization':'Bearer '+token});"
            "reply=json.load(urllib.request.urlopen(request,timeout=10));"
            "assert reply.get('protocol')==sys.argv[3]"
        )
        preflight = await environment.exec(
            " ".join(
                [
                    "python3",
                    "-c",
                    shlex.quote(preflight_code),
                    shlex.quote(self._gateway_url),
                    shlex.quote(self._GATEWAY_SECRET_PATH),
                    shlex.quote(self._model_binding["protocol"]),
                ]
            ),
            user="root",
            timeout_sec=20,
        )
        if preflight.return_code != 0:
            raise RuntimeError(
                "Candidate cannot reach the DSH Host model gateway: "
                f"{self._setup_diagnostic('model-gateway', preflight)}"
            )
        await environment.exec(
            f"rm -rf {shlex.quote(self._REMOTE_ROOT)} && "
            f"mkdir -p {shlex.quote(self._REMOTE_ROOT)}",
            user="root",
        )
        # Host node_modules/cache/.git are not part of the execution artifact.
        # Reverify the staged copy before anything is uploaded (also closes the
        # source-read TOCTOU window for the content-addressed inventory).
        with tempfile.TemporaryDirectory(prefix="harbor-candidate-stage-") as temporary:
            staged = Path(temporary)
            for item in self.manifest.files:
                destination = staged / item.path
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes((self.candidate_path / item.path).read_bytes())
            (staged / "candidate-manifest.json").write_text(json.dumps(self.manifest.to_dict()))
            verify_candidate(staged, expected_digest=self.candidate_digest)
            runtime_config = render_runtime_config(
                staged,
                gateway_provider=self._gateway_provider,
                model=self._model_binding["model"],
                config_path=self._candidate_runtime["config_path"],
                agent_entry_id=self._candidate_runtime["agent_entry_id"],
                gateway_plugin=self._GATEWAY_PLUGIN,
            )
            await environment.upload_dir(staged, self._REMOTE_ROOT)
        await environment.exec(
            f"mkdir -p {shlex.quote(self._RUNTIME_DIR)}", user="root"
        )
        await environment.upload_file(
            Path(__file__).with_name("llm_gateway.mjs"), self._GATEWAY_PLUGIN
        )
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as runtime:
            runtime.write(runtime_config)
            runtime.flush()
            await environment.upload_file(Path(runtime.name), self._RUNTIME_CONFIG)

        checker = "\n".join([
            "import hashlib, json", "from pathlib import Path",
            f"root = Path({self._REMOTE_ROOT!r})",
            f"inventory = json.loads({json.dumps([item.__dict__ for item in self.manifest.files])!r})",
            "for item in inventory:",
            "    path = root / item['path']",
            "    assert not any((root / Path(*path.relative_to(root).parts[:i])).is_symlink() for i in range(1, len(path.relative_to(root).parts) + 1)), 'Candidate source symlink drift'",
            "    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], 'Candidate source identity drift'",
        ]) + "\n"
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as source_check:
            source_check.write(checker)
            source_check.flush()
            await environment.upload_file(Path(source_check.name), f"{self._RUNTIME_DIR}/check_source.py")
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8") as npm_config:
            await environment.upload_file(Path(npm_config.name), f"{self._RUNTIME_DIR}/npmrc")
        install = await environment.exec(
            f'env -i PATH="$PATH" npm ci --omit=dev --ignore-scripts --no-audit --no-fund '
            f"--userconfig=/dev/null --globalconfig={self._RUNTIME_DIR}/npmrc "
            f"--cache={self._RUNTIME_DIR}/npm-cache --registry=https://registry.npmjs.org",
            cwd=self._REMOTE_ROOT,
            user="root",
            timeout_sec=600,
        )
        if install.return_code != 0:
            detail = self._setup_diagnostic("npm-install", install)
            raise RuntimeError(
                "CANDIDATE_RUNTIME_INSTALL_FAILED: failed to install the frozen Candidate lockfile: "
                f"{detail}"
            )
        await environment.exec(
            f"chmod -R a+rX {shlex.quote(self._REMOTE_ROOT)}", user="root"
        )
        readiness = await environment.exec(
            f"{self._RUNNER_VENV_PATH}/bin/python /installed-agent/acp_readiness.py --launcher {self._LAUNCHER_REMOTE_PATH}",
            timeout_sec=45,
        )
        if readiness.return_code != 0:
            self._setup_diagnostic("acp-readiness", readiness)
            raise RuntimeError("CANDIDATE_RUNTIME_HANDSHAKE_FAILED: the installed Candidate could not initialize an ACP Session with model requests disabled. Inspect setup logs; no evaluation prompt was sent.")
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        (self.logs_dir / "candidate-runtime.json").write_text(json.dumps({
            **self._candidate_runtime, "candidate_digest": self.candidate_digest,
            "runner_sdk_version": ACP_RUNNER_SDK_VERSION,
            "readiness": "initialize-and-session-new", "preflight_model_requests": "disabled",
        }, indent=2) + "\n")

    def _setup_diagnostic(self, stage: str, result) -> str:
        detail = str(redact(str(result.stderr or result.stdout or "no diagnostic output").replace(self._gateway_token, "[REDACTED job capability]")))[:12000]
        directory = self.logs_dir / "setup"
        directory.mkdir(parents=True, exist_ok=True)
        (directory / f"{stage}.txt").write_text(detail + "\n")
        return detail

    @override
    def populate_context_post_run(self, context: AgentContext) -> None:
        super().populate_context_post_run(context)
        metadata = dict(context.metadata or {})
        metadata["candidate"] = {
            "id": self.manifest.candidate_id,
            "version": self.manifest.version,
            "digest": self.candidate_digest,
            "runtime": self.manifest.runtime,
            "model_binding": self._model_binding,
        }
        context.metadata = metadata

        self.logs_dir.mkdir(parents=True, exist_ok=True)
        (self.logs_dir / "candidate.json").write_text(
            json.dumps(metadata["candidate"], ensure_ascii=False, indent=2) + "\n"
        )
