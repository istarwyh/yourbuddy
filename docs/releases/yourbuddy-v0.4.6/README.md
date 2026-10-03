# YourBuddy 0.4.6

English | [中文](README.zh.md)

This archive records the official DSH 0.2.0-rc.1 synchronization, desktop component-lock recovery, Oil Creator executable-path repair, and release-pipeline corrections that supersede the failed 0.4.5 tag.

- Release identifier: `yourbuddy-v0.4.6`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; source checks passed and formal artifact publication is pending.
- Evidence commit: the release candidate commit identified by `yourbuddy-v0.4.6`.
- Evidence gallery: not applicable; this release changes runtime and integration behavior without a new visual flow.
- Evidence download: the pending [YourBuddy 0.4.6 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.6).

## User release notes

### What changed

YourBuddy now bundles the official DSH 0.2.0-rc.1 source while retaining the YourBuddy desktop identity, workbench, and product integrations. Component installation reclaims locks left by terminated owners without removing a live owner's lock. Oil Creator subtitle helpers inherit system and Homebrew executable paths. The release workflow also constructs the branded YourBuddy client and records the exact DSH release commit.

### Problem solved

An interrupted component operation could leave `component.lock` behind and block later installation or repair attempts. Packaged subtitle helpers could miss tools available in an interactive terminal. The first 0.4.5 publication attempt also stopped before building artifacts because its DSH release record remained on 0.1.7-rc.2 after the source moved to 0.2.0-rc.1.

### Where to use it

Lock recovery applies when YourBuddy installs or repairs managed runtime components. Executable-path repair applies when Oil Creator starts its Python subtitle workflow. The synchronized DSH core is used by Sessions, tools, settings, and the Web workbench.

### How to try it

Launch YourBuddy and continue using the existing workbench. Retry a managed component operation after an interrupted process to exercise lock recovery. Start Oil Creator subtitle generation from an exported video to exercise packaged command-line tool discovery.

### Install or upgrade

After publication, install the Apple Silicon Bootstrap or Offline DMG from the GitHub Release. Existing settings, Sessions, workspaces, credentials, and component caches require no migration.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and requires no data migration. Source tests cover lock ownership, release metadata, TypeScript integration, documentation consistency, and the desktop runtime build path. Formal DMG construction, public checksums, updater metadata, installed startup, packaged WebView interaction, code signing, and notarization remain pending until the release workflow and post-publication checks finish.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Desktop component lock ownership | passed | 0.4.6 source candidate | macOS 15.6.1 arm64, Rust 1.98.0 | six focused Rust component tests passed, including stale-owner recovery and live-owner exclusion |
| Release identity and DSH record | passed | 0.4.6 source candidate | Node 22.19.0, pnpm 11.7.0 | seven version tests and 13 release-policy tests passed; DSH 0.2.0-rc.1 tag ancestry was confirmed |
| Merged DSH and documentation integration | passed within source scope | current `master` candidate | macOS 15.6.1 arm64 | repository typecheck, release suite components, and all 43 documentation gates passed |
| Formal desktop artifacts | not verified | `yourbuddy-v0.4.6` publication | GitHub Actions and public GitHub Release | pending tag workflow and independent public-asset checks |

## Scenario: Recover the synchronized desktop release

- Status: passed within the stated source scope.
- Date and time: 2026-10-03 22:25 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.6` candidate; immutable commit is the tagged release candidate.
- Build under test: checked-in YourBuddy desktop sources, bundled DSH integration, release metadata, and component manager.
- Environment: macOS 15.6.1 arm64, Node 22.19.0, pnpm 11.7.0, Rust 1.98.0.
- Evidence origin: focused Node and Rust tests, repository typecheck, documentation gates, Git ancestry, and the recorded 0.4.5 workflow failure.
- Data: deterministic local fixtures and public Git metadata; no user data.
- Model or service: no model call; formal GitHub artifact publication remains pending.

### Steps

1. Record the official DSH 0.2.0-rc.1 tag and commit, retain coherent YourBuddy integrations, and restore branded client construction in the release workflow.
2. Exercise release-version alignment, DSH release policy, desktop component ownership, TypeScript integration, and documentation consistency before creating a new immutable tag.

### Expected

The candidate keeps one YourBuddy version and application identity, records an official DSH release that is an ancestor of the bundled source, recovers only stale component locks, preserves live-owner exclusion, and enters artifact construction with a YourBuddy-branded client.

### Actual

Seven version tests, 13 release-policy tests, 12 bundle tests, 69 product-refresh tests, and six component tests passed. The repository typecheck and `doc-sync` with all 43 gates passed. The official DSH 0.2.0-rc.1 commit is an ancestor of the candidate, and branded `prepare:dist` completed with the regenerated frozen Harness lockfile.

### Evidence

- Before: 0.4.5 source checks passed, but its tag workflow stopped before artifact construction because the DSH release record was stale.
- In progress: the source record was aligned to official DSH 0.2.0-rc.1, and the release workflow regained the branded client build used by prior YourBuddy releases.
- Result: version, policy, bundle, product, component, TypeScript, and documentation checks pass for the 0.4.6 source candidate.
- Failure and recovery: the immutable 0.4.5 tag and failed workflow runs remain unchanged; 0.4.6 carries the corrections as a new version.

### Scope limits

No formal 0.4.6 DMG, updater archive, public checksum file, or updater manifest exists until the tag workflow completes. Installed startup, packaged WebView controls, anonymous public downloads, Apple Developer signing, and notarization are not yet verified.

## Delivery status

- Product publication status: pending the `yourbuddy-v0.4.6` tag workflow and public GitHub Release.
- Verification archive status: complete for pre-publication source and recovery evidence; public artifact evidence is pending.
- Website synchronization status: not applicable because product guidance and stable GitHub Release links remain unchanged.
- Unverified scope: formal artifacts, public hashes and updater metadata, installed startup, packaged WebView interaction, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The scenario records date, time zone, candidate identity, environment, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and source-scope limits match observed checks.
- [x] Failed and unverified evidence is labelled explicitly.
- [x] The release entry exists in both release indexes and the bilingual archive is paired.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [ ] Public workflow, release assets, hashes, updater metadata, stable latest link, and downloadable DMG integrity remain to be verified.
- [ ] Installed startup and packaged WebView interaction remain unverified.
- [x] The failed 0.4.5 tag is unchanged; the correction uses a new version.
