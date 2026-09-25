# Agent Note: YourBuddy product workbench coordinator

Status: implemented

English | [中文](2026-09-25-yourbuddy-product-workbench-coordinator.zh.md)

## Problem

YourBuddy needs Better Sidebar to remain its primary work surface while creator Content can temporarily use the same middle region. The native right Sidebar and Conversation form one user-visible Session region, so hiding only Conversation leaves a misleading occupied track and lets an invisible Content overlay change Conversation geometry. Background Agent resource opens must not take focus from visible Content, while input requests and completed Turns must remain noticeable.

The earlier workbench-primary layout gave Better Sidebar ownership of the root `workbench` slot and its width binding. That ownership cannot coordinate another middle surface, aggregate Session collapse, or product-level navigation intent without feature plugins importing each other or putting YourBuddy vocabulary into generic DSH packages.

## Decision

The first-party `dsh-personal-workbench` plugin is the product coordinator. It alone occupies the root `workbench` slot, declares the product-only `workbench.core` and `workbench.content` children, and owns the single layout binding. Better Sidebar contributes its existing split-pane tree to `workbench.core`; Oil Creator contributes one always-mounted Content Inspector to `workbench.content`. The coordinator hides and inerts the inactive wrapper without unmounting either feature, so Better Sidebar services, terminals, tabs, creator drafts, and Host jobs continue independently of visibility.

The layout binding carries a positive restored width plus `expanded` and `reserveRightbar`. Generic `ui-layout` computes restored geometry even while collapsed, then renders exact zero-width tracks for both native right Sidebar and auxiliary main when `expanded` is false. The right Sidebar receives a separate `visible` presentation fact: it suppresses panels and floats without rewriting its own expanded, fullscreen, tab, or split state. Desktop keeps the middle workbench primary; narrow viewports keep Conversation primary while expanded and make the middle workbench primary while the Session region is collapsed.

The Conversation header and middle-workbench edge can collapse the complete Session region. The middle control remains outside the hidden region and restores the saved positive width; the controls identify the shared region through `aria-controls`, and collapse moves focus out of newly inert Session content to the persistent restore control. The coordinator persists only Session expansion and width; Oil Creator retains content selection and drafts, and Better Sidebar retains its per-Session split tree. Selecting a different current Session shows core and expands the Session region after initial state restoration. A new pending input or approval for the current Session and an appended durable `turn/end` also expand it. Initial replacement, history prepend, transient streaming, tool events, and non-current Sessions do not change selection or expansion.

Better Sidebar resolves every open to explicit `user` or `background` intent. In YourBuddy Slot presentation, opens land in the plugin-owned core split tree instead of the native right Sidebar. User intent asks the coordinator to show core; Agent feeds and other known automatic opens use background intent and update the hidden tree without replacing Content. Portal presentation and direct native tab actions retain the upstream native right-Sidebar behavior.

Oil Creator registers Content through source before its pinned GitHub package build. Its inspector owns no outer width, drag handle, Conversation DOM query, or padding mutation. Product refresh validates and applies digest-bound source patches before building, then replays the existing digest-bound materialized package patch without fuzz; a changed upstream context fails before replacing the reviewed snapshot.

## Alternatives considered

**Give Better Sidebar and Content separate shell columns.** Rejected because a permanently reserved Content column weakens Better Sidebar as the product core and spends horizontal space when no detail is active.

**Make Content a Better Sidebar tab.** Rejected because creator detail has product navigation and draft lifetime independent from Better Sidebar tab persistence, and it would require one feature package to depend on another feature package's runtime API.

**Keep Oil Creator as a `shell.overlay` that pads Conversation.** Rejected because overlay visibility and Conversation geometry have different owners; selecting Content can shrink a region the user cannot see, which caused the reported defect.

**Collapse only Conversation or pass `canShow: false` to the right Sidebar.** Rejected because the right Sidebar would retain a visible track or interpret aggregate suppression as a failed-fit request and destroy its own expanded preference.

**Suspend hidden feature resources.** Rejected because visibility is presentation state. Terminal sessions, registered views, draft state, and Host jobs need no second pause protocol, and introducing one would couple product navigation to feature internals.

**Put Content and Better Sidebar policy in `ui-layout`.** Rejected because the shell needs only generic auxiliary geometry and owner visibility. Product slot names, open intent, Agent attention rules, and Content selection belong to the first-party product plugin.

## Consequences

YourBuddy presents left navigation, a Better Sidebar-centered middle workbench, and an independently collapsible right Session region. Content temporarily replaces only the visible middle surface, repeated selection remains useful, background Agent opens do not steal focus, and Conversation returns when the current Agent needs user attention or finishes a Turn. Collapse preserves native right-Sidebar and Conversation state instead of translating aggregate visibility into feature state.

The generic DSH extension grows by required workbench geometry fields and a rightbar `visible` owner prop, with no YourBuddy identifiers. The product coordinator becomes the durable owner of cross-feature layout policy and must remain earlier than required product-service consumers in Cordis activation. Better Sidebar and Oil Creator snapshots carry strict replay patches, so upstream upgrades must either apply exactly or stop for review.

Focused store, layout, rightbar, open-intent, Oil source, and refresh tests pin individual behavior. The desktop release verifier boots the assembled Host, observes both mounted middle children, collapses to two zero-width hidden Session tracks, restores them, and checks Better Sidebar fills the core seat. Product-visible releases also record the assembled browser journey because mock-only component tests cannot establish final slot composition and geometry.
