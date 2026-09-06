# Agent Note: YourBuddy documentation and in-app Help

Status: implemented

English | [中文](2026-09-06-yourbuddy-docs-and-help.zh.md)

## Problem

Y8 needs newcomers to complete work directly and professionals to find extension approaches. Default plugins, DSH tutorials, and Creator provide a foundation, but scattered entry points increase the effort of understanding them. Leading the product developer entry with desktop source builds can also misrepresent preparation costs for plugin authors.

## Decision

Y8 uses bilingual product guides and in-app Help to connect default use, extension choices, and professional development. The OINK product site publishes existing DSH starter tutorials from their canonical sources and a short Creator guide with source-environment prerequisites. Harbor is an independent project developed extensively by the Y8 maintainer and serves as an advanced example.

The first-party Personal Workbench plugin registers Help through the public sidebar footer slot and reuses the desktop external-link request. The menu supports locale-specific destinations, keyboard navigation, collapsed layout, and a copyable address after opening fails. It preserves the workbench page and ignores results from an attempt after its menu closes. Help owns no development processes or project management. Users continue using native DSH plugins and existing development tools.

## Related decisions

The [development-platform experiment proposal](../../rejected/feature/2026-09-06-yourbuddy-plugin-development-experiments.md) is not the current task; its rejection rationale prevents renewed scope expansion. The [product distribution](../feature/2026-08-22-yourbuddy-product-workbench.md), [plugin-owned settings](../architecture/2026-08-12-plugin-owned-settings-surface.md), and [dynamic tool mechanism](../feature/2026-07-08-self-referential-cordis-toolset.md) retain independent decisions. This decision neither supersedes nor archives those implemented records.

## Alternatives considered

**Build a plugin development workbench.** Rejected for this delivery. Separate instances, project management, conversion, and packaging add product capabilities and maintenance costs, while the immediate gap is understanding and finding existing capabilities. Further tooling requires evidence of actual blockers.

**Organize repository documentation only.** This leaves discovery on the website and in the application unresolved, so prose, website navigation, and Help are included together.

## Verification

The assembled keyless [Web journey](../../../../apps/web/tests/yourbuddy-help.e2e.ts) loads the built product plugin and checks both languages, menu navigation, workbench preservation, settings guidance, and native-open failure with a substituted native bridge. Package tests cover destination validation and late responses. The [implementation record](../../../../docs/tech/202609/verification.md) separates these results from installed-desktop and real-model acceptance.

## Consequences

Users can find help before configuring a model or creating a session. The development tutorials require a prepared source checkout; the Creator guide states that prerequisite explicitly. External documentation needs network access and has no offline prose copy. This delivery does not provide small-team collaboration or automated delivery tools.
