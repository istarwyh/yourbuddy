# YourBuddy 0.3.17

English | [中文](README.zh.md)

This archive records the desktop-startup compatibility fix and refreshed personal-workbench homepage in YourBuddy 0.3.17.

- Release identifier: `yourbuddy-v0.3.17`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication candidate; native packaged startup, public artifacts, updater, website, and downloadable evidence remain pending.
- Candidate source: the tagged product commit is pending.
- Evidence gallery: not applicable before publication.
- Evidence download: the immutable tagged source and downloadable verification archive are pending publication.

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

The Apple Silicon DMG and in-application updater path remain pending until the GitHub Release is published and independently verified. Existing YourBuddy data requires no migration.

### Compatibility, migration, and limitations

The desktop target remains macOS 11 or later on Apple Silicon. The startup handoff still parses the runtime URL and session cookie and reports operational failures, but trusts the first-party DSH runtime rather than enforcing duplicate security policy. Update installation from an older version, Apple Developer signing, and notarization remain unverified before public-artifact checks.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Focused startup checks | passed | source candidate before version preparation | macOS 15.6.1 Apple Silicon, Rust test harness | 13 supervisor and 3 WebView tests passed |
| Product documentation checks | passed within stated limits | source candidate before version preparation | Node.js 22.22.3 | 21 quick documentation and 43 documentation checks passed; website structure passed 71 tests |
| Native packaged startup | pending | published DMG | macOS Apple Silicon | pending |
| Public desktop artifacts and updater | pending | GitHub Release assets | anonymous public downloads | pending |
| Product website | pending | post-publication website commit | GitHub Pages | pending |

## Scenario: desktop authentication handoff

- Status: focused source checks passed; installed candidate and public-artifact checks remain pending.
- Date and time: `2026-09-26 20:30 +0800 CST`.
- Release and commit: `yourbuddy-v0.3.17`; tagged commit pending.
- Build under test: source candidate before publication.
- Environment: macOS 15.6.1 Apple Silicon, Node.js 22.22.3, pnpm 11.7.0, and the Rust test harness.
- Evidence origin: this release run and the immediately preceding diagnosis on the same candidate.
- Data: synthetic HTTP responses and local runtime observations without retained credentials.
- Model or service: local first-party DSH Web runtime; no model provider required.

### Steps

1. Reproduce the DSH Web token exchange and observe its `303 See Other` response with `Location: ./` and a session cookie.
2. Exercise the supervisor with the current redirect form and verify that it obtains the cookie without enforcing an exact redirect status or destination.
3. Exercise WebView navigation and cookie setup after removing duplicate allowlist, attribute, and post-write checks.
4. Publish the immutable candidate, then install and start the downloaded App before promoting the public startup claim.

### Expected

The desktop accepts the first-party authentication response, obtains the session cookie, opens the workbench, and still reports parsing or runtime-operation failures.

### Actual

The installed 0.3.16 runtime returned a valid cookie and authenticated root/API responses but failed the desktop's exact `Location: /` comparison because DSH Web now returns `Location: ./`. The 0.3.17 source tests accept the current response and pass after the redundant policy checks are removed. Native startup of the formal 0.3.17 artifact remains pending.

### Evidence

- Before: the 0.3.16 startup error and local exchange isolated the mismatch to the desktop supervisor's exact redirect assertion.
- In progress: `cargo test runtime::supervisor::tests` passed 13 tests and `cargo test chrome::tests` passed 3 tests.
- Result: the focused Rust suites and documentation checks passed; formal artifact checks remain pending.
- Failure and recovery: the website build reached its structure suite but the local machine lacked Hugo Extended 0.165.0; the release run will use a temporary matching Hugo binary rather than changing the system installation.

### Scope limits

Source tests and local diagnosis do not prove native startup of the published 0.3.17 App, packaged-WebView behavior, updater installation, signing, or notarization.

## Delivery status

- Product publication status: pending.
- Verification archive status: draft; source diagnosis and focused checks are recorded, while public evidence is pending.
- Website synchronization status: pending; the verified 0.3.16 download remains public until 0.3.17 artifacts pass independent checks.
- Unverified scope: native startup of the published App, packaged-WebView interaction, update installation, signing, and notarization.

## Delivery checklist

- [x] The release identifier and desktop version sources match 0.3.17.
- [x] User notes describe the change, problem, location, shortest journey, migration, and limitations.
- [x] Focused startup and documentation checks pass.
- [ ] The complete desktop release suite and preparation pass on the committed candidate.
- [ ] Native startup of the published App completes the authentication handoff and opens the workbench.
- [ ] Public files, checksums, updater metadata, signature, App identity, source records, and relocated runtime are independently verified.
- [ ] The evidence archive is published and independently extracted.
- [ ] The bilingual product website is synchronized and checked live without promoting unverified files.
- [x] Public tags and installers will not be moved or overwritten.
