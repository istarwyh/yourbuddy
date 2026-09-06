# For developers

English | [中文](develop.zh.md)

Extend the workbench through plugins and keep user instructions close to the implementation.

## Build the desktop

The [desktop source guide](../../../apps/desktop-tauri/README.md) owns prerequisites and build commands. YourHarness's product layer assembles the upstream runtime, external snapshots, and first-party settings. Do not confuse a source build with a published installer.

## Build a plugin

Start with the [first plugin tutorial](../develop/basic/index.md), then follow the [architecture](../../architecture.md). Runtime capabilities, UI contributions, and Skills have different responsibilities. Document the user's entry point, permissions, configuration, and failure behavior.

## Maintain product content

English and Chinese pages share one canonical source pair in this repository. The product site projects those pages into OINK. The existing SDK documentation remains available from its repository sources and developer build.

See the [site maintenance guide](../../../docs/product-website.md) for building and verifying this website, and [product notices](../../../YOURHARNESS_NOTICES.md) for component attribution.
