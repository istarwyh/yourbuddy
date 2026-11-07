# YourBuddy 0.4.17

English | [中文](README.zh.md)

YourBuddy 0.4.17 is published. This archive separates preflight, released-product acceptance and independent public checks, with the remaining limits stated below.

- Release identifier: `yourbuddy-v0.4.17`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release workflow and three native Offline starts passed; independent public verification is limited to the scope recorded below.
- Released source: commit `79fc43353f50f3dfaa313b02bc6342eb0429b9d4`, tree `998fdbb01b4fead922e4e3a4ad506d03a8f67ff0`; see the [release workflow record](evidence/release-workflow.json). The version candidate changed only version metadata and documentation after the merged repair base `501770ca9f0857fc49695f2e8d2b1c89d1bf9959`.
- Evidence gallery: [release-run workbench](screenshots/released-workbench.png) and [PR preflight workbench](screenshots/prepared-workbench.png). Both show reviewed synthetic Chromium data, not native application screenshots.
- Evidence download: the [immutable tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.17.zip) contains the original candidate record, not these later release outcomes. Its CRC and all 15 candidate-changed files were independently verified against the exact release commit; see [source verification](evidence/source-archive-verification.json). Final evidence belongs to this post-publication documentation update; the tag is unchanged.

## User release notes

### What changed

Claude Design and Claude Artifacts 2.11.1 are bundled with an in-app managed editor ([PR #90](https://github.com/istarwyh/yourbuddy/pull/90)). The release also includes bounded SDK snapshot-test timeout diagnostics ([#87](https://github.com/istarwyh/yourbuddy/pull/87)), PATH-safe component directories ([#88](https://github.com/istarwyh/yourbuddy/pull/88)), deterministic equivalent-Store archives ([#89](https://github.com/istarwyh/yourbuddy/pull/89)), and the idle-watchdog test startup-race correction ([#91](https://github.com/istarwyh/yourbuddy/pull/91)).

The unpublished 0.4.14 and 0.4.15 candidates exposed missing fixture patch inputs and a stale installed-peer roster. [PR #92](https://github.com/istarwyh/yourbuddy/pull/92) corrects the fixture; [PR #93](https://github.com/istarwyh/yourbuddy/pull/93) covers every actual product peer and the Artifacts Client, and verifies branding reset through committed settings plus an independent read. All original identity and rendered/reloaded branding checks remain. The [0.4.14](../yourbuddy-v0.4.14/README.md) and [0.4.15](../yourbuddy-v0.4.15/README.md) failure records remain available; neither tag was moved and neither has a GitHub Release or installer.

Settings now stays open while onboarding is loading or skipping a step. Only a visible onboarding dialog takes over the panel, including nested account sign-in ([PR #94](https://github.com/istarwyh/yourbuddy/pull/94)). The unchanged branding journey exposed this product race in the unpublished [0.4.16 attempt](../yourbuddy-v0.4.16/README.md); its tag also stays unchanged.

### Problem solved

Design artifacts can open inside the workbench. Equivalent Store contents produce identical archives when file modes and tools match, despite input order and timestamps. Failure-only SDK snapshot-test diagnostics report progress stages without request contents; component cache paths no longer insert a colon into PATH. The watchdog test waits for the real SDK request before advancing its fake timer.

### Where to use it

Use Artifacts in a selected workspace. Create opens a fresh, unsent `/claude-design` draft, preserves the selected Agent Preset and uses YourBuddy’s configured default model. Existing drafts remain untouched. The [adapter guide](../../../apps/desktop-tauri/product/claude-design-adapter/README.md) owns detailed behavior and prerequisites.

### How to try it

Open Artifacts, create a Design draft and review it before sending. After the model writes the project and calls `yourbuddy_design_open`, select the artifact to open its managed editor. Saved comments support Send to Agent; non-comment page-button requests return HTTP 409. CI exercises the draft/editor with synthetic files, not actual model generation.

### Install or upgrade

Use the Apple Silicon Bootstrap or Offline DMG from the [0.4.17 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.17), or the existing signed updater. The Bootstrap DMG is 11,127,135 bytes and the Offline DMG is 614,073,515 bytes; these are archive sizes, not network traffic or installed size. The application is ad-hoc signed and Apple notarization was explicitly skipped. Verified updater/component signatures do not establish Developer ID signing or Gatekeeper acceptance.

### Compatibility, migration, and limitations

The Harness selection stays `0.2.0-rc.1`. PATH-safe cache names encode `:` as `%3A`; old directories remain but are not reused. The first canonical Store archive can require a fresh download because its signed digest changes, even with the same content identifier. This is not shared CAS or incremental downloads. Related issues [#57](https://github.com/istarwyh/yourbuddy/issues/57), [#83](https://github.com/istarwyh/yourbuddy/issues/83), [#85](https://github.com/istarwyh/yourbuddy/issues/85) and [#86](https://github.com/istarwyh/yourbuddy/issues/86) remain open. Original 120-second timeout and historical 13 GB usage causes remain unresolved. Agent self-upgrade from [#80](https://github.com/istarwyh/yourbuddy/pull/80) is not included.

Managed LAN Share is unsupported. Real-model generation, native macOS Tauri/WebView Design interaction and HTML/PDF/PNG export/saving, cold Session/controller restoration, Windows editor ownership, installed-app upgrade and data downgrade compatibility remain unverified. The three native starts used runner-provided Node 24.22.2; a complete first launch without system Node remains unverified.

### Sources and licenses

[UPSTREAM.json](../../../apps/desktop-tauri/product/claude-design-adapter/UPSTREAM.json) pins the upstream revision, npm 2.11.1 integrities and reviewed integration patches. Package LICENSE, NOTICE.md and editor third-party notices remain intact. These are mixed terms, not collectively MIT. Upstream NOTICE reports Anthropic-origin material without a published license; bundling and source pinning do not resolve or grant those rights.

## Verification summary

| Scenario | Status | Build under test | Evidence and limits |
|---|---|---|---|
| Complete macOS prepared input and product acceptance | Passed | 0.4.16 repair source before version bump; PR #94 head `c88e737ac908699881b4e93c1e9a4e7cc296e3c8` | [Run 42362666422](https://github.com/istarwyh/yourbuddy/actions/runs/42362666422); [retained evidence](evidence/prepared-preflight.json) |
| Exact Design draft/editor and offline restore | Passed | Historical combined product tree `b2f40dd` | [Bootstrap 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573), 4/4; actual Chromium and 570 restored packages, no real model |
| Complete combined source CI | Passed | Historical PR #90 combined source | [CI 42346920678](https://github.com/istarwyh/yourbuddy/actions/runs/42346920678), 16/16 |
| Settings repair source CI | Passed | PR #94 repair source | [CI 42362666398](https://github.com/istarwyh/yourbuddy/actions/runs/42362666398), 16/16; observed after publication |
| Store archive and fixture regressions | Passed | Included #89 and #92 source | [Source checks](../yourbuddy-v0.4.15/evidence/source-checks.json), [fixture repair](../yourbuddy-v0.4.15/evidence/fixture-repair.json); 49 archive, 63 component and 8 renderer tests |
| Peer/Artifacts and reset regressions | Passed | Reviewed #93 source | [Repair evidence](evidence/verifier-repair.json); 49/49 focused tests, including the real Chromium stream-lifecycle regression; rejected duplicate peer, missing Client and false reset success |
| Settings takeover regression | Passed within local scope | #94 product repair | [Product repair](../yourbuddy-v0.4.16/evidence/settings-race-repair.json); 50 component tests, controlled real Host failure-to-success, unchanged full prepared with 568 inputs |
| Local prepared run | Passed with input limit | macOS 15.6.1 arm64, Node 22.22.3, pnpm 11.7.0 | Full Host/Harbor/Chromium with 568 inputs; two native optional packages missing, not complete-input evidence |
| Version candidate checks | Passed | Local 0.4.17 metadata candidate | [Commands and results](evidence/candidate-checks.json) |
| Release packaging and prepared acceptance | Passed | Exact 0.4.17 tag | [Workflow](evidence/release-workflow.json), [released prepared result](evidence/released-prepared.json); core 9 / Harbor 10 Clients, 85 core peers, both branding/reset journeys |
| Native Offline startup | Passed within recorded scope | Released Offline application, darwin-arm64 | [Native result](evidence/native-offline.json); three authenticated workbench starts and clean exits, using runner Node |
| Independent public assets | See recorded scope | Published 0.4.17 assets | [Public metadata](evidence/public-release.json), [scoped verification](evidence/public-verification.json); all 17 public files, both updater signatures and DMG integrity checks passed |
| Immutable tag source | Passed for selected changed files | Exact 0.4.17 tag | [Source verification](evidence/source-archive-verification.json); ZIP CRC and all 15 candidate-changed files |

## Scenario: complete macOS prepared preflight

[The PR job](https://github.com/istarwyh/yourbuddy/actions/runs/42362666422/job/128374114853) runs the exact prepared-acceptance step from the release workflow with read-only repository permission and no publication credentials. Its CI merge `b1f48f2ace661567fb9bb0685bb1f37bec05f371` has tree `94c2d0b412f1938a9bd9691e4c29dfa8ec6fa23c`, identical to the reviewed repair head. The [record](evidence/prepared-preflight.json) gives UTC timestamps, runner/runtime versions, physical inputs and observed results. Data and model interactions are synthetic/keyless.

1. Install frozen tools, build the source and run normal `prepare:dist`.
2. Restore the frozen Store offline and inspect every actual package manifest. Require all 570 packages and both nonempty executable macOS Codex/Claude SDK native inputs, not merely the install log count.
3. Run the real core Host/Profile, browser document previews and branding persistence; install Harbor into the isolated Profile and exercise the assembled Host/Chromium path again.

The observed result is 570/570 inputs, no missing packages, 85 matching core peer links, 9 core and 10 Harbor-assembled Clients, ready Harbor Python 0.10.3, and complete default/custom/reloaded/reset/reset-reloaded branding snapshots. The actual result is recorded without treating local 568-input runs as equivalent. This is prepared acceptance, not a native packaged WebView or model-generation test.

The [first preflight](https://github.com/istarwyh/yourbuddy/actions/runs/42353419140/job/128346222480) verified 570 inputs but failed waiting for `Default restored` after Settings closed. Video showed restored branding; the old helper did not observe reset persistence. The corrected helper checks the exact reset HTTP/RPC result and an independent settings read, with the original rendering and reload assertions retained. Six regressions failed under the old synchronization and passed after the change. The cause of the panel closing remains unassigned; this is an acceptance synchronization correction, not a claimed product lifecycle fix.


The [second preflight](https://github.com/istarwyh/yourbuddy/actions/runs/42355415779/job/128352321356) verified the same complete native inputs, but its branding navigation timed out before the reset helper ran. A diagnostic local run found two completed bridge/proxy iframes holding six same-origin Host streams. A controlled Chromium fixture reproduced the original 30-second `load` timeout; closing the completed proxy page released all six streams and resumed the queued navigation. The same regression passed in 189 ms after the cleanup correction. The final verifier closes that page only after all proxy assertions, retaining `load`, its 30-second budget and every product assertion. Bounded, sanitized resource diagnostics remain. This demonstrates the lifecycle risk and repair; the earlier CI timeout did not retain enough pending-resource evidence for direct attribution.

A controlled real Host regression holds the reloaded Session-list response until Settings opens. Before the product fix, releasing it closes Settings without any visible onboarding dialog; after the fix, Settings remains open through Session/model readiness and the original reset/persistence journey completes. The [product repair record](../yourbuddy-v0.4.16/evidence/settings-race-repair.json) preserves that distinction and the local 568-input limit; this PR adds the 50 component regressions to the complete-input macOS check.

## Released application acceptance

The [release workflow](evidence/release-workflow.json) completed successfully on 2026-11-07 at 11:03:12 UTC; publication completed at 11:01:51 UTC. The exact tagged source passed prepared Host/Profile/Chromium acceptance with 9 core Clients, 10 Harbor-assembled Clients, 85 matching core peers and both complete branding/reset journeys. The release install reported 570 registry packages; the separate physical manifest and executable-native-input inventory belongs to the PR preflight above. The released [workbench capture](screenshots/released-workbench.png) contains synthetic data only. The original CI artifacts expire on 2026-11-14; their identities, hashes and necessary result summaries are retained here, not raw logs.

The [native Offline record](evidence/native-offline.json) reports three starts lasting 48.222, 11.573 and 12.659 seconds. Each reached real Host authenticated readiness, exposed Codex and Settings in the native WebView, and exited cleanly with its owned Host. Authentication here means Host readiness, not account sign-in or model credentials. Active components were Harness and the signed offline Store; all starts selected runner Node 24.22.2. The first empty-Store miss recovered through the signed fallback, and four external requests were rejected by the isolated proxy. These starts do not verify no-system-Node startup, native Design interaction/export or cold Session/controller restoration.

Relocated Harbor passed with a copied Python executable, a nonexistent `pyvenv` home and `PYTHONHOME` unset. Application signing was ad-hoc and notarization was skipped. Independent [Bootstrap code-signature inspection](evidence/bootstrap-codesign.json) found a valid on-disk ad-hoc signature; it did not execute the downloaded app or establish Developer ID, notarization or Gatekeeper acceptance.

## Delivery status

- Product publication: [0.4.17 is public](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.17) with 17 assets; latest and the stable updater identify 0.4.17. The failed 0.4.14, 0.4.15 and 0.4.16 tags remain unchanged and have no Release or installer.
- Independent public checks: all 17 public files were independently downloaded and SHA-256 checked; all 68 scoped checks passed, including both updater cryptographic signatures, the signed component manifest, stable feed, and both DMG integrity checks. Selected downloaded Harness Design 2.11.1 pins/source/license and Settings sources match the release. The [public Offline binary and manifest](evidence/offline-native-binding.json) also match the native CI evidence exactly. This is not a complete npm-license audit or execution of downloaded software.
- Source archive: [independent extraction](evidence/source-archive-verification.json) verified the 55,966,712-byte ZIP, all 15 candidate-changed files and the viewed synthetic screenshot. The immutable tag retains candidate evidence; later release outcomes are documented here.
- Website synchronization: [six live bilingual pages](evidence/website-live.json) returned HTTP 200 with their expected content and links; the latest-release link resolved to 0.4.17. No new website deployment was performed.
- Unverified scope: the model, native Design, cold-restoration, upgrade and remaining issue limitations above still apply. Neither publication nor these checks resolve the upstream license gap.

## Rollback

Keep immutable [0.4.13](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) and its original signed updater manifest. A withdrawal can restore the previous latest-release designation and stable feed without moving tags or replacing installer bytes. Already updated applications need a manual previous-DMG reinstall because the updater accepts only newer versions. Quit the app and back up its data first; data downgrade compatibility is unverified.

The [independently downloaded updater baseline](../yourbuddy-v0.4.15/evidence/rollback-updater-0.4.13.json) is 1,971 bytes, SHA-256 `098682e27e293fbca5122b23bf5519b1dde900c0cf1d282f4f2617658ac8947c`. This records rollback preparation, not a rollback performed.
