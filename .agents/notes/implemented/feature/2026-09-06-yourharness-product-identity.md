# Agent Note: YourHarness product identity

Status: implemented

English | [中文](2026-09-06-yourharness-product-identity.zh.md)

## Problem

A founder-specific product name does not express the workbench's user-controlled models, tools, and presentation. Desktop metadata, runtime resources, release automation, and the workbench's default branding must identify the same product.

## Decision

The product is YourHarness, with the tagline “Your models. Your tools. Your way.” The desktop package and binary use `yourharness`; application metadata uses `io.github.istarwyh.yourharness`. The canonical YH artwork is [app-icon.svg](../../../../apps/desktop-tauri/app-icon.svg), embedded in the product Client and rendered into native icons. The [Personal Workbench](../../../../apps/desktop-tauri/product/personal-workbench/README.md) plugin supplies the default name and mark, preserves explicit custom values, and restores the product identity when customization is reset.

This is an intentionally breaking rebrand. The data home is `YourHarness` under platform application data, developer overrides use `YOURHARNESS_*`, runtime resources use `yourharness-*`, release tags use `yourharness-vX.Y.Z`, and the updater polls `yourharness-updater`. No legacy environment aliases, data adoption, application-ID compatibility, or old update-channel publication are provided. Existing XiaoHui data is neither moved nor deleted. The configured updater public key remains the release-signing trust root.

The [product assembly decision](2026-08-22-yourharness-product-workbench.md) continues to own bundling and credential isolation. The [personal branding decision](2026-08-23-personal-workbench-branding.md) continues to own Profile customization; this note defines its product defaults. Upstream DeepSeek package names, author credits, licenses, and frozen archived decisions retain their original identity.

The [September website content plan](../../../../docs/show/202609/README.md) connects this identity to the product explanation, first-use journey, default-plugin rationale, and proposed roadmap. It distinguishes source-backed capabilities from release evidence and recommendations; it does not publish a site or commit to future features.

The [OINK product website](../../../../docs/product-website.md) publishes a bilingual product allowlist from canonical repository prose. It keeps the SDK VitePress projection independently usable, pins the theme and compiler, and treats public installer availability as verified release evidence rather than a source-version inference. The product site emits local search and machine-readable pages from the same content.

## Alternatives considered

**Rename only the visible application title.** Rejected because resources, release artifacts, and reset behavior would continue to expose inconsistent product names.

**Reuse the old application ID, data home, and updater channel.** Rejected because the requested transition explicitly permits a breaking update and excludes legacy compatibility.

## Consequences

New installations start with an isolated YourHarness home. Existing installations require a separate YourHarness installation and do not receive it through the old updater channel. The assembled keyless release smoke exercises the default identity, custom name and Logo persistence, and reset through the real workbench. Upstream runtime packages remain independently identifiable and maintainable.
