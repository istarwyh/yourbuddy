# YourBuddy 0.3.11

English | [中文](README.zh.md)

This archive records the Oil Creator content workbench and the **内容创作** Agent Preset in YourBuddy 0.3.11.

- Release identifier: `yourbuddy-v0.3.11`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: partial post-publication archive; local, CI, public-artifact, App identity, provenance, and relocated-runtime verification are recorded, while the synchronized download page and downloadable archive remain pending.
- Release source: immutable tag commit `f96261582bf11a90274d705fad54c93698298304`; candidate commit `6d134ec46dd499efddc4866df58bfedb871e47ff`; Oil Creator feature commit `cf96ee6e1cdb04a8b925e8a59d817b1bd3cc8f61`.
- Evidence gallery: not captured; the assembled headless product journey is recorded as command evidence rather than an installed YourBuddy screenshot.
- Evidence download: pending creation and independent extraction of the downloadable verification archive.

## User release notes

### What changed

YourBuddy includes Oil Creator by default and adds a selectable **内容创作** Agent Preset. The Sidebar presents local content projects in a **Library** view while retaining YourBuddy branding and desktop controls.

### Problem solved

Video and article production can scatter scripts, recordings, subtitles, covers, articles, publication packages, and status across unrelated tools. The workbench keeps each project anchored to one ordinary local folder and gives the Agent a production-focused composition without hiding the files.

### Where to use it

Choose **内容创作** from the Agent Preset menu, then use the Sidebar **Library** tab and **Settings → Plugins → 内容工作台**.

### How to try it

1. Choose the **内容创作** Agent Preset.
2. Ask the Agent to inspect and configure the content workbench, then confirm the proposed local library folder.
3. Create a topic and script and inspect the resulting ordinary project folder in **Library**.
4. Add optional recording, subtitle, cover, article, publishing, or metrics integrations only when needed.

### Install or upgrade

Install the Apple Silicon DMG from the [0.3.11 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.11) or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. The anonymous public download, checksums, updater metadata, signature, App identity, provenance, and relocated runtime passed independent verification.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The release uses the latest eligible DSH Release, `0.1.5-rc.2`, and Oil Creator `0.1.0`. The core local library and script workflow do not require optional integrations. Recording and editing remain human actions; subtitle, cover, article, publishing, and metrics features require their documented external tools or credentials and stop before the final publish action. The desktop supports macOS 11 or later on Apple Silicon and remains ad-hoc signed rather than Apple Developer signed or notarized. Native GUI startup, packaged-WebView interaction, installation through an older updater, OAuth, optional creator integrations, and real model traffic remain unverified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused bundle, refresh, documentation, Rust, and source-policy checks | passed | local source candidate | macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0 | [local validation](evidence/local-candidate-validation.txt) |
| Latest DSH selection and assembled-product preparation | passed within recorded controlled scope | prepared local product | isolated build environment and controlled local Host/Chromium; no model provider | [local validation](evidence/local-candidate-validation.txt) |
| Formal desktop publication | passed | immutable tag `yourbuddy-v0.3.11` | GitHub Actions macOS 15 arm64 | [workflow](https://github.com/istarwyh/yourbuddy/actions/runs/35610547936) |
| Public installer, updater, App identity, provenance, and relocated runtime | passed within recorded scope | anonymously downloaded public release files | GitHub Release and macOS 15.6.1 arm64 | [artifact record](evidence/public-artifact-stage.json), [runtime record](evidence/public-runtime-stage.json) |
| Product website and downloadable verification archive | pending final synchronization | public deployment and archive | GitHub Pages and GitHub Release | candidate site deployment passed; verified download and archive pending |

## Scenario: local candidate and assembled-product validation

- Status: passed within the recorded controlled scope.
- Date and time: 2026-09-21 21:46 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.11`; immutable tag commit `f96261582bf11a90274d705fad54c93698298304`; candidate commit `6d134ec46dd499efddc4866df58bfedb871e47ff`; Oil Creator feature commit `cf96ee6e1cdb04a8b925e8a59d817b1bd3cc8f61`.
- Build under test: local source candidate and prepared assembled Host/Client product.
- Environment: macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0; Rust 1.98.0; uv 0.12.5.
- Evidence origin: this release run.
- Data: synthetic profile, session, content-library, and file paths.
- Model or service: controlled local services; no model provider or optional creator integration.

### Steps

1. Check the official DSH release policy and preview every external product candidate.
2. Run focused bundle, product-refresh, offline, Rust, documentation, source-policy, and compatibility checks.
3. Run clean `prepare:release` to rebuild Harness, freeze the product lock, create the offline Store and portable runtime, and start the assembled Host and Client.
4. Open the Agent Preset menu, locate **内容创作**, load the Oil Creator **Library**, and exercise Personal Workbench branding persistence.

### Expected

The release policy selects the latest eligible DSH version. Oil Creator installs from reviewed immutable source without a second DSH runtime, the offline production install succeeds, **内容创作** is selectable, **Library** mounts, and YourBuddy branding and controls remain available.

### Actual

The DSH policy selected `dsh-v0.1.5-rc.2` and found no newer eligible candidate. Focused checks passed. Clean release preparation built the Harness, regenerated the frozen lock, installed from the generated offline Store, and completed the assembled product smoke with 68 bundled runtime peer links and seven Client plugins. The smoke observed **内容创作**, Oil Creator **Library**, and default/custom/reset Personal Workbench branding.

### Evidence

- Before: not captured; the previous verified public release remains 0.3.10.
- In progress: [local candidate validation](evidence/local-candidate-validation.txt) records the commands and bounded results.
- Result: source checks and clean assembled-product preparation passed.
- Failure and recovery: the initial feature integration exposed the removed Settings helper and a prebuilt-package `prepare` lifecycle; the committed reviewed compatibility patch fixes both and preserves the current Sidebar branding slots. The final clean release preparation passed.

### Scope limits

The headless assembled journey is not the packaged native WebView. This stage does not prove native GUI startup, updater installation, Apple Developer signing or notarization, OAuth, optional external creator workflows, real model traffic, public downloads, stable updater metadata, or website deployment.

## Scenario: public release verification

- Status: passed within the recorded scope.
- Date and time: 2026-09-21 22:53 UTC+08:00 CST.
- Build under test: anonymous downloads from the published `yourbuddy-v0.3.11` GitHub Release.
- Environment: macOS 15.6.1 arm64; no model provider or optional creator integration.
- Actual: the release workflow passed in 34 minutes 38 seconds. All five files downloaded without authentication and matched GitHub digests; all three checksum entries passed; stable and versioned updater manifests were byte-identical; the Minisign signature verified; `hdiutil verify`, strict ad-hoc code-signature validation, App identity, Oil Creator provenance, the **内容创作** preset, updater/DMG App-tree equality, and relocated Harbor commands passed. Gatekeeper rejected the App because it is not Apple Developer signed or notarized.
- Evidence: [artifact record](evidence/public-artifact-stage.json) and [runtime record](evidence/public-runtime-stage.json).

## Delivery status

- Product publication status: `yourbuddy-v0.3.11` is the latest formal GitHub Release and its release workflow passed.
- Verification archive status: public artifacts and runtime are recorded; the downloadable archive is pending creation, upload, extraction, and hash verification.
- Website synchronization status: the candidate bilingual Oil Creator pages are live; the verified 0.3.11 download journey still needs publication.
- Unverified scope: native GUI startup, packaged-WebView interaction, update from an older installation, Apple Developer signing and notarization, OAuth, optional creator integrations, and real model traffic.

## Delivery checklist

- [x] The release identifier and desktop version sources are prepared for 0.3.11.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation, compatibility, migration, and known limitations are stated.
- [x] The local scenario records date, time zone, environment, build under test, evidence origin, data type, and service type.
- [x] Source-only, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] The release entry is present in the bilingual release index.
- [x] The final candidate commit and immutable release tag are recorded.
- [x] The public release page, installer, updater metadata, signatures, hashes, App identity, provenance, and relocated runtime are independently verified.
- [ ] The website is synchronized in both languages and the live download journey is independently verified.
- [ ] The downloadable verification archive is created, uploaded, extracted, and checked.
- [x] Product publication, archive status, website synchronization, and unverified scope are reported separately.
- [x] No published tag or installer is moved or overwritten; this release uses a new version.
