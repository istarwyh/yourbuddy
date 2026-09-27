# YourBuddy 0.3.20

English | [中文](README.zh.md)

This archive records the default Ego Browser integration and the corrected clean-checkout product snapshot hash.

- Release identifier: `yourbuddy-v0.3.20`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: published release with post-publication observations recorded on `master`.
- Evidence commit: the immutable commit tagged `yourbuddy-v0.3.20`.
- Evidence gallery: not captured; packaged WebView interaction remains unverified.
- Evidence download: [public 0.3.20 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.20) with five assets.

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
| Formal desktop publication | passed | `yourbuddy-v0.3.20` | GitHub Actions macOS arm64 | workflow `36311318965` built, smoke-tested, checksummed, signed, and uploaded five assets |

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

The clean committed snapshot matches the corrected source record. The integration passed 54 focused Node tests, 6 Rust Overlay tests, 13 offline tests, 43 documentation gates, and repository lint. Workflow `36311318965` then built the App and DMG, passed the relocated-runtime smoke and checksum verification, and published five assets. A later first-use report established that this smoke did not invoke the browser host: the macOS path requested Linux Xvfb, and the clean snapshot omitted its ignored SDK runtime.

### Evidence

- Before: 0.3.19 source checks passed in a worktree containing ignored `runtime/ego-browser/dist/` bytes, but hosted clean-checkout assembly rejected the recorded hash before publishing assets.
- In progress: the ignored build output was removed and the committed tree hash was recomputed and validated.
- Result: [workflow `36311318965`](https://github.com/istarwyh/yourbuddy/actions/runs/36311318965) published `latest.json`, `SHA256SUMS.txt`, the updater archive and signature, and the Apple Silicon DMG; the stable updater manifest reports 0.3.20.
- Failure and recovery: workflow `36310499165` published no assets, and the 0.3.19 tag was retained rather than moved; the new 0.3.20 workflow completed the release.

### Scope limits

The workflow establishes the relocated Host startup and public artifact availability, but not Ego Browser startup. The released Agent Browser is unusable on macOS and is superseded by 0.3.21. Interactive native App startup, packaged WebView interaction, real-site login behavior, updater installation, Apple Developer signing, and notarization were not established; the large DMG was not independently downloaded after publication.

## Delivery status

- Product publication status: published as `yourbuddy-v0.3.20` with five public assets and stable updater metadata; its broken macOS Agent Browser is superseded by 0.3.21.
- Verification archive status: immutable source is included in the tag; post-publication observations are recorded on `master`.
- Website synchronization status: product guidance deployed successfully in workflow `36310499295`; Chinese and English plugin pages and the stable latest-Release link returned HTTP 200.
- Unverified scope: independent full DMG download, interactive native startup, packaged WebView interaction, real-site login behavior, updater installation, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] User notes, installation path, compatibility, migration, and limitations are recorded in both languages.
- [x] The failed immutable 0.3.19 tag and recovery through a new version are recorded.
- [x] The committed snapshot hash passes source-record verification without ignored local output.
- [x] Documentation, lint, focused product tests, Rust Overlay tests, and offline tests passed.
- [x] Tagged CI published and independently exposed the DMG, updater archive, signature, checksums, and stable updater metadata.
- [ ] The published DMG was not independently downloaded or exercised in the packaged WebView.
- [x] No public tag or installer was moved or overwritten.
