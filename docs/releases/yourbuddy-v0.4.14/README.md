# YourBuddy 0.4.14

English | [中文](README.zh.md)

This archive separates tested source and prepared Chromium behavior from pending packaged acceptance and public delivery.

- Release identifier: `yourbuddy-v0.4.14`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: pre-publication source evidence; release workflow and public assets pending.
- Evidence commit: [merged source](https://github.com/istarwyh/yourbuddy/commit/5c70f4c24d289cb696898b84b23f26470c750fd7), tree `b2f40dd17aacf6b6532e9569aae6e33e919c2e26`.
- Evidence gallery: not captured for this candidate; linked CI logs record the prepared browser scenario.
- Evidence download: [immutable tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.14.zip), available after publication; independent extraction remains pending.

## User release notes

### What changed

YourBuddy bundles Claude Design and Claude Artifacts 2.11.1 with an in-app managed editor ([PR #90](https://github.com/istarwyh/yourbuddy/pull/90)). The release also includes bounded SDK snapshot-test timeout diagnostics ([#87](https://github.com/istarwyh/yourbuddy/pull/87)), PATH-safe component directories ([#88](https://github.com/istarwyh/yourbuddy/pull/88)), deterministic equivalent-Store archives ([#89](https://github.com/istarwyh/yourbuddy/pull/89)), and the idle-watchdog test startup-race correction ([#91](https://github.com/istarwyh/yourbuddy/pull/91)).

### Problem solved

Design artifacts can open in the workbench instead of merely launching an external page. Equivalent Store contents produce identical archives when file modes and tools match, despite input order and timestamp differences. Failure-only SDK snapshot-test diagnostics identify progress stages without recording request contents; component cache paths no longer insert a colon into PATH. The test change waits for the real SDK request before advancing its fake timer.

### Where to use it

Use the Artifacts sidebar in a selected workspace. Its create action opens a fresh, unsent `/claude-design` draft, preserves the selected Agent Preset and uses YourBuddy’s configured default model. Existing drafts remain untouched. The [adapter guide](../../../apps/desktop-tauri/product/claude-design-adapter/README.md) owns detailed behavior and prerequisites.

### How to try it

Open Artifacts, create a Design draft and review it before sending. After the model writes the project and calls `yourbuddy_design_open`, choose the artifact to open its managed editor. Saved comments support Send to Agent; non-comment page-button requests return HTTP 409, so use a saved comment instead. The prepared CI checks the draft and managed editor with synthetic files; actual model generation remains unverified.

### Install or upgrade

After publication, use the Apple Silicon Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest), or the existing signed updater. Public availability is not established by a tag or a successful source check.

### Compatibility, migration, and limitations

The Harness selection stays `0.2.0-rc.1`. PATH-safe cache names encode `:` as `%3A`; old directories remain but are not reused. The first canonical Store archive can require a fresh download because its signed digest changes even when the content identifier is unchanged. This is not shared CAS or incremental download support. Related issues [#57](https://github.com/istarwyh/yourbuddy/issues/57), [#83](https://github.com/istarwyh/yourbuddy/issues/83), [#85](https://github.com/istarwyh/yourbuddy/issues/85) and [#86](https://github.com/istarwyh/yourbuddy/issues/86) remain open. The original 120-second timeout cause and the historical 13 GB usage cause remain unresolved. Agent self-upgrade from [#80](https://github.com/istarwyh/yourbuddy/pull/80) is not included.

Design’s managed editor cannot enable LAN Share. Real-model generation, native macOS Tauri/WebView interaction, HTML/PDF/PNG export and saving, cold Session/controller restoration, and Windows editor ownership still need acceptance. Prepared Chromium and source tests do not establish these outcomes or complete first launch without a system Node installation.

### Sources and licenses

The [source record](../../../apps/desktop-tauri/product/claude-design-adapter/UPSTREAM.json) pins the upstream revision, both npm 2.11.1 integrities and the reviewed integration patches. Package LICENSE, NOTICE.md and editor third-party notices remain intact. These are mixed terms, not collectively MIT. Upstream NOTICE reports Anthropic-origin material without a published license; bundling and the source record do not resolve or grant those rights.

## Verification summary

| Scenario | Status | Build under test | Evidence and limits |
|---|---|---|---|
| Combined Design Bootstrap, offline restore and Chromium | Passed | Exact merged product tree `b2f40dd` | [Run 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573), 4/4 jobs; synthetic data, no real model |
| Equivalent Store archives and source regressions | Passed | #89 tree `fcbb7f85`; included in merged source | [Run 42337855050](https://github.com/istarwyh/yourbuddy/actions/runs/42337855050), 16/16 jobs; [source record](evidence/source-checks.json) |
| Release versions and publishing helpers | Passed | Local 0.4.14 metadata candidate | 10 Node tests; [candidate checks](evidence/candidate-checks.json) |
| Complete combined main CI | Pending at archive preparation | PR #90 combined source | [Run 42346920678](https://github.com/istarwyh/yourbuddy/actions/runs/42346920678); do not infer success from Bootstrap |
| Packaged release and independent public downloads | Not verified | Release workflow not yet run | Native and publication checks remain required |

## Scenario: installed Design and offline restore

On 2026-11-07, [Bootstrap run 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573) ran from 06:25:12 to 06:32:57 UTC. Its CI merge `86edf476463e21e49206375e8a8df5ce73378624` has the same `b2f40dd17aacf6b6532e9569aae6e33e919c2e26` tree as merged source `5c70f4c24d289cb696898b84b23f26470c750fd7`. The Linux prepared Harness used real Host/Profile and installed 2.11.1 packages, synthetic projects and no model credentials.

The job prepared an offline seed, restored 570 packages with zero downloads, ran 31 Node and 25 Vitest regressions, and started the real Host lifecycle smoke. Chromium loaded the installed Artifacts Client, created an unsent draft and opened the managed sandboxed editor. Deliberately invalid Design configuration left the workbench and Session creation available. All four workflow jobs passed.

The expected and observed result is a working draft/editor path with isolated feature failure. The linked run retains step logs rather than a before/after image set. An earlier local Chromium attempt was blocked by Unix-socket permissions; the successful exact-tree CI run supplies the browser evidence. This remains prepared Linux/Chromium evidence, not native macOS export, real model generation or cold controller restoration.

## Delivery status

- Product publication: pending; the existing tag-triggered release workflow retains its build, signature, prepared-browser and native Offline checks.
- Verification archive: source evidence and rollback baseline included; public assets, independent evidence extraction and release-run observations remain pending.
- Website synchronization: bilingual default-plugin guidance updated; local website checks and the existing automatic master deployment are recorded separately from application publication. Live pages remain unchecked.
- Unverified scope: the native/model/cold-restoration and remaining issue limitations above apply; no existing installation or user Session was replaced by candidate preparation.

## Rollback

Keep the immutable [0.4.13 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) and its original signed updater manifest. A withdrawal can restore the prior latest-release designation and stable updater feed without moving public tags or replacing installer bytes. Already updated applications need a manual previous-DMG reinstall because the updater accepts only newer versions. Quit the app and back up its data first; data downgrade compatibility is unverified.

The independently downloaded [0.4.13 updater baseline](evidence/rollback-updater-0.4.13.json) is 1,971 bytes with SHA-256 `098682e27e293fbca5122b23bf5519b1dde900c0cf1d282f4f2617658ac8947c`. This records rollback preparation, not a rollback already performed.
