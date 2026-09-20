# Agent Note: Desktop shell chrome and overlay plugins

Status: implemented

English | [中文](2026-08-14-desktop-shell-overlay-plugins.zh.md)

## Problem

The desktop fork must add window chrome, a tray, signed updates, and task-complete alerts without placing native authority in Harness packages. Any generic client composition change must remain a recorded product patch that can be reviewed and replayed during an upstream refresh. Features that must observe Host session events cannot live only in the WebView, because that would require changing the shipped web client.

## Decision

**Native chrome authority stays in `apps/desktop-tauri`.** The main window is frameless. `shell.html` owns the actual minimize, maximize, close, and drag operations. Personal Workbench projects their presentation into the expanded `sidebar.header.action` seat immediately before the collapse button through a fixed-version `postMessage` protocol; the Shell validates the active iframe source, exact Host origin, message fields, and allowlisted action before calling Tauri. macOS renders one horizontal red/yellow/green group without a separator, while Windows and Linux retain the action order resolved by `window_layout.rs`. The Shell keeps a small floating fallback during startup, iframe reload, and the collapsed-sidebar state, so controls remain reachable without a full-height rail or a dedicated title row. The Host iframe receives no Tauri API access.

The splash is a compact transparent window with a borderless radial frost (opaque center, fading edges) using the dark tokens from `design-platform.css` (official fish mark, DeepSeek wordmark, HARNESS badge, and a progress bar). The first close opens an in-window modal in `shell.html` that matches the web client's light `Modal` (mask, r24 card, capsule outline / primary buttons) and writes the answer to `%APPDATA%/DeepSeek Harness/desktop-settings.json` (`closeAction`). Later closes honor that file. The tray can switch minimize-on-close / quit-on-close / ask-next-time without quitting, and Restart sits next to Quit. Hiding the last window does not exit: `ExitRequested` is cancelled until tray Quit, tray Restart, a saved Exit close, or updater restart. Those paths mark quit, stop the Host Node process tree, then `app.exit` or `app.restart` (`app.restart` skips `Drop`, so stop runs first). Windows assigns that tree to a job with `KILL_ON_JOB_CLOSE` so grandchildren die even when destructors do not run. A later launch reaps a stale `host.pid` when the recorded Node image still matches. Clicking the tray shows the window. Single-instance still focuses the existing window.

**Host collaboration is an overlay plugin, not a package edit.** The shell copies `overlay/desktop-notify/index.mjs` into `$DSH_HOME/desktop-overlay`, writes a `--patch` list whose plugin `name` is a `file://` URL, and starts `dsh web --patch <that file>`. A Windows drive path such as `C:/...` is not a valid ESM specifier — Node reads `C:` as a URL scheme — so the overlay must emit `file:///C:/...` (spaces percent-encoded). The plugin listens for `session/event` `turn/end` with `reason.kind === 'completed'` and POSTs to a loopback notify URL supplied as `DSH_DESKTOP_NOTIFY_URL`. The Rust listener shows a system toast and plays `sounds/complete.wav` only when the main window is unfocused.

[YourBuddy product workbench distribution](../feature/2026-08-22-yourbuddy-product-workbench.md) adds its required Harbor plugin row and executable paths to the same native overlay patch without moving product behavior into Harness packages.

**Updates remain the signed Tauri updater.** The signed check runs after the main window opens so a failed or slow network does not hold the splash. The tray "检查更新" item runs the same signed check on demand.

This extends [cross-platform desktop source provisioning](../feature/2026-08-14-cross-platform-desktop-source-provisioning.md) without moving desktop behavior into `packages/`.

## Alternatives considered

**Patch `apps/web` or a `packages/*` plugin.** Rejected because every upstream sync would re-apply or lose the desktop behavior. The overlay uses the documented `--patch` layer instead.

**Write `$DSH_HOME/cordis.patch.yml` directly.** Rejected because that file is the user's home-level patch layer. A generated `--patch` file leaves the home file for the user.

**Give a React title bar native authority.** Rejected because it couples privileged behavior to web-client markup and would expose Tauri operations to Host plugins. The selected header occupant is presentation-only and can request only the Shell's fixed action set.

**Always quit on the title-bar close button.** Rejected because a coding session should survive an accidental close; the first close asks, then the saved preference and the tray own process lifetime.

**Always hide on close with no prompt.** Rejected because some users want close to exit, and a missing tray made hide look like a crash.

## Consequences

Desktop-specific window behavior stays in `apps/desktop-tauri`; the generic sidebar header-action seat is recorded in YourBuddy's DSH provenance patch and contains no native action code. A missing overlay file fails Host startup loud. Users who already have a home `cordis.patch.yml` keep it. Focused-window turns do not toast or chime. Linux hosts without a readable button layout get Windows-style control order. Screenshot assets in `apps/desktop-tauri/screenshots/` are illustrative of the shell, not recorded from a live session.
