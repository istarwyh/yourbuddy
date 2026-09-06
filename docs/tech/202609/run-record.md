# Y8 plugin development research record template (inactive)

English | [中文](run-record.zh.md)

This template accompanies only the [unadopted research](deferred-research.md), not current delivery acceptance or an executed run. Save a separate copy for each run with anonymous participant identifiers; leave unsupported fields as “not recorded” and unexecuted checks as “not run”.

## Run identity

The recorder fills in study identity before starting so results from different builds, participants, and models are not mixed.

| Field | Value |
|---|---|
| Run identifier and date | To fill |
| Experiment, condition, and task variant | E0/E1/E2/E3; A/B/C; to fill |
| Anonymous participant, team, and role | To fill |
| DSH familiarity; whether the participant authored the plugin | To fill |
| Task order and previously experienced conditions | To fill |
| Recorder and acceptance reviewer | To fill |
| Y8 version, installer source, and checksum | To fill |
| DSH, plugin, project commit, and dependency lockfile digest | To fill |
| Documentation, template, Skill, and prototype versions | To fill |
| OS, architecture, and runtime environment | To fill |
| Model, provider, and non-sensitive parameters | To fill; exclude credentials |
| Input version, acceptance rules, and control run identifier | To fill |
| Development instance, test directory, and authorized data scope | To fill; hide private paths in public records |
| Prerequisites and items not ready | To fill |

## Timing, assistance, and outcome

Record elapsed and active time separately as defined in the plan. Retain failures, timeouts, and external obstacles rather than recording only successful participants or removing slower attempts.

| Measure | Observation |
|---|---|
| Start, end, and elapsed time | Not recorded |
| Downloads, login, remote waits, and active time | Not recorded |
| Acceptance reached; independent completion | Not run |
| Human assistance count, content, and location | Not recorded |
| Incorrect API references, build failures, and restarts | Not recorded |
| Model requests, cost, and unknown portions | Not recorded |
| Post-warm-up edit count and individual effect timings | Not recorded; E2 only |
| Delivered artifact checksum and recipient identifier | Not recorded; E3 only |
| Observed learning effects and environment differences | Not recorded |

## Acceptance evidence

Enter actual observations and accessible redacted evidence for each row. Status is one of “not run,” “passed,” “failed,” or “not applicable”; explain every non-applicable row. “Awaiting approval,” “starting,” and “build succeeded” do not establish the final user outcome.

| Check | Status | Observation and evidence location |
|---|---|---|
| Normal task meets frozen acceptance criteria | Not run | Not recorded |
| Negative case rejects invalid input or explains missing conditions | Not run | Not recorded |
| Effective and target versions are distinguishable | Not run | Not recorded |
| Host execution and visible Client result checked separately | Not run | Not recorded |
| Registrations, listeners, and UI cleaned up after stopping | Not run | Not recorded |
| Use after restart; update and restoration of a verified version | Not run | Not recorded |
| Clean environment consumes the package without the author's workspace | Not run | Not recorded |
| Experimental instance does not unintentionally change the daily workbench | Not run | Not recorded |
| Artifacts and shared evidence exclude unauthorized data and credentials | Not run | Not recorded |

## Failure and recovery

Record the failing stage, actual message, minimal reproduction, attempted recovery, and final state. For external service issues, retain provider identity and a non-sensitive error category instead of raw authorization headers, tokens, or complete requests that could contain secrets.

To fill.

## Conclusion

Acceptance evidence supports the conclusion; distinguish this run from statistics across participants. A single successful run does not establish that the experiment passed.

| Decision item | Conclusion |
|---|---|
| This run passed/failed and why | Not run |
| Whether the control is comparable; reasons if not | Not recorded |
| Included completion numerator/denominator and timing sample count | Not recorded |
| Support, counterevidence, or insufficient evidence for the target | Insufficient evidence |
| Continue, revise, or stop; next owner | To decide |
| Unverified platforms, account paths, and plugin types | To fill |
| Redaction reviewer and evidence approved for sharing | To fill |

## Dev Note

Keep implementation checks, documentation checks, and user experiments as separate results; committing this template or passing documentation checks does not mean E0–E3 have run.
