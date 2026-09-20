# Agent Note: YourBuddy workbench-primary layout

Status: implemented

English | [中文](2026-09-19-yourbuddy-workbench-primary-layout.zh.md)

## Problem

YourBuddy needs Better Sidebar's workbench to be the main desktop surface and the DSH conversation to remain usable as a narrower right column. Replacing the conversation plugin, forking Better Sidebar's service, or reapplying an untracked edit after every refresh would break one of the existing extension or upgrade paths.

## Decision

`@deepseek-ai/dsh-client-ui-layout` declares one optional root-scoped `workbench` slot. The unoccupied state preserves DSH's ordinary sidebar, conversation, and details grid. An occupant activates a desktop grid ordered as sidebar, flexible workbench, details, and resizable conversation. Below 768 pixels, conversation remains the primary task surface and the workbench occupant renders through the shell overlay so its drawer behavior remains available.

The layout service accepts one lifecycle-bound workbench width binding. AppFrame owns the outer conversation drag handle, and the occupant owns width persistence. Disposing the binding restores the ordinary DSH layout. This keeps placement in the shell without moving Better Sidebar state into DSH.

Better Sidebar retains `portal` as its default presentation. Its optional `slot` presentation creates the same service and store, registers its React tree in the DSH workbench slot, and exposes the store's shared width through the layout binding. Portal-only frame compensation is selected by a lifecycle-owned body attribute. YourBuddy's native overlay selects `slot`; other DSH installations and Better Sidebar mounts retain their defaults.

DSH's native right Sidebar owns ordinary tab and resource opens. Better Sidebar's remaining split-pane workbench fills the desktop slot regardless of the persisted bottom-panel expanded state, so a collapsed dock cannot leave the primary region blank. The desktop slot omits the dock's height resize and close controls. Below 768 pixels, the same tree returns to overlay presentation and honors the expanded state.

The DSH source change is committed normally on the YourBuddy branch and reconciled through Git when an official DSH Release is merged. Its bounded diff is also stored as a provenance patch. The materialized Better Sidebar snapshot contains matching `src`, built `lib`, type declarations, and bilingual README changes. Its structured provenance entry names a replayable patch, and product refresh applies that patch to the new pristine npm snapshot before the existing compatibility adjustments. This extends the [YourBuddy product workbench distribution](../feature/2026-08-22-yourbuddy-product-workbench.md) without introducing a general patch framework.

## Alternatives considered

**Replace or wrap the conversation plugin.** Rejected because conversation streaming, approvals, composer state, session switching, and future conversation upgrades would become YourBuddy-owned behavior rather than remaining in the existing plugin.

**Keep Better Sidebar as a viewport Portal and move it with CSS.** Rejected because the DSH shell would not own the real grid tracks or drag handle, and Portal compensation would continue to compete with details and conversation geometry.

**Maintain Better Sidebar edits only as committed materialized files.** Rejected because a snapshot refresh replaces the package directory. The compact replay patch makes the local source of each materialized difference explicit and keeps the modified runtime bundle reproducible.

**Apply the DSH patch after every upstream merge.** Rejected because the YourBuddy branch already carries the change in Git. Reapplying it would conflict with the existing merge model; the DSH patch is provenance, while the Better Sidebar patch is an active snapshot-refresh input.

## Consequences

YourBuddy gains the requested workbench-primary desktop layout without changing DSH's default grid or Better Sidebar's default Portal mode. Better Sidebar tabs, viewers, terminals, integrations, and per-session split-pane state continue through the same store and service. The auxiliary conversation width remains shared because Slot mode reuses the existing panel-width preference.

The optional slot and width binding become a small DSH extension point that must be reconciled when upstream changes AppFrame or the layout service. Better Sidebar upgrades must either accept the recorded patch or update it together with the materialized snapshot and provenance. The visible release journey must exercise the assembled product because unit tests cannot establish that the actual workbench and conversation occupy the intended columns.
