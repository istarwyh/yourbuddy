# YourBuddy 0.3.16

English | [中文](README.zh.md)

This archive records the coordinated product workbench, safer creator-draft preparation, and release finalizer in YourBuddy 0.3.16.

- Release identifier: `yourbuddy-v0.3.16`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication candidate; source, assembled-browser, public-artifact, updater, website, and downloadable-evidence results are updated only after each check completes.
- Candidate source: the tagged product commit is pending.
- Evidence gallery: the product-workbench interaction recording is pending.
- Evidence download: the immutable tagged source and downloadable verification archive are pending publication.

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

The Apple Silicon DMG and in-application updater path remain pending until the GitHub Release is published and independently verified. Existing YourBuddy data requires no migration.

### Compatibility, migration, and limitations

The desktop target remains macOS 11 or later on Apple Silicon. Fresh Sessions use Full access with approval policy `never`; existing Sessions and explicit saved defaults remain authoritative. Video drafts require Ego Lite and logged-in creator accounts. Official Account drafts require AppID, AppSecret, and an API IP allowlist. Final publication, scheduling, and group-send remain user actions. Real-account platform behavior, native packaged startup, packaged-WebView interaction, update installation, Apple Developer signing, and notarization remain unverified before public-artifact checks.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused source and product checks | passed | uncommitted 0.3.16 candidate | macOS Apple Silicon, Node.js 22.19 | typecheck, 35 documentation checks, 94 focused tests, 221 desktop product tests, and the complete desktop release test suite |
| Assembled Host and browser workbench | browser passed; prepared Host pending | source-built Web Client | local Host and Chromium | keyless refresh and replay, 3 browser tests passed |
| Product-workbench interaction recording | pending | prepared release candidate | YourBuddy Web GUI | pending |
| Public desktop artifacts and updater | pending | GitHub Release assets | anonymous public downloads | pending |
| Product website | pending | post-publication website commit | GitHub Pages | pending |

## Scenario: coordinated product workbench

- Status: local source and assembled-browser checks passed; prepared Host, recording, and publication pending.
- Date and time: `2026-09-25 23:13` to `2026-09-26 00:11 +0800 CST` for local preparation and replay.
- Release and commit: `yourbuddy-v0.3.16`; tagged commit pending.
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

The source, product, documentation, release-script, and assembled keyless browser checks pass. The browser journey preserves creator Content during background Better Sidebar opens, returns to core for explicit user opens and Session changes, restores the aggregate Session region, and reopens an already-selected episode. Complete release preparation, the exact-commit recording, and publication remain pending.

### Evidence

- Before: the 0.3.16 version sources, bilingual archive, product snapshots, and materialized patch source record were aligned before publication.
- In progress: `pnpm run typecheck`, `pnpm run doc-sync`, `pnpm --dir apps/desktop-tauri run test:release`, focused Vitest runs, Oil Creator source refresh, and Better Sidebar patch replay passed on macOS Apple Silicon with Node.js 22.19.
- Result: `DSH_SNAPSHOT=replay pnpm exec vitest run --config vitest.web.config.ts apps/web/tests/yourbuddy-help.e2e.ts` passed 3 browser tests. GUI recording, prepared Host smoke, public checksums, updater verification, and the downloadable archive remain pending.
- Failure and recovery: the assembled browser first exposed missing Oil Creator Typert registration, a background-triggered automatic terminal reported as user navigation, and a selected-row toggle that could not reopen hidden Content. The fixture loads the product Typert artifact explicitly, the automatic terminal carries background intent, the selected row reopens Content, and replay passes. Release preparation correctly refused the uncommitted worktree and will run after the candidate commit.

### Scope limits

Source, synthetic, and assembled local checks do not prove real-account creator behavior, final publication, native installed startup, packaged-WebView interaction, updater installation, Apple Developer signing, or notarization.

## Delivery status

- Product publication status: pending.
- Verification archive status: draft; candidate source record present, execution and public evidence pending.
- Website synchronization status: pending; the verified 0.3.15 download remains public until 0.3.16 artifacts pass independent checks.
- Unverified scope: real creator accounts, final publishing actions, native installed startup, packaged-WebView interaction, update installation, signing, and notarization.

## Delivery checklist

- [x] The release identifier and desktop version sources match 0.3.16.
- [x] User notes describe the change, problem, location, shortest journey, migration, and limitations.
- [x] Focused source, product, catalog, documentation, and release checks pass with retained logs.
- [ ] Complete release preparation and assembled Host/browser checks pass.
- [ ] The product-workbench GUI journey is recorded and retained.
- [ ] Public files, checksums, updater metadata, signature, App identity, source record, and relocated runtime are independently verified.
- [ ] The evidence archive is published and independently extracted.
- [ ] The bilingual product website is synchronized and checked live without promoting unverified files.
- [x] Public tags and installers will not be moved or overwritten.
