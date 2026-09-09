# YourBuddy 0.3.6

English | [中文](README.zh.md)

This archive currently records the 0.3.6 enterprise network correction, complete local release preparation, and pull-request CI. Public desktop artifacts, updater metadata, App inspection, website deployment, and the downloadable verification archive remain pending and must be recorded after publication.

- Release identifier: `yourbuddy-v0.3.6`.
- Product channel: YourBuddy desktop for macOS Apple Silicon; npm, Python, SDK, and other release channels are not applicable.
- Archive state: partial release candidate; source, local synthetic private-CA path, assembled runtime, documentation, and pull-request CI evidence are recorded.
- Tested product commit: [`ae00df24539f07479a6d097cf0c06e86b493d86e`](https://github.com/istarwyh/yourbuddy/commit/ae00df24539f07479a6d097cf0c06e86b493d86e), merged by [PR #19](https://github.com/istarwyh/yourbuddy/pull/19) as [`d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`](https://github.com/istarwyh/yourbuddy/commit/d0b55a7fee27fc240b1ef68ad14d968d4b96c0db).
- Evidence gallery: not applicable at the candidate stage; no packaged application was launched.
- Evidence download: pending public artifact verification.

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

After publication, install the Apple Silicon DMG from the [0.3.6 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6), or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Public assets and an actual updater installation are not yet verified at this candidate stage.

### Compatibility, migration, and limitations

The desktop targets macOS 11 or later on Apple Silicon. Existing application data is retained and no migration is required. Only an explicit CA selected in Settings is persisted; an inherited `NODE_EXTRA_CA_CERTS` value remains owned by the launch environment. Custom CA files must use an absolute canonical `.pem` or `.crt` path, be bounded readable regular files, and contain only parseable, currently valid X.509 certificates. TLS verification cannot be disabled. The application is not Apple Developer signed or notarized. The synthetic local CA and CONNECT proxy prove the implemented path but do not establish behavior with a real enterprise network.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Enterprise CA and proxy policy | passed within source and synthetic-network scope | source and actual CLI Host at `ae00df245...` | macOS 15.6.1 arm64; Rust 1.98.0; bundled Node 22.19.0; local private CA, HTTPS origin, and CONNECT proxy | [local candidate record](evidence/local-candidate-validation.txt) |
| Complete local release preparation | passed | locally assembled candidate, not an installer | macOS arm64; pnpm 11.7.0; offline production reinstall | [local candidate record](evidence/local-candidate-validation.txt) |
| Pull-request CI | passed after a scoped test-synchronization correction | source at `ae00df245...` | GitHub-hosted Linux, macOS, and Windows matrix | [run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650); [local candidate record](evidence/local-candidate-validation.txt) |
| Product publication and updater | pending | no public 0.3.6 product bytes yet | GitHub Release and stable updater channel | to be recorded after the tag workflow |
| Public App and relocated runtime | pending | no public 0.3.6 App yet | macOS arm64 | to be recorded after anonymous download |
| Product website | pending | no deployed 0.3.6 website source yet | local site build and GitHub Pages | to be recorded after publication |
| Downloadable verification archive | pending | no 0.3.6 evidence ZIP yet | GitHub Release | to be recorded after the final archive commit |
| Packaged native startup and WebView journey | not verified | no packaged 0.3.6 App launched | macOS arm64 | no screenshot or installed-product claim |
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

## Delivery status

- Product publication status: pending; `yourbuddy-v0.3.6` has not yet been tagged or published and no product asset is claimed.
- Verification archive status: partial; source, synthetic network, local candidate, failure/recovery, and PR CI evidence are recorded. Public artifact, updater, App/runtime, website, and downloadable-ZIP evidence are pending.
- Website synchronization status: pending; no 0.3.6 website deployment or live URL has been claimed.
- Unverified scope: public DMG and updater bytes, checksums, updater signature and installation, App identity and native startup, packaged-WebView journey, Apple Developer signing and notarization, a real enterprise proxy or certificate, proxy authentication, website deployment, Intel macOS, and Windows and Linux desktop products.

## Delivery checklist

- [x] The candidate release identifier and version sources are aligned to 0.3.6.
- [x] The opening notes explain the change, problem, product area, and shortest observable journey.
- [x] Installation, compatibility, migration behavior, certificate requirements, and current limitations are stated.
- [x] Source, local assembly, and CI scenarios record environment, build type, data type, steps, expected and actual results, recovery, and scope limits.
- [x] Synthetic, source-only, cancelled, failed, pending, and unverified observations are labelled explicitly.
- [x] Credentials, private certificates, account data, and private Session content are absent.
- [x] The release entry was added to both language indexes and the bilingual version pages are present.
- [ ] The public tag, release commit, workflow, filenames, hashes, checksums, updater manifest, and signature are recorded.
- [ ] The anonymously downloaded public App and relocated runtime are inspected.
- [ ] The affected packaged-WebView settings journey is exercised or retained as an explicit limit.
- [ ] The bilingual product website is synchronized, deployed, and checked at live URLs.
- [ ] The downloadable evidence archive is created from an immutable commit, uploaded, anonymously downloaded, compared, and extracted.
- [x] Product publication, verification archive, website synchronization, and unverified scope are reported separately.
- [x] No public tag or installer was moved or overwritten.
