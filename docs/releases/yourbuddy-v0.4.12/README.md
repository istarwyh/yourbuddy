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

## Post-publication observations — 2026-10-20 UTC

These observations supersede the pre-publication delivery status above. The original tag and released bytes remain unchanged.

The [public Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.12) was published at 07:28:10 UTC with 17 assets, non-draft and non-prerelease. The annotated tag resolves to `d3a76afe3d0c6cd8d8248c04e932e2bc3591d802`. [Release run 39383670141](https://github.com/istarwyh/yourbuddy/actions/runs/39383670141) completed successfully; its [per-step record](evidence/release-workflow.json) includes prepared browser acceptance, Bootstrap and Offline packaging, native Offline installation/cold starts, relocated runtime, updater generation, checksums and publication.

### Packaged acceptance

| Scenario | Result | Scope and evidence |
|---|---|---|
| Prepared browser | Passed | [Real Host/Profile, eight default Clients then nine with Harbor](evidence/prepared-workbench.json); desktop invoke stubs remain bridge-only |
| Native Offline | Passed | [Signed Offline seeds, local rejecting proxy, workbench readiness and clean exit](evidence/native-offline.json); boot times 54,798 / 10,826 / 13,425 ms |
| Installer sizes | Passed | [Measured Bootstrap and Offline archives](evidence/installer-sizes.json); not installed size, network traffic or reclaimed space |
| Apple notarization | Skipped | Both build variants logged missing notarization configuration; updater/component signatures do not establish Apple Developer signing |

The original prepared and native artifacts expire on 2026-10-27. Curated structured results are retained here without process identifiers, local endpoints, credentials or cookies. The native package was tested before upload; independently downloaded software was not executed.

### Independent public delivery

The [public-byte report](evidence/public-verification.json) records 10 passing checks and 13 complete anonymous asset downloads (109,393,456 bytes). Downloaded SHA-256 values and sizes match GitHub metadata and the published checksum list. The Bootstrap archive signature and trusted comment pass cryptographic verification; its App identity, arm64 architecture and embedded proxy fix match the release, and its file tree equals the read-only mounted Bootstrap DMG. The downloaded Harness preserves the Ego SDK digest and eight product manifests after documented workspace/development-dependency transformations; actual DSH peer targets remain exactly `0.2.0-rc.1`.

The [manifest cross-check](evidence/manifest-crosscheck.json) verifies that the stable updater equals the release manifest byte-for-byte, references the published Offline archive/signature, and contains the immutable tag release notes. All 16 checksum entries match the 17-asset metadata set. The public component manifest passes content and trusted-comment signature verification; its archive digests, sizes and exact dependency IDs agree with the published assets and the manifest accepted by native CI. Both live bilingual download pages retain the stable latest-release link; no website rebuild was needed.

Complete independent downloads of the two large Offline installers, Harbor runtime, pnpm Store and full source ZIP remain unverified because this host repeatedly hit low throughput and TLS disconnects. Their metadata consistency is verified; it is not full public-byte or Offline-archive signature verification. The immutable tag verification Markdown/JSON files were independently compared byte-for-byte. No installed updater, enterprise-network proxy save/restart, real provider, Bootstrap recovery or data downgrade claim is added.

### CI follow-up and rollback baseline

The original integration-head Linux and Windows coverage jobs failed three workflow-structure tests that still required the old tag whitelist. The [follow-up record](evidence/ci-followup.json) describes the test-only alignment to unconditional acceptance and always-upload evidence, including current/future tags and negative controls. The focused suite passes 16/16 with isolated Git configuration and independent review; new full-repository CI remains separate. Production workflow checks, release permissions, tag and assets are unchanged. Earlier Oil timing failures remain historical; the current aggregate passed 147/147.

The [original 0.4.11 updater manifest](evidence/rollback-updater-0.4.11.json) was anonymously downloaded and matches SHA-256 `29f9cad70e1e82b89972a3b2f6de91bd00cbb5a4baa676ef75c0f8edf37714c0`. It is the recorded stable-feed rollback baseline, not a rollback already executed. Restore it under the stable asset name `latest.json` together with the prior latest-release designation when withdrawal is required; already updated applications need manual reinstallation as described above. [Issue #39](https://github.com/istarwyh/yourbuddy/issues/39) and [issue #71](https://github.com/istarwyh/yourbuddy/issues/71) remain open.
