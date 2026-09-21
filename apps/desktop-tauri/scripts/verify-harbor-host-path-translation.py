from __future__ import annotations

import argparse
import ast
import asyncio
import hashlib
import json
import logging
import re
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SOURCE = (
    SCRIPT_DIR.parent
    / "product"
    / "harbor-python"
    / "src"
    / "harbor_dsh_evolution"
    / "host_environment.py"
)


def load_translation_method():
    tree = ast.parse(SOURCE.read_text(), filename=str(SOURCE))
    method = next(
        item
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "HostEnvironment"
        for item in node.body
        if isinstance(item, ast.FunctionDef) and item.name == "_translate_command"
    )
    harness = ast.ClassDef(
        name="TranslationHarness",
        bases=[],
        keywords=[],
        body=[method],
        decorator_list=[],
    )
    module = ast.fix_missing_locations(ast.Module(body=[harness], type_ignores=[]))
    namespace = {"re": re}
    exec(compile(module, str(SOURCE), "exec"), namespace)
    return namespace["TranslationHarness"]


def verify_translation() -> dict[str, str]:
    harness_type = load_translation_method()
    harness = harness_type()
    host_root = Path("/tmp/trial/.host-environment")
    harness._path_map = {
        "/opt/harbor-dsh": host_root / "opt/harbor-dsh",
        "/logs": host_root / "logs",
    }
    resolved = str(host_root / "opt/harbor-dsh/session-observation.json")
    resolved_command = f"cat {resolved}"
    assert harness._translate_command(resolved_command) == resolved_command

    logical_command = (
        "cat /opt/harbor-dsh/session-observation.json "
        "> /logs/artifacts/session-observation.json"
    )
    expected = (
        f"cat {host_root}/opt/harbor-dsh/session-observation.json "
        f"> {host_root}/logs/artifacts/session-observation.json"
    )
    translated = harness._translate_command(logical_command)
    assert translated == expected
    assert translated.count(str(host_root)) == 2
    return {"source": str(SOURCE.relative_to(SCRIPT_DIR.parent)), "status": "passed"}


async def verify_integration() -> dict[str, str]:
    from harbor.models.agent.context import AgentContext
    from harbor.models.task.config import EnvironmentConfig
    from harbor.models.trial.paths import TrialPaths
    from harbor_dsh_evolution import __version__
    from harbor_dsh_evolution.host_environment import HostEnvironment
    from harbor_dsh_evolution.session_agent import SessionObservationAgent

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        trial_paths = TrialPaths(root / "trial")
        trial_paths.mkdir()
        environment_dir = root / "task" / "environment"
        environment_dir.mkdir(parents=True)
        unsigned = {
            "protocol": "dsh-session-observation/v1",
            "visible_transcript": [],
        }
        canonical = json.dumps(
            unsigned, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode()
        digest = "sha256:" + hashlib.sha256(
            b"harbor-dsh-session-observation-v1\0" + canonical
        ).hexdigest()
        (environment_dir / "session-observation.json").write_text(
            json.dumps({**unsigned, "digest": digest})
        )
        environment = HostEnvironment(
            environment_dir=environment_dir,
            environment_name="yourbuddy-release-host-session",
            session_id="yourbuddy-release-host-session__env",
            trial_paths=trial_paths,
            task_env_config=EnvironmentConfig(),
            logger=logging.getLogger("yourbuddy-release-host-session"),
        )
        await environment.start(force_build=False)
        try:
            agent = SessionObservationAgent(logs_dir=root)
            context = AgentContext()
            await agent.setup(environment)
            await agent.run("ignored", environment, context)
            artifact = environment.resolve_environment_path(agent.ARTIFACT_PATH)
            assert json.loads(artifact.read_text())["digest"] == digest
            assert context.metadata["observation"]["digest"] == digest
            return {"version": __version__, "digest": digest, "status": "passed"}
        finally:
            await environment.stop(delete=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--integration", action="store_true")
    args = parser.parse_args()
    result = asyncio.run(verify_integration()) if args.integration else verify_translation()
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
