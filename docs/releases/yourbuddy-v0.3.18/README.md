# YourBuddy 0.3.18

English | [中文](README.zh.md)

This archive records the shorter YourBuddy desktop publication path in 0.3.18.

- Release identifier: `yourbuddy-v0.3.18`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; public artifact results will be recorded after publication.
- Tagged product commit: the immutable commit referenced by `yourbuddy-v0.3.18`.
- Evidence gallery: not applicable to this release-process change.
- Evidence download: immutable tagged source after publication.

## User release notes

### What changed

The local release command no longer repeats tests, product preparation, documentation checks, or the website build. Tagged CI no longer resolves upstream channels or reruns source-level Host, shell, Oil Publisher, Node, and Rust tests.

### Problem solved

A reviewed release no longer waits for the same checks a second time before or after its tag is pushed.

### Where to use it

Contributors use the faster path through `pnpm release:yourbuddy -- 0.3.18`. Users receive the same macOS Apple Silicon DMG and signed updater format.

### How to try it

Publish the committed release candidate, wait for the tag workflow to build the App and DMG, then download the GitHub Release asset.

### Install or upgrade

Install the Apple Silicon DMG from the 0.3.18 GitHub Release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier installation after publication.

### Compatibility, migration, and limitations

The target remains macOS 11 or later on Apple Silicon. Existing YourBuddy data requires no migration. Apple Developer signing and notarization remain unavailable. Source-level release checks now depend on the contributor's pre-push run and are not repeated by tagged CI.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused publication-script tests | passed | source candidate | macOS Apple Silicon, Node.js 22.19.0 | 3 tests passed |
| Documentation quick checks | passed | source candidate | macOS Apple Silicon, Node.js 22.19.0 | 21 gates passed |
| Formal desktop publication | not verified | `yourbuddy-v0.3.18` candidate | GitHub Actions macOS arm64 | pending tag workflow |

## Scenario: shortened publication path

- Status: source checks passed; formal publication pending.
- Date and time: `2026-09-27 14:39 +0800 CST`.
- Release and commit: `yourbuddy-v0.3.18`; tagged commit is the commit referenced by the immutable tag.
- Build under test: source candidate before formal publication.
- Environment: macOS Apple Silicon, Node.js 22.19.0, pnpm 11.7.0.
- Evidence origin: this release preparation.
- Data: synthetic release metadata; no user data.
- Model or service: GitHub Actions and GitHub Releases; no model provider.

### Steps

1. Update every desktop version source and create the bilingual release archive.
2. Publish the annotated tag with the lightweight release command.
3. Let tagged CI build, smoke-test the packaged runtime, checksum, and upload the artifacts.

### Expected

The release command reaches the tag push without repeating local tests, and tagged CI reaches artifact publication without source-level validation suites.

### Actual

The focused publication-script tests and quick documentation gates passed. Formal publication is pending the tag workflow.

### Evidence

- Before: the previous command and workflow repeated local and source-level checks.
- In progress: the release command and workflow now retain only identity, build, packaged-runtime, checksum, manifest, and upload work.
- Result: pending the public 0.3.18 GitHub Release.
- Failure and recovery: not applicable before publication.

### Scope limits

This source evidence does not establish workflow duration, public artifact availability, native App startup, updater installation, Apple Developer signing, or notarization.

## Delivery status

- Product publication status: pending `yourbuddy-v0.3.18` tag workflow.
- Verification archive status: source candidate included in the tag; public download not yet created.
- Website synchronization status: pending; the existing website continues to advertise the last verified release.
- Unverified scope: workflow duration, public files, native startup, packaged WebView interaction, updater installation, signing, and notarization.

## Delivery checklist

- [x] Release identifier and desktop version sources name 0.3.18.
- [x] User notes and known limitations are recorded in both languages.
- [x] Focused publication-script and quick documentation checks passed before tagging.
- [ ] Public files and stable updater metadata are available.
- [ ] Public artifact checks and observed workflow duration are recorded.
- [ ] The product website advertises only verified files.
- [x] Published tags and installers will not be moved or overwritten.
