# Agent Note: YourBuddy default use and plugin development experiments

Status: rejected — Platform experiments exceed the current task; deliver [documentation, website, and Help](../../implemented/feature/2026-09-06-yourbuddy-docs-and-help.md) first and require actual blockers before tooling investment.

English | [中文](2026-09-06-yourbuddy-plugin-development-experiments.zh.md)

## Problem

Y8 needs a usable default workbench and a development journey for professional users with specialized requirements. DSH's extension APIs and community packages provide foundations, but neither establishes that a new user can finish a task or that a plugin author can deliver an independently installable result. Harbor provides a complex project authored by the product maintainer; relying on that author's experience alone would overlook unfamiliar developers.

## Proposal

Evaluate default use, documentation-assisted authoring, local development, and recipient installation through the [September experiment plan](../../../../docs/tech/202609/deferred-research.md). The plan owns proposed targets and execution design; its [record template](../../../../docs/tech/202609/run-record.md) owns per-run evidence fields. No user experiments or implementation acceptance results are recorded by this proposal.

Keep native DSH packages, composition, public extension APIs, and ordinary project files. Reuse existing inspection and dynamic experimentation, then evaluate bounded conversion into maintained plugin projects. Separate development instances protect the daily configuration from accidental edits without claiming a security sandbox. Documentation and tools use version-matched APIs and examples.

## Related decisions

The [product distribution](../../implemented/feature/2026-08-22-yourbuddy-product-workbench.md), [plugin-owned settings](../../implemented/architecture/2026-08-12-plugin-owned-settings-surface.md), and [dynamic toolset rationale](../../implemented/feature/2026-07-08-self-referential-cordis-toolset.md) retain independent value. This proposal supersedes none of them and archives no records. Current dynamic API names and behavior belong to the [tool package](../../../../packages/extensions/tool-cordis/README.md), not to this proposal.

## Alternatives considered

**Add documentation and a Skill only.** Retained as an experimental condition to measure how far guidance goes. It cannot by itself establish project integration, diagnosis, restart durability, or recipient installation; further tooling depends on observed gaps.

**Use Harbor as the only acceptance sample.** Rejected because its author already knows the implementation and its Python/container requirements are not universal. Small tools, UI plugins, and non-author recipients provide separate evidence.

## Acceptance criteria

The proposal can advance when the plan records comparable baseline and prototype observations for both default use and plugin delivery, with explicit failures and unverified scope. Runtime behavior, product publication, and documentation validation remain separate conclusions. Implemented decisions move to the appropriate current owners only after their acceptance evidence exists.

## Risks

Small samples and learning effects limit generalization. Evolving DSH APIs can invalidate templates, and successful in-memory experiments can conceal packaging or lifecycle failures. The plan freezes versions, counterbalances comparable tasks, and verifies exact artifacts in clean recipient environments before expanding scope.
