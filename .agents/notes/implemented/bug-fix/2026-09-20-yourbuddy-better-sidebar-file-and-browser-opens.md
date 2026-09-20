# Agent Note: YourBuddy Better Sidebar file and browser opens

Status: implemented

English | [中文](2026-09-20-yourbuddy-better-sidebar-file-and-browser-opens.zh.md)

## Problem

YourBuddy mounts Better Sidebar's workbench through the native desktop Slot, where the plugin-owned panel store may not carry the active Session. File-tree clicks and the context-menu new-tab action used an unscoped `openTab`, so the native Sidebar could not choose a destination and silently opened nothing. The Browser tab submitted addresses, but its restrictive iframe sandbox left ordinary sites such as Baidu blank unless the user manually disabled the sandbox.

## Decision

Better Sidebar file opens name the owning `{ sessionId, cwd }` explicitly when they call the native Sidebar service. File-tree clicks, context-menu opens, Changes-tab opens, and explorer reveals therefore resolve against the Session that owns the originating tab rather than incidental plugin panel state.

The Browser tab defaults `browserNoSandbox` to `true`. A user may opt into the restricted iframe sandbox from Side card settings. When enabled, ordinary cross-origin pages retain their origin and top-level navigation capability for compatibility, while the GUI's own origin and unapproved loopback addresses keep the opaque restricted token set.

YourBuddy records both decisions as digest-bound Better Sidebar product patches. Product refresh replays them into source and distributed bundles before validating the refreshed snapshot.

## Alternatives considered

**Keep implicit Session selection.** Native Slot tabs can outlive or bypass the plugin panel state, so the store is not an authority for the destination Session.

**Keep the restricted sandbox as the default and require manual unlock.** The address bar appeared to accept navigation while common sites rendered a blank page, making the Browser tab fail its primary task by default.

**Maintain only materialized snapshot edits.** A product refresh replaces the npm snapshot. Replayable patches keep the shipped bundle and source reproducible and fail visibly when an upstream change overlaps them.

## Consequences

File actions have a stable Session destination in native Sidebar presentation. Browser navigation works without a per-tab unlock after a default installation; unrestricted embedded pages receive the normal capabilities of a cross-origin iframe, including top-level navigation, and users who prefer the restricted mode can enable it explicitly. Focused tests execute both distributed Client bundles, preserve the GUI-origin and loopback exceptions, and assert the new default; product refresh tests verify sequential patch replay and snapshot hashes.
