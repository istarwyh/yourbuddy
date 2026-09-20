# YourBuddy 0.3.8

English | [中文](README.zh.md)

This archive records the DSH 0.1.5-rc.2 synchronization, refreshed product plugins, retained YourBuddy adaptations, local release-candidate checks, and publication work for 0.3.8.

- Release identifier: `yourbuddy-v0.3.8`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication draft; local evidence is recorded and public evidence remains pending.
- Release source: immutable tag commit pending.
- Evidence gallery: not captured; this update changes bundled runtime and plugin behavior rather than the desktop shell presentation.
- Evidence download: pending public artifact verification.

## User release notes

### What changed

YourBuddy bundles the official DeepSeek Harness `dsh-v0.1.5-rc.2` release and refreshes Better Sidebar, Harbor Evolution, Plugin Marketplace, and Context Doctor while retaining the desktop workbench adaptations.

### Problem solved

The desktop package depended on an older DSH runtime and older plugin snapshots. This release aligns their peer versions, source provenance, network behavior, and release smoke coverage so the assembled product uses one verified dependency set.

### Where to use it

The changes apply throughout YourBuddy. Better Sidebar remains the primary desktop workbench, the conversation uses the DSH native right sidebar, and Plugin Marketplace continues to appear in Settings.

### How to try it

1. Open YourBuddy and use the Better Sidebar workbench with the resizable conversation region.
2. Open **Settings → Plugin Marketplace**, select a repository, and observe whether a verified npm bundle enables one-click installation.
3. Open **Settings → General → Application lifecycle** to check for future updates.

### Install or upgrade

After publication, install the Apple Silicon DMG from the 0.3.8 GitHub Release or use **Check for updates** from an earlier YourBuddy version. Until then, 0.3.7 remains the verified public download.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The desktop supports macOS 11 or later on Apple Silicon. The application is not Apple Developer signed or notarized. The pre-tag evidence uses the assembled local desktop shell and controlled services; a published DMG, installed WebView, updater installation, OAuth, and real model traffic remain unverified until separately recorded.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| DSH and product preparation | passed | local source candidate before tag | macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0 | [local candidate validation](evidence/local-candidate-validation.txt) |
| Formal desktop publication | not verified | no published 0.3.8 product yet | GitHub Release | pending |
| Website synchronization | not verified | public site still describes 0.3.7 | GitHub Pages | pending |

## Scenario: DSH and product preparation

- Status: passed.
- Date and time: 2026-09-20 12:01 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.8`; tag and final commit pending.
- Build under test: local source candidate with DSH `dsh-v0.1.5-rc.2` at `fb2c4b9e698e30edb738bca4cf0618587db7d203`.
- Environment: macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0; Rust 1.98.0; local controlled Host and browser smoke services.
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

The preparation and assembled browser smoke passed after the product adaptations were rebased onto the selected releases. Final version-specific checks and the desktop artifact build are recorded in the linked evidence before tagging.

### Evidence

- Before: not captured; the previous verified public state is archived under [0.3.7](../yourbuddy-v0.3.7/README.md).
- In progress: retained command and recovery summary in [local candidate validation](evidence/local-candidate-validation.txt).
- Result: retained command output summary and artifact listing in [local candidate validation](evidence/local-candidate-validation.txt).
- Failure and recovery: retained in [local candidate validation](evidence/local-candidate-validation.txt); no release tag or public asset was created during recovery.

### Scope limits

This scenario proves the local source candidate and controlled assembled shell only. It does not prove a published installer, installed DMG WebView, updater installation from an older release, Apple signing or notarization, OAuth, or real model traffic.

## Delivery status

- Product publication status: pending; no 0.3.8 tag, GitHub Release, or public installer exists yet.
- Verification archive status: partial; the pre-tag archive and local evidence are included, while public artifact and workflow evidence remain pending.
- Website synchronization status: pending; the verified website continues to present 0.3.7 until 0.3.8 assets are published and checked.
- Unverified scope: published files and hashes, updater signature and stable metadata, native startup, installed DMG interaction, updater installation, Apple signing and notarization, OAuth, real model traffic, and the live website update.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The local scenario records date, time zone, commit state, environment, build under test, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and scope limits match the local observation.
- [x] Source-only, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] The release entry was added to `docs/releases/README.md` and both languages were kept consistent.
- [ ] The public release page, downloadable archive, installer, updater metadata, and hashes were independently verified.
- [ ] The website was synchronized in both languages and the live download journey was independently verified.
- [x] Product publication, archive status, website synchronization, and unverified scope are reported separately.
- [x] No published tag or installer was moved or overwritten.
