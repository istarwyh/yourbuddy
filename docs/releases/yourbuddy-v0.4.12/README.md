# YourBuddy 0.4.12

English | [中文](README.zh.md)

This pre-publication archive records source verification separately from the pending packaged acceptance and public delivery.

- Release identifier: `yourbuddy-v0.4.12`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: source verification recorded; packaged acceptance and independent public downloads pending.
- Evidence source: this release preparation on 2026-10-20 UTC; earlier PR results are identified as historical.
- Evidence download: the [tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.12.zip) will contain this folder after publication; its public download is not yet verified.

## User release notes

### What changed

Network proxy tests use the same shared proxy policy as the running Host. Bundled product plugins declare the selected Harness 0.2 prerelease exactly. Refreshing the pinned Ego Browser runtime preserves its recorded artifact and verifies the final digest.

### Problem solved

The packaged proxy preflight no longer depends on an undeclared CLI dependency or a removed dispatcher marker. Initialization failures remain failures. Plugin metadata agrees with the bundled runtime, and fresh Ego Browser refreshes replace the SDK file already present in the pinned archive.

### Where to use it

Open Settings → General settings → Network proxy. The refresh and compatibility repairs belong to release preparation; they do not add a new in-app control.

### How to try it

After publication, install the macOS Apple Silicon Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest). Test the draft policy, save and restart, then test the active Host policy. HTTP 401/403 establishes reachability only; successful login or model responses require separate verification.

### Compatibility and limitations

The selected Harness is `0.2.0-rc.1`. No version checks, TLS checks, default plugin functionality, release protections or credential permissions are relaxed. Windows has no release channel in this delivery. [Issue #39](https://github.com/istarwyh/yourbuddy/issues/39) and [issue #71](https://github.com/istarwyh/yourbuddy/issues/71) remain open for their unaccepted scope.

## Verification summary

| Scenario | Status | Build under test | Evidence |
|---|---|---|---|
| Combined compatibility, replay, refresh and bundle | Passed, 47/47 | Local source | [Source checks](evidence/source-checks.json) |
| Original product-refresh aggregate | Passed, Oil 147/147 and product 110/110 | Built local source | [Source checks](evidence/source-checks.json) |
| Proxy preflight/Host and Workbench | Passed, 3/3 and 135/135 | Built local source; loopback fixtures | [Source checks](evidence/source-checks.json) |
| Prepared Chromium and native Offline installation/cold starts | Not verified | Release package pending | Every tag executes the existing acceptance and retains sanitized evidence |
| Public installers, checksums, updater and components | Not verified | Publication pending | Independent downloads and signature/manifest checks remain pending |

## Source-check record

On 2026-10-20 UTC, the isolated macOS arm64 checkout used Node 22.22.3 and pnpm 11.7.0. The combined source tree passed the branded full build (347 Client artifacts), focused regressions, full Workbench tests, `test:docs` (21/21), `doc-sync` (43/43), full `lint`, original commit hooks and the original pre-push typecheck. Two independent reviews found no remaining code blocker and recomputed snapshot and patch digests. The merged source is identified by [PR #70](https://github.com/istarwyh/yourbuddy/pull/70), [PR #72](https://github.com/istarwyh/yourbuddy/pull/72) and [PR #73](https://github.com/istarwyh/yourbuddy/pull/73).

The release-source checks passed 29/29 with global/system Git configuration isolated. Their initial run passed 28/29 because a host URL-specific credential helper appeared in a fixture assertion; no production authentication code changed. Normal HTTPS publication passed the original hook but lacked workflow scope. The existing GitHub App published the identical validated tree without adding permissions.

## Known verification gaps

Earlier PR runs failed two unchanged Oil timing/order assertions; this current aggregate passed, but the earlier failures and their unresolved cause remain recorded. #72 Linux coverage stopped before tests while downloading bubblewrap with HTTP 503. Earlier #70/#73 main CI passed; updated-head CI is separate and is not claimed complete. Cloudflare Preview lacks configured credentials; no permissions or credentials were added.

Real provider requests, installed proxy save/restart, enterprise-network behavior, upgrade/downgrade, Bootstrap cleanup/recovery and Apple notarization are not verified by source tests. Prepared Chromium uses the real Host/Profile with desktop command stubs; it does not validate native WebView controls. A release workflow success counts only for the acceptance actually executed.

## Delivery status

- Product publication status: pending; no public 0.4.12 installer is claimed here.
- Verification archive status: partial; source evidence recorded, release-run and public-download evidence pending.
- Website synchronization status: no new product guidance; stable bilingual latest-release links require post-publication checking.
- Unverified scope: all pending or source-only scenarios listed above; Windows delivery is not applicable.

## Rollback

Keep the immutable [0.4.11 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.11) available. If this release is withdrawn, restore the latest-release designation and the stable updater manifest from the prior release. The updater manifest carries the archive signature; component manifests and their detached signatures remain on their immutable releases. Never move a public tag or replace published installer bytes. Already updated applications require manual reinstallation of the previous DMG because the updater accepts only newer versions. Quit the app and preserve a backup of application data before changing installed versions; data downgrade compatibility has not been tested.
