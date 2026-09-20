# YourBuddy 0.3.10

English | [中文](README.zh.md)

This archive records the Better Sidebar file-opening and embedded-browser recovery in YourBuddy 0.3.10.

- Release identifier: `yourbuddy-v0.3.10`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: complete within the stated limits; product publication, public-artifact verification, website deployment, and the downloadable verification archive are recorded.
- Release source: immutable tag commit `dda208173552536a743449499ce153a8991fc7ce`; product fix commit `663210f699bd5f58cf848d5723da8218c4744cd2`.
- Evidence gallery: not captured; the controlled browser observation is recorded as source-only evidence rather than an installed YourBuddy screenshot.
- Evidence download: [yourbuddy-v0.3.10-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.10/yourbuddy-v0.3.10-verification.zip), 15,968 bytes, SHA-256 `19ec2c7df84d4c733a20d8e5663c3ba887aba4dca8c92f7706b9b29cff6d587b`.

## User release notes

### What changed

Better Sidebar file actions explicitly target the Session that owns the Files tab. Its Browser tab defaults to unrestricted cross-origin iframe behavior, while the restricted sandbox remains available as an explicit setting.

### Problem solved

File-tree clicks and **Open in new tab** no longer silently do nothing in native Sidebar presentation. Entering a normal URL in the embedded Browser no longer leaves compatible sites blank because of the default restricted sandbox.

### Where to use it

Use the **Files**, **Changes**, and **Browser** tabs in the Better Sidebar primary workbench.

### How to try it

1. Open a Session and select its **Files** tab.
2. Open a file from the tree or choose **Open in new tab** from its context menu and confirm an editor tab appears.
3. Open the **Browser** tab, enter `https://baidu.com/`, and confirm the page renders after navigation.
4. To opt into the restricted mode, enable the browser sandbox in Side card settings.

### Install or upgrade

Install the Apple Silicon DMG from the 0.3.10 GitHub Release or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. An explicitly saved browser-sandbox preference remains authoritative. The unrestricted default gives embedded cross-origin pages normal iframe capabilities, including top-level navigation. The desktop supports macOS 11 or later on Apple Silicon. The application remains ad-hoc signed rather than Apple Developer signed or notarized. Native GUI startup, packaged-WebView interaction, installation through an older updater, OAuth, and real model traffic remain unverified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused sidebar regressions | passed | local source candidate | macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0 | [local validation](evidence/local-candidate-validation.txt) |
| Product patch replay and assembled smoke | passed within recorded controlled scope | prepared local product | controlled local Host and Chromium; no model provider | [local validation](evidence/local-candidate-validation.txt) |
| Formal desktop publication | passed | immutable tag `yourbuddy-v0.3.10` | GitHub Actions | [workflow record](evidence/release-workflows.txt) |
| Public installer and updater | passed within recorded scope | five anonymous public downloads | GitHub Release; macOS 15.6.1 arm64 | [artifact record](evidence/public-artifact-stage.json) |
| Public App identity, product provenance, and relocated runtime | passed within recorded scope | updater archive and DMG | macOS 15.6.1 arm64 | [runtime record](evidence/public-runtime-stage.json) |
| Product website | passed | source commit `5e0c06e98e1cf779242fd957da5758b09ee47814` | GitHub Pages | [website record](evidence/website-deployment.txt) |
| Public verification archive | passed | anonymous public download | GitHub Release | [archive record](evidence/verification-archive.txt) |

## Scenario: local candidate and assembled-product validation

- Status: passed within the recorded controlled scope.
- Date and time: 2026-09-20 22:50 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.10`; product fix commit `663210f699bd5f58cf848d5723da8218c4744cd2`; final tag pending.
- Build under test: local source candidate and prepared assembled Host/Client product.
- Environment: macOS 15.6.1 arm64; Node 22.19.0; pnpm 11.7.0; Rust 1.98.0; uv 0.12.5.
- Evidence origin: this release run.
- Data: synthetic file paths, isolated product state, and public Baidu content in a controlled Chromium iframe.
- Model or service: controlled local services and public HTTP content; no model provider.

### Steps

1. Run the focused Better Sidebar browser and file-open regression specifications.
2. Replay all recorded Better Sidebar patches in order and verify the committed snapshot and patch hashes.
3. Run the product refresh compatibility suite.
4. Run `prepare:release -- --allow-dirty` to refresh candidates, build Harness, regenerate the frozen product lock, prepare the assembled distribution, and execute the product smoke.
5. Compare restricted iframe tokens with the compatibility token set in controlled Chromium and observe the Baidu render result.

### Expected

File actions carry the owning Session scope. The default Browser preference removes the restricted sandbox, the opt-in policy keeps its GUI-origin and loopback exceptions, every product patch replays in order, and the assembled product smoke passes.

### Actual

One focused Vitest assertion and all 67 product-refresh checks passed. The source and both distributed Client bundles carry the file scope, browser policy, and unrestricted default. Product provenance hashes verified, `prepare:release` completed its Harness build, frozen-lock regeneration, distribution preparation, and product smoke, and controlled Chromium rendered Baidu with the compatibility tokens while the original restricted token set remained blank.

### Evidence

- Before: the user-provided Better Sidebar screenshots remain conversation evidence and are not redistributed.
- In progress: [local candidate validation](evidence/local-candidate-validation.txt) records the commands and bounded results.
- Result: source tests, sequential patch replay, prepared-product smoke, and the controlled browser observation passed.
- Failure and recovery: the first focused browser test imported the complete Browser component and failed because the product snapshot's `react-icons` dependency is not installed in the root test graph; the final test executes the distributed sandbox policy directly and checks source/bundle synchronization.

### Scope limits

The controlled Chromium observation is not the packaged native WebView. This local stage does not prove native GUI startup, updater installation, Apple Developer signing, notarization, OAuth, real model traffic, public downloads, stable updater metadata, or website deployment.

## Public release verification

The formal workflow completed in 23m16s and passed every build, desktop contract, relocated-runtime, checksum, manifest, and publication step. See the [workflow record](evidence/release-workflows.txt).

All five versioned assets and the stable updater manifest were downloaded without GitHub authentication. All three checksum entries passed, every digest matched the GitHub API, and the stable updater manifest was byte-identical to the versioned asset. `minisign-verify` 0.2.5 verified the updater archive's prehashed signature and trusted comment using the public key from the immutable tag. The DMG is 568,405,039 bytes with SHA-256 `0258d6529adc95fe96ef62878624b7a84b729d2821dc1ce90b119e287cae4df0`; `hdiutil verify` passed. See the [artifact record](evidence/public-artifact-stage.json).

The public updater and DMG contain identical App trees. The arm64 App reports version 0.3.10 and bundle identifier `io.github.istarwyh.yourbuddy`; its strict ad-hoc signature check passed, it has no TeamIdentifier, and Gatekeeper rejected it because it is not Apple Developer signed or notarized. The public App retains all five product manifests, the three 0.3.10 Better Sidebar patch identities, snapshot digest, distributed file scope, browser compatibility tokens, and unrestricted default. A copy of its Python 3.12.14 / Harbor 0.21.0 runtime passed `harbor --version` and `harbor-dsh --help` after relocation and after making the original Python home unavailable. See the [runtime record](evidence/public-runtime-stage.json).

The initial provenance probe expected each patch descriptor to use a `path` field and failed before checking values; the manifest schema uses `file`. The corrected probe verified all expected patch SHA-256 values, the snapshot digest, and the distributed behavior. This was a verification-script correction, not a product failure.

## Delivery status

- Product publication status: `yourbuddy-v0.3.10` is the latest formal GitHub Release; all workflow steps passed.
- Verification archive status: complete within stated limits; the downloadable ZIP was uploaded, anonymously downloaded, matched byte for byte, extracted, and checked against its GitHub API digest.
- Website synchronization status: deployed and independently verified in both languages, including raw Markdown and the installer journey.
- Unverified scope: native GUI startup, packaged-WebView interaction, an update from an older installation, Apple Developer signing and notarization, OAuth, and real model traffic.

## Delivery checklist

- [x] The release identifier and desktop version sources are prepared for 0.3.10.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation, compatibility, migration, and known limitations are stated.
- [x] The local scenario records date, time zone, environment, build under test, evidence origin, data type, and service type.
- [x] Source-only, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] The release entry is present in the bilingual release index.
- [x] The final clean-tree preparation passed on the committed candidate.
- [x] The public release page, installer, updater metadata, signatures, hashes, and relocated runtime are independently verified.
- [x] The website is synchronized in both languages and the live download journey is independently verified.
- [x] The downloadable verification archive was created, uploaded, extracted, and checked.
- [x] Product publication, archive status, website synchronization, and unverified scope are reported separately.
- [x] No published tag or installer is moved or overwritten; this release uses a new version.
