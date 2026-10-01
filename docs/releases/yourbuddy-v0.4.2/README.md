# YourBuddy 0.4.2

English | [中文](README.zh.md)

This archive records the Better Sidebar startup hotfix reported against 0.4.1 and its focused verification limits.

- Release identifier: `yourbuddy-v0.4.2`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; the bundled runtime regression is fixed and checked before publication.
- Evidence commit: implementation commit `3d9cd2adae`; the release tag fixes the complete candidate.
- Evidence gallery: not applicable; this startup failure is represented by the reported runtime error and deterministic Bundle inspection.
- Evidence download: [YourBuddy 0.4.2 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.2).

## User release notes

### What changed

The Better Sidebar Bundle now calls its bundled `clsx` function correctly when the workbench renders before the first Session exists. A release-snapshot regression test rejects the invalid named-export call that escaped into 0.4.1.

### Problem solved

YourBuddy 0.4.1 could stop during startup with `dsh-better-sidebar: (0, clsx.clsx) is not a function`. The error affected the new no-Session workbench path even though the TypeScript source used the correct default import.

### Where to use it

Upgrade from 0.4.1 if startup reports the Better Sidebar `clsx` error. The fix applies to both Bootstrap and Offline desktop packages.

### How to try it

Install 0.4.2 and launch YourBuddy before creating a Session. The workbench cards render without the Better Sidebar activation error.

### Install or upgrade

Install the Apple Silicon Bootstrap or Offline DMG from the GitHub Release. If 0.4.1 cannot reach Settings, replace it directly with the 0.4.2 DMG; existing settings, Sessions, workspaces, credentials, and component caches remain in place.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and requires no data migration. It retains the 0.4.1 Bootstrap component and workbench behavior. Pre-publication verification inspects the exact checked-in Bundle but does not manually launch the packaged application or exercise the installed WebView.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Better Sidebar runtime call | passed | exact product `lib/client.js` included by desktop packaging | macOS Apple Silicon, Node | Bundle syntax passed and no invalid `(0, clsx.clsx)(...)` call remains |
| Product snapshot regression | passed | 0.4.2 candidate source | Node test runner | all 11 product Bundle tests passed, including the new release-snapshot assertion |
| Formal publication | pending at tag time | `yourbuddy-v0.4.2` candidate | GitHub Actions macOS arm64 | workflow, public assets, hashes, updater metadata, and DMG size require post-tag verification |

## Scenario: Better Sidebar startup hotfix

- Status: passed within the stated Bundle-inspection scope.
- Date and time: 2026-10-01 20:28 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.2` candidate containing implementation commit `3d9cd2adae`.
- Build under test: the checked-in Better Sidebar Bundle used by desktop packaging.
- Environment: macOS Apple Silicon and the repository Node toolchain.
- Evidence origin: this release's focused syntax, forbidden-call, source-record, and Bundle tests.
- Data: static product assets; no user data.
- Model or service: deterministic local tests; no model call.

### Steps

1. Inspect the exact failing Bundle expression and compare it with all other bundled `clsx` calls and the TypeScript source.
2. Replace the invalid named-export expression, update the product snapshot digest, and run Bundle syntax plus product-source verification.
3. Add a regression test that rejects the invalid call in the release snapshot.

### Expected

The no-Session workbench calls the local bundled `clsx` function exactly like every other Better Sidebar render path, and future product snapshots fail tests if the invalid expression returns.

### Actual

The one invalid Bundle call was replaced with `clsx(...)`. JavaScript syntax validation, the explicit forbidden-call scan, the product source-record digest, and all 11 Bundle tests passed.

### Evidence

- Before: 0.4.1 contained `className: (0, clsx.clsx)(...)` while the Bundle exposed only a local `clsx` function.
- In progress: the release snapshot and its recorded tree digest were updated together.
- Result: the candidate contains `className: clsx(...)` and a direct regression test over the shipped Bundle.
- Failure and recovery: no implementation or test failure occurred during this hotfix.

### Scope limits

The packaged application and installed WebView were not manually launched before tagging. Apple Developer signing and notarization remain outside this release channel. Public artifact checks require the completed publication workflow.

## Delivery status

- Product publication status: release candidate at tag time; GitHub Actions owns artifact publication.
- Verification archive status: complete for the stated local scope and included in the immutable tag.
- Website synchronization status: not applicable because download guidance did not change; the stable latest-release link is retained.
- Unverified scope: manual packaged startup, installed WebView interaction, Apple Developer signing, notarization, and post-publication artifacts.

## Delivery checklist

- [x] Version sources, user notes, local evidence, limits, and bilingual archive are recorded.
- [x] The exact shipped Bundle and its product source record are covered by a focused regression test.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [ ] Public workflow, assets, hashes, updater metadata, and DMG size require post-publication verification.
- [ ] Manual packaged startup remains unverified.
- [x] No existing public tag or installer is moved or overwritten.
