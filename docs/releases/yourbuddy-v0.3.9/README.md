# YourBuddy 0.3.9

English | [中文](README.zh.md)

This archive records the Better Sidebar workbench, GPT Auth, and compact macOS window-control recovery in YourBuddy 0.3.9.

- Release identifier: `yourbuddy-v0.3.9`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication candidate; local source and assembled-product checks are recorded, while public artifacts and website deployment remain pending.
- Release source: the immutable tag and commit will be recorded after publication.
- Evidence gallery: [workbench-primary screenshot](screenshots/workbench-primary.png) will be captured by the final assembled-product smoke.
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

After publication, install the Apple Silicon DMG from the 0.3.9 GitHub Release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy version.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The desktop supports macOS 11 or later on Apple Silicon. The application is ad-hoc signed rather than Apple Developer signed or notarized, so first launch may require the documented macOS override. Real OAuth, real model traffic, native GUI startup, packaged-WebView interaction, and installation through an older updater remain unverified until the public stage records otherwise.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused source checks | passed | local source candidate | macOS 15.6.1 arm64; Node 22.22.3 | [local validation](evidence/local-candidate-validation.txt) |
| Assembled Host and browser smoke | passed within recorded controlled scope | prepared local product | controlled local Host and Chromium; no model provider | [local validation](evidence/local-candidate-validation.txt) |
| Formal desktop publication | not verified | immutable tag | GitHub Actions | pending |
| Public installer and updater | not verified | public release assets | GitHub Release | pending |
| Website synchronization | not verified | bilingual product site | GitHub Pages | pending |

## Scenario: local candidate and assembled-product validation

- Status: passed within the recorded controlled scope.
- Date and time: 2026-09-20 16:50 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.9`; candidate commit is recorded in the local evidence and will be replaced by the immutable tag commit after publication.
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

The focused checks passed. The final direct assembled-product verification observed 56 bundled runtime peer links and six product Client plugins; Better Sidebar filled the Slot, the GPT Auth status channel and Codex catalog resolved, and the controlled external-link, Marketplace, proxy, and application-lifecycle paths passed. The complete clean-tree `prepare:release` rerun and screenshot capture are the remaining pre-tag checks.

### Evidence

- Before: the user-provided blank-workbench screenshot is not redistributed because it came from a local desktop state.
- In progress: [local candidate validation](evidence/local-candidate-validation.txt) records the failures, diagnosis, and recovery.
- Result: the final screenshot and complete clean-tree preparation result will be added before tagging.
- Failure and recovery: the stale smoke expected a model selector before a Session existed. It now probes the Session-independent Host catalog, creates an isolated blank Session, persists its selection, and validates the real Slot geometry without model traffic.

### Scope limits

The controlled browser smoke is not the packaged native WebView and does not prove real OAuth, real model traffic, updater installation, Apple Developer signing, notarization, or live website delivery.

## Delivery status

- Product publication status: pending; no `yourbuddy-v0.3.9` tag, GitHub Release, or installer has been published yet.
- Verification archive status: partial; local evidence exists, while public asset, runtime, workflow, website, and downloadable-ZIP records remain pending.
- Website synchronization status: pending; the verified 0.3.8 download remains authoritative until 0.3.9 public assets are independently checked.
- Unverified scope: public installer and updater bytes, updater signature, relocated packaged runtime, native GUI startup, packaged-WebView interaction, updater installation from an older release, Apple Developer signing and notarization, OAuth, real model traffic, and live website deployment.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] The local scenario records date, time zone, environment, build under test, evidence origin, data type, and service type.
- [x] Source-only, synthetic-data, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] The release entry was added to the bilingual release index.
- [ ] The final clean-tree preparation and screenshot capture passed on the committed candidate.
- [ ] The public release page, installer, updater metadata, signatures, and hashes were independently verified.
- [ ] The website was synchronized in both languages and the live download journey was independently verified.
- [ ] The downloadable verification archive was created, uploaded, extracted, and checked.
- [x] Product publication, archive status, website synchronization, and unverified scope are reported separately.
- [x] No published tag or installer was moved or overwritten; this repair uses a new version.
