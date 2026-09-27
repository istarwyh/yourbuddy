# YourBuddy 0.3.20

English | [中文](README.zh.md)

This archive records the default Ego Browser integration and the corrected clean-checkout product snapshot hash.

- Release identifier: `yourbuddy-v0.3.20`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; source verification is complete and tagged CI owns artifact publication.
- Evidence commit: the immutable commit tagged `yourbuddy-v0.3.20`.
- Evidence gallery: not captured; packaged WebView interaction remains unverified.
- Evidence download: immutable source at `yourbuddy-v0.3.20`; public installers are pending tagged CI.

## User release notes

### What changed

YourBuddy now includes the reviewed `dsh-ego-browser` 0.8.5 plugin as an offline default. This corrected release records the hash of the committed plugin snapshot after the 0.3.19 clean-checkout build rejected a hash contaminated by ignored local build output.

### Problem solved

A fresh YourBuddy installation can expose browser tools and the Agent Browser surface without a separate GitHub or npm installation. The corrected source record lets the same committed bytes pass local and hosted release assembly.

### Where to use it

Ask the Agent to open or operate a website. Ego Browser appears through Better Sidebar and uses a locally installed compatible Chrome, Chromium, Brave, or Edge browser.

### How to try it

Start a new Session and ask the Agent to open a website. The first `ego_*` browser action starts the backing browser and displays the live Agent Browser tab.

### Install or upgrade

Install the Apple Silicon DMG from the 0.3.20 GitHub Release after tagged CI publishes it, or use **Settings → General → Application lifecycle → Check for updates** from an earlier installation.

### Compatibility, migration, and limitations

The target remains macOS 11 or later on Apple Silicon. Existing YourBuddy data requires no migration. Ego Browser does not bundle Chromium or optional FFmpeg downloads, and browser automation can still encounter login expiry, human-verification challenges, and site-specific controls. The application is not signed or notarized with an Apple Developer identity.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused product integration | passed | source candidate | macOS 15.6.1 arm64, Node.js 22.19.0, pnpm 11.7.0 | 54 Node tests, 6 Rust Overlay tests, 13 offline tests |
| Clean snapshot verification | passed | committed source candidate | local clean product tree | `dsh-ego-browser` source record matches `dc8203c572c5a2736653f352b8d971301dfdc8c51e0941a37e104ff5cfb3e928` |
| Documentation and lint | passed | source candidate | same local environment | 43 documentation gates and repository lint passed |
| Formal desktop publication | pending | `yourbuddy-v0.3.20` | GitHub Actions macOS arm64 | tagged CI owns build, packaged-runtime smoke, checksums, updater metadata, and upload |

## Scenario: corrected Ego Browser source integration

- Status: passed at source level; packaged artifact verification is pending.
- Date and time: `2026-09-27 17:58 +0800 CST`.
- Release and commit: `yourbuddy-v0.3.20`; the commit referenced by the annotated tag.
- Build under test: committed source release candidate before the annotated tag.
- Environment: macOS 15.6.1 arm64, Node.js 22.19.0, pnpm 11.7.0, Rust toolchain from `$HOME/.cargo/bin`.
- Evidence origin: this release run and failed 0.3.19 workflow `36310499165`.
- Data: synthetic test fixtures and committed product snapshots; no user data.
- Model or service: no model provider; the GitHub branch resolver test used the public GitHub API.

### Steps

1. Remove the ignored local Ego Browser build output, record the hash of the committed snapshot, and validate the source record against a clean product tree.
2. Validate compatibility metadata, bundle dependency closure, Overlay mounting, assembled Client responses, documentation, Rust Overlay behavior, and offline preparation.

### Expected

The reviewed Ego Browser snapshot remains resolvable without a registry install, mounts once as a default, yields to an active user-installed bundle, and has the same hash in local and hosted clean checkouts.

### Actual

The clean committed snapshot matches the corrected source record. The integration passed 54 focused Node tests, 6 Rust Overlay tests, 13 offline tests, 43 documentation gates, and repository lint before the immutable correction release was prepared.

### Evidence

- Before: 0.3.19 source checks passed in a worktree containing ignored `runtime/ego-browser/dist/` bytes, but hosted clean-checkout assembly rejected the recorded hash before publishing assets.
- In progress: the ignored build output was removed and the committed tree hash was recomputed and validated.
- Result: clean snapshot verification and the focused source checks passed; 0.3.20 uses a new immutable tag.
- Failure and recovery: workflow `36310499165` published no assets, and the 0.3.19 tag was retained rather than moved.

### Scope limits

These checks do not establish native App startup, packaged WebView interaction, real-site login behavior, updater installation, Apple Developer signing, notarization, or the availability of public 0.3.20 artifacts. Tagged CI and post-publication checks own those observations.

## Delivery status

- Product publication status: pending the annotated tag and tagged GitHub Actions workflow.
- Verification archive status: source and clean-checkout correction evidence are complete within the stated limits.
- Website synchronization status: product guidance deployed successfully in workflow `36310499295`; the website uses the stable latest-Release link.
- Unverified scope: native startup, packaged WebView interaction, real-site login behavior, updater installation, public artifact download, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] User notes, installation path, compatibility, migration, and limitations are recorded in both languages.
- [x] The failed immutable 0.3.19 tag and recovery through a new version are recorded.
- [x] The committed snapshot hash passes source-record verification without ignored local output.
- [x] Documentation, lint, focused product tests, Rust Overlay tests, and offline tests passed.
- [ ] Tagged CI published and independently exposed the DMG, updater archive, signature, checksums, and stable updater metadata.
- [ ] The published DMG was independently downloaded and exercised in the packaged WebView.
- [x] No public tag or installer was moved or overwritten.
