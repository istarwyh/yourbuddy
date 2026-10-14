# YourBuddy 0.4.10

English | [中文](README.zh.md)

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
