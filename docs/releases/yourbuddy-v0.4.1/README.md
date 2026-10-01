# YourBuddy 0.4.1

English | [中文](README.zh.md)

This archive records the Issue #35 startup and workbench repairs, their focused pre-publication checks, and the verification limits accepted for 0.4.1.

- Release identifier: `yourbuddy-v0.4.1`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; source behavior and the staged Bootstrap component channel were checked before publication.
- Evidence commit: implementation commit `687181621c`; the release tag fixes the complete candidate.
- Evidence gallery: not applicable; no packaged-WebView interaction recording was captured.
- Evidence download: [YourBuddy 0.4.1 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.1).

## User release notes

### What changed

Bootstrap component signatures are now converted to the exact format consumed by the desktop runtime and cryptographically checked during packaging. Optional plugins that cannot activate no longer block the whole client. The workbench now collapses only while the right sidebar is actually open, and its cards remain visible but disabled before the first Session is created.

### Problem solved

YourBuddy 0.4.0 could stop on first launch when the packaged component signature used the signer's transport encoding, or remain on the loading screen when an optional plugin waited for a service. The center workbench could also disappear before the right sidebar opened, while a new workspace showed no available cards.

### Where to use it

Install this version when using the Bootstrap DMG, optional in-box or third-party plugins, or the desktop workbench and right sidebar.

### How to try it

Launch YourBuddy from the Bootstrap installation, create or open a Session, and open then close the right sidebar. Startup reaches the application even when an optional plugin is unavailable; the workbench remains visible before the sidebar opens, collapses while it is open, and returns after it closes.

### Install or upgrade

Install the Apple Silicon Bootstrap or Offline DMG from the GitHub Release, or use **Settings → General → Application lifecycle → Check and update** from an earlier YourBuddy installation. Existing settings, credentials, Sessions, workspace data, and component caches remain in place.

### Compatibility, migration, and limitations

This release targets macOS Apple Silicon and requires no data migration. Bootstrap first launch needs access to the matching GitHub Release unless the required components are cached. The application remains unsigned with an Apple Developer identity and unnotarized. Pre-publication verification did not launch the packaged application or exercise the packaged WebView journey.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Component signature and Bootstrap size gates | passed | 0.4.1 candidate source and staged component inputs | macOS Apple Silicon, Node and Rust toolchains | 5 component tests passed, including the 30,000,000-byte ceiling and signer-output normalization; native component loading compiled |
| Client startup and workbench layout | passed at source level | 0.4.1 candidate source | Vitest browser environment | 57 focused client tests passed |
| Product snapshot and documentation | passed | 0.4.1 candidate source | local repository gates | 10 bundle tests and all 43 documentation gates passed |
| Formal 0.4.1 publication | pending at tag time | `yourbuddy-v0.4.1` candidate | GitHub Actions macOS arm64 | publication workflow and public assets require post-tag verification |

## Scenario: Issue #35 startup and workbench recovery

- Status: passed within the stated source and packaging-input scope.
- Date and time: 2026-10-01 19:48 CST (UTC+08:00).
- Release and commit: `yourbuddy-v0.4.1` candidate containing implementation commit `687181621c`.
- Build under test: candidate source, staged Bootstrap component inputs, and product snapshots.
- Environment: macOS Apple Silicon, local Node, pnpm, and Rust toolchains.
- Evidence origin: focused tests, native compilation, product snapshot verification, and repository documentation gates from this release preparation.
- Data: generated manifests and synthetic client state; no private user data.
- Model or service: deterministic local build and tests; no model call.

### Steps

1. Normalize representative Tauri signer output, enforce the Bootstrap DMG ceiling, compile the native verifier, and validate the recorded product snapshots.
2. Exercise optional and required client-entry failures, then open and close the right sidebar around the desktop workbench.
3. Run the bilingual documentation and release-reference gates.

### Expected

The staged manifest and signature use the runtime's raw minisign format and fail packaging if native cryptographic verification fails. Optional plugin failures are reported without blocking required application services. Workbench collapse follows the actual right-sidebar state and restores after close; cards remain discoverable before a Session exists.

### Actual

All 5 component tests, 57 focused client tests, 10 product bundle tests, native `cargo check`, the Better Sidebar typecheck, and all 43 documentation gates passed. The release workflow now invokes the same native component verifier against the staged channel before bundling.

### Evidence

- Before: the signer output could remain base64 wrapped, one unavailable optional plugin blocked client boot, and workbench visibility followed a prospective layout state rather than the actual right sidebar.
- In progress: the release path gained deterministic signature normalization and a native staged-channel check; client activation policy and layout state were separated by responsibility.
- Result: the candidate contains the first-launch, optional-plugin, and workbench interaction fixes requested by Issue #35.
- Failure and recovery: an attempted standalone Better Sidebar build lacked the parent workspace build configuration; tracked generated files were restored, the checked-in runtime file was updated with the same source change, and the package typecheck plus product snapshot verification passed.

### Scope limits

The packaged application, first-launch download, installed WebView controls, Offline no-network startup, Apple Developer signing, and notarization were not exercised locally. GitHub Actions publication, public filenames, hashes, updater metadata, DMG integrity, and the actual Bootstrap DMG size require post-publication verification.

## Delivery status

- Product publication status: release candidate at tag time; GitHub Actions publication and public downloads require post-tag verification.
- Verification archive status: complete for the stated local scope; the immutable tag contains this bilingual record.
- Website synchronization status: not applicable because product download guidance did not change; the existing stable latest-release link is retained.
- Unverified scope: packaged startup and WebView interaction, first-launch download, Offline no-network launch, Apple Developer signing, notarization, and post-publication artifact checks.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] User-facing notes describe the change, problem, location, trial path, installation, compatibility, and limits.
- [x] The local scenario records time, candidate commit, environment, build, evidence origin, data, and service type.
- [x] Focused component, client, product snapshot, native compilation, and documentation checks are recorded without overstating packaged behavior.
- [x] The release entry was added to the bilingual index and both language files were paired.
- [x] Product publication, verification archive, website synchronization, and unverified scope are reported separately.
- [ ] Public assets, hashes, updater metadata, Bootstrap DMG size, and workflow conclusion require post-publication verification.
- [ ] Packaged startup and WebView controls remain unverified.
- [x] No existing public tag or installer was moved or overwritten.
