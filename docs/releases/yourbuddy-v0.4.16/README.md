# YourBuddy 0.4.16

English | [中文](README.zh.md)

This archive records the verified preflight and candidate checks, followed by the failed 0.4.16 release attempt. The tag is retained unchanged; no GitHub Release or installer was published.

- Release identifier: `yourbuddy-v0.4.16`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: candidate and preflight verified; release prepared acceptance failed before packaging, native acceptance or publication.
- Evidence commit: [merged repair base](https://github.com/istarwyh/yourbuddy/commit/32801fee00b2f0a671e60ba95158c38f7b338e41), tree `ecb043e9070bbdab43ea656e2391c2890232dded`. The version candidate changes only version metadata and documentation.
- Evidence gallery: [prepared workbench](screenshots/prepared-workbench.png), synthetic data from the macOS PR preflight, not an installed application.
- Evidence download: the [immutable tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.16.zip) contains the original candidate record, not this later failure update. All 15 candidate-changed files were independently extracted and byte-compared; see [source verification](evidence/source-archive-verification.json).

## User release notes

### What changed

Claude Design and Claude Artifacts 2.11.1 are bundled with an in-app managed editor ([PR #90](https://github.com/istarwyh/yourbuddy/pull/90)). The release also includes bounded SDK snapshot-test timeout diagnostics ([#87](https://github.com/istarwyh/yourbuddy/pull/87)), PATH-safe component directories ([#88](https://github.com/istarwyh/yourbuddy/pull/88)), deterministic equivalent-Store archives ([#89](https://github.com/istarwyh/yourbuddy/pull/89)), and the idle-watchdog test startup-race correction ([#91](https://github.com/istarwyh/yourbuddy/pull/91)).

The unpublished 0.4.14 and 0.4.15 candidates exposed missing fixture patch inputs and a stale installed-peer roster. [PR #92](https://github.com/istarwyh/yourbuddy/pull/92) corrects the fixture; [PR #93](https://github.com/istarwyh/yourbuddy/pull/93) covers every actual product peer and the Artifacts Client, and verifies branding reset through committed settings plus an independent read. All original identity and rendered/reloaded branding checks remain. The [0.4.14](../yourbuddy-v0.4.14/README.md) and [0.4.15](../yourbuddy-v0.4.15/README.md) failure records remain available; neither tag was moved and neither has a GitHub Release or installer.

### Problem solved

Design artifacts can open inside the workbench. Equivalent Store contents produce identical archives when file modes and tools match, despite input order and timestamps. Failure-only SDK snapshot-test diagnostics report progress stages without request contents; component cache paths no longer insert a colon into PATH. The watchdog test waits for the real SDK request before advancing its fake timer.

### Where to use it

Use Artifacts in a selected workspace. Create opens a fresh, unsent `/claude-design` draft, preserves the selected Agent Preset and uses YourBuddy’s configured default model. Existing drafts remain untouched. The [adapter guide](../../../apps/desktop-tauri/product/claude-design-adapter/README.md) owns detailed behavior and prerequisites.

### How to try it

Open Artifacts, create a Design draft and review it before sending. After the model writes the project and calls `yourbuddy_design_open`, select the artifact to open its managed editor. Saved comments support Send to Agent; non-comment page-button requests return HTTP 409. CI exercises the draft/editor with synthetic files, not actual model generation.

### Install or upgrade

After publication, use the Apple Silicon Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest), or the existing signed updater. A tag or passing preflight alone does not establish public availability.

### Compatibility, migration, and limitations

The Harness selection stays `0.2.0-rc.1`. PATH-safe cache names encode `:` as `%3A`; old directories remain but are not reused. The first canonical Store archive can require a fresh download because its signed digest changes, even with the same content identifier. This is not shared CAS or incremental downloads. Related issues [#57](https://github.com/istarwyh/yourbuddy/issues/57), [#83](https://github.com/istarwyh/yourbuddy/issues/83), [#85](https://github.com/istarwyh/yourbuddy/issues/85) and [#86](https://github.com/istarwyh/yourbuddy/issues/86) remain open. Original 120-second timeout and historical 13 GB usage causes remain unresolved. Agent self-upgrade from [#80](https://github.com/istarwyh/yourbuddy/pull/80) is not included.

Managed LAN Share is unsupported. Real-model generation, native macOS Tauri/WebView Design interaction and HTML/PDF/PNG export/saving, cold Session/controller restoration, Windows editor ownership, installed-app upgrade and data downgrade compatibility remain unverified. Prepared Chromium does not establish a complete first launch without system Node.

### Sources and licenses

[UPSTREAM.json](../../../apps/desktop-tauri/product/claude-design-adapter/UPSTREAM.json) pins the upstream revision, npm 2.11.1 integrities and reviewed integration patches. Package LICENSE, NOTICE.md and editor third-party notices remain intact. These are mixed terms, not collectively MIT. Upstream NOTICE reports Anthropic-origin material without a published license; bundling and source pinning do not resolve or grant those rights.

## Verification summary

| Scenario | Status | Build under test | Evidence and limits |
|---|---|---|---|
| Complete macOS prepared input and product acceptance | Passed | 0.4.15 repair source before version bump; PR #93 head `5f1fb66f8d000a679e1cfd51931837a6ba219c94` | [Run 42357799474](https://github.com/istarwyh/yourbuddy/actions/runs/42357799474); [retained evidence](evidence/prepared-preflight.json) |
| Exact Design draft/editor and offline restore | Passed | Historical combined product tree `b2f40dd` | [Bootstrap 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573), 4/4; actual Chromium and 570 restored packages, no real model |
| Complete combined source CI | Passed | Historical PR #90 combined source | [CI 42346920678](https://github.com/istarwyh/yourbuddy/actions/runs/42346920678), 16/16 |
| Store archive and fixture regressions | Passed | Included #89 and #92 source | [Source checks](../yourbuddy-v0.4.15/evidence/source-checks.json), [fixture repair](../yourbuddy-v0.4.15/evidence/fixture-repair.json); 49 archive, 63 component and 8 renderer tests |
| Peer/Artifacts and reset regressions | Passed | Reviewed #93 source | [Repair evidence](evidence/verifier-repair.json); 49/49 focused tests, including the real Chromium stream-lifecycle regression; rejected duplicate peer, missing Client and false reset success |
| Local prepared run | Passed with input limit | macOS 15.6.1 arm64, Node 22.22.3, pnpm 11.7.0 | Full Host/Harbor/Chromium with 568 inputs; two native optional packages missing, not complete-input evidence |
| Version candidate checks | Passed | Local 0.4.16 metadata candidate | [Commands and results](evidence/candidate-checks.json) |
| Release prepared acceptance | Failed | Exact tagged 0.4.16 source | [Failure record](evidence/release-failure.json); installed-phase Settings closed after reload; packaging, native acceptance and publication were skipped |

## Scenario: complete macOS prepared preflight

[The PR job](https://github.com/istarwyh/yourbuddy/actions/runs/42357799474/job/128359625473) runs the exact prepared-acceptance step from the release workflow with read-only repository permission and no publication credentials. Its CI merge `62036fdc894174d920bc03ea4be116593777cc6f` has tree `ecb043e9070bbdab43ea656e2391c2890232dded`, identical to the reviewed repair head. The [record](evidence/prepared-preflight.json) gives UTC timestamps, runner/runtime versions, physical inputs and observed results. Data and model interactions are synthetic/keyless.

1. Install frozen tools, build the source and run normal `prepare:dist`.
2. Restore the frozen Store offline and inspect every actual package manifest. Require all 570 packages and both nonempty executable macOS Codex/Claude SDK native inputs, not merely the install log count.
3. Run the real core Host/Profile, browser document previews and branding persistence; install Harbor into the isolated Profile and exercise the assembled Host/Chromium path again.

The observed result is 570/570 inputs, no missing packages, 85 matching core peer links, 9 core and 10 Harbor-assembled Clients, ready Harbor Python 0.10.3, and complete default/custom/reloaded/reset/reset-reloaded branding snapshots. The actual result is recorded without treating local 568-input runs as equivalent. This is prepared acceptance, not a native packaged WebView or model-generation test.

The [first preflight](https://github.com/istarwyh/yourbuddy/actions/runs/42353419140/job/128346222480) verified 570 inputs but failed waiting for `Default restored` after Settings closed. Video showed restored branding; the old helper did not observe reset persistence. The corrected helper checks the exact reset HTTP/RPC result and an independent settings read, with the original rendering and reload assertions retained. Six regressions failed under the old synchronization and passed after the change. The cause of the panel closing remains unassigned; this is an acceptance synchronization correction, not a claimed product lifecycle fix.


The [second preflight](https://github.com/istarwyh/yourbuddy/actions/runs/42355415779/job/128352321356) verified the same complete native inputs, but its branding navigation timed out before the reset helper ran. A diagnostic local run found two completed bridge/proxy iframes holding six same-origin Host streams. A controlled Chromium fixture reproduced the original 30-second `load` timeout; closing the completed proxy page released all six streams and resumed the queued navigation. The same regression passed in 189 ms after the cleanup correction. The final verifier closes that page only after all proxy assertions, retaining `load`, its 30-second budget and every product assertion. Bounded, sanitized resource diagnostics remain. This demonstrates the lifecycle risk and repair; the earlier CI timeout did not retain enough pending-resource evidence for direct attribution.

## Release attempt failure

[Release run 42359577825](https://github.com/istarwyh/yourbuddy/actions/runs/42359577825/job/128364887933) failed on 2026-11-07 at 09:36:58 UTC during the unchanged prepared acceptance. Core 9 Clients and its branding/reset journey passed; Harbor Python and Profile installation passed. In the installed browser phase, the custom brand persisted after reload, but the second Settings opening disappeared before reset. Video shows the dialog opening and closing about 40 ms later. HTTP 200 and completed navigation/load distinguish this from the prior navigation stall; no reset RPC ran in this phase. The [failure screenshot](screenshots/installed-settings-failure.png) shows the synthetic workbench after the panel disappeared, with Research Lab still applied.

A controlled real Host reproduction held the reloaded Session-list response until Settings was open, then released it. Settings disappeared about 29 ms later; no onboarding dialog appeared and the root stayed non-inert throughout the original 10-second observation. The settings shell closes on selecting an onboarding registration, even when the feature renders nothing while loading or skipping. This is a product race, not a reason to weaken or retry the branding assertions. The [failure record](evidence/release-failure.json) distinguishes the actual failure from controlled reproduction; the [repair record](evidence/settings-race-repair.json) captures the local product correction and unchanged prepared acceptance, with complete-input CI still pending.

## Delivery status

- Product publication: failed before packaging or publication. Independent public checks after the failure found no 0.4.16 Release; latest and the stable updater still identify 0.4.13.
- Verification archive: candidate, preflight, failure and independent tag-source extraction recorded. No 0.4.16 installer hashes/signatures or native acceptance exist.
- Website synchronization: no product-guidance change in this maintenance follow-up. The existing bilingual plugin guidance deployment and [six live checks](../yourbuddy-v0.4.15/evidence/website-live.json) are historical evidence. Stable latest-download links need independent confirmation after publication; no manual site deployment is part of this release.
- Unverified scope: native/model/cold-restoration and remaining issue limitations above apply. The unrelated PR Cloudflare preview upload lacks its configured API token; no credentials or preview permissions were changed.

## Rollback

Keep immutable [0.4.13](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) and its original signed updater manifest. A withdrawal can restore the previous latest-release designation and stable feed without moving tags or replacing installer bytes. Already updated applications need a manual previous-DMG reinstall because the updater accepts only newer versions. Quit the app and back up its data first; data downgrade compatibility is unverified.

The [independently downloaded updater baseline](../yourbuddy-v0.4.15/evidence/rollback-updater-0.4.13.json) is 1,971 bytes, SHA-256 `098682e27e293fbca5122b23bf5519b1dde900c0cf1d282f4f2617658ac8947c`. This records rollback preparation, not a rollback performed.
