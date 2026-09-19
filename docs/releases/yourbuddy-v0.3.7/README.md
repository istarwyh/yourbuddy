# YourBuddy 0.3.7

English | [中文](README.zh.md)

This archive records the 0.3.7 workbench layout change, pull-request CI, formal publication, public-file integrity, updater signature, App identity, provenance patches, relocated runtime, native-startup skip, website deployment, and downloadable verification archive.

- Release identifier: `yourbuddy-v0.3.7`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: complete within the stated verification scope.
- Release source: immutable tag commit `9f5f194adc7dc514277aae0237a56a646fed99e1`.
- Evidence gallery: [annotated assembled desktop shell](screenshots/workbench-primary.png).
- Evidence download: [yourbuddy-v0.3.7-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.7/yourbuddy-v0.3.7-verification.zip), SHA-256 `f61102581cf578754d44c979290626c9e72c3073dc67b84e8294cd91aa8b65ec`.

## User release notes

### What changed

Better Sidebar is now the flexible primary workbench on desktop. The DSH conversation moves to the right, remains resizable, and keeps the existing navigation and details regions.

### Problem solved

The former portal presentation placed Better Sidebar above the conversation rather than making its files, tasks, terminals, previews, and other work surfaces the center of the desktop product. The new layout gives these plugin surfaces the primary area without replacing DSH or forking Better Sidebar's default behavior.

### Where to use it

Open YourBuddy at desktop width. The workbench occupies the center-left area and the conversation remains available on the right. At narrow width, the conversation remains primary and Better Sidebar uses its existing drawer.

### How to try it

1. Open YourBuddy and use the Files, Tasks, terminal, preview, or other Better Sidebar tabs in the primary workbench.
2. Drag the divider between the workbench and conversation.
3. Narrow the window and open Better Sidebar through its drawer control.

### Install or upgrade

Install the [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.7/yourbuddy-0.3.7-macos-arm64.dmg) from the [0.3.7 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.7), or use **Settings → General → Application lifecycle → Check for updates** from an earlier version.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The desktop supports macOS 11 or later on Apple Silicon. Better Sidebar remains at 0.18.1 and Harbor Evolution at 0.9.5; the latest Harbor Evolution candidate was rejected because it requires a newer DSH skill package than the bundled DSH release. The screenshot is from the real assembled Client inside the desktop shell smoke, not a launched DMG WebView. The application is not Apple Developer signed or notarized.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Workbench layout source behavior | passed | tag commit `9f5f194adc` | macOS arm64; Node 22.22.2 | [local validation](evidence/local-candidate-validation.txt) |
| Compatibility patch replay | passed | clean DSH and Better Sidebar bases | local temporary checkouts | [local validation](evidence/local-candidate-validation.txt) |
| Assembled desktop shell | passed | local assembled Client and Host | macOS arm64; controlled local Host | [annotated screenshot](screenshots/workbench-primary.png) and [local validation](evidence/local-candidate-validation.txt) |
| Pull-request CI | passed after retained failures | feature PR source | GitHub-hosted matrix | [workflow record](evidence/release-workflows.txt) |
| Public installer and updater | passed within recorded scope | five public assets | GitHub Release; macOS 15.6.1 arm64 | [artifact record](evidence/public-artifact-stage.json) |
| Public App and relocated runtime | passed within recorded scope | unchanged public App | macOS 15.6.1 arm64 | [runtime record](evidence/public-runtime-stage.json) and [native-startup skip](evidence/public-native-startup.txt) |
| Product website | passed within recorded scope | merge commit `adfed13669` | GitHub Pages and unauthenticated HTTP | [deployment record](evidence/website-deployment.txt) |
| Downloadable verification archive | passed | source commit `5559c3ddc2` | GitHub Release and anonymous download | [archive record](evidence/verification-archive.txt) |

## Scenario: Workbench layout and compatibility replay

- Status: passed for source behavior, clean patch replay, and the assembled desktop shell.
- Date and time: 2026-09-19, Asia/Shanghai, UTC+08:00.
- Release and commit: `yourbuddy-v0.3.7`; tag commit `9f5f194adc7dc514277aae0237a56a646fed99e1`.
- Build under test: source checkout and clean temporary copies of the recorded upstream bases.
- Environment: macOS arm64, Node 22.22.2, pnpm 11.7.0.
- Evidence origin: this release run.
- Data: synthetic component and product fixtures.
- Model or service: no model or external service request.

### Steps

1. Exercised the optional DSH `workbench` slot with desktop resizing and narrow-window fallback.
2. Exercised Better Sidebar's default portal and YourBuddy slot presentations.
3. Applied both provenance patches to clean recorded bases and compared the resulting product files and built Client artifacts.
4. Built the complete DSH workspace and prepared the assembled desktop candidate.

### Expected

YourBuddy uses Better Sidebar as the desktop primary workbench, preserves the conversation and plugin capabilities, and can reproduce both local changes after an upstream refresh. DSH and Better Sidebar retain their default behavior when the slot is not selected.

### Actual

Focused component and product tests passed, the complete DSH build passed, both patches replayed cleanly, and the recorded patch and snapshot hashes matched. The assembled Host loaded all six product Client plugins, rendered the four-track workbench layout, and retained the conversation in the right region. The latest Harbor Evolution candidate was intentionally not materialized because its DSH skill peer requirement is incompatible with the bundled DSH version.

### Evidence

- Before: the layout and provenance problem is recorded in the [technical design](../../tech/202609/workbench-layout-compatibility.md).
- In progress: commands and exact test counts are in the [local candidate record](evidence/local-candidate-validation.txt).
- Result: the assembled interface is retained in the [annotated workbench screenshot](screenshots/workbench-primary.png); the blue and purple evidence outlines are added only by the release smoke to identify the two real layout regions.
- Failure and recovery: the latest-plugin dry run rejected Harbor Evolution 0.9.6 before modifying the product tree, so the release retains the reviewed 0.9.5 snapshot. The first screenshot probe used the unmodified release-smoke overlay and did not select slot presentation; the smoke overlay was aligned with the native product overlay, after which the assembled layout and screenshot passed.

### Scope limits

Source and assembled-shell evidence does not prove the workflow-built DMG, public updater bytes, installed application startup, updater installation, or live website deployment.

## Scenario: Pull-request CI and release workflow

- Status: passed after retaining the preceding CI and tag-workflow failures as negative evidence.
- Date and time: 2026-09-19, Asia/Shanghai, UTC+08:00.
- Release and source: feature [PR #25](https://github.com/istarwyh/yourbuddy/pull/25), merged as `9f5f194adc7dc514277aae0237a56a646fed99e1` and tagged `yourbuddy-v0.3.7`.
- Evidence: [workflow record](evidence/release-workflows.txt).

The first PR run failed before repository tests in two Linux lanes because the Ubuntu archive removed a pinned Bubblewrap revision. The refreshed archive revision and digest passed locally. The next run reached the new layout test and retained a strict lint failure; the test now uses exact instance equality. Final [CI run 35428836132](https://github.com/istarwyh/yourbuddy/actions/runs/35428836132) passed all 19 jobs. The runnerless Cloudflare Preview was cancelled and is not counted as a pass.

The initial tag-triggered release run failed before build because the live release-channel selection had advanced beyond the committed DSH snapshot. The documented same-tag recovery path then consumed the immutable tag and committed locks without refreshing channels; [release run 35430356160](https://github.com/istarwyh/yourbuddy/actions/runs/35430356160) built and published all five formal assets.

## Scenario: Independent public artifact verification

- Status: passed for anonymous availability, complete files, public checksums, stable updater metadata, and updater cryptographic signature.
- Date and time: 2026-09-19 16:17–16:25 UTC+08:00, Asia/Shanghai.
- Release and build: [yourbuddy-v0.3.7](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.7), immutable tag commit `9f5f194adc7dc514277aae0237a56a646fed99e1`, built by [workflow 35430356160](https://github.com/istarwyh/yourbuddy/actions/runs/35430356160).
- Evidence: [public artifact record](evidence/public-artifact-stage.json).

| Public asset | Bytes | Independently observed SHA-256 |
|---|---:|---|
| `latest.json` | 4,108 | `edda6bbb3348cef9f861bcf97a79a8fb81d54a74bfa11b35076630aa2567f7f9` |
| `SHA256SUMS.txt` | 312 | `3c1773bc29904012b3e4b247e86068c9452e68fe4664f1d7c7c39913e8b4fedd` |
| `yourbuddy-0.3.7-macos-arm64.app.tar.gz` | 570,846,283 | `13f4d0b622f34c1a53ba7793874667f601ee604d8a5d50c66e3db369e3e4bf8e` |
| `yourbuddy-0.3.7-macos-arm64.app.tar.gz.sig` | 408 | `160672c7ec7b3835809a691b90120f586a4768a22b97712dd0612f7a4f0fbf0b` |
| `yourbuddy-0.3.7-macos-arm64.dmg` | 568,944,326 | `4f79e33fc91b28cfff019a1dbf032a2c732f2b84efe29e155623c2a20f99438b` |

All five assets were downloaded without GitHub authentication. All three checksum entries passed, every digest matched the GitHub API, and the stable updater manifest was byte-identical to the versioned asset. `minisign-verify` 0.2.5 verified the updater archive's prehashed signature and trusted comment using the public key from the immutable tag.

## Scenario: Public App and relocated runtime

- Status: DMG integrity, App identity, DMG/updater equality, strict ad-hoc signature integrity, provenance metadata, and relocated Python/Harbor CLI and imports passed; native startup and installed-WebView interaction were skipped.
- Date and time: 2026-09-19 16:17–16:25 UTC+08:00, Asia/Shanghai.
- Build under test: unchanged App copied from the anonymously downloaded public DMG.
- Evidence: [public runtime record](evidence/public-runtime-stage.json) and [native-startup skip](evidence/public-native-startup.txt).

`hdiutil verify` passed, and the DMG and updater archive contained byte-identical App trees. The App reports version/build 0.3.7, identifier `io.github.istarwyh.yourbuddy`, and an arm64 executable. `codesign --deep --strict` passed with an ad-hoc signature and no TeamIdentifier; Gatekeeper rejected it because it is not Apple Developer signed or notarized.

The public bundle records the DSH workbench patch SHA-256 `76602de5874467f2976c886283a2085d7213030c60abab8b3d0316b9a428b80c` and Better Sidebar patch SHA-256 `a48f74a495e7f5575f5325c4a93d8c539356376b5e41028d3f76d3fff1ba8d17`. Better Sidebar's materialized tree matches `f6dbd85556e6586f5dc62b754e41d26dcc82bd5330d623be1db30ebea9a541bf`, includes slot presentation, and retains portal as its default. A relocated runtime copy with a deliberately nonexistent recorded build prefix passed `harbor --version`, `harbor-dsh --help`, and direct imports, reporting Python 3.12.14, Harbor 0.21.0, and adapter 0.9.5.

A user-owned YourBuddy instance and managed Host were already running, so the downloaded App was not launched. Native startup, Finder installation, update from an older version, packaged-WebView interaction, OAuth, and real model traffic remain unverified. The release screenshot is from the real assembled desktop shell smoke, not an installed-App capture.

## Scenario: Public product website

- Status: passed for deployment, bilingual static rendering, 0.3.7 copy, screenshot, and public release/download link availability; visual browser rendering remains unverified.
- Date and time: 2026-09-19 16:45–16:48 UTC+08:00, Asia/Shanghai.
- Release and commit: `yourbuddy-v0.3.7`; website source merge commit [`adfed136696c7c9d89a30f8423cd7f3e390ea01e`](https://github.com/istarwyh/yourbuddy/commit/adfed136696c7c9d89a30f8423cd7f3e390ea01e) from [PR #26](https://github.com/istarwyh/yourbuddy/pull/26).
- Evidence: [local website record](evidence/website-local-validation.txt), [deployment record](evidence/website-deployment.txt), and [workflow 35432781851](https://github.com/istarwyh/yourbuddy/actions/runs/35432781851).

The workflow build and deploy jobs passed, and GitHub Pages deployment `6539029843` reported success for the exact source commit. Chinese and English home, download, and release pages all returned HTTP 200 and contained the 0.3.7 content. Both download pages linked the exact DMG, checksum file, GitHub Release, and language-matched verification record. The public raw verification records and workbench screenshot also returned HTTP 200. The complete DMG was not downloaded again because its earlier anonymous full-file download and hash check already passed.

This check establishes deployed static content and link availability. It does not establish pixel-level browser rendering, desktop installation, native startup, packaged-WebView behavior, updater installation, OAuth, or real model traffic.

## Scenario: Downloadable verification archive

- Status: passed for public availability, integrity, byte equality, extraction, and expected evidence contents.
- Date and time: 2026-09-19 16:50–16:52 UTC+08:00, Asia/Shanghai.
- Release and source: [yourbuddy-v0.3.7](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.7); evidence directory from commit [`5559c3ddc20b9b398d620cd837dccea694ea0b05`](https://github.com/istarwyh/yourbuddy/commit/5559c3ddc20b9b398d620cd837dccea694ea0b05).
- Evidence: [archive record](evidence/verification-archive.txt).

The 70,800-byte [verification ZIP](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.7/yourbuddy-v0.3.7-verification.zip) has SHA-256 `f61102581cf578754d44c979290626c9e72c3073dc67b84e8294cd91aa8b65ec`. Its anonymous public download was byte-identical to the uploaded source, matched the GitHub API digest, passed extraction, and contained the bilingual record, public artifact/runtime evidence, website deployment record, and workbench screenshot. It was added as a sixth asset; no installer or updater byte was replaced.

## Delivery status

- Product publication status: published; all five formal assets are publicly downloadable and independently verified within the recorded scope.
- Verification archive status: complete; the public ZIP was anonymously downloaded, compared, hashed, and extracted successfully.
- Website synchronization status: deployed and verified for bilingual static content and public links at merge commit `adfed136696c7c9d89a30f8423cd7f3e390ea01e` by workflow `35432781851`.
- Unverified scope: native startup, installed DMG WebView interaction, updater installation from an older version, Apple Developer signing and notarization, visual browser rendering, OAuth, and real model traffic.
