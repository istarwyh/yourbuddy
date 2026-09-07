# YourBuddy 0.3.4

English | [中文](README.zh.md)

This archive prepares the desktop release. Its source-validation images are historical evidence, not captures of a published 0.3.4 application.

- Release identifier: intended `yourbuddy-v0.3.4`; final product commit pending.
- Product channel: YourBuddy desktop, macOS Apple Silicon; unrelated npm, Python, and SDK release channels are not applicable.
- Archive state: partial; historical source evidence is included, product and website verification are pending.
- Evidence commit: pending the final archive commit; the feature is carried by `d5e200d4415f5d951374dd7794762b542057d0f9`.
- Evidence gallery: seven historical images in [screenshots](screenshots/).
- Evidence download: not published; the release operator will attach the final verification archive after checking its extracted contents.

## User release notes

### What changed

The release candidate lets a supporting plugin attach the page you are viewing to an ordinary message. In Harbor, open a Trial or check several rows, type a question in the existing Composer, and send. A compact, expandable attachment shows the captured object or selection. Failed messages remain recoverable without replacing a newer draft.

### Problem solved

You can ask about what you are looking at without copying identifiers or attaching the object manually each time. The captured selection stays with that message if you navigate elsewhere. Text and images from a failed submission stay together instead of becoming part of another draft.

### Where to use it

Use the Harbor tab in the conversation. **Attach current page on send** controls automatic capture. **Ask AI** and `@harbor` references take priority; other tabs, slash commands, and opt-out do not add implicit Harbor context. The native conversation shows page attachments and recoverable unsent messages without adding another input panel.

### How to try it

1. On the prepared build, open an existing Harbor result and select a Trial or check several Trial rows.
2. Type a question and send without choosing **Ask AI**. Expand the message's page attachment to inspect its captured identity, selection, filters, and observation time.
3. Switch to another Trial and ask again. The earlier attachment must retain its original target.
4. If preparation fails, keep the newer draft or clear it before restoring the failed message. Restoring does not send; sending again captures the page then in view.

### Install or upgrade

No 0.3.4 installer or updater is claimed available yet. The official download pages ([English](https://istarwyh.github.io/yourbuddy/en/download/) / [中文](https://istarwyh.github.io/yourbuddy/download/)) retain the independently verified 0.3.3 release and remain accessible from the standalone verification archive. The release operator must verify the public DMG, updater archive, signature, checksums, and stable manifest before changing availability or recommending an upgrade.

### Compatibility, migration, and limitations

The desktop release targets macOS Apple Silicon; formal 0.3.4 installation and update behavior remain unverified. Automatic Harbor context requires both the Host contribution API and a compatible Harbor plugin; upgrading the independent npm plugin cannot add that API to an older Host. Local preparation pairs Harbor JavaScript and Python adapter 0.9.4 from source `8264804dfd23186d030703580020b941a1bcc306`, with Python 3.12.14 and Harbor 0.21.0. The [local candidate record](evidence/local-candidate-validation.txt) contains the final documentation-aware snapshot and bundle hashes.

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
| Public installer, updater, and installed journey | not verified | formally published product | GitHub Release and macOS Apple Silicon target | Public files, hashes, signatures, metadata, and installed observations pending |
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
- Release and commit: intended `yourbuddy-v0.3.4`; feature `d5e200d4415f5d951374dd7794762b542057d0f9` plus uncommitted release preparation; paired Harbor source `8264804dfd23186d030703580020b941a1bcc306`.
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
- Release and commit: intended `yourbuddy-v0.3.4`; feature commit `d5e200d4415f5d951374dd7794762b542057d0f9` plus uncommitted release preparation.
- Build under test: source documentation and the locally generated product website with the production URL prefix.
- Environment: macOS arm64, Node 22.22.2, pnpm 11.7.0, existing Hugo Extended 0.165.0 arm64 and cached Go 1.27.0 amd64; Go module networking disabled.
- Evidence origin: this release-preparation run; no model, real account, or business data was used.

### Steps and results

The operator inspected all seven historical images and the sanitized JSON, confirmed byte-identical copies, recorded and checked the four bilingual pairs, and ran the existing documentation and website checks. `test:docs` passed 15 checks, `doc-sync` passed 32, and `lint` exited successfully. `website:check` passed 70 tests, projected 48 pages, built with Hugo, and verified links, assets, fragments, and source actions in 57 HTML pages. Inspection of the six generated Chinese/English home, download, and release pages confirmed that 0.3.3 stays available while 0.3.4 is labelled pending. Commands, warnings, and one corrected invocation are retained in the [local record](evidence/local-docs-validation.txt).

After the two bundled Harbor README translations and the local-candidate record were added, `test:docs` again passed 15 checks, `doc-sync` passed 32, and `website:check` passed 70 tests and verified 57 HTML pages at 12:50–12:51 UTC+08:00. Lint was deferred during the runtime rebuild to avoid concurrent writes to built files; it then exited successfully on the corrected source. The standalone archive uses explicit English and Chinese website download links, without references to files outside its directory.

### Scope limits

These checks validate local source consistency and generated website content. They do not publish the website, verify live external links, or establish a 0.3.4 desktop download. The release operator still owns final product, archive-download, and live website verification.

## Delivery status

- Product publication status: pending; no public 0.3.4 files, hashes, updater metadata, or installed behavior verified here. Public 0.3.3 remains the website download.
- Verification archive status: partial; seven historical source images, their sanitized machine record, final local build/replay/preparation results, and documentation-aware snapshot hashes are present. Final product and evidence commits, public-product evidence, and an extracted downloadable archive remain outstanding.
- Website synchronization status: pending; candidate notes are prepared in both languages, while the homepage and download retain 0.3.3. After product verification, record the site commit, deployment run, and observed Chinese and English home, download, and release pages.
- Unverified scope: historical/source-only and controlled-model evidence above; all formal 0.3.4 product and website delivery checks pending.

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
