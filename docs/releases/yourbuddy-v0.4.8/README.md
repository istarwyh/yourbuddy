# YourBuddy 0.4.8

English | [中文](README.zh.md)

This archive records the Agent Browser style fix, left-sidebar creator Library, and local resource support.

- Release identifier: `yourbuddy-v0.4.8`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate; public artifacts have not been published.
- Evidence commit: the candidate selected by `yourbuddy-v0.4.8` after publication.
- Evidence gallery: [assembled workbench](screenshots/assembled-workbench.png), captured in Chromium with the native bridge mocked.
- Evidence download: the [release page](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.8) becomes available after publication.

## User release notes

### What changed

Agent Browser preserves its CSS when other plugins load or unload. Oil Creator displays its Library below Workspaces and Sessions in the expanded left sidebar. Selecting an item opens its detail in the middle workbench. The desktop Host permits local HTTP media, and Better Sidebar can access host paths outside the selected workspace.

### Problem solved

The module loader no longer assigns existing effect-owned styles to an unrelated plugin. Idle Agent Browser preview cleanup no longer starts a capture worker. The creator Library no longer occupies the main panel. Local media and file browsing no longer encounter the previous desktop restrictions.

### Where to use it

Use Agent Browser, the left-sidebar Library, Oil Creator content details, and Better Sidebar file and media tabs.

### How to try it

Open Agent Browser and reload another plugin; its toolbar should retain its layout. Expand the left sidebar, select an item from Library, and inspect its details in the middle workbench. Open a local video or a file outside the selected workspace through Better Sidebar.

### Install or upgrade

After publication, use the application updater or download the Bootstrap or Offline DMG from GitHub Releases. The updater continues to deliver the complete Offline application archive introduced in 0.4.7.

### Compatibility, migration, and limitations

The target is macOS Apple Silicon. No Session data migration is required. Public downloads, updater metadata, packaged native startup, native WebView interaction, signing, and notarization are not verified during candidate preparation.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Workspace and module lifecycle | Passed | Source | macOS arm64, Node 22 | 221 tests in four owning Vitest files |
| Product overlay and compatibility | Passed | Source and committed plugin bundles | macOS arm64, Node 22 | 29 overlay/compatibility tests, 20 product-refresh tests, and 19 cleanup/release-smoke tests |
| Native overlay composition | Passed | Local Rust test build | macOS arm64 | Six overlay tests |
| Host and Client compilation | Passed | Local build | macOS arm64 | `DSH_CLIENT_TITLE=YourBuddy pnpm run build` completed |
| Repository lint | Passed | Source | macOS arm64 | `pnpm run lint:contracts-ready` |
| Product website | Passed | Local HTML build | macOS arm64 | 59 product pages checked |
| Assembled product | Passed | Generated offline Harness bundle | macOS arm64, Chromium with mocked native bridge | 81 runtime peer links, nine Client plugins, Library details, external links, marketplace, proxy, lifecycle, and branding |

## Evidence scope

These checks ran on 2026-10-05 in Asia/Shanghai during this candidate preparation. The initial Client compilation found missing test parameter types; the test adapter was corrected and Client compilation then passed. The Agent Browser fix also passed a built-loader smoke with the actual bundled Ego Browser before this preparation. Existing user-owned application processes were kept running. The generated offline Store was restored and installed without network access, and the assembled product smoke passed. Its native bridge was mocked; native application behavior and public delivery remain unverified.
