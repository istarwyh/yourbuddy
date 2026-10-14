# YourBuddy 0.4.10

English | [中文](README.zh.md)

The dated post-publication observations below supersede the candidate delivery status. The preceding candidate evidence remains historical.

This archive records the release candidate and separates source checks from packaged-product acceptance.

- Release identifier: `yourbuddy-v0.4.10`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication; package and public-delivery observations remain pending.
- Evidence source: this version's immutable tag archive after publication; historical checks identify their own commit and run below.
- Evidence gallery: not applicable to this non-UI cleanup change; native acceptance artifacts are produced by the release workflow.
- Evidence download: the [tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.10.zip) will contain this folder after publication; its download has not yet been verified.

## User release notes

### What changed

After a downloaded runtime component is successfully prepared, YourBuddy attempts to remove the exact consumed `.partial` archive and its resume sidecar. An installation failure retains the verified download for a retry.

### Problem solved

Successful new component installations no longer intentionally keep their consumed download archives. A cleanup failure does not turn a successful installation into a startup failure.

### Where to use it

The change runs automatically when Bootstrap prepares downloaded runtime components. No new setting or manual cleanup action is needed.

### How to try it

Install the new Bootstrap build in a disposable profile, allow a missing component to download and prepare, then check that its consumed archive and resume sidecar disappear from the downloads directory. An interrupted or failed installation must retain its resumable data. This published-package journey remains unverified until recorded below.

### Install or upgrade

After publication, choose the Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest). Bootstrap downloads runtime components; Offline includes them. The app updater uses the complete Offline application archive.

### Compatibility, migration, and limitations

The release targets macOS Apple Silicon. Offline seeds and already-installed fast paths remain unchanged. This change does not sweep historical downloads, reclaim installed old versions, add shared Store/incremental delivery, or establish recovery of the reported 13 GB. [Issue #57](https://github.com/istarwyh/yourbuddy/issues/57) stays open. [Issue #39](https://github.com/istarwyh/yourbuddy/issues/39) retains its broader recovery acceptance. Windows has no release channel in this delivery. Apple notarization, installed automatic upgrade, real provider/OAuth flows, enterprise proxies, and measured physical disk recovery are not verified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Version and first-publication scripts | Passed | Local 0.4.10 candidate | Linux x64; Node 24.19.0; synthetic Git/API fixtures | [Source-check record](evidence/source-checks.json); 18 tests passed |
| Cleanup and integration checks | Historical; mixed result | PR #58 source, before version changes | GitHub Actions | [CI run](https://github.com/istarwyh/yourbuddy/actions/runs/38399100814); Bootstrap regressions and Linux static/coverage/build/artifacts passed; benchmark and Windows coverage failed |
| Prepared workbench and native Offline starts | Not verified for 0.4.10 | Release package pending | macOS arm64 runner required | Release workflow retains both acceptance stages for first publication and tag retries |
| Public installers, checksums and updater feed | Not verified | Publication pending | Not applicable | Independent public-byte and metadata checks remain pending |

## Scenario: source release checks

- Status: passed on 2026-10-14 at 06:54 UTC (Etc/UTC).
- Release: `yourbuddy-v0.4.10`; candidate based on the merge of [PR #58](https://github.com/istarwyh/yourbuddy/pull/58). The immutable release tag will identify the final committed version edits.
- Build under test: local source, not a signed macOS package.
- Environment: Linux x64, Node 24.19.0; synthetic API responses and isolated local Git repositories; no real model provider.

1. Run the four release-script test files listed in the source-check record.
2. Expect version agreement, fixed repository/branch/version/SHA checks, rejection of existing releases or invalid inputs, and atomic annotated-tag publication in the isolated fixture.
3. Observed: 18 passed, zero failed or skipped. No production tag or Release was created by these tests.

These tests do not verify macOS packaging or installed behavior. Native acceptance, public delivery and actual reclaimed space require separate observations.

## Known engineering risks

PR #58's long-session benchmark recorded 1434.883238 ms median input latency during 240-turn streaming, above the unchanged 1250 ms budget. Its cause is not established; it is not treated as a passing check or dismissed as flakiness. The cleanup diff contains no browser/TypeScript changes, but that source observation does not establish acceptable workbench performance. Windows coverage had a local Git/pnpm fixture timeout; the separate Cloudflare preview lacked its deployment token. Neither credential permissions nor thresholds are changed for this release.

## Delivery status

- Product publication status: pending; no 0.4.10 public installers are claimed by this pre-publication record.
- Verification archive status: partial; source checks and known risks recorded, macOS release-run and independently downloaded public assets pending.
- Website synchronization status: no product guidance changes; ordinary release deployment is not needed. Stable bilingual download links must be checked after publication.
- Unverified scope: final full-repository CI, native Bootstrap cleanup/recovery, public-package installation, installed updater, physical space recovery, real providers/OAuth, enterprise proxies and Apple notarization.

## Delivery checklist

- [x] Version sources and the candidate identifier agree.
- [x] User notes describe the cleanup scope and retain the open issues.
- [x] Source-only and historical evidence are explicitly labelled.
- [ ] Final macOS release acceptance and independent public delivery are recorded.
- [ ] The immutable downloadable archive and stable website links are verified.

## Post-publication observations — 2026-10-14 UTC

The [public Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.10) was published at 07:44:06 UTC, non-draft and non-prerelease, with 17 uploaded assets. Product and workflow commit `3e4a5cd498bb6fbc677f958eb3a261f8b23306ac` remain selected by the original annotated tag. This separate evidence update does not move the tag or replace an installer.

### Packaged acceptance

[Release run 67](https://github.com/istarwyh/yourbuddy/actions/runs/38527910226) passed its complete publication path, including typecheck, Harness build, component preparation, Bootstrap size/resource checks, native Offline starts, relocated Harbor, checksums and publication. [Workflow observations](evidence/release-workflow-2026-10-14.json) identify each step and the retained artifacts.

| Scenario | Status | Observed result | Evidence scope |
|---|---|---|---|
| Prepared workbench and optional Harbor | Passed | Eight default Clients; nine after real Profile installation | [Prepared result](evidence/prepared-workbench-2026-10-14.json); real Host/Profile in Chromium; desktop invoke stubs do not validate native controls |
| Native Offline installation and cold starts | Passed | Authenticated native workbench and clean exit in all three rounds; 45,529 / 9,164 / 12,231 ms | [Sanitized native result](evidence/native-offline-2026-10-14.json); signed Offline seeds on macOS arm64 with a rejecting local proxy; not a Bootstrap interruption test |
| Installer size | Passed | Bootstrap DMG 11,091,479 bytes; Offline DMG 611,145,238 bytes | [Archive measurements](evidence/installer-sizes.json); not installed size, actual traffic or reclaimed space |

The original prepared and native workflow artifacts expire on 2026-10-21. These records preserve bounded results without process identifiers or local endpoints. Native installation was tested before upload; independently downloaded packages were not executed on macOS.

### Independent public delivery

At 07:50 UTC, an independent Linux x64 check had downloaded all 17 uploaded assets anonymously with HTTP 200: 1,844,681,028 bytes total. Every byte count and GitHub SHA-256 digest matched, as did all 16 `SHA256SUMS.txt` entries. Both updater archives and the component manifest passed cryptographic content and trusted-comment signature checks against the exact product source's public key. [Public observations](evidence/public-verification.json) retain filenames, URLs, sizes, hashes, signatures and scope.

The stable `yourbuddy-updater/latest.json` download was byte-identical to the release manifest, reported 0.4.10 and selected the signed Offline archive. All five signed component entries matched their downloaded archives; Offline contained six matching seeds including debug. Both app archives contained matching manifests and version 0.4.10; Bootstrap excluded runtime/seed directories. The first download attempt stopped after two HTTP 403 responses and an execution-review cancellation; one unchanged retry completed without changing credentials, permissions or routes.

The [tag source ZIP](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.10.zip) downloaded anonymously: 55,301,287 bytes, SHA-256 `b5d6c1c02ed4339aab12c33b410737ea85089592c4bb8967adfe667d0d99533a`, with CRC integrity and the bilingual candidate archive checked. [Source observations](evidence/tag-source-verification.json) identify its exact contents. Post-publication observations belong to this separate evidence commit, not the original tag.

The live [Chinese](https://istarwyh.github.io/yourbuddy/download/) and [English](https://istarwyh.github.io/yourbuddy/en/download/) download pages returned HTTP 200 and retained the stable latest-release link, which resolved to 0.4.10. Product guidance was unchanged, so no website edit or deployment was needed.

### Engineering results and remaining scope

PR #59's static checks, Bootstrap regressions, packaged splash and benchmark passed. Its 240-turn input median was 400.871324 ms against the unchanged 1250 ms budget; [this result](evidence/source-benchmark-2026-10-14.json) does not establish the cause of PR #58's earlier failure or native macOS performance. Full repository CI is not claimed entirely green; the Cloudflare preview failed independently of the macOS release.

Product publication and the stated public-byte checks are complete. The archive remains partial for native Bootstrap cleanup/recovery, native Components/Settings operations, installed automatic upgrade, physical disk recovery, real providers/OAuth, enterprise proxies and Apple notarization. [Issue #57](https://github.com/istarwyh/yourbuddy/issues/57) remains open for historical cleanup and shared/incremental delivery; [issue #39](https://github.com/istarwyh/yourbuddy/issues/39) retains broader recovery acceptance. Windows remains outside this release channel.
