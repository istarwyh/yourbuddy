# Evaluate and improve

English | [中文](evaluation.zh.md)

Begin with evidence from actual tasks, then build a stable comparison.

## Four useful concepts

| Concept | Question |
|---|---|
| Dataset | What should be tested? |
| Generator | Who produces the answer or artifact? |
| Evaluator and criteria | What counts as good, and who checks it? |
| Optimizer | Who proposes the next controlled change? |

The bundled Harbor Skill guides this setup. Invoke `evolve-agent-with-harbor` from the conversation and explain your task. The desktop includes the plugin, Skill, and matching Python adapter; do not repeat the standalone package setup command. Candidate execution requires its Docker environment and usable model services; run Doctor before starting.

## Without a dataset

Ask to diagnose recent completed sessions in the current working directory. Preview the selected records, evaluator, estimated requests, and evidence-storage notice. Confirm before evaluation. Inspect coverage, evidence, and abstention reasons in the Harbor workbench.

Historical diagnosis does not rerun the Candidate and cannot be used as a promotion baseline. A completed but unscored record is not a zero score. If there is no eligible history, complete a task or supply an explicit Query or Dataset.

## With repeatable tasks

Confirm the four concepts, fix the Candidate model, and establish a valid baseline. Change one factor, rerun comparable tasks, and inspect regressions as well as gains. A changed model or evaluator identity can require a fresh baseline.

A single-Query quick diagnostic checks wiring rather than establishing quality under its drafted rubric. Formal promotion requires an accepted policy; evaluator reliability requires independent Ground Truth meta-evaluation. Deployment remains a separate action.

See [Harbor Evolution](plugins/harbor-evolution.md) for costs, credentials, and limits.
