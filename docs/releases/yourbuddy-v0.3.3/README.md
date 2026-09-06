# YourBuddy 0.3.3

English | [中文](README.zh.md)

- Release identifier: `yourbuddy-v0.3.3`
- Product channel: YourBuddy desktop
- Archive state: release candidate; local source, controlled installed-bundle, and release-shaped macOS Runtime verification complete, public artifacts pending
- Validated source commit: [`42560389464df9243ead52b81c6552a16f5675b7`](https://github.com/istarwyh/yourbuddy/commit/42560389464df9243ead52b81c6552a16f5675b7)
- Evidence gallery: pending a successful launch of the formally published installer
- Evidence download: pending publication of `yourbuddy-v0.3.3-verification.zip`

## User release notes

### What changed

YourBuddy 0.3.3 changes how the installed desktop application establishes its authenticated local workbench. Native startup now completes the one-time Host exchange and installs the validated session cookie before a same-site desktop shell opens the workbench.

### Problem solved

The public 0.3.2 macOS application could finish starting its private Host but display `dsh web authentication required`. Version 0.3.3 keeps the Host cookie strict while allowing macOS WebKit to send it to the embedded workbench.

### Where to use it

The fix applies automatically when YourBuddy starts. It does not add a setting or change the ordinary `dsh web` browser authentication policy.

### How to try it

Install or update to 0.3.3, launch YourBuddy from Finder, and wait for the main window. The workspace should render instead of the authentication-required message.

### Install or upgrade

After publication, install the Apple Silicon DMG from the [YourBuddy 0.3.3 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.3), or use **Settings → General → Application lifecycle → Check for updates** in an earlier installation. Existing application data is retained.

### Compatibility, migration, and limitations

This release targets Apple Silicon on macOS 11 or later and requires no data migration. It keeps DSH `0.1.2-rc.1` and the existing reviewed product-plugin versions. The application is ad-hoc signed rather than signed or notarized with an Apple Developer identity, so first launch may require the documented macOS override. Windows, Linux, Intel macOS, OAuth, real model calls, and enterprise proxy/CA behavior are not validated by the local authentication scenario.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Public 0.3.2 failure and fixed installed-bundle path | passed | public 0.3.2 resources plus local release-mode fix | macOS 15.6.1 arm64, native WebKit | [Local record](evidence/local-validation.txt) |
| 0.3.3 release preparation and product smoke | passed | source `07b2440f5d...` | macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0 | [Local record](evidence/local-validation.txt) |
| Version, updater, Rust, desktop, documentation, and website checks | passed | source `07b2440f5d...` | macOS 15.6.1 arm64, Rust 1.98.0, Hugo Extended 0.165.0 | [Local record](evidence/local-validation.txt) |
| Packaged Runtime and snapshot release blockers | all CI carrier smokes passed; final CI rerun pending after deterministic ACP and coverage-fixture fixes | source `4256038946...`, Node 24 native executables, installed wheels | macOS 15.6.1 arm64 plus CI carrier matrix | [Local record](evidence/local-validation.txt) |
| Public installer, updater channel, verification ZIP, and website | not verified | not yet published | GitHub Release and Pages | pending |

## Scenario: Installed desktop authentication

- Status: passed for the controlled fixed bundle; failed for public 0.3.2 as the negative control
- Date and time: 2026-09-06 21:30-23:05 UTC+08:00, Asia/Shanghai
- Release and commit: affected `yourbuddy-v0.3.2` at `bfd9af598ebf24018f8d699cb83e0be23a8b3a05`; fix `be8abfaedeb25f01632f1d50727be54e69d26d7e`
- Build under test: public `/Applications/YourBuddy.app` 0.3.2, then a temporary copy with the same resources and a local arm64 release-mode binary containing the fix
- Environment: macOS 15.6.1 arm64, native Tauri WebView, private Node Host on loopback, isolated application-data directory for the fixed copy
- Evidence origin: this release investigation and local execution
- Data: synthetic local workbench state; no credentials, account data, or user content retained
- Model or service: no model request; local Host authentication only

### Steps

1. Launched the public 0.3.2 application and confirmed that native readiness passed while the WebView displayed the authentication-required response.
2. Changed only the controlled browser shell host from `127.0.0.1` to `localhost` and reproduced the same 401, confirming the cross-site strict-cookie failure.
3. Built the fixed Rust binary in release mode with Tauri's custom protocol feature, placed it in a copy of the public application resources, ad-hoc signed that copy, and launched it with isolated application data.
4. Observed authenticated readiness, `boot complete`, and the visible YourBuddy workspace in the real macOS WebView.

### Expected

The installed application completes local authentication without exposing the process token to the renderer and shows the workbench at the clean Host root.

### Actual

Public 0.3.2 reproduced the reported 401. The fixed copied application rendered the workspace and its Host shut down after the controlled test. Native code retained only the validated strict cookie; the shell and Host shared the HTTP `127.0.0.1` site while remaining different origins.

### Evidence

- Before: the public failure text and native readiness state are summarized in the [local record](evidence/local-validation.txt); no credential-bearing capture was retained.
- In progress: the negative-control and release-mode build commands are listed in the [local record](evidence/local-validation.txt).
- Result: the real WebView result was inspected during the run; its temporary screenshot was deleted after review and is not presented as archived evidence.
- Failure and recovery: changing the copied cookie to `SameSite=None; Secure` did not pass macOS WebKit third-party-cookie policy; the final same-site loopback shell passed without weakening Host authentication.

### Scope limits

This scenario validates one controlled macOS arm64 application copy, not the final 0.3.3 GitHub installer. It does not validate Windows, WSL, Intel macOS, OAuth, real model calls, application updates, or enterprise proxy and CA paths.

## Scenario: 0.3.3 source and release preparation

- Status: passed
- Date and time: 2026-09-06 22:45-23:30 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.3`; source `07b2440f5dd4b3c8fb5c02d44d4c52ed983c54a0`
- Build under test: clean source checkout with generated release resources excluded from Git
- Environment: macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0, Rust 1.98.0, local loopback Host and headless Chromium
- Evidence origin: this release run
- Data: synthetic temporary profiles and workspaces
- Model or service: controlled local Host; no external model request

### Steps

1. Ran the networked compatible-product refresh and complete `prepare:release` flow on the final 0.3.3 version sources.
2. Ran the focused Rust authentication tests, the 41 desktop product tests, version and updater-manifest tests, Cargo locked checks, lint, bilingual documentation gates, and strict product website build.
3. Confirmed that release preparation found no compatible DSH or product-plugin update requiring a source commit.

### Expected

All version sources name 0.3.3, the offline product remains reproducible, the same-site shell passes the assembled browser journey, and no unreviewed plugin version enters the release.

### Actual

The version verifier printed `yourbuddy-v0.3.3`. Release preparation reported 54 bundled runtime peer links, six assembled Client plugins, and passing external-link, Plugin Marketplace, Network proxy, and Application lifecycle controls. The selected DSH and product versions remained unchanged.

### Evidence

- Before: `git status` was clean before each networked release-preparation run.
- In progress: pnpm rebuilt the 587-package offline Store and the relocatable Harbor runtime; bounded slow-download warnings were retained in the operator output.
- Result: exact commands and pass counts are in the [local record](evidence/local-validation.txt).
- Failure and recovery: two large npm tarballs initially returned pnpm download error 23; pnpm's bounded retry completed both downloads and the final offline install and product smoke passed. The first website build found no Hugo on the default `PATH`; rerunning with the previously checksum-verified official Extended 0.165.0 binary through `HUGO_BIN` passed.

### Scope limits

These are source, generated-resource, and controlled-browser checks. They do not prove that GitHub has built or published the final DMG and updater files.

## Scenario: Packaged Runtime and snapshot release blockers

- Status: all CI carrier smokes and focused local recovery checks passed; final cross-platform CI rerun pending
- Date and time: 2026-09-06 23:35-2026-09-07 01:03 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.3`; release-blocker fixes through `42560389464df9243ead52b81c6552a16f5675b7`
- Build under test: source profile traversal, generated Node 24.20.0 macOS arm64 single executable, and locally built SDK and Runtime wheels installed into a clean virtual environment
- Environment: macOS 15.6.1 arm64, build host Node 22.22.2, pnpm 11.7.0, target Node 24.20.0, Python 3.11.4, PowerShell 7.6.5; GitHub-hosted native carrier matrix
- Evidence origin: pull request 11's first CI run and this release run
- Data: synthetic snapshot fixtures and temporary Python SDK workspaces
- Model or service: recorded keyless model responses and local Host processes; no real model provider

### Steps

1. Inspected the first pull-request CI failures and traced the release-shaped Python Runtime crash to a pkg virtual dependency path whose optional peer manifest bytes were absent.
2. Changed fallback traversal to record a resolved dependency only after reading its manifest, while preserving fatal handling for malformed metadata; updated stale PowerShell policy recordings and ACP configuration-option outputs.
3. Ran focused profile tests with coverage, keyless snapshot replay, bilingual documentation gates, lint, and a Node 24 macOS single-executable build.
4. Built the SDK and Runtime wheels, installed both into a clean virtual environment, and ran every installed-wheel keyless black-box scenario.
5. Installed PowerShell locally, refreshed and replayed both PowerShell scenarios against the real executable, and restricted the paid provider steps to their owning official repository.
6. Reproduced the remaining CI-only ACP ordering and PowerShell readiness failures, made session activation topology-stable, canonically migrated the two PowerShell recordings, and reran their focused checks.

### Expected

Optional peers that are not embedded in a pkg executable remain unavailable without stopping boot, malformed installed manifests still fail, and recorded protocol outputs match current permission and model-selection events.

### Actual

All four CI carriers reached `smoke-python-runtime: all passed`. The latest completed run then exposed two independent deterministic-release blockers: an ACP setup notification whose position depended on provider activation timing, and a real PowerShell readiness assertion that required one specific readiness tier even though the session was usable. The current source keeps ACP sessions private until topology-stable discovery and persistence complete, accepts both documented real-shell readiness tiers, and canonically repacks the two changed PowerShell recordings. ACP validation passed 141 tests at 100% statement, branch, function, and line coverage; its 15-scenario replay passed twice. The focused real PowerShell scenario passed three times and the fixture-layout suite passed eight tests. A final CI run on the current commit remains pending.

### Evidence

- Before: the first pull-request CI run failed all four packaged Python Runtime targets with `ENOENT` for an unembedded optional peer manifest. The second run passed every carrier smoke but exposed the missing repository-scope condition on the paid provider preflight. Run `34046132810` passed all four carriers and exposed the remaining ACP ordering and coverage-fixture failures.
- In progress: the pkg build reported absent optional client peers while constructing the executable, exercising the affected package-discovery condition.
- Result: commands, target versions, test counts, and installed-wheel output are in the [local record](evidence/local-validation.txt).
- Failure and recovery: an initial local snapshot run shared resources with coverage and inherited terminal proxy variables, so Undici warnings polluted subprocess stderr; the reliable serial replay cleared only the test process's terminal proxy variables. A later PowerShell refresh initially received a misplaced test filter and touched unrelated generated fixtures; those known temporary changes were restored individually. The final CI evidence showed that removing the timing-dependent ACP notification was insufficient by itself, so session activation now waits for topology-stable discovery and persistence. The repeated PowerShell readiness result was changed to assert documented usability rather than one timing tier, and only its two recordings were passed through the canonical packed-session migration.

### Scope limits

Completed CI runs prove the keyless installed-wheel smoke on all four carrier targets. The aggregate required verdict on `4256038946...` remains pending, and focused local checks do not substitute for that run. The real DeepSeek provider and public desktop installer also remain unverified.

## Scenario: Public product delivery

- Status: not verified
- Date and time: 2026-09-06 23:30 UTC+08:00, Asia/Shanghai
- Release and commit: intended `yourbuddy-v0.3.3`; tag commit pending
- Build under test: no formally published 0.3.3 product exists yet
- Environment: planned GitHub Actions macOS 15 arm64 runner and GitHub Pages
- Evidence origin: this release run
- Data: not applicable
- Model or service: GitHub Release, updater channel, and Pages; not yet exercised

### Steps

1. Publish the immutable tag through the existing desktop release workflow.
2. Download and inspect the DMG, updater archive, signature, checksums, updater manifest, verification ZIP, and installed application independently of CI.
3. Publish and open the bilingual website pages and their actual download links.

### Expected

The public artifacts identify 0.3.3, match their hashes and signature metadata, update the stable channel, and launch to the authenticated workspace.

### Actual

Not verified before tag publication. This section must be updated from observed public assets and installed behavior without moving the tag or replacing installer bytes.

### Evidence

- Before: the 0.3.2 release remains public and its installed authentication defect is recorded in its maintained archive.
- In progress: pending the desktop release workflow.
- Result: pending public artifact and website records.
- Failure and recovery: not applicable yet.

### Scope limits

No public product or website claim is made by this candidate section.

## Delivery status

- Product publication status: pending; no `yourbuddy-v0.3.3` Release or stable updater entry has been verified.
- Verification archive status: partial; local authentication and release-shaped macOS Runtime evidence are present, while the published artifact record, installed-product screenshot, verification download, and download re-extraction are pending.
- Website synchronization status: pending; candidate and 0.3.2 defect copy is prepared, but 0.3.3 availability must not be promoted until public assets pass independent verification.
- Unverified scope: final public DMG installation, updater installation, verification ZIP, live website, Windows, WSL, Intel macOS, OAuth, real model calls, enterprise proxy/CA, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] Every completed scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and model or service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Source-only, controlled-copy, failed, recovered, and unverified evidence is labelled explicitly.
- [x] The release-shaped macOS Runtime and clean installed-wheel black-box path passed locally; other target platforms remain assigned to CI.
- [x] Only sanitized text evidence is tracked; credentials, personal information, private content, and sensitive originals are absent.
- [x] The release entry was added to the bilingual version index and relative links were checked locally.
- [ ] A public verification ZIP has been downloaded, extracted, and opened successfully.
- [ ] The public release page links to the immutable evidence commit, gallery, and download.
- [ ] The actual 0.3.3 product destination has been checked independently of CI and temporary workflow artifacts.
- [ ] Published filenames, versions, hashes, updater metadata, and installed behavior have been recorded.
- [ ] The bilingual product website has been deployed and its live download journey verified.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [x] Existing public tags and installers have not been moved or overwritten.
