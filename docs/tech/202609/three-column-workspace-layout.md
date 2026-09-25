---
description: "Technical design for an independently collapsible three-column YourBuddy workspace with stable workbench-provider switching."
---

# YourBuddy three-column workspace layout

English | [中文](three-column-workspace-layout.zh.md)

Status: proposed technical design. This document defines the implementation target; it does not claim that the layout is implemented.

## Goal

YourBuddy has three stable top-level columns: navigation on the left, the primary workbench in the middle, and the current Session on the right. Each column can collapse independently, so the shell supports every three-column, two-column, and one-column arrangement while keeping at least one content column visible.

Better Sidebar is the default primary-workbench provider. Content Workbench is another provider for the same middle seat. Selecting a provider or an inner tool changes middle-column content only; it never creates another outer track, changes the Session column width, or opens a shell overlay.

The existing DSH `rightbar` remains a Session-owned inner panel. It does not become a fourth top-level column.

## Current defect

[`AppFrame`](../../../packages/client/ui-layout/src/client/AppFrame.tsx) currently renders `sidebar | workbench | rightbar | auxiliary main` whenever a workbench registers. It subtracts the workbench binding's auxiliary width before solving the sidebar and right-panel tracks. [`LayoutController.registerWorkbench()`](../../../packages/client/ui-layout/src/client/service.ts) exposes only presence and one width, so workbench occupancy, primary placement, and Session-column sizing are coupled.

Better Sidebar registers the single `workbench` slot and a width binding when its presentation is `slot`; its binding therefore controls the auxiliary Conversation width. The Content plugin does not register another primary-workbench provider. Selecting content registers `ContentInspector` in `shell.overlay`, positions it beside the navigation sidebar, and applies `padding-left` directly to the Conversation host in the prebuilt [`oil-creator` client](../../../apps/desktop-tauri/product/oil-creator/lib/client.js).

That path explains the observed failure: selection changes Conversation geometry even when the intended middle tool is absent or visually obscured. The overlay and DOM-inset adapter bypass shell track ownership, so the shell cannot preserve the right Session column or report a failed middle mount.

## Semantic columns

| Column id | Meaning | Default content | Collapsed footprint | State owner |
|---|---|---|---|---|
| `navigation` | Global navigation and workspace selection | YourBuddy navigation sidebar | 56 px control rail | Root layout store |
| `primary` | The current workbench provider | Better Sidebar | 0 px | Root layout store for visibility and provider id; provider for inner state |
| `session` | Current Session with Conversation, Trajectory, and Harbor views | Current Conversation | 0 px | Root layout store for visibility and width; Session packages for inner state |

A collapsed navigation rail is restoration chrome, not an expanded content column. The one-column layout therefore contains one expanded content column, with the 56 px rail present only when navigation is collapsed.

The Session column owns its current view and its inner `rightbar`. Opening a file viewer, details panel, or Session tool may change that inner composition but cannot add an AppFrame grid track outside the Session column.

## State model

The root layout store records four independent dimensions:

| State | Values | Mutation source |
|---|---|---|
| Requested visibility | One boolean for each semantic column | Explicit collapse and expand actions only |
| Preferred geometry | Navigation width and Session width in pixels | Outer drag handles only |
| Active primary provider | Registered provider id | Provider-selection action only |
| Last focused column | One semantic column id | Focus entering a column or an explicit reveal action |

Provider-local state is not copied into the root store. Better Sidebar continues to own tabs, split trees, terminals, and per-Session workbench state. Content Workbench owns its landing/detail route, selected content id, active detail tab, and inspector width. Conversation, Trajectory, Harbor, and the inner `rightbar` retain their existing owners.

The store exposes requested state and a pure solver derives rendered state from the viewport. Responsive concessions never rewrite requested visibility or preferred widths. Widening the frame therefore restores the user's prior arrangement.

At least one of `navigation`, `primary`, and `session` must be requested visible. A direct attempt to collapse the last visible column is rejected by the action that owns the mutation; controls disable the same operation.

## Composition API

The root slot hierarchy changes from one optional single `workbench` occupant to a keyed primary-workbench seat. The shell renders the entry whose key matches `activePrimaryProviderId`.

```text
root
├─ navigation
├─ primary.workbench[key = activePrimaryProviderId]
└─ session
   ├─ main[key = active Session view]
   └─ rightbar
```

The concrete implementation may retain the public `sidebar`, `main`, and `workbench` names during an adjacent migration, but their semantics and cardinality must match this hierarchy. `workbench` becomes keyed rather than single, and every current consumer is updated in the same change.

`ILayout` becomes the sole outer-layout command owner and provides these operations:

- `setColumnExpanded(column, expanded)` changes requested visibility without changing provider or inner-tool state.
- `toggleColumn(column)` is the corresponding user command.
- `selectPrimaryProvider(providerId)` validates a registered keyed entry and changes only the active provider id.
- `revealColumn(column)` expands and focuses one column without collapsing siblings.
- `setNavigationWidth(width)` and `setSessionWidth(width)` persist drag results.

The layout's observable snapshot supplies requested visibility, rendered visibility, preferred widths, active provider, and last focus. Components receive it through the existing framework-bound observable mechanism; feature components do not subscribe to `ctx` or query shell DOM.

YourBuddy product composition configures Better Sidebar as the default provider. Generic DSH does not hard-code a product plugin id. A stale persisted provider id resolves to the configured default before the first committed snapshot.

## Provider and tool navigation

Provider selection and inner navigation are separate transactions.

1. Choosing **Content** in global navigation calls `selectPrimaryProvider(contentProviderId)`.
2. The shell keeps the current visibility mask and both preferred widths.
3. The keyed middle seat mounts Content Workbench in place of Better Sidebar.
4. Choosing a Content card updates Content Workbench's own route or selected content id.
5. A failed inner-tool load renders an error or empty state inside the middle seat; it does not touch any outer-layout action.

Returning to Better Sidebar changes only the provider id. Each provider's retained store restores its own active tab or route. Provider disposal removes its keyed entry; if it was active, the shell atomically selects the configured available fallback without changing visibility or geometry.

No provider may write outer padding, grid templates, or sibling widths. `shell.overlay` remains for transient frame-wide UI such as toasts and modal layers, not docked workbench content.

## Column solver

The desktop grid always follows semantic order: `navigation | primary | session`. Only rendered-expanded columns contribute content tracks; handles exist only between adjacent expanded columns.

- Navigation uses its clamped preferred width when expanded.
- Session uses its clamped preferred width when expanded beside another content column.
- Primary consumes the remaining width.
- If Primary is hidden, the remaining non-navigation column consumes available width without overwriting its preference.
- A single expanded content column fills all space after restoration chrome.
- Dragging the navigation boundary updates only the navigation preference; dragging the Session boundary updates only the Session preference.

The initial desktop minima are 264 px for Navigation, 420 px for Primary, and 400 px for Session. The solver includes handles and the 56 px collapsed navigation rail when deciding whether requested columns fit. These values stay implementation constants unless product configuration supplies a current consumer for changing them.

When the viewport cannot satisfy all requested minima, the solver derives a compact presentation without changing the stored mask. It first reduces expanded Navigation to its rail. If two content columns still cannot fit, it displays the last-focused content column and exposes the other through the shell column switcher. Re-expanding the viewport restores the complete requested arrangement and its preferred widths.

## Supported transitions

There are seven valid requested visibility masks.

| Expanded columns | Result |
|---|---|
| Navigation + Primary + Session | Full three-column workspace |
| Navigation + Primary | Workbench-focused two-column workspace |
| Navigation + Session | Session-focused two-column workspace |
| Primary + Session | Workbench and Session without expanded navigation |
| Navigation only | Navigation management view |
| Primary only | Distraction-free workbench |
| Session only | Distraction-free Session |

Collapse and expand actions preserve the hidden column's width, active provider, inner route, and scroll state. Expanding restores those values. Switching providers preserves the complete outer state. Switching Sessions preserves the outer state and lets Session-scoped provider stores select their corresponding inner state.

## Persistence and migration

Outer layout preferences are device-local UI state. They do not enter the Session log, model context, workspace data, or URL. Persist one versioned record containing requested visibility, navigation width, Session width, active provider per workspace, and last focus. Validate the local-storage record at its parser boundary and resolve missing providers through product configuration.

Provider state remains in provider-owned storage. Better Sidebar's current `dsh-sidebar:v1:width` value maps once to the new Session preferred width because that value currently sizes the auxiliary Conversation column. Content's selected id and detail-tab state move into the Content provider store; its inspector width remains provider-local and does not become an outer-column width.

The migration removes `applyConversationInset()`, the Conversation-host DOM query, docked `shell.overlay` registration, and the CSS variable that positions Content beside the sidebar. It also removes the workbench provider's ability to own Session width through `registerWorkbench()`.

URL navigation may request a Session or provider in a later route design, but it does not encode pixel widths or collapse state. Such a request must use the same validated layout commands rather than mutate the store directly.

## Focus and accessibility

Each expanded column has a labelled collapse control with `aria-expanded` and `aria-controls`. A shell-level column switcher remains keyboard reachable when Primary or Session is hidden; the collapsed navigation rail provides the equivalent control for Navigation.

Collapsing a focused column moves focus to its restoration control. Expanding a column moves focus to its heading only when the user invoked an explicit reveal command; responsive restoration does not steal focus. Provider switching moves focus to the provider heading after its keyed entry commits. Error boundaries keep the heading and restoration controls mounted when provider content fails.

The DOM order remains Navigation, Primary, Session in every mask. CSS track changes never reorder focus or reading order.

## Failure and lifecycle rules

- A provider selection commits only when its keyed entry exists; an invalid command preserves the current provider.
- A stale persisted id resolves before render, so an absent provider never reserves a blank track.
- Provider render failure stays inside the Primary error boundary and leaves all tracks unchanged.
- Provider registration and disposal follow Cordis effect lifetimes and prove removal through the existing Slot lifecycle tests.
- Async tool opening uses the layout navigation abort signal where applicable; a superseded result cannot change the active provider or visibility.
- A Session or inner-rightbar failure cannot collapse Navigation or Primary.
- No mount, error, or empty state may mutate preferred widths as a side effect.

## Implementation phases

### 1. Root layout model

Extend the `ui-layout` store with semantic visibility, provider selection, focus, and Session-width state. Replace the current workbench-presence arithmetic with the pure three-column solver and move `rightbar` composition under Session.

### 2. Keyed provider seat

Change the workbench slot to keyed cardinality, add provider retention and validation beside the existing main-panel retention, and configure Better Sidebar as YourBuddy's default keyed entry. Better Sidebar stops registering a width binding and renders full-size inside its assigned middle seat.

### 3. Content Workbench migration

Register Content Workbench as a keyed primary provider. Move its landing page, selected-content details, and tool routes into that entry. Remove the docked overlay and Conversation padding adapter. Content navigation selects the provider; content cards change only provider-local state.

### 4. Collapse controls and persistence

Add per-column controls, the shell switcher, focus restoration, the versioned local record, and the one-time width migration. Keep responsive rendered state derived rather than persisted.

### 5. Product verification

Verify the assembled YourBuddy composition, then remove compatibility code only after Better Sidebar, Content Workbench, and the shell use the new APIs. Update the [workbench compatibility record](workbench-layout-compatibility.md) when implementation changes its documented runtime ownership.

## Test matrix

| Layer | Required evidence |
|---|---|
| Store unit tests | All seven masks; rejection of the empty mask; width preservation; provider selection independent from visibility; stale-provider fallback |
| Solver unit tests | Three, every two, and every one-column arrangement at boundary widths; responsive concession and widening restoration; no preference mutation |
| AppFrame component tests | Semantic DOM order, adjacent handles, collapse controls, focus restoration, and unchanged grid geometry across provider switches |
| Layout service tests | Keyed registration, invalid selection, active-provider disposal, navigation abort, and HMR-safe cleanup |
| Better Sidebar tests | Default selection, per-Session state retention, no width binding, and full-seat rendering |
| Content Workbench tests | Navigation selects Content; card selection changes middle content; load failure remains in the middle; no `shell.overlay` dock or Conversation style mutation |
| Real composition test | Loader boots YourBuddy with both providers, exercises three→two→one→three transitions, switches providers in every mask, and observes stable Session width |
| Browser replay | Keyless Web scenario covers the reported click path and narrow/wide restoration; product-visible implementation includes the required GUI recording evidence |

The focused implementation checks are `pnpm run test:gui` and `DSH_SNAPSHOT=replay pnpm run test:web`, followed by the outgoing-diff checks selected through `dsh-pre-push-checks`. Documentation changes continue to run `pnpm run doc-sync` and link validation.

## Acceptance criteria

1. Better Sidebar appears in the middle by default, and Content replaces it in the same DOM and grid seat.
2. Every valid visibility mask is reachable through visible controls, and the shell never enters an empty mask.
3. Collapsing or expanding one column does not reset another column's width or inner state.
4. Switching primary providers does not change outer widths, visibility, Session selection, or Session view.
5. Clicking a Content item visibly changes the middle provider state or shows a middle-seat error; it never only shrinks Conversation.
6. Opening the Session `rightbar` stays inside the Session column and does not create a fourth outer track.
7. Responsive concessions restore the requested desktop arrangement after widening.
8. Provider failure, disposal, and HMR leave a usable restoration control and deterministic fallback.
9. No Content or Better Sidebar code queries Conversation DOM or writes sibling geometry.

## Non-goals

This design does not merge provider business stores, move Session data into layout persistence, define mobile feature redesigns, or turn every overlay into a column. It introduces one keyed primary-workbench extension point and one root-owned outer-layout model because Better Sidebar and Content Workbench are current consumers.

## Developer note

Owner: YourBuddy desktop and Web Client maintainers. Review this design together with the first implementation change to `ui-layout`, Better Sidebar, or Content Workbench. The implementation must update the owning subsystem and package documentation when the slot and layout service types change.
