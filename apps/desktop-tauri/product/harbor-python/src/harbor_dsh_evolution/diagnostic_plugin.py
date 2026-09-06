"""Pinned, diagnostic-only entry to the real EvolutionPlugin lifecycle."""
from __future__ import annotations

import json
import re
from typing import Any, override

from harbor.job import Job

from harbor_dsh_evolution.dataset import load_validated_dataset
from harbor_dsh_evolution.plugin import EvolutionPlugin
from harbor_dsh_evolution.stack import snapshot_stack

_DIGEST = re.compile(r"^sha256:[a-f0-9]{64}$")


class BoundedDiagnosticPlugin(EvolutionPlugin):
    def __init__(self, *, expected_dataset_digest: str, expected_stack_digest: str, operation_id: str, source_plan_digest: str, **kwargs: Any):
        if kwargs.get("mode") != "diagnostic" or kwargs.get("policy_path"):
            raise ValueError("HARBOR_DIAGNOSTIC_MODE_INVALID: This runner cannot run promotion or Gate operations.")
        if not all(_DIGEST.fullmatch(value) for value in (expected_dataset_digest, expected_stack_digest, source_plan_digest)):
            raise ValueError("HARBOR_DIAGNOSTIC_IDENTITY_INVALID: Pinned source digests are required.")
        if not re.fullmatch(r"hop_[A-Za-z0-9_-]{1,100}", operation_id):
            raise ValueError("HARBOR_DIAGNOSTIC_OPERATION_INVALID: A Host-owned Operation ID is required.")
        super().__init__(**kwargs)
        self._expected_dataset_digest = expected_dataset_digest
        self._expected_stack_digest = expected_stack_digest
        self._operation_id = operation_id
        self._source_plan_digest = source_plan_digest

    @override
    async def on_job_start(self, job: Job) -> None:
        if not 1 <= job.config.n_concurrent_trials <= 2 or job.config.n_attempts != 1 or job.config.retry.max_retries != 0:
            raise ValueError("HARBOR_DIAGNOSTIC_QUOTA: Job concurrency, attempts, or retries exceed the confirmed bound.")
        if self._requested_dataset_path is None:
            raise ValueError("HARBOR_DIAGNOSTIC_SOURCE_INVALID: A materialized Dataset is required.")
        dataset = load_validated_dataset(self._requested_dataset_path, project_root=self._project_root)
        stack = snapshot_stack(self._stack_path, project_root=self._project_root)
        provenance = (dataset.get("metadata") or {}).get("diagnostic_provenance") or {}
        if dataset.get("source_digest") != self._expected_dataset_digest or stack.get("digest") != self._expected_stack_digest:
            raise ValueError("HARBOR_DIAGNOSTIC_REVISION_CONFLICT: Diagnostic inputs changed before Trial execution.")
        if provenance.get("operationId") != self._operation_id or provenance.get("planDigest") != self._source_plan_digest or provenance.get("promotionEligible") is not False:
            raise ValueError("HARBOR_DIAGNOSTIC_PROVENANCE_INVALID: The Dataset is not bound to the confirmed Operation.")
        if len(dataset["tasks"]) != len(provenance.get("selection") or []) or not 1 <= len(dataset["tasks"]) <= 12:
            raise ValueError("HARBOR_DIAGNOSTIC_SELECTION_INVALID: The materialized selection exceeds its bound.")
        # Parent lifecycle is the actual Harbor integration, not a separate
        # evaluator simulation. Fail before returning control to Trial launch.
        await super().on_job_start(job)
        if self._context["dataset"]["source_digest"] != self._expected_dataset_digest or self._context["evaluation_stack"]["digest"] != self._expected_stack_digest:
            raise ValueError("HARBOR_DIAGNOSTIC_REVISION_CONFLICT: Diagnostic inputs changed while binding the Job.")
        receipt = {"protocol": "harbor-diagnostic-provenance/v1", "operationId": self._operation_id, "sourcePlanDigest": self._source_plan_digest, "promotionEligible": False, "sourceJob": provenance.get("sourceJob"), "selection": provenance["selection"], "limits": provenance["limits"]}
        with (job.job_dir / "diagnostic-provenance.json").open("x") as output:
            output.write(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
