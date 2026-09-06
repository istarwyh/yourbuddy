---
description: "Executed checks and remaining acceptance for YourBuddy documentation, website navigation, and Help."
---

# YourBuddy guidance implementation record

English | [中文](verification.zh.md)

## Delivered scope

The [agreed plan](implementation-plan.md) is implemented in the product guides, OINK navigation, and the first-party Personal Workbench plugin. [Extend Y8](../../user/product/develop.md) explains extension choices and requirements; [Creator](../../user/product/creator.md) documents the source workflow; four existing development tutorials are published without duplicating their prose. Default-plugin pages explain provenance, reasons, prerequisites, and Harbor's development example.

Help uses the public sidebar footer slot, localized official URLs, keyboard navigation, and a selectable, copyable address after an open request fails. The My Workbench card links to settings guidance. Existing Creator Skills retain their instructions; their runtime and persistence guidance was reviewed against the new guide. This change adds no development-project manager or runtime API.

## Executed verification

Date: 2026-09-06. A separate checkout holds a fresh offline dependency installation and build. Integration testing included the current worktree changes; the final Help replay also passed with only this delivery's changes over `master`. The original checkout's unrelated desktop-authentication work and old build artifacts remain separate.

| Check | Observed result |
|---|---|
| Product plugin unit suite | 7 files, 40 tests passed; URL validation, locale fallback, keyboard behavior, copying, and late-response handling covered |
| Product plugin type check | Passed against the freshly built repository declarations |
| Repository and product builds | `DSH_CLIENT_TITLE=YourBuddy pnpm run build` and the product plugin's `pnpm run build` completed |
| Assembled Web Help | Built product plugin loaded through the real Web scaffold; 2 browser cases passed with bilingual menu and failure snapshots, light and dark themes, preserved session drafts, and settings guidance; the native external-open bridge is substituted |
| First-plugin tutorial | Exact source command started with an absolute plugin path; startup greeting appeared; editing, stopping, and restarting produced the changed greeting |
| Configuration tutorial | Valid configuration printed `Hi there`; invalid `maxRetries` rejected startup with exit 1 and no ready URL |
| Tool and Creator entry | The documented tool module loaded; the source Web command started without a patch; no model request was sent |
| Package tutorial | Local bundle installation added its profile layer; `--dump-config` showed it; removal deleted the layer; all three commands exited 0 |

Tutorial processes used temporary DSH homes and OS-assigned ports. Each started process was stopped; user credentials and daily profiles were not copied. The installed package sample used a separate temporary profile. This demonstrates the documented source path, not development inside a published Y8 installer.

## Documentation and site checks

`pnpm run test:docs` passed all 15 checks; `pnpm run doc-sync` passed all 32, including the SDK documentation build and site checks. `pnpm run lint` completed; after the website adapter changes, the full lint check found one unsafe test assertion, which was corrected and passed a focused lint rerun. `git diff --check` passed.

`pnpm run website:check` passed 70 projection tests, a strict Hugo build, and validation of 57 HTML pages with `PRODUCT_SITE_BASE_URL=https://istarwyh.github.io/yourbuddy/`. A browser smoke checked both homepage extension links, all five development guides, Markdown exports, search-index coverage, and page errors. Nested guides retain canonical source links and enter the top-level full-text bundle. The development watcher and publication workflow include `docs/user/`, so edits to the shared tutorials also trigger updates.

## Remaining acceptance and publication

The release maintainer owns installed-macOS acceptance: open each Help destination from the actual packaged application, verify the operating system browser, and return to the same session. Automated Web coverage substitutes the native shell; it does not establish that installed-app journey. The computer-use connection was unavailable during this run.

An account owner still needs to execute the first real-model file task and the Creator model-assisted experiment, then stop the experiment and verify its removal. No paid model request or Harbor evaluation was run. Harbor's usage and version were checked against its bundled source and README, not by running an evaluation. The Creator guide explicitly uses a source checkout because its installed-app entry was not verified.

This record covers local verification and does not establish installer publication or website deployment. Website delivery requires a successful deployment workflow and checks of the public Help destinations. Application releases follow the [website synchronization procedure](../../product-website.md#release-synchronization) to publish matching guidance.

## Dev Note

This record reports scoped engineering verification. It does not establish onboarding success for an independent newcomer, team sharing, paid-provider behavior, or delivery-platform availability.
