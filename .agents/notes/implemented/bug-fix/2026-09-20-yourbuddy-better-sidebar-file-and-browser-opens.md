# Agent Note: YourBuddy Better Sidebar file and browser opens

Status: implemented

English | [中文](2026-09-20-yourbuddy-better-sidebar-file-and-browser-opens.zh.md)

## Problem

YourBuddy mounts Better Sidebar through native right-Sidebar tabs and a bottom workbench. File-tree actions forwarded `{ sessionId, cwd }` into the plugin service, but the native surface later discarded that ownership and called the mounted right-Sidebar controller. A global panel can unmount that controller while the workbench and current Session remain visible, and the optional per-Session methods returned no acceptance signal, so clicks could be dropped. The Browser tab submitted addresses, but its restrictive iframe sandbox left ordinary sites such as Baidu blank unless the user manually disabled the sandbox.

## Decision

A file action inside a native tab uses that occurrence's `tab.actions.openResource`, which closes over the owning Session and pane. File-tree clicks, context-menu opens, and Changes-tab opens therefore keep their Session ownership through the final host navigation. In-place editor navigation replaces its native tab; explicit new-tab actions reveal an existing file tab or open one in the owning Session; open-to-the-side creates a native pane under the host's pane budget and room rule.

The bottom workbench uses the controller's public Session-targeted methods. Those writes report whether an adopted Session store accepted the operation; Better Sidebar retains rejected operations and retries them in request order before another open, when the Session list changes, or when the host announces that the target store was adopted.

The Browser tab defaults `browserNoSandbox` to `true`. A user may opt into the restricted iframe sandbox from Side card settings. When enabled, ordinary cross-origin pages retain their origin and top-level navigation capability for compatibility, while the GUI's own origin and unapproved loopback addresses keep the opaque restricted token set.

YourBuddy records both decisions as digest-bound Better Sidebar product patches. Product refresh replays them into source and distributed bundles before validating the refreshed snapshot.

## Alternatives considered

**Forward Session fields only through the plugin service.** Native tabs already receive occurrence actions bound to their owning Session and pane. Re-entering the host through a global controller reintroduces mounted-seat lifecycle and current-Session heuristics at the final navigation step.

**Keep the restricted sandbox as the default and require manual unlock.** The address bar appeared to accept navigation while common sites rendered a blank page, making the Browser tab fail its primary task by default.

**Maintain only materialized snapshot edits.** A product refresh replaces the npm snapshot. Replayable patches keep the shipped bundle and source reproducible and fail visibly when an upstream change overlaps them.

## Consequences

Native tab file actions keep their occurrence-owned Session destination, and workbench opens remain pending when the Session store cannot accept them. Browser navigation works without a per-tab unlock after a default installation; unrestricted embedded pages receive the normal capabilities of a cross-origin iframe, including top-level navigation, and users who prefer the restricted mode can enable it explicitly. Focused tests execute normal, replacement, and side file opens from both distributed Client bundles, verify their published declarations, cover FIFO rejected-then-adopted Session writes, preserve the GUI-origin and loopback exceptions, and assert the Browser default; product refresh tests verify sequential patch replay and snapshot hashes.
