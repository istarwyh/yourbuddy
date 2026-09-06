# YourBuddy 0.3.2

English | [中文](README.zh.md)

- Release identifier: `yourbuddy-v0.3.2`
- Product channel: YourBuddy desktop
- Archive state: original archive complete; a confirmed installed-app startup defect discovered after publication is recorded below but is not present in the immutable 0.3.2 evidence ZIP
- Validated source commit: [`b1e9d36fca62e064526689a412727f6c5dcbeb06`](https://github.com/istarwyh/yourbuddy/commit/b1e9d36fca62e064526689a412727f6c5dcbeb06)
- Evidence gallery: [source Web Help screenshots](screenshots/)
- Evidence download: [yourbuddy-v0.3.2-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/yourbuddy-v0.3.2-verification.zip), sourced from commit `62863db240023dcebf2097e7c70d5874a2b5b3b3`

> Post-publication finding, 2026-09-06 UTC+08:00: the installed public 0.3.2 macOS application reaches authenticated native readiness but its WebView displays `dsh web authentication required`. The source smoke used a same-site loopback shell while the packaged Tauri shell was cross-site with the Host, so the original source result did not validate the installed startup journey. Version 0.3.2 remains downloadable but contains this defect; the fix belongs to a later release and the public tag and installer have not been changed.

## User release notes

### What changed

YourBuddy 0.3.2 adds a Help menu inside the application, expands the bilingual product guides, hardens authenticated startup of the private Node Host, improves subprocess cleanup, and refreshes bundled Context Doctor from `0.7.0` to compatible version `0.7.2`.

### Problem solved

Users can now reach the correct getting-started, plugin, extension-development, troubleshooting, settings, and feedback destinations without leaving the current workbench session. If the system browser cannot be opened, the address remains visible and copyable. The desktop completes the Host token exchange before showing the workbench and keeps credentials out of the stored root URL and logs, but the later installed-app test found that macOS WebKit did not send that cookie from the packaged cross-site shell; 0.3.2 therefore does not reliably avoid the unauthorized initial view.

### Where to use it

Open **Help** at the bottom of the YourBuddy sidebar. The settings usage guide is under **Settings → General**. Startup authentication and Host lifecycle changes apply automatically whenever YourBuddy starts or restarts its private Host.

### How to try it

Open **Help**, select a guide, and confirm that it opens in the system browser while the current draft remains in the composer. To inspect the fallback, attempt the same action when the system browser is unavailable and copy the displayed address.

### Install or upgrade

Install the Apple Silicon DMG from the public 0.3.2 release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation after the updater channel publishes 0.3.2.

### Compatibility, migration, and limitations

The desktop supports Apple Silicon on macOS 11 or later. Existing YourBuddy data remains in place and requires no migration. The application is ad-hoc signed but is not signed or notarized with an Apple Developer identity, so first launch may require the documented macOS override. Windows, macOS Intel, Linux, real model-provider calls, real enterprise proxy/CA chains, and installed-DMG interactive Help behavior are not validated by the pre-publication source evidence below.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Version alignment and compatible product refresh | passed | source release candidate `b1e9d36f...` | macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0 | [Local record](evidence/local-validation.txt) |
| In-app Help journeys in English and Chinese | passed | assembled source Web scaffold with shipped product Client | macOS 15.6.1 arm64, Chromium, controlled native-link bridge | [English fallback](screenshots/help-en.png), [Chinese fallback](screenshots/help-zh.png) |
| Authenticated Host startup and lifecycle | source fixtures passed; installed app failed after publication | source Rust target and public 0.3.2 macOS app | macOS 15.6.1 arm64, local loopback fixtures, then real installed WebView | [Local record](evidence/local-validation.txt) and post-publication scenario below |
| Desktop release helpers and Personal Workbench | passed after dependency-layout recovery | source checkout | macOS 15.6.1 arm64, synthetic fixtures | [Local record](evidence/local-validation.txt) |
| Documentation and product website build | passed | source checkout | local Hugo Extended 0.165.0 | [Local record](evidence/local-validation.txt) |
| Public DMG, updater, checksums, and stable channel | passed with known signing limitation | formally published product `yourbuddy-v0.3.2` | GitHub Release plus independent download, extraction, and DMG mount on macOS 15.6.1 arm64 | [Public artifact record](evidence/public-artifacts.txt) |
| Product website deployment | passed; live browser not verified | website source `0a6f32e70c...` | local Hugo Extended 0.165.0 plus GitHub Pages build/deploy; Chrome policy check unavailable | [Website deployment record](evidence/website-deployment.txt) |

## Scenario: Published macOS artifacts and updater

- Status: passed with known signing limitation
- Date and time: 2026-09-06 19:10-19:17 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.2`; tagged commit `bfd9af598ebf24018f8d699cb83e0be23a8b3a05`
- Build under test: formally published GitHub Release files downloaded into a new local directory
- Environment: GitHub-hosted macOS arm64 release runner; macOS 15.6.1 arm64 independent verification host; GitHub Releases; local `hdiutil`, `tar`, `shasum`, `PlistBuddy`, `file`, `codesign`, and `spctl`
- Evidence origin: this release run
- Data: public release and local filesystem metadata; no user data
- Model or service: GitHub Releases and the YourBuddy updater channel; no model provider

### Steps

1. Waited for the tag-triggered release workflow and confirmed that every build, packaged-Host, relocated-runtime, checksum, updater, and publication step completed.
2. Downloaded all five public assets into a new directory and compared their GitHub digests and `SHA256SUMS.txt` entries with local SHA-256 calculations.
3. Inspected `latest.json` from both the immutable release and the `yourbuddy-updater` channel.
4. Extracted the app archive and checked version, bundle identifier, architecture, bundled runtime, and product plugin versions.
5. Attached the downloaded DMG read-only, copied the app into a new temporary installation directory, verified its metadata and ad-hoc signature, checked Gatekeeper, and detached the image.

### Expected

All public files are downloadable and match their hashes, the signed updater channel selects the 0.3.2 arm64 archive, the extracted and DMG-copied apps identify as version 0.3.2 for `io.github.istarwyh.yourbuddy`, and the image can be mounted and detached. Gatekeeper must not be reported as passing without Apple Developer signing and notarization.

### Actual

The release published all five expected assets. Every local SHA-256 matched, the stable updater manifest returned 0.3.2 with a non-empty signature, the app was an arm64 build with the expected embedded versions, and the DMG passed image verification, mount, copy, code-signature verification, and detach. `spctl` rejected the ad-hoc-signed app, as expected for the documented unsigned and unnotarized build.

### Evidence

- Before: the tag archive contained only source and local-candidate evidence.
- In progress: [workflow run 34028686085](https://github.com/istarwyh/yourbuddy/actions/runs/34028686085) built and tested the tagged commit before publication.
- Result: [public artifact record](evidence/public-artifacts.txt) lists exact files, sizes, hashes, metadata, embedded versions, and commands observed after independent download.
- Failure and recovery: no publication or checksum failure occurred. Gatekeeper rejection is retained as a known limitation and was not bypassed.

### Scope limits

The copied app was not launched interactively. Installed-DMG Help clicks, a real browser launch, automatic in-app update installation, private Host startup from the copied app, real OAuth/model calls, and enterprise proxy/CA behavior remain unverified.

## Scenario: In-app Help and recovery

- Status: passed
- Date and time: 2026-09-06 18:38 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.2`; source `b1e9d36fca62e064526689a412727f6c5dcbeb06`
- Build under test: source-built Harness Web application and shipped Personal Workbench Client loaded through a real Host scaffold
- Environment: macOS 15.6.1 arm64, Node 22.22.2, Playwright Chromium, English light theme and Chinese dark theme
- Evidence origin: this release run
- Data: synthetic workspace and draft text
- Model or service: no model; controlled desktop external-link bridge

### Steps

1. Started the real source-built Web roster with the shipped Personal Workbench Client.
2. Opened Help in English and Chinese, navigated all five destinations, and checked keyboard navigation and sidebar collapse.
3. Kept a draft in the composer while opening each destination.
4. Forced the native open response to fail, then checked that the destination remained visible and copyable.
5. Opened Settings and invoked the usage-guide link.

### Expected

Every localized destination uses the official language path, external navigation does not replace the workbench or discard the draft, keyboard focus returns to Help, and a native-open failure exposes a recoverable address.

### Actual

Both English and Chinese journeys passed. The test observed every expected URL, an unchanged workbench URL and composer draft, no page errors, the localized failure message, and the settings guide request.

### Evidence

- Before: no separate screenshot; the test records the menu's accessibility snapshot before actions.
- In progress: the source test drove all guide destinations and preserved the draft; see the [local record](evidence/local-validation.txt).
- Result: [English light-theme failure recovery](screenshots/help-en.png) and [Chinese dark-theme failure recovery](screenshots/help-zh.png).
- Failure and recovery: the screenshots intentionally show a controlled browser-open failure and the product's copy-address recovery, not an unexpected test failure.

### Scope limits

This proves the assembled source Web and controlled desktop bridge journey. It does not prove the behavior of the formally installed DMG or that a specific external browser successfully loads each remote page.

## Scenario: Authenticated Host startup and lifecycle

- Status: passed after fixture repair
- Date and time: 2026-09-06 18:34-18:38 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.2`; source `b1e9d36fca62e064526689a412727f6c5dcbeb06`
- Build under test: Rust source test target and desktop release helpers
- Environment: macOS 15.6.1 arm64, rustc toolchain, loopback HTTP fixture and child-process fixture
- Evidence origin: this release run
- Data: synthetic launch token and process output
- Model or service: controlled local Host fixture; no provider

### Steps

1. Ran the complete `runtime::supervisor::tests` module concurrently with other release checks.
2. Observed one `WouldBlock` failure in the test server's accepted socket while 12 other tests passed.
3. Explicitly restored blocking mode on the accepted socket, as required by the blocking header reader.
4. Ran the affected test in four independent Cargo processes and reran all 13 Supervisor tests serially.

### Expected

The desktop accepts only the selected Host's token-bearing URL, completes the authentication exchange before readiness, redacts tokens from failures, drains output, and shuts down owned processes. The test fixture must wait on its isolated loopback stream instead of depending on inherited socket mode.

### Actual

All four concurrent focused runs passed, followed by all 13 Supervisor tests passing. The first failure and the fixture repair are retained in the local record.

### Evidence

- Before: [local record](evidence/local-validation.txt) records the initial 12-pass/1-fail run and `WouldBlock` error.
- In progress: the same record lists the blocking-mode repair and four-process stress run.
- Result: the final serial module result was 13 passed, 0 failed.
- Failure and recovery: fixed the deterministic socket-mode mismatch; no retry was added to product code and no assertion was weakened.

### Scope limits

These are local loopback and process fixtures. They do not validate a real installed app, real OAuth account, proxy, enterprise CA, WSL host, or Windows process tree.

## Scenario: Release preparation and product refresh

- Status: passed
- Date and time: 2026-09-06 18:23-18:34 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.2`; release-preparation source `08b034a64662753e4474ede6dc2c0f90a093f8e7`, validation source `b1e9d36fca62e064526689a412727f6c5dcbeb06`
- Build under test: isolated source checkout and locally assembled release candidate
- Environment: macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0, Python 3.12.14 runtime bundle
- Evidence origin: this release run
- Data: public upstream package metadata and synthetic product fixtures
- Model or service: public npm and GitHub package sources; no real model

### Steps

1. Installed the repository with the frozen root lockfile in an isolated worktree.
2. Ran `pnpm --dir apps/desktop-tauri run prepare:release` to resolve allowed current product sources, build Harness, assemble the offline Store/toolchain/Python runtime, and run product smokes.
3. Reviewed the only product refresh: Context Doctor `0.7.0` to `0.7.2` with immutable upstream provenance.
4. Advanced all desktop version sources and the workflow default to 0.3.2, then ran version and desktop helper tests.

### Expected

Only compatible product updates are accepted; incompatible peers or provenance fail preparation. Every desktop version source names 0.3.2, and the bundled runtime remains installable without a second DSH copy.

### Actual

Preparation completed with 54 bundled runtime peer links and six assembled Client plugins. Context Doctor advanced to 0.7.2; other product versions remained pinned. The version verifier printed `yourbuddy-v0.3.2`, and all 88 desktop helper tests passed.

### Evidence

- Before: merged Help source at `a40da690839b183db93d56871c3c520064f3767a` with Context Doctor 0.7.0 and desktop 0.3.1.
- In progress: [local record](evidence/local-validation.txt) includes preparation digests and dependency-install observations.
- Result: source commits `08b034a64662753e4474ede6dc2c0f90a093f8e7` and `b1e9d36fca62e064526689a412727f6c5dcbeb06` contain the reviewed update and fixture repair.
- Failure and recovery: Personal Workbench's first isolated build lacked its excluded-snapshot `esbuild` link; a package-local install then demonstrated duplicate React. Restoring root React resolution and providing the lockfile's root `esbuild` made typecheck, 40 tests, and build pass. No source dependency was changed by this recovery.

### Scope limits

This is source and local release-candidate evidence. Public assets, signed updater metadata, installed-DMG behavior, Apple notarization, and real providers remain unverified until publication.

## Scenario: Documentation and product website build

- Status: passed
- Date and time: 2026-09-06 18:40-18:42 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.2`; source `b1e9d36fca62e064526689a412727f6c5dcbeb06` plus this release archive
- Build under test: source documentation and locally rendered product website
- Environment: macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0, official Hugo Extended 0.165.0
- Evidence origin: this release run
- Data: repository documentation only
- Model or service: no model; local static-site build

### Steps

1. Recorded the bilingual release page and index pairing data.
2. Ran all documentation gates.
3. Ran product-site tests, projected the bilingual documentation, built with Hugo Extended in strict mode, and verified local links, assets, fragments, and source actions.

### Expected

Both language records remain paired, all documentation gates pass, and the local product site builds with valid internal destinations and assets.

### Actual

All 32 documentation gates and all 70 product-site/project-site tests passed. Hugo projected 48 YourBuddy source pages, produced 59 Chinese and 57 English pages, and the verifier accepted 57 product HTML pages.

### Evidence

- Before: the release archive and index had no 0.3.2 pairing records.
- In progress: [local record](evidence/local-validation.txt) names the exact commands and Hugo binary checksum.
- Result: 32 documentation gates and the complete local website check passed.
- Failure and recovery: Hugo was not available on the default `PATH`; the official Extended 0.165.0 macOS arm64 package was checksum-verified and supplied through the documented `HUGO_BIN` setting.

### Scope limits

This verifies local source output only. It does not prove the GitHub Pages workflow has deployed or that the public URLs are reachable.

## Scenario: Post-publication installed-app startup

- Status: failed; retained as a confirmed 0.3.2 product defect
- Date and time: 2026-09-06 21:30-22:00 UTC+08:00, Asia/Shanghai
- Release and commit: public `yourbuddy-v0.3.2`; tagged commit `bfd9af598ebf24018f8d699cb83e0be23a8b3a05`
- Build under test: installed public `/Applications/YourBuddy.app`, version 0.3.2, followed by a controlled diagnosis against the same bundled resources
- Environment: macOS 15.6.1 arm64, native Tauri WebView, private Node Host on loopback
- Evidence origin: user report plus this post-publication local reproduction; not part of the original evidence ZIP
- Data: real installed product and isolated diagnostic application data; no OAuth token or user content recorded
- Model or service: no model request; local Host authentication only

### Steps

1. Launched the installed 0.3.2 application from Finder-equivalent GUI context and waited for the private Host readiness log.
2. Observed the main WebView after native startup reported `authenticated readiness passed` and `boot complete`.
3. Reproduced the shell/Host site relationship in a browser control: a `localhost` parent with the strict `127.0.0.1` Host cookie failed, while separate `127.0.0.1` ports succeeded.

### Expected

The installed application should exchange the launch token, open the clean Host root, and render the YourBuddy workspace without exposing the token to the renderer.

### Actual

Native readiness passed, but the installed WebView displayed `dsh web authentication required; reopen the URL printed by dsh web.` The packaged Tauri shell and Host were cross-site, so macOS WebKit withheld the strict cookie. This invalidates the earlier source-only claim that 0.3.2 avoided an unauthorized initial view. The public installer and tag remain unchanged; the [same-site fix](../../../.agents/notes/implemented/bug-fix/2026-09-06-yourbuddy-desktop-same-site-authentication.md) is pending a later release.

### Scope limits

The failure is confirmed for the public macOS arm64 application. Windows, WSL, Intel macOS, OAuth, model requests, and enterprise proxy/CA behavior were not part of this reproduction.

## Delivery status

- Product publication status: published with a confirmed macOS startup defect at [YourBuddy 0.3.2](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2); its files remain downloadable and match the recorded hashes, but the installed WebView can stop at the authentication-required response.
- Verification archive status: the original immutable archive remains downloadable and byte-verified at source commit `62863db240023dcebf2097e7c70d5874a2b5b3b3`; its size is 129,941 bytes and SHA-256 is `e562353aa609e488720cbdbc6a3de2dec48f538b60e4dd949a89fbc21c4bffcc`. It predates and does not contain the post-publication installed-app failure, which is recorded on this maintained release page and must be carried into the next release archive.
- Website synchronization status: deployed from `0a6f32e70c9237b1fb245a738d0fa8406ff590fb` by [workflow 34030189025](https://github.com/istarwyh/yourbuddy/actions/runs/34030189025); local and CI site checks passed, but live browser verification is pending because the browser's admin-enforced policy check was unavailable twice.
- Unverified scope: interactive Help and real browser launch after a successful installed startup, automatic in-app update installation, real OAuth/model calls, enterprise proxy/CA, Windows, macOS Intel, Linux, Apple Developer signing, and notarization. Installed private Host startup is verified as failing at the WebView authentication step; Gatekeeper rejection is confirmed for the ad-hoc-signed build.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] Every completed scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and model or service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Useful failure and recovery states are retained without imposing a screenshot quota.
- [x] Source-only, synthetic-data, controlled-service, pending, and unverified evidence is labelled explicitly.
- [x] Screenshots are readable, captioned, linked relatively, and contain no credentials or personal information.
- [x] The release entry, language pairing, and documentation/product-site builds have passed on the local candidate tree; the tagged commit will be rechecked before publication.
- [x] The downloadable evidence archive has been publicly downloaded, byte-compared, extracted, and inspected.
- [x] The public release page links to the immutable evidence commit, gallery, and download.
- [x] The actual DMG, updater files, checksums, metadata, and a copied installation bundle were checked independently of CI; the later interactive launch failure is retained explicitly.
- [ ] The product website content has been synchronized and deployed; bilingual live destinations remain unverified because the browser security policy check was unavailable.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [x] Existing public tags and installers have not been moved or overwritten.
