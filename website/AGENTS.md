# AGENTS.md — Documentation website adapter

Follow the [root instructions](../AGENTS.md), the [documentation standard](../docs/AGENTS.md), and the [documentation-site sync workflow](../.agents/skills/dsh-doc-site-sync/SKILL.md).

## Keep documentation content out of this tree

`website/` owns the VitePress SDK adapter and the OINK product adapter, presentation assets, and publication manifests. This file is the only maintained Markdown file in this subtree.

Keep canonical prose and generated catalogs in their owning `docs/` tier, then expose SDK pages through [docs.ts](docs.ts) or product pages through [product-pages.json](product-pages.json). Never add locale, route, API, or copied documentation trees such as `website/zh-CN/`, `website/en/`, or `website/api/`.

The projector writes disposable Markdown to the ignored `website/.generated/` directory. Never edit or commit `.generated/`, `.cache/`, or `.dist/`.

The build also emits each route's raw-Markdown twin (with a parent-level alias per index route) and a root `llms.txt` index into `.dist/`, so a page's URL, minus any trailing slash, plus `.md` serves it as plain Markdown. Both derive from the publication manifest at build time; neither is ever a file in this tree.

Follow the [product website guide](../docs/product-website.md) for `product/`, whose disposable files stay under its own `.generated/`, `.cache/`, and `.dist/` directories. Run `pnpm website:check` for product changes and `pnpm docs:check` for SDK adapter changes; the gate rejects additional non-ignored Markdown under `website/`.
