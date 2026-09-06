# YourBuddy 0.3.2

English | [中文](README.zh.md)

- Release identifier: `yourbuddy-v0.3.2`
- Product channel: YourBuddy desktop
- Archive state: public product verification and website deployment complete; verification download and live browser verification pending
- Validated source commit: [`b1e9d36fca62e064526689a412727f6c5dcbeb06`](https://github.com/istarwyh/yourbuddy/commit/b1e9d36fca62e064526689a412727f6c5dcbeb06)
- Evidence gallery: [source Web Help screenshots](screenshots/)
- Evidence download: planned `yourbuddy-v0.3.2-verification.zip` on the public release after the post-publication record is complete

## User release notes

### What changed

YourBuddy 0.3.2 adds a Help menu inside the application, expands the bilingual product guides, hardens authenticated startup of the private Node Host, improves subprocess cleanup, and refreshes bundled Context Doctor from `0.7.0` to compatible version `0.7.2`.

### Problem solved

Users can now reach the correct getting-started, plugin, extension-development, troubleshooting, settings, and feedback destinations without leaving the current workbench session. If the system browser cannot be opened, the address remains visible and copyable. The desktop also completes the Host token exchange before showing the workbench, avoiding a blank or unauthorized initial view while keeping credentials out of the stored root URL and logs.

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
| Authenticated Host startup and lifecycle | passed after fixture repair | source Rust test target | macOS 15.6.1 arm64, local loopback fixtures, no real credentials | [Local record](evidence/local-validation.txt) |
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

## Delivery status

- Product publication status: published and independently verified at [YourBuddy 0.3.2](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2); the DMG, app updater archive, signature, checksums, immutable updater manifest, and stable updater channel are downloadable and match the recorded metadata.
- Verification archive status: partial until the post-publication archive is committed and its downloadable verification ZIP is uploaded and extracted; source notes, two reviewed screenshots, local validation, and public artifact evidence are present.
- Website synchronization status: deployed from `0a6f32e70c9237b1fb245a738d0fa8406ff590fb` by [workflow 34030189025](https://github.com/istarwyh/yourbuddy/actions/runs/34030189025); local and CI site checks passed, but live browser verification is pending because the browser's admin-enforced policy check was unavailable twice.
- Unverified scope: installed interactive Help, real browser launch from the installed app, automatic in-app update installation, copied-app private Host startup, real OAuth/model calls, enterprise proxy/CA, Windows, macOS Intel, Linux, Apple Developer signing, and notarization. Gatekeeper rejection is confirmed for the ad-hoc-signed build.

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
- [ ] The downloadable evidence archive has been extracted and inspected.
- [ ] The public release page links to the immutable evidence commit, gallery, and download.
- [x] The actual DMG, updater files, checksums, metadata, and a copied installation bundle have been checked independently of CI; interactive launch remains explicitly unverified.
- [ ] The product website content has been synchronized and deployed; bilingual live destinations remain unverified because the browser security policy check was unavailable.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [x] Existing public tags and installers have not been moved or overwritten.
