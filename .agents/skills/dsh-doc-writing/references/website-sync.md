# Website publication

## Summary

Both websites project canonical repository prose. YourBuddy's OINK site follows [the product website guide](../../../../docs/product-website.md); the VitePress SDK site follows [website/docs.ts](../../../../website/docs.ts) and [scripts/project-doc-site.ts](../../../../scripts/project-doc-site.ts). Read only the matching adapter workflow below. Each publishes raw Markdown and machine-readable navigation in addition to HTML; a local build alone does not establish a public deployment.

## Table of Contents

- [YourBuddy product releases](#yourbuddy-product-releases)
- [VitePress manifest ownership](#vitepress-manifest-ownership)
- [Classify the change](#classify-the-change)
- [DocsPage fields](#docspage-fields)
- [Preserve link behavior](#preserve-link-behavior)
- [Preview and validate](#preview-and-validate)
- [Keep deployment separate](#keep-deployment-separate)
- [Dev Note](#dev-note)

## YourBuddy product releases

Use this path for the YourBuddy homepage, download and release pages, product guides, or a desktop release. The VitePress fields below do not configure this site.

1. Read the [release synchronization procedure](../../../../docs/product-website.md#release-synchronization), [release archive convention](../../../../docs/releases/README.md), and actual desktop release evidence. Classify the task as preparation, product publication, or a website follow-up, preserving the user's authorized scope.
2. Use [product-pages.json](../../../../website/product-pages.json) for routes and [product-site.ts](../../../../scripts/product-site.ts) for projection. Edit canonical product Markdown pairs and both homepage JSON files; use the procedure's source table to check all release-dependent copy. Do not create a second version catalog or infer installed plugin versions from upstream latest.
3. Before product assets are verified, retain the existing verified download and mark candidates pending. Once verified, update the exact release and asset links, evidence references, installation status, and affected product/plugin guides. Rerun pairing, `pnpm website:check` with the production base URL, `pnpm test:docs`, `pnpm doc-sync`, and `pnpm lint`. Use `pnpm website:dev` for visual checks; run VitePress checks only if its adapter or published sources changed too.
4. For an authorized release, publish the website follow-up to `master` and inspect [product-site.yml](../../../../.github/workflows/product-site.yml) for the exact commit. A desktop tag or archive-only change does not trigger this workflow. Use its existing manual dispatch only when a rebuild is needed without a matching input change. Do not add another deploy workflow, hosting provider, or permission.
5. Wait for build and deploy, then verify the live bilingual pages and their actual download/evidence links as the owning procedure specifies. Record website commit, run, URLs, date, and observed results in the version archive. Keep an unavailable browser check unverified and a failed site deployment outstanding; neither permits claiming full synchronization nor requires republishing desktop artifacts.

Do not edit `website/product/.generated/`, `.cache/`, or `.dist/`. Release archives stay under `docs/releases/`; link them through canonical relative links instead of automatically adding internal evidence pages to the product allowlist. Newly observed post-publication evidence uses a new immutable evidence commit; public tags and installers remain unchanged.

## VitePress manifest ownership

Read [docs/AGENTS.md](../../../../docs/AGENTS.md) and the current `DocsPage` type and entries in [website/docs.ts](../../../../website/docs.ts) before changing the manifest; do not rely on a remembered field set. Read [website/.vitepress/config.ts](../../../../website/.vitepress/config.ts) before adding a new section, sidebar collection, locale, or top-level navigation item. For an edited bilingual source, follow the lightweight routine path in [docs/AGENTS.md](../../../../docs/AGENTS.md#writing-rules) and the [pairing contract](../../../../docs/i18n/README.md); never invoke the extended translation skill automatically.

Never edit or commit `website/.generated/`, `website/.cache/`, or `website/.dist/`. Except for `website/AGENTS.md`, never add Markdown under `website/`; locale and route directories such as `website/zh-CN/`, `website/en/`, and `website/api/` are invalid source layouts. Keep generated catalogs under `docs/`, freshness-gate them there, and publish them through the manifest.

## Classify the change

- **Edit an already published page:** change only its canonical Markdown source. Do not touch the manifest unless its route or navigation metadata changes.
- **Publish a new page:** create it in its owning `docs/` tier, then add one manifest entry.
- **Rename, move, or remove a page:** update the canonical file, manifest entry, and inbound repository links atomically. Remove stale manifest entries; `docs:check` rejects missing sources.
- **Publish a generated catalog:** map the generated `docs/` file, but change its generator or source metadata rather than editing the catalog by hand.
- **Change site structure:** update the manifest for ordinary pages; update VitePress configuration only when the existing sidebar, section, or locale model cannot express the change.

Keep the manifest an explicit public allowlist. Do not publish RFCs, postmortems, testing guides, `AGENTS.md`, or maintainer workflows merely because they exist under `docs/`; add internal material only when the user explicitly expands what the site publishes.

## DocsPage fields

Set every `DocsPage` field deliberately. The canonical field set and the `DocsSidebar` union live in [website/docs.ts](../../../../website/docs.ts) — read them there rather than copying values into prose; sections are owned by the `sections` record in that file, with no separate order list in the VitePress config.

- `source`: repository-relative canonical Markdown path. For a complete bilingual pair, add the English `.md` path through `pairedPages()`; it derives the sibling `.zh.md`, the content locales, and counterpart aliases.
- `route`: public VitePress path including the `.md` suffix.
- `label`: sidebar label, not necessarily the document H1.
- `sidebar`: reuse an existing `DocsSidebar` collection unless the information architecture genuinely needs another one.
- `section`: reuse an existing section when possible. If adding one, also define it in the `sections` record.
- `order`: stable order within the section.
- `sourceAliases`: optional additional repository paths that should resolve to this page when links are projected. It does not create another public route.

Use `mirroredPages()` only for a source that intentionally falls back to the same available language in both route trees. Convert that entry to `pairedPages()` when its counterpart is added. The site route trees are independent of the source layout: `foo.zh.md` projects to the root route and `foo.md` projects to the matching `/en/` route.

## Preserve link behavior

Write normal repository-relative Markdown links in canonical docs. The projector applies these rules:

- A target present in the manifest becomes a site-relative route.
- An existing target outside the manifest becomes a GitHub source link, including supported line suffixes.
- An image is the exception: its file is copied into the generated tree and referenced from there, so the site serves it regardless of repository visibility. It must be a regular file inside the repository.
- External URLs, site-absolute URLs, email links, and fragment-only links remain unchanged.
- A missing repository-relative target fails projection instead of silently producing a broken link.
- Cross-page fragments use the English GitHub heading id as their canonical id. If an authored heading emits a different VitePress id, place an explicit `<a id="..."></a>` immediately before it; add generated aliases in the owning generator.

Do not write website-specific routes into canonical Markdown just to satisfy VitePress. Use `sourceAliases` for directory-style repository links that should resolve to a mapped index page.

## Preview and validate

Run local preview while editing:

```sh
pnpm docs:dev
```

The dev server watches mapped source files and reprojects them. Restart it after changing the manifest if the new source is not picked up automatically.

Run the focused website gate before treating the mapping as valid:

```sh
pnpm docs:check
```

If Markdown link checks pass but the site build reports a missing fragment, follow the `verify-doc-site-fragments` source and target paths. Preserve the English GitHub id with an explicit alias in authored Markdown or in the owning generator.

Before committing a documentation-site change, run:

```sh
pnpm run test:docs
pnpm run doc-sync
pnpm run lint
git diff --check
```

Use [dsh-pre-push-checks](../../dsh-pre-push-checks/SKILL.md) before pushing. Report the canonical files changed, manifest entries added or removed, public routes affected, and the exact checks run.

## Keep deployment separate

Synchronizing content into a local build does not publish it to the internet. Follow the release or deployment authorization already present in the task and use the selected adapter's existing workflow. Add GitHub Pages permissions, a deployment workflow, a custom domain, or another host only when the requested scope requires that change; ordinary release synchronization does not require new hosting approval.

## Dev Note

None.
