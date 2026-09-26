from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from harbor_dsh_evolution.badcase import materialize_badcase_dataset, preview_badcase_dataset
from harbor_dsh_evolution.business_observation import (
    MAX_IMPORT_BYTES,
    import_business_observation,
    list_business_observations,
    load_business_observation_file,
)
from harbor_dsh_evolution.candidate import load_manifest, snapshot_candidate, verify_candidate
from harbor_dsh_evolution.candidate_materialization import materialize_candidate_dataset
from harbor_dsh_evolution.context import context_preview
from harbor_dsh_evolution.dataset import snapshot_dataset, validate_dataset
from harbor_dsh_evolution.doctor import architecture_doctor, docker_runtime_check, host_runtime_check
from harbor_dsh_evolution.evaluator import (
    inspect_evaluator,
    inspect_evaluator_bundle,
    update_evaluator_source,
)
from harbor_dsh_evolution.initialize import initialize_project
from harbor_dsh_evolution.historical_context import build_historical_context
from harbor_dsh_evolution.meta_evaluation import (
    initialize_ground_truth,
    load_ground_truth,
    run_meta_evaluation,
)
from harbor_dsh_evolution.promotion import compare_jobs, write_report
from harbor_dsh_evolution.quick import initialize_quick_diagnostic
from harbor_dsh_evolution.session_batch import (
    load_generation_batch,
    materialize_historical_dataset,
)
from harbor_dsh_evolution.stack import snapshot_stack, validate_stack, write_stack_manifest
from harbor_dsh_evolution.summary import load_or_create_summary


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="harbor-dsh")
    commands = parser.add_subparsers(dest="command", required=True)

    diagnostic_subset = commands.add_parser("diagnostic-subset", help="Plan or materialize a frozen, bounded diagnostic Dataset; never starts a Job")
    diagnostic_subset.add_argument("subset_command", choices=("plan", "materialize"))

    snapshot = commands.add_parser("snapshot", help="Freeze a Candidate directory")
    snapshot.add_argument("candidate_dir", type=Path)
    snapshot.add_argument("--id", dest="candidate_id")
    snapshot.add_argument("--version")

    verify = commands.add_parser("verify", help="Verify a Candidate digest")
    verify.add_argument("candidate_dir", type=Path)
    verify.add_argument("--digest")

    candidate = commands.add_parser("candidate", help="Manage strict Candidate evaluation materialization")
    candidate_commands = candidate.add_subparsers(dest="candidate_command", required=True)
    candidate_materialize = candidate_commands.add_parser("materialize")
    candidate_materialize.add_argument("--project-root", required=True, type=Path)
    candidate_materialize.add_argument("--dataset", required=True, type=Path)
    candidate_materialize.add_argument("--stack", required=True, type=Path)
    candidate_materialize.add_argument("--output", required=True, type=Path)

    summary = commands.add_parser("summarize", help="Summarize a Harbor Job")
    summary.add_argument("job_dir", type=Path)

    initialize = commands.add_parser("init", help="Initialize a strict Evaluation Stack project")
    initialize.add_argument("--project-root", required=True, type=Path)
    initialize.add_argument("--dataset", required=True, type=Path)
    initialize.add_argument("--stack-id", required=True)
    initialize.add_argument("--stack-version", required=True)
    initialize.add_argument("--dataset-id", required=True)
    initialize.add_argument("--dataset-version", required=True)
    initialize.add_argument("--contract-id", required=True)
    initialize.add_argument("--contract-version", required=True)
    initialize.add_argument("--primary-metric", required=True)
    initialize.add_argument("--primary-direction", required=True, choices=("maximize", "minimize"))
    initialize.add_argument("--judge-provider", required=True)
    initialize.add_argument("--judge-model", required=True)
    initialize.add_argument("--judge-version", required=True)
    initialize.add_argument("--policy-id", required=True)
    initialize.add_argument("--policy-version", required=True)
    initialize.add_argument("--min-improvement", required=True, type=float)
    initialize.add_argument("--workspace-subdir", default=".")

    quick = commands.add_parser("quick", help="Create an explicitly non-promotable wiring diagnostic")
    quick_commands = quick.add_subparsers(dest="quick_command", required=True)
    quick_diagnostic = quick_commands.add_parser("diagnostic")
    quick_diagnostic.add_argument("--project-root", required=True, type=Path)
    quick_diagnostic.add_argument("--query", required=True)
    quick_diagnostic.add_argument("--rubric", required=True)
    quick_diagnostic.add_argument("--workspace-subdir", default="harbor-diagnostic")

    dataset = commands.add_parser("dataset", help="Manage Dataset manifests")
    dataset_commands = dataset.add_subparsers(dest="dataset_command", required=True)
    dataset_snapshot = dataset_commands.add_parser("snapshot")
    dataset_snapshot.add_argument("dataset_dir", type=Path)
    dataset_snapshot.add_argument("--id", dest="dataset_id")
    dataset_snapshot.add_argument("--version", default="1.0.0")
    dataset_validate = dataset_commands.add_parser("validate")
    dataset_validate.add_argument("dataset_dir", type=Path)
    dataset_validate.add_argument("--project-root", required=True, type=Path)

    stack = commands.add_parser("stack", help="Manage Evaluation Stack manifests")
    stack_commands = stack.add_subparsers(dest="stack_command", required=True)
    stack_validate = stack_commands.add_parser("validate")
    stack_validate.add_argument("stack_path", type=Path)
    stack_validate.add_argument("--project-root", required=True, type=Path)
    stack_snapshot = stack_commands.add_parser("snapshot")
    stack_snapshot.add_argument("stack_path", type=Path)
    stack_snapshot.add_argument("--project-root", required=True, type=Path)
    stack_snapshot.add_argument("--output", type=Path)

    evaluator = commands.add_parser("evaluator", help="Inspect or update an Evaluator Interface")
    evaluator_commands = evaluator.add_subparsers(dest="evaluator_command", required=True)
    evaluator_inspect = evaluator_commands.add_parser("inspect")
    evaluator_inspect.add_argument("--project-root", required=True, type=Path)
    evaluator_inspect.add_argument("--stack", required=True, type=Path)
    evaluator_inspect_bundle = evaluator_commands.add_parser("inspect-bundle")
    evaluator_inspect_bundle.add_argument("--project-root", required=True, type=Path)
    evaluator_inspect_bundle.add_argument("--bundle", required=True, type=Path)
    evaluator_update = evaluator_commands.add_parser("update")
    evaluator_update.add_argument("--project-root", required=True, type=Path)
    evaluator_update.add_argument("--stack", required=True, type=Path)
    evaluator_update.add_argument("--file", required=True)
    evaluator_update.add_argument("--expected-digest", required=True)
    evaluator_update.add_argument("--new-evaluator-version", required=True)
    evaluator_update.add_argument("--new-stack-version", required=True)
    evaluator_update.add_argument("--source-bundle", type=Path)
    evaluator_update.add_argument("--content-stdin", action="store_true", required=True)

    ground_truth = commands.add_parser("ground-truth", help="Initialize or validate independent Ground Truth")
    ground_truth_commands = ground_truth.add_subparsers(dest="ground_truth_command", required=True)
    ground_truth_init = ground_truth_commands.add_parser("init")
    ground_truth_init.add_argument("--project-root", required=True, type=Path)
    ground_truth_init.add_argument("--output", default=".harbor/ground-truth.json", type=Path)
    ground_truth_init.add_argument("--id", dest="ground_truth_id", required=True)
    ground_truth_init.add_argument("--version", required=True)
    ground_truth_init.add_argument(
        "--source-kind",
        required=True,
        choices=("human", "programmatic", "consensus", "model", "external"),
    )
    ground_truth_init.add_argument("--source-description", required=True)
    ground_truth_init.add_argument("--provenance", required=True)
    ground_truth_init.add_argument("--criteria", required=True)
    ground_truth_validate = ground_truth_commands.add_parser("validate")
    ground_truth_validate.add_argument("path", type=Path)
    ground_truth_validate.add_argument("--project-root", required=True, type=Path)

    meta_evaluate = commands.add_parser("meta-evaluate", help="Compare repeated Evaluator observations with Ground Truth")
    meta_evaluate.add_argument("--project-root", required=True, type=Path)
    meta_evaluate.add_argument("--ground-truth", required=True, type=Path)
    meta_evaluate.add_argument("--observations", required=True, type=Path)
    meta_evaluate.add_argument("--output", default=".harbor/meta-evaluation-report.json", type=Path)

    business = commands.add_parser(
        "business-observation",
        help="Import, validate, or list immutable external business observations without network access",
    )
    business_commands = business.add_subparsers(dest="business_command", required=True)
    business_import = business_commands.add_parser("import")
    business_import.add_argument("--project-root", required=True, type=Path)
    business_import_source = business_import.add_mutually_exclusive_group(required=True)
    business_import_source.add_argument("--input", type=Path)
    business_import_source.add_argument("--payload-stdin", action="store_true")
    business_validate = business_commands.add_parser("validate")
    business_validate.add_argument("--project-root", required=True, type=Path)
    business_validate.add_argument("--input", required=True, type=Path)
    business_list = business_commands.add_parser("list")
    business_list.add_argument("--project-root", required=True, type=Path)
    business_list.add_argument("--candidate-digest")
    business_list.add_argument("--generator-id")
    business_list.add_argument("--deployment-id")
    business_list.add_argument("--metric-id")
    business_list.add_argument("--segment-id")
    business_list.add_argument("--offset", type=int, default=0)
    business_list.add_argument("--limit", type=int, default=100)

    historical = commands.add_parser(
        "historical", help="Materialize and validate Historical Generation Evaluation inputs"
    )
    historical_commands = historical.add_subparsers(
        dest="historical_command", required=True
    )
    historical_materialize = historical_commands.add_parser("materialize")
    historical_materialize.add_argument("--project-root", required=True, type=Path)
    historical_materialize.add_argument("--batch", required=True, type=Path)
    historical_materialize.add_argument("--output", required=True, type=Path)
    historical_materialize.add_argument("--judge-provider", required=True)
    historical_materialize.add_argument("--judge-model", required=True)
    historical_materialize.add_argument("--judge-reasoning-effort")
    historical_validate = historical_commands.add_parser("validate")
    historical_validate.add_argument("--project-root", required=True, type=Path)
    historical_validate.add_argument("--batch", required=True, type=Path)
    historical_context = historical_commands.add_parser("context")
    historical_context.add_argument("--project-root", required=True, type=Path)
    historical_context.add_argument("--batch", required=True, type=Path)
    historical_context.add_argument("--dataset", required=True, type=Path)
    historical_context.add_argument("--stack", required=True, type=Path)
    historical_context.add_argument("--execution-environment", choices=("host", "docker"), default="host")
    historical_badcase_preview = historical_commands.add_parser("badcase-preview")
    historical_badcase_preview.add_argument("--project-root", required=True, type=Path)
    historical_badcase_preview.add_argument("--job", required=True, type=Path)
    historical_badcase_preview.add_argument("--trial", required=True, action="append")
    historical_badcase_preview.add_argument("--output", required=True, type=Path)
    historical_badcase_preview.add_argument("--dataset-id", required=True)
    historical_badcase_preview.add_argument("--version", required=True)
    historical_badcase_create = historical_commands.add_parser("badcase-create")
    historical_badcase_create.add_argument("--project-root", required=True, type=Path)
    historical_badcase_create.add_argument("--job", required=True, type=Path)
    historical_badcase_create.add_argument("--trial", required=True, action="append")
    historical_badcase_create.add_argument("--output", required=True, type=Path)
    historical_badcase_create.add_argument("--expected-plan-digest", required=True)
    historical_badcase_create.add_argument("--dataset-id", required=True)
    historical_badcase_create.add_argument("--version", required=True)
    historical_badcase_create.add_argument("--confirmed", action="store_true")

    preview = commands.add_parser("context", help="Preview Evaluation Context v3")
    preview_commands = preview.add_subparsers(dest="context_command", required=True)
    context_preview_parser = preview_commands.add_parser("preview")
    context_preview_parser.add_argument("--project-root", required=True, type=Path)
    context_preview_parser.add_argument("--candidate", required=True, type=Path)
    context_preview_parser.add_argument("--dataset", required=True, type=Path)
    context_preview_parser.add_argument("--stack", required=True, type=Path)
    context_preview_parser.add_argument("--jobs-dir", required=True, type=Path)
    context_preview_parser.add_argument("--mode", required=True, choices=("diagnostic", "promotion-eligible"))
    context_preview_parser.add_argument("--artifact-profile", choices=("diagnostic", "experiment", "governed"))
    context_preview_parser.add_argument("--candidate-model-provider", required=True)
    context_preview_parser.add_argument("--candidate-model", required=True)
    context_preview_parser.add_argument("--candidate-reasoning-effort")
    context_preview_parser.add_argument("--candidate-model-transport", required=True)
    context_preview_parser.add_argument("--candidate-model-protocol", required=True)
    context_preview_parser.add_argument("--execution-environment", choices=("host", "docker"), default="host")

    doctor = commands.add_parser("doctor", help="Validate evaluation architecture")
    doctor.add_argument("--architecture", action="store_true", required=True)
    doctor.add_argument("--project-root", required=True, type=Path)
    doctor.add_argument("--stack", required=True, type=Path)
    doctor.add_argument("--dataset", required=True, type=Path)
    doctor.add_argument("--candidate", type=Path)
    doctor.add_argument("--policy", type=Path)
    doctor.add_argument("--runtime", action="store_true")
    doctor.add_argument("--execution-environment", choices=("host", "docker"), default="host")

    commands.add_parser(
        "docker-check",
        help="Preflight Docker CLI, daemon, and credential helper resolution",
    )
    commands.add_parser(
        "host-check",
        help="Preflight the unrestricted Host execution runtime",
    )

    promote = commands.add_parser("promote", help="Apply a Promotion Gate")
    promote.add_argument("baseline_job", type=Path)
    promote.add_argument("candidate_job", type=Path)
    promote.add_argument("--policy", required=True, type=Path)
    promote.add_argument("--output", type=Path)
    return parser


def main() -> int:
    args = _parser().parse_args()
    if args.command == "diagnostic-subset":
        from harbor_dsh_evolution.bounded_diagnostic import run_command
        return run_command(args.subset_command)
    exit_code = 0
    if args.command == "snapshot":
        result = snapshot_candidate(
            args.candidate_dir,
            candidate_id=args.candidate_id,
            version=args.version,
        ).to_dict()
    elif args.command == "verify":
        result = verify_candidate(args.candidate_dir, expected_digest=args.digest).to_dict()
    elif args.command == "candidate":
        result = materialize_candidate_dataset(
            project_root=args.project_root,
            dataset_path=args.dataset,
            stack_path=args.stack,
            output_path=args.output,
        )
    elif args.command == "summarize":
        result = load_or_create_summary(args.job_dir)
    elif args.command == "init":
        result = initialize_project(
            project_root=args.project_root,
            dataset_path=args.dataset,
            stack_id=args.stack_id,
            stack_version=args.stack_version,
            dataset_id=args.dataset_id,
            dataset_version=args.dataset_version,
            contract_id=args.contract_id,
            contract_version=args.contract_version,
            primary_metric=args.primary_metric,
            primary_direction=args.primary_direction,
            judge_provider=args.judge_provider,
            judge_model=args.judge_model,
            judge_version=args.judge_version,
            policy_id=args.policy_id,
            policy_version=args.policy_version,
            min_improvement=args.min_improvement,
            workspace_subdir=args.workspace_subdir,
        )
    elif args.command == "dataset":
        if args.dataset_command == "snapshot":
            result = snapshot_dataset(args.dataset_dir, dataset_id=args.dataset_id, version=args.version)
        else:
            result = validate_dataset(args.dataset_dir, project_root=args.project_root).to_dict()
            exit_code = 0 if result["valid"] else 2
    elif args.command == "quick":
        result = initialize_quick_diagnostic(
            project_root=args.project_root,
            query=args.query,
            rubric=args.rubric,
            workspace_subdir=args.workspace_subdir,
        )
    elif args.command == "stack":
        if args.stack_command == "validate":
            result = validate_stack(args.stack_path, project_root=args.project_root)
            result.pop("stack", None)
            exit_code = 0 if result["valid"] else 2
        else:
            result = snapshot_stack(args.stack_path, project_root=args.project_root)
            if args.output:
                write_stack_manifest(result, args.output)
    elif args.command == "evaluator":
        if args.evaluator_command == "inspect":
            result = inspect_evaluator(
                project_root=args.project_root,
                stack_path=args.stack,
                include_source=True,
            )
        elif args.evaluator_command == "inspect-bundle":
            result = inspect_evaluator_bundle(
                project_root=args.project_root,
                bundle_path=args.bundle,
                include_source=True,
            )
        else:
            result = update_evaluator_source(
                project_root=args.project_root,
                stack_path=args.stack,
                file_path=args.file,
                content=sys.stdin.read(),
                expected_digest=args.expected_digest,
                new_evaluator_version=args.new_evaluator_version,
                new_stack_version=args.new_stack_version,
                source_bundle_path=args.source_bundle,
            )
    elif args.command == "ground-truth":
        if args.ground_truth_command == "init":
            result = initialize_ground_truth(
                project_root=args.project_root,
                output_path=args.output,
                ground_truth_id=args.ground_truth_id,
                version=args.version,
                source_kind=args.source_kind,
                source_description=args.source_description,
                provenance=args.provenance,
                criteria=[item.strip() for item in args.criteria.split(",") if item.strip()],
            )
        else:
            _, result = load_ground_truth(args.path, project_root=args.project_root)
            exit_code = 0 if result["valid"] and result["ready"] else 2
    elif args.command == "meta-evaluate":
        result = run_meta_evaluation(
            project_root=args.project_root,
            ground_truth_path=args.ground_truth,
            observations_path=args.observations,
            output_path=args.output,
        )
    elif args.command == "business-observation":
        if args.business_command == "import":
            payload = None
            if args.payload_stdin:
                text = sys.stdin.read(MAX_IMPORT_BYTES + 1)
                if len(text.encode("utf-8")) > MAX_IMPORT_BYTES:
                    raise ValueError("BUSINESS_OBSERVATION_INPUT_TOO_LARGE: payload exceeds 256 KiB")
                try:
                    payload = json.loads(text)
                except json.JSONDecodeError as error:
                    raise ValueError(
                        f"BUSINESS_OBSERVATION_INPUT_INVALID: invalid JSON at line {error.lineno}"
                    ) from error
            result = import_business_observation(
                project_root=args.project_root,
                observation=payload,
                input_path=args.input,
            )
        elif args.business_command == "validate":
            observation = load_business_observation_file(
                project_root=args.project_root,
                input_path=args.input,
            )
            result = {
                "schema_version": 1,
                "protocol": "business-observation-validation/v1",
                "valid": True,
                "observation_id": observation["observation_id"],
                "digest": observation["digest"],
            }
        else:
            result = list_business_observations(
                project_root=args.project_root,
                candidate_digest=args.candidate_digest,
                generator_id=args.generator_id,
                deployment_id=args.deployment_id,
                metric_id=args.metric_id,
                segment_id=args.segment_id,
                offset=args.offset,
                limit=args.limit,
            )
    elif args.command == "historical":
        if args.historical_command == "materialize":
            result = materialize_historical_dataset(
                project_root=args.project_root,
                batch_path=args.batch,
                output_path=args.output,
                judge_provider=args.judge_provider,
                judge_model=args.judge_model,
                judge_reasoning_effort=args.judge_reasoning_effort,
            )
        elif args.historical_command == "validate":
            batch = load_generation_batch(
                args.batch,
                project_root=args.project_root,
            )
            result = {
                "schema_version": 1,
                "valid": True,
                "batch_path": str(batch.path),
                "batch_id": batch.manifest["batch_id"],
                "batch_digest": batch.manifest["digest"],
                "record_count": len(batch.manifest["records"]),
            }
        elif args.historical_command == "context":
            result = build_historical_context(
                project_root=args.project_root,
                batch_path=args.batch,
                dataset_path=args.dataset,
                stack_path=args.stack,
                mode="diagnostic",
                execution_environment=args.execution_environment,
            )
        elif args.historical_command == "badcase-preview":
            result = preview_badcase_dataset(
                project_root=args.project_root, job_dir=args.job,
                trial_ids=args.trial, output=args.output,
                dataset_id=args.dataset_id, version=args.version,
            )
        else:
            result = materialize_badcase_dataset(
                project_root=args.project_root, job_dir=args.job,
                trial_ids=args.trial, output=args.output,
                expected_plan_digest=args.expected_plan_digest,
                confirmed=args.confirmed, dataset_id=args.dataset_id, version=args.version,
            )
    elif args.command == "context":
        candidate_dir = args.candidate
        candidate = load_manifest(candidate_dir) if candidate_dir.is_dir() else load_manifest(candidate_dir.parent)
        result = context_preview(
            project_root=args.project_root,
            candidate=candidate,
            dataset_dir=args.dataset,
            stack_path=args.stack,
            jobs_dir=args.jobs_dir,
            mode=args.mode,
            candidate_model_binding={
                "provider": args.candidate_model_provider,
                "model": args.candidate_model,
                "transport": args.candidate_model_transport,
                "protocol": args.candidate_model_protocol,
                **(
                    {"reasoning_effort": args.candidate_reasoning_effort}
                    if args.candidate_reasoning_effort
                    else {}
                ),
            },
            execution_environment=args.execution_environment,
            artifact_profile=args.artifact_profile,
        )
    elif args.command == "doctor":
        result = architecture_doctor(
            project_root=args.project_root,
            stack_path=args.stack,
            dataset_path=args.dataset,
            candidate_path=args.candidate,
            policy_path=args.policy,
            runtime_checks=args.runtime,
            execution_environment=args.execution_environment,
        )
        exit_code = 0 if result["promotion_ready"] else 2
    elif args.command == "docker-check":
        result = docker_runtime_check()
        exit_code = 0 if result["valid"] else 2
    elif args.command == "host-check":
        result = host_runtime_check()
        exit_code = 0 if result["valid"] else 2
    else:
        report = compare_jobs(args.baseline_job, args.candidate_job, args.policy)
        output = args.output or args.candidate_job / "promotion-report.json"
        write_report(report, output)
        result = report
        exit_code = 0 if report["decision"] == "PROMOTE" else 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
