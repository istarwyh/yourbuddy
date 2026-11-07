# YourBuddy 0.4.17

English | [中文](README.zh.md)

This archive records the complete-input preflight and the checks for the 0.4.17 release candidate. Publication remains pending until the release workflow and public delivery checks finish.

- Release identifier: `yourbuddy-v0.4.17`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: candidate verified within the recorded scope; installer publication and native acceptance are pending.
- Evidence commit: [merged repair base](https://github.com/istarwyh/yourbuddy/commit/501770ca9f0857fc49695f2e8d2b1c89d1bf9959), tree `94c2d0b412f1938a9bd9691e4c29dfa8ec6fa23c`. The version candidate changes only version metadata and documentation.
- Evidence gallery: [prepared workbench](screenshots/prepared-workbench.png), synthetic data from the macOS PR preflight, not an installed application.
- Evidence download: the [immutable tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.17.zip) will contain this candidate record after publication; independent extraction remains pending.

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

After publication, use the Apple Silicon Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest), or the existing signed updater. A tag or passing preflight alone does not establish public availability.

### Compatibility, migration, and limitations

The Harness selection stays `0.2.0-rc.1`. PATH-safe cache names encode `:` as `%3A`; old directories remain but are not reused. The first canonical Store archive can require a fresh download because its signed digest changes, even with the same content identifier. This is not shared CAS or incremental downloads. Related issues [#57](https://github.com/istarwyh/yourbuddy/issues/57), [#83](https://github.com/istarwyh/yourbuddy/issues/83), [#85](https://github.com/istarwyh/yourbuddy/issues/85) and [#86](https://github.com/istarwyh/yourbuddy/issues/86) remain open. Original 120-second timeout and historical 13 GB usage causes remain unresolved. Agent self-upgrade from [#80](https://github.com/istarwyh/yourbuddy/pull/80) is not included.

Managed LAN Share is unsupported. Real-model generation, native macOS Tauri/WebView Design interaction and HTML/PDF/PNG export/saving, cold Session/controller restoration, Windows editor ownership, installed-app upgrade and data downgrade compatibility remain unverified. Prepared Chromium does not establish a complete first launch without system Node.

### Sources and licenses

[UPSTREAM.json](../../../apps/desktop-tauri/product/claude-design-adapter/UPSTREAM.json) pins the upstream revision, npm 2.11.1 integrities and reviewed integration patches. Package LICENSE, NOTICE.md and editor third-party notices remain intact. These are mixed terms, not collectively MIT. Upstream NOTICE reports Anthropic-origin material without a published license; bundling and source pinning do not resolve or grant those rights.

## Verification summary

| Scenario | Status | Build under test | Evidence and limits |
|---|---|---|---|
| Complete macOS prepared input and product acceptance | Passed | 0.4.16 repair source before version bump; PR #94 head `c88e737ac908699881b4e93c1e9a4e7cc296e3c8` | [Run 42362666422](https://github.com/istarwyh/yourbuddy/actions/runs/42362666422); [retained evidence](evidence/prepared-preflight.json) |
| Exact Design draft/editor and offline restore | Passed | Historical combined product tree `b2f40dd` | [Bootstrap 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573), 4/4; actual Chromium and 570 restored packages, no real model |
| Complete combined source CI | Passed | Historical PR #90 combined source | [CI 42346920678](https://github.com/istarwyh/yourbuddy/actions/runs/42346920678), 16/16 |
| Store archive and fixture regressions | Passed | Included #89 and #92 source | [Source checks](../yourbuddy-v0.4.15/evidence/source-checks.json), [fixture repair](../yourbuddy-v0.4.15/evidence/fixture-repair.json); 49 archive, 63 component and 8 renderer tests |
| Peer/Artifacts and reset regressions | Passed | Reviewed #93 source | [Repair evidence](evidence/verifier-repair.json); 49/49 focused tests, including the real Chromium stream-lifecycle regression; rejected duplicate peer, missing Client and false reset success |
| Settings takeover regression | Passed within local scope | #94 product repair | [Product repair](../yourbuddy-v0.4.16/evidence/settings-race-repair.json); 50 component tests, controlled real Host failure-to-success, unchanged full prepared with 568 inputs |
| Local prepared run | Passed with input limit | macOS 15.6.1 arm64, Node 22.22.3, pnpm 11.7.0 | Full Host/Harbor/Chromium with 568 inputs; two native optional packages missing, not complete-input evidence |
| Version candidate checks | Passed | Local 0.4.17 metadata candidate | [Commands and results](evidence/candidate-checks.json) |
| Release packaging, native acceptance and public delivery | Not verified | 0.4.17 release candidate | Must run through the unchanged release workflow; no claim of published installers yet |

## Scenario: complete macOS prepared preflight

[The PR job](https://github.com/istarwyh/yourbuddy/actions/runs/42362666422/job/128374114853) runs the exact prepared-acceptance step from the release workflow with read-only repository permission and no publication credentials. Its CI merge `b1f48f2ace661567fb9bb0685bb1f37bec05f371` has tree `94c2d0b412f1938a9bd9691e4c29dfa8ec6fa23c`, identical to the reviewed repair head. The [record](evidence/prepared-preflight.json) gives UTC timestamps, runner/runtime versions, physical inputs and observed results. Data and model interactions are synthetic/keyless.

1. Install frozen tools, build the source and run normal `prepare:dist`.
2. Restore the frozen Store offline and inspect every actual package manifest. Require all 570 packages and both nonempty executable macOS Codex/Claude SDK native inputs, not merely the install log count.
3. Run the real core Host/Profile, browser document previews and branding persistence; install Harbor into the isolated Profile and exercise the assembled Host/Chromium path again.

The observed result is 570/570 inputs, no missing packages, 85 matching core peer links, 9 core and 10 Harbor-assembled Clients, ready Harbor Python 0.10.3, and complete default/custom/reloaded/reset/reset-reloaded branding snapshots. The actual result is recorded without treating local 568-input runs as equivalent. This is prepared acceptance, not a native packaged WebView or model-generation test.

The [first preflight](https://github.com/istarwyh/yourbuddy/actions/runs/42353419140/job/128346222480) verified 570 inputs but failed waiting for `Default restored` after Settings closed. Video showed restored branding; the old helper did not observe reset persistence. The corrected helper checks the exact reset HTTP/RPC result and an independent settings read, with the original rendering and reload assertions retained. Six regressions failed under the old synchronization and passed after the change. The cause of the panel closing remains unassigned; this is an acceptance synchronization correction, not a claimed product lifecycle fix.


The [second preflight](https://github.com/istarwyh/yourbuddy/actions/runs/42355415779/job/128352321356) verified the same complete native inputs, but its branding navigation timed out before the reset helper ran. A diagnostic local run found two completed bridge/proxy iframes holding six same-origin Host streams. A controlled Chromium fixture reproduced the original 30-second `load` timeout; closing the completed proxy page released all six streams and resumed the queued navigation. The same regression passed in 189 ms after the cleanup correction. The final verifier closes that page only after all proxy assertions, retaining `load`, its 30-second budget and every product assertion. Bounded, sanitized resource diagnostics remain. This demonstrates the lifecycle risk and repair; the earlier CI timeout did not retain enough pending-resource evidence for direct attribution.

A controlled real Host regression holds the reloaded Session-list response until Settings opens. Before the product fix, releasing it closes Settings without any visible onboarding dialog; after the fix, Settings remains open through Session/model readiness and the original reset/persistence journey completes. The [product repair record](../yourbuddy-v0.4.16/evidence/settings-race-repair.json) preserves that distinction and the local 568-input limit; this PR adds the 50 component regressions to the complete-input macOS check.

## Delivery status

- Product publication: pending the release workflow and independent public checks. Latest and the stable updater still identify 0.4.13 at candidate preparation.
- Verification archive: source and complete-input preflight evidence recorded; installer hashes/signatures, public source extraction and native acceptance remain pending.
- Website synchronization: no product-guidance change in this maintenance follow-up. The existing bilingual plugin guidance deployment and [six live checks](../yourbuddy-v0.4.15/evidence/website-live.json) are historical evidence. Stable latest-download links need independent confirmation after publication; no manual site deployment is part of this release.
- Unverified scope: native/model/cold-restoration and remaining issue limitations above apply. The unrelated PR Cloudflare preview upload lacks its configured API token; no credentials or preview permissions were changed.

## Rollback

Keep immutable [0.4.13](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) and its original signed updater manifest. A withdrawal can restore the previous latest-release designation and stable feed without moving tags or replacing installer bytes. Already updated applications need a manual previous-DMG reinstall because the updater accepts only newer versions. Quit the app and back up its data first; data downgrade compatibility is unverified.

The [independently downloaded updater baseline](../yourbuddy-v0.4.15/evidence/rollback-updater-0.4.13.json) is 1,971 bytes, SHA-256 `098682e27e293fbca5122b23bf5519b1dde900c0cf1d282f4f2617658ac8947c`. This records rollback preparation, not a rollback performed.
