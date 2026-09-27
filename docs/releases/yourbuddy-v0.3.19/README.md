# YourBuddy 0.3.19

English | [中文](README.zh.md)

This archive records the default Ego Browser integration and the source verification completed before publication.

- Release identifier: `yourbuddy-v0.3.19`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: failed before artifact publication; superseded by 0.3.20.
- Evidence commit: the immutable commit tagged `yourbuddy-v0.3.19`.
- Evidence gallery: not captured; packaged WebView interaction remains unverified.
- Evidence download: immutable source at `yourbuddy-v0.3.19`; no public installer was produced.

## User release notes

### What changed

YourBuddy now includes the reviewed `dsh-ego-browser` 0.8.5 plugin as an offline default. This release also retains the Oil Creator workbench action-feedback fix and the automated release-candidate preparation added since 0.3.18.

### Problem solved

A fresh YourBuddy installation can expose browser tools and the Agent Browser surface without a separate GitHub or npm installation. Oil Creator actions also keep reliable visible feedback when the workbench state changes.

### Where to use it

Ask the Agent to open or operate a website. Ego Browser appears through Better Sidebar and uses a locally installed compatible Chrome, Chromium, Brave, or Edge browser.

### How to try it

Start a new Session and ask the Agent to open a website. The first `ego_*` browser action starts the backing browser and displays the live Agent Browser tab.

### Install or upgrade

Install the Apple Silicon DMG from the 0.3.19 GitHub Release after tagged CI publishes it, or use **Settings → General → Application lifecycle → Check for updates** from an earlier installation.

### Compatibility, migration, and limitations

The target remains macOS 11 or later on Apple Silicon. Existing YourBuddy data requires no migration. Ego Browser does not bundle Chromium or optional FFmpeg downloads, and browser automation can still encounter login expiry, human-verification challenges, and site-specific controls. The application is not signed or notarized with an Apple Developer identity.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused product integration | passed | source candidate | macOS 15.6.1 arm64, Node.js 22.19.0, pnpm 11.7.0 | 54 Node tests, 6 Rust Overlay tests, 13 offline tests |
| Documentation and lint | passed | source candidate | same local environment | 43 documentation gates and repository lint passed |
| Formal desktop publication | failed before upload | `yourbuddy-v0.3.19` | GitHub Actions macOS arm64 | workflow `36310499165` detected a product snapshot hash mismatch during App assembly |

## Scenario: default Ego Browser source integration

- Status: passed at source level; packaged artifact verification is pending.
- Date and time: `2026-09-27 17:43 +0800 CST`.
- Release and commit: `yourbuddy-v0.3.19`; the commit referenced by the annotated tag.
- Build under test: source release candidate before the annotated tag.
- Environment: macOS 15.6.1 arm64, Node.js 22.19.0, pnpm 11.7.0, Rust toolchain from `$HOME/.cargo/bin`.
- Evidence origin: this release run.
- Data: synthetic test fixtures and committed product snapshots; no user data.
- Model or service: no model provider; the GitHub branch resolver test used the public GitHub API.

### Steps

1. Validate the pinned Ego Browser source record, compatibility metadata, bundle dependency closure, Overlay mounting, and assembled Client responses.
2. Run the complete documentation synchronization, repository lint, Rust Overlay tests, and offline preparation tests.

### Expected

The reviewed Ego Browser snapshot remains resolvable without a registry install, mounts once as a default, yields to an active user-installed bundle, and leaves the release candidate reproducible offline.

### Actual

All 54 focused Node tests, 6 Rust Overlay tests, 13 offline tests, 43 documentation gates, and repository lint passed. The snapshot and compatibility validator accepted `dsh-ego-browser` 0.8.5 against the bundled DSH 0.1.7-rc.2 packages.

### Evidence

- Before: YourBuddy already bundled Better Sidebar but did not include Ego Browser.
- In progress: the snapshot, immutable source record, peer override, offline lock entry, Overlay fallback, duplicate guard, and bilingual documentation were reviewed in the source candidate.
- Result: focused product, Rust, offline, documentation, and lint checks completed successfully.
- Failure and recovery: the initial peer-range validation rejected prerelease DSH resolution; an exact-version reviewed peer-metadata override was recorded, then compatibility and snapshot checks passed.

### Scope limits

These checks do not establish native App startup, packaged WebView interaction, real-site login behavior, updater installation, Apple Developer signing, notarization, or the availability of the public 0.3.19 artifacts. Tagged CI and post-publication checks own those observations.

## Failed publication attempt

The [macOS release workflow](https://github.com/istarwyh/yourbuddy/actions/runs/36310499165) stopped during App assembly before any release asset was published. The committed source record contained a snapshot hash measured while an ignored local `runtime/ego-browser/dist/` build output was present; the clean checkout correctly rejected the hash that included those uncommitted bytes. Version 0.3.20 records the committed snapshot hash and reruns publication without moving the 0.3.19 tag.

## Delivery status

- Product publication status: failed before artifact publication; superseded by 0.3.20.
- Verification archive status: terminal partial record; source and failed-workflow evidence are retained, with no public artifact archive.
- Website synchronization status: product guidance deployed successfully in workflow `36310499295`; the stable download still points to the preceding published release.
- Unverified scope: public 0.3.19 artifacts do not exist; native startup, packaged WebView interaction, real-site login behavior, updater installation, Apple Developer signing, and notarization remain unverified.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] User notes, installation path, compatibility, migration, and limitations are recorded in both languages.
- [x] Source checks identify the environment, candidate, data, services, results, and limits.
- [x] The release entry and immutable archive link are present in both language indexes.
- [x] Documentation pairing, links, lint, focused product tests, Rust Overlay tests, and offline tests passed.
- [ ] Tagged CI published and independently exposed the DMG, updater archive, signature, checksums, and stable updater metadata.
- [ ] The published DMG was independently downloaded and exercised in the packaged WebView.
- [x] No public tag or installer was moved or overwritten.
