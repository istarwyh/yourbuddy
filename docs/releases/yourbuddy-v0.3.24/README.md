# YourBuddy 0.3.24

English | [中文](README.zh.md)

This archive records the cross-engine Session history repair and the verification limits accepted for 0.3.24.

- Release identifier: `yourbuddy-v0.3.24`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; source behavior is checked within the stated limits.
- Evidence commit: feature commit `66456d4eb8`; the release tag fixes the complete candidate.
- Evidence gallery: not applicable; no packaged-WebView interaction recording was captured.
- Evidence download: [YourBuddy 0.3.24 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.24).

## User release notes

### What changed

Lossless-JSON container checks now use prototype structure and self-consistent constructor relationships instead of engine-specific native-function source text. Session history opening converts every validation or Client exception into a visible error state, and Chat provides **Retry loading** with a fresh stream generation.

### Problem solved

macOS WebKit formatted native functions differently from V8, so valid Assistant stream history could fail validation while opening a main or subagent Session. The local exception then escaped without replacing `openState: "loading"`, leaving the conversation permanently on **Loading history…**.

### Where to use it

The fix applies whenever YourBuddy opens existing main or subagent history, including the **Task management** conversation view described by Issue #34.

### How to try it

Open **Task management** and select a subagent that already produced model output. Its history should load. If a different validation or protocol failure occurs, use **Retry loading** in the displayed error state.

### Install or upgrade

Install the Apple Silicon DMG from the GitHub Release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing Session data requires no migration. Completely quit and reopen an older running application after updating.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and retains the existing unsigned and unnotarized application limitation. Source tests exercised structural cross-realm containers, local history-opening failures, stale-generation protection, and the retry action. A JavaScriptCore/WebKit packaged application was not exercised before tagging, so the native reproduction remains a post-publication manual check rather than a claimed pass.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Cross-engine JSON and Session opening behavior | passed | source at `66456d4eb8` | macOS Apple Silicon, Node 22.22.3, pnpm 11.7.0 | 5 focused files; 252 tests |
| Documentation and generated catalogs | passed after regeneration | 0.3.24 candidate | local macOS workspace | 42 documentation gates plus the corrected Client catalog check |
| Packaged WebKit reproduction | not verified | 0.3.24 candidate | macOS Tauri WebView | no packaged application run before tagging |

## Scenario: source history portability and failure recovery

- Status: passed within the stated source-only scope.
- Date and time: 2026-09-30 21:24 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.3.24` candidate containing feature commit `66456d4eb8`.
- Build under test: committed source checkout and generated Client/workflow catalogs; no formal 0.3.24 installer.
- Environment: macOS Apple Silicon, Node.js 22.22.3, pnpm 11.7.0.
- Evidence origin: focused local runs, documentation gates, and pre-commit checks in this release preparation.
- Data: synthetic cross-realm JSON containers, Session pages, and Assistant baseline failures; no private data.
- Model or service: deterministic unit and Client rendering tests; no model call.

### Steps

1. Run the JSON/session/schema/PTC test files and the Session Controller and Chat view tests that own the affected paths.
2. Regenerate the workflow guest and Client slot catalogs, verify their freshness, run documentation synchronization, and commit through the staged lint and bilingual-pair checks.

### Expected

Plain JSON containers must not depend on `Function.prototype.toString()` formatting. Any initial history exception must leave `loading`, retain a displayable diagnostic, clean up its stream, and allow an explicit retry whose generation cannot be overwritten by stale work.

### Actual

Five focused files passed 252 tests. The tests accepted structurally coherent cross-realm containers, rejected subclasses and malformed containers, converted a plain `TypeError` during history opening into `openState: "error"`, and invoked the localized retry action. Documentation synchronization passed 42 checks and identified one stale generated Client catalog; regeneration followed by its focused freshness check passed. Staged lint and bilingual-pair checks passed when the fix commit was created.

### Evidence

- Before: the four JSON paths compared exact native-function source text, and a local opening exception escaped while the Session remained `loading`.
- In progress: the shared helper replaced three copies, the dependency-free PTC bootstrap adopted the same structure test, and Session opening gained a single failure normalization path.
- Result: source tests confirm engine-text-independent container recognition, a terminal error state, stream cleanup, and an explicit retry action.
- Failure and recovery: documentation synchronization found the expected stale Client slot catalog after adding `retryOpen`; regenerating only that catalog made its focused check pass.

### Scope limits

The candidate was not run inside JavaScriptCore or a packaged Tauri WebView. No DMG was mounted or launched, no updater installation was attempted, and Apple Developer signing and notarization remain absent. Public artifacts, checksums, updater metadata, and workflow conclusions are recorded only after publication.

## Delivery status

- Product publication status: release candidate prepared; GitHub Actions owns artifact publication after the tag is pushed.
- Verification archive status: source evidence complete within the stated limits; public artifact evidence remains pending.
- Website synchronization status: not applicable before publication; this release changes application behavior and release notes but no product guidance page.
- Unverified scope: packaged WebKit reproduction, independent DMG/updater download and extraction, updater installation, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The verification scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Useful before, in-progress, result, failure, and recovery states are retained without imposing a screenshot quota.
- [x] Source-only, synthetic-data, failed, and unverified evidence is labelled explicitly.
- [x] No screenshot was retained because packaged interaction was not exercised; source references are bounded and traceable.
- [x] Only sanitized evidence is tracked; credentials, personal information, private content, and sensitive originals are absent.
- [x] The release entry was added to `docs/releases/README.md` and both language files were confirmed consistent.
- [x] Relative links render and every referenced local file exists.
- [ ] The downloadable evidence archive was extracted and its documented contents were opened successfully.
- [x] The immutable tag archive and release URL are recorded; no gallery applies.
- [ ] The public product destination remains pending until artifact publication completes.
- [x] No desktop Shell origin, capability, permission, or command changed; packaged-WebView interaction remains explicitly unverified.
- [ ] Published filenames, hashes, and updater metadata remain pending until artifact publication completes.
- [ ] The stable latest-release link remains pending; website synchronization is not applicable because product guidance did not change.
- [x] Product publication status, archive status, website status, and unverified scope are reported separately.
- [x] Existing public tags and installers were not moved or overwritten; this candidate uses a new version.
