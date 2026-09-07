# YourBuddy 0.3.4

English | [中文](README.zh.md)

This archive records the YourBuddy 0.3.4 desktop release. Its seven source-validation images are historical evidence, not captures of the published application. Public-file integrity, updater signatures, relocated runtime checks, and isolated native startup passed independent verification; visual window acceptance remains unverified.

- Release identifier: `yourbuddy-v0.3.4`; product commit [`d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d`](https://github.com/istarwyh/yourbuddy/commit/d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d).
- Product channel: YourBuddy desktop, macOS Apple Silicon; unrelated npm, Python, and SDK release channels are not applicable.
- Archive state: product verification is complete within the limits below; website deployment and the downloadable verification ZIP are pending.
- Evidence identity: the immutable gallery link on the [Release page](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) identifies the documentation commit. That evidence commit is separate from the product commit above; this file does not contain its own commit hash.
- Evidence gallery: seven historical images in [screenshots](screenshots/).
- Evidence download: not published; the release operator will attach the final verification archive after checking its extracted contents.

## User release notes

### What changed

YourBuddy 0.3.4 lets a supporting plugin attach the page you are viewing to an ordinary message. In Harbor, open a Trial or check several rows, type a question in the existing Composer, and send. A compact, expandable attachment shows the captured object or selection. Failed messages remain recoverable without replacing a newer draft.

### Problem solved

You can ask about what you are looking at without copying identifiers or attaching the object manually each time. The captured selection stays with that message if you navigate elsewhere. Text and images from a failed submission stay together instead of becoming part of another draft.

### Where to use it

Use the Harbor tab in the conversation. **Attach current page on send** controls automatic capture. **Ask AI** and `@harbor` references take priority; other tabs, slash commands, and opt-out do not add implicit Harbor context. The native conversation shows page attachments and recoverable unsent messages without adding another input panel.

### How to try it

1. In YourBuddy 0.3.4, open an existing Harbor result and select a Trial or check several Trial rows.
2. Type a question and send without choosing **Ask AI**. Expand the message's page attachment to inspect its captured identity, selection, filters, and observation time.
3. Switch to another Trial and ask again. The earlier attachment must retain its original target.
4. If preparation fails, keep the newer draft or clear it before restoring the failed message. Restoring does not send; sending again captures the page then in view.

### Install or upgrade

The [0.3.4 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) is public. Complete installer/updater downloads, checksums, the updater signature, relocated runtime checks, and isolated native startup are independently verified. The official download pages ([English](https://istarwyh.github.io/yourbuddy/en/download/) / [中文](https://istarwyh.github.io/yourbuddy/download/)) remain accessible from the standalone verification archive; their 0.3.4 update is prepared but not yet deployed. Signature verification and isolated startup do not establish a successful update from an older installation.

### Compatibility, migration, and limitations

The desktop release targets macOS Apple Silicon. An unchanged copy of the public DMG's App passed isolated native startup, but visual window inspection and an update from an existing installation remain unverified. Automatic Harbor context requires both the Host contribution API and a compatible Harbor plugin; upgrading the independent npm plugin cannot add that API to an older Host. The public App contains Harbor JavaScript and Python adapter 0.9.4, Python 3.12.14, and Harbor 0.21.0. The [local candidate record](evidence/local-candidate-validation.txt) contains local snapshot/bundle hashes; public bundle hashes are recorded separately below and are not byte-identical to that local candidate.

New Harbor references persist identity and revision metadata under the original project's private, Session-isolated directory, not evidence bodies or credentials. They can be read after cache expiry or Host restart; moved projects, another Session, old memory-only tokens, and missing or damaged records are not recovered. Changed evidence remains explicit, and changed Trial sets are rejected rather than expanded. Records are not automatically deleted. Unsent-message recovery lasts only for the current browser session, not a persistent outbox. Capturing context does not start evaluation, Gate, promotion, or deployment.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Ordinary questions, explicit priority, fixed selections, and recovery | passed for the historical source run | pre-release Host and Harbor source composition, not a 0.3.4 installer | macOS arm64, Node 22.22.2, pnpm 11.7.0, Chromium | [Historical machine record](evidence/historical-source-acceptance.json) and gallery below |
| Complete Web test suite | failed in the historical run; not rerun for this archive | historical source composition | local Node 22.22.2 and test network | Two failures retained under scope limits below |
| Release documentation and local product website | passed | feature commit `d5e200d441...` plus release-preparation changes | macOS arm64, Node 22.22.2, pnpm 11.7.0, Hugo Extended 0.165.0, cached Go 1.27.0 amd64 | [Local documentation record](evidence/local-docs-validation.txt) |
| Node 24 focused unit and browser checks | unit checks passed; browser run partially failed; isolated DNS-assisted remote check passed | current source candidate, not an installed desktop | Node 24.20.0, pnpm 11.7.0, macOS arm64 | [Local candidate record](evidence/local-candidate-validation.txt): 9 unit files / 214 cases; 3 browser files / 6 cases; remote failure and isolated 1-case pass |
| `user-text.tsx` coverage check | passed after correction; earlier failure retained | corrected source candidate | Node 24.20.0, local coverage run | 28 files / 573 cases passed; exact-file statements, branches, functions, and lines all 100% |
| 0.3.4 release preparation, corrected-source replay, and bundled identity | passed | final local release candidate, not a published installer | Node 24.20.0, macOS Apple Silicon target | [Local candidate record](evidence/local-candidate-validation.txt): 220 Client artifacts, 2 replay files / 5 cases, offline installation, runtime assembly, and controls |
| Main CI | passed: 19 of 19 jobs | merged product source, same file tree as the tested candidate | repository CI matrix | [Main CI run](https://github.com/istarwyh/yourbuddy/actions/runs/34085409542) |
| Upstream Cloudflare preview | cancelled without running; not passed | PR source | required self-hosted runner unavailable | [Cancelled preview run](https://github.com/istarwyh/yourbuddy/actions/runs/34085409407) |
| Desktop release publication | passed; latest formal release is 0.3.4 | product commit `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d` | GitHub Release / macOS Apple Silicon | [Desktop workflow](https://github.com/istarwyh/yourbuddy/actions/runs/34087526138) and [public release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) |
| Public files and updater signature | passed | complete downloaded release assets | five public assets; pinned release public key | [Independent artifact record](evidence/public-artifact-stage.json): sizes/digests, 3/3 checksums, stable manifest, and cryptographic Minisign verification |
| Public App identity, relocated runtime, and isolated native startup | passed within stated limits | unchanged copy of the published DMG App | macOS arm64, bundled Node 22.19.0 / pnpm 11.7.0; isolated data | [App/runtime stage record](evidence/public-runtime-stage.json) and native-startup observations below; visual window not verified |
| Bilingual website and downloadable verification archive | not verified | public deployment and downloadable archive | GitHub Pages and GitHub Release | Final commit, workflow, live pages, and extracted archive checks pending |

## Scenario: Historical automatic-context source validation

- Status: passed within the source-only and controlled-model limits below.
- Date and time: 2026-09-07 11:16–11:23 UTC+08:00, Asia/Shanghai; the copied machine record was generated at 11:23:28.612.
- Release and commit: no formal 0.3.4 product was under test. Host baseline `70cc6570c44e356100c3947ac1b7e303801c23dd` plus then-uncommitted feature changes; Harbor `0.9.3`, baseline `ee9bd3ef15667c27f1b156042e0bb01733f8bcb0` plus then-uncommitted changes. The Host feature was subsequently committed as `d5e200d4415f5d951374dd7794762b542057d0f9`; that is not the screenshot's original build identifier.
- Build under test: real Loader, built Harbor client, native Composer, Host message admission, formal Harbor resolver, and durable Session log. Harbor client SHA-256: `ef97477db1e0f842ae54f93bfb0f15a7d6aba56d8f8e10b39f69de6002e978ad`.
- Environment: macOS arm64, Node 22.22.2, pnpm 11.7.0, local browser test application; the source record does not retain an exact macOS version.
- Evidence origin: unchanged copies of Harbor's `docs/verification/automatic-page-context/` source-validation archive. These are historical captures, not formal 0.3.4 screenshots.
- Data: synthetic Trial content and test messages. The copied machine record already replaces runtime identifiers with placeholders.
- Model or service: keyless controlled transports `synthetic-harbor-context/keyless` and `synthetic-page-context/keyless`; no external model provider, real account, Candidate, or Docker evaluation.

### Steps

1. Opened Trial A, sent an ordinary question, switched to B, and sent another question; then sent an explicit A reference while viewing B.
2. Made the real Job unreadable during preparation, checked the retained draft and absence of message admission, restored the Job, and retried.
3. Checked A and B, submitted their exact set, then submitted a filtered and sorted list without opening one Trial.
4. Used a second Session, reloaded Harbor, and reopened earlier attachments; compared accepted model-input blocks with durable user-message blocks.
5. In the generic Host test plugin, submitted an image and caused question A to fail while typing B; restored A only after the Composer was free.

### Expected

The same accepted message carries the original question, images, and the send-time page reference. Explicit references win, unrelated Views do not contribute Harbor context, checked members never expand, and failure does not admit a contextless substitute or overwrite another draft.

### Actual

The record identifies A as `hfq-021` and B as `hfq-034`, preserves the exact checked pair, and records `completed`, valid, and `lowest-score` for the list without free-text search. All ten accepted Harbor messages match their logged content blocks. Another Session rejects the first token. Harbor plugin reload recovers the original snapshot and set; this is not a full Host process restart. The generic recovery record preserves B, retains A separately, and captures current page B when A is explicitly resent. The two application-level files passed five cases in the 11:20 and 11:23 replays after the 11:16 refresh.

### Evidence

The seven images were inspected for readability and sensitive information before reuse and copied without visual changes. Images 01–04 and 06 show the actual Harbor source plugin; 05 and 07 show a generic test plugin loaded through the real Host, not Harbor. Static images show visible states; the [machine record](evidence/historical-source-acceptance.json) supplies the admission and identity assertions.

#### 01 — Historical source: ask directly about Trial A

![Historical source Harbor Trial A and an ordinary question without an explicit reference](screenshots/01-synthetic-trial-a-ordinary-question.png)

#### 02 — Historical source: inspect the frozen message attachment

![Historical source conversation with the captured Trial identity and formal resolver call](screenshots/02-synthetic-native-conversation.png)

#### 03 — Historical source: explicit A takes priority over visible B

![Historical source Harbor page B with explicit Trial A in the Composer](screenshots/03-synthetic-explicit-a-overrides-page-b.png)

#### 04 — Historical source: preparation failure retains the question

![Historical source failure notice and retained ordinary-question draft](screenshots/04-synthetic-failure-preserves-draft.png)

#### 05 — Historical generic Host: image and page attachment coexist

![Historical generic Host test conversation with an image and folded synthetic page context](screenshots/05-synthetic-image-with-page-context.png)

#### 06 — Historical source: selected members and list filters stay readable

![Historical source conversation showing two checked Trials and a separate filtered-list attachment](screenshots/06-synthetic-selection-and-filter-attachments.png)

#### 07 — Historical generic Host: failed A does not replace draft B

![Historical generic Host unsent-message entry for A with B still in the Composer](screenshots/07-synthetic-failed-a-preserves-draft-b.png)

### Scope limits

The source record reports Harbor 589/589 checks and Host GUI 3,947 passed with one skipped case, not new 0.3.4 product results. A broader historical Web run had 94 passing and two failing files: `remote-welcome.e2e.ts` encountered a test-service socket failure, and `hmr-live.e2e.ts` failed before application readiness with `ERR_INVALID_RETURN_PROPERTY_VALUE` in the Node 22.22.2 loader. These failures were not proved to be baseline-only and are not converted into a full-suite pass by the focused replays.

These captures do not validate the YourBuddy 0.3.4 installer, native WebView, signed updater installation, real-provider reasoning quality, OAuth, Candidate execution, Docker cancellation, enterprise proxy/CA traffic, or other platforms. They do not complete the Harbor PRD or establish production approvals, rollout, or autonomous deployment. Formal product checks and any new screenshots must be recorded separately with their actual versions and times.

## Scenario: Node 24 source checks and local release preparation

- Status: focused unit checks, corrected-source replay, and local release preparation/rebuild passed; the earlier browser invocation remained partially failed, with a separate DNS-assisted remote check passing.
- Date and time: 2026-09-07 12:00–12:04 UTC+08:00 for focused tests; initial preparation completed at 12:42, final source build at 12:53, replay at 12:54, and runtime rebuild at 12:55 UTC+08:00, Asia/Shanghai.
- Release and commit: pre-tag source run for `yourbuddy-v0.3.4`, based on feature `d5e200d4415f5d951374dd7794762b542057d0f9` plus then-uncommitted release preparation, finalized as candidate `eed670338df5f265189c797e37e66bdcdaa04aa5`; paired Harbor source `8264804dfd23186d030703580020b941a1bcc306`. The product commit has the same file tree, as recorded below.
- Build under test: corrected source and locally assembled candidate runtime, not a DMG, native WebView, or public updater. Final snapshot hashes include the bilingual README updates and a successful rebuild.
- Environment: macOS arm64, Node 24.20.0, pnpm 11.7.0, Python 3.12.14, Harbor 0.21.0, Harbor JavaScript/Python adapter 0.9.4.
- Evidence origin: this release run's operator logs, summarized with local paths removed in the [candidate record](evidence/local-candidate-validation.txt); no additional screenshots were captured.
- Data and model: synthetic/local tests and package metadata; no paid model request or Candidate evaluation.

### Steps and results

Two focused unit invocations passed four files / 134 cases and five files / 80 cases, totaling nine files / 214 cases. The browser invocation passed three files / six cases but failed the `remote-welcome` suite before its one case ran. Its separate direct retry also failed with `UND_ERR_SOCKET` under the machine's proxy/DNS environment. A separate process-only DNS shim run passed that one case. The shim changed neither system DNS nor committed product code and does not prove that the original network environment passed. These checks do not replace the historical complete Web result.

A separate owning-package run passed 59 files / 962 cases but failed coverage because `user-text.tsx` branch coverage was 93.22%. The correction removed four unreachable fallbacks after fixed-regex matches, without changing regexes, behavior, or thresholds, and added empty-capture and unknown-entity/decode-once regressions. At 12:52:50 UTC+08:00, the rerun passed 28 files / 573 cases; exact-file coverage reached 100% for 59 statements, 51 branches, 13 functions, and 45 lines. This was a narrower rerun, not a rerun of all 59 files. The earlier preparation result below is evidence for that earlier local candidate; the corrected candidate has its own subsequent build and replay evidence.

The initial complete `prepare:release` invocation exited 0 after downloading all 587 production packages and reinstalling them offline with zero downloads. It produced a 38,708-file offline store, validated 54 runtime peer links and six assembled Client plugins, and passed the external-links, Plugin Marketplace, Network proxy, and Application lifecycle control smokes. The branding default/customization/persistence/reset snapshot also passed. Other product snapshots and frozen lockfiles remained unchanged.

After the correction and bilingual README updates, the final source build recorded 220 Client artifacts with four public values. The real application page-context replay passed two files / five cases at 12:54:45 UTC+08:00 in 7.95 seconds. The final rebuild verified cached digests, reinstalled all 587 packages offline with zero downloads, and passed the 54-peer/six-plugin assembled Host/Chromium controls again. Both official snapshot checks and the Client build record check passed; DSH provenance and lockfiles had no changes. These are local-candidate results, not installed desktop acceptance. Exact hashes are in the [candidate record](evidence/local-candidate-validation.txt).

### Failure, recovery, and limits

Earlier preparation attempts encountered macOS Unix-socket path length limits and 60-second large-package download timeouts. A short temporary-directory path and the correctly applied process-local pnpm 300-second timeout allowed the complete preparation to succeed. These corrected environment attempts are not passing tests. Preparation used network access to populate caches; only the subsequent package installation was offline. This source and local-runtime evidence does not verify public installer bytes, signatures, updater installation, live website delivery, or the full Harbor PRD.

## Scenario: Release-documentation preparation

- Status: passed for local documentation and generated website checks, not public deployment.
- Date and time: 2026-09-07 12:04–12:06 UTC+08:00, Asia/Shanghai.
- Release and commit: pre-tag documentation run for `yourbuddy-v0.3.4`; feature commit `d5e200d4415f5d951374dd7794762b542057d0f9` plus then-uncommitted release preparation. These timed observations do not include subsequent publication updates to this archive.
- Build under test: source documentation and the locally generated product website with the production URL prefix.
- Environment: macOS arm64, Node 22.22.2, pnpm 11.7.0, existing Hugo Extended 0.165.0 arm64 and cached Go 1.27.0 amd64; Go module networking disabled.
- Evidence origin: this release-preparation run; no model, real account, or business data was used.

### Steps and results

The operator inspected all seven historical images and the sanitized JSON, confirmed byte-identical copies, recorded and checked the four bilingual pairs, and ran the existing documentation and website checks. `test:docs` passed 15 checks, `doc-sync` passed 32, and `lint` exited successfully. `website:check` passed 70 tests, projected 48 pages, built with Hugo, and verified links, assets, fragments, and source actions in 57 HTML pages. Inspection of the six generated Chinese/English home, download, and release pages confirmed that 0.3.3 stays available while 0.3.4 is labelled pending. Commands, warnings, and one corrected invocation are retained in the [local record](evidence/local-docs-validation.txt).

After the two bundled Harbor README translations and the local-candidate record were added, `test:docs` again passed 15 checks, `doc-sync` passed 32, and `website:check` passed 70 tests and verified 57 HTML pages at 12:50–12:51 UTC+08:00. Lint was deferred during the runtime rebuild to avoid concurrent writes to built files; it then exited successfully on the corrected source. The standalone archive uses explicit English and Chinese website download links, without references to files outside its directory.

### Scope limits

These checks validate local source consistency and generated website content. They do not publish the website, verify live external links, or establish a 0.3.4 desktop download. The release operator still owns final product, archive-download, and live website verification.

## Product source and publication progress

[PR #12](https://github.com/istarwyh/yourbuddy/pull/12) merged as product commit `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d`. The release operator confirmed that its complete file tree equals tested candidate `eed670338df5f265189c797e37e66bdcdaa04aa5`; the merge does not turn historical source screenshots into installed-product evidence. The [main CI run](https://github.com/istarwyh/yourbuddy/actions/runs/34085409542) completed all 19 jobs successfully.

The separate [upstream Cloudflare preview](https://github.com/istarwyh/yourbuddy/actions/runs/34085409407) required the `dsh-ubuntu-24-04-16core` self-hosted runner. This repository had zero self-hosted runners, so the workflow remained queued and the release operator cancelled it with an explanation in the PR. It did not run or pass; its cancellation is not included in the main CI's 19 successful jobs.

The [formal GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4) was published at 2026-09-07 14:01:40 UTC+08:00 (`2026-09-07T06:01:40Z`), with neither draft nor prerelease status and five public assets. [Desktop workflow 34087526138](https://github.com/istarwyh/yourbuddy/actions/runs/34087526138) completed successfully, and GitHub's latest formal Release is 0.3.4. Independent complete downloads, cryptographic updater verification, public runtime checks, and isolated native startup passed as recorded below.

The verification ZIP has not been uploaded and the 0.3.4 website update has not been deployed. Bilingual promotion content is prepared in the uncommitted working tree. Archive extraction and website deployment/live checks remain outstanding and do not change the completed product checks. The live website still shows 0.3.3 until the documentation follow-up is deployed and verified.

## Scenario: Independent public-artifact verification

- Status: passed for complete-file integrity, checksum consistency, updater metadata, cryptographic updater verification, and anonymous access to all five public URLs. Installed runtime and startup are recorded separately below.
- Date and time: 2026-09-07 14:17:13.068 UTC+08:00, Asia/Shanghai (`2026-09-07T06:17:13.068Z`).
- Release and build: downloaded assets from `yourbuddy-v0.3.4`, product commit `d4c3b8f08d4fb55ed0a3bf9d3930d60cf759813d`; this is public-file evidence, not a local bundle substitution.
- Method: the independent auditor downloaded all five assets, checked their byte lengths and SHA-256 against GitHub's API digests, and verified all three entries in `SHA256SUMS.txt`. The stable and versioned `latest.json` files are byte-identical; the manifest signature equals the signature asset.
- Cryptographic check: `minisign-verify` 0.2.5 used the public key from the tagged release configuration to verify the updater archive's prehashed signature and trusted comment. This was an actual signature check, not only string equality.
- Evidence: [unaltered sanitized stage record](evidence/public-artifact-stage.json). Its pending native-startup and anonymous-visibility fields preserve the scope at that time; no model request was involved.

| Public asset | Bytes | Independently observed SHA-256 |
|---|---|---|
| `latest.json` | 3,954 | `e0d5aeb27b83a2463c1da83769ad0b4b823c6880ab538d44e8a20c0dd6f8eeb9` |
| `SHA256SUMS.txt` | 312 | `fdacdcf11bbb9971392434960b92dbb1f7a058d368c2094d965be72cbd164da0` |
| `yourbuddy-0.3.4-macos-arm64.app.tar.gz` | 570,358,486 | `d826075d26fe325dbc1278d9a2b69575290ae13cdb6da9d9ead8c18011d09fd5` |
| `yourbuddy-0.3.4-macos-arm64.app.tar.gz.sig` | 408 | `042eb3e911883a255da27046ee4c9cf9ae9c13d8a96abbdacc957eb1c044008c` |
| `yourbuddy-0.3.4-macos-arm64.dmg` | 568,345,182 | `3a8eeaf70602836280a48fe09f587f7ebf50c19366f9b209c0ede7054f0b4270` |

Passing these checks does not prove native startup, a completed update from an older installation, Apple signing/notarization, real model quality, or the full Harbor PRD. Those outcomes require their own observations.

## Scenario: Public App inspection and isolated native startup

- Status: App identity, code-signature integrity, relocated Python CLI/imports, and isolated native startup passed; Gatekeeper rejected the ad-hoc App, and visual window inspection/capture remains unverified.
- Date and time: App/runtime inspection at 2026-09-07 14:19 UTC+08:00; native startup at 14:20:30 UTC+08:00, Asia/Shanghai.
- Build under test: the App copied unchanged from the downloaded public DMG; no identifier, executable, resource, or signature changes. The DMG and updater archive contain identical App trees according to `diff -qr`.
- Data and services: isolated owned directories, no inherited real profile or credentials, telemetry disabled, and no paid-model requests. The public installer used bundled Node 22.19.0 and pnpm 11.7.0 for its offline runtime preparation.
- Evidence: [sanitized App/runtime record](evidence/public-runtime-stage.json), with local audit paths replaced by `{{auditRoot}}`, and the [native startup/cleanup record](evidence/public-native-startup.txt); the public artifact stage above remains a separate earlier observation.

`hdiutil verify`, read-only mount, copy, and detach passed. The App reports version/build 0.3.4, identifier `io.github.istarwyh.yourbuddy`, and an arm64 executable. `codesign --deep --strict` exited 0, but the signature is ad-hoc with no TeamIdentifier; `spctl` exited 3 and rejected it. This is not Apple Developer signing or notarization.

All 17 changed source/CSS files checked inside the public bundle matched the formal tag byte for byte. The copied runtime passed four CLI/import checks and loaded all three integration entry points, reporting Python 3.12.14, Harbor 0.21.0, and adapter 0.9.4. The public bundle and offline-store digests below differ from the local candidate's digests, so whole-bundle byte reproducibility is not claimed. A scoped comparison found only checkout-path/CSS-hash differences in two compiled clients across 1,183 related files; both stores indexed the same 587 package integrity keys, with generated timestamps and archive owner/mtime metadata accounting for the examined store differences. It did not compare every expanded store byte.

| Public bundle field | Observed SHA-256 |
|---|---|
| Harness source | `aa4b10f1695e96b3eb0815aa0b7d6565cb68042cc55c0b0d042f055c31fb84cb` |
| Harness content | `102787b7b9359a1c247a9f5632256699405b9bf127102f84d0035e4bc9210096` |
| Offline store, 38,708 files | `9652e85978d477bed2c5caf21a21ba4e6d3148ee4ab7a6ae87c505445a7744c6` |
| Offline-store archive | `9020f06ead6f87e16193c3880150e503ee38dff3e4307a3f51aa2401b5a9b40a` |

The unchanged public App started with isolated data. Its boot log recorded authenticated readiness, DSH Web readiness, opening the main window, boot completion, and the desktop update service reporting current version 0.3.4. The native-window inspection attempt for that exact App path failed with `-10005: codex app-server exited before returning a response`. The log's window-opening marker is not visual confirmation; no formal native screenshot was created. This isolated launch does not verify Finder installation, updating an existing installation, OAuth, real-provider behavior, or the historical synthetic AI journey inside the published WebView.

## Delivery status

- Product publication status: published and independently verified within the recorded scope: all five assets, 3/3 checksums, updater signature, public App identity, relocated runtime, and isolated native startup passed. Visual window inspection and an actual installed-version upgrade remain unverified.
- Verification archive status: partial; seven historical source images, source/preparation evidence, public artifact/runtime observations, and separate product/evidence identities are recorded. The Release's immutable gallery link and an extracted downloadable archive remain outstanding.
- Website synchronization status: pending; 0.3.4 content is prepared in both languages in the working tree, while the live homepage and download retain 0.3.3. After product verification, record the site commit, deployment run, and observed Chinese and English home, download, and release pages.
- Unverified scope: historical/source-only and controlled-model limits above; visual native-window inspection, Finder installation, actual in-app updating, real providers, archive ZIP, and live 0.3.4 website checks remain pending. Apple Developer signing/notarization is absent, not a passed check.

## Delivery checklist

- [ ] Release identifier and version sources match the existing desktop procedure.
- [x] User notes explain the change, problem, location, and shortest journey.
- [x] Compatibility, private-storage effects, recovery limits, and pending installation are stated.
- [x] Historical evidence records its date, source versions, environment, model type, steps, results, and limits.
- [x] The seven screenshots and copied machine record were inspected; historical and generic-plugin evidence are distinguished.
- [x] Bilingual pairs, relative links, images, and local documentation and website checks pass.
- [ ] The public release links the immutable evidence commit and an inspected downloadable archive.
- [ ] Public installer, checksums, updater archive/signature/manifest, and installed behavior are independently recorded.
- [ ] Both language versions of the website show only verified availability and pass live download/evidence checks.
- [x] Product, archive, website, and unverified scope are reported separately without moving public tags or replacing installers.
