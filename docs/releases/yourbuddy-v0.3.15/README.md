# YourBuddy 0.3.15

English | [中文](README.zh.md)

This archive records the built-in creator publishing workflows in YourBuddy 0.3.15.

- Release identifier: `yourbuddy-v0.3.15`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; public artifacts, website synchronization, and independent download verification are pending.
- Evidence commit: `31d933a44820b2261c09780ac624002df21b27e3`; tagged product commit pending.
- Evidence gallery: not applicable; this release adds model tools and bundled Skills without changing the GUI.
- Evidence download: immutable tag source archive after publication; a dedicated verification archive is pending.

## User release notes

### What changed

Oil Creator includes video publishing, video-to-article, and WeChat Official Account publisher Skills. The `oil_prepare_publish` tool prepares drafts for enabled video platforms and can upload an existing article to the WeChat Official Account draft box.

### Problem solved

The Content Creation preset can execute the supported publishing workflow without requiring separate Skill installation or manual repository setup. Ego Browser discovery uses the resolved executable instead of relying only on the desktop process `PATH`. The product snapshot retains the video publisher's generated runtime modules and uses portable path and mode hashing. The 0.3.13 and 0.3.14 tags produced no public artifacts; this version is their corrected successor.

### Where to use it

Select the **内容创作** Agent Preset and ask YourBuddy to prepare an episode for Xiaohongshu, Douyin, Bilibili, WeChat Channels, or the WeChat Official Account draft box.

### How to try it

Configure the creator library and enabled platforms, install and sign in to Ego Lite for video platforms, or configure the Official Account AppID, AppSecret, and API IP allowlist. Open an episode with a finished video or article and ask YourBuddy to prepare its publishing drafts.

### Install or upgrade

After publication, install the Apple Silicon DMG from the 0.3.15 GitHub Release or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation.

### Compatibility, migration, and limitations

The release retains existing content-library files and creator overlay data without migration. Video publishing requires Ego Lite and logged-in creator accounts. Official Account draft creation requires local API credentials and an IP allowlist. The tool never performs final publication or group-send. Source tests and local dry runs do not prove real-account platform behavior, native packaged startup, packaged-WebView interaction, or updater installation.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Oil Creator and bundled publishers | passed | isolated 0.3.15 release worktree | macOS 15.6.1 arm64, Node.js 22.19 | [source validation](evidence/source-validation.txt) |
| Complete release preparation and Host smoke | passed | committed release inputs | macOS Apple Silicon | 68 peer links and seven assembled Client plugins passed |
| Public desktop artifacts and updater | not verified | unpublished 0.3.15 candidate | GitHub Release and stable updater channel | pending publication |
| Product website | not verified | unpublished 0.3.15 candidate | English and Chinese routes | pending publication and deployment |

## Scenario: Oil Creator and bundled publishers

- Status: `passed`.
- Date and time: 2026-09-23 UTC+08:00 CST.
- Release and commit: `yourbuddy-v0.3.15`; implementation evidence commit `31d933a44820b2261c09780ac624002df21b27e3`; tagged product commit pending.
- Build under test: isolated release worktree containing the committed Oil Creator snapshot and bundled Skills.
- Environment: macOS 15.6.1 arm64, Node.js 22.19.
- Evidence origin: this release run.
- Data: synthetic content packages and the bundled example Markdown article.
- Model or service: no model or external publishing service was invoked.

### Steps

1. Run the Oil Creator typecheck, 232-test suite, and production Host build.
2. Run the 132 bundled video-publisher tests and a WeChat Official Account `publish-file --dry-run` conversion.
3. Assemble the product bundle and verify that all three Skills and `oil_prepare_publish` survive installation.
4. Run the desktop product and release-preparation regression suites with the required built CLI artifact.

### Expected

The product snapshot retains valid provenance, registers every bundled Skill, exposes the draft-only tool, preserves the final-publication checkpoint, and assembles without external Skill installation.

### Actual

Oil Creator passed 232 tests and built successfully. The video publisher passed 132 tests, the WeChat publisher converted the bundled article in dry-run mode, the product bundle passed eight tests, release-preparation tests passed 13 tests, and the desktop product suite passed all 69 tests after supplying its documented built-CLI prerequisite. Complete release preparation then rebuilt Harness, prepared the frozen offline install and relocated runtime, verified 68 runtime peer links and seven assembled Client plugins, and passed the Host smoke.

### Evidence

- Before: separate publisher installation was required; no private creator content was captured.
- In progress: [source validation log](evidence/source-validation.txt).
- Result: source, publisher, bundle, and desktop regression checks passed.
- Failure and recovery: the first desktop test run lacked `apps/cli/lib/bin.js`; rerunning after supplying the built CLI artifact passed the affected Host CA test.

### Scope limits

This scenario proves source, bundled-resource, CLI dry-run, and assembled-package behavior. It does not prove a real Ego Browser session, real platform accounts, Official Account API acceptance, native App startup, final publication, or business-content quality.

## Delivery status

- Product publication status: pending tag and release workflow.
- Verification archive status: partial; source evidence is recorded, while public artifact and downloadable archive evidence are pending.
- Website synchronization status: pending product publication.
- Unverified scope: real creator accounts, final publication, native packaged startup, packaged-WebView interaction, update from an older installation, Apple notarization, and public artifact integrity remain unverified.

## Delivery checklist

- [x] Release identifier and desktop version sources match 0.3.15.
- [x] User notes describe the change, problem, location, and shortest journey.
- [x] Compatibility, migration, prerequisites, and source-test limits are explicit.
- [x] Source and bundled publisher evidence is recorded without private content.
- [x] Complete release preparation passes; formal publication remains pending.
- [ ] Public files, checksums, updater metadata, and signature are independently verified.
- [ ] The evidence archive is published and independently extracted.
- [ ] The bilingual product website is synchronized and checked live.
- [x] Public tags and released artifacts will not be moved or overwritten.
