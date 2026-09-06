# YourBuddy 0.3.1

English | [中文](README.zh.md)

- Release identifier: `yourbuddy-v0.3.1`
- Product channel: YourBuddy desktop
- Archive state: public product and artifact verification complete; immutable evidence link and download pending
- Evidence commit: final release preparation passed at `de17171f970e43bd8c42d84a1cfeb386f5bc17c3`; the public artifact record is committed after publication and will receive an immutable link without moving the tag
- Evidence gallery: not applicable; no packaged UI journey or screenshot is claimed
- Evidence download: `yourbuddy-v0.3.1-verification.zip` will be attached after its extracted contents are inspected

## User release notes

### What changed

YourBuddy 0.3.1 introduces the YourBuddy name and Y8 icon, updates the bundled Harness to DSH `0.1.2-rc.1`, makes Codex the discoverable default coding preset, and bundles Harbor Evolution `0.9.2`, Codex Auth `0.3.2`, Better Sidebar `0.18.0`, Plugin Marketplace `0.3.1`, and Context Doctor `0.7.0`.

General settings now provide application-wide proxy and enterprise CA controls, separate desktop and Node Host connection diagnostics, application restart and signed update actions, and safe external-link handling. Plugin Marketplace installation retains the selected package's state and actionable pnpm errors. Version 0.3.1 replaces the unpublished 0.3.0 candidate after correcting reproducible storage of reviewed external plugin bytes; no installable 0.3.0 artifact was published.

### Problem solved

Finder-launched macOS applications can apply the selected proxy and CA before the private Node Host starts, so Agent requests follow the intended network policy without disabling TLS verification. Chat and Marketplace HTTP/HTTPS links open in the system browser, and users can restart the application after installing a plugin without opening a terminal.

### Where to use it

Use **Settings → General** for Network proxy and Application lifecycle. Use **Settings → Plugin Marketplace** to inspect and install eligible DSH bundles. Select the **Codex** Agent Preset when starting a coding session.

### How to try it

1. Install YourBuddy and configure the required model credentials.
2. In **Settings → General**, select a system or custom proxy, optionally select a `.pem` or `.crt` CA, save, and restart.
3. Compare the desktop and current Node Host connection results.
4. Install an eligible package in **Plugin Marketplace**, then restart YourBuddy to load it.
5. Open or copy an HTTP/HTTPS link from a chat response.

### Install or upgrade

Download the Apple Silicon DMG from this GitHub Release after publication. YourBuddy has a new application identity and updater channel, so install it beside XiaoHui and configure credentials and settings again as needed. Existing XiaoHui data is neither imported nor deleted.

### Compatibility, migration, and limitations

The release target is macOS on Apple Silicon. The application has an ad-hoc signature but is not signed or notarized with an Apple Developer identity, so Gatekeeper rejects the downloaded App. Automatic XiaoHui migration and macOS Intel, Windows, or Linux installers are not provided. Harbor flows retain their documented Docker and provider prerequisites. Real GPT OAuth traffic, a real enterprise proxy and CA, signed in-app update installation, and the interactive installed-DMG UI remain unverified.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Failed 0.3.0 publication and recovery | passed | 0.3.0 tag plus 0.3.1 source commit | GitHub Actions macOS 15 and local macOS 15.6.1 arm64 | [0.3.0 archive](../yourbuddy-v0.3.0/README.md) and [local record](evidence/local-validation.txt) |
| 0.3.1 release preparation and product smoke | passed | source checkout at `de17171f970e43bd8c42d84a1cfeb386f5bc17c3` | macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0 | [Local validation record](evidence/local-validation.txt) |
| Desktop scripts and documentation | passed | source checkout | macOS 15.6.1 arm64 | [Local validation record](evidence/local-validation.txt) |
| Public release and packaged artifact | passed | `yourbuddy-v0.3.1` public DMG and updater archive | GitHub Actions macOS 15; independent macOS 15.6.1 arm64 download | [Public artifact record](evidence/public-artifacts.txt) |

## Scenario: Failed 0.3.0 publication and recovery

- Status: passed
- Date and time: 2026-09-06 13:43-14:04 UTC+08:00, Asia/Shanghai
- Release and commit: failed `yourbuddy-v0.3.0` at `78c8f97319fe5ce813c161917fcfcac97c53921c`; recovery commit `ba1738fe9a03f7d277c95a7dd2b4b42a826815ca`
- Build under test: the failed tagged workflow, the repaired worktree, and a clean archive exported from the recovery commit
- Environment: GitHub Actions macOS 15 arm64 with Node 24.20.0; local macOS 15.6.1 arm64 with Node 22.22.2
- Evidence origin: this release run
- Data: reviewed public package bytes and synthetic test fixtures; no user data
- Model or service: GitHub Actions and npm downloads; no model provider request

### Steps

1. Followed the 0.3.0 workflow until the App and DMG build rejected the Plugin Marketplace tree digest.
2. Compared the refresh worktree, committed Git blobs, and a clean `git archive`; the upstream CRLF files had been stored as LF.
3. Marked only external product snapshot directories as Git binary content, committed the upstream bytes, exported the new commit, and verified its tree digest.
4. Advanced the application version to 0.3.1 while leaving the 0.3.0 tag unchanged.

### Expected and actual

The clean exported Plugin Marketplace tree was expected to match the reviewed digest `c7555c06744ce9474da97a5048eb019935d4bd3e8b817b4ab0f4d66b22f9bdfa`. It matched, and `verifyExternalSnapshot` accepted the exported directory. First-party product and policy files remain under the repository LF rule.

### Evidence and scope limits

The [0.3.0 archive](../yourbuddy-v0.3.0/README.md) retains the failed workflow and observed mismatched digest. The [local record](evidence/local-validation.txt) records the recovery digest. This scenario proves reproducible source bytes, not a packaged installer.

## Scenario: 0.3.1 release preparation and product smoke

- Status: passed
- Date and time: 2026-09-06 13:58-14:18 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.1`, source commit `de17171f970e43bd8c42d84a1cfeb386f5bc17c3`
- Build under test: source checkout with generated bundled Harness, frozen offline pnpm Store, managed toolchain, and Python runtime
- Environment: macOS 15.6.1 arm64; Node 22.22.2; pnpm 11.7.0; DSH 0.1.2-rc.1; CPython 3.12.14
- Evidence origin: this release run
- Data: synthetic fixtures and package metadata; no user data
- Model or service: controlled keyless Host and Client smoke; npm downloads; no real model provider request

### Steps

1. Ran `pnpm --dir apps/desktop-tauri run prepare:release` from the clean recovery commit.
2. Rebuilt DSH and the web client, validated external product provenance, rebuilt the frozen Store and runtime, and ran assembled product smokes.
3. Retained the transient `@openai/codex` download failure and the successful bounded retry.

### Expected and actual

The operation was expected to pass the formerly failing snapshot check, keep every selected product compatible, assemble an offline Store, and expose every product and desktop control. It passed with 587 packages, 54 bundled Runtime Peer links, six assembled Client plugins, and successful branding, external-link, Plugin Marketplace, Network proxy, and Application lifecycle checks.

### Evidence and scope limits

The [local validation record](evidence/local-validation.txt) contains the bounded command results and digests. This source-level assembly does not prove publication, DMG installation, real OAuth traffic, a real enterprise certificate chain, or a non-macOS platform.

## Scenario: Desktop scripts and documentation

- Status: passed
- Date and time: 2026-09-06 13:49-13:58 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.1`, source changes culminating in `ba1738fe9a03f7d277c95a7dd2b4b42a826815ca`
- Build under test: source checkout and generated documentation
- Environment: macOS 15.6.1 arm64; Node 22.22.2; pnpm 11.7.0
- Evidence origin: this release run
- Data: synthetic fixtures; no user data
- Model or service: mocks and keyless controlled services only

### Steps

1. Ran all seven desktop script suites.
2. Ran release version verification for `yourbuddy-v0.3.1`.
3. Ran the complete documentation gate after updating the failure record and Agent Note.

### Expected and actual

All 88 desktop script tests passed after the current-version fixture was advanced from 0.3.0 to 0.3.1. The release version command printed `verify-release-version: yourbuddy-v0.3.1`, and all 32 documentation gates passed. The initial current-version fixture failure is retained in the local record as a corrected test expectation, not hidden as a clean first attempt.

### Evidence and scope limits

See the [local validation record](evidence/local-validation.txt). These are source, mock, and generated-document checks; no installed UI or real provider claim follows from them.

## Scenario: Public release and packaged artifact

- Status: passed
- Date and time: 2026-09-06 14:20-14:42 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.1`, tag commit `c4e316253959ddd71cb842775ef44ed5c9b6b292`
- Build under test: formally published GitHub Release DMG, updater archive, signature, checksum file, and updater manifests
- Environment: GitHub Actions macOS 15 arm64; independent macOS 15.6.1 arm64 download and inspection
- Evidence origin: this release run after publication
- Data: public release files and package metadata; no user data
- Model or service: GitHub Releases and YourBuddy updater channel; no model provider request

### Steps

1. Waited for [release workflow 34016228532](https://github.com/istarwyh/yourbuddy/actions/runs/34016228532) to finish every build, relocated-runtime, checksum, manifest, and publication step.
2. Queried the public [YourBuddy 0.3.1 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.1), then downloaded all five assets into a new temporary directory.
3. Verified the three entries in `SHA256SUMS.txt`, parsed `latest.json`, and compared it byte for byte with the separately downloaded stable-channel manifest.
4. Mounted the downloaded DMG read-only, inspected the App identity, and ran the packaged Harbor entry points.
5. Extracted a fresh updater archive, inspected the same identity and entry points, and verified its pristine ad-hoc signature before execution.

### Expected and actual

The public files were expected to carry version 0.3.1, match their checksums, expose a signed `darwin-aarch64` updater entry, contain `YourBuddy.app` with bundle id `io.github.istarwyh.yourbuddy`, and run the packaged Harbor commands. All checks passed. The versioned and stable updater manifests were identical. The pristine App passed strict ad-hoc signature verification, while Gatekeeper rejected it because it has no Apple Developer identity; that result matches the stated distribution limitation.

### Evidence and scope limits

The [public artifact record](evidence/public-artifacts.txt) lists asset sizes, SHA-256 values, App metadata, commands, failure recovery, and observed limits. This scenario does not claim an interactive installed-DMG UI journey, signed in-app update installation, real provider or enterprise-network behavior, notarization, migration, or another platform.

## Delivery status

- Product publication status: published; the Apple Silicon DMG, signed updater archive and signature, checksums, versioned manifest, and stable updater manifest are publicly downloadable and independently verified.
- Verification archive status: public artifact evidence is complete; the immutable evidence permalink and extracted verification download are pending.
- Unverified scope: interactive installed-DMG UI; signed in-app update installation; real GPT OAuth or model provider response; real enterprise proxy and CA; macOS Intel, Windows, and Linux; Apple Developer signing and notarization; automatic XiaoHui migration.

## Delivery checklist

- [x] User-facing changes, problem, location, and experience are described.
- [x] Installation, compatibility, migration, and limitations are stated.
- [x] Scenarios distinguish source, workflow, and formally published builds.
- [x] Dates, commits, environments, steps, expected and actual results, failures, and recovery are retained.
- [x] Evidence is sanitized and uses relative or immutable links.
- [x] No screenshot or complete product acceptance is claimed.
- [x] The version index and bilingual records are updated.
- [x] Public artifacts are downloaded and independently verified.
- [ ] The verification ZIP is extracted, inspected, and attached without replacing release assets.
- [ ] The release page links the immutable evidence commit and download.
