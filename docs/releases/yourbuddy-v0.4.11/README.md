# YourBuddy 0.4.11

English | [中文](README.zh.md)

The dated post-publication observations below supersede the candidate delivery status. The original tag retains the pre-publication record; this later documentation update does not alter the tag or released bytes.

This archive separates local source checks from packaged-product acceptance and public delivery.

- Release identifier: `yourbuddy-v0.4.11`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication; package and public-delivery observations remain pending.
- Evidence source: this version's immutable tag archive after publication; historical checks identify their own run below.
- Evidence gallery: not applicable to this repository diagnostic; native acceptance artifacts are produced by the release workflow.
- Evidence download: the [tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.11.zip) will contain this folder after publication; its download has not yet been verified.

## User release notes

### What changed

A read-only repository command reports retained runtime/component trees and recorded references. Its byte counts distinguish logical files from totals deduplicated by hardlink identity. Release-test fixtures also remain valid when the application version changes.

### Problem solved

The diagnostic provides bounded evidence for investigating disk usage before deciding how historical storage can be reclaimed. It never deletes data or reports a reclaimable-byte estimate.

### Where to use it

Use the repository command documented in the desktop guide's [Component inventory](../../../apps/desktop-tauri/README.md) section. It is a maintenance diagnostic, not a new in-app cleanup control.

### How to try it

Quit YourBuddy and keep its application-data directory unchanged while collecting a report. Follow the linked command with an explicit application-data root, then inspect its relative paths, byte counts, recorded references and errors locally. The source tests exercise a synthetic directory; scanning a real installed macOS profile remains unverified for this release.

### Install or upgrade

After publication, choose the Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest). Bootstrap downloads runtime components; Offline includes them. The app updater uses the complete Offline application archive.

### Compatibility, migration, and limitations

The desktop release targets macOS Apple Silicon; the repository diagnostic supports macOS and Linux. Allocated bytes do not deduplicate APFS clones or measure exclusive physical storage. Recorded references do not establish live use, and concurrent path replacement can invalidate scan exclusions. Keep reports local unless you intend to share directory names. Historical cleanup, shared Store/incremental delivery and recovery of the reported 13 GB remain open in [issue #57](https://github.com/istarwyh/yourbuddy/issues/57); [issue #39](https://github.com/istarwyh/yourbuddy/issues/39) retains broader recovery acceptance. Windows has no release channel in this delivery.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Release scripts, workflow and storage diagnostic | Passed | Local 0.4.11 candidate | Linux x64; Node 24.19.0; synthetic Git/API and storage fixtures | [Source-check record](evidence/source-checks.json) |
| Latest master engineering checks | Historical; mixed result | Master before the version edits | GitHub Actions | [CI run](https://github.com/istarwyh/yourbuddy/actions/runs/38670764492); Linux serial failed, Windows serial and Wine passed |
| Prepared workbench and native Offline starts | Not verified for 0.4.11 | Release package pending | macOS arm64 runner required | Release workflow retains acceptance for first publication and 0.4.9–0.4.11 tag retries |
| Public installers, checksums and updater feed | Not verified | Publication pending | Not applicable | Independent public-byte and metadata checks remain pending |

## Scenario: source release checks

- Status: passed on 2026-10-15 at 12:12 UTC (Etc/UTC).
- Release: `yourbuddy-v0.4.11`; source includes [PR #61](https://github.com/istarwyh/yourbuddy/pull/61) and [PR #62](https://github.com/istarwyh/yourbuddy/pull/62). The immutable release tag will identify the final committed version edits.
- Build under test: local source, not a signed macOS package.
- Environment: Linux x64, Node 24.19.0; synthetic API responses, isolated local Git repositories and temporary storage trees; no real model provider.

1. Run the release-script and storage-diagnostic tests listed in the source-check record.
2. Expect matching version sources, fixed repository/branch/version/SHA checks, refusal of existing Releases, isolated atomic annotated-tag publication, and a read-only storage report.
3. Observed: 18 release-script tests, 16 workflow tests and 6 storage-diagnostic tests passed, with no failures or skips. No production tag or Release was created by these tests.

Source tests do not verify macOS packaging, installed behavior or physical disk recovery. The release workflow retains typecheck, Harness build, component preparation, native Offline acceptance, Bootstrap resource/size checks and public-asset publication checks.

## Known engineering risks

The latest master CI recorded a 5000 ms timeout in `scripts/persistence-schema.spec.ts:550`, in the test named “does not qualify unmarked additions or structurally equal unbound fields”. The failure was a timeout, not an assertion mismatch; its cause is not established. Linux serial completed 81 checks and failed its coverage check. Windows serial and Wine passed. These observations do not establish fully green repository CI or native macOS product acceptance. No timeout, protection, credential permission or release acceptance check is relaxed for this version.

Historical long-session evidence remains mixed: PR #58 recorded 1434.883238 ms median input latency above the 1250 ms budget; the later [PR #59 source benchmark](../yourbuddy-v0.4.10/evidence/source-benchmark-2026-10-14.json) passed at 400.871324 ms with the same budget. That later pass does not identify or fix the earlier cause, and neither result establishes 0.4.11 native macOS performance.

## Delivery status

- Product publication status: pending; no 0.4.11 public installer is claimed by this pre-publication record.
- Verification archive status: partial; source evidence and known risks recorded, macOS release-run and independently downloaded public assets pending.
- Website synchronization status: no product guidance changes; ordinary release deployment is not needed. Stable bilingual download links must be checked after publication.
- Unverified scope: final full-repository CI, real installed-profile inventory, native Bootstrap cleanup/recovery, native Components/Settings operations, independently downloaded package installation, installed updater, physical space recovery, real providers/OAuth, enterprise proxies and Apple notarization.

## Delivery checklist

- [x] Version sources and the candidate identifier agree.
- [x] User notes describe the diagnostic scope and retain the open issues.
- [x] Source-only and historical evidence are explicitly labelled.
- [ ] Final macOS release acceptance and independent public delivery are recorded.
- [ ] The immutable downloadable archive and stable website links are verified.

## Post-publication observations — 2026-10-15 UTC

The [public Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.11) was published at 12:50:42 UTC, non-draft and non-prerelease, with 17 assets. The original annotated tag identifies the product and workflow source recorded in the [workflow evidence](evidence/release-workflow-2026-10-15.json). This documentation-only follow-up records later observations without moving that tag or replacing an installer.

### Packaged acceptance

[Release run 68](https://github.com/istarwyh/yourbuddy/actions/runs/38733761980) passed its publication path, including typecheck, Harness build, component preparation, Bootstrap size/resource checks, native Offline starts, relocated Harbor, checksums and publication. The workflow evidence records each relevant step and its original artifact link.

| Scenario | Status | Observed result | Evidence scope |
|---|---|---|---|
| Prepared workbench and optional Harbor | Passed | Eight default Clients; nine after real Profile installation | [Prepared result](evidence/prepared-workbench-2026-10-15.json); real Host/Profile in Chromium; desktop invoke stubs do not validate native controls |
| Native Offline installation and cold starts | Passed | Authenticated native workbench and clean exit in all three rounds; 69,648 / 15,683 / 16,171 ms | [Sanitized native result](evidence/native-offline-2026-10-15.json); signed Offline seeds on macOS arm64 with a rejecting local proxy; not Bootstrap cleanup/recovery |
| Installer size | Passed | Bootstrap DMG 11,091,209 bytes; Offline DMG 611,237,341 bytes | [Archive measurements](evidence/installer-sizes.json); not installed size, actual traffic or reclaimed space |
| Apple notarization | Skipped | Both app builds explicitly logged missing Apple notarization configuration | [Recorded log warning](evidence/release-workflow-2026-10-15.json); updater/component signatures do not establish Apple Developer signing or notarization |

The original prepared and native workflow artifacts expire on 2026-10-22. These curated results omit process identifiers and local endpoints. Native installation was tested before upload; independently downloaded packages were not executed on macOS.

### Independent public delivery

At 12:56:09 UTC, the independent Linux x64 check completed all 29 checks. It downloaded all 17 assets anonymously with HTTP 200: 1,844,929,416 bytes total. All 17 GitHub SHA-256 digests and byte counts matched, as did all 16 `SHA256SUMS.txt` entries. Both updater archives and the component manifest passed cryptographic content and trusted-comment signature checks against the exact product source's public key. [Public observations](evidence/public-verification.json) preserve canonical public URLs, filenames, sizes, hashes and verification scope.

The stable `yourbuddy-updater/latest.json` was byte-identical to the release manifest, reported 0.4.11 and selected the signed Offline archive. All five signed component entries matched downloaded archives. Static inspection found six matching Offline seed archives including debug, matching embedded manifests/signatures, and no forbidden legacy runtime roots; Bootstrap contained no seeds. These byte and archive checks do not establish an installed automatic upgrade.

The [tag source ZIP](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.11.zip) downloaded anonymously: 55,337,561 bytes, SHA-256 `9cb930a2205c4234e2fbdb5d90a11f262d2d69473a3c442fc36ed671646bef5b`. ZIP integrity, the bilingual candidate archive and source checks were verified. That immutable ZIP deliberately contains the original pre-publication wording; these post-publication observations belong to this later documentation commit.

The live [Chinese download](https://istarwyh.github.io/yourbuddy/download/), [English download](https://istarwyh.github.io/yourbuddy/en/download/), [Chinese release](https://istarwyh.github.io/yourbuddy/releases/) and [English release](https://istarwyh.github.io/yourbuddy/en/releases/) pages returned HTTP 200 and retained stable latest-release links. The latest destination resolved to 0.4.11. Product guidance was unchanged, so no website edit or deployment was needed.

### Engineering results and remaining scope

The [timestamped engineering snapshot](evidence/engineering-ci-2026-10-15.json) records the exact release source's [full-repository CI](https://github.com/istarwyh/yourbuddy/actions/runs/38733634895) as still running. No wholly green repository result is claimed. The earlier Linux schema timeout and both historical long-session benchmark observations above remain relevant; a successful release workflow does not resolve their causes or establish native macOS performance.

Product publication and the stated public-byte checks are complete. The verification archive remains partial for real installed-profile inventory, native Bootstrap cleanup/recovery, native Components/Settings operations, independently downloaded package installation, installed automatic upgrade, historical storage deletion, physical disk recovery, real providers/OAuth and enterprise proxies. Apple notarization was explicitly skipped. [Issue #57](https://github.com/istarwyh/yourbuddy/issues/57) remains open for historical cleanup and shared/incremental delivery; [issue #39](https://github.com/istarwyh/yourbuddy/issues/39) retains broader recovery acceptance. Windows remains outside this release channel.
