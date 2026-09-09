# Harbor Evolution

English | [中文](harbor-evolution.zh.md)

YourBuddy 0.3.6 bundled snapshot version: `0.9.5`. Source: [istarwyh/harbor-self-evolving](https://github.com/istarwyh/harbor-self-evolving).

The [0.3.6 verification archive](../../../releases/yourbuddy-v0.3.6/README.md) records the plugin and matching Python adapter 0.9.5 alongside the current public App and relocated Python CLI/import checks. Native startup, visual window inspection, and real model use remain unverified for 0.3.6. Older Hosts without page attachments still require explicit **Ask AI** or `@harbor` references. Updating only the independent plugin cannot add missing Host capabilities.

## Problem addressed

Users facing inconsistent Agent results can investigate completed sessions or use fixed tasks to compare behavior before and after one controlled change.

## Usage

Open an existing Harbor result, select a Trial or check several rows, and type your question in the existing Composer. Sending freezes that page and selection; expand the message attachment to inspect them. **Ask AI** and `@harbor` references take priority. Turn off **Attach current page on send** to omit automatic context; other tabs and slash commands do not attach Harbor implicitly. A failed message stays recoverable without overwriting a newer draft. Restore it when the Composer is free, then send again to capture the current page.

Without a dataset, choose `Evaluate recent Sessions`. It previews up to three completed conversations from history accessible to the current DSH, including other project directories. Review the sample, review model, and redacted-data/cost notice; confirm to start the background diagnosis and open its completed Job. No history path is required, and a bounded recent sample does not represent all history. The `evolve-agent-with-harbor` Skill provides the conversational entry with exact-working-directory selection; for explicit tasks, specify the Dataset, Generator, Evaluator and criteria, and Optimizer.

## Reason for default inclusion

Working your way can extend to judging effectiveness on your own tasks. Actual failures can gradually become regression cases instead of judging a model or prompt from a single demonstration.

## Companion components

The desktop also carries the Harbor Skill, matching `harbor-dsh-evolution` Python Adapter, and managed Python runtime. Ordinary desktop users should not repeat the independent plugin README's `npx ... setup` installation flow. Candidate tasks still require their Docker environment, model services, and networking, checked by Doctor.

## Limits

Page references store private identity and revision records, not evidence bodies or credentials, in the original project and Session. Saved references survive the in-memory cache expiry or a Host restart, but missing/corrupt records and another Session cannot recover them. Changed evidence remains explicit; Trial sets are never silently expanded. Records are not automatically deleted. Unsent-message recovery lasts only for the current browser session, not a durable outbox. Attaching a page does not start an evaluation or deployment.

Historical session diagnosis observes existing records without rerunning a Candidate and cannot become a promotion comparison baseline. Insufficient evidence can remain unscored. A single-Query quick diagnostic primarily checks execution wiring; its drafted criteria do not establish an executed quality evaluation. Formal comparisons require fixed task, model, and evaluator identities. Evaluator reliability additionally needs independent Ground Truth meta-evaluation. The plugin does not automatically deploy Candidates or replace production Agents. Evaluation can incur additional model requests, container execution, and disk usage.

## Credentials

A Candidate can invoke the frozen Host model through a temporary Job capability. Reusable Codex OAuth or upstream API credentials are not copied into the Candidate. This does not mean model requests avoid the network.

<a id="development-example"></a>
## Development example: from a specialized need to a plugin

Harbor Self Evolving is an independent project developed extensively and maintained by the Y8 maintainer. It brings task diagnosis and controlled evaluation into the everyday workbench, avoiding the need for every user to assemble evaluation commands and reports manually.

| Component | Responsibility | Where users inspect it |
|---|---|---|
| DSH plugin | Register evaluation capabilities and workbench views | Results, evidence, and comparison reports |
| Companion Skill | Guide task selection, prerequisite collection, and evaluation operations | Task descriptions and confirmation steps in the conversation |
| Python Adapter | Connect the evaluation environment and the DSH Candidate | Runtime diagnostics, task output, and failure records |

An extension can use this division of responsibilities: instructions guide the work, a plugin supplies runtime operations and UI, and an external program handles necessary specialized execution. A small plugin needs neither Python nor containers. Start with [your first plugin](../../develop/basic/index.md), then use the source link at the top of this page to explore Harbor. This page owns usage guidance rather than copying its development API.
