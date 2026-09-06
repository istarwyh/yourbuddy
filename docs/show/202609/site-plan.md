# Site structure and publication materials

English | [中文](site-plan.zh.md)

This page maps content drafts to proposed YourHarness website pages. Routes below are design targets, not created or deployed pages. This task does not change existing VitePress navigation.

## Top-level navigation

Use Get started, Guides, Plugins, Releases, and Roadmap, with Download, language selection, and GitHub on the right. Place developer entry points in documentation navigation and the footer for readers who need greater depth. Focus the first version on one current release with synchronized English and Chinese; do not create empty Blog or Book sections.

## Page inventory

| Proposed route | Reader question | Required content | Draft |
|---|---|---|---|
| `/` | What is this, and is it for me? | One-sentence definition, audience, real workbench screenshot, download and onboarding links | [Product philosophy](product.md) |
| `/download/` | Will it run on my computer? | Actual version, architecture, download, checksums, system limits, matching instructions | [First use](quickstart.md) |
| `/docs/start/` | How do I complete a first task? | Ordered installation-to-output steps and success signals | [First use](quickstart.md) |
| `/docs/models/` | How do I log in or configure another model? | GPT Auth and API paths, model selection, capability differences, failure handling | [First use](quickstart.md) |
| `/docs/workspace/` | Where are files written? | Workspace selection, opening outputs, inspecting commands and differences | [Typical workflows](workflows.md) |
| `/docs/settings/` | How do I change the workbench and networking? | Name / Logo, proxy, certificates, save and restart | [First use](quickstart.md) |
| `/plugins/` | What is preinstalled, and why? | External, first-party, and upstream ownership, versions, sources, selection reasons | [Default plugins](plugins.md) |
| `/plugins/codex-auth/` | What can my account provide? | Login, search, images, account and unofficial-interface limits | [Default plugins](plugins.md) |
| `/plugins/better-sidebar/` | How do I inspect task results? | Files, terminals, Git, panels, and optional tools | [Default plugins](plugins.md) |
| `/plugins/context-doctor/` | Why is my context large? | Read-only audits, duplicates and shadowing, estimate limits | [Default plugins](plugins.md) |
| `/plugins/marketplace/` | How do I select and install plugins? | Discovery, sources, eligibility, errors, and restart | [Default plugins](plugins.md) |
| `/plugins/harbor-evolution/` | How do I evaluate and improve an Agent? | Four user concepts, applicable flows, environments, costs, and evidence | [Default plugins](plugins.md) |
| `/docs/evaluation/` | How can I begin without a dataset? | Historical-session tutorial with a separate advanced path for formal regression | [Typical workflows](workflows.md) |
| `/docs/troubleshooting/` | How do I resolve this obstacle? | Identifiable startup, model, network, plugin-loading, and missing-history symptoms | [First use](quickstart.md) |
| `/releases/` | What changed in this version? | User-visible changes, artifacts, known limits, and verification archives | [Release records](../../releases/README.md) |
| `/roadmap/` | Where will effort go next? | Directions with status, reasons, and completion criteria, plus uncommitted areas | [Roadmap](roadmap.md) |
| `/docs/develop/` | How do I develop or understand the internals? | Layered paths to source builds, plugin development, and upstream architecture | [Existing developer guide](../../user/develop/basic/index.md) |

Put Personal Workbench operations in Settings while retaining its ownership in the plugin index. Cover Codex Subagent under development tasks and delegation. Explain the Harbor Python Adapter as a companion dependency rather than creating another user-facing product section.

## Page structure

Tutorials follow prerequisites, actions, success signals, common failures, and next steps. Plugin details cover the problem, reason for inclusion, entry point, example, limits, and source. Reference pages answer one lookup question; the internal package tree does not directly become user navigation.

Use the [YH artwork](../../../apps/desktop-tauri/app-icon.svg) and current product copy on the homepage, with a screenshot of conversation and work outputs. Internal hashes, Loader IDs, evaluation Stack fields, and test counts belong in provenance or developer material; include them in user steps only when they affect a decision.

## Materials still needed

| Material | What it establishes | Capture or verification requirements |
|---|---|---|
| Hero workbench screenshot | Users can converse while inspecting results | Show a real file from the same session and retain the default YourHarness identity |
| Short first-use demonstration | Basic work can be completed after installation | Record version, model path, and continuous steps from workspace selection to opening output |
| GPT Auth and model settings | Model setup has clear entry points | Hide accounts and credentials; establish model availability through actual requests |
| Context Doctor report | Context sources can be located | Use practice instructions, show estimates and duplicate sources, and avoid unmeasured savings claims |
| Plugin installation demonstration | Success and failure states are understandable | Show source, eligibility, confirmation, completion or a specific error, and the post-restart entry point |
| Harbor historical diagnosis | Users without datasets can inspect existing work | Use sanitized records and show confirmation, coverage, and abstention reasons |
| Formal evaluation case | One improvement has comparable evidence | Fix task, model, and evaluator identities; preserve baseline, regression, and unverified areas |
| Downloads and release information | Pages correspond to available artifacts | Check the actual Release, installer, checksums, and update channel |

These are material requirements, not already captured or verified evidence. Upstream screenshots may be labeled as references but cannot establish the integrated YourHarness interface.

## Content handling with OINK

Start from the [OINK Starter](https://github.com/pgsty/oink-starter) bilingual configuration and replace sample content with the selected sections. Write home content in per-language YAML data, use ordinary Markdown for the manual, and introduce complex components only where they help readers.

The existing repository reuses Markdown through a [publication manifest](../../../website/docs.ts) and [projection script](../../../scripts/project-doc-site.ts). With OINK, retain one maintained body source and adapt page titles, navigation, internal links, anchors, and the small amount of VitePress-specific syntax. Do not create two complete documentation sets that evolve separately.

Read plugin versions and download facts from the corresponding release records; a fixed manifest can generate provenance summaries. Do not display upstream Latest versions as application-bundled versions at build time. Provide search, translated-page navigation, and Markdown output. Chinese search keywords can include common aliases such as “密钥／API Key,” “工作区／项目目录,” and “上下文／Token.”

## Content acceptance before publication

1. Every public capability has an actual entry point, prerequisites, and a source; proposed work remains on the roadmap.
2. All five default external plugins explain purpose, selection reasons, limits, and originating projects, with first-party attribution separate.
3. Installation, model setup, the first task, plugin restart, and historical diagnosis each have real-release evidence or explicit unverified labels.
4. Translated pages, images, search, internal links, Markdown outputs, and actual downloads are reachable.
5. Downloads and changelogs link to release verification archives rather than equating a successful build with publication or complete support.

This checklist describes acceptance goals for this website plan. Existing repository documentation and release requirements remain owned by the [documentation standard](../../AGENTS.md) and [release record standard](../../releases/README.md).
