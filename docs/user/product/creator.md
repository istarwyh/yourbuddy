# Develop with Creator

English | [中文](creator.zh.md)

Creator helps inspect the running DSH composition and try a small plugin. Use it when a task needs a new operation or interface; start with [extension choices](develop.md) if you only need configuration or a repeatable procedure.

## Prepare the environment

This guide uses the DSH source Web application. Complete the [source prerequisites on GitHub](../../../README.md#run-from-source), then run the following from the repository root:

```sh
pnpm dsh web --no-open --port 0
```

Open the launch URL printed by the command, including its authentication fragment. The OS chooses an available port. Select a working directory and configure a model before sending a request. In the session's Agent Preset selector, choose Creator (创造模式, preset ID `cordis`). If your installed Y8 version does not expose this preset, use this source workflow; installing Y8 alone does not establish a standalone plugin development environment.

## Describe the change

Use the [requirement outline](develop.md#define-a-small-requirement) and ask the assistant to load `cordis-plugin-development`. For composition changes, it also uses `editing-cordis-compositions`. Both Skills belong to the Creator preset.

For a first experiment, ask for one temporary, read-only tool that returns a short checklist for a task, and ask the assistant to inspect the available tool-registration interface first. State the expected result and require it to stop the experiment after verification. Model requests use your configured account.

## Inspect before implementing

Creator can list inspection providers, query their actual interfaces, and inspect the source and diagnostics of an existing experiment. Ask it to select Host for operations and services, Client for UI, or both only when needed. Missing capabilities must be reported rather than replaced with guessed APIs.

Ask for a code preview and the expected effect before activation. Dynamic code uses plain JavaScript function bodies, not TypeScript or JSX modules. Defining an experiment does not execute it. Follow any approval request and inspect the final running state; waiting or starting is not success.

## Check and stop

Call the new tool or interact with the changed UI, then compare the result with your example. When something fails, ask Creator to inspect that experiment's diagnostics and source. Stop it when finished and confirm that the tool or UI contribution disappears. Stopping removes registrations; it does not undo files or external operations already performed.

## Keep useful work

Dynamic definitions are process-local and disappear on Host restart. A conversation recording of their source does not automatically reload them. Before restarting, save the useful source and requirements in your project, then use [the first-plugin tutorial](../develop/basic/index.md) and [packaging guide](../develop/basic/publish.md) to build and verify a normal plugin. There is no automatic dynamic-code-to-package conversion in this workflow.

For an existing plugin, edit its original project and preserve its identity and configuration. User presets belong in a user-owned copy; do not edit the shipped Creator preset, which application upgrades replace. Exact runtime rules and diagnostics are documented in the [dynamic tool reference on GitHub](../../../packages/extensions/tool-cordis/README.md).
