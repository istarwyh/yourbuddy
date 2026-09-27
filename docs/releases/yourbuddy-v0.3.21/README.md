# YourBuddy 0.3.21

English | [中文](README.zh.md)

This archive records the macOS Ego Browser runtime correction and the evidence available before tagged publication.

- Release identifier: `yourbuddy-v0.3.21`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: published and independently checked within the stated limits.
- Evidence commit: `208375672c9cdb14e37e4802d49632c788d5c0dc`; release tag commit `aeb754305209dab34a7f29e3fe435033a59a0965`.
- Evidence gallery: not applicable; this runtime correction has bounded command output instead of screenshots.
- Evidence download: [YourBuddy 0.3.21 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.21).

## User release notes

### What changed

YourBuddy now starts its bundled Ego Browser host through the native macOS desktop session, discovers standard Chrome, Chromium, Brave, and Edge installations, and includes the pinned SDK runtime required by the browser tools.

### Problem solved

In 0.3.20, the Agent Browser tab could load while the Host selected a Linux-only display path and requested `DISPLAY` or Xvfb on macOS. A clean release also omitted an ignored SDK build file required after browser startup. The corrected snapshot bypasses X11/Xvfb on macOS and tracks the SDK as reviewed release input.

### Where to use it

Use the **Agent Browser** sidebar tab and ask the Agent to open, inspect, or operate a website. No separate Ego Lite installation is required; one compatible local Chromium-family browser is required.

### How to try it

After upgrading, start a new Session and ask: “Use Agent Browser to open `https://example.com` and report the page title.” The browser should open without a `DISPLAY` or Xvfb error, and the Agent Browser tab should show the live page.

### Install or upgrade

Install the Apple Silicon DMG from the GitHub Release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing data requires no migration.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and needs a local Chrome, Chromium, Brave, or Edge installation. It does not require X11, Xvfb, or a separate Ego Lite installation. The local headed smoke used Google Chrome and a public no-login page; real-site login, CAPTCHA, downloads, other browser brands, updater installation, Apple Developer signing, and notarization remain outside the observed scope.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Headed macOS Ego Browser launch and navigation | passed | committed `dsh-ego-browser` 0.8.5 snapshot plus reviewed compatibility patch | macOS Apple Silicon, Google Chrome | `--open`, `--status`, and `nodejs` navigation output |
| Product snapshot and documentation regressions | passed | source at `208375672c` | local Node 22/pnpm workspace | 54 focused Node tests, 43 documentation gates, and repository lint |
| Formal desktop publication | passed | `yourbuddy-v0.3.21` | GitHub Actions macOS arm64 | workflow `36322371241` passed packaged-runtime smoke, checksums, updater metadata, and publication |

## Scenario: headed macOS Ego Browser runtime

- Status: passed.
- Date and time: 2026-09-27 21:18 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.3.21` candidate from `208375672c9cdb14e37e4802d49632c788d5c0dc`.
- Build under test: committed Ego Browser snapshot, materialized compatibility patch, and pinned `ego-browser-v2@0.1.1` SDK runtime.
- Environment: macOS Apple Silicon with Google Chrome at its standard application path.
- Evidence origin: local source checkout and real headed browser process.
- Data: public `https://example.com` page with no account or private data.
- Model or service: deterministic browser CLI; no model call.

### Steps

1. Replay the materialized patch against the pristine 0.8.5 snapshot and compare the resulting tree hash with the committed source record.
2. Run the vendored CLI through `--open`, confirm `--status` reports `headless: false`, then execute its structured `taskSpaces`, `browser`, and `page` facades to navigate to `https://example.com` and stop the browser.
3. Run focused bundle, product-refresh, release-smoke, documentation, and lint checks.

### Expected

The patch must replay exactly, the SDK runtime must be tracked and digest-pinned, macOS must not enter the Xvfb path, a real browser must open headed, and the structured tool facade must return the expected URL and title.

### Actual

Patch replay produced tree SHA-256 `cb66f8c0013a62f494c4e9e3f2e66c43c76311e7181448c0aefad3dc711c01d9`. The headed runtime reported Google Chrome with `headless: false`; navigation returned `https://example.com/` and title `Example Domain`. Ten bundle tests and the adjacent refresh/release suites passed, the focused group totaled 54 passing Node tests, all 43 documentation gates passed, and repository lint passed. The live upstream refresh check was not counted as passing because an unrelated latest Harbor candidate exposed a pre-existing prerelease peer-range comparison failure. Workflow `36322371241` completed in 24 minutes, passed the packaged-runtime smoke, and published five assets. The DMG SHA-256 is `022efb08fdda09afde12058a62f13bff34c84ddec79dea9d5b57698e2f7b55d9`; the updater archive SHA-256 is `a52eafc6fec3028c01ef5abc32017aab2f4cfa326a0daef8d3a405113c624d4c`. The stable updater manifest reports 0.3.21 with a 408-character signature.

### Evidence

- Before: 0.3.20 selected the Linux X display path on macOS and could report that `DISPLAY` and Xvfb were missing.
- In progress: the clean snapshot exposed that `runtime/ego-browser/dist/out/index.js` was ignored and absent; the reviewed npm artifact supplied the integrity-pinned SDK runtime.
- Result: the materialized patch replays cleanly, standard macOS browser paths are discovered, the native desktop bypasses X11/Xvfb, and headed navigation passes.
- Failure and recovery: an initial attempt to use the installed native Ego Lite CLI was rejected after its current `taskSpace` API and stderr result stream proved incompatible with the plugin's `taskSpaces` facade; the final correction preserves the plugin's vendored host and ports that host to macOS.

### Scope limits

These checks establish the committed runtime, real headed browser launch, and a public-page navigation on this machine. They do not establish the tagged DMG, packaged Tauri WebView interaction, real-site authentication, CAPTCHA handling, downloads, other browser brands, updater installation, Apple Developer signing, or notarization.

## Delivery status

- Product publication status: published as `yourbuddy-v0.3.21` with five public assets and stable updater metadata in workflow `36322371241`.
- Verification archive status: source, clean patch replay, focused regressions, real headed-browser evidence, public asset metadata, checksums, and stable updater metadata are complete within the stated limits.
- Website synchronization status: deployed successfully in workflow `36322371623`; the Chinese and English site roots returned HTTP 200.
- Unverified scope: tagged artifacts, packaged Tauri WebView interaction, real-site login, CAPTCHA and download flows, non-Chrome browsers, updater installation, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated when applicable.
- [x] Every scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and model or service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Useful before, in-progress, result, failure, and recovery states are retained without imposing a screenshot quota.
- [x] Source-only, historical-only, synthetic-data, mock, skipped, failed, and unverified evidence is labelled explicitly.
- [x] No screenshot was required; bounded command results and source records are traceable.
- [x] Only sanitized derivatives are tracked or attached; credentials, personal information, private content, and sensitive originals are absent.
- [x] The release entry was added to `docs/releases/README.md` and both language files were confirmed consistent.
- [x] Relative links render and every referenced local file exists.
- [x] Tagged CI published and independently exposed the DMG, updater archive, signature, checksums, and stable updater metadata.
- [x] The public release page links to the immutable verification archive.
- [x] The public release, stable latest-release redirect, and stable updater manifest were checked independently of CI and temporary workflow artifacts.
- [x] No desktop Shell origin, capability, permission, or command changed; packaged WebView interaction remains explicitly unverified.
- [x] Published filenames, versions, hashes, and updater metadata are recorded; installed behavior remains explicitly unverified.
- [x] The stable latest-release link and both deployed product-site languages resolve after publication.
- [x] Product publication status, verification archive status, website synchronization, and unverified scope are reported separately.
- [x] Public tags and installers were not moved or overwritten; this correction uses a new version.
