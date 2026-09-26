# YourBuddy 0.3.16

English | [中文](README.zh.md)

This archive records the coordinated product workbench, safer creator-draft preparation, and release finalizer in YourBuddy 0.3.16.

- Release identifier: `yourbuddy-v0.3.16`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: partial; product publication, public artifact verification, downloadable evidence, and website checks are complete, while the interaction recording remains pending.
- Tagged product commit: `3e3c0da88f1a9a6b080b606d15b363745d32669d`.
- Evidence gallery: the product-workbench interaction recording is pending.
- Evidence download: [immutable tagged source](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.16/docs/releases/yourbuddy-v0.3.16) and [downloadable verification archive](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.16/yourbuddy-v0.3.16-verification.zip).

## User release notes

### What changed

Better Sidebar remains the middle workbench while creator Content temporarily uses the same seat. Conversation and the native right sidebar form one collapsible Session region. Oil Creator and its bundled video publisher validate draft inputs and protect final publishing actions. Fresh Sessions use Full access by default, and file actions stay attached to the Session and pane where they started.

### Problem solved

Users can switch between files, creator details, and Conversation without losing tabs, splits, drafts, or Session state. Agent background opens do not steal the visible creator view, explicit user navigation remains predictable, and draft automation cannot hand back a page while protected final-action controls are still armed.

### Where to use it

Use the middle Better Sidebar workbench, the **内容创作** preset and Content navigation, the Session collapse controls, or ordinary file-open actions. Contributors can finalize a reviewed desktop candidate with `pnpm release:yourbuddy -- 0.3.16`.

### How to try it

Open a Better Sidebar file, choose an episode from Content, close the detail to return to the same workbench state, then collapse and restore the Session region. In a finished episode, choose **准备发布草稿** after confirming the enabled platforms and required rights.

### Install or upgrade

Install the [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.16/yourbuddy-0.3.16-macos-arm64.dmg) from the [0.3.16 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.16), or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data requires no migration.

### Compatibility, migration, and limitations

The desktop target remains macOS 11 or later on Apple Silicon. Fresh Sessions use Full access with approval policy `never`; existing Sessions and explicit saved defaults remain authoritative. Video drafts require Ego Lite and logged-in creator accounts. Official Account drafts require AppID, AppSecret, and an API IP allowlist. Final publication, scheduling, and group-send remain user actions. Real-account platform behavior, native packaged startup, packaged-WebView interaction, update installation, Apple Developer signing, and notarization remain unverified before public-artifact checks.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused source and product checks | passed | committed 0.3.16 release inputs | macOS Apple Silicon, Node.js 22.19 | typecheck, 43 documentation checks, focused release suites, and the complete desktop release test suite |
| Assembled Host and browser workbench | passed within stated limits | source-built Web Client and prepared Host | local Host and Chromium | 70 peer links, seven Client plugins, keyless refresh and replay, and 3 browser tests passed |
| Product-workbench interaction recording | pending | prepared release candidate | YourBuddy Web GUI | pending |
| Public desktop artifacts and updater | passed | public 0.3.16 assets | GitHub Release and stable updater channel | [artifact verification](evidence/public-artifact-verification.txt) |
| Product website | passed | website commit `151af2c4d8239bbd495c425e72ca5c3fee424791` | English and Chinese HTML and raw Markdown routes | [website verification](evidence/website-verification.txt) |

## Scenario: coordinated product workbench

- Status: source, prepared Host, assembled-browser, and publication checks passed; interaction recording remains pending.
- Date and time: `2026-09-25 23:13` to `2026-09-26 00:11 +0800 CST` for local preparation and replay.
- Release and commit: `yourbuddy-v0.3.16`; tagged commit `3e3c0da88f1a9a6b080b606d15b363745d32669d`.
- Build under test: source and assembled release candidate before publication.
- Environment: macOS Apple Silicon, Node.js 22.19, local Host, and bundled Chromium.
- Evidence origin: this release run.
- Data: synthetic creator episode and repository fixtures.
- Model or service: no real model or creator account required for source and browser checks.

### Steps

1. Run the focused coordinator, layout, file-routing, publisher, source record, catalog, documentation, and release-version checks.
2. Prepare the complete release input and exercise core-to-Content-to-core switching, aggregate Session collapse and restore, background versus user opens, and current-Session attention expansion.
3. Record the assembled interaction, then publish and independently inspect every public artifact before promoting download or website claims.

### Expected

The candidate preserves workbench and Session state, restores focus safely, keeps background opens non-disruptive, blocks unsafe publisher handoff, and produces one immutable version whose tag, updater metadata, archive, and download links agree.

### Actual

The source, product, documentation, release-script, prepared Host, assembled keyless browser, and publication checks pass. The browser journey preserves creator Content during background Better Sidebar opens, returns to core for explicit user opens and Session changes, restores the aggregate Session region, and reopens an already-selected episode. The exact-commit interaction recording remains pending.

### Evidence

- Before: the 0.3.16 version sources, bilingual archive, product snapshots, and materialized patch source record were aligned before publication.
- In progress: `pnpm run typecheck`, `pnpm run doc-sync`, `pnpm --dir apps/desktop-tauri run test:release`, focused Vitest runs, Oil Creator source refresh, and Better Sidebar patch replay passed on macOS Apple Silicon with Node.js 22.19.
- Result: `DSH_SNAPSHOT=replay pnpm exec vitest run --config vitest.web.config.ts apps/web/tests/yourbuddy-help.e2e.ts` passed 3 browser tests. Complete release preparation verified 70 peer links and seven assembled Client plugins. The publication workflow, public checksums, updater signature, App identity, DMG/updater tree comparison, product packages, and relocated runtime passed. GUI recording and the downloadable archive remain pending.
- Failure and recovery: the assembled browser first exposed missing Oil Creator Typert registration, a background-triggered automatic terminal reported as user navigation, and a selected-row toggle that could not reopen hidden Content. The fixture loads the product Typert artifact explicitly, the automatic terminal carries background intent, the selected row reopens Content, and replay passes. Release preparation exposed stale bilingual product records; those records were synchronized before the tag was created. The HTTPS OAuth credential lacked workflow scope, so the atomic push changed no remote ref; the same branch and tag then pushed atomically through the existing SSH credential.

### Scope limits

Source, synthetic, and assembled local checks do not prove real-account creator behavior, final publication, native installed startup, packaged-WebView interaction, updater installation, Apple Developer signing, or notarization.

## Delivery status

- Product publication status: published by the [successful immutable-tag workflow](https://github.com/istarwyh/yourbuddy/actions/runs/36235367585).
- Verification archive status: partial; source, execution, public artifact, website, and downloadable evidence are recorded, while the interaction recording remains pending.
- Website synchronization status: deployed and verified on the live Chinese and English HTML and raw Markdown routes.
- Unverified scope: real creator accounts, final publishing actions, native installed startup, packaged-WebView interaction, update installation, signing, and notarization.

## Delivery checklist

- [x] The release identifier and desktop version sources match 0.3.16.
- [x] User notes describe the change, problem, location, shortest journey, migration, and limitations.
- [x] Focused source, product, catalog, documentation, and release checks pass with retained logs.
- [x] Complete release preparation and assembled Host/browser checks pass.
- [ ] The product-workbench GUI journey is recorded and retained.
- [x] Public files, checksums, updater metadata, signature, App identity, source record, and relocated runtime are independently verified.
- [x] The evidence archive is published and independently extracted.
- [x] The bilingual product website is synchronized and checked live without promoting unverified files.
- [x] Public tags and installers will not be moved or overwritten.
