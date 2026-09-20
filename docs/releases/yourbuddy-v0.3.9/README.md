# YourBuddy 0.3.9

English | [中文](README.zh.md)

This archive records the Better Sidebar workbench, GPT Auth, and compact macOS window-control recovery in YourBuddy 0.3.9.

- Release identifier: `yourbuddy-v0.3.9`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: product publication and public-artifact verification are complete within the recorded scope; website deployment and the downloadable verification archive remain pending.
- Release source: immutable tag `yourbuddy-v0.3.9` at `549011d29d7abd1b31e9f0e57047312ef5eb7b7b`.
- Evidence gallery: [workbench-primary screenshot](screenshots/workbench-primary.png) from the final assembled-product smoke.
- Evidence download: the dedicated verification ZIP will be attached after public artifact verification.

## User release notes

### What changed

Better Sidebar again occupies the flexible primary desktop workbench whenever a Session is open, independent of the previous bottom-panel collapsed state. GPT Auth status requests are mounted on the Web carrier again, and macOS window controls use the expanded sidebar header with a compact fallback.

### Problem solved

The middle desktop region no longer remains blank for an open Session, and GPT Auth no longer fails to load with `Cannot read properties of undefined (reading 'get')`.

### Where to use it

Open any YourBuddy Session to use Better Sidebar in the middle workbench. Open **Settings → GPT Auth** to inspect login status, and use the sidebar header for the native macOS window controls.

### How to try it

1. Open an existing Session or create a blank Session.
2. Confirm Better Sidebar fills the middle workbench while the conversation remains in the right auxiliary column.
3. Open **Settings → GPT Auth** and confirm the status page loads without the previous transport or plugin error.

### Install or upgrade

Install from the [0.3.9 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.9) with the [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.9/yourbuddy-0.3.9-macos-arm64.dmg), or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy version.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The desktop supports macOS 11 or later on Apple Silicon. The application is ad-hoc signed rather than Apple Developer signed or notarized, so first launch may require the documented macOS override. Real OAuth, real model traffic, native GUI startup, packaged-WebView interaction, and installation through an older updater remain unverified until the public stage records otherwise.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused source checks | passed | local source candidate | macOS 15.6.1 arm64; Node 22.22.3 | [local validation](evidence/local-candidate-validation.txt) |
| Assembled Host and browser smoke | passed within recorded controlled scope | prepared local product | controlled local Host and Chromium; no model provider | [local validation](evidence/local-candidate-validation.txt) |
| Formal desktop publication | passed | immutable tag `yourbuddy-v0.3.9` | GitHub Actions | [workflow record](evidence/release-workflows.txt) |
| Public installer and updater | passed within recorded scope | five anonymous public downloads | GitHub Release; macOS 15.6.1 arm64 | [artifact record](evidence/public-artifact-stage.json) |
| Published App and relocated runtime | passed within recorded scope | updater archive and DMG | macOS 15.6.1 arm64 | [runtime record](evidence/public-runtime-stage.json) |
| Website synchronization | not verified | bilingual product site | GitHub Pages | pending |

## Scenario: local candidate and assembled-product validation

- Status: passed within the recorded controlled scope.
- Date and time: 2026-09-20 16:50 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.9`; final tag commit `549011d29d7abd1b31e9f0e57047312ef5eb7b7b`.
- Build under test: local source candidate and prepared assembled Host/Client product.
- Environment: macOS 15.6.1 arm64; Node 22.22.3; pnpm 11.7.0; Rust 1.98.0; uv 0.12.5.
- Evidence origin: this release run.
- Data: synthetic Marketplace metadata and an isolated blank Session.
- Model or service: controlled local services; the Codex catalog was resolved without sending a model request.

### Steps

1. Run focused Better Sidebar presentation and release-smoke tests.
2. Prepare the bundled Harness, offline dependency store, managed toolchain, and YourBuddy runtime.
3. Start the assembled Host and browser, create and select an isolated blank Session, and exercise the desktop shell journey.
4. Verify the Better Sidebar Slot geometry, GPT Auth status route, Codex model catalog, Marketplace, proxy, external links, and lifecycle controls.

### Expected

The selected Session renders Better Sidebar across the full primary workbench even when the stored bottom panel is collapsed. GPT Auth status and the `openai-codex` GPT-5.6 Sol catalog resolve without a model request, while existing desktop controls remain usable.

### Actual

The focused checks and complete clean-tree `prepare:release` passed at candidate commit `0be8a931a2746718a4ca50335d2c9f68b2e45deb`. The assembled-product verification observed 56 bundled runtime peer links and six product Client plugins; Better Sidebar filled the Slot, the GPT Auth status channel and Codex catalog resolved, and the controlled external-link, Marketplace, proxy, and application-lifecycle paths passed. The resulting 1680×1000 screenshot has SHA-256 `3968de85040592aa5a5ce140a62f7b63b070f3f388ab26a5d2432192072f60de`.

### Evidence

- Before: the user-provided blank-workbench screenshot is not redistributed because it came from a local desktop state.
- In progress: [local candidate validation](evidence/local-candidate-validation.txt) records the failures, diagnosis, and recovery.
- Result: [workbench-primary screenshot](screenshots/workbench-primary.png) records Better Sidebar in the primary workbench and the conversation in the auxiliary column after the complete clean-tree preparation passed.
- Failure and recovery: the stale smoke expected a model selector before a Session existed. It now probes the Session-independent Host catalog, creates an isolated blank Session, persists its selection, and validates the real Slot geometry without model traffic.

### Scope limits

The controlled browser smoke is not the packaged native WebView and does not prove real OAuth, real model traffic, updater installation, Apple Developer signing, notarization, or live website delivery.

## Scenario: formal publication and public artifacts

- Status: passed within the recorded scope.
- Publication workflow: [GitHub Actions run 35501402740](https://github.com/istarwyh/yourbuddy/actions/runs/35501402740), completed successfully in 18 minutes 28 seconds.
- Release: [YourBuddy 0.3.9](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.9), published at `2026-09-20T09:24:32Z`.
- Evidence origin: release workflow plus independent anonymous downloads.
- Model or service: GitHub Actions and GitHub Release; no model provider.

All five versioned assets and the stable updater manifest were downloaded without GitHub authentication. All three checksum entries passed, every digest matched the GitHub API, and the stable updater manifest was byte-identical to the versioned asset. `minisign-verify` 0.2.5 verified the updater archive's prehashed signature and trusted comment using the public key from the immutable tag. The DMG is 568,361,631 bytes with SHA-256 `fea29a4eedef1417dfb4d66d657c5bf24444da7cab07f387efa505dca00bd7b0`; `hdiutil verify` passed.

The updater archive and DMG contain byte-identical YourBuddy 0.3.9 App trees with bundle identifier `io.github.istarwyh.yourbuddy` and an arm64 executable. Strict code-signature verification passed; Gatekeeper rejected the ad-hoc, non-notarized App. The published resources identify DSH 0.1.5-rc.2, Better Sidebar 0.19.1, Codex Auth 0.3.2, Harbor Evolution 0.9.7, Plugin Marketplace 0.3.3, and Context Doctor 0.7.2. A copied runtime with the original Python home unavailable reported Harbor 0.21.0 and passed `harbor-dsh --help`.

The formal workflow passed version alignment, the selected DSH check, Harness and desktop builds, desktop Host and shell tests, relocated runtime testing, checksums, updater-manifest generation, and publication. See the [workflow record](evidence/release-workflows.txt), [artifact record](evidence/public-artifact-stage.json), and [runtime record](evidence/public-runtime-stage.json).

## Delivery status

- Product publication status: published and independently checked at [YourBuddy 0.3.9](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.9).
- Verification archive status: partial; local, workflow, public-asset, and runtime evidence is complete, while the website record and public verification ZIP remain pending.
- Website synchronization status: pending; source updates and live delivery checks remain to be completed.
- Unverified scope: native GUI startup, packaged-WebView interaction, updater installation from an older release, Apple Developer signing and notarization, OAuth, real model traffic, and live website deployment.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The local scenario records date, time zone, environment, build under test, evidence origin, data type, and service type.
- [x] Source-only, synthetic-data, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] The release entry was added to the bilingual release index.
- [x] The final clean-tree preparation and screenshot capture passed on the committed candidate.
- [x] The public release page, installer, updater metadata, signatures, and hashes were independently verified.
- [ ] The website was synchronized in both languages and the live download journey was independently verified.
- [ ] The downloadable verification archive was created, uploaded, extracted, and checked.
- [x] Product publication, archive status, website synchronization, and unverified scope are reported separately.
- [x] No published tag or installer was moved or overwritten; this repair uses a new version.
