---
description: "Shell layout for the Web GUI: AppFrame columns, optional workbench placement, drag handles, concession behavior, panel geometry, and theme presentation."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-layout

English | [中文](README.zh.md)

## Summary

This package provides the shell layout of the Web GUI. AppFrame normally renders sidebar, conversation, and details columns. An optional root-scoped `workbench` occupant becomes the flexible desktop primary surface and moves conversation into a resizable auxiliary column; below 768px, conversation remains primary and the workbench renders through the overlay as a drawer. The `ctx.layout` service coordinates the workbench width while preserving the existing sidebar and details actions. The package also projects the resolved theme onto the document.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount this plugin at the root slot; it renders the app frame around the sidebar, conversation, details, optional workbench, and shell overlay slots. Without a workbench occupant, behavior remains the three-column DSH layout. A workbench plugin registers one shared width binding through `ctx.layout`; AppFrame then owns the outer auxiliary-conversation drag handle while the plugin owns width persistence.

### Theme presentation

The presenter consumes resolved theme snapshots and projects them onto the document: `html { color-scheme }` for native UA chrome, `body[data-ds-dark-theme]` from the active color scheme, the theme's alias tokens and `--dsh-content-font-size` as inline variables on body, and one owned `<meta name="theme-color">` whose content follows the computed body background. Disposing the presenter removes its metadata node with its other global writes.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

One `register()` call contributes `AppFrame` into the runtime's built-in `'root'` slot and declares five child slots (`sidebar`, `conversation`, `workbench`, `details`, `shell.overlay`), seats the layout store, and wires `ctx.layout`. `registerWorkbench()` installs one lifecycle-bound width binding; its disposer restores the ordinary conversation layout. The transient DSH layout store still owns only sidebar and details geometry, while the workbench provider can persist the auxiliary width. AppFrame always mounts conversation and details, and mounts the workbench at either the primary desktop column or the narrow overlay. The theme presenter remains a separate pure DOM effect.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the layout surface is not enough. They move from the frame to the columns it renders and the theme it presents.

- [ui-sidebar](../ui-sidebar/README.md) — occupies the `sidebar` column and its seats.
- [ui-conversation](../ui-conversation/README.md) — occupies the `conversation` and `details` columns.
- [YourBuddy workbench layout](../../../docs/tech/202609/workbench-layout-compatibility.md) — downstream composition and refresh provenance.
- [ui-theme](../ui-theme/README.md) — the theme seam whose resolved snapshots the presenter consumes.
- [Web client architecture](../../../.agents/notes/implemented/architecture/2026-07-19-gui-web-client-architecture.md) — how browser plugin rows load and register slots.

-----

<a id="model-experience"></a>
## Model Experience

None, as the layout shell manages browser viewing state; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define the current layout behavior. They are current package constraints, not a general window-manager comparison or a task backlog.

- **Panel geometry is transient** — reload restores the sidebar default and details closed; switching between distinct Session ids also closes details and forgets its dragged width, while unselected surfaces render details at zero width without modifying geometry.
- **Concession-chain auto-close derives a zero width without touching the preferred width** — the panel restores itself when the window widens; consumers must not read the stored details width as the rendered truth.
- **No scroll anchoring during squeeze reflow** — layout changes may move the reader's viewport.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The shell viewing-state store behind ctx.layout emits no cordis events; clamp/prune/concession-chain sequencing is asserted directly by this package's columns and service specs.
