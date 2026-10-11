# YourBuddy 0.4.9

English | [中文](README.zh.md)

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
