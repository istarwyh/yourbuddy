# YourBuddy 0.4.5

English | [中文](README.zh.md)

This archive records the upstream DSH synchronization, desktop component-lock recovery, Oil Creator executable-path repair, and the compatibility work required to retain YourBuddy product integrations.

- Release identifier: `yourbuddy-v0.4.5`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: failed before artifact publication; the immutable tag remains as failure evidence and is superseded by 0.4.6.
- Evidence commit: the release candidate commit identified by `yourbuddy-v0.4.5`.
- Evidence gallery: not applicable; this release changes runtime and integration behavior without a new visual flow.
- Evidence download: the pending [YourBuddy 0.4.5 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.5).

## User release notes

### What changed

YourBuddy synchronizes its bundled DSH core with the current upstream line while retaining the YourBuddy desktop identity, bundled workbench, and product integrations. Component installation now reclaims a lock left by a terminated owner without removing a live owner's lock. Oil Creator subtitle helpers also inherit the desktop executable search path, including the system and Homebrew locations used by packaged applications.

### Problem solved

An interrupted component operation could leave `component.lock` behind and block later installation or repair attempts. Packaged subtitle helpers could also miss executables that are available in an interactive terminal. The upstream merge additionally required explicit compatibility repairs so YourBuddy-specific conversation, desktop runtime, release, and documentation behavior remained internally consistent.

### Where to use it

The component-lock recovery applies when YourBuddy installs or repairs managed runtime components. The executable-path repair applies when Oil Creator starts its Python subtitle workflow. The synchronized DSH core is used throughout Sessions, tools, settings, and the Web workbench.

### How to try it

Launch YourBuddy and continue using the existing workbench. For the lock recovery path, retry a managed component operation after a previous process was interrupted. For Oil Creator, start subtitle generation from an exported video and confirm the packaged application can locate its required command-line tools.

### Install or upgrade

Install the Apple Silicon Bootstrap or Offline DMG from the GitHub Release after publication. Existing settings, Sessions, workspaces, credentials, and component caches require no migration.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and requires no data migration. Source tests cover lock ownership, release metadata, TypeScript integration, documentation consistency, and the desktop runtime build path. Formal DMG construction, public checksums, updater metadata, installed startup, packaged WebView interaction, code signing, and notarization remain pending until the release workflow and post-publication checks finish.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Desktop component lock ownership | passed | 0.4.5 source candidate | macOS 15.6.1 arm64, Rust 1.98.0 | six focused Rust component tests passed, including stale-owner recovery and live-owner exclusion |
| Release identity and metadata | passed | 0.4.5 source candidate | Node 22.19.0, pnpm 11.7.0 | seven release-version tests passed and all desktop version sources aligned |
| Merged DSH and documentation integration | passed within source scope | current `master` candidate | macOS 15.6.1 arm64 | repository typecheck and all 43 documentation gates passed before release preparation |
| Formal desktop artifacts | failed before publication | `yourbuddy-v0.4.5` publication | GitHub Actions | runs 37128497713 and 37129031449 stopped during immutable component preparation because the recorded DSH release was stale |

## Scenario: Prepare the synchronized desktop candidate

- Status: passed within the stated source scope.
- Date and time: 2026-10-03 21:49 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.5` candidate; immutable commit is the tagged release candidate.
- Build under test: checked-in YourBuddy desktop sources, bundled DSH integration, release metadata, and component manager.
- Environment: macOS 15.6.1 arm64, Node 22.19.0, pnpm 11.7.0, Rust 1.98.0.
- Evidence origin: focused Node and Rust tests, repository typecheck, and documentation gates run from the local source checkout.
- Data: deterministic local fixtures; no user data.
- Model or service: no model call; formal GitHub artifact publication remains pending.

### Steps

1. Merge the current upstream DSH branch, resolve semantic conflicts while retaining YourBuddy product integrations, and restore the YourBuddy release identity.
2. Exercise release-version alignment and desktop component ownership, then validate TypeScript and documentation integration before tagging.

### Expected

The candidate keeps one YourBuddy version and application identity, includes the synchronized DSH core, recovers only stale component locks, preserves live-owner exclusion, and produces no documentation or TypeScript integration failures.

### Actual

The seven release-version tests and six component tests passed. The component tests cover stale-lock recovery and rejection of a second live operation. The repository typecheck passed, and `doc-sync` passed all 43 gates before candidate preparation. The tag workflow then stopped before artifact construction because `DSH_UPSTREAM.json` still recorded 0.1.7-rc.2 while the bundled source was 0.2.0-rc.1.

### Evidence

- Before: upstream synchronization replaced the desktop release identity and line-level merges left incompatible TypeScript and Rust combinations.
- In progress: the merge retained upstream history while restoring coherent YourBuddy conversation, desktop runtime, release, and documentation integrations.
- Result: the 0.4.5 version sources align, focused Rust and release tests pass, and the candidate is ready for the release workflow.
- Failure and recovery: the first Rust compilation exposed semantic merge conflicts; restoring the internally consistent YourBuddy runtime set reduced the failure to zero before release preparation.

### Scope limits

No formal DMG, updater archive, public checksum file, or updater manifest exists until the tag workflow completes. Installed startup, packaged WebView controls, anonymous public downloads, Apple Developer signing, and notarization are not yet verified.

## Delivery status

- Product publication status: failed before artifact publication; 0.4.5 remains an immutable failed tag and is superseded by 0.4.6.
- Verification archive status: complete for source checks and the recorded publication failure; no 0.4.5 public artifacts exist.
- Website synchronization status: not applicable because product guidance and the stable GitHub Release links remain unchanged.
- Unverified scope: formal artifacts, public hashes and updater metadata, installed startup, packaged WebView interaction, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The source scenario records date, time zone, candidate identity, environment, evidence origin, data type, and service type.
- [x] Steps, expected result, actual result, status, and source-scope limits match observed checks.
- [x] Source-only and unverified evidence is labelled explicitly.
- [x] The release entry exists in both release indexes and the bilingual archive is paired.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [ ] Public workflow, release assets, hashes, updater metadata, stable latest link, and downloadable DMG integrity remain to be verified.
- [ ] Installed startup and packaged WebView interaction remain unverified.
- [x] No existing public tag or installer is moved or overwritten.
