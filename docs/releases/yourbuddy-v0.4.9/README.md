# YourBuddy 0.4.9

English | [中文](README.zh.md)

Publication status was updated on 2026-10-12 UTC in the Post-publication observations section. The candidate text below is retained as historical evidence.

This pre-publication archive describes the YourBuddy 0.4.9 release candidate and its startup recovery. Final candidate checks and public delivery remain pending.

- Release identifier: `yourbuddy-v0.4.9`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; final source checks and public-delivery observations are pending.
- Source identifier: `yourbuddy-v0.4.9` identifies the intended release source; the tag has not been published. Post-publication observations will identify the actual release commit in a separate evidence update.
- Evidence gallery: no final release-package screenshots have been captured.
- Evidence download: not published; a downloadable verification archive remains pending.

## User release notes

### What changed

The startup page retains download progress and terminal errors, including after the page reloads. Transient download failures receive bounded retries, and matching partial component downloads resume. Retry startup restarts a failed application once; Copy diagnostics saves the displayed details.

### Problem solved

Interrupted downloads and installations no longer appear silently complete. The current component set becomes active only after authenticated Host readiness. Failed preparation, readiness, or activation leaves the prior active record unchanged without launching an older Harness.

### Where to use it

Use the Bootstrap startup page while YourBuddy downloads and prepares the current release.

### How to try it

Start YourBuddy. Observe the component, stage and byte progress. If startup fails, inspect or copy the error, then select Retry startup once. A matching partial download can continue on the next attempt.

### Install or upgrade

After publication, choose the Bootstrap or Offline DMG from GitHub Releases. Bootstrap downloads runtime components; Offline includes the same component archives. The application updater selects the complete Offline application archive.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon. Recovery prepares only the current manifest target; it does not provide older-version compatibility, downgrade support or Last Known Good fallback. Keeping the prior active record after failure does not imply that the prior runtime will launch. Apple Developer signing and notarization have not been verified. Native installation, installed automatic update, enterprise-proxy interruption and the complete workbench on the published package remain unverified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Historical integration run | Historical; not a final-candidate verdict | Source before the 0.4.9 version edits and final CI runner adaptation | GitHub Actions | [Historical CI run](https://github.com/istarwyh/yourbuddy/actions/runs/38105556992); its outcome does not certify the final candidate |
| Final release-candidate engineering checks | Pending | PR #40 candidate with version, release documentation and CI adaptation | GitHub Actions | [PR #40](https://github.com/istarwyh/yourbuddy/pull/40); complete PR and post-merge engineering results must be checked against the actual final commits before tagging |
| Public installers and updater | Not verified | No 0.4.9 release published | Not applicable | Release workflow and independent downloaded-byte checks remain pending |

## Evidence scope

This pre-publication record was prepared on 2026-10-11 in Etc/UTC from the reviewed integrated source tree and local version edits. Historical source tests and synthetic ad-hoc packaged splash tests belong to their recorded commits. They do not establish that a new version commit, signed release archive, native installer, full workbench or installed updater has passed. Real provider and OAuth workflows have not been verified for this release.

## Delivery status

- Product publication status: pending; this record predates release tagging, packaging and public delivery.
- Verification archive status: release-candidate record; final CI, actual release commit, delivery observations and downloadable evidence remain pending. Evidence gathered after publication belongs in a new immutable evidence commit; the public release tag and installers remain unchanged.
- Website synchronization status: no website edit or deployment is needed for an ordinary release; stable bilingual download links must still be checked after publication.
- Unverified scope: final candidate CI, public hashes and signatures, DMG installation, installed updater, real enterprise-proxy interruptions, complete native workbench, real providers and Apple notarization.

## Post-publication observations — 2026-10-12 UTC

This dated update supersedes the publication status above; the preceding candidate record remains historical. At 20:05 UTC, the [public Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.9) was published, non-draft and non-prerelease, with 17 assets. GitHub records publication at 09:29:07 UTC. Product commit `5410480f0bdbab009a5658cf5cd63666d7ad6498` remains selected by the original tag; no installer or tag is replaced by this evidence update.

[Release run 66](https://github.com/istarwyh/yourbuddy/actions/runs/38227587578) succeeded using workflow commit `589b1043c3c5cd071da2b172bafe013d42dc2aad`. Its [macOS arm64 job](https://github.com/istarwyh/yourbuddy/actions/runs/38227587578/job/114738810416) recorded the following results before publication:

| Scenario | Status | Observed result | Evidence scope |
|---|---|---|---|
| Prepared default workbench and optional Harbor | Passed | Eight default Clients; nine after real Profile installation; Harbor Python 0.10.3 ready | Real Host/Profile in Chromium; desktop command stubs do not validate native controls |
| Native Offline installation and startup | Passed | Authenticated native workbench and clean exit in all three rounds; 58,767 / 15,512 / 12,010 ms | Signed Offline seeds on macOS arm64 with a local rejecting proxy; not a Bootstrap interruption or enterprise-proxy test |
| Release preparation and publication | Passed | Bootstrap size/resource checks, relocated runtime, release checksums and publication completed | Release-run checks; asset metadata does not independently verify downloaded bytes |
| Full repository engineering CI | Not verified | This release route skipped its typecheck step | A successful release workflow is not a full repository CI verdict |

[Machine-readable observations](evidence/publication-2026-10-12.json) retain the public asset names, sizes and GitHub digests, exact source/workflow identifiers, selected job steps and sanitized native result fields. The [native artifact](https://github.com/istarwyh/yourbuddy/actions/runs/38227587578/artifacts/11738327440) expires on 2026-10-19; the observations preserve its three-round result without process identifiers or local paths. Installation was tested before publication, not by downloading and reinstalling the published package. No independent public-byte hash or Minisign result is claimed by this record.

Product publication is complete; this verification archive remains partial. Native Components/Settings operations, native Harbor installation and cache cleanup, controlled Bootstrap interruption/restart/resume and readiness-failure activation, installed automatic upgrade, measured first-install/upgrade/resume payload costs, actual enterprise proxies, real provider/OAuth journeys and Apple notarization remain unverified. The next product acceptance step is to exercise the packaged native component controls and the Bootstrap failure/recovery scenarios in [issue #39](https://github.com/istarwyh/yourbuddy/issues/39). Website synchronization needs no ordinary-release deployment; live website links were not checked in this update. This record does not close an issue or alter the eight-default-Client/optional-Harbor policy.
