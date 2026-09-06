# Maintaining the YourHarness website

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

## Build and verify

```sh
pnpm website:check
pnpm docs:check
pnpm doc-sync
pnpm lint
```

Website checks cover projection tests, a strict Hugo build, internal artifact links, page fragments, and assets. The SDK retains its separate build checks. Product output lives in `website/product/.dist/`, including bilingual HTML, per-page Markdown, search indexes, `llms.txt`, full sections, and navigation JSON. The [build workflow](../.github/workflows/product-site.yml) uploads reviewable artifacts without publishing the website.

Set `PRODUCT_SITE_BASE_URL` to the full deployment URL ending in a slash; subpaths participate in prose, navigation, and asset URLs. The default is local, so rebuild before publishing. The theme is pinned by [go.mod](../website/product/go.mod) and [go.sum](../website/product/go.sum); do not track the theme's main branch directly.

## Download information and publication

The [download page](user/product/download.md) and [release page](user/product/releases.md) describe verified public releases only. Verification record: on 2026-09-06, public GitHub releases still carry the XiaoHui brand; YourHarness 0.3.0 has no public installer. After publishing YourHarness, verify release assets, checksums, architecture, and update metadata, then update both languages and the homepage installation status. A source version number alone cannot establish a download URL.

Public hosting, domain configuration, and deployment credentials require separate setup. The current build uses no online fonts, CDN, or analytics scripts; model and plugin network access belongs to the desktop application.
