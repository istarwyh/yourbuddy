# YourBuddy 0.3.5

English | [中文](README.zh.md)

This archive records the 0.3.5 desktop correction and its release evidence. Source, assembled-runtime, Tauri Runtime Authority, public-file integrity, updater signature, App identity, relocated-runtime, and public-website checks passed. Native startup, packaged-WebView interaction, and real-provider Codex delegation remain unverified; the downloadable archive remains pending until it is uploaded and independently extracted.

- Release identifier: `yourbuddy-v0.3.5`.
- Product channel: YourBuddy desktop for macOS Apple Silicon; npm, Python, SDK, and other release channels are not applicable.
- Archive state: public artifact, runtime, failure/recovery, and deployed-website evidence recorded; downloadable ZIP pending.
- Tested product commits: [`7db4fbfbc11d802ca81768498d0474427c207f97`](https://github.com/istarwyh/yourbuddy/commit/7db4fbfbc11d802ca81768498d0474427c207f97) for the product correction, [`077b96c9e704d45a82048c07fcb165d68a9a338d`](https://github.com/istarwyh/yourbuddy/commit/077b96c9e704d45a82048c07fcb165d68a9a338d) for the Codex lifecycle-test correction, and [`fbe8b947cdfce30275bdf2cb5af68677d060725a`](https://github.com/istarwyh/yourbuddy/commit/fbe8b947cdfce30275bdf2cb5af68677d060725a) for the independent Windows resource-test corrections. [PR #14](https://github.com/istarwyh/yourbuddy/pull/14) merged them as [`9dcaca57512fb628705a37181792c6861591078e`](https://github.com/istarwyh/yourbuddy/commit/9dcaca57512fb628705a37181792c6861591078e). The immutable release tag targets [`9491b9ddbeda08f97183387e91d00d86af3e4701`](https://github.com/istarwyh/yourbuddy/commit/9491b9ddbeda08f97183387e91d00d86af3e4701); [PR #16](https://github.com/istarwyh/yourbuddy/pull/16) published the initial evidence and website as [`aaa47c6757cd8258932a68ffa559d12e3d5b91e5`](https://github.com/istarwyh/yourbuddy/commit/aaa47c6757cd8258932a68ffa559d12e3d5b91e5).
- Evidence gallery: not applicable; no current installed-application screenshots were successfully captured.
- Evidence download: pending final website evidence, upload, anonymous download, and extraction verification.

## User release notes

### What changed

YourBuddy 0.3.5 restores desktop settings and link controls that the application permission layer rejected. It also ensures that an ordinary Codex Preset delegation uses the bundled, tracked `subagent_codex` integration even when the separately installed `codexhost-delegation` skill exists in the user's global skill directory.

### Problem solved

Network proxy testing, CA selection, save-and-restart, update checks, application restart, close preference, external links, and Plugin Marketplace links previously reached the desktop shell but could be rejected before their Rust handlers ran. Codex delegation could independently select a global skill that expected a nonexistent `codexhost` executable and fail with exit code 127. The corrected composition authorizes the known desktop commands only for the exact application-owned shell and removes the conflicting skill from autonomous model routing without deleting or rewriting user files.

### Where to use it

Use the affected controls under **Settings → Network proxy** and **Settings → General → Application lifecycle**, external Markdown and Marketplace links, and ordinary delegation requests in the Codex Preset. Explicit `/codexhost-delegation` remains available when the user intentionally wants that external integration.

### How to try it

1. Open **Settings → Network proxy**, load or edit settings, run both connectivity tests, and save and restart.
2. Open **Settings → General → Application lifecycle**, check for updates or restart YourBuddy.
3. Open an external Markdown or Marketplace link.
4. In a Codex Preset session, ask the Agent to delegate a task to Codex without naming an external skill. The request should use the tracked native subagent route rather than run `codexhost`.

### Install or upgrade

The [0.3.5 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.5) contains the independently downloaded and checked Apple Silicon DMG, updater archive, signature, checksums, and manifest. Install the DMG or use **Settings → General → Application lifecycle → Check for updates** from an earlier installation; an actual update from 0.3.4 remains unverified.

### Compatibility, migration, and limitations

The desktop targets macOS 11 or later on Apple Silicon. Existing application data is retained and no data migration is required. The bundled DSH and product-plugin versions are unchanged from 0.3.4. The application is not Apple Developer signed or notarized, so first launch may require the documented macOS override. Source and assembled-runtime checks do not establish that the packaged WebView controls or a real OAuth-backed Codex request passed; those limits remain explicit below.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Skill routing policy | passed | source at tested product commit | macOS arm64, Node 22.22.2, pnpm 11.7.0 | 34 focused cases; [local record](evidence/local-candidate-validation.txt) |
| Assembled model-facing output | passed | real base application composition from source | macOS arm64, controlled keyless transport | one expected-output snapshot; [local record](evidence/local-candidate-validation.txt) |
| Desktop command inventory and browser bridge | passed within source-only limits | source and controlled browser smoke | macOS arm64, Node 22.22.2 | 43 desktop product cases; [local record](evidence/local-candidate-validation.txt) |
| Tauri command authorization | passed | real Tauri Runtime Authority from source | macOS 15.6.1 arm64, Rust 1.98.0 | exact origin/window allow and negative controls; [local record](evidence/local-candidate-validation.txt) |
| Complete local release preparation | passed | locally assembled 0.3.5 candidate, not an installer | macOS arm64, bundled production dependency tree | 54 peer links, six Clients, offline reinstall, Host smoke; [local record](evidence/local-candidate-validation.txt) |
| Full pull-request CI and Windows failure corrections | passed | source at `fbe8b947cd...` | GitHub-hosted Linux, macOS, and Windows matrix | [CI run 34149979672](https://github.com/istarwyh/yourbuddy/actions/runs/34149979672): 19/19 jobs passed, including Windows coverage; [local record](evidence/local-candidate-validation.txt) |
| Documentation checks | passed | source documentation | macOS arm64, Node 22.22.2 | 32 `doc-sync` gates; [local record](evidence/local-candidate-validation.txt) |
| Product website | passed locally and live | deployed source at `aaa47c6757...` | Hugo Extended 0.165.0, Go 1.27.1, GitHub Pages, Chrome CDP, unauthenticated HTTP | 70 local tests; six bilingual public pages and their release/download targets passed; [local record](evidence/website-local-validation.txt), [deployment record](evidence/website-deployment.txt), [workflow 34166789739](https://github.com/istarwyh/yourbuddy/actions/runs/34166789739) |
| Public files and updater signature | passed | five anonymously downloaded release assets | macOS arm64; GitHub Release and stable updater channel | 3/3 checksums, five API digests, byte-identical manifests, and Minisign verification; [artifact record](evidence/public-artifact-stage.json) |
| Public App and relocated runtime | passed within recorded scope | unchanged App from public DMG | macOS 15.6.1 arm64 | DMG/Updater trees identical; identity, strict ad-hoc signature, CLI and imports passed; [runtime record](evidence/public-runtime-stage.json) |
| Native startup and packaged WebView controls | not verified | public 0.3.5 App was not launched | existing user-owned 0.3.4 instance prevented isolation | no screenshot or startup claim; [skipped observation](evidence/public-native-startup.txt) |
| Real Codex OAuth delegation | not verified | public 0.3.5 App | no real account or provider request used | catalog, loader, public bundle composition, and native binary strings only |
| Product publication | passed | `yourbuddy-v0.3.5` | GitHub Release | formal latest Release with five public assets; [artifact record](evidence/public-artifact-stage.json) |
| Public release archive CI | passed | post-tag archive source at `f3589a5b2a...`; not part of the 0.3.5 App bytes | GitHub-hosted Linux, macOS, and Windows matrix | [CI run 34165009131](https://github.com/istarwyh/yourbuddy/actions/runs/34165009131): 19/19 jobs passed after retaining three failed predecessor runs in PR #16 |

## Scenario: Codex delegation routing

- Status: passed for the model-facing catalog, loader policy, explicit invocation, and assembled keyless output; real OAuth/provider delegation is not verified.
- Date and time: 2026-09-08 00:40–00:41 UTC+08:00, Asia/Shanghai.
- Release and commit: `yourbuddy-v0.3.5` candidate at tested product commit `7db4fbfbc11d802ca81768498d0474427c207f97`.
- Build under test: source checkout and real assembled base-application fixture, not a DMG or installed App.
- Environment: macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0.
- Evidence origin: this release run. The reported installed 0.3.4 Session was inspected only to identify the competing routes; private paths, conversation content, account data, and credentials are absent from this archive.
- Data: synthetic skill definitions and messages.
- Model or service: controlled keyless transport; no real OpenAI, Codex OAuth, or paid model request.

### Steps

1. Registered a reserved `codexhost-delegation` skill and an ordinary skill, then composed the model catalog.
2. Attempted a direct model-facing load of the reserved skill and an explicit user `/codexhost-delegation` invocation.
3. Booted the real base application with an installed `dsh-badge` skill reserved through deployment configuration and captured its provider summary, model catalog, and loader result.
4. Assembled the complete YourBuddy overlay with the bundled native Codex provider.

### Expected

The reserved skill stays absent from autonomous model routing and cannot disclose its instructions through the model loader. Ordinary skills remain available, explicit user invocation still works, and YourBuddy retains its bundled `subagent_codex` provider.

### Actual

All 34 focused package cases passed. The reserved name and description were absent from the model catalog; its model-facing load returned the policy error without the skill body; the ordinary skill remained; explicit `/codexhost-delegation` injected its instructions. The assembled expected-output snapshot passed and the complete product smoke loaded the overlay and bundled native Codex provider.

### Evidence

- Before: the sanitized diagnosis established that the installed request exposed both `subagent_codex` and the global skill, and that the model selected the latter before exit 127; the private Session itself was not archived.
- In progress: the focused package test exercised automatic and explicit paths independently.
- Result: exact commands and counts are in the [local candidate record](evidence/local-candidate-validation.txt).
- Failure and recovery: two incorrect snapshot invocations selected the wrong test configuration; one also captured ambient proxy warnings in stderr. Neither result was treated as product evidence. The corrected expected-output command removed ambient proxy variables and passed one selected test.

### Scope limits

This proves the configured catalog and loader behavior and the presence of the native provider. It does not prove model choice quality in every prompt, a successful child process with a real OAuth account, network reachability, token handling, or an installed-product journey.

## Scenario: Desktop shell authorization

- Status: passed for exact command parity, browser message-to-command selection, and real Tauri Runtime Authority resolution; packaged-WebView exercise remains not verified.
- Date and time: 2026-09-07 23:52 through 2026-09-08 00:41 UTC+08:00, Asia/Shanghai.
- Release and commit: `yourbuddy-v0.3.5` candidate at tested product commit `7db4fbfbc11d802ca81768498d0474427c207f97`.
- Build under test: source Rust application manifest and controlled browser smoke, not a published installer.
- Environment: macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0, rustc/cargo 1.98.0.
- Evidence origin: this release run.
- Data: synthetic settings and URLs; no proxy credentials, certificate contents, or personal data.
- Model or service: not applicable.

### Steps

1. Extracted every literal `invoke()` command from the remote shell, compared it with the application permission allowlist, and checked that every command is registered.
2. Ran the desktop bridge and product tests with controlled native responses.
3. Loaded the generated Tauri manifest into Runtime Authority, granted the dynamic capability, and resolved every command for the exact runtime-owned origin and `main` window.
4. Repeated resolution with another loopback port and another window as negative controls.

### Expected

The shell command set and permission set are exactly equal. Each command is allowed only for the application-owned remote origin and `main` window; another origin, port, or window is denied.

### Actual

The static parity gate and 43 desktop product cases passed. The exact Runtime Authority test passed all nine commands and both negative conditions. The release workflow now runs both gates after the application build.

### Evidence

- Before: Issue 13 and the post-mortem retain the installed ACL rejection and show that the request never reached the Rust handler.
- In progress: the parity and authority tests exercised distinct bridge and authorization layers.
- Result: exact commands and exit results are in the [local candidate record](evidence/local-candidate-validation.txt).
- Failure and recovery: a mistyped Rust filter ran zero tests and was discarded; the exact fully qualified test was rerun and passed one test. Native window automation failed three times with `-10005: codex app-server exited before returning a response`, so no installed-App screenshot or control claim was created.

### Scope limits

JavaScript invoke stubs do not prove native authorization, and Runtime Authority does not prove visual control behavior. The packaged WebView must still exercise the affected controls after public App creation; until then the installed UI path is not verified.

## Scenario: Local release candidate assembly

- Status: passed after the recorded interrupted attempt and recovery.
- Date and time: 2026-09-08 00:04–00:31 UTC+08:00, Asia/Shanghai.
- Release and commit: pre-commit 0.3.5 file tree subsequently committed as `7db4fbfbc11d802ca81768498d0474427c207f97`.
- Build under test: locally assembled product runtime and Host smoke, not a signed updater, DMG, or public download.
- Environment: macOS 15.6.1 arm64, Node 22.22.2, pnpm 11.7.0; production dependencies resolved from the release lock and then reinstalled offline.
- Evidence origin: this release run.
- Data: synthetic smoke inputs and isolated product directories.
- Model or service: controlled local Host; no real provider request.

### Steps

1. Built 220 Client artifacts and bundled the current Harness source.
2. Prepared the frozen production dependency tree, then removed and reinstalled all 587 packages from the offline store with zero downloads.
3. Validated 54 runtime peer links and six assembled Client plugins.
4. Booted the Host and exercised external-link, Marketplace, proxy, lifecycle, and assembled Client smoke paths before normal shutdown.

### Expected

The release candidate is internally consistent, reinstallable offline after cache preparation, contains the configured Codex routing policy and native provider, and shuts down normally.

### Actual

The completed preparation passed. The local bundle and store hashes are retained in the evidence file. The first attempt was interrupted while downloading `@openai/codex`, leaving an incomplete bundled dependency tree; a later Rust build correctly failed because the platform package was absent. A complete preparation downloaded the missing production package, repeated the offline reinstall and all smokes, and restored a passing candidate. The first Pull Request CI run later exposed the Codex test teardown budget; the second confirmed that correction but exposed independent Windows `EACCES` port selection and polling-based cache-fixture failures. All three failed observations remain in the record. The third run completed the same topology successfully with 19/19 jobs, including Windows coverage.

### Evidence

- Before: incomplete dependency-tree failure retained in the [local record](evidence/local-candidate-validation.txt).
- In progress: online cache population followed by the zero-download offline reinstall.
- Result: hashes, file counts, peer links, Client count, and smoke result in the [local record](evidence/local-candidate-validation.txt).
- Failure and recovery: the interrupted preparation and missing `@openai/codex-darwin-arm64` failure were not hidden or counted as passing; the complete rerun is the passing result. Two documentation attempts also hung in a faulty optional local PowerShell probe; rerunning with that optional executable absent from process `PATH` passed all 32 document gates without changing product code. CI runs 34144640990 and 34147385017 remain failed negative controls; neither is described as a successful retry.

### Scope limits

Local assembly and pull-request CI do not validate GitHub Release files, updater metadata or signature, Apple signing/notarization, a Finder installation, upgrade from an earlier App, visual WebView behavior, enterprise proxy/CA traffic, OAuth, or real-model execution.

## Scenario: Pull-request matrix and merge

- Status: passed; all 19 jobs in the final main CI run completed successfully, including Windows coverage.
- Date and time: 2026-09-08 02:01–02:32 UTC+08:00, Asia/Shanghai; merge completed at 02:33:56 UTC+08:00.
- Release and commit: CI tested `fbe8b947cdfce30275bdf2cb5af68677d060725a`; [PR #14](https://github.com/istarwyh/yourbuddy/pull/14) merged as `9dcaca57512fb628705a37181792c6861591078e`.
- Build under test: pull-request source and CI-produced test artifacts, not a public DMG or updater.
- Environment: GitHub-hosted Linux, macOS, and Windows runners across the repository matrix.
- Evidence: [CI run 34149979672](https://github.com/istarwyh/yourbuddy/actions/runs/34149979672) and the preserved [local candidate record](evidence/local-candidate-validation.txt).

The final run passed Node 24 static, exhaustive Linux and Windows coverage, snapshots and artifacts, compatibility lanes, Windows native/build/Wine/observational lanes, all four release-shaped Python runtime platforms, Python SDK, and Landlock-dependent upstream checks. The earlier failed runs remain negative evidence and were not rerun unchanged: each resulted in a scoped correction before this final run.

The Cloudflare Pages preview run `34149979539` was cancelled because the repository reported zero self-hosted runners while that job required `dsh-ubuntu-24-04-16core`. It did not run and is not counted as passed. Product publication and website deployment remain separate release stages.

## Scenario: Independent public artifact verification

- Status: passed for anonymous availability, complete-file integrity, published checksums, stable updater metadata, and the cryptographic updater signature.
- Date and time: 2026-09-08 03:40–03:47 UTC+08:00, Asia/Shanghai.
- Release and build: all five assets from [`yourbuddy-v0.3.5`](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.5), tag commit `9491b9ddbeda08f97183387e91d00d86af3e4701`, produced by [workflow 34155089709](https://github.com/istarwyh/yourbuddy/actions/runs/34155089709).
- Method: downloaded all files without GitHub authentication, compared byte counts and SHA-256 values with GitHub's API digests, checked all three entries in `SHA256SUMS.txt`, and compared stable and versioned updater manifests.
- Cryptographic check: `minisign-verify` 0.2.5 verified the updater archive's prehashed signature and trusted comment using the public key extracted from the immutable tag configuration.
- Evidence: [public artifact record](evidence/public-artifact-stage.json).

| Public asset | Bytes | Independently observed SHA-256 |
|---|---|---|
| `latest.json` | 3,818 | `8ecf24c5a328bdd5f1bf284ac4bdff0d396237cf9e33ff91c3e787f67e287c00` |
| `SHA256SUMS.txt` | 312 | `ef0d49caadb5012f08082ecf560192472733373d9bfda2f8bad51c92474d9bc5` |
| `yourbuddy-0.3.5-macos-arm64.app.tar.gz` | 570,327,072 | `194e77ce6ec6f14191c9cf3abfead9034a28d4e85d60cb853115ebca1f7901fd` |
| `yourbuddy-0.3.5-macos-arm64.app.tar.gz.sig` | 408 | `7bc5c4974b906cd0921bb9051432496eba789f133d444ac6da6caf1300660806` |
| `yourbuddy-0.3.5-macos-arm64.dmg` | 568,339,607 | `609a26786c301794ae2464723a3338438e8086627c3919a94b476ede8181fca7` |

The first signature-audit command used a non-repository working directory while extracting the tagged public key and produced `InvalidEncoding` from an empty file. It was discarded as audit setup failure. Re-extraction from the immutable tag produced a 114-byte public key and the actual verification passed. This check does not establish native startup, updater installation, Apple notarization, WebView behavior, or OAuth.

## Scenario: Public App and relocated runtime

- Status: passed for DMG integrity, App identity, DMG/Updater equality, strict ad-hoc code-signature integrity, bundled correction presence, and relocated Python/Harbor CLI and imports. Native startup and visual interaction were skipped.
- Date and time: 2026-09-08 03:47–03:54 UTC+08:00, Asia/Shanghai.
- Build under test: unchanged App copied from the anonymously downloaded public DMG; no identifier, executable, resource, or signature was edited.
- Environment: macOS 15.6.1 arm64; isolated runtime copy; no OAuth token, profile, model request, proxy credential, or CA content.
- Evidence: [public runtime record](evidence/public-runtime-stage.json) and [native-startup skip record](evidence/public-native-startup.txt).

`hdiutil verify`, read-only mount, copy, and detach passed. The DMG and updater archive contain byte-identical App trees. The App reports version/build 0.3.5, identifier `io.github.istarwyh.yourbuddy`, and an arm64 executable. `codesign --deep --strict` exited 0, but the signature is ad-hoc with no TeamIdentifier; Gatekeeper exited 3 and rejected it. This is not Apple Developer signing or notarization.

The public source includes the exact tagged `tool-skill` routing implementation, its compiled output contains `modelExcludedSkills`, the native binary contains the `codexhost-delegation` exclusion and the desktop shell permission, and the bundle retains `@deepseek-ai/dsh-subagent-codex@0.1.2-rc.1`. A relocated copy passed `harbor --version`, `harbor-dsh --help`, and Python imports with Python 3.12.14, Harbor 0.21.0, and adapter 0.9.4. Directly running the Venv Python without the product launcher's bundled `PYTHONHOME` failed at its build-time prefix; it is retained as a discarded non-product invocation, while both real launchers and the corresponding relocated import environment passed.

An installed YourBuddy 0.3.4 user process was already running. Because the application owns a global single-instance socket, launching the downloaded copy could interact with that user process instead of proving isolated 0.3.5 startup. The process was not terminated or modified, and no alternate bundle identity was created. Native readiness, Finder installation, upgrade from 0.3.4, packaged-WebView controls, screenshots, and real Codex OAuth delegation remain unverified.

## Scenario: Public product website

- Status: passed for deployment, bilingual rendering, 0.3.5 copy, and public release/download link availability.
- Date and time: 2026-09-08 06:28–06:39 UTC+08:00, Asia/Shanghai.
- Release and commit: `yourbuddy-v0.3.5`, website source commit `aaa47c6757cd8258932a68ffa559d12e3d5b91e5` from [PR #16](https://github.com/istarwyh/yourbuddy/pull/16).
- Build under test: public GitHub Pages deployment, not a source preview or desktop installer.
- Environment: GitHub Pages, GitHub Releases, Chrome through CDP, and unauthenticated HTTP on macOS 15.6.1 arm64.
- Evidence: [deployment and live-check record](evidence/website-deployment.txt) and [workflow 34166789739](https://github.com/istarwyh/yourbuddy/actions/runs/34166789739).

The workflow build and deploy jobs passed, and GitHub deployment `6317145352` reported success for the exact website commit. Chinese and English home, download, and release pages all rendered in Chrome, returned HTTP 200 independently, and displayed 0.3.5 with the expected language and headings. The rendered download links resolved to the published DMG, Release, checksum, verification record, and source instructions; those targets and both raw Markdown pages returned HTTP 200. The DMG was not downloaded again in this stage because its earlier complete anonymous download and hash check already passed.

The structured fetch service rejected direct nested github.io URLs under its own safety rule, and a separate computer-use bridge exited before returning state. Those tool failures were retained rather than treated as product results. Chrome CDP and unauthenticated HTTP provided the successful observations. This scenario does not validate desktop startup, installation, updater installation, WebView behavior, OAuth, or a real-provider request.

## Delivery status

- Product publication status: published as the latest formal GitHub Release and independently verified for all five public files, checksums, updater signature, App identity, and relocated runtime. Native startup and installed UI remain unverified.
- Verification archive status: source, CI, public artifact, App/runtime, website, failures, recovery, and native-startup skip are recorded at immutable commits; downloadable ZIP and extraction check remain pending. No screenshots are included because installed visual acceptance was not achieved.
- Website synchronization status: deployed and verified at commit [`aaa47c6757cd8258932a68ffa559d12e3d5b91e5`](https://github.com/istarwyh/yourbuddy/commit/aaa47c6757cd8258932a68ffa559d12e3d5b91e5) through [workflow 34166789739](https://github.com/istarwyh/yourbuddy/actions/runs/34166789739); all six bilingual release-facing pages and their public targets passed.
- Unverified scope: native startup, packaged WebView controls, real Codex OAuth delegation, update from an older installation, Finder installation, Apple Developer signing/notarization, enterprise proxy/CA traffic, Intel macOS, Windows, and Linux desktop products.

## Delivery checklist

- [x] Version sources and the exact release identifier are aligned at 0.3.5.
- [x] User notes state what changed, the problems solved, where to use the changes, and how to try them.
- [x] Compatibility, migration, installation, and known limitations are stated.
- [x] Source scenarios record time zone, tested commit, environment, steps, expected and actual results, data and provider classification, failures, recovery, and scope limits.
- [x] The source, Runtime Authority, assembled output, and complete local preparation evidence is retained without claiming installed-product success.
- [x] Sensitive installed-session paths, content, credentials, proxy data, and certificate data are absent.
- [x] Main CI has completed successfully and its exact run is recorded.
- [x] Public installer, updater archive/signature, checksums, manifest, App identity, and relocated runtime are independently verified.
- [x] Native startup remains explicitly unverified because another user-owned instance prevented an isolated launch.
- [x] Packaged WebView controls and real Codex OAuth delegation remain explicitly unverified after publication.
- [ ] The downloadable verification ZIP is attached, downloaded, extracted, and checked.
- [x] The bilingual website was updated only after public files passed verification, then deployed and checked live.
- [ ] The release page and version index link the immutable evidence commit without moving the tag or replacing installers.
