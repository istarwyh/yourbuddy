# YourBuddy 0.3.6

English | [中文](README.zh.md)

This archive records the 0.3.6 enterprise network correction, complete local release preparation, pull-request CI, formal publication, public-file integrity, updater signature, App identity, relocated runtime, and deployed bilingual product website. Native startup, packaged-WebView interaction, and visual-browser website rendering remain unverified; the downloadable verification archive remains pending.

- Release identifier: `yourbuddy-v0.3.6`.
- Product channel: YourBuddy desktop for macOS Apple Silicon; npm, Python, SDK, and other release channels are not applicable.
- Archive state: public product and website evidence complete within the stated scope; the downloadable-archive stage remains pending.
- Tested product commits: [`ae00df24539f07479a6d097cf0c06e86b493d86e`](https://github.com/istarwyh/yourbuddy/commit/ae00df24539f07479a6d097cf0c06e86b493d86e), merged by [PR #19](https://github.com/istarwyh/yourbuddy/pull/19) as [`d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`](https://github.com/istarwyh/yourbuddy/commit/d0b55a7fee27fc240b1ef68ad14d968d4b96c0db); terminal correction [`2b409de193d9aad1da24ebbc46cbd277186ab623`](https://github.com/istarwyh/yourbuddy/commit/2b409de193d9aad1da24ebbc46cbd277186ab623), merged by [PR #20](https://github.com/istarwyh/yourbuddy/pull/20) as the immutable release commit [`2c523beca5965e057d9ea536d648b3f1458ee7ef`](https://github.com/istarwyh/yourbuddy/commit/2c523beca5965e057d9ea536d648b3f1458ee7ef).
- Evidence gallery: not applicable; no current installed-application screenshots were captured.
- Evidence download: pending the final immutable evidence commit.

## User release notes

### What changed

YourBuddy 0.3.6 applies one explicit enterprise proxy and custom-CA policy to the native desktop client and the Host, plugins, WSL, installers, provisioning, updater, and fresh bundled Node process that the application launches. It also updates Better Sidebar to 0.18.1 and Harbor Evolution to 0.9.5.

### Problem solved

An enterprise CA available to the launch environment could be lost before the managed Host started, while one process could use different proxy or trust settings from another. A settings test could therefore pass without proving the newly launched Host would connect. The corrected release resolves one CA source by explicit precedence, validates the complete certificate file, clears conflicting ambient proxy variables, propagates the resolved settings to each managed runtime, and requires both native and fresh-Node preflights before persistence or restart.

### Where to use it

Use **Settings → Network proxy** when YourBuddy must reach HTTPS services through an enterprise proxy or trust an organization-provided root CA. The current Host, the native draft, and the bundled-Node draft are shown independently so a mismatch is visible before saving.

### How to try it

1. Open **Settings → Network proxy** and choose a currently valid `.pem` or `.crt` CA file by absolute path, or launch YourBuddy with `NODE_EXTRA_CA_CERTS` already configured.
2. Configure the enterprise proxy if required and run **Test connection**.
3. Confirm that the native client and the fresh bundled Node test both pass, then use **Save and restart**.
4. Reopen the page and confirm the displayed CA source is Settings, launch environment, or system trust as expected.

### Install or upgrade

Install the Apple Silicon DMG from the [0.3.6 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6), or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. The public files and updater signature are independently verified; an actual updater installation remains unverified.

### Compatibility, migration, and limitations

The desktop targets macOS 11 or later on Apple Silicon. Existing application data is retained and no migration is required. Only an explicit CA selected in Settings is persisted; an inherited `NODE_EXTRA_CA_CERTS` value remains owned by the launch environment. Custom CA files must use an absolute canonical `.pem` or `.crt` path, be bounded readable regular files, and contain only parseable, currently valid X.509 certificates. TLS verification cannot be disabled. The application is not Apple Developer signed or notarized. The synthetic local CA and CONNECT proxy prove the implemented path but do not establish behavior with a real enterprise network.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Enterprise CA and proxy policy | passed within source and synthetic-network scope | source and actual CLI Host at `ae00df245...` | macOS 15.6.1 arm64; Rust 1.98.0; bundled Node 22.19.0; local private CA, HTTPS origin, and CONNECT proxy | [local candidate record](evidence/local-candidate-validation.txt) |
| Complete local release preparation | passed | locally assembled candidate, not an installer | macOS arm64; pnpm 11.7.0; offline production reinstall | [local candidate record](evidence/local-candidate-validation.txt) |
| Pull-request CI | passed after a scoped test-synchronization correction | source at `ae00df245...` | GitHub-hosted Linux, macOS, and Windows matrix | [run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650); [local candidate record](evidence/local-candidate-validation.txt) |
| Release pull-request correction | passed after retaining the failed first run and failed native-test attempt | release source at `2b409de193...` | GitHub-hosted Linux, macOS, and Windows matrix | [run 34375335129](https://github.com/istarwyh/yourbuddy/actions/runs/34375335129); [local candidate record](evidence/local-candidate-validation.txt) |
| Product publication and updater | passed | five anonymously downloaded release assets | GitHub Release and stable updater channel | 3/3 checksums, five API digests, byte-identical manifests, and Minisign verification; [artifact record](evidence/public-artifact-stage.json) |
| Public App and relocated runtime | passed within recorded scope | unchanged App from the public DMG | macOS 15.6.1 arm64 | DMG/updater trees identical; identity, strict ad-hoc signature, CLI, and imports passed; [runtime record](evidence/public-runtime-stage.json) |
| Product website | passed within recorded deployment and HTTP scope | public deployment from `5fa67b477...` | GitHub Pages and unauthenticated HTTP | build and deploy passed; six bilingual pages and their release-facing targets returned 200; [local record](evidence/website-local-validation.txt) and [deployment record](evidence/website-deployment.txt) |
| Downloadable verification archive | pending | no 0.3.6 evidence ZIP yet | GitHub Release | to be recorded after the final archive commit |
| Packaged native startup and WebView journey | not verified | public 0.3.6 App was not launched | existing user-owned YourBuddy instance prevented isolation | no screenshot or installed-product claim; [skipped observation](evidence/public-native-startup.txt) |
| Real enterprise proxy and CA | not verified | synthetic local network only | local isolated services | no organization certificate, credential, or external enterprise endpoint used |

## Scenario: Enterprise CA and proxy policy

- Status: passed for owned source relationships, native behavior, and a synthetic end-to-end Host request; packaged-WebView and real enterprise traffic remain unverified.
- Date and time: 2026-09-09, Asia/Shanghai, UTC+08:00.
- Release and commit: `yourbuddy-v0.3.6` candidate; tested correction commit `ae00df24539f07479a6d097cf0c06e86b493d86e`, merged as `d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`.
- Build under test: source-native tests, controlled browser components, and the actual CLI Host started with bundled Node 22.19.0; not a DMG or installed App.
- Environment: macOS 15.6.1 arm64, Rust 1.98.0, Node 22.19.0, local generated private CA and leaf certificate, local HTTPS origin, and local HTTP CONNECT proxy.
- Evidence origin: this release run.
- Data: synthetic certificate material and loopback endpoints; no proxy credentials, organization certificate, account data, or private Session content.
- Model or service: local controlled services; no model or external provider request.

### Steps

1. Exercised explicit selected, inherited process environment, inherited macOS `launchctl`, and system trust precedence; invalid path, file type, size, certificate syntax, activation time, and expiry cases were negative controls.
2. Exercised propagation after ambient proxy cleanup through the native request client, Host, plugins, WSL, installers, provisioning, and updater inputs.
3. Ran two independent concurrent copies of the real Host test. Each created a private-CA HTTPS origin and CONNECT proxy, invoked the CLI Host without and then with the CA, and waited for complete child and server cleanup.
4. Exercised the Settings component so current Host, native draft, bundled Node draft, source diagnostics, and failure behavior remained distinct.

### Expected

An explicit Settings CA overrides an inherited launch value; otherwise the launch value overrides system trust. Only explicit selection persists. Every managed runtime receives the same resolved proxy, CA, and source metadata after conflicting ambient proxy values are cleared. Save or restart occurs only after both native and fresh bundled-Node tests pass. TLS verification remains enabled.

### Actual

The focused native, product, component, WSL, provisioning, plugin, and real Host tests passed. Both concurrent Host invocations failed without the generated CA and returned HTTP 204 with it. Invalid, unreadable, not-yet-valid, and expired certificate inputs were rejected. Loopback declarations for the same host and port were normalized to HTTP CONNECT. A failed preflight left persisted settings and the running application unchanged in the controlled tests.

### Evidence

- Before: [Issue #18](https://github.com/istarwyh/yourbuddy/issues/18) records the lost-CA and cross-runtime mismatch; no credential or private certificate was copied into this archive.
- In progress: the test suite generated temporary certificate and proxy material and removed it after server and child closure.
- Result: exact test counts and commands are in the [local candidate record](evidence/local-candidate-validation.txt); [PR #19](https://github.com/istarwyh/yourbuddy/pull/19) contains the reviewed implementation.
- Failure and recovery: the original real Host test could reject on a timeout before child closure. Cleanup was changed to wait for the child close event and both server closes, then two concurrent complete invocations passed.

### Scope limits

This scenario does not prove a real enterprise proxy, organization CA, proxy authentication, external provider endpoint, packaged WebView control, installed application, updater installation, or non-macOS desktop product.

## Scenario: Local release candidate assembly

- Status: passed after a complete transactional rerun.
- Date and time: 2026-09-09, Asia/Shanghai, UTC+08:00.
- Release and commit: `yourbuddy-v0.3.6` candidate based on merged correction commit `d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`.
- Build under test: locally assembled Harness, offline store, production dependencies, Python runtime, and six product plugins; not an installer or public download.
- Environment: macOS 15.6.1 arm64, Node 22.19.0, pnpm 11.7.0, Python 3.12.14, Harbor 0.21.0, Harbor Evolution 0.9.5.
- Evidence origin: this release run.
- Data: synthetic product-smoke inputs and isolated build directories.
- Model or service: controlled local Host; no paid or external model request.

### Steps

1. Checked the selected upstream DSH release without modifying the product tree.
2. Built 220 Client artifacts, bundled the Harness source, assembled the production dependency tree, and prepared the offline store.
3. Removed and reinstalled all 587 production packages from the prepared store with zero downloads.
4. Validated 54 peer links, Python and Harbor identities, six assembled plugins, Host behavior, and normal shutdown.

### Expected

The candidate can be recreated from its lock data, reinstall production dependencies offline, load all configured plugins with their exact peers, and start and stop the Host without relying on a partial prior tree.

### Actual

The completed preparation passed. It recorded the Harness source, offline store, store archive, and Harness bundle SHA-256 values in the local evidence file. The product contains Better Sidebar 0.18.1, Harbor Evolution 0.9.5, Python 3.12.14, and Harbor 0.21.0.

### Evidence

- Before: the first transaction rejected Harbor Evolution 0.9.5 because ordinary npm prerelease peer matching excluded DSH 0.1.2-rc.1 and rolled back.
- In progress: exact version-scoped Harbor peer overrides were added for the bundled DSH prerelease; the obsolete client-runtime injection was removed.
- Result: the complete assembly, zero-download reinstall, hashes, identities, and six-plugin smoke are in the [local candidate record](evidence/local-candidate-validation.txt).
- Failure and recovery: one initial external store fill retried a network request. Only the later complete transaction and its zero-download reinstall are used as passing evidence.

### Scope limits

This proves a local assembled runtime, not the workflow-built DMG, updater archive, public bytes, code signature, App launch, or update installation.

## Scenario: Pull-request CI and durability-test recovery

- Status: passed after correcting the test's lifecycle synchronization; the failed run is retained as negative evidence.
- Date and time: 2026-09-09 21:25 through 22:41 UTC+08:00, Asia/Shanghai.
- Release and commit: issue correction commit `ae00df24539f07479a6d097cf0c06e86b493d86e`; PR #19 merged as `d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`.
- Build under test: source checkout and complete repository CI matrix; no release artifacts were published.
- Environment: GitHub-hosted Linux, macOS, and Windows runners with the repository's declared Node, Rust, Python, and Wine lanes.
- Evidence origin: this release run.
- Data: repository fixtures and synthetic test data.
- Model or service: keyless test services; real-provider E2E was not required.

### Steps

1. Ran PR CI at the initial correction commit and retained Windows coverage run 34356938688 when it read a stale projection-cache file before an asynchronous durable write completed.
2. Confirmed the failing product path was untouched and byte-identical to recent successful Windows runs, then changed only the test to subscribe to the exact `domain/changed` event emitted after backend durability before reading disk.
3. Ran the focused file once and four additional independent sequential invocations; each passed all 21 cases.
4. Ran the complete CI matrix at `ae00df245...` and merged only after required jobs passed.

### Expected

The durability assertion should wait for the owned post-write event rather than a one-second generic polling deadline, while retaining the exact on-disk sequence assertion. The complete platform matrix must pass before merge.

### Actual

[Run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650) passed all required jobs, including Windows coverage. [Run 34356938688](https://github.com/istarwyh/yourbuddy/actions/runs/34356938688) remains failed evidence and is not counted as success. The Cloudflare Pages preview used an unavailable self-hosted runner label, never ran, and was cancelled without being counted as passing.

### Evidence

- Before: failed Windows coverage [run 34356938688](https://github.com/istarwyh/yourbuddy/actions/runs/34356938688).
- In progress: focused 21-case file plus four independent sequential invocations, recorded in the [local candidate record](evidence/local-candidate-validation.txt).
- Result: successful complete [run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650) and merged [PR #19](https://github.com/istarwyh/yourbuddy/pull/19).
- Failure and recovery: the test now awaits the owner's durable event; no timeout was widened and no assertion was weakened.

### Scope limits

CI establishes the tested source and matrix only. It does not prove product publication, anonymous downloads, website deployment, native application startup, or real enterprise traffic.

## Scenario: Release PR terminal-output recovery

- Status: passed after the owner correction; both the failed first run and the failed Windows native-test attempt remain negative evidence.
- Date and time: 2026-09-09 23:01 through 2026-09-10 00:45 UTC+08:00, Asia/Shanghai.
- Release and commit: PR #20 release-preparation commit `6b457268ac6c0b2251babcf9fbed29ec4810fa05`, correction `2b409de193d9aad1da24ebbc46cbd277186ab623`, merged as release commit `2c523beca5965e057d9ea536d648b3f1458ee7ef`.
- Build under test: source checkout and locally assembled candidate; no installer or public product bytes.
- Environment: GitHub-hosted Linux and Windows runners for the failed CI run; macOS 15.6.1 arm64 with Node 22.22.2 and pnpm 11.7.0 for the correction.
- Evidence origin: this release run.
- Data: repository fixtures and synthetic terminal state.
- Model or service: keyless tests; no provider request.

### Steps

1. Retained failed release PR [run 34367447468](https://github.com/istarwyh/yourbuddy/actions/runs/34367447468), where 16,461 tests passed before one Linux coverage assertion received an empty viewport from the persistent PowerShell shell; Windows coverage and every other completed job passed.
2. Confirmed the failing test and terminal session source were unchanged from the successful issue-fix CI, then traced the empty result to the shell process group re-entering its kernel stdin wait before node-pty delivered the command's final output callback.
3. Restricted exact Linux stdin-wait readiness to a different foreground child process group. The remembered shell process group now requires its owned controlled prompt or a bounded fallback, so settlement cannot discard delayed command output.
4. Ran the focused 51-case session suite and the complete terminal-bash package suite: 89 passed and three optional real-pwsh cases skipped because the faulty local PowerShell executable was deliberately absent from `PATH`.
5. Re-recorded the two Harbor snapshot hashes after confirming their only drift came from the reviewed bilingual README synchronization, verified all six external snapshots, checked the latest product channels, and completed release preparation with a zero-download 587-package reinstall and all six assembled Client plugins.
6. Retained attempt 1 of run 34375335129 when the Windows native-test Vitest worker exited before reporting a test result, then reran only the failed job. Attempt 2 passed the affected worker-thread package, all 67 native-test cases, and the complete 19-job aggregate.

### Expected

The shell's own input wait must not settle an operation before its controlled prompt and final output arrive. A foreground child process group may still settle through exact stdin-wait evidence. The replacement complete CI matrix must pass before PR #20 merges.

### Actual

The deterministic session tests now hold a shell-group stdin wait without settling, then return the delayed output after the controlled prompt. The changed-foreground-group case still settles at the exact-probe threshold. Complete local release preparation passed with Harness SHA-256 `5c765be554a75a8a3810281e8364d21b11792e83eb443366c05e10744794aed0`, Store SHA-256 `c4c733da80b6027aa6cd946b7a047db98338d82625cee72b72ad928e5379fe09`, Store archive SHA-256 `262405620e237043ad157e66f5a95b199920686df6f78bb244e11409b21d77e8`, and complete bundle SHA-256 `078ca9f07b7f46e8a5160bb7bafe2c5a41a8d8c86cb7f7fd376684cf7930f78e`. [Run 34375335129](https://github.com/istarwyh/yourbuddy/actions/runs/34375335129), attempt 2, completed all 19 jobs successfully before PR #20 merged. Its first attempt had selected Node 24.20.0 for the Windows native lane and failed before the suite reported tests; the passing retry selected 24.19.0, so 24.20.0 remains unverified rather than being inferred from the retry.

### Evidence

- Before: failed release PR [run 34367447468](https://github.com/istarwyh/yourbuddy/actions/runs/34367447468), retained without rerunning unchanged.
- In progress: focused and package test results plus final assembly hashes in the [local candidate record](evidence/local-candidate-validation.txt).
- Result: local correction, complete assembly, and replacement CI passed before merge.
- Failure and recovery: the runtime readiness owner was corrected; no timeout was widened and no output assertion was weakened. Run 34367447468 and attempt 1 of run 34375335129 remain negative evidence rather than being described as passes.

### Scope limits

Local tests and CI do not substitute for public installer validation, updater installation, App startup, or website deployment. The successful retry also does not establish Node 24.20.0 compatibility.

## Scenario: Independent public artifact verification

- Status: passed for anonymous availability, complete files, public checksums, stable updater metadata, and updater cryptographic signature.
- Date and time: 2026-09-10 01:08–01:18 UTC+08:00, Asia/Shanghai.
- Release and build: [`yourbuddy-v0.3.6`](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6), immutable tag commit `2c523beca5965e057d9ea536d648b3f1458ee7ef`, built by [workflow 34379057672](https://github.com/istarwyh/yourbuddy/actions/runs/34379057672).
- Method: downloaded all five assets without GitHub authentication; checked byte counts and SHA-256 against the public GitHub API; checked all three `SHA256SUMS.txt` entries; compared the stable and versioned updater manifests.
- Cryptographic check: `minisign-verify` 0.2.5 used the public key from the immutable tag configuration and verified the updater archive's prehashed signature and trusted comment.
- Evidence: [public artifact record](evidence/public-artifact-stage.json).

| Public asset | Bytes | Independently observed SHA-256 |
|---|---|---|
| `latest.json` | 4,615 | `ad806fec61e87a2c2ac95bec14a50aedba6c3a10103037ca7b18d8f315ef440a` |
| `SHA256SUMS.txt` | 312 | `a4a2081c9df8be6e67128fa27430232400f8af6618c44f00db8fdb351342c29e` |
| `yourbuddy-0.3.6-macos-arm64.app.tar.gz` | 570,784,766 | `8db651f6cf45e935503b551b1dcc04061c2fa438132a45cfddfd5d8452349e56` |
| `yourbuddy-0.3.6-macos-arm64.app.tar.gz.sig` | 408 | `f7c0cc86e0f2f584c0a950555b1f67c37e37dc18d31b40cb453f16afde670e5b` |
| `yourbuddy-0.3.6-macos-arm64.dmg` | 568,866,355 | `ae1d459166dde9d54a4e8a48d88d546c9497aac19254a1808f25f838e8617a98` |

The first signature-audit command treated Tauri's base64-encoded `.sig` asset as direct Minisign text and returned `InvalidEncoding`; it was discarded as an audit setup error. Decoding the asset before the actual verification passed. This check does not prove native startup, updater installation, Apple notarization, packaged-WebView behavior, or real enterprise traffic.

## Scenario: Public App and relocated runtime

- Status: DMG integrity, App identity, DMG/updater equality, strict ad-hoc code-signature integrity, bundled enterprise-CA metadata, and relocated Python/Harbor CLI and imports passed; native startup and visual interaction were skipped.
- Date and time: 2026-09-10 01:10–01:18 UTC+08:00, Asia/Shanghai.
- Build under test: unchanged App copied from the anonymously downloaded public DMG; no identity, executable, resource, or signature bytes were edited.
- Environment: macOS 15.6.1 arm64; isolated runtime copy; no OAuth token, profile, model request, proxy credential, organization certificate, or private Session data.
- Evidence: [public runtime record](evidence/public-runtime-stage.json) and [native-startup skip](evidence/public-native-startup.txt).

`hdiutil verify`, read-only mount, copy, and detach passed. The DMG and updater archive contained byte-identical App trees. The App reports version/build 0.3.6, identifier `io.github.istarwyh.yourbuddy`, and an arm64 executable. `codesign --deep --strict` exited 0, but the signature is ad-hoc with no TeamIdentifier; Gatekeeper exited 3 and rejected it. It is not Apple Developer signed or notarized.

The public bundle contains DSH 0.1.2-rc.1, Better Sidebar 0.18.1, Harbor Evolution 0.9.5, the other four recorded product plugins, Node 22.19.0, and pnpm 11.7.0. Its native binary contains the CA source metadata key and selected, inherited, and system source values. A relocated copy whose recorded build prefix was replaced with a nonexistent path passed `harbor --version`, `harbor-dsh --help`, and direct Python imports using the same bundled `PYTHONHOME` as the launchers; it reports Python 3.12.14, Harbor 0.21.0, and adapter 0.9.5.

A user-owned YourBuddy process and managed Host were already running. Launching the public copy could interact with that global single-instance owner, so neither was stopped and the downloaded App was not launched. Native readiness, Finder installation, update from an older version, packaged-WebView network settings, screenshots, OAuth, and real enterprise traffic remain unverified.

## Scenario: Public product website

- Status: passed for deployment, bilingual static rendering, 0.3.6 copy, and public release/download link availability; visual browser rendering remains unverified.
- Date and time: 2026-09-10 02:30–02:40 UTC+08:00, Asia/Shanghai.
- Release and commit: `yourbuddy-v0.3.6`; website source commit [`5fa67b4771cc715736e10868b0884fa77a62bed3`](https://github.com/istarwyh/yourbuddy/commit/5fa67b4771cc715736e10868b0884fa77a62bed3) from [PR #21](https://github.com/istarwyh/yourbuddy/pull/21).
- Build under test: public GitHub Pages deployment, not a source preview or desktop installer.
- Environment: GitHub Pages, GitHub Releases, and unauthenticated HTTP on macOS 15.6.1 arm64.
- Evidence: [local website record](evidence/website-local-validation.txt), [deployment and live-check record](evidence/website-deployment.txt), and [workflow 34389210312](https://github.com/istarwyh/yourbuddy/actions/runs/34389210312).

The website workflow's build and deploy jobs passed, and GitHub deployment `6356638242` reported success for the exact source commit. Chinese and English home, download, and release pages all returned HTTP 200, declared the expected language and title, and contained the 0.3.6 release text. Both download-page DOMs linked the exact DMG, checksum file, GitHub Release, language-matched verification record, and raw Markdown; those targets and all six raw Markdown routes returned HTTP 200. The DMG was not downloaded again because its earlier complete anonymous download and hash check already passed.

PR CI [run 34384125128](https://github.com/istarwyh/yourbuddy/actions/runs/34384125128) retained an initial Snapshot / Artifacts setup failure caused by a Google apt `Packages.gz` hash mismatch before repository tests. Only that failed lane was rerun; attempt 2 passed its actual gates and the aggregate. The Cloudflare preview found no matching runner and was cancelled without being counted as a pass. Two required web-access CDP attempts timed out waiting for host Chrome authorization, so no pixel-level or interactive browser claim is made. Deployment metadata, public HTTP, and static-DOM inspection establish the recorded website scope but do not validate the desktop App, installation, WebView behavior, updater installation, or real enterprise traffic.

## Delivery status

- Product publication status: passed; `yourbuddy-v0.3.6` is the Latest formal GitHub Release with five independently downloaded and checked product assets. Native startup and updater installation remain unverified.
- Verification archive status: partial; source, synthetic network, local candidate, CI, public artifact, updater-signature, App/runtime, website, failure/recovery, and native-startup skip evidence are recorded. The downloadable ZIP remains pending.
- Website synchronization status: deployed and verified within the recorded HTTP scope at commit [`5fa67b4771cc715736e10868b0884fa77a62bed3`](https://github.com/istarwyh/yourbuddy/commit/5fa67b4771cc715736e10868b0884fa77a62bed3) through [workflow 34389210312](https://github.com/istarwyh/yourbuddy/actions/runs/34389210312); all six bilingual release-facing pages and their public targets passed. Visual browser rendering remains unverified because CDP authorization timed out.
- Unverified scope: native App startup, updater installation, packaged-WebView journey, Apple Developer signing and notarization, a real enterprise proxy or certificate, proxy authentication, Node 24.20.0 compatibility, visual browser rendering of the website, Intel macOS, and Windows and Linux desktop products.

## Delivery checklist

- [x] The candidate release identifier and version sources are aligned to 0.3.6.
- [x] The opening notes explain the change, problem, product area, and shortest observable journey.
- [x] Installation, compatibility, migration behavior, certificate requirements, and current limitations are stated.
- [x] Source, local assembly, and CI scenarios record environment, build type, data type, steps, expected and actual results, recovery, and scope limits.
- [x] Synthetic, source-only, cancelled, failed, pending, and unverified observations are labelled explicitly.
- [x] Credentials, private certificates, account data, and private Session content are absent.
- [x] The release entry was added to both language indexes and the bilingual version pages are present.
- [x] The public tag, release commit, workflow, filenames, hashes, checksums, updater manifest, and signature are recorded.
- [x] The anonymously downloaded public App and relocated runtime are inspected.
- [x] The affected packaged-WebView settings journey is retained as an explicit limit because an isolated launch was unsafe.
- [x] The bilingual product website is synchronized, deployed, and checked at live URLs within the recorded HTTP scope.
- [ ] The downloadable evidence archive is created from an immutable commit, uploaded, anonymously downloaded, compared, and extracted.
- [x] Product publication, verification archive, website synchronization, and unverified scope are reported separately.
- [x] No public tag or installer was moved or overwritten.
