# Maintaining the YourBuddy website

English | [中文](product-website.zh.md)

The website uses [OINK](https://oink.pgsty.com/docs/start/starter/) 1.0.0 and Hugo Extended 0.165.0. Chinese occupies the root path and English `/en/`; the [SDK documentation](user/index.md) continues to build with VitePress.

## Run locally

Install Node 22.19+, the repository's pnpm version, Go 1.27.x, and Hugo Extended 0.165.0. Install repository dependencies, then start the website:

```sh
pnpm install
pnpm website:dev
```

Open `http://localhost:4174/`. Prose edits trigger projection; Hugo refreshes home data and styles automatically. If tools are outside PATH, select Hugo with `HUGO_BIN` and add the Go directory to PATH.

## Edit content

Product prose lives in [docs/user/product/](user/product/index.md); existing development tutorials remain under [docs/user/develop/](user/develop/basic/index.md). The publication manifest selects canonical pages within `docs/user/`, each with English, Chinese, and a translation record. Homepage blocks read [home-data/zh.json](user/product/home-data/zh.json) and [home-data/en.json](user/product/home-data/en.json) in that directory; these own the short homepage copy. Register new pages in [product-pages.json](../website/product-pages.json), keeping repository-relative links in prose. Theme configuration and styles live in [website/product/](../website/product/); build output is not committed.

Homepage presentation uses [project partials](../website/product/layouts/_partials/yourbuddy/) and [project styles](../website/product/assets/scss/_styles_project.scss). Section data supplies homepage HTML; searchable guides and their Markdown exports come from canonical repository prose. Maintain both languages together. Keep examples labeled, align their instructions with the getting-started guide, and preserve light and dark readability. Do not edit the cached theme module.

## Build and verify

```sh
pnpm website:check
pnpm test:docs
pnpm doc-sync
pnpm lint
```

Website checks cover projection tests, a strict Hugo build, internal artifact links, page fragments, and assets. Run `pnpm docs:check` when the SDK's published sources or adapter also change. Nested sections publish HTML, Markdown, and print; the top-level section owns the full-text bundle including its descendants. Product output lives in `website/product/.dist/`, including bilingual HTML, per-page Markdown, search indexes, `llms.txt`, full sections, and navigation JSON. The [website workflow](../.github/workflows/product-site.yml) uploads reviewable artifacts and publishes successful `master` builds to GitHub Pages.

Set `PRODUCT_SITE_BASE_URL` to the full deployment URL ending in a slash; subpaths participate in prose, navigation, and asset URLs. The default is local, so rebuild before publishing. The theme is pinned by [go.mod](../website/product/go.mod) and [go.sum](../website/product/go.sum); do not track the theme's main branch directly.

## GitHub Pages

The public site is [istarwyh.github.io/yourbuddy](https://istarwyh.github.io/yourbuddy/). Repository Pages settings use **GitHub Actions** as the build source. The workflow reads the Pages base URL, builds and verifies the site with that prefix, and deploys the verified artifact through the `github-pages` environment. Only the deployment job receives `pages: write` and `id-token: write`; no personal access token is stored in the workflow.

Changes to website inputs on `master` trigger publication. To republish without a source change, run **YourBuddy website** manually on `master` in GitHub Actions. Pull requests and manual runs on other branches build preview artifacts without deploying. Updates on the same branch run serially, and a failed build leaves the published site intact.

## Download information and publication

The [download page](user/product/download.md) and [release page](user/product/releases.md) provide stable entry points to the latest and historical GitHub Releases. Keep version-specific availability evidence in the [version archive](releases/README.md), rather than duplicating it in website prose.

<a id="release-synchronization"></a>

## Release synchronization

The [download page](user/product/download.md) points to GitHub's stable `releases/latest` URL, and the [release page](user/product/releases.md) delegates version history to GitHub Releases. Publishing a new latest GitHub Release updates both destinations without a website commit, rebuild, or deployment.

An ordinary desktop release therefore has no website synchronization step. Prepare the version archive before tagging, publish the desktop artifacts, and record product publication separately from the website, whose release links remain current automatically.

Update the website only when the release changes product guidance, setup, usage, plugin prerequisites, supported platforms, limitations, homepage copy, or roadmap status. In that case, update the affected bilingual sources before tagging when possible, re-record their translation pairs, run `PRODUCT_SITE_BASE_URL=https://istarwyh.github.io/yourbuddy/ pnpm website:check` and the documentation checks, then commit to `master`. The **YourBuddy website** workflow builds and deploys those content changes automatically.

Website deployment does not publish desktop installers, and website availability does not establish artifact integrity or installed behavior. Version-specific notes, checksums, evidence, failures, and unverified scope belong to the GitHub Release and immutable [release archive](releases/README.md).

Website deployment does not publish desktop installers. The site uses the GitHub Pages domain and no online fonts, CDN, or analytics scripts; model and plugin network access belongs to the desktop application.
