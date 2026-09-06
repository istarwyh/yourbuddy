# Default plugins: purpose, selection reasons, and limits

English | [中文](plugins.zh.md)

YourHarness combines upstream capabilities, independent plugin projects, and first-party product plugins. This page follows the actual bundle inventory in the workspace on 2026-09-06. Default inclusion means the installer carries a plugin and the desktop configuration composes it; it does not establish login, service availability, or activation of every optional feature.

## External plugin snapshots

| Plugin | Snapshot version | Source | Selection reason |
|---|---|---|---|
| Codex Auth | 0.3.1 | [suntianc/dsh-codex-auth](https://github.com/suntianc/dsh-codex-auth) | Give existing Codex users a central entry point for login, models, search, and images |
| Better Sidebar | 0.17.1 | [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | Make conversation-produced files, commands, and Git changes inspectable inside the workbench |
| Context Doctor | 0.6.1 | [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor) | Explain the context costs of accumulating instructions, skills, and tools |
| Plugin Marketplace | 0.2.8 | [Scorp1o117/dsh-plugin-marketplace](https://github.com/Scorp1o117/dsh-plugin-marketplace) | Provide discovery, explanation, and installation paths for further extensions |
| Harbor Evolution | 0.8.1 | [istarwyh/harbor-self-evolving](https://github.com/istarwyh/harbor-self-evolving) | Ground Agent improvement in completed sessions or fixed evaluation tasks |

These projects are outside the official default DeepSeek Harness distribution. Harbor shares maintainer ties with YourHarness but remains an independent upstream project. Versions come from local snapshots rather than the latest online releases; Context Doctor is pinned to an exact Git commit. Selection reasons are assessments in this product plan, not claims about the plugin authors' design intentions.

## Codex Auth: bring an existing account into the workflow

**Problem addressed.** One settings section combines Codex login state, available models, web search, and image generation, reducing repeated configuration across capabilities.

**Usage.** Open Settings → GPT Auth, complete login, inspect account state, and select a usable Codex model. The desktop composition also registers search and image capabilities: search uses standard `web_search`; `generate_image` creates or edits images and saves them as session attachments. Image tool availability depends on model declarations, login, account status, and plugin settings.

**Reason for default inclusion.** Existing Codex users can start with a familiar account and use the same authentication entry for research and image tasks. Other providers remain configurable.

**Limits.** This is an unofficial account interface supplied by the community; upstream explicitly limits it to personal development. Interfaces, quota, and account availability can change. Do not advertise official OpenAI authorization, unlimited quota, or production service guarantees. It reuses native Codex authentication files; keyring-only storage without usable file credentials may require changing native login storage. Images persist in conversations, but the plugin currently offers no workspace image export action. Its long-context switch also does not guarantee increased backend capacity.

**Website demonstration.** Show login status, model selection, and a search with sources. Image examples separately identify the account and model capabilities actually available. Never show login files or tokens.

## Better Sidebar: make task outputs visible

**Problem addressed.** Users can inspect a file tree, editor, image and Markdown previews, real terminals, Git differences, and background tasks beside the conversation instead of relying entirely on the assistant's description.

**Usage.** Open the right sidebar or bottom panel in a session workspace and inspect Agent-produced files. For code tasks, use terminals and Git views to review changes. Sidebar cards can be adjusted in Settings.

**Reason for default inclusion.** It completes the path from requesting work to producing results and human inspection, while giving other plugins a place to register pages and file viewers.

**Limits.** Real terminal operations affect the actual working directory; a panel is not an isolation guarantee. Model-facing `terminal_*` and `sidebar_open` tools default to off and require explicit activation. Embedded pages remain subject to their sites' iframe policies and browser rules; do not promise that every website embeds successfully. Side conversations remain a Beta capability.

**Website demonstration.** Show the conversation, generated file, and Git difference from the same task. Keep the first-screen presentation to a few useful panels and place the full card catalog on the detail page.

## Context Doctor: understand context costs

**Problem addressed.** As project instructions, skills, and MCP tools accumulate, users need to locate context costs, repeated instructions, and shadowed same-name skills.

**Usage.** Expand Context Doctor beside an existing session's input, or ask the Agent to call `context_audit`. Inspect instruction chains, skill catalogs, tool schemas, and MCP groups. Review the files and sources behind suggestions before deciding to change them.

**Reason for default inclusion.** A workbench that encourages plugin composition should also help users observe its costs. Audits support decisions about retention, trimming, and on-demand loading.

**Limits.** Auditing itself is read-only. Token figures are estimates rather than billing records. Duplicate detection mainly identifies identical text; it cannot guarantee detection of semantic conflicts or establish that content has no value. Asking an Agent to implement a suggestion is a separate operation. Check paths and excerpts for sensitive information before sharing reports.

**Website demonstration.** Show a report that locates duplicate instructions and a file difference made after human confirmation. Show before-and-after usage only when measured; offer no fixed savings percentage.

## Plugin Marketplace: extend the workbench

**Problem addressed.** Users can discover community plugins in Settings, inspect their README, source, and installation method, and add capabilities when needed.

**Usage.** Open Settings → Plugin Marketplace, search, and inspect a plugin. Eligible packages expose an installation confirmation. Check the resulting status and restart YourHarness through Application lifecycle. The AI explanation feature uses the configured default model.

**Reason for default inclusion.** The default composition is a starting point. Discovery lets users keep choosing tools while understanding their purpose and source before installation.

**Limits.** GitHub topics and stars support discovery rather than security review or compatibility certification. One-click installation additionally requires valid npm DSH Bundle metadata and a repository association; ambiguous metadata leaves it unavailable. Search requires external networking and may be rate-limited. Installed code has the same Host authority as manually installed DSH plugins. Membership in the same Enhancement Suite does not mean that its memory, persona, or vision plugins are also installed by default.

**Website demonstration.** Show an installable package's source, confirmation, and completion, followed by a normal ineligible state caused by insufficient metadata.

## Harbor Evolution: establish evidence for improvement

**Problem addressed.** Users facing inconsistent Agent results can investigate completed sessions or use fixed tasks to compare behavior before and after one controlled change.

**Usage.** Invoke the `evolve-agent-with-harbor` Skill from a conversation. Without a supplied dataset, preview recent completed sessions in the current directory and confirm before evaluation. With explicit tasks, identify four things: Dataset, Generator, Evaluator and criteria, and Optimizer. The workbench presents results, evidence, coverage, and comparisons; evaluation starts through explicit Agent / Skill operations.

**Reason for default inclusion.** Working your way can extend to judging effectiveness on your own tasks. Actual failures can gradually become regression cases instead of judging a model or prompt from a single demonstration.

**Companion components.** The desktop also carries the Harbor Skill, matching `harbor-dsh-evolution` Python Adapter, and managed Python runtime. Ordinary desktop users should not repeat the independent plugin README's `npx ... setup` installation flow. Candidate tasks still require their Docker environment, model services, and networking, checked by Doctor.

**Limits.** Historical session diagnosis observes existing records without rerunning a Candidate and cannot become a promotion comparison baseline. Insufficient evidence can remain unscored. A single-Query quick diagnostic primarily checks execution wiring; its drafted criteria do not establish an executed quality evaluation. Formal comparisons require fixed task, model, and evaluator identities. Evaluator reliability additionally needs independent Ground Truth meta-evaluation. The plugin does not automatically deploy Candidates or replace production Agents. Evaluation can incur additional model requests, container execution, and disk usage.

**Credentials.** A Candidate can invoke the frozen Host model through a temporary Job capability. Reusable Codex OAuth or upstream API credentials are not copied into the Candidate. This does not mean model requests avoid the network.

**Website demonstration.** Start with historical-session preview, confirmation, and inspection of evidence and missing information. Formal baseline comparison is a separate advanced tutorial; historical diagnosis screenshots cannot substitute for it.

## First-party and upstream companions

| Capability | Ownership | Usage and selection reason | Limits |
|---|---|---|---|
| Personal Workbench `0.1.0` | YourHarness first-party plugin | General settings for name / Logo, global proxy, updates, and restart give desktop users a central product settings entry | Custom identity is stored per Profile; it does not change the desktop icon or entire theme; native lifecycle actions require the desktop |
| Codex Subagent | In-repository `@deepseek-ai/dsh-subagent-codex` | The default Codex Agent Preset can delegate self-contained tasks to the official Codex runtime and return results from the same working directory | Separate from Codex Auth main-model access; it does not inherit the entire parent conversation; native Codex permissions and login apply; loading the plugin does not launch a process |
| Harbor Python Adapter and Skill | Harbor companion components | Connect desktop tools, evaluation tasks, and result presentation without presenting them as two additional products | Versions must match the Harbor plugin; a managed runtime does not provide Docker or model quota |

## Maintaining the default composition

Explain the user's work before each plugin's contribution. Keep the default set tied to clear purposes and verifiable entry points, and describe experimental capabilities at their actual maturity. Distinguish user-installed packages from bundled snapshots. Bundled plugins update with YourHarness releases; upstream notifications are not evidence of an application update.

## Implementation and provenance

The [bundling script](../../../apps/desktop-tauri/scripts/bundle-harness-source.mjs) and [desktop configuration](../../../apps/desktop-tauri/src-tauri/src/overlay.rs) establish composition. The following local records support version and feature checks. External READMEs may describe standalone installation or older versions; website instructions follow the assembled desktop behavior.

| Component | Behavioral source | Snapshot source |
|---|---|---|
| Codex Auth | [Bundled documentation](../../../apps/desktop-tauri/product/dsh-codex-auth/README.md) | [Provenance](../../../apps/desktop-tauri/product/dsh-codex-auth/YOURHARNESS_UPSTREAM.json) |
| Better Sidebar | [Bundled implementation](../../../apps/desktop-tauri/product/dsh-better-sidebar/src/index.ts); [default switches](../../../apps/desktop-tauri/product/dsh-better-sidebar/src/config.ts) | [Provenance](../../../apps/desktop-tauri/product/dsh-better-sidebar/YOURHARNESS_UPSTREAM.json) |
| Context Doctor | [Bundled implementation](../../../apps/desktop-tauri/product/context-doctor/lib/index.js) | [Provenance](../../../apps/desktop-tauri/product/context-doctor/YOURHARNESS_UPSTREAM.json) |
| Plugin Marketplace | [Bundled documentation](../../../apps/desktop-tauri/product/plugin-marketplace/README.md) | [Provenance](../../../apps/desktop-tauri/product/plugin-marketplace/YOURHARNESS_UPSTREAM.json) |
| Harbor Evolution | [Bundled documentation](../../../apps/desktop-tauri/product/harbor-evolution/README.md) | [Provenance](../../../apps/desktop-tauri/product/harbor-evolution/YOURHARNESS_UPSTREAM.json) |
| Personal Workbench | [Product documentation](../../../apps/desktop-tauri/product/personal-workbench/README.md) | [Package version](../../../apps/desktop-tauri/product/personal-workbench/package.json) |
| Codex Subagent | [Package documentation](../../../packages/subagent/subagent-codex/README.md) | [Package version](../../../packages/subagent/subagent-codex/package.json) |
