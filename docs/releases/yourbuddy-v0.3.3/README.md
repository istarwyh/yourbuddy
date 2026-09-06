# YourBuddy 0.3.3

English | [中文](README.zh.md)

- Release identifier: `yourbuddy-v0.3.3`
- Product channel: YourBuddy desktop
- Archive state: public assets, updater metadata, authenticated boot, live bilingual website, and downloadable verification bundle independently verified; formal-window screenshot unavailable
- Release tag commit: [`06c56e060c6f255a1c49c8943f86b43311d730cd`](https://github.com/istarwyh/yourbuddy/commit/06c56e060c6f255a1c49c8943f86b43311d730cd)
- Evidence gallery: no image is published because native UI automation failed during the formal installer run; the limitation is retained below
- Evidence download: [`yourbuddy-v0.3.3-verification.zip`](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.3/yourbuddy-v0.3.3-verification.zip)

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

Install the Apple Silicon DMG from the [YourBuddy 0.3.3 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.3), or use **Settings → General → Application lifecycle → Check for updates** in an earlier installation. Existing application data is retained; the signed-update journey from an older installed version was not exercised during publication verification.

### Compatibility, migration, and limitations

This release targets Apple Silicon on macOS 11 or later and requires no data migration. It keeps DSH `0.1.2-rc.1` and the existing reviewed product-plugin versions. The application is ad-hoc signed rather than signed or notarized with an Apple Developer identity, so first launch may require the documented macOS override. Windows, Linux, Intel macOS, OAuth, real model calls, and enterprise proxy/CA behavior are not validated by the local authentication scenario.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Public 0.3.2 failure and fixed installed-bundle path | passed | public 0.3.2 resources plus local release-mode fix | macOS 15.6.1 arm64, native WebKit | [Local record](evidence/local-validation.txt) |
| 0.3.3 release preparation and product smoke | passed | source `07b2440f5d...` | macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0 | [Local record](evidence/local-validation.txt) |
| Version, updater, Rust, desktop, documentation, and website checks | passed | source `07b2440f5d...` | macOS 15.6.1 arm64, Rust 1.98.0, Hugo Extended 0.165.0 | [Local record](evidence/local-validation.txt) |
| Packaged Runtime and CI release blockers | passed; 18 CI jobs succeeded after one retained Windows timing-failure attempt and clean rerun | source `86b620cd76...`, Node 24 native executables, installed wheels, Chromium, PowerShell 7.6.5 | macOS 15.6.1 arm64 plus CI carrier matrix | [Local record](evidence/local-validation.txt) and [published record](evidence/published-artifacts.txt) |
| Public installer and updater channel | passed within stated limits; public bytes, metadata, DMG contents, and authenticated boot checked | formal `yourbuddy-v0.3.3` GitHub Release | macOS 15.6.1 arm64, GitHub Release, native Tauri app | [Published record](evidence/published-artifacts.txt) |
| Updated bilingual website | passed | site commit `14f254b0d5...` | GitHub Pages and five live routes | [Published record](evidence/published-artifacts.txt) |
| Verification ZIP | passed; public asset downloaded, extracted, and opened | archive at `b216ee5850...` | GitHub Release and macOS Archive Utility-compatible ZIP | [Published record](evidence/published-artifacts.txt) |

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

## Scenario: Packaged Runtime and CI release blockers

- Status: passed; all 18 CI jobs completed successfully on attempt 2 after one retained Windows timing-failure attempt
- Date and time: 2026-09-06 23:35-2026-09-07 02:27 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.3`; release branch head `86b620cd76c41a35e65b6f58129c83b9cf8a1b0c`, merged as `06c56e060c6f255a1c49c8943f86b43311d730cd`
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
7. Examined the next CI run, pinned the shared browser page to the snapshot corpus timezone, and added an ordered Client Runtime roundtrip before the cross-carrier Console probe.
8. Inspected run `34049354876`: all four Runtime carriers and the corrected browser-timezone and Inspector paths passed, while the workflow navigation test opened a newly listed child before its prompt flush completed and real pwsh startup accepted stdin-wait evidence before its controlled prompt arrived.
9. Made workflow navigation wait for the child prompt persistence checkpoint, and made pwsh startup retain prompt evidence and the latest non-empty startup output until both the controlled prompt and stdin readiness have been observed.

### Expected

Optional peers that are not embedded in a pkg executable remain unavailable without stopping boot, malformed installed manifests still fail, and recorded protocol outputs match current permission and model-selection events.

### Actual

All four CI carriers reached `smoke-python-runtime: all passed`. Successive runs exposed deterministic ACP activation ordering, real PowerShell readiness and fixture layout, a runner-dependent browser timezone, a cross-carrier Inspector setup race, child-session persistence visibility, and pwsh prompt publication. The current source makes each assumption explicit. ACP validation passed 141 tests at 100% statement, branch, function, and line coverage; its 15-scenario replay passed twice. The Inspector integration file passed 10 tests plus four repeated focused probes, and the 12 previously failing browser files passed 65 tests under a UTC host timezone with two scenario skips. The workflow file passed all three scenarios in six complete local runs. The terminal-bash package passed 77 tests with one platform skip, and its real pwsh startup scenario passed eight additional consecutive invocations while retaining a non-empty controlled prompt. CI run `34052017963` completed all 18 jobs successfully on attempt 2.

### Evidence

- Before: the first pull-request CI run failed all four packaged Python Runtime targets with `ENOENT` for an unembedded optional peer manifest. The second run passed every carrier smoke but exposed the missing repository-scope condition on the paid provider preflight. Run `34046132810` passed all four carriers and exposed ACP ordering and coverage-fixture failures. Run `34047565623` again passed all four carriers, then exposed host-timezone dependence in persisted Web snapshots and the Inspector Console setup race in coverage. Run `34049354876` proved those fixes and all four carriers, then failed the workflow navigation and real pwsh startup races; its Windows native-test worker also exited after its visible assertions passed, which remains a failed infrastructure result until a clean rerun.
- In progress: the pkg build reported absent optional client peers while constructing the executable, exercising the affected package-discovery condition.
- Result: commands, target versions, test counts, installed-wheel output, and the final CI rerun are in the [local record](evidence/local-validation.txt) and [published record](evidence/published-artifacts.txt).
- Failure and recovery: an initial local snapshot run shared resources with coverage and inherited terminal proxy variables, so Undici warnings polluted subprocess stderr; the reliable serial replay cleared only the test process's terminal proxy variables. A later PowerShell refresh initially received a misplaced test filter and touched unrelated generated fixtures; those known temporary changes were restored individually. ACP activation now waits for topology-stable discovery and persistence, while the PowerShell check asserts documented usability rather than one timing tier. The Web replay fixes the historical snapshot timezone at browser-context creation, the Inspector test uses the ordered Client carrier as a setup barrier, and workflow navigation waits for durable child input. Pwsh startup no longer treats an early exact stdin wait as sufficient and does not lose a prior non-empty message when its final probe is empty. The complete local Web CI wrapper remains blocked on this host by a Node 22.22.2 `import-without-cache` HMR loader error; that HMR file passed in run `34049354876`, and the affected files were run directly rather than treating the wrapper failure as a product pass.

### Scope limits

The completed CI proves the keyless installed-wheel smoke on all four carrier targets and the aggregate repository verdict. The real DeepSeek provider is not verified by these checks; public desktop validation is recorded separately below.

## Scenario: Public product delivery

- Status: passed within stated limits; website update and verification ZIP pending
- Date and time: 2026-09-07 03:31-03:58 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.3` at `06c56e060c6f255a1c49c8943f86b43311d730cd`
- Build under test: files downloaded from the formal GitHub Release, then the DMG application copied to a temporary directory and launched with isolated data
- Environment: GitHub Actions macOS 15 arm64 runner; local macOS 15.6.1 arm64; Node 22.22.2 selected by the application; native Tauri WebView
- Evidence origin: this release run
- Data: synthetic isolated application state
- Model or service: GitHub Release and updater channel plus the local private Host; no OAuth or real model provider

### Steps

1. Merged pull request 11, tagged the merge commit, and waited for desktop release workflow `34055168580` to complete.
2. Downloaded every versioned Release asset rather than using workflow artifacts, checked the bundled checksum list, and compared the stable updater manifest with the versioned manifest.
3. Mounted the DMG read-only, inspected the application version, architecture, and code-signing metadata, then copied and launched the public application with a fresh isolated data directory.
4. Confirmed authenticated Host readiness, `boot complete`, and the 0.3.3 update-check result; attempted native window capture three times.

### Expected

The public artifacts identify 0.3.3, match their hashes and signature metadata, update the stable channel, and complete authenticated application boot without the 0.3.2 error.

### Actual

The public Release contains the DMG, updater archive, updater signature, checksum list, and manifest. All three files named by the checksum list passed SHA-256 verification. The DMG contains a version 0.3.3 arm64 application whose ad-hoc signature verifies structurally and whose Gatekeeper rejection matches the documented lack of Apple Developer signing and notarization. The isolated public-application launch reached authenticated readiness and boot completion without the reported authentication-required text. The UI automation service exited on all three capture attempts, so visible workspace rendering and a formal screenshot remain unverified.

### Evidence

- Before: the 0.3.2 release remained public and its installed authentication defect was recorded in its maintained archive.
- In progress: the desktop workflow verified Host startup and relocated Runtime execution before publication; independent checks then used only public Release downloads.
- Result: exact public filenames, sizes, hashes, manifest fields, application metadata, and bounded startup observations are in the [published record](evidence/published-artifacts.txt).
- Failure and recovery: native UI automation exited before returning state on three attempts, so no image was manufactured or retained. Interrupting the directly launched test application left its isolated Host process running; that exact temporary process was terminated and confirmed stopped without characterizing normal tray Quit or Restart behavior.

### Scope limits

The checks do not validate visual rendering for the formal binary, Finder copy into Applications, a signed update from an older installation, normal tray shutdown, OAuth, real model traffic, enterprise proxy/CA traffic, Windows, Linux, Intel macOS, Apple Developer signing, or notarization. The post-publication website and verification ZIP are completed separately.

## Scenario: Post-publication website

- Status: passed
- Date and time: 2026-09-07 04:09-04:10 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.3`; website content commit `14f254b0d57905f399cc39d649dee3d128081eca`
- Build under test: GitHub Pages deployment from the public `master` branch, not the local Hugo output
- Environment: GitHub Pages workflow and public HTTPS routes
- Evidence origin: workflow run `34057017123` and this release run's direct requests to the deployed site
- Data: public release copy and links; no account or user data
- Model or service: GitHub Pages and the public GitHub Release; no model provider

### Steps

1. Waited for the `YourBuddy website` workflow to build and deploy commit `14f254b0d57905f399cc39d649dee3d128081eca`.
2. Opened the Chinese and English home pages, both download pages, and the Chinese release-status page over public HTTPS.
3. Checked every response status, the displayed 0.3.3 version, and the release destination on the download and release-status pages.

### Expected

The live bilingual website advertises 0.3.3, exposes the public release journey, and links to the immutable `yourbuddy-v0.3.3` release rather than candidate copy.

### Actual

Workflow `34057017123` completed its build and deployment jobs successfully. All five inspected routes returned HTTP 200; the home and download pages displayed 0.3.3, and the download and release-status pages linked to the public 0.3.3 release.

### Evidence

- Before: the previous Pages deployment still described 0.3.3 as a candidate.
- In progress: the build ran the repository website check before uploading its Pages artifact; deployment completed without replacing the release tag or installer.
- Result: workflow and route details are retained in the [published record](evidence/published-artifacts.txt).
- Failure and recovery: an initial local shell probe used zsh's read-only `status` variable and stopped before requesting a page; the corrected probe used a non-reserved variable and completed all five public requests.

### Scope limits

This verifies deployed text, HTTP availability, version markers, and release destinations. It does not constitute visual browser acceptance, accessibility testing, or installer download and launch through the website UI.

## Scenario: Downloadable verification archive

- Status: passed
- Date and time: 2026-09-07 04:12-04:14 UTC+08:00, Asia/Shanghai
- Release and commit: `yourbuddy-v0.3.3`; bundled archive content from commit `b216ee585024f229d8f36d5a376939f6a5ca1c9a`
- Build under test: `yourbuddy-v0.3.3-verification.zip` downloaded from the public GitHub Release, not the local preflight file
- Environment: public GitHub Release, macOS 15.6.1 arm64, Info-ZIP `unzip`
- Evidence origin: this release run's public asset download and extraction
- Data: sanitized release notes and text evidence; no credentials, personal information, private business content, or screenshots
- Model or service: GitHub Release; no model provider

### Steps

1. Created a ZIP from the committed `docs/releases/yourbuddy-v0.3.3/` archive and preflight-extracted it into a new temporary directory.
2. Uploaded the ZIP once as a new Release asset without replacing the tag or any installer asset.
3. Downloaded the public asset into another new directory, ran a full compressed-data test, extracted it, and opened both language entry files.
4. Queried the public Release asset list and compared the six digests with the pre-upload installer and updater record.

### Expected

The public ZIP is readable, contains both release-note languages and the two evidence records, and leaves every previously published asset byte unchanged.

### Actual

The public ZIP is 28,949 bytes with SHA-256 `0f0269833ac2e24523375395210eeedcd3c4e8c84cbcf33daae1ff44b6b15043`. Its seven entries passed `unzip -t`; both release-note files and both evidence files were extracted and read. The five existing public asset digests remained unchanged.

### Evidence

- Before: the Release contained the five installer and updater assets recorded above and no verification ZIP.
- In progress: the local preflight archive and the independently downloaded public file produced the same SHA-256.
- Result: the public URL, size, digest, contained paths, and extraction result are retained in the [published record](evidence/published-artifacts.txt).
- Failure and recovery: no upload, download, integrity, or extraction failure occurred.

### Scope limits

The ZIP packages the archive at commit `b216ee585024f229d8f36d5a376939f6a5ca1c9a`; by design it cannot contain this later self-verification paragraph. The repository archive remains the authoritative current record.

## Delivery status

- Product publication status: published and independently checked; `yourbuddy-v0.3.3` provides the macOS arm64 DMG, signed updater archive and signature, checksum list, and versioned manifest, while the stable channel advertises the same 0.3.3 manifest.
- Verification archive status: complete within the recorded evidence limits; the public ZIP was downloaded, integrity-tested, extracted, and opened, and the Release page links to immutable evidence commit `1078e7a6690ce2a9f745832c64ecf93d3ef6c474`. A formal-window screenshot remains unavailable because the native UI automation service failed, and this is retained as an unverified visual scope rather than replaced with a synthetic image.
- Website synchronization status: deployed and checked; workflow `34057017123` published commit `14f254b0d57905f399cc39d649dee3d128081eca`, and five bilingual public routes returned HTTP 200 with the 0.3.3 release journey.
- Unverified scope: visible rendering of the formal binary, Finder installation, updater installation from an older version, normal tray shutdown, visual website acceptance, Windows desktop, WSL, Intel macOS, OAuth, real model calls, enterprise proxy/CA traffic, Apple Developer signing, and notarization.

## Delivery checklist

- [x] The release identifier and every version source match the existing channel procedure.
- [x] The opening notes answer what changed, the problem solved, where to use it, and how to try it.
- [x] Installation or upgrade, compatibility, migration, and known limitations are stated.
- [x] Every completed scenario records date, time zone, commit, environment, build under test, evidence origin, data type, and model or service type.
- [x] Steps, expected result, actual result, status, and scope limits match what was observed.
- [x] Source-only, controlled-copy, failed, recovered, and unverified evidence is labelled explicitly.
- [x] The release-shaped macOS Runtime and clean installed-wheel black-box path passed locally; all four carrier targets passed in final CI.
- [x] Only sanitized text evidence is tracked; credentials, personal information, private content, and sensitive originals are absent.
- [x] The release entry was added to the bilingual version index and relative links were checked locally.
- [x] A public verification ZIP has been downloaded, integrity-tested, extracted, and opened successfully.
- [x] The public release page links to the immutable evidence commit and download; no gallery is claimed because no trustworthy formal-window screenshot was captured.
- [x] The actual 0.3.3 product destination has been checked independently of CI and temporary workflow artifacts.
- [x] Published filenames, versions, hashes, updater metadata, and installed behavior have been recorded.
- [x] The bilingual product website has been deployed and its live version and release-link journey verified.
- [x] Product publication, archive, website, and unverified scope are reported separately.
- [x] Existing public tags and installers have not been moved or overwritten.
