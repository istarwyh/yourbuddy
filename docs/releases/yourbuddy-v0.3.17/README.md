# YourBuddy 0.3.17

English | [中文](README.zh.md)

This archive records the desktop-startup compatibility fix and refreshed personal-workbench homepage in YourBuddy 0.3.17.

- Release identifier: `yourbuddy-v0.3.17`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: complete within stated limits; source, CI, public files, updater signature, App identity, product sources, relocated runtime, website, and downloadable evidence are recorded; native startup remains unverified.
- Tagged product commit: `ae8a3d442ada5c8524a6a92ab024b5bcb93877ea`.
- Evidence gallery: not applicable to this startup and website release.
- Evidence download: [immutable tagged source](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.17/docs/releases/yourbuddy-v0.3.17) and [downloadable verification archive](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.17/yourbuddy-v0.3.17-verification.zip).

## User release notes

### What changed

Desktop startup now accepts the authentication response emitted by the current DSH Web runtime without requiring one exact redirect status or `Location` spelling. Duplicate desktop-side URL, cookie-attribute, and post-write checks were removed. The product homepage now presents a task-shaped personal AI workbench with a real workbench image and a simpler proof section.

### Problem solved

YourBuddy no longer stops at startup with an unexpected `303 See Other` error when DSH Web correctly returns a document-relative redirect. The homepage also shows the product itself instead of an abstract example.

### Where to use it

Launch YourBuddy normally on macOS Apple Silicon. The refreshed homepage is available on the bilingual YourBuddy product site after its post-publication deployment.

### How to try it

Start YourBuddy and wait for the personal workbench to open. On the product site, review the new workbench proof section and continue to the download page.

### Install or upgrade

Install the [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.17/yourbuddy-0.3.17-macos-arm64.dmg) from the [0.3.17 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.17), or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data requires no migration.

### Compatibility, migration, and limitations

The desktop target remains macOS 11 or later on Apple Silicon. The startup handoff still parses the runtime URL and session cookie and reports operational failures, but trusts the first-party DSH runtime rather than enforcing duplicate security policy. Native startup of the downloaded App was not exercised because a user-owned YourBuddy instance was active. Update installation from an older version, Apple Developer signing, and notarization remain unverified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused startup checks | passed | source candidate before version preparation | macOS 15.6.1 Apple Silicon, Rust test harness | 13 supervisor and 3 WebView tests passed |
| Product documentation checks | passed within stated limits | source candidate before version preparation | Node.js 22.22.3 | 21 quick documentation and 43 documentation checks passed; website structure passed 71 tests |
| Native packaged startup | not verified | published 0.3.17 App | macOS Apple Silicon | a user-owned YourBuddy process was active and was not terminated |
| Public desktop artifacts and updater | passed | public 0.3.17 assets | GitHub Release and stable updater channel | [artifact verification](evidence/public-artifact-verification.txt) |
| Product website | passed | commit `b239ed5451d0f0df7edaf2ccf7b67bb8eec8552b` | GitHub Pages | [website verification](evidence/website-verification.txt) |

## Scenario: desktop authentication handoff

- Status: focused source and public-artifact checks passed; native startup of the formal artifact remains unverified.
- Date and time: `2026-09-26 20:30 +0800 CST`.
- Release and commit: `yourbuddy-v0.3.17`; tagged commit `ae8a3d442ada5c8524a6a92ab024b5bcb93877ea`.
- Build under test: source candidate and formally published 0.3.17 artifacts.
- Environment: macOS 15.6.1 Apple Silicon, Node.js 22.22.3, pnpm 11.7.0, and the Rust test harness.
- Evidence origin: this release run and the immediately preceding diagnosis on the same candidate.
- Data: synthetic HTTP responses and local runtime observations without retained credentials.
- Model or service: local first-party DSH Web runtime; no model provider required.

### Steps

1. Reproduce the DSH Web token exchange and observe its `303 See Other` response with `Location: ./` and a session cookie.
2. Exercise the supervisor with the current redirect form and verify that it obtains the cookie without enforcing an exact redirect status or destination.
3. Exercise WebView navigation and cookie setup after removing duplicate allowlist, attribute, and post-write checks.
4. Publish the immutable candidate and independently download and inspect every public asset; leave native startup unverified while a user-owned YourBuddy instance is active.

### Expected

The desktop accepts the first-party authentication response, obtains the session cookie, opens the workbench, and still reports parsing or runtime-operation failures.

### Actual

The installed 0.3.16 runtime returned a valid cookie and authenticated root/API responses but failed the desktop's exact `Location: /` comparison because DSH Web now returns `Location: ./`. The 0.3.17 source and CI tests accept the current response and pass after the redundant policy checks are removed. All five public assets, updater metadata and signature, App identity, DMG/updater file trees, product packages, and relocated runtime passed independent checks. Native startup of the formal 0.3.17 artifact remains unverified.

### Evidence

- Before: the 0.3.16 startup error and local exchange isolated the mismatch to the desktop supervisor's exact redirect assertion.
- In progress: `cargo test runtime::supervisor::tests` passed 13 tests and `cargo test chrome::tests` passed 3 tests.
- Result: focused Rust suites, complete release preparation, CI, public checksums, updater signature, App identity, product packages, and relocated runtime passed. The formal App was not launched because a user-owned instance was active.
- Failure and recovery: the website build reached its structure suite but the local machine lacked Hugo Extended 0.165.0; the release run will use a temporary matching Hugo binary rather than changing the system installation.

### Scope limits

Source, CI, and static artifact checks do not prove native startup of the published 0.3.17 App, packaged-WebView behavior, updater installation, Apple Developer signing, or notarization.

## Delivery status

- Product publication status: published by the [successful immutable-tag workflow](https://github.com/istarwyh/yourbuddy/actions/runs/36243287834); all five versioned files are publicly downloadable and independently verified.
- Verification archive status: complete within stated limits; the downloadable archive was published and independently extracted.
- Website synchronization status: deployed and checked live through the [successful website workflow](https://github.com/istarwyh/yourbuddy/actions/runs/36245576082); Chinese and English pages advertise only verified 0.3.17 files.
- Unverified scope: native startup of the published App, packaged-WebView interaction, update installation, signing, and notarization.

## Delivery checklist

- [x] The release identifier and desktop version sources match 0.3.17.
- [x] User notes describe the change, problem, location, shortest journey, migration, and limitations.
- [x] Focused startup and documentation checks pass.
- [x] The complete desktop release suite and preparation pass on the committed candidate.
- [ ] Native startup of the published App completes the authentication handoff and opens the workbench.
- [x] Public files, checksums, updater metadata, signature, App identity, source records, and relocated runtime are independently verified.
- [x] The evidence archive is published and independently extracted.
- [x] The bilingual product website is synchronized and checked live without promoting unverified files.
- [x] Public tags and installers will not be moved or overwritten.
