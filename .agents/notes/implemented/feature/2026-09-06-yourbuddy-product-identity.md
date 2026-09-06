# Agent Note: YourBuddy product identity

Status: implemented

English | [中文](2026-09-06-yourbuddy-product-identity.zh.md)

## Problem

An implementation-oriented name asks users to understand an agent harness before seeing what the product does. YourBuddy gives the workbench a more approachable name while preserving user-controlled models, tools, and presentation. Desktop metadata, runtime resources, release automation, and the workbench's default branding identify the same product.

## Decision

The product is YourBuddy, with the tagline “Your models. Your tools. Your way.” The desktop package and binary use `yourbuddy`; application metadata uses `io.github.istarwyh.yourbuddy`. The canonical Y8 artwork is [app-icon.svg](../../../../apps/desktop-tauri/app-icon.svg), embedded in the product Client and rendered into native icons. The [Personal Workbench](../../../../apps/desktop-tauri/product/personal-workbench/README.md) plugin supplies the default name and mark, preserves explicit custom values, and restores the product identity when customization is reset.

This is an intentionally breaking rebrand. The data home is `YourBuddy` under platform application data, developer overrides use `YOURBUDDY_*`, runtime resources use `yourbuddy-*`, release tags use `yourbuddy-vX.Y.Z`, and the updater polls `yourbuddy-updater`. No legacy environment aliases, data adoption, application-ID compatibility, or old update-channel publication are provided. Existing XiaoHui and YourHarness data is neither moved nor deleted. The configured updater public key remains the release-signing trust root.

The [product assembly decision](2026-08-22-yourbuddy-product-workbench.md) continues to own bundling and credential isolation. The [personal branding decision](2026-08-23-personal-workbench-branding.md) continues to own Profile customization; this note defines its product defaults. Upstream DeepSeek package names, author credits, licenses, and frozen archived decisions retain their original identity.

The [September website content plan](../../../../docs/show/202609/README.md) connects this identity to the product explanation, first-use journey, default-plugin rationale, and proposed roadmap. It distinguishes source-backed capabilities from release evidence and recommendations; it does not publish a site or commit to future features.

The [OINK product website](../../../../docs/product-website.md) publishes a bilingual product allowlist from canonical repository prose. It keeps the SDK VitePress projection independently usable, pins the theme and compiler, and treats public installer availability as verified release evidence rather than a source-version inference. The product site emits local search and machine-readable pages from the same content.

GitHub Pages hosts the product website so publication follows the same reviewed source as the repository. The [website workflow](../../../../.github/workflows/product-site.yml) builds with the Pages-provided base URL and checks the artifact before a separate, narrowly permissioned job deploys it from `master`. Pull requests produce previews; branch-level serialization prevents overlapping deployments. Source and artifact checks cover the project subpath, and live browser acceptance covers bilingual navigation, search, and assets.

## Alternatives considered

**Rename only the visible application title.** Rejected because resources, release artifacts, and reset behavior would continue to expose inconsistent product names.

**Reuse the old application ID, data home, and updater channel.** Rejected because the requested transition explicitly permits a breaking update and excludes legacy compatibility.

## Consequences

New installations start with an isolated YourBuddy home. Existing installations require a separate YourBuddy installation and do not receive it through the old updater channel. The assembled keyless release smoke exercises the default identity, custom name and Logo persistence, and reset through the real workbench. Upstream runtime packages remain independently identifiable and maintainable.
