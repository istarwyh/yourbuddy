# Repository tool configuration

English | [中文](README.zh.md)

This reference maps repository-wide test and build configuration. Package-specific configuration stays with its package; the [development guide](../docs/development.md#typescript-project-layout) describes build order and compiler ownership.

| Directory | Contents |
| --- | --- |
| [vitest/](vitest/) | Default unit tests, specialized test suites, and shared Vitest settings. |
| [build/](build/) | Workspace tsdown configuration. |

## Root discovery entries

Root [vitest.config.ts](../vitest.config.ts) and [tsdown.config.ts](../tsdown.config.ts) re-export their configurations here so both tools retain default discovery from the repository root.

The root TypeScript files retain the editor and tsx entry ([tsconfig.json](../tsconfig.json)), Node compiler options ([tsconfig.node.base.json](../tsconfig.node.base.json)), package inheritance and source aliases ([tsconfig.base.json](../tsconfig.base.json), [tsconfig.base.client.json](../tsconfig.base.client.json)), and the compiler and generator project graphs ([tsconfig.host.json](../tsconfig.host.json), [tsconfig.client.json](../tsconfig.client.json)). [pytest.ini](../pytest.ini) retains root pytest discovery. Use the [root package scripts](../package.json) for named build and test workflows.
