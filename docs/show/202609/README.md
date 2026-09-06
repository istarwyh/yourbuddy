# YourHarness website content plan: September 2026

English | [中文](README.zh.md)

This directory contains the content drafts and organization plan for the YourHarness website, checked on 2026-09-06. It explains why the product exists, how users begin, why the default plugins were selected, and where further investment could help. The drafts draw on the current workspace's product assembly, plugin snapshots, and usage documentation; roadmap recommendations are not release-date commitments.

## Reading guide

The implemented site publishes [product documentation](../../user/product/index.md) through OINK. See the [website maintenance guide](../../product-website.md) for local preview, content ownership, build checks, and publication setup.

| Document | Purpose |
|---|---|
| [Product philosophy and homepage copy](product.md) | Define the audience, product promise, differences, and public wording |
| [First use](quickstart.md) | Go from installation and model setup to completing and checking a first task |
| [Default plugins](plugins.md) | Explain external and first-party plugins, their entry points, selection reasons, and limits |
| [Typical workflows](workflows.md) | Show research organization, development, context diagnosis, and evaluation-driven improvement |
| [Roadmap](roadmap.md) | Separate existing capabilities, explicit deferrals, and recommendations, with completion criteria |
| [Site structure and publication materials](site-plan.md) | Turn the drafts into pages and identify required screenshots, links, and demonstration evidence |

## Interpreting the current state

The current desktop source version is `0.3.0`, and the product runtime targets macOS Apple Silicon. That version and these descriptions identify the source state examined for this content plan. They do not prove that a YourHarness installer of that version is published or that every plugin feature has passed real-account or Docker acceptance testing.

At publication, downloads, screenshots, and support claims must match an actual release. Connect descriptions to evidence through the [release notes and verification archives](../../releases/README.md). This plan does not use old-brand installers as proof of a new-brand release.

## Scope

The five default external plugins, first-party Personal Workbench, and in-repository Codex Subagent provider are covered. Here, an external plugin comes from an independent project selected and bundled by YourHarness. This does not mean that DeepSeek Harness includes it by default or that its original authors endorse all YourHarness behavior.

The reasons for default inclusion are product assessments derived here from plugin capabilities and product goals. Exact sources, versions, and behavioral evidence live in [Default plugins](plugins.md); inferred reasons are not presented as unverified quotations from their authors.

## Maintenance

These files form a monthly content plan. During site implementation, place adopted content in the appropriate user documentation pages and maintain one body source. Installation commands, model catalogs, plugin versions, and release status continue to refer to their owning implementation or release record. Maintain English and Chinese together; do not publish internal verification notes and material backlogs directly on the site.
