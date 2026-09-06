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

Public prose lives in [docs/user/product/](user/product/index.md); each page maintains English, Chinese, and a translation record. Homepage blocks read [home-data/zh.json](user/product/home-data/zh.json) and [home-data/en.json](user/product/home-data/en.json) in that directory; these own the short homepage copy. Register new pages in [product-pages.json](../website/product-pages.json), keeping repository-relative links in prose. Theme configuration and styles live in [website/product/](../website/product/); build output is not committed.

Homepage presentation uses [project partials](../website/product/layouts/_partials/yourbuddy/) and [project styles](../website/product/assets/scss/_styles_project.scss). Section data supplies homepage HTML; searchable guides and their Markdown exports come from canonical repository prose. Maintain both languages together. Keep examples labeled, align their instructions with the getting-started guide, and preserve light and dark readability. Do not edit the cached theme module.

## Build and verify

```sh
pnpm website:check
pnpm test:docs
pnpm doc-sync
pnpm lint
```

Website checks cover projection tests, a strict Hugo build, internal artifact links, page fragments, and assets. Run `pnpm docs:check` when the SDK's published sources or adapter also change. Product output lives in `website/product/.dist/`, including bilingual HTML, per-page Markdown, search indexes, `llms.txt`, full sections, and navigation JSON. The [website workflow](../.github/workflows/product-site.yml) uploads reviewable artifacts and publishes successful `master` builds to GitHub Pages.

Set `PRODUCT_SITE_BASE_URL` to the full deployment URL ending in a slash; subpaths participate in prose, navigation, and asset URLs. The default is local, so rebuild before publishing. The theme is pinned by [go.mod](../website/product/go.mod) and [go.sum](../website/product/go.sum); do not track the theme's main branch directly.

## GitHub Pages

The public site is [istarwyh.github.io/yourbuddy](https://istarwyh.github.io/yourbuddy/). Repository Pages settings use **GitHub Actions** as the build source. The workflow reads the Pages base URL, builds and verifies the site with that prefix, and deploys the verified artifact through the `github-pages` environment. Only the deployment job receives `pages: write` and `id-token: write`; no personal access token is stored in the workflow.

Changes to website inputs on `master` trigger publication. To republish without a source change, run **YourBuddy website** manually on `master` in GitHub Actions. Pull requests and manual runs on other branches build preview artifacts without deploying. Updates on the same branch run serially, and a failed build leaves the published site intact.

## Download information and publication

The [download page](user/product/download.md) and [release page](user/product/releases.md) describe verified public releases only. Keep dated availability evidence with those pages and the [version archive](releases/README.md), rather than in this maintenance procedure. A source version, pushed tag, or successful build alone cannot establish a download URL.

<a id="release-synchronization"></a>

## Release synchronization

Complete this sequence for each YourBuddy desktop release, including patch releases. The release operator owns the content update and live check; the existing website workflow only builds and deploys committed content.

1. Before tagging, prepare the [version archive](releases/_template/README.md) and review the affected pages below. Keep the current verified download available; describe an unpublished candidate as pending and do not promote it to the default download.
2. After product publication, verify the exact GitHub Release, downloaded installer and checksum, architecture, signed updater archive and signature, and stable updater metadata using the [desktop release procedure](../apps/desktop-tauri/README.md). Record failures and partial availability before changing public claims.
3. Update the following canonical sources in both languages from that evidence. Remove pending-installation copy only when the corresponding installer is publicly available and verified. A failed candidate does not replace the last verified release.

| Source | Release update |
|---|---|
| [Download](user/product/download.md) | Exact tag and installer link, platform, checksum, installation or upgrade path, and known limitations |
| [Releases](user/product/releases.md) | Version, date, user-visible changes, verification limits, and links to the public release and its evidence |
| [Homepage prose](user/product/home.md) and [Chinese](user/product/home-data/zh.json) / [English homepage data](user/product/home-data/en.json) | Consistent installation status and action labels; inspect both inputs because HTML and raw Markdown have different content sources |
| [User guides](user/product/index.md) and [default plugins](user/product/plugins/index.md) | Changed setup, usage, plugin prerequisites, sources, limitations, and selection reasons; confirm bundled provenance instead of assuming upstream latest |
| [Roadmap](user/product/roadmap.md) | Move a planned capability to shipped only when this release's evidence supports it; retain uncommitted directions as proposals |

4. Re-record changed Markdown pairs. Run `pnpm website:check` with `PRODUCT_SITE_BASE_URL=https://istarwyh.github.io/yourbuddy/`, then the documentation checks in this guide. Run the separate SDK check when its sources or adapter also change. Review both languages and the download journey in the local preview when browser access is available.
5. Commit and publish the website changes to `master` within the authorized release task. This can be a follow-up commit after the immutable release tag. Website input changes trigger **YourBuddy website**; a desktop tag alone does not. Record the website commit and its workflow run, and wait for both build and deploy to succeed. If only the archive changed, the website path filter will not trigger; use the existing manual dispatch on `master` only when a site rebuild is needed.
6. Open the published Chinese and English home, download, and release pages. Check that the intended version and availability appear, follow the actual installer, checksum, and evidence links, and check navigation, search, and raw Markdown. Record the URLs, date, website commit, run, and observed results in the version archive. Browser or network failures remain unverified; a green deployment alone is insufficient.

Record website synchronization separately as pending, deployed but not verified, deployed and verified, failed, or not applicable. If the site fails after product publication, retain the verified product status and repair or retry the website task; do not republish the desktop installer. Post-publication observations may use a new evidence commit linked from the release record without moving the public tag or changing released bytes. If public product claims need correction, follow the [release correction policy](releases/README.md).

Website deployment does not publish desktop installers. The site uses the GitHub Pages domain and no online fonts, CDN, or analytics scripts; model and plugin network access belongs to the desktop application.
