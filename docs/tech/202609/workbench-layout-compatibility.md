---
description: "Technical plan for swapping the YourBuddy workbench and conversation surfaces while maintaining downstream DSH and Better Sidebar changes."
---

# YourBuddy workbench layout compatibility and provenance plan

English | [中文](workbench-layout-compatibility.zh.md)

YourBuddy maintains the layout change on its own branch: the Better Sidebar workbench becomes the primary desktop surface and the DSH conversation moves to the auxiliary right column. DSH and Better Sidebar keep their existing defaults outside YourBuddy, and the product provenance records the upstream source plus the small downstream change set.

Status: design only. The runtime and refresh changes described here are not implemented yet.

## Contents

- [Current ownership](#current-ownership)
- [Decisions](#decisions)
- [Runtime design](#runtime-design)
- [Downstream maintenance](#downstream-maintenance)
- [Upgrade workflows](#upgrade-workflows)
- [Implementation sequence](#implementation-sequence)
- [Functional acceptance](#functional-acceptance)
- [Rollback](#rollback)
- [Further exploration](#further-exploration)
- [Developer note](#developer-note)

<a id="current-ownership"></a>

## Current ownership

| Concern | Current owner | Required change |
|---|---|---|
| Shell tracks and handles | [`ui-layout/AppFrame.tsx`](../../../packages/client/ui-layout/src/client/AppFrame.tsx) owns `sidebar | center | details` | Add an optional workbench surface and primary/auxiliary placement. |
| Shell child surfaces | [`ui-layout/src/client/index.ts`](../../../packages/client/ui-layout/src/client/index.ts) declares `sidebar`, `conversation`, `details`, and `shell.overlay` | Declare an optional root-scoped `workbench` slot without replacing `conversation`. |
| Better Sidebar presentation | [`dsh-better-sidebar/src/client/index.tsx`](../../../apps/desktop-tauri/product/dsh-better-sidebar/src/client/index.tsx) mounts a body portal and loads frame compensation CSS | Keep Portal as the default and add a Slot presentation selected by YourBuddy. |
| Better Sidebar behavior | The plugin service and store own tabs, viewers, terminals, interceptors, and workbench state | Reuse the same service and store in both presentation modes. |
| DSH update | [`sync-dsh-upstream.mjs`](../../../apps/desktop-tauri/scripts/sync-dsh-upstream.mjs) merges an official DSH Release into the YourBuddy branch | Keep the layout change as committed downstream code and reconcile it during each merge. |
| External plugin update | [`refresh-product-plugins.mjs`](../../../apps/desktop-tauri/scripts/refresh-product-plugins.mjs) replaces product snapshots from npm or GitHub | Reapply the Better Sidebar compatibility patch to each new staged snapshot. |

<a id="decisions"></a>

## Decisions

1. YourBuddy continuously maintains the DSH layout change on its own branch; an official DSH Release is not a prerequisite.
2. DSH adds a generic optional `workbench` slot and two placements. Its default remains `conversation-primary`; YourBuddy selects `workbench-primary`.
3. Better Sidebar keeps `portal` as its default presentation and adds `slot` for YourBuddy.
4. Both modified codebases are committed in the YourBuddy repository. DSH updates use Merge and comparison; Better Sidebar updates rebuild the product snapshot from upstream plus its compatibility patch.
5. Provenance stays small: it records the upstream identity, patch file, patch hash, purpose, and affected paths. The implementation does not introduce a general patch platform or extensive policy engine.

<a id="runtime-design"></a>

## Runtime design

### Shell placement

`@deepseek-ai/dsh-client-ui-layout` adds an optional single `workbench` slot with root scope. Without an occupant, AppFrame renders the current three-column layout.

| Placement | Primary surface | Auxiliary surface | Selected by |
|---|---|---|---|
| `conversation-primary` | Conversation | Workbench, when present | DSH default |
| `workbench-primary` | Workbench | Conversation | YourBuddy |

The desktop track order is navigation, primary surface, details, and auxiliary surface. The details column remains available instead of being replaced by the conversation or workbench.

Narrow windows keep the conversation as the full-width task surface and expose the workbench through its existing drawer behavior.

### Geometry and state

DSH owns the outer grid, rendered widths, responsive layout, and drag handles. Better Sidebar owns the user's workbench preference and content state.

The Better Sidebar store already keeps tab trees, panel state, and content per session while sharing the last dragged panel width across sessions. Slot mode keeps that behavior. A small registration on `ctx.layout` exposes the current open state and preferred width and accepts toggle and resize requests from AppFrame.

The layout registration is installed and removed with the plugin lifecycle. AppFrame falls back to the current conversation layout when the workbench registration or occupant is absent.

### Better Sidebar presentation

Better Sidebar separates capability setup from its outer shell while creating only one store and one `betterSidebar` service.

- `portal` creates the current body host and keeps the current right-panel and bottom-panel behavior.
- `slot` registers the workbench into the DSH `workbench` slot and lets AppFrame own the outer width and drag handle.
- Both modes keep the same built-in and third-party tabs, viewers, terminals, file actions, side chat, subagent views, interceptors, locale integration, settings, split panes, bottom workbench, floating windows, and per-session content state.

The Better Sidebar Host config adds `presentation: 'portal' | 'slot'` with `portal` as the default. The existing boot-decision response carries the resolved value to the Client before it mounts the presentation.

The existing compensation stylesheet remains one file, but its frame-level selectors apply only while the lifecycle-owned body attribute identifies `portal` presentation. Slot mode can load the same stylesheet without activating Portal layout rules.

### Product selection

YourBuddy configures Better Sidebar with `presentation: 'slot'` and configures DSH layout with `workbench-primary`. No product plugin replaces `root`, `conversation`, or the `betterSidebar` service.

<a id="downstream-maintenance"></a>

## Downstream maintenance

Both components are committed in their modified form. Their upstream update strategies differ because DSH has mergeable Git history while the external Better Sidebar snapshot is replaced during refresh.

| Component | Repository state | Update strategy |
|---|---|---|
| DSH | Modified source committed on the YourBuddy branch | `merge-and-compare` |
| Better Sidebar | Modified `src` and runtime `lib` snapshot committed under `apps/desktop-tauri/product` | `replace-replay-and-compare` |

### DSH downstream change

The DSH layout change remains a small normal commit restricted to `packages/client/ui-layout` and directly related documentation and tests. An official DSH update merges into the YourBuddy branch and therefore preserves the change or presents an ordinary Git conflict for review.

The DSH patch file is a provenance artifact generated against the recorded official Commit. It is applied only to a clean temporary copy of that official source when checking that the committed downstream files still represent the recorded change. It is never applied again to the already modified YourBuddy working tree.

### Better Sidebar downstream change

The Better Sidebar npm archive is a replaceable snapshot. The compatibility patch therefore includes the changed `src` files and the runtime `lib` files that the package exports. This avoids adding a second product build pipeline for the external package.

Refresh downloads the new pristine snapshot into a temporary directory, applies the compatibility patch there, runs the focused package and bundled-client checks, and replaces the committed product directory with the resulting snapshot.

### Minimal provenance

`DSH_UPSTREAM.json` continues to record the official repository, Tag, version, and Commit and adds a short `patches` list for materialized downstream changes. Each entry records `id`, `file`, `sha256`, `purpose`, and `paths`.

`dsh-better-sidebar/YOURBUDDY_UPSTREAM.json` keeps its current package, source, integrity, archive, upstream tree, and final tree fields. Its `patches` entries become structured references containing `id`, `file`, `sha256`, and `purpose`.

The bundle manifest includes these provenance records and patch hashes. Patch contents remain product source inputs; the runtime does not read them.

No separate patch registry, approval workflow, compatibility range solver, or generic transformation language is introduced. A patch that no longer applies is maintained together with the corresponding upstream upgrade.

<a id="upgrade-workflows"></a>

## Upgrade workflows

### DSH Release upgrade

1. Create an isolated upgrade worktree and fetch the selected official DSH Tag.
2. Merge the official Commit through the existing DSH synchronization flow.
3. Resolve any conflict in the small layout change and review upstream changes in the affected files.
4. Regenerate the DSH provenance patch against the new official Commit.
5. Run the focused layout tests, build, bundled-app smoke, and visible layout journey.
6. Update `DSH_UPSTREAM.json` and commit the merge, downstream adjustment, patch, and provenance together.

### Better Sidebar upgrade

1. Download and unpack the selected npm snapshot in the existing refresh staging directory.
2. Reapply the Better Sidebar compatibility patch to the new snapshot.
3. Adjust the patch when upstream changed the same presentation code or already contains part of the behavior.
4. Run the plugin tests and built Client smoke against the staged snapshot.
5. Update the patch reference and `YOURBUDDY_UPSTREAM.json`.
6. Replace and commit the product snapshot, patch, lockfile, and provenance together.

<a id="implementation-sequence"></a>

## Implementation sequence

### 1. Implement the DSH layout change

- Add the optional `workbench` slot, placement setting, geometry registration, fourth track, and auxiliary drag handle.
- Preserve the existing result when no workbench occupant exists.
- Cover the two placements, details open and closed, resize, session switch, and narrow layout.

### 2. Adapt Better Sidebar

- Separate capability setup from Portal and Slot presentation mounting.
- Add the Host `presentation` setting to the existing boot response.
- Scope compensation CSS to Portal mode and register the workbench plus geometry callbacks in Slot mode.
- Preserve the existing service, store, tabs, terminals, viewers, bottom workbench, floats, and integrations.

### 3. Record the downstream sources

- Add one DSH layout patch artifact for provenance and one Better Sidebar compatibility patch covering source and runtime bundle output.
- Extend the two existing provenance files with the minimal structured patch entries.
- Update refresh and bundle scripts only as needed to reproduce the two declared change sets.

### 4. Activate YourBuddy

- Select Better Sidebar `slot` presentation and DSH `workbench-primary` placement in product composition.
- Update the frozen product lockfile and bundled inputs.
- Exercise the complete desktop and narrow-window user journey in the bundled app.

<a id="functional-acceptance"></a>

## Functional acceptance

| Area | Required result |
|---|---|
| Default DSH | Without a workbench occupant, DSH keeps its current conversation layout. |
| Default Better Sidebar | Without YourBuddy configuration, Better Sidebar keeps its current Portal presentation. |
| YourBuddy desktop | Navigation stays left, the workbench is the flexible primary surface, details remain available, and conversation is the resizable right surface. |
| Conversation | Streaming, tools, approvals, composer attachments, scrolling, stop, retry, and session switching remain usable. |
| Workbench | Built-in and third-party tabs, explorer, editor, diff, terminal, browser, side chat, subagent views, split panes, bottom workbench, floats, and restored content remain usable. |
| Geometry | Drag handles follow the visible columns, Portal compensation is inactive in Slot mode, and changing sessions keeps the shared width preference. |
| Narrow window | Conversation and approvals remain reachable and the workbench opens as a drawer. |
| Lifecycle | Reload and plugin reactivation produce one workbench surface and preserve stored content. |
| Upgrade | One DSH Release upgrade and one Better Sidebar snapshot refresh preserve the layout change through their documented workflows. |

<a id="rollback"></a>

## Rollback

YourBuddy can restore `conversation-primary` and Better Sidebar `portal` presentation without downgrading either component. The workbench content store remains unchanged, so switching presentation does not discard tabs or terminal records.

If a compatibility change must be removed, remove its product configuration first and delete the downstream code and provenance patch in the same follow-up change.

<a id="further-exploration"></a>

## Further exploration

- Confirm the auxiliary conversation minimum width and details-column behavior in the first UI spike.
- Decide whether the bottom workbench remains inside the primary workbench surface or becomes a separate future layout contribution.
- Revisit the downstream patch only when upstream DSH or Better Sidebar later provides equivalent behavior.

<a id="developer-note"></a>

## Developer note

Owner: YourBuddy desktop product maintainers. Created: 2026-09-19. Review by: the first implementation PR or 2026-10-31, whichever comes first. Promotion target: implemented architecture and release documentation after the runtime and refresh changes merge. The plan deliberately favors the smallest feature-specific implementation over a general validation or patch-management framework.
