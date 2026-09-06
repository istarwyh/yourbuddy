from __future__ import annotations

from dataclasses import dataclass
import json
import math
from pathlib import Path
import re
from typing import Any

import yaml


class JsExpression(str):
    """A Cordis ``!!js`` scalar preserved while generating a runtime overlay."""


class CordisLoader(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if not isinstance(key, str) or isinstance(key, JsExpression):
                raise ValueError("Candidate Cordis mappings require static string keys; quote scalar keys explicitly")
            if key in result:
                raise ValueError(f"Candidate Cordis config contains a duplicate mapping key: {key}")
            result[key] = self.construct_object(value_node, deep=deep)
        return result


class CordisDumper(yaml.SafeDumper):
    pass


# include@1.0.6 uses js-yaml.JSON_SCHEMA, not PyYAML's YAML 1.1 defaults.
# Limit this overlay parser to that scalar dialect plus !!js. Unsupported
# tags/unsafe numeric precision fail closed rather than rewriting Agent fields.
_INT = re.compile(r"^[-+]?(?:0b[01]+|0o[0-7]+|0x[0-9A-Fa-f]+|[0-9]+)$")
_FLOAT = re.compile(r"^(?:[-+]?[0-9]+(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$")
_NULL = re.compile(r"^(?:~|null|Null|NULL|)$")
_BOOL = re.compile(r"^(?:true|True|TRUE|false|False|FALSE)$")


def _construct_integer(loader, node):
    value = loader.construct_scalar(node)
    if not _INT.fullmatch(value):
        raise ValueError("Candidate Cordis integer is outside the supported JSON_SCHEMA dialect")
    unsigned = value.lstrip("+-")
    radix = {"0b": 2, "0o": 8, "0x": 16}.get(unsigned[:2], 10)
    parsed = int(unsigned[2:] if radix != 10 else unsigned, radix)
    if parsed > 2**53 - 1:
        raise ValueError("Candidate Cordis integer exceeds exact JavaScript precision; quote it as a string")
    if value.startswith("-"):
        return -0.0 if parsed == 0 and unsigned != "0" else -parsed
    return parsed


def _construct_float(loader, node):
    value = loader.construct_scalar(node)
    if not _FLOAT.fullmatch(value):
        raise ValueError("Candidate Cordis float is outside the supported JSON_SCHEMA dialect")
    lowered = value.lower()
    if lowered in {".inf", "+.inf", "-.inf", ".nan"}:
        return {".inf": math.inf, "+.inf": math.inf, "-.inf": -math.inf, ".nan": math.nan}[lowered]
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Candidate Cordis numeric overflow is unsupported; quote it as a string")
    return result


def _construct_boolean(loader, node):
    value = loader.construct_scalar(node)
    if not _BOOL.fullmatch(value):
        raise ValueError("Candidate Cordis boolean requires true or false")
    return value.lower() == "true"


def _construct_null(loader, node):
    if not _NULL.fullmatch(loader.construct_scalar(node)):
        raise ValueError("Candidate Cordis null is outside the supported JSON_SCHEMA dialect")
    return None


CordisLoader.yaml_implicit_resolvers = {}
CordisLoader.yaml_constructors = {
    tag: yaml.SafeLoader.yaml_constructors[tag]
    for tag in ("tag:yaml.org,2002:str", "tag:yaml.org,2002:seq", "tag:yaml.org,2002:map", None)
}
for tag, pattern, initial, constructor in [
    ("null", _NULL, "~nN", _construct_null),
    ("bool", _BOOL, "tTfF", _construct_boolean),
    ("int", _INT, "-+0123456789", _construct_integer),
    ("float", _FLOAT, "-+.0123456789", _construct_float),
]:
    CordisLoader.add_implicit_resolver(f"tag:yaml.org,2002:{tag}", pattern, list(initial) + ([""] if tag == "null" else []))
    CordisLoader.add_constructor(f"tag:yaml.org,2002:{tag}", constructor)
# Quoting must follow the same dialect, or a quoted source string such as
# "1e3"/"0o17" would be dumped bare and become a number when Cordis loads it.
CordisDumper.yaml_implicit_resolvers = CordisLoader.yaml_implicit_resolvers
CordisLoader.add_constructor(
    "tag:yaml.org,2002:js",
    lambda loader, node: JsExpression(loader.construct_scalar(node)),
)
CordisDumper.add_representer(
    JsExpression,
    lambda dumper, value: dumper.represent_scalar("tag:yaml.org,2002:js", value),
)


@dataclass(frozen=True)
class AcpEntry:
    name: str
    config: dict[str, Any]


def _inside(root: Path, path: Path) -> Path:
    resolved = path.resolve()
    if resolved != root and root not in resolved.parents:
        raise ValueError(f"Cordis include leaves the Candidate directory: {path}")
    return resolved.resolve(strict=True)


def _invalid_json_constant(value: str):
    raise ValueError(f"Candidate Cordis JSON config does not permit the non-JSON constant {value}")


def _load_entries(path: Path) -> list[dict[str, Any]]:
    if path.suffix not in {".json", ".yml", ".yaml"}:
        raise ValueError("Candidate Cordis config requires a .json, .yml, or .yaml file supported by the include plugin")
    try:
        source = path.read_text(encoding="utf-8")
        value = (
            json.loads(source, parse_constant=_invalid_json_constant)
            if path.suffix == ".json"
            else yaml.load(source, Loader=CordisLoader)
        )
    except (yaml.YAMLError, json.JSONDecodeError) as error:
        raise ValueError(f"Candidate Cordis config is not valid {path.suffix[1:]}: {path.name}") from error
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise ValueError(f"Candidate Cordis config must contain a top-level entry list: {path}")
    return value


def _entry_name(value: Any) -> str:
    if not isinstance(value, str) or isinstance(value, JsExpression) or not value.strip():
        raise ValueError("Candidate ACP entry requires its own explicit plugin name; no default application is injected")
    return value


def _inline_entries(entries: list[dict[str, Any]]):
    """The include plugin's patch index sees inline groups, not included files."""
    for entry in entries:
        yield entry
        if entry.get("group") and isinstance(entry.get("config"), list):
            children = entry["config"]
            if not all(isinstance(child, dict) for child in children):
                raise ValueError("Candidate inline Cordis groups must contain entry objects")
            yield from _inline_entries(children)


def _validate_include_paths(root: Path, path: Path, active: set[Path]) -> None:
    """Check static file boundaries without pretending to execute include patches."""
    path = _inside(root, path)
    if path in active:
        raise ValueError(f"Candidate Cordis includes form a cycle at {path}")
    active.add(path)
    try:
        for entry in _inline_entries(_load_entries(path)):
            if entry.get("name") not in {
                "@deepseek-ai/cordis-plugin-include",
                "cordis:include",
            }:
                continue
            if entry.get("disabled") is True:
                continue
            include_config = entry.get("config")
            if not isinstance(include_config, dict):
                raise ValueError("Candidate Cordis include requires a static path configuration")
            include_path = include_config.get("path")
            if not isinstance(include_path, str) or isinstance(include_path, JsExpression):
                raise ValueError("Candidate Cordis include requires a static Candidate-relative path")
            _validate_include_paths(root, path.parent / include_path, active)
    finally:
        active.remove(path)


def _resolve_acp_entry(root: Path, path: Path, agent_entry_id: str) -> AcpEntry:
    path = _inside(root, path)
    entries = _load_entries(path)
    _validate_include_paths(root, path, set())
    indexed = [entry for entry in _inline_entries(entries) if entry.get("id") == agent_entry_id]
    # Cordis buildMap is last-write-wins. Reject duplicate IDs instead of
    # emitting an apparently valid patch that can bind to a different row.
    if len(indexed) > 1:
        raise ValueError(f"Candidate Cordis config resolves multiple {agent_entry_id} entries: {path}")
    direct = [entry for entry in entries if entry.get("id") == agent_entry_id]
    if len(direct) != 1:
        raise ValueError(
            f"Candidate {agent_entry_id} must be a direct top-level entry in {path.name}; "
            "nested include/group targets cannot be model-bound. Move the ACP composition "
            "to this top-level config and create a new Candidate snapshot."
        )
    selected = direct[0]
    if selected.get("disabled") is not None and selected["disabled"] is not False:
        raise ValueError("Candidate Cordis config disables the declared ACP entry or cannot prove it is enabled")
    if selected.get("group"):
        raise ValueError("Candidate ACP target must be a direct plugin entry, not a Cordis group")
    config = selected.get("config")
    if config is not None and not isinstance(config, dict):
        raise ValueError("Candidate ACP entry config must be a static object to preserve its non-model fields")
    return AcpEntry(name=_entry_name(selected.get("name")), config=dict(config or {}))


def render_runtime_config(
    candidate_dir: Path,
    *,
    gateway_provider: str,
    model: str,
    gateway_plugin: str = "./.harbor-runtime/llm_gateway.mjs",
    config_path: str = "cordis.yml",
    agent_entry_id: str = "acp-agent",
) -> str:
    root = candidate_dir.expanduser().resolve(strict=True)
    entry = _resolve_acp_entry(root, root / config_path, agent_entry_id)
    config = dict(entry.config)
    config["provider"] = gateway_provider
    config["model"] = model
    runtime = [
        {
            "id": "harbor-candidate-root",
            "name": "@deepseek-ai/cordis-plugin-include",
            "config": {
                "path": f"../{config_path}",
                "patches": [
                    {
                        "id": agent_entry_id,
                        "name": entry.name,
                        "config": config,
                    },
                    {
                        "insert": [
                            {
                                "id": "harbor-model-gateway",
                                "name": gateway_plugin,
                                "config": {
                                    "provider": gateway_provider,
                                    "model": model,
                                    "endpoint": JsExpression("process.env.HSE_MODEL_GATEWAY_URL"),
                                    "tokenFile": JsExpression("process.env.HSE_MODEL_GATEWAY_TOKEN_FILE"),
                                    "modelInfoJson": JsExpression("process.env.HSE_MODEL_GATEWAY_INFO"),
                                },
                            }
                        ]
                    },
                ],
            },
        }
    ]
    return yaml.dump(
        runtime,
        Dumper=CordisDumper,
        allow_unicode=True,
        sort_keys=False,
        width=120,
    )
