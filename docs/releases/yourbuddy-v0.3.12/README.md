# YourBuddy 0.3.12

English | [中文](README.zh.md)

This archive records the Harbor Historical Session Host-path repair in YourBuddy 0.3.12.

- Release identifier: `yourbuddy-v0.3.12`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: published and independently verified within the stated scope.
- Evidence commit: tagged product commit `1c1803ff553e2bfe9fab5b8973d78750f3cff081`; post-release evidence commit recorded with the downloadable archive.
- Evidence gallery: not applicable; this release changes Adapter execution rather than UI.
- Evidence download: attached to the GitHub Release after the final evidence commit.

## User release notes

### What changed

YourBuddy bundles Harbor Evolution 0.9.8. Host execution preserves already-resolved Trial paths, and the Historical Session Observation Adapter can read its frozen input and write its Artifact.

### Problem solved

Historical Session evaluations could stop all Trials at the Adapter with an infrastructure error because the Host command translator added the Trial root twice. The corrected runtime translates each logical Harbor path once instead of weakening score-validity requirements.

### Where to use it

Open Harbor in YourBuddy and start a Historical Session diagnostic from recent completed Sessions.

### How to try it

After upgrading, preview recent Sessions, confirm a new Historical Job, and open the completed Job. The Adapter, Renderer, Judge, and Criterion coverage must complete without the doubled-path infrastructure exception.

### Install or upgrade

Install the Apple Silicon DMG from the 0.3.12 GitHub Release or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation after publication.

### Compatibility, migration, and limitations

The release keeps DSH 0.1.5-rc.2, existing Session data, Evaluator criteria, Judge selection, Promotion boundaries, and the macOS Apple Silicon target. Failed Historical Jobs remain immutable evidence and are not rewritten. Source and packaged-Adapter regressions do not prove the complete Renderer and Judge path. A fresh end-to-end Historical Job requires launching 0.3.12 after installation and is not part of this archive.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Root-cause recovery and upstream Adapter regression | passed | Harbor Evolution 0.9.8 source and public packages | macOS 15.6.1 arm64, Python 3.12, Harbor 0.21.0 | [root-cause record](evidence/root-cause.txt) |
| YourBuddy product refresh and bundled Adapter smoke | passed | public 0.3.12 relocated runtime | macOS 15.6.1 arm64, Python 3.12.14 | [runtime record](evidence/public-runtime-stage.json) |
| Fresh Historical Session Job | not run | formally published 0.3.12 product | macOS Apple Silicon, real Host Judge | installed 0.3.12 restart required |
| Public desktop artifacts and updater | passed | anonymous public downloads | GitHub Release and stable updater channel | [artifact record](evidence/public-artifact-stage.json) |
| Product website | pending | public website | English and Chinese routes | pending |

## Scenario: root-cause recovery and upstream Adapter regression

- Status: `passed`.
- Date and time: 2026-09-21 UTC+08:00 CST.
- Release and commit: Harbor Evolution `v0.9.8`, tag commit `47b4f4b7f87cc037ed11db9cebd1230ce350d12a`; YourBuddy 0.3.12 tag commit `1c1803ff553e2bfe9fab5b8973d78750f3cff081`.
- Build under test: Harbor source plus public npm/PyPI 0.9.8 packages.
- Environment: macOS 15.6.1 arm64, Python 3.12, Node.js 22, Harbor 0.21.0.
- Evidence origin: this release run.
- Data: synthetic Session Observation plus sanitized infrastructure exception.
- Model or service: no model invocation in the focused regression.

### Steps

1. Inspect the immutable failed Job and recover the complete Adapter exception from the Trial files.
2. Run the focused HostEnvironment and SessionObservationAgent tests, then the complete Harbor package checks.
3. Publish Harbor Evolution 0.9.8 and compare public npm/PyPI files byte-for-byte with workflow artifacts.

### Expected

A resolved Host path remains unchanged during command translation, and SessionObservationAgent validates the Observation Digest and writes its Artifact.

### Actual

The focused suite passed 5 tests. The complete upstream suite passed 321 Python and 596 Node tests, tag CI passed, and public npm/PyPI files matched workflow artifacts byte-for-byte. YourBuddy release preparation passed 68 runtime peer-link and seven assembled Client-plugin checks. The 69-test product refresh suite, locked Rust check, and exact release-version check passed; the prepared and anonymously downloaded relocated runtimes then executed the installed 0.9.8 HostEnvironment and SessionObservationAgent and matched the Observation and Artifact Digests. All five public assets matched GitHub digests, three checksum entries passed, the stable updater manifest was byte-identical, the Minisign signature and DMG verified, and the DMG and updater App trees matched.

### Evidence

- Before: [sanitized doubled-path exception](evidence/root-cause.txt).
- In progress: [Harbor tag CI](https://github.com/istarwyh/harbor-self-evolving/actions/runs/35620472947).
- Result: [Harbor 0.9.8 release](https://github.com/istarwyh/harbor-self-evolving/releases/tag/v0.9.8) and [public YourBuddy runtime and Adapter record](evidence/public-runtime-stage.json).
- Failure and recovery: the original Job remains unchanged; a fresh Job is required.

### Scope limits

This scenario proves the corrected Adapter path in source, public Harbor packages, and the anonymously downloaded relocated YourBuddy runtime. It does not prove native GUI startup, Renderer, Judge, real-model scoring, or business quality.

## Delivery status

- Product publication status: [YourBuddy 0.3.12](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.12) is public; the release workflow passed.
- Verification archive status: public artifacts and the packaged Adapter are independently verified; the downloadable ZIP follows the final evidence commit.
- Website synchronization status: source synchronized; live deployment verification remains pending.
- Unverified scope: packaged native startup, packaged-WebView interaction, update from an older installation, OAuth, optional integrations, and business-quality scoring remain unverified unless later scenarios record them.

## Delivery checklist

- [x] Release identifier and desktop version sources match 0.3.12.
- [x] User notes describe the change, problem, location, and shortest journey.
- [x] Compatibility, immutability, and source-test limits are explicit.
- [x] Root-cause and upstream regression evidence is recorded without private Session content.
- [x] YourBuddy release checks and formal publication pass.
- [ ] A fresh packaged Historical Job completes without infrastructure errors.
- [x] Public files, checksums, updater metadata, and signature are verified.
- [ ] The evidence archive is published and independently extracted.
- [ ] The bilingual product website is synchronized and checked live.
- [x] Public tags and released artifacts are never moved or overwritten.
