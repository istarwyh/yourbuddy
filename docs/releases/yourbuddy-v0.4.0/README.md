# YourBuddy 0.4.0

English | [中文](README.zh.md)

This archive records the Bootstrap release channel, its pre-publication checks, and the verification limits accepted for 0.4.0.

- Release identifier: `yourbuddy-v0.4.0`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; public assets and website synchronization are pending the tagged workflow.
- Evidence commit: implementation commit `570f71653d`; the release tag fixes the complete candidate.
- Evidence gallery: not applicable; no packaged-WebView interaction recording was captured.
- Evidence download: [YourBuddy 0.4.0 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.0) after publication.

## User release notes

### What changed

The recommended macOS download is now a small Bootstrap DMG. Exact Harness, Node, pnpm Store, and Harbor components are published beside it, while a separately named Offline DMG carries the same component set. Settings now provide an explicit **Install Harbor runtime** action, Pomodoro is included by default, and opening a Session collapses the workbench to give the conversation more room.

### Problem solved

Previous releases transferred the complete Node, Store, Harness, and Python runtime to every user even when the host already had reusable content. The Bootstrap path keeps the signed application small, reuses compatible local resources, and installs Harbor only after the user asks for it.

### Where to use it

Choose the Bootstrap DMG for ordinary connected installation. Choose the larger Offline DMG when the first launch must work without outbound access. Harbor remains discoverable before its Python runtime is installed.

### How to try it

Install the Bootstrap DMG and open YourBuddy. The first launch resolves the signed Harness component, reuses a compatible Host Node and normal pnpm Store when possible, and downloads fixed fallbacks only when required. To enable Harbor, open **Settings → General → Application lifecycle** and select **Install Harbor runtime**.

### Install or upgrade

Install the Apple Silicon DMG from the GitHub Release, or use **Settings → General → Application lifecycle → Check and update** from an earlier YourBuddy installation. Existing settings, credentials, Sessions, workspace data, and component caches remain under the existing application data root.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon. Bootstrap first launch needs access to the matching GitHub Release unless required components are already cached; Offline embeds the fixed components. The application remains unsigned with an Apple Developer identity and unnotarized. Local checks did not exercise a formally signed published DMG, packaged WebView controls, cancellation during a component transfer, or a no-network Offline launch.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Bootstrap size and resource separation | passed locally | unsigned 0.3.24 development shell with 0.4.0 component inputs | macOS Apple Silicon | Bootstrap DMG measured 10,892,640 bytes; 30,000,000-byte inclusive gate passed |
| Component and desktop integration | passed | 0.4.0 candidate source | macOS Apple Silicon, Node 24, pnpm 11.7.0, Rust | focused component, updater, bridge, personal-workbench, Cargo, lint, typecheck, and 21 documentation gates |
| Relocated Harbor runtime | passed locally | generated Harbor component | macOS Apple Silicon | relocated `harbor --version` returned 0.21.0 and `harbor-dsh --help` succeeded |
| Formal 0.4.0 publication | pending | `yourbuddy-v0.4.0` | GitHub Actions macOS arm64 | tagged workflow not started when this candidate archive was committed |

## Scenario: Bootstrap component assembly

- Status: passed within the stated local scope.
- Date and time: 2026-10-01 01:30 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.0` candidate containing implementation commit `570f71653d`.
- Build under test: locally built unsigned development DMG and generated 0.4.0 component archives.
- Environment: macOS Apple Silicon, pnpm 11.7.0, local Rust and Node toolchains.
- Evidence origin: focused local build, component generation, tests, and repository gates from this release preparation.
- Data: generated application and runtime files; no private user data.
- Model or service: deterministic local build and tests; no model call.

### Steps

1. Build the application shell and DMG, enforce the 30,000,000-byte limit, generate the exact runtime component archives, and inspect their link layout.
2. Run the focused Client, bridge, updater, component-manager, Store-selection, relocated-Harbor, documentation, lint, and type checks.

### Expected

The Bootstrap DMG stays within the hard limit and excludes Harness, Node, pnpm Store, Harbor, and Offline seeds. Component metadata selects exact release assets; normal startup does not install Harbor; the explicit settings action uses the same native manager.

### Actual

The local Bootstrap DMG was 10,892,640 bytes. Component and updater tests passed, 55 personal-workbench tests passed, Rust component and user-Store selection tests passed, native compilation passed, relocated Harbor commands succeeded, and lint, typecheck, and all 21 quick documentation gates passed. The first local app build stopped only when updater signing required the CI-owned private key; bundling the DMG separately succeeded.

### Evidence

- Before: the default DMG embedded the full Harness, Node archive, offline Store, and Harbor Python runtime.
- In progress: one initial component build exposed internal Node and Harbor symbolic links; Node links were materialized and Harbor retained only safe component-relative links before the passing rebuild.
- Result: the release workflow now builds Bootstrap and Offline DMGs from one signed component manifest, publishes component archives and hashes, and points `latest.json` only to the Bootstrap updater archive.
- Failure and recovery: the expected local updater-signing failure was isolated to the unavailable release private key; CI owns formal signing and publication.

### Scope limits

The public workflow, signed assets, anonymous downloads, stable updater metadata, website pages, packaged first launch, Offline no-network path, transfer cancellation, and packaged Harbor button remain pending post-tag verification.

## Delivery status

- Product publication status: pending the `yourbuddy-v0.4.0` tagged workflow.
- Verification archive status: complete for the pre-publication source and local-build evidence; public artifact evidence remains pending.
- Website synchronization status: pending because the bilingual download guidance changed.
- Unverified scope: formal signing and publication, public downloads and hashes, stable updater selection, packaged startup and WebView controls, Offline no-network launch, transfer cancellation, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation, upgrade, compatibility, migration, and known limitations are stated.
- [x] The local verification scenario records time, candidate commit, environment, build, evidence origin, data, and service type.
- [x] Local steps, expected result, actual result, status, and scope limits match the observed checks.
- [x] Source-only and unverified claims are labelled explicitly.
- [x] The release entry was added to the bilingual index and both language files were confirmed consistent.
- [ ] Public files, hashes, updater metadata, stable latest-release destination, and website pages require post-tag verification.
- [ ] Packaged WebView controls and Offline no-network behavior require post-publication exercise.
- [x] No existing public tag or installer was moved or overwritten.
