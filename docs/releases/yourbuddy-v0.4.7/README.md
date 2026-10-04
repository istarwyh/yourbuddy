# YourBuddy 0.4.7

English | [中文](README.zh.md)

This archive records the Offline automatic-update payload that keeps every release component available after an application update.

- Release identifier: `yourbuddy-v0.4.7`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; public artifact verification is pending.
- Evidence commit: the release candidate commit identified by `yourbuddy-v0.4.7`.
- Evidence gallery: not applicable; this release changes packaging and update behavior without a new visual flow.
- Evidence download: the GitHub Release will be available at `https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.7` after publication.

## User release notes

### What changed

YourBuddy automatic updates now install the signed Offline application archive. The archive contains the release-matched Harness, Node, pnpm Store, and Harbor seeds before the application restarts.

### Problem solved

The previous update channel installed the small Bootstrap application archive. If the required Harness changed and the network became unavailable after the application update, the new application could not download that Harness and finish startup.

### Where to use it

The change applies automatically whenever an installed release checks the stable YourBuddy update channel and finds a newer version.

### How to try it

Install or upgrade to 0.4.7 through the normal YourBuddy update action. After the update has downloaded and installed, later startup can use the component seeds inside the application without network access.

### Install or upgrade

Existing users can use the automatic updater. New users can still choose the smaller Bootstrap DMG for an online first launch or the Offline DMG for installation without network access.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and requires no data migration. Automatic update downloads are larger because they contain all release component seeds. Source and release-script checks pass; the signed updater installation, packaged startup without network access, Apple Developer signing, and notarization remain unverified until the release workflow and public artifact checks complete.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Offline updater selection and release packaging | passed within source scope | 0.4.7 source candidate | macOS 15.6.1 arm64, Node 22.19.0, pnpm 11.7.0 | desktop release suite, 43 documentation gates, workflow YAML parse, and patch checks passed |
| Formal desktop artifacts | not verified | `yourbuddy-v0.4.7` publication | GitHub Actions and public GitHub Release | pending tag publication and workflow completion |

## Scenario: Select the complete Offline updater payload

- Status: passed within the stated source scope.
- Date and time: 2026-10-04 10:53 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.7` candidate; immutable commit is the tagged release candidate.
- Build under test: checked-in updater-manifest generator, macOS release workflow, tests, and release documentation.
- Environment: macOS 15.6.1 arm64, Node 22.19.0, pnpm 11.7.0; Rust was not available in this verification shell.
- Evidence origin: local desktop release tests, documentation gates, YAML parsing, and Git patch checks.
- Data: deterministic local fixtures; no user data.
- Model or service: no model call; GitHub artifact publication remains pending.

### Steps

1. Generate updater metadata from release assets and require the versioned Offline application archive and signature.
2. Run the desktop release suite, documentation synchronization, workflow YAML parse, and patch checks before creating the release candidate.

### Expected

`latest.json` selects the signed Offline application archive, and the release workflow rejects an Offline updater archive that omits any release component seed.

### Actual

The updater-manifest tests selected `yourbuddy-0.4.7-offline-macos-arm64.app.tar.gz`. The complete desktop release suite passed, all 43 documentation gates passed, the release workflow parsed as YAML, and `git diff --check` passed.

### Evidence

- Before: the stable channel selected the Bootstrap application archive, which omitted runtime component seeds.
- In progress: the release workflow staged separate Bootstrap and Offline application archives and inspected the Offline archive for every generated seed.
- Result: updater metadata now selects only the signed Offline application archive.
- Failure and recovery: no local check failed; formal artifact construction and public download verification remain pending.

### Scope limits

Local checks do not establish that GitHub Actions produced the signed archive, that the stable public channel serves it, or that an installed application completes an automatic update and offline restart. Those checks follow publication.

## Delivery status

- Product publication status: release candidate; tag and public artifacts are pending.
- Verification archive status: complete for the pre-publication source and release-script evidence recorded above.
- Website synchronization status: not applicable because the stable latest-release URL updates automatically and product guidance is unchanged.
- Unverified scope: GitHub workflow completion, published filenames and hashes, stable updater metadata, signed updater installation, offline packaged startup, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The scenario records date, time zone, candidate identity, environment, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and source-scope limits match observed checks.
- [x] Failed and unverified evidence is labelled explicitly.
- [x] The release entry exists in both release indexes and the bilingual archive is paired.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [ ] Public workflow, release assets, checksums, updater metadata, and stable latest link remain pending.
- [ ] Installed updater behavior and offline packaged startup remain unverified.
- [x] Public tags and installers are not moved; corrections use a new version.
