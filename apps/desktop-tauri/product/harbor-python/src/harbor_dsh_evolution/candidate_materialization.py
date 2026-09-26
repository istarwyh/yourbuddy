from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

from harbor_dsh_evolution.bridge_contract import BRIDGE_CONTRACT
from harbor_dsh_evolution.dataset import (
    MANIFEST_NAME,
    runtime_task_directories,
    snapshot_dataset,
    validate_dataset,
)
from harbor_dsh_evolution.evaluator import load_evaluator_descriptor
from harbor_dsh_evolution.identity import public_relative, resolve_inside
from harbor_dsh_evolution.stack import load_stack

MATERIALIZATION_PROTOCOL = BRIDGE_CONTRACT["protocols"]["candidate_materialization"]["protocol"]


def _identity(interface: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": interface["evaluator_id"],
        "version": interface["version"],
        "portable_digest": interface["portable_digest"],
    }


def _materialization(interface: dict[str, Any]) -> dict[str, Any]:
    identity = _identity(interface)
    return {
        "schema_version": 1,
        "protocol": "evaluator-materialization/v1",
        "configured": identity,
        "materialized": {
            **identity,
            "interface": interface["interface"],
            "entry": interface["implementation"]["entry"],
            "callable": interface["implementation"]["callable"],
            "bundle_complete": True,
        },
        "bundle_files": interface["bundle_files"],
    }


def _candidate_verifier_source() -> str:
    return '''import hashlib
import importlib.util
import json
import math
import os
import sys
from decimal import Decimal
from pathlib import Path

TESTS_DIR = Path(os.environ.get("HARBOR_TESTS_DIR", Path(__file__).resolve().parent))
BUNDLE_DIR = TESTS_DIR / "evaluator-bundle"
DESCRIPTOR_PATH = BUNDLE_DIR / "evaluator.json"
MATERIALIZATION_PATH = TESTS_DIR / "evaluator-materialization.json"
VERIFIER_DIR = Path(os.environ.get("HSE_VERIFIER_LOG_DIR", "/logs/verifier"))


def _canonical_json(value):
    if value is None: return "null"
    if value is True: return "true"
    if value is False: return "false"
    if isinstance(value, int) and not isinstance(value, bool): return str(value)
    if isinstance(value, float):
        if not math.isfinite(value): raise ValueError("non-finite canonical number")
        if value == 0: return "0"
        absolute = abs(value)
        representation = repr(value)
        if 1e-6 <= absolute < 1e21:
            fixed = format(Decimal(representation), "f")
            return fixed.rstrip("0").rstrip(".") if "." in fixed else fixed
        mantissa, exponent = representation.lower().split("e")
        exponent_value = int(exponent)
        return f"{mantissa}e{'+' if exponent_value >= 0 else ''}{exponent_value}"
    if isinstance(value, str): return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, (list, tuple)): return "[" + ",".join(_canonical_json(item) for item in value) + "]"
    if isinstance(value, dict): return "{" + ",".join(_canonical_json(key) + ":" + _canonical_json(value[key]) for key in sorted(value, key=lambda item: item.encode("utf-16-be", "surrogatepass"))) + "}"
    raise ValueError("unsupported canonical value")


def _canonical_digest(value, namespace):
    payload = _canonical_json(value).encode("utf-8")
    digest = hashlib.sha256()
    digest.update(namespace.encode("utf-8"))
    digest.update(b"\\0")
    digest.update(payload)
    return "sha256:" + digest.hexdigest()


def _runtime_identity(descriptor):
    files = []
    root = BUNDLE_DIR.resolve(strict=True)
    for item in descriptor["bundle_files"]:
        relative = str(item["path"])
        candidate = (root / relative).resolve(strict=True)
        if candidate != root and root not in candidate.parents:
            raise RuntimeError("Evaluator bundle file escaped the materialized directory")
        content = candidate.read_bytes()
        files.append({
            "path": relative,
            "digest": "sha256:" + hashlib.sha256(content).hexdigest(),
            "size": len(content),
        })
    return {
        "id": descriptor["evaluator_id"],
        "version": descriptor["version"],
        "portable_digest": _canonical_digest(
            {"descriptor": descriptor, "files": files},
            "harbor-dsh-evaluator-portable-v1",
        ),
        "interface": descriptor["interface"],
        "entry": descriptor["implementation"]["entry"],
        "callable": descriptor["implementation"]["callable"],
        "bundle_complete": True,
    }


def _load_callable(entry, callable_name, module_name):
    root = BUNDLE_DIR.resolve(strict=True)
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    source = (root / entry).resolve(strict=True)
    if source != root and root not in source.parents:
        raise RuntimeError("Evaluator entry escaped the materialized directory")
    spec = importlib.util.spec_from_file_location(module_name, source)
    if spec is None or spec.loader is None:
        raise RuntimeError("Evaluator entry could not be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    value = getattr(module, callable_name, None)
    if not callable(value):
        raise RuntimeError(f"Evaluator callable {callable_name} is unavailable")
    return value


def _failure(descriptor, reason):
    criteria = [{
        "id": item["id"], "status": "evaluation-error", "score": None,
        "reason": reason,
        "recommendation": "Repair the strict Evaluator bundle or input builder, then rerun the frozen Task.",
        "evidence_refs": ["evaluator-materialization"],
    } for item in descriptor["criteria"]]
    return {
        "schema_version": 2,
        "protocol": "evaluation-result/v2",
        "criteria": criteria,
        "aggregate": {
            "metric_id": descriptor["aggregate"]["metric_id"],
            "value": None,
            "scored_criteria": 0,
            "total_criteria": len(criteria),
            "coverage": 0.0,
        },
    }


def _native_reward(result, identity_match):
    if not identity_match:
        return {"evaluator_identity_match": 0}
    aggregate = result.get("aggregate") or {}
    coverage = aggregate.get("coverage")
    return {"criterion_coverage": float(coverage)} if isinstance(coverage, (int, float)) and not isinstance(coverage, bool) and math.isfinite(coverage) else {"evaluator_identity_match": 0}


descriptor = json.loads(DESCRIPTOR_PATH.read_text())
materialization = json.loads(MATERIALIZATION_PATH.read_text())
expected = materialization["configured"]
try:
    before = _runtime_identity(descriptor)
except Exception:
    before = None
identity_match = bool(
    before
    and before["id"] == expected["id"]
    and before["version"] == expected["version"]
    and before["portable_digest"] == expected["portable_digest"]
)
executed = None
execution = {"status": "not-run", "error_type": None}
if identity_match:
    executed = before
    execution = {"status": "attempted", "error_type": None}
    try:
        builder = descriptor["input_builder"]
        build_input = _load_callable(builder["entry"], builder["callable"], "harbor_user_input_builder")
        evaluate = _load_callable(
            descriptor["implementation"]["entry"],
            descriptor["implementation"]["callable"],
            "harbor_user_evaluator",
        )
        payload = build_input({
            "schema_version": 1,
            "protocol": "evaluation-input-builder-context/v1",
            "task_root": os.environ.get("HSE_TASK_ROOT", "/app"),
            "agent_log_dir": os.environ.get("HARBOR_AGENT_LOG_DIR", "/logs/agent"),
            "artifact_dir": os.environ.get("HARBOR_ARTIFACTS_DIR", "/logs/artifacts"),
        })
        if not isinstance(payload, dict):
            raise RuntimeError("Evaluator input builder must return an object")
        if payload.get("protocol") != descriptor["protocol"]["input"]:
            raise RuntimeError("Evaluator input builder returned the wrong protocol")
        result = evaluate(payload)
        if not isinstance(result, dict):
            raise RuntimeError("Evaluator must return an object")
        if result.get("schema_version") != 2 or result.get("protocol") != descriptor["protocol"]["output"]:
            raise RuntimeError("Evaluator returned the wrong output protocol")
        after = _runtime_identity(descriptor)
        executed = after
        identity_match = after == before and after["portable_digest"] == expected["portable_digest"]
        if not identity_match:
            execution = {"status": "failed", "error_type": "EvaluatorIdentityChanged"}
            result = _failure(descriptor, "The Evaluator bundle changed during execution.")
        else:
            execution = {"status": "succeeded", "error_type": None}
    except Exception as error:
        try:
            after = _runtime_identity(descriptor)
        except Exception:
            after = None
        executed = after or before
        identity_match = bool(
            after
            and after == before
            and after["portable_digest"] == expected["portable_digest"]
        )
        execution = {"status": "failed", "error_type": type(error).__name__}
        result = _failure(descriptor, f"Strict Evaluator execution failed ({type(error).__name__}).")
else:
    result = _failure(descriptor, "The materialized Evaluator bundle does not match the configured identity.")

result["effective_evaluator"] = {
    "schema_version": 1,
    "protocol": "effective-evaluator/v1",
    "configured": expected,
    "materialized": before,
    "executed": executed,
    "identity_match": identity_match,
    "execution": execution,
}
VERIFIER_DIR.mkdir(parents=True, exist_ok=True)
(VERIFIER_DIR / "evaluation-result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\\n")
(VERIFIER_DIR / "reward.json").write_text(json.dumps(_native_reward(result, identity_match), separators=(",", ":")) + "\\n")
print(json.dumps(result, ensure_ascii=False))
'''


def validate_candidate_materialization(
    *,
    project_root: Path,
    dataset_path: Path,
    stack_path: Path,
) -> dict[str, Any]:
    """Fail closed unless every Harbor Task uses the generated strict Evaluator adapter."""
    project_root = project_root.expanduser().resolve(strict=True)
    dataset_path = resolve_inside(project_root, dataset_path, label="materialized dataset")
    stack_path = resolve_inside(project_root, stack_path, label="stack")
    dataset = validate_dataset(dataset_path, project_root=project_root)
    if not dataset.valid or dataset.manifest is None:
        codes = ", ".join(item["code"] for item in dataset.findings)
        raise ValueError(f"STRICT_CANDIDATE_MATERIALIZATION_INVALID: {codes}")
    stack = load_stack(stack_path)
    evaluator_component = (stack.get("components") or {}).get("evaluator") or {}
    configured_descriptor = resolve_inside(
        project_root, evaluator_component.get("entry") or "", label="evaluator descriptor"
    )
    configured = load_evaluator_descriptor(configured_descriptor, project_root=project_root)
    if configured.get("protocol", {}).get("output") != "evaluation-result/v2":
        raise ValueError("STRICT_EVALUATOR_V2_REQUIRED: formal Candidate Experiments require evaluation-result/v2")
    expected_identity = _identity(configured)
    metadata = dataset.manifest.get("metadata") or {}
    receipt = metadata.get("materialization")
    if not isinstance(receipt, dict) or receipt.get("protocol") != MATERIALIZATION_PROTOCOL:
        raise ValueError("STRICT_CANDIDATE_MATERIALIZATION_REQUIRED: Dataset was not produced by the strict materializer")
    if receipt.get("evaluator") != expected_identity:
        raise ValueError("STRICT_CANDIDATE_EVALUATOR_MISMATCH: Dataset materialization does not bind the configured Evaluator")
    _ = str(receipt.get("source_dataset_digest") or "")
    if not _.startswith("sha256:") or len(_) != 71:
        raise ValueError("STRICT_CANDIDATE_SOURCE_DIGEST_REQUIRED: materialization provenance is incomplete")

    expected_adapter = _candidate_verifier_source()
    expected_script = "#!/bin/sh\nset -eu\npython3 /tests/verify.py\n"
    expected_materialization = _materialization(configured)
    tasks = runtime_task_directories(dataset_path)
    if len(tasks) != dataset.manifest.get("task_count"):
        raise ValueError("STRICT_CANDIDATE_TASK_COUNT_MISMATCH")
    task_receipts = []
    for task in tasks:
        tests = task / "tests"
        if tests.is_symlink() or not tests.is_dir():
            raise ValueError(f"STRICT_CANDIDATE_ADAPTER_MISSING: {task.name}")
        allowed = {"verify.py", "test.sh", "evaluator-materialization.json", "evaluator-bundle"}
        if {item.name for item in tests.iterdir()} != allowed:
            raise ValueError(f"STRICT_CANDIDATE_ADAPTER_LAYOUT_INVALID: {task.name}")
        verify_path = tests / "verify.py"
        test_path = tests / "test.sh"
        materialization_path = tests / "evaluator-materialization.json"
        if any(path.is_symlink() or not path.is_file() for path in (verify_path, test_path, materialization_path)):
            raise ValueError(f"STRICT_CANDIDATE_ADAPTER_UNSAFE: {task.name}")
        if verify_path.read_text() != expected_adapter or test_path.read_text() != expected_script:
            raise ValueError(f"STRICT_CANDIDATE_ADAPTER_TAMPERED: {task.name}")
        try:
            materialization = json.loads(materialization_path.read_text())
        except json.JSONDecodeError as error:
            raise ValueError(f"STRICT_CANDIDATE_RECEIPT_INVALID: {task.name}") from error
        if materialization != expected_materialization:
            raise ValueError(f"STRICT_CANDIDATE_RECEIPT_MISMATCH: {task.name}")
        bundle_descriptor = tests / "evaluator-bundle" / "evaluator.json"
        materialized_interface = load_evaluator_descriptor(bundle_descriptor, project_root=dataset_path)
        if _identity(materialized_interface) != expected_identity:
            raise ValueError(f"STRICT_CANDIDATE_BUNDLE_MISMATCH: {task.name}")
        task_receipts.append({"task": task.name, "evaluator": expected_identity, "adapter_verified": True})
    return {
        "schema_version": 1,
        "protocol": MATERIALIZATION_PROTOCOL,
        "dataset_digest": dataset.manifest["source_digest"],
        "source_dataset_digest": receipt["source_dataset_digest"],
        "evaluator": expected_identity,
        "tasks": task_receipts,
        "verified": True,
    }


def materialize_candidate_dataset(
    *,
    project_root: Path,
    dataset_path: Path,
    stack_path: Path,
    output_path: Path,
) -> dict[str, Any]:
    project_root = project_root.expanduser().resolve(strict=True)
    dataset_path = resolve_inside(project_root, dataset_path, label="dataset")
    stack_path = resolve_inside(project_root, stack_path, label="stack")
    source_validation = validate_dataset(dataset_path, project_root=project_root)
    if not source_validation.valid or source_validation.manifest is None:
        codes = ", ".join(item["code"] for item in source_validation.findings)
        raise ValueError(f"Candidate Dataset validation failed: {codes}")

    stack = load_stack(stack_path)
    evaluator_component = (stack.get("components") or {}).get("evaluator") or {}
    descriptor_path = resolve_inside(
        project_root, evaluator_component.get("entry") or "", label="evaluator descriptor"
    )
    interface = load_evaluator_descriptor(descriptor_path, project_root=project_root)
    if not interface.get("bundle_complete"):
        raise ValueError(
            "STRICT_EVALUATOR_BUNDLE_REQUIRED: evaluator.json must declare bundle_files for every file in the versioned bundle"
        )
    if interface.get("protocol", {}).get("output") != "evaluation-result/v2":
        raise ValueError(
            "STRICT_EVALUATOR_V2_REQUIRED: formal Candidate Experiments require evaluation-result/v2 so failures can abstain without business-zero scores"
        )
    if not interface.get("input_builder"):
        raise ValueError(
            "STRICT_EVALUATOR_INPUT_BUILDER_REQUIRED: evaluator.json must declare input_builder.entry and input_builder.callable"
        )
    if interface.get("implementation", {}).get("language") != "python":
        raise ValueError("STRICT_EVALUATOR_LANGUAGE_UNSUPPORTED: only Python Evaluators are currently supported")

    output_path = output_path.expanduser()
    if not output_path.is_absolute():
        output_path = project_root / output_path
    output_path = output_path.resolve()
    if output_path != project_root and project_root not in output_path.parents:
        raise ValueError("Candidate materialization must stay under the project root")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        raise FileExistsError(f"Candidate materialization already exists: {output_path}")
    temporary = Path(tempfile.mkdtemp(prefix=f".{output_path.name}-", dir=output_path.parent))
    try:
        source_tasks = runtime_task_directories(dataset_path)
        for source_task in source_tasks:
            target_task = temporary / source_task.name
            shutil.copytree(
                source_task,
                target_task,
                ignore=lambda directory, names: {"tests"}
                if Path(directory).resolve() == source_task.resolve() and "tests" in names
                else set(),
            )
            tests_dir = target_task / "tests"
            bundle_dir = tests_dir / "evaluator-bundle"
            bundle_dir.mkdir(parents=True)
            shutil.copy2(descriptor_path, bundle_dir / "evaluator.json")
            for item in interface["bundle_files"]:
                relative = Path(item["path"])
                source = descriptor_path.parent / relative
                target = bundle_dir / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
            (tests_dir / "evaluator-materialization.json").write_text(
                json.dumps(_materialization(interface), ensure_ascii=False, indent=2) + "\n"
            )
            (tests_dir / "verify.py").write_text(_candidate_verifier_source())
            test_sh = tests_dir / "test.sh"
            test_sh.write_text("#!/bin/sh\nset -eu\npython3 /tests/verify.py\n")
            test_sh.chmod(0o755)

        source_manifest = source_validation.manifest
        manifest = snapshot_dataset(
            temporary,
            dataset_id=source_manifest["dataset_id"],
            version=source_manifest["version"],
            dataset_kind=source_manifest.get("dataset_kind"),
            source_kind=source_manifest.get("source_kind"),
            metadata={
                **(source_manifest.get("metadata") or {}),
                "materialization": {
                    "protocol": MATERIALIZATION_PROTOCOL,
                    "source_dataset_digest": source_manifest["source_digest"],
                    "evaluator": _identity(interface),
                },
            },
        )
        os.replace(temporary, output_path)
        return {
            "schema_version": 1,
            "protocol": MATERIALIZATION_PROTOCOL,
            "dataset_path": str(output_path),
            "dataset_manifest": manifest,
            "source_dataset": {
                "id": source_manifest["dataset_id"],
                "version": source_manifest["version"],
                "digest": source_manifest["source_digest"],
                "path": public_relative(project_root, dataset_path),
            },
            "effective_evaluator": _materialization(interface),
        }
    except Exception:
        shutil.rmtree(temporary, ignore_errors=True)
        raise
