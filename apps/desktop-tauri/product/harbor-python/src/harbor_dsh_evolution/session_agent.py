from __future__ import annotations

import json
import shlex
from pathlib import Path
from typing import override

from harbor.agents.base import BaseAgent
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext


class SessionObservationAgent(BaseAgent):
    """Deterministically expose one frozen DSH Session Observation to Harbor."""

    OBSERVATION_PATH = "/opt/harbor-dsh/session-observation.json"
    ARTIFACT_PATH = "/logs/artifacts/session-observation.json"
    SUPPORTS_WINDOWS = False

    @staticmethod
    @override
    def name() -> str:
        return "dsh-session-observation-adapter"

    @override
    def version(self) -> str:
        return "2.0.0"

    @staticmethod
    def _path(environment: BaseEnvironment, path: str) -> str:
        resolver = getattr(environment, "resolve_environment_path", None)
        return str(resolver(path)) if callable(resolver) else path

    @override
    async def setup(self, environment: BaseEnvironment) -> None:
        environment_dir = getattr(environment, "environment_dir", None)
        source = Path(environment_dir) / "session-observation.json" if environment_dir else None
        if source is not None and source.is_file():
            await environment.upload_file(source, self.OBSERVATION_PATH)
        result = await environment.exec(
            "test -r /opt/harbor-dsh/session-observation.json "
            "&& mkdir -p /logs/artifacts "
            "&& chmod 0777 /logs/artifacts",
            user="root",
        )
        if result.return_code != 0:
            raise RuntimeError(
                "Frozen Session Observation is unavailable: "
                f"{result.stderr or result.stdout}"
            )

    @override
    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        del instruction
        observation_path = self._path(environment, self.OBSERVATION_PATH)
        artifact_path = self._path(environment, self.ARTIFACT_PATH)
        code = r'''
import hashlib
import json
from decimal import Decimal
from pathlib import Path


def canonical_number(value):
    if isinstance(value, int):
        return str(value)
    if not isinstance(value, float) or not value == value or abs(value) == float("inf"):
        raise ValueError("Canonical JSON supports only finite numbers")
    if value == 0:
        return "0"
    representation = repr(value).lower()
    absolute = abs(value)
    if 1e-6 <= absolute < 1e21:
        fixed = format(Decimal(representation), "f")
        return fixed.rstrip("0").rstrip(".") if "." in fixed else fixed
    mantissa, exponent = representation.split("e")
    mantissa = mantissa.rstrip("0").rstrip(".")
    sign = "+" if int(exponent) >= 0 else "-"
    return f"{mantissa}e{sign}{abs(int(exponent))}"


def canonical_json(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return canonical_number(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(
            canonical_json(key) + ":" + canonical_json(value[key])
            for key in sorted(value, key=lambda item: item.encode("utf-16-be", "surrogatepass"))
        ) + "}"
    raise TypeError("Unsupported canonical JSON value")


source = Path(__OBSERVATION_PATH__)
artifact = Path(__ARTIFACT_PATH__)
value = json.loads(source.read_text())
claimed = value.get("digest")
unsigned = {key: item for key, item in value.items() if key != "digest"}
protocol = value.get("protocol")
namespace = {
    "dsh-session-observation/v1": "harbor-dsh-session-observation-v1",
    "dsh-session-observation/v2": "harbor-dsh-session-observation-v2",
}.get(protocol)
if namespace is None:
    raise RuntimeError("Unsupported Session Observation protocol")
canonical = canonical_json(unsigned).encode()
actual = "sha256:" + hashlib.sha256(namespace.encode() + b"\0" + canonical).hexdigest()
if claimed != actual:
    raise RuntimeError("Session Observation digest mismatch")
artifact.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"status": "observed", "digest": actual}))
'''.replace("__OBSERVATION_PATH__", repr(observation_path)).replace(
            "__ARTIFACT_PATH__", repr(artifact_path)
        ).strip()
        result = await environment.exec(
            f"python3 -c {shlex.quote(code)}",
            timeout_sec=30,
        )
        if result.return_code != 0:
            raise RuntimeError(
                "Session Observation adapter failed: "
                f"{result.stderr or result.stdout}"
            )
        try:
            output = json.loads(result.stdout.strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError) as error:
            raise RuntimeError("Session Observation adapter returned invalid output") from error
        context.metadata = {
            **(context.metadata or {}),
            "execution_adapter": {
                "id": self.name(),
                "version": self.version(),
                "execution_mode": "observe-existing",
                "model_invocation": False,
                "tool_reexecution": False,
            },
            "observation": {
                "digest": output["digest"],
                "artifact": self.ARTIFACT_PATH,
            },
        }
