# Harbor Evolution

English | [中文](harbor-evolution.zh.md)

Application snapshot version: `0.8.1`. Source: [istarwyh/harbor-self-evolving](https://github.com/istarwyh/harbor-self-evolving).

## Problem addressed

Users facing inconsistent Agent results can investigate completed sessions or use fixed tasks to compare behavior before and after one controlled change.

## Usage

Invoke the `evolve-agent-with-harbor` Skill from a conversation. Without a supplied dataset, preview recent completed sessions in the current directory and confirm before evaluation. With explicit tasks, identify four things: Dataset, Generator, Evaluator and criteria, and Optimizer. The workbench presents results, evidence, coverage, and comparisons; evaluation starts through explicit Agent / Skill operations.

## Reason for default inclusion

Working your way can extend to judging effectiveness on your own tasks. Actual failures can gradually become regression cases instead of judging a model or prompt from a single demonstration.

## Companion components

The desktop also carries the Harbor Skill, matching `harbor-dsh-evolution` Python Adapter, and managed Python runtime. Ordinary desktop users should not repeat the independent plugin README's `npx ... setup` installation flow. Candidate tasks still require their Docker environment, model services, and networking, checked by Doctor.

## Limits

Historical session diagnosis observes existing records without rerunning a Candidate and cannot become a promotion comparison baseline. Insufficient evidence can remain unscored. A single-Query quick diagnostic primarily checks execution wiring; its drafted criteria do not establish an executed quality evaluation. Formal comparisons require fixed task, model, and evaluator identities. Evaluator reliability additionally needs independent Ground Truth meta-evaluation. The plugin does not automatically deploy Candidates or replace production Agents. Evaluation can incur additional model requests, container execution, and disk usage.

## Credentials

A Candidate can invoke the frozen Host model through a temporary Job capability. Reusable Codex OAuth or upstream API credentials are not copied into the Candidate. This does not mean model requests avoid the network.
