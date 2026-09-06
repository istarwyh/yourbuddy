# Roadmap: existing foundations and proposed directions

English | [中文](roadmap.zh.md)

This is a product roadmap assessment dated 2026-09-06, not a release-date commitment. Existing foundations are backed by current source, explicit deferrals come from project documentation, and proposed directions are priorities suggested here for the website and user experience. Update the public roadmap as work ships, linking completed items to release records.

## Existing foundations

| Capability | Source state and public wording |
|---|---|
| YourBuddy identity and desktop assembly | Independent application identity, Y8 artwork, managed runtimes, default plugins, updates, and restart controls exist; release availability must match an actual installer |
| Models and working directories | Provider configuration, Codex login integration, and workspace-based sessions exist |
| Task result inspection | File, terminal, Git, and background-task interfaces are integrated for checking actual results |
| Context diagnosis | Read-only audits locate costs and duplication; they do not promise precise billing or automatic optimization gains |
| Agent evaluation and controlled improvement | Historical diagnosis, Candidate evaluation, comparison, and independent meta-evaluation exist with different prerequisites |
| Documentation infrastructure | A DeepSeek Harness-oriented VitePress site and bilingual checks exist; this directory contains YourBuddy website content, while OINK implementation has not started |

See the [desktop documentation](../../../apps/desktop-tauri/README.md), [Default plugins](plugins.md), and [existing site configuration](../../../website/.vitepress/config.ts). This table does not turn source feature counts or passing unit-test counts into user-availability claims.

## Explicit deferrals and current limits

| Item | Current evidence | Roadmap treatment |
|---|---|---|
| Apple application signing and notarization | Explicitly deferred in the [root documentation](../../../README.md) | Candidate improvement to desktop distribution, requiring real certificates, builds, and installation verification |
| YourBuddy installers for Windows, Linux, and other architectures | The [product runtime](../../../apps/desktop-tauri/src-tauri/src/product.rs) accepts only the current target; desktop source contains cross-platform foundations | Explore demand without claiming support or a delivery date |
| Exporting images directly to the workspace | [Codex Auth documentation](../../../apps/desktop-tauri/product/dsh-codex-auth/README.md) records the missing operation | Requires policy-aware binary writes; do not substitute export that bypasses policy |
| Full themes and per-workspace personalization | [Personal Workbench documentation](../../../apps/desktop-tauri/product/personal-workbench/README.md) limits customization to Profile name and Logo | Validate actual demand before expanding scope |

## Proposed direction one: complete first use and the website journey

**Priority: near term.** Adopting the researched OINK Starter is a site implementation recommendation; this task delivers content only. Cover installation, model setup, a first task, default plugins, troubleshooting, and release records first. Give users a short path from understanding the product to checking their own output.

**Completion criteria.** On a clean supported Mac, install the corresponding release from the actual download page, configure one usable model, select a workspace, and generate and open a file. Relevant troubleshooting must explain failures. Verify bilingual navigation, search, downloads, and Markdown outputs at the deployed address.

**Investment reason.** Advanced features have limited value if new users cannot begin independently. Reusable installation and demonstration evidence also helps keep documentation aligned with releases.

## Proposed direction two: make the default composition understandable and maintainable

**Priority: next.** Improve explanations of plugin sources, purposes, default versus optional capabilities, environment prerequisites, and update relationships. Cover actual issues such as login failure, network settings, restarting after installation, and context warnings with instructions and examples.

**Completion criteria.** Users can identify their model route and third-party capabilities; an installation failure identifies the package; updated default plugins remain usable according to current-version documentation. Decide whether additional status panels or unified settings are needed from obstacles in these tasks.

**Investment reason.** Preinstallation removes setup steps while introducing responsibility for composition and maintenance. Make the existing set reliable and explainable before adding more default plugins.

## Proposed direction three: make evaluation a repeatable improvement habit

**Priority: iterate on real cases.** Guide users through historical diagnosis, human review of failures, fixed regression tasks, one change, and a comparable regression report. Continue using existing evaluation and meta-evaluation capabilities while improving failure-case preparation and tutorials.

**Completion criteria.** At least one sanitized real case is reproducible and presents its baseline, change, evaluation identities, coverage, regressions, and conclusion. Materials distinguish historical observation, quick diagnosis, formal evaluation, and deployment. Preserve unscored or unverified states when evidence is insufficient.

**Investment reason.** Credible self-evolution depends on comparable results across stable tasks. Accumulate reproducible cases before increasing automation; make no promise of unattended continuous self-modification or automatic production release.

## Proposed direction four: let user needs guide expansion

**Priority: exploration.** Gather concrete task requirements for other platforms, additional models and plugins, team use, and richer personalization. Establish users, frequency, alternatives, and maintenance costs before developing a separate proposal for each.

**Completion criteria.** Each capability entering development has an identified user, runnable scenario, support scope, and verification method. Cross-platform work especially requires real installation, runtime, plugin, update, and uninstallation verification.

**Investment reason.** Plugins enable extension without making every extension suitable for default inclusion. Cloud synchronization, team permissions, mobile clients, and comprehensive cross-platform availability are not committed features at this stage.

## Public roadmap wording

Labels such as “In progress,” “Candidate direction,” and “Exploring” should link to actual work or proposals. Use “Candidate direction” for recommendations here that have not started. Avoid untestable entries such as “Better experience” or “Smarter intelligence.” Completed items describe what users can do and link to [release and verification records](../../releases/README.md).
