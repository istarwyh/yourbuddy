# YourBuddy 0.3.22

English | [中文](README.zh.md)

This archive records the independently confirmed Agent Browser package and release-maintenance hardening carried into 0.3.22.

- Release identifier: `yourbuddy-v0.3.22`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; source and predecessor-package checks are complete, while tagged CI owns 0.3.22 artifact publication.
- Evidence commit: `bf8b15beebe1785e74fabea286a6cf8a407b8c55`
- Evidence gallery: not applicable; bounded command output and package digests provide the useful evidence.
- Evidence download: immutable source at `yourbuddy-v0.3.22`; public installers are pending tagged CI.

## User release notes

### What changed

YourBuddy 0.3.22 carries forward the macOS Agent Browser correction, adds independent verification of the downloadable package, fixes product-plugin refresh checks for prerelease DSH versions, and moves the desktop publication workflow to Node.js 24-compatible Actions.

### Problem solved

The Agent Browser correction was already published in 0.3.21, but its first archive did not independently download and exercise the public DMG. The follow-up check verified the packaged SDK and real headed browser navigation. Release maintenance could also reject a compatible prerelease peer range and emitted Node.js 20 Action warnings; both maintenance paths are corrected for this release.

### Where to use it

Use the **Agent Browser** sidebar tab and ask the Agent to open, inspect, or operate a website. Release maintainers also receive a working dry-run compatibility check for current Harbor and Oil Creator candidates.

### How to try it

After upgrading, start a new Session and ask: “Use Agent Browser to open `https://example.com` and report the page title.” The browser should open without a `DISPLAY` or Xvfb error and return `Example Domain`.

### Install or upgrade

Install the Apple Silicon DMG from the GitHub Release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing data requires no migration. Completely quit and reopen an older running application after the update so new Sessions load the bundled runtime.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and needs a local Chrome, Chromium, Brave, or Edge installation. It does not require X11, Xvfb, or a separate Ego Lite installation. Google Chrome, a fresh browser profile, and local and public no-login pages were exercised. Packaged Tauri WebView interaction, real-site login, CAPTCHA and download flows, non-Chrome browsers, updater installation, Apple Developer signing, and notarization remain outside the observed scope.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Independently downloaded Agent Browser package | passed | published 0.3.21 DMG carrying the same runtime snapshot | macOS Apple Silicon, Google Chrome, fresh and normal profiles | DMG checksum, SDK digest, headed local-page and public-page navigation |
| Product refresh compatibility | passed | source at `bf8b15beeb` | local Node 22/pnpm workspace plus current upstream metadata | 27 focused tests and live dry-run candidates |
| Node.js 24 publication Actions | source-checked | 0.3.22 workflow definition | official Action metadata and repository lint | cache v5, setup-uv v7, pnpm setup v4.4.0 |
| Formal 0.3.22 publication | pending | `yourbuddy-v0.3.22` | GitHub Actions macOS arm64 | tagged CI owns build, packaged-runtime smoke, checksums, updater metadata, and upload |

## Scenario: packaged Agent Browser and release maintenance

- Status: passed within the stated pre-publication scope.
- Date and time: 2026-09-27 22:20 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.3.22` candidate from `bf8b15beebe1785e74fabea286a6cf8a407b8c55`.
- Build under test: committed 0.3.22 source plus the independently downloaded 0.3.21 package carrying the same Ego Browser runtime bytes.
- Environment: macOS Apple Silicon with Google Chrome at its standard application path.
- Evidence origin: public GitHub Release asset, mounted application resources, source checkout, and current upstream metadata.
- Data: generated local HTML and public `https://example.com`; no account or private data.
- Model or service: deterministic browser CLI and release scripts; no model call.

### Steps

1. Download the public DMG, compare its SHA-256, mount it read-only, and compare its packaged SDK digest with the recorded source artifact.
2. Run the packaged Host with a fresh browser profile against a local page, then with the normal profile against `https://example.com`.
3. Run product compatibility tests, the live product-refresh dry run, documentation gates, repository lint, and release-version checks.

### Expected

The package must match its checksum, contain the pinned SDK, launch native Chrome headed without Xvfb, and navigate through the structured browser facade. Compatible prerelease peer ranges must pass while older prereleases remain rejected, current refresh candidates must pass static checks without mutating committed snapshots, and the release workflow must use Node.js 24-compatible Actions.

### Actual

The 687,617,324-byte DMG matched SHA-256 `022efb08fdda09afde12058a62f13bff34c84ddec79dea9d5b57698e2f7b55d9` and mounted read-only. Its SDK matched SHA-256 `2d11d9110828253f7dec63ba58d60b4e6dcbb5a6caa3c0650562f305fe640751`. The packaged Host launched Google Chrome headed, navigated a fresh isolated profile to `Published Fresh Profile`, and navigated the normal profile to `https://example.com/` with title `Example Domain`. All 27 focused compatibility and refresh tests and all 21 quick documentation gates passed; repository lint passed. The live dry run accepted Harbor 0.10.3 and the current Oil Creator commit without changing committed snapshots.

### Evidence

- Before: the 0.3.21 package had hosted build evidence but had not been independently downloaded and exercised; refresh compatibility excluded a newer prerelease from a valid lower-bound peer range; the desktop release emitted three Node.js 20 Action warnings.
- In progress: the DMG and SDK digests were checked, the mounted Host was exercised with fresh and existing profiles, SemVer comparison was corrected with a rejecting older-prerelease case, and only the affected desktop Actions were updated.
- Result: the downloadable browser package works on the tested macOS host, current refresh candidates pass static checks, and the 0.3.22 publication path uses Node.js 24-compatible Action runtimes.
- Failure and recovery: an intentionally artificial temporary `HOME` caused Chrome navigation to stall; repeating the fresh-profile check under the real macOS home with isolated product data passed, which matches application deployment. The first HTTPS push of the workflow edit lacked GitHub `workflow` scope; authenticated SSH pushed the same reviewed commit without rewriting history.

### Scope limits

The independently exercised package is 0.3.21, whose Ego Browser runtime bytes are unchanged in the 0.3.22 candidate. Tagged CI must still build and publish the new version. Packaged Tauri WebView interaction, real-site login, CAPTCHA and download flows, non-Chrome browsers, updater installation, Apple Developer signing, and notarization remain unverified.

## Delivery status

- Product publication status: pending the annotated tag and tagged GitHub Actions workflow.
- Verification archive status: source, independent predecessor-DMG exercise, focused regressions, refresh dry run, documentation, and lint evidence are complete within the stated limits.
- Website synchronization status: not applicable before publication; this maintenance release does not change product guidance beyond its release archive.
- Unverified scope: 0.3.22 artifacts, packaged Tauri WebView interaction, real-site login, CAPTCHA and download flows, non-Chrome browsers, updater installation, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The verification scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Useful before, in-progress, result, failure, and recovery states are retained without imposing a screenshot quota.
- [x] Source-only and unverified evidence is labelled explicitly.
- [x] No screenshot was required; bounded command results, hashes, and source records are traceable.
- [x] Only sanitized derivatives are tracked; credentials, personal information, private content, and sensitive originals are absent.
- [x] The release entry was added to `docs/releases/README.md` and both language files were confirmed consistent.
- [x] Relative links render and every referenced local file exists.
- [ ] Tagged CI published and independently exposed the 0.3.22 DMG, updater archive, signature, checksums, and stable updater metadata.
- [ ] The public release page links to this immutable archive.
- [ ] The actual 0.3.22 public destination was checked independently of CI and temporary artifacts.
- [x] No desktop Shell origin, capability, permission, or command changed; packaged WebView interaction remains explicitly unverified.
- [ ] Published filenames, versions, hashes, updater metadata, and installed behavior are recorded.
- [ ] The stable latest-release link resolves to 0.3.22 after publication; website synchronization remains not applicable.
- [x] Product publication status, archive status, website status, and unverified scope are reported separately.
- [x] Public tags and installers were not moved or overwritten; this release uses a new version.
