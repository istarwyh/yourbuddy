# YourBuddy 0.3.0

English | [中文](README.zh.md)

- Release identifier: `yourbuddy-v0.3.0`
- Product channel: YourBuddy desktop
- Archive state: pre-publication validation complete; public artifact verification pending
- Evidence commit: source validation ran at `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae`; the post-publication commit permalink will be added without moving the tag
- Evidence gallery: not applicable; this run did not claim a packaged UI journey and did not create screenshots
- Evidence download: a dedicated `yourbuddy-v0.3.0-verification.zip` will be attached after public artifact verification

## User release notes

### What changed

YourBuddy 0.3.0 introduces the YourBuddy name and Y8 icon, updates the bundled Harness to DSH `0.1.2-rc.1`, makes Codex the discoverable default coding preset, and refreshes the bundled products to Harbor Evolution `0.9.2`, Codex Auth `0.3.2`, Better Sidebar `0.18.0`, Plugin Marketplace `0.3.1`, and Context Doctor `0.7.0`.

The General settings now include application-wide proxy and enterprise CA controls, separate desktop and Node Host connection diagnostics, application restart and signed update actions, and safe external-link handling. Marketplace installation keeps the selected package's status and actionable pnpm errors, and newly installed plugins can be loaded with the application restart control.

### Problem solved

Finder-launched macOS applications can now apply a configured proxy and CA before starting the private Node Host, so Agent requests use the same intended network policy as desktop diagnostics without disabling TLS verification. Chat and Marketplace links can open in the system browser through an HTTP/HTTPS allowlist, and the product can restart without requiring a terminal after a plugin installation.

### Where to use it

Use **Settings → General** for Network proxy and Application lifecycle. Use **Settings → Plugin Marketplace** to inspect and install eligible DSH bundles. Select the **Codex** Agent Preset when starting a coding session; Markdown links appear in assistant messages and Marketplace detail panels.

### How to try it

1. Install and open YourBuddy, then configure the required model credentials.
2. In **Settings → General**, select the system proxy or a custom proxy, optionally select a `.pem` or `.crt` CA, save, and restart.
3. Compare the desktop and current Node Host connection results.
4. Open **Plugin Marketplace**, install an eligible package, and use **Restart YourBuddy** to load it.
5. Open an HTTP/HTTPS link from a chat response; use the context menu to copy the address when needed.

### Install or upgrade

Download the Apple Silicon DMG from the GitHub Release after publication. This is a product-identity transition from XiaoHui: install YourBuddy beside XiaoHui, then configure credentials and settings again as needed. The signed updater channel begins with YourBuddy and does not migrate an existing XiaoHui installation.

### Compatibility, migration, and limitations

The release target is macOS on Apple Silicon. YourBuddy uses its own application ID, data directory, runtime resources, release assets, and updater channel; existing XiaoHui data is neither imported nor deleted. The application is not signed or notarized with an Apple Developer identity. Automatic XiaoHui data migration, macOS Intel, Windows, and Linux installers are not provided. Harbor flows require their documented Docker and provider prerequisites. Real GPT OAuth traffic, a real enterprise proxy/CA, and a formally installed DMG remain unverified in the pre-publication source run.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Release preparation and assembled product smoke | passed | source checkout at `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae` | macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0 | [Local validation record](evidence/local-validation.txt) |
| Static, script, and native checks | passed | source checkout | macOS 15.6.1 arm64, Rust 1.98.0 | [Local validation record](evidence/local-validation.txt) |
| GitHub Release and installed artifact | not verified | formally published product | GitHub Release and clean macOS installation | Pending tag workflow and independent download |

## Scenario: Release preparation and assembled product smoke

- Status: passed
- Date and time: 2026-09-06 13:15-13:20 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.0`, version `0.3.0`, source commit `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae`
- Build under test: source checkout with locally generated bundled Harness, frozen offline pnpm Store, managed toolchain, and Python runtime
- Environment: macOS 15.6.1 arm64; Node 22.22.2; pnpm 11.7.0; DSH 0.1.2-rc.1; CPython 3.12.14 generated for the product runtime; network access to GitHub and npm
- Evidence origin: this release run
- Data: synthetic test fixtures and package metadata; no user data
- Model or service: controlled keyless Host/Client smoke; no real model provider request

### Steps

1. Ran `pnpm --dir apps/desktop-tauri run prepare:release` from a clean isolated release worktree.
2. Allowed the command to resolve current DSH and product sources, build DSH, regenerate the frozen product lockfile and offline Store, assemble the Python runtime, and run the product smoke.
3. Committed the regenerated lockfile and reran the release version check for `yourbuddy-v0.3.0`.

### Expected

The newest eligible DSH and product inputs remain compatible; the frozen offline install succeeds; the assembled Host and Client expose all bundled products and desktop controls; the version sources match the intended tag.

### Actual

The command selected DSH `0.1.2-rc.1`, retained the documented product versions, generated a Store covering 587 packages, and passed branding plus release smokes. The final release smoke reported 54 bundled runtime peer links, six assembled Client plugins, external links, Plugin Marketplace, Network proxy, and Application lifecycle controls passed. The tag/version check printed `verify-release-version: yourbuddy-v0.3.0`.

### Evidence

- Before: the release branch was clean at the source commit; the checked-in DSH provenance selected `dsh-v0.1.2-rc.1`.
- In progress: [Local validation record](evidence/local-validation.txt) records the build, frozen Store, and runtime preparation summaries.
- Result: [Local validation record](evidence/local-validation.txt) records the final product-smoke summary and exit status.
- Failure and recovery: not applicable to this scenario; no preparation step failed in the final run.

### Scope limits

This source-level assembled smoke does not prove a signed updater download, DMG installation, real GPT OAuth request, real enterprise certificate chain, or non-macOS platform.

## Scenario: Static, script, and native checks

- Status: passed
- Date and time: 2026-09-06 13:20-13:26 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.0`, version `0.3.0`, source commit `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae`
- Build under test: source checkout and locally built TypeScript/Rust test artifacts
- Environment: macOS 15.6.1 arm64; Node 22.22.2; pnpm 11.7.0; rustc and cargo 1.98.0
- Evidence origin: this release run
- Data: synthetic fixtures; no user data
- Model or service: mocks and keyless controlled services only

### Steps

1. Ran the seven desktop script suites for updater manifests, release versions, source bundling, product refresh, release preparation, offline assembly, and overlay behavior.
2. Ran `pnpm run typecheck`, `pnpm run lint`, and `pnpm run hygiene`.
3. Ran `cargo test --locked --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml`.

### Expected

Every selected gate exits zero and the desktop native tests retain proxy, enterprise CA, link policy, lifecycle, updater, provisioning, and product-identity behavior.

### Actual

All 88 desktop script tests passed. Typecheck and lint exited zero. Hygiene initially found that generated desktop bundles and reviewed external product snapshots were being scanned as DSH source; the release branch added narrow exclusions while retaining first-party Personal Workbench coverage, then 14 focused gate tests and all 15 hygiene leaves passed. All 114 Rust tests passed; compiler warnings were retained and did not fail the suite.

### Evidence

- Before: [Local validation record](evidence/local-validation.txt) preserves the two initial hygiene failures and their affected categories.
- In progress: the source-gate exclusions were limited to the generated Bundle and named external product snapshots; a focused test proves first-party product executables remain checked.
- Result: [Local validation record](evidence/local-validation.txt) records zero exits and test counts.
- Failure and recovery: the same record preserves the initial `application entrypoints` and `vendor rescope` failures and the successful rerun after the scoped fix.

### Scope limits

These checks validate source and locally built test artifacts. They do not constitute a packaged UI acceptance test, formal installer validation, Apple notarization check, or live provider/network test.

## Scenario: Public release and installed artifact

- Status: not verified
- Date and time: 2026-09-06 13:26 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.0`, version `0.3.0`; tag commit pending
- Build under test: no formally published product yet
- Environment: intended GitHub Release workflow on macOS 15 arm64; independent download environment pending
- Evidence origin: this release run, pending publication
- Data: not applicable
- Model or service: GitHub Releases and the YourBuddy updater channel; not yet queried after publication

### Steps

1. Publish the exact annotated `yourbuddy-v0.3.0` tag after the archive and pre-release gates are committed.
2. Wait for the macOS workflow to publish the DMG, updater archive, signature, checksums, and stable updater manifest.
3. Download the public assets independently, verify checksums and manifest URLs, inspect the App version, and run the relocated Harbor entry points.

### Expected

Every documented asset is publicly downloadable, checksums match, updater metadata selects 0.3.0, and the extracted runtime executes its Harbor entry points.

### Actual

Not verified before tagging. This section will be updated in a later commit without moving the public tag or replacing versioned assets.

### Evidence

- Before: source and local release preparation evidence is recorded above.
- In progress: pending tag workflow.
- Result: pending public download and inspection.
- Failure and recovery: not applicable yet.

### Scope limits

No product publication claim is made by this pre-tag record.

## Delivery status

- Product publication status: not yet published; local release candidate preparation and checks passed.
- Verification archive status: partial; pre-publication evidence is committed here, while the immutable evidence commit permalink, public artifact evidence, and downloadable verification archive remain pending.
- Unverified scope: formally installed DMG UI journey; real GPT OAuth/provider response; real enterprise proxy and CA; macOS Intel, Windows, and Linux; Apple Developer signing and notarization; automatic XiaoHui migration.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated when applicable.
- [x] Every completed scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and model or service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Useful before, in-progress, result, failure, and recovery states are retained without imposing a screenshot quota.
- [x] Source-only, synthetic-data, mock, skipped, failed, and unverified evidence is labelled explicitly.
- [x] No screenshot is claimed; logs and source references are bounded and traceable.
- [x] Only sanitized evidence is tracked; credentials, personal information, private content, proxy addresses, and private workspace paths are absent.
- [x] The release entry was added to `docs/releases/README.md` and both language files were confirmed consistent.
- [x] Relative links render and every referenced local file exists.
- [ ] The downloadable evidence archive was extracted and its documented contents were opened successfully.
- [ ] The public release page links to the evidence commit and download without relying on a moving branch.
- [ ] The actual product destination was checked independently of CI and temporary workflow artifacts.
- [ ] Published filenames, versions, hashes, updater metadata, and installed behavior are recorded.
- [x] Product publication status, verification archive status, and unverified scope are reported separately.
- [x] Public tags and installers have not been moved or overwritten; corrections require a new version.
