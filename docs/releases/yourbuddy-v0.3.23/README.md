# YourBuddy 0.3.23

English | [中文](README.zh.md)

This archive records the Better Sidebar workbench terminal and the verification limits accepted for 0.3.23.

- Release identifier: `yourbuddy-v0.3.23`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; source checks are complete, while tagged CI owns artifact publication.
- Evidence commit: feature merge `a7cb99406c180d4eef1adca66ccf8eaf5bd5e6be`; the release tag commit will contain this archive.
- Evidence gallery: not applicable; no packaged-WebView interaction recording was captured.
- Evidence download: immutable source at `yourbuddy-v0.3.23`; public installers are pending tagged CI.

## User release notes

### What changed

Better Sidebar now offers **New terminal** in its workbench. Each tab uses YourBuddy's existing terminal renderer and PTY lifecycle, remains available while switching among cached Sessions, and releases its process when closed.

### Problem solved

Users can open a shell beside the conversation they are working in without switching to the separate native right Sidebar. The native right Sidebar terminal remains unchanged.

### Where to use it

Open Better Sidebar, use its workbench add control, and choose **New terminal**. The terminal appears as a workbench tab for the current Session.

### How to try it

Create a terminal tab, run a harmless command such as `pwd`, switch to another cached Session, then return. The original terminal tab and process should still be present; closing the tab should release it.

### Install or upgrade

Install the Apple Silicon DMG from the GitHub Release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing data requires no migration. Completely quit and reopen an older running application after updating.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and retains the existing unsigned and unnotarized application limitation. Source and browser-replay checks exercised the terminal adapter and retained PTY lifecycle, but the packaged Tauri WebView interaction and native terminal process were not exercised before tagging. Eleven failing Web cases and their owner-only fixtures were removed at the user's explicit request; those journeys are unverified rather than passed.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Better Sidebar terminal lifecycle | passed | source at `a7cb99406c` | macOS 15.6.1 arm64, Node 22.19.0, pnpm 11.7.0 | 51 focused tests; 9,252 GUI tests; 20 retained Web replays |
| Documentation and desktop release checks | passed | source at `a7cb99406c` | local macOS workspace | typecheck, lint, 43 documentation checks, desktop release tests |
| Pull-request CI | partial | PR #33 head `2c43a92ec1` | GitHub Actions Linux and Windows matrices | compatibility, benchmark, Windows build/native, package, and runtime jobs passed; repository-baseline failures recorded below |
| Packaged workbench terminal | not verified | pending published 0.3.23 application | macOS Apple Silicon | no packaged-WebView recording or native interaction run |

## Scenario: source terminal integration and release preflight

- Status: passed within the stated source-only scope.
- Date and time: 2026-09-28 23:14 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.3.23` candidate from merge `a7cb99406c180d4eef1adca66ccf8eaf5bd5e6be`.
- Build under test: committed source checkout and built Client packages; no formal 0.3.23 installer.
- Environment: macOS 15.6.1 Apple Silicon, Node.js 22.19.0, pnpm 11.7.0, plus GitHub Actions Linux and Windows runners.
- Evidence origin: this release's local runs and PR #33 checks.
- Data: synthetic terminal tabs, Sessions, and browser replay fixtures; no private data.
- Model or service: deterministic source and browser-replay tests; no model call.

### Steps

1. Run focused terminal controller, factory, Better Sidebar adapter, lazy-bundle, and managed-patch checks, then run the full GUI suite and retained browser replays.
2. Run typecheck, documentation synchronization, lint, desktop release tests, and the PR's cross-platform CI matrix.
3. Review the explicitly deleted Web cases and classify their former journeys as unverified.

### Expected

Better Sidebar should create terminal tabs through the shared factory, preserve PTYs across cached Session switches, release them on close, keep xterm outside the startup bundle, and leave the native right Sidebar unchanged. Verification must distinguish passed source behavior from deleted coverage and packaged behavior that was not exercised.

### Actual

The focused terminal checks passed 51 tests. The GUI suite passed 9,252 tests with one skip, and five retained Web files passed 20 replays. Typecheck, 43 documentation checks, lint, and 272 desktop release-test assertions passed. PR compatibility, benchmark, Windows build/native, package, and release-shaped runtime jobs passed. Static CI stopped on five client-domain graph violations already present on `origin/master`; snapshot/artifact CI stopped on a duplicate helper already present on `origin/master`. Issue policy targeted the upstream repository instead of this fork, and weighted approval required another reviewer. The release process repaired earlier application-entrypoint and private-desktop-package classification failures before reaching those existing blockers.

### Evidence

- Before: Better Sidebar had no terminal descriptor; terminal ownership existed only in the native right Sidebar.
- In progress: PR #33 records the feature commits, requested test deletions, lazy-load correction, focused runs, and CI diagnostics.
- Result: source checks confirm the shared terminal factory, retained PTY lifecycle, close disposal, native filtering, and lazy xterm bundle.
- Failure and recovery: a static import initially pulled xterm into the startup bundle and was replaced with a lazy wrapper. Two clean-checkout CI classification failures were repaired. Remaining CI blockers are unchanged files from the synchronized base and are retained as release limitations rather than reported as passes.

### Scope limits

No formal 0.3.23 installer, packaged Tauri WebView, native terminal process, updater installation, Apple Developer signature, or notarization was exercised before tagging. The 11 removed Web cases no longer supply regression coverage for their Help, page-context, HMR, document-preview, message-action, present, and onboarding journeys. A GUI demonstration GIF could not be recorded against the packaged native shell and is absent.

## Delivery status

- Product publication status: pending tagged GitHub Actions publication of the Apple Silicon DMG, updater archive, signature, checksums, and updater manifest.
- Verification archive status: source evidence is complete within the stated limits; public artifact evidence remains pending.
- Website synchronization status: not applicable; this release changes application behavior and release notes but no product guidance page.
- Unverified scope: formal 0.3.23 artifacts, packaged-WebView terminal interaction, native PTY behavior in the installed app, updater installation, the 11 removed Web journeys, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The verification scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Useful before, in-progress, result, failure, and recovery states are retained without imposing a screenshot quota.
- [x] Source-only, failed, removed, and unverified evidence is labelled explicitly.
- [x] No screenshot was retained because packaged interaction was not exercised; source and CI references are bounded and traceable.
- [x] Only sanitized evidence is tracked; credentials, personal information, private content, and sensitive originals are absent.
- [x] The release entry was added to `docs/releases/README.md` and both language files were confirmed consistent.
- [x] Relative links render and every referenced local file exists.
- [ ] Tagged CI has not yet produced a downloadable archive to extract and inspect.
- [ ] The public release page cannot be checked before publication.
- [ ] The actual product destination cannot be checked before publication.
- [x] No desktop Shell origin, capability, permission, or command changed; packaged-WebView interaction remains explicitly unverified.
- [ ] Published filenames, versions, hashes, and updater metadata remain pending tagged CI.
- [ ] The stable latest-release link remains pending publication; website synchronization is not applicable.
- [x] Product publication status, archive status, website status, and unverified scope are reported separately.
- [x] Existing public tags and installers were not moved or overwritten; this release uses a new version.
