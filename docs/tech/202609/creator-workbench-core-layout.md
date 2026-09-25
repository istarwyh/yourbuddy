---
description: "Technical reference for the Better Sidebar-centered YourBuddy workbench and the Content detail mode that shares its middle seat."
---

# YourBuddy Better Sidebar-centered workbench architecture

English | [中文](creator-workbench-core-layout.zh.md)

## Product model

Better Sidebar is the core YourBuddy workbench. It owns the middle working experience: tabs, splits, files, editors, terminals, browsers, and other tool views. DSH Conversation appears on the right so a user can work and talk to the Agent at the same time, and it can collapse completely when the user wants the middle workbench to use the full remaining width.

The left sidebar offers **Sessions** and **Content** navigation tabs. Switching that left tab changes the navigation list only. Selecting a specific content item temporarily replaces Better Sidebar's visible middle surface with the content detail workspace. Closing the content detail, returning to Sessions, or invoking “Back to workbench” restores Better Sidebar with its prior tabs and splits intact.

Content is a temporary middle-seat mode, not a Better Sidebar tab, a second outer column, or the product's primary shell.

## Layout model

The creator product uses this outer arrangement:

```text
Navigation | Middle workbench seat | Session right area
```

The middle seat has exactly two product-owned modes:

| Mode | Visible middle content | Entry action | Exit action |
|---|---|---|---|
| `core` | Better Sidebar | Application start, Sessions navigation, close Content | Select a content item |
| `content` | Selected content detail | Select a content item | Close, Back to workbench, or Sessions navigation |

The middle-mode switch does not add or remove an AppFrame track, change the right Session width or expanded state, select another Session, or alter Better Sidebar's store. One product coordinator owns the middle mode plus the right Session's expanded preference and restored width. Better Sidebar and Oil Creator contribute content only.

The right Session area is one product-visible region composed from DSH `rightbar` plus Conversation. It has one explicit expanded state. Collapsing it removes both outer tracks completely and lets the middle seat use the released width while preserving each inner surface's state; expanding restores the saved Conversation width and retained rightbar presentation without changing the middle mode. Existing left-sidebar collapse remains available. The middle seat does not support independent collapse.

## Composition ownership

[`AppFrame`](../../../packages/client/ui-layout/src/client/AppFrame.tsx) owns the desktop and narrow-view grid and consumes the generic occupied-workbench state registered through [`LayoutController.registerWorkbench()`](../../../packages/client/ui-layout/src/client/service.ts). The YourBuddy product coordinator is the single root `workbench` occupant and the only product component that coordinates the middle mode with aggregate Session geometry.

Better Sidebar contributes the durable `workbench.core` child, and Oil Creator contributes the temporary `workbench.content` child. Neither feature owns AppFrame tracks, sibling widths, or Conversation geometry. Oil Creator renders content detail inside the assigned middle bounds; it does not register a docked `shell.overlay`, query the Conversation host, or write Conversation padding.

The [workbench compatibility record](workbench-layout-compatibility.md) documents Better Sidebar placement and upstream integration. This page owns the YourBuddy product composition around that placement.

## Component composition

The product coordinator occupies the root `workbench` slot for the complete creator-profile lifetime. It declares two explicit child seats rather than a general provider framework:

```text
root
└─ workbench                 YourBuddyWorkbenchHost
   ├─ workbench.core         Better Sidebar
   └─ workbench.content      Oil Creator content detail
```

The host renders both children inside the same middle grid cell. Better Sidebar's child remains mounted and operational in both modes so component and store state survive the temporary replacement. In `content` mode its wrapper is visually hidden and excluded from focus and the accessibility tree without adding resource-suspension behavior. Content detail is rendered above it in the same bounds. Returning to `core` reveals the existing Better Sidebar tree and triggers its normal size observers.

The two child slots are deliberately `single` and product-specific because there are exactly two consumers. The composition does not expose a public dynamic workbench-provider registry.

The coordinator, not Better Sidebar, registers the outer workbench binding with `ctx.layout`. Its snapshot contains the Session region's requested expansion and preferred positive Conversation width. AppFrame derives `0px` for both the reported rightbar reservation and auxiliary Conversation track while collapsed, then restores the rightbar report and clamped Conversation width while expanded. Middle-mode changes never write either field.

A restore control lives in the middle host or persistent shell chrome, never inside the collapsed Session area. Explicitly creating or selecting a Session expands the right area because the user targeted Conversation. Ordinary streaming, tool activity, content selection, and middle-mode switching cannot expand it; the explicit Session input-request and Turn-completion events below can.

On narrow viewports, AppFrame uses one visible content surface at a time. An expanded Session keeps Conversation primary and presents the workbench through its existing drawer; a collapsed Session makes the workbench host primary and retains a persistent Conversation restore control. The host still switches Better Sidebar and Content inside the same workbench bounds and never creates a second overlay.

## State ownership

| State | Owner | Lifetime |
|---|---|---|
| Middle mode: `core` or `content` | Product workbench coordinator | Creator-profile Client lifetime |
| Right Session expanded preference | Product workbench coordinator | Validated device-local preference |
| Right Session preferred positive width | Product workbench coordinator | Validated device-local preference, preserved while collapsed |
| Better Sidebar tabs, split tree, terminals, viewers, and per-Session state | Better Sidebar store and services | Better Sidebar plugin lifetime |
| Left Sessions/Content navigation tab | Oil Creator sidebar store | Creator plugin lifetime and device-local preference |
| Selected content, detail tab, drafts, and internal detail width | Oil Creator store and Host service | Creator plugin lifetime; durable data remains on disk or Host |
| Current Session and Conversation view | DSH Session and Conversation packages | Existing Session mechanisms |
| Outer tracks and responsive placement | `ui-layout` | Root layout lifetime |

Switching middle modes changes only the coordinator's `mode`. Selecting content updates the Oil Creator selection first and enters `content` only after the selected record is accepted. Exiting content clears or retains the selection according to the creator navigation command, but never mutates Better Sidebar state.

Better Sidebar's store is created once in its `apply()` lifetime before its Slot component mounts. Presentation registration is separate from service and store creation. Keeping the component mounted also protects component-local editor, terminal, scroll, and focus restoration that the store does not record.

## Product coordinator service

The coordinator exposes a narrow product service used by the Oil Creator sidebar and content detail:

- `showCore()` reveals Better Sidebar without changing its active tab or the current Session.
- `showContent(id)` asks Oil Creator to select and validate the content item, then reveals Content detail.
- `closeContent()` reveals Better Sidebar and moves focus to the control that opened or closes the detail.
- `setSessionExpanded(expanded)` collapses rightbar and Conversation reservations to zero or restores their recorded presentation without changing middle mode.
- `setSessionWidth(width)` updates only the positive Conversation width restored by the next expansion.
- `getSnapshot()` and `subscribe()` expose the current mode, selected content identity, Session expansion, and preferred width to registered UI through a framework-bound observable.

The coordinator does not expose arbitrary provider registration, React nodes, grid styles, or Session mutation. Better Sidebar and Oil Creator register into their declared child slots through `ctx.slots.inject()` and never import each other's components.

The left navigation follows these transitions:

1. Selecting **Content** changes the left list to the content library and leaves the middle mode unchanged.
2. Selecting a content item invokes `showContent(id)` and displays its detail in the middle seat.
3. Selecting **Sessions** or pressing “Back to workbench” invokes `showCore()` and preserves the current Session expansion.
4. Explicitly creating or selecting a Session invokes `showCore()` and expands the right Session area.
5. Closing Content cannot close Better Sidebar, clear its tabs, or otherwise change the right Conversation.

Repeated selection of the same content item keeps the content mode and updates no outer geometry. Selecting another item replaces only the creator detail state.

## Open-intent and Agent-event rules

Every Better Sidebar open request carries product intent: `user` for an explicit gesture or `background` for Agent and automation activity. A user-intent request creates or activates the target tab, invokes `showCore()`, and focuses that tab without changing Session expansion. A background request creates or updates the hidden Better Sidebar state and may mark the workbench restore control, but it cannot replace visible Content or change focus.

The collapsed Session region follows semantic Session events rather than DOM observation or localized text. Streaming chunks, tool activity, and ordinary background updates keep it collapsed. A user-input request expands the Session region and reveals the question or approval UI. Turn completion expands the Session region and reveals the final Conversation state. These event-driven expansions preserve the current middle mode and do not clear Content or Better Sidebar state.

The event Consumer owns the expansion decision at the point where it recognizes the authoritative Session state. UI badges and restore controls derive from the same recorded state; they do not independently infer completion.

## Better Sidebar responsibilities

Better Sidebar is fully enabled in the default creator profile. Its registry service, built-in tools, native file actions, tab model, per-Session state, and optional external tab contributions remain product capabilities.

Its presentation ownership is limited to the core child:

- In YourBuddy slot mode, Better Sidebar registers its component into `workbench.core` and receives a `visible` owner prop.
- Its store, service, native surface, interceptors, and registrations remain active while Content is visible.
- The product coordinator owns the outer auxiliary Session-width binding.
- Portal presentation outside YourBuddy remains an upstream Better Sidebar concern and does not use the product coordinator.

Better Sidebar remains mounted and operational while Content is visible. The implementation adds no resource suspension, process pausing, or hidden-mode optimization. Its wrapper alone becomes hidden and inert for presentation and accessibility. Revealing schedules the existing resize path so terminals and editors measure the restored bounds.

## Content responsibilities

Oil Creator owns the left Content library and contributes one middle content-detail component to `workbench.content`. That component contains the overview, video, script, subtitle, cover, article, publishing, and workflow-stage UI.

Oil Creator has no outer-geometry behavior:

- It does not register `ContentInspector` as a docked `shell.overlay`.
- It does not query `conversationHost()`.
- It does not call `applyConversationInset()` or write Conversation padding.
- It does not position content detail from `--oil-sidebar-width`.
- It does not own an outer middle or Session width.

Content may retain an internal detail-tab layout and an internal list-detail width if both remain inside the assigned middle bounds. Unsaved script and subtitle drafts live in the Oil Creator store, while committed files and long-running jobs remain under their Host owners. Returning to Better Sidebar therefore cannot discard a draft, cancel a job, or make component visibility the only copy of user work.

## Upstream alignment and package boundaries

DSH core receives only a generic layout capability: an occupied workbench may report whether the auxiliary main region is expanded, its preferred positive width, and whether the associated rightbar reservation participates in the current solve. `ui-layout` owns the calculation and DOM tracks. Its source contains no YourBuddy, Better Sidebar, Oil Creator, Content, or creator-profile identifiers.

The product coordinator lives under the YourBuddy product composition and owns all product semantics: `core/content`, the aggregate Session region, open intent, Agent-event expansion, and persistence. It composes feature packages through Cordis services and declared Slots, never through runtime component imports.

Better Sidebar owns its tab platform and contributes only `workbench.core`; its YourBuddy compatibility patch contains the presentation adapter and no Content behavior. Oil Creator owns creator data and contributes only `workbench.content`; it contains no AppFrame, Conversation, rightbar, or Better Sidebar geometry knowledge. Each package can build and test without importing another feature package's runtime.

Upstream synchronization checks three properties: the DSH integration remains generic; Better Sidebar and Oil Creator snapshots record upstream identities plus minimal patches; and product verification rebuilds artifacts, reapplies patches without fuzz, then runs the real composition journey. A failed patch application or changed generic layout contract blocks the refresh instead of silently retaining a divergent bundle.

This separation cannot prevent upstream APIs from changing, but it keeps product-specific behavior out of DSH main code and makes every required adaptation explicit, small, and testable.

## Persistence

The coordinator stores one versioned record for the aggregate Session expanded preference, its last positive Conversation width, and optional last middle mode. Collapsing never overwrites the positive width or the rightbar occupant's own presentation state; AppFrame masks those tracks only in rendered geometry. The default startup mode is always `core`, and the product does not reopen a content detail after an application restart.

Oil Creator's device-local record owns its navigation tab, selected content, filter, query, and internal detail preferences. Outer overlay width is not creator-owned state. Durable scripts, subtitles, covers, articles, and publish state remain in the creator library and Host records.

Better Sidebar's persisted tabs and preferences retain their existing format. The coordinator exclusively reads and writes the aggregate Session geometry record; provider and creator code do not access that record directly.

## Focus and accessibility

The middle host has one labelled region regardless of mode. Its mode controls expose `aria-expanded` or selected state where appropriate, and Content detail provides a labelled “Back to workbench” action.

Entering Content moves focus to the content heading only after the selected item commits. Closing Content restores focus to the selected content row or the Back control's logical predecessor. Hidden Better Sidebar content uses `hidden` or equivalent `inert` behavior so its controls cannot receive focus and screen readers do not announce both modes.

Collapsing a focused Session moves focus to its persistent restore control in the middle host or shell chrome. Expanding it moves focus into Conversation only after an explicit Session-targeting action; a plain restore leaves focus on the control. The collapse control exposes `aria-expanded` and `aria-controls`, and the zero-width Session subtree is inert while preserving its state.

Responsive movement into or out of the narrow drawer does not steal focus. A failed Content load keeps the Content heading, error message, and Back action visible inside the middle seat.

## Failure and lifecycle rules

- The coordinator occupies the root workbench for one Cordis effect lifetime and releases its layout binding and child declarations together.
- Missing `workbench.core` prevents creator-profile activation from silently presenting an empty default; the composition fails at the earliest resolvable point.
- Missing `workbench.content` rejects `showContent()` and preserves visible Better Sidebar.
- Content loading failure stays in the middle content surface and leaves Conversation geometry unchanged.
- Better Sidebar render failure stays in its existing error boundary and does not prevent Content detail from providing a Back action.
- Oil Creator disposal while Content is visible atomically returns the coordinator to `core`.
- Better Sidebar disposal invalidates the required core composition rather than selecting Content as a permanent fallback.
- HMR cannot create duplicate root, core, content, layout-binding, or Remote registrations.
- Collapsing Session preserves its positive width, rightbar presentation, current Session, view, scroll state, and active generation.
- An input request or completed Turn for the current Session expands the aggregate Session region exactly once; an event for a non-current Session marks navigation state but never switches Sessions implicitly.
- A background Better Sidebar open cannot replace Content; a user-intent open cannot leave its target hidden.
- A missing restore control is a composition failure; the product cannot enter an unrecoverable zero-width Session state.
- No middle-mode transition writes an outer width, Session expansion, or Session selection as a side effect.

## Implementation ownership

| Owner | Responsibility |
|---|---|
| YourBuddy product composition | Owns `YourBuddyWorkbenchHost`, the coordinator service and state, the two child slots, the root layout binding, open-intent rules, Session-event expansion, and device-local aggregate geometry preferences. |
| `ui-layout` | Owns generic occupied-workbench geometry, desktop and narrow AppFrame tracks, and masking or restoring the associated rightbar and auxiliary main reservations. |
| Better Sidebar YourBuddy adapter | Contributes `workbench.core`, keeps the Better Sidebar store and component alive, and exposes visibility without owning outer geometry or Content behavior. |
| Oil Creator | Contributes `workbench.content`, owns content selection and drafts, routes navigation through the coordinator, and keeps all content UI inside the assigned middle bounds. |
| Product build and refresh path | Records exact upstream identities, applies minimal patches without fuzz, rebuilds artifacts, rejects stale composition output, and exercises the real YourBuddy journey. |

The YourBuddy profile has one coordinator-owned root workbench. It does not maintain direct feature registration and coordinator registration as parallel composition modes.

## Verification coverage

| Layer | Verified behavior |
|---|---|
| Coordinator state | Default `core`, valid core/content transitions, missing-content rejection, Session collapse and restore, positive-width preservation, and transition independence |
| Coordinator component | Both child registrations, Better Sidebar mounted while hidden, focus exclusion, Back action, persistent Session restore control, and narrow presentation |
| Better Sidebar | Store and component state survive core → content → core; services remain active while hidden; `user` opens reveal their tab and `background` opens do not replace Content |
| Oil Creator | Content navigation changes only the left list; a content row opens middle detail; drafts survive return; Sessions and Back restore core; no overlay or Conversation style writes occur |
| Session events | Streaming and tools remain collapsed; a current-Session input request and Turn completion expand once; non-current completion never switches Session |
| Layout regression | One stable workbench occupant; identical Session state across Content mode; collapsed rightbar and Conversation tracks are both zero; expansion restores both presentations |
| Lifecycle | Disposal and HMR remove every root and child registration exactly once; Oil disposal returns core; missing Better Sidebar or restore control fails loud |
| Real composition | YourBuddy preserves tabs, drafts, rightbar state, Session identity, and width across Content entry, both open intents, aggregate collapse, event-driven expansion, and return |
| Browser replay | The keyless journey covers Sessions → Content list → Content detail → Back, complete Session-region collapse, and automatic Conversation opening for input and completion |
| Product release | Built artifacts use coordinator slots, contain no outer-geometry adapter, record exact upstream identities, apply minimal patches without fuzz, and keep product identifiers out of `ui-layout` |

Focused package tests, `pnpm run test:gui`, and `DSH_SNAPSHOT=replay pnpm run test:web` cover the implementation. Release evidence also includes the product-visible GUI interaction recording.

## Observable behavior

At application start, Better Sidebar occupies the middle seat. Switching the left navigation to Content changes only the left list; selecting a content item displays its detail in the same seat. Back, close, and Sessions navigation restore the same Better Sidebar tabs, splits, terminal sessions, editor state, and scroll context.

Middle-mode transitions preserve the aggregate Session region's expanded state, selected Session, Conversation width, and rightbar presentation. The user can collapse both rightbar and Conversation to zero-width tracks and restore them through a control that remains visible.

A user-intent Better Sidebar open reveals and focuses its target. A background open updates the hidden workbench without replacing Content. Current-Session input requests and Turn completion expand Conversation; streaming and tool activity do not, and non-current Sessions never steal selection.

Content drafts and Host jobs survive every switch without relying on component visibility as their only state. Content detail uses the root workbench bounds and never registers a docked shell overlay. Oil Creator contains no Conversation DOM query, sibling padding write, or outer-width owner.

On narrow viewports, the workbench is primary while Session is collapsed, and a persistent Conversation restore control remains available without a second overlay. DSH `ui-layout` contains only generic auxiliary-layout semantics; Better Sidebar, Content, Agent-event, and creator-profile decisions remain in product packages. Real composition and browser replay cover both open intents, aggregate collapse, and event-driven Conversation expansion.

## Limitations

Navigation retains its existing collapse, but the middle seat cannot collapse independently. The implementation does not suspend Better Sidebar resources while Content is visible, and package separation cannot prevent upstream API changes. Supported compositions preserve the two middle modes, explicit aggregate Session collapse, and one outer-geometry owner; provider-owned sibling widths and DOM padding adapters are unsupported.

## Developer note

Owner: YourBuddy desktop product maintainers. This reference describes the YourBuddy 0.3.16 composition, where Better Sidebar is the durable product workbench and Content is a temporary focused surface in the same product-owned seat.
