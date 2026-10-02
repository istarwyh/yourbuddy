# YourBuddy 0.4.4

English | [中文](README.zh.md)

This archive records the fixes for Issues #36, #37, and #38, the retained packaged-Bundle regression guard for Issue #34, and the snapshot-metadata correction that supersedes the unpublished 0.4.3 attempt.

- Release identifier: `yourbuddy-v0.4.4`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; focused source, Bundle, and offline-install checks passed before publication.
- Evidence commit: implementation commits `dfd0d2308d`, `a9baac94e5`, `4597396e64`, and snapshot correction `472c6a4137`; the release tag fixes the complete candidate.
- Evidence gallery: not applicable; the user-visible paths are covered by deterministic source, Bundle, and lifecycle tests.
- Evidence download: [YourBuddy 0.4.4 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.4).

## User release notes

### What changed

YourBuddy now opens with a product-focused splash, manages bundled capabilities as one Package + CLI + Skill + UI unit, and exposes trusted first-party desktop operations through one stable application gateway. Harbor advances to 0.10.3 and can install its missing runtime directly from the error state. The 0.4.2 Better Sidebar `clsx` startup fix remains protected by an exact-Bundle regression test. This version also corrects the Harbor Python source-record hash that stopped 0.4.3 before any public artifact was created.

### Problem solved

The previous desktop could present a generic startup screen, leave a bundled plugin's CLI or Skill out of sync with its UI, and strand Harbor users when its runtime was absent. Maintaining a long command-by-command desktop allowlist also made ordinary first-party evolution unnecessarily fragile. This release treats bundled capability parts as one versioned unit and trusts application-owned commands while preserving operating-system permissions, signing, and explicit plugin installation or enablement.

### Where to use it

The new splash appears during startup. Capability Pack status is available in Settings and reports Package, CLI, Skill, and UI state together. Harbor recovery appears in its Workbench error state, while the managed CLI path is enabled from Settings.

### How to try it

Launch YourBuddy, open Settings, and inspect the Harbor Capability Pack. Enable terminal commands, reopen a terminal, and run `dsh-harbor --version`; it reports the same package version as the bundled Harbor plugin. If Harbor reports a missing runtime, select the install action and retry.

### Install or upgrade

Install the Apple Silicon Bootstrap or Offline DMG from the GitHub Release. The Bootstrap DMG remains subject to the strict 30,000,000-byte publication gate. Existing settings, Sessions, workspaces, credentials, and component caches remain in place.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and requires no data migration. The Capability Pack manager is a macOS-first implementation and never overwrites an external command with the same name. Operating-system filesystem permissions, code signing, and explicit third-party plugin installation or enablement remain unchanged. Harbor alone was refreshed to 0.10.3; unrelated external plugin snapshots and the validated 0.4.2 DSH baseline were intentionally retained.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Splash and trusted desktop gateway | passed within source/runtime-check scope | 0.4.4 candidate | macOS Apple Silicon, Node, Rust | focused lifecycle/permission tests passed; `cargo check` passed |
| Harbor Capability Pack and runtime recovery | passed | bundled Harbor 0.10.3 and Personal Workbench | macOS Apple Silicon, Node | 58 Workbench tests, 29 refresh/compatibility tests, and offline installation passed |
| Better Sidebar packaged regression | passed | exact product `lib/client.js` used by desktop packaging | Node test runner | all 11 Bundle tests passed, including the `clsx` assertion |
| Bootstrap size and formal publication | pending at tag time | `yourbuddy-v0.4.4` candidate | GitHub Actions macOS arm64 | Bootstrap DMG must be at most 30,000,000 bytes; assets, hashes, updater metadata, and signatures require post-tag verification |

## Scenario: Open desktop capability lifecycle

- Status: passed within the stated local scope.
- Date and time: 2026-10-02 21:40 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.4` candidate containing implementation commits `dfd0d2308d`, `a9baac94e5`, `4597396e64`, and snapshot correction `472c6a4137`.
- Build under test: checked-in desktop shell, Personal Workbench, Harbor 0.10.3 snapshots, generated Harness Bundle, and offline dependency store.
- Environment: macOS Apple Silicon with the repository Node, pnpm, and Rust toolchains.
- Evidence origin: focused Vitest and Node tests, `cargo check`, Bundle construction, and a frozen offline install.
- Data: deterministic local fixtures and packaged source assets; no user data.
- Model or service: no model call; GitHub publication remains pending.

### Steps

1. Build the Personal Workbench and full Harness, then run the desktop lifecycle, command gateway, Capability Pack, Harbor refresh, and compatibility tests.
2. Refresh only Harbor to the latest stable 0.10.3 pair, replay the reviewed runtime-recovery patch, rebuild the Harness Bundle, and install it from the frozen offline store.
3. Inspect the exact Better Sidebar Bundle through the packaging regression test.

### Expected

The splash communicates YourBuddy's configurable workbench, bundled capability parts stay on one version, first-party desktop operations cross one stable trusted gateway, Harbor offers direct runtime recovery, and the packaged Better Sidebar call remains valid.

### Actual

The focused desktop and product checks passed. The Capability Pack suite passed 58 tests, refresh and compatibility checks passed 29 tests, all 11 Bundle tests passed, `cargo check` passed, and the offline store installed the 549-package production graph successfully.

### Evidence

- Before: the startup experience was generic, capability parts had no unified lifecycle, Harbor runtime absence was a dead end, and desktop command evolution required per-command permission edits.
- In progress: Harbor was advanced independently to 0.10.3 so unrelated plugin updates did not enter this release.
- Result: the candidate contains the new splash, one trusted first-party gateway, same-version Capability Pack reconciliation, managed CLI path, Harbor install-and-retry, and the exact-Bundle `clsx` guard.
- Failure and recovery: a full external-plugin refresh found an unrelated Better Sidebar upstream patch conflict, so the refresh tool gained an explicit single-plugin selector and updated only Harbor. The first 0.4.3 tag workflow (`37030448092`) then found a stale Harbor Python source-record hash in its clean checkout and stopped before publication; 0.4.4 corrects that record without moving the failed tag.

### Scope limits

The packaged application and installed WebView controls were not manually exercised before tagging. Apple Developer signing and notarization remain outside this channel. Bootstrap DMG size, public assets, anonymous hashes, updater metadata/signature, and live stable links require the completed tag workflow.

## Delivery status

- Product publication status: release candidate; tag and GitHub Release await explicit approval.
- Verification archive status: complete for the stated pre-publication scope and ready to enter the immutable tag.
- Website synchronization status: not applicable because stable GitHub Release links and product guidance remain unchanged.
- Unverified scope: manual packaged startup and WebView interaction, Bootstrap size until CI builds it, Apple Developer signing, notarization, and all post-publication asset checks.

## Delivery checklist

- [x] Version sources, user notes, local evidence, limits, and bilingual archive are recorded.
- [x] Issues #36, #37, and #38 are covered by focused tests and the updated packaged source paths.
- [x] Issue #34 remains covered against the exact Better Sidebar Bundle shipped by desktop packaging.
- [x] The frozen production dependency graph installs from the prepared offline store.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [ ] Public workflow, assets, hashes, updater metadata/signature, and the 30,000,000-byte Bootstrap limit require post-publication verification.
- [ ] Manual packaged startup and WebView interaction remain unverified.
- [x] No existing public tag or installer is moved or overwritten.
