# YourBuddy 0.3.8

English | [中文](README.zh.md)

This archive records the DSH 0.1.5-rc.2 synchronization, refreshed product plugins, retained YourBuddy adaptations, formal publication, and independent public-artifact checks for 0.3.8.

- Release identifier: `yourbuddy-v0.3.8`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: public product verified; website deployment and downloadable verification archive pending.
- Release source: immutable tag `yourbuddy-v0.3.8` at `9c99a88d1d1b43c35ab922a90e8c409bdc3de06f`.
- Evidence gallery: not captured; this update changes bundled runtime and plugin behavior rather than the desktop shell presentation.
- Evidence download: pending final website verification.

## User release notes

### What changed

YourBuddy bundles the official DeepSeek Harness `dsh-v0.1.5-rc.2` release with Better Sidebar 0.19.1, Harbor Evolution 0.9.7, Plugin Marketplace 0.3.3, and Context Doctor 0.7.2. The product retains its replayable, hash-tracked adaptations.

### Problem solved

The desktop package and its plugins now use one version-aligned dependency set. Better Sidebar uses the DSH native right sidebar without giving up the YourBuddy primary workbench, and Marketplace installation accepts only an unambiguous npm package linked to the selected repository with a declared DSH Bundle patch.

### Where to use it

The changes apply throughout YourBuddy. Better Sidebar remains the primary desktop workbench, the conversation uses the DSH native right sidebar, and Plugin Marketplace remains available in Settings.

### How to try it

1. Open YourBuddy and use the Better Sidebar workbench with the resizable conversation region.
2. Open **Settings → Plugin Marketplace**, select a repository, and observe whether a verified npm bundle enables one-click installation.
3. Open **Settings → General → Application lifecycle** to check for future updates.

### Install or upgrade

Install the [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.8/yourbuddy-0.3.8-macos-arm64.dmg) from the [0.3.8 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.8), or use **Check for updates** from an earlier YourBuddy version.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The desktop supports macOS 11 or later on Apple Silicon. The application has a valid ad-hoc signature but is not Apple Developer signed or notarized, so Gatekeeper rejects its default trust assessment. Native GUI startup, packaged-WebView interaction, updater installation from an older release, OAuth, and real model traffic remain unverified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| DSH and product preparation | passed | local source candidate | macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0 | [local validation](evidence/local-candidate-validation.txt) |
| Formal desktop publication | passed | immutable tag `yourbuddy-v0.3.8` | GitHub Actions | [workflow record](evidence/release-workflows.txt) |
| Public installer and updater | passed within recorded scope | five anonymous public downloads | GitHub Release; macOS 15.6.1 arm64 | [artifact record](evidence/public-artifact-stage.json) |
| Published App and relocated runtime | passed within recorded scope | updater archive and DMG | macOS 15.6.1 arm64 | [runtime record](evidence/public-runtime-stage.json) |
| Website synchronization | pending | source updated; live deployment not checked | GitHub Pages | pending |

## Scenario: DSH and product preparation

- Status: passed.
- Date and time: 2026-09-20 12:01 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.8`; final tag commit `9c99a88d1d1b43c35ab922a90e8c409bdc3de06f`.
- Build under test: local source candidate with DSH `dsh-v0.1.5-rc.2` at `fb2c4b9e698e30edb738bca4cf0618587db7d203`.
- Environment: macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0; Rust 1.98.0; controlled local Host and browser smoke services.
- Evidence origin: this release run.
- Data: synthetic repository and npm metadata used by the release smoke.
- Model or service: controlled local services; no model provider.

### Steps

1. Synchronize the selected official DSH release and materialize the approved product plugin versions and replayable YourBuddy patches.
2. Run product refresh, bundle, preparation, assembled Host, proxy, Marketplace, Better Sidebar, and release-version checks.
3. Build the desktop release candidate and inspect the generated application artifacts.

### Expected

The prepared source pins one DSH release, replays every product patch, builds the assembled Client and Host, preserves the YourBuddy workbench and Marketplace behavior, and emits version-aligned desktop artifacts.

### Actual

The preparation and assembled browser smoke passed after the product adaptations were applied to the selected releases. The standard local build reached updater signing and stopped because the private signing key exists only in GitHub Actions; a build with updater artifacts disabled produced a valid local DMG. The focused proxy test timed out at its five-second deadline both under load and alone; no source in that package changed, and the formal release workflow did not rely on that local result.

### Evidence and limits

The [local candidate validation](evidence/local-candidate-validation.txt) records the commands, recovery, artifact listing, and exact local limits. This scenario does not prove a published installer, installed DMG WebView, updater installation, Apple signing or notarization, OAuth, or real model traffic.

## Scenario: formal publication and public artifacts

- Status: passed within the recorded scope.
- Publication workflow: [GitHub Actions run 35490674447](https://github.com/istarwyh/yourbuddy/actions/runs/35490674447), completed successfully in 18 minutes 4 seconds.
- Release: [YourBuddy 0.3.8](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.8), published at `2026-09-20T05:20:13Z`.
- Evidence origin: release workflow plus independent anonymous downloads.
- Model or service: GitHub Actions and GitHub Release; no model provider.

All five assets were downloaded without GitHub authentication. All three checksum entries passed, every digest matched the GitHub API, and the stable updater manifest was byte-identical to the versioned asset. `minisign-verify` 0.2.5 verified the updater archive's prehashed signature and trusted comment using the public key from the immutable tag. The DMG is 568,380,375 bytes with SHA-256 `fb67f762ce15e86a98b080003729e93bab7b304c940ff90f0fc2d6535e1b8f7d`.

The updater archive and DMG contain YourBuddy 0.3.8 with bundle identifier `io.github.istarwyh.yourbuddy`. Strict code-signature verification passed; Gatekeeper rejected the ad-hoc, non-notarized App. The published resources identify DSH 0.1.5-rc.2, Better Sidebar 0.19.1, Harbor Evolution 0.9.7, Plugin Marketplace 0.3.3, and Context Doctor 0.7.2. A copied runtime with the original Python home unavailable reported Harbor 0.21.0 and passed `harbor-dsh --help`.

The corrected master CI run passed every hosted job observed before tagging. Its Linux and Windows self-hosted standby drills remained queued because no matching runner accepted them, so the aggregate workflow did not complete. The formal release workflow independently passed the selected DSH check, build, desktop Host and shell tests, relocated runtime test, checksums, updater manifest, and publication steps. See the [workflow record](evidence/release-workflows.txt), [artifact record](evidence/public-artifact-stage.json), and [runtime record](evidence/public-runtime-stage.json).

## Delivery status

- Product publication status: published and independently checked at [YourBuddy 0.3.8](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.8).
- Verification archive status: partial; local, workflow, public-artifact, and runtime evidence are committed, while the downloadable archive and website evidence remain pending.
- Website synchronization status: source updated in both languages; live deployment and download journey pending verification.
- Unverified scope: native GUI startup, packaged-WebView interaction, updater installation from an older release, Apple Developer signing and notarization, OAuth, real model traffic, self-hosted standby CI drills, and the live website update.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The local and public scenarios record time, commit, environment, build under test, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and scope limits match the observation.
- [x] Source-only, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] The release entry was added to `docs/releases/README.md` and both languages were kept consistent.
- [x] The public release page, installer, updater metadata, signatures, and hashes were independently verified.
- [ ] The website was synchronized in both languages and the live download journey was independently verified.
- [ ] The downloadable verification archive was created, uploaded, and checked.
- [x] Product publication, archive status, website synchronization, and unverified scope are reported separately.
- [x] No published tag or installer was moved or overwritten.
