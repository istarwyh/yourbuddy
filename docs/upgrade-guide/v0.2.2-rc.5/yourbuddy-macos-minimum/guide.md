---
kind: upgrade-guide
description: "YourBuddy's desktop installer and application require macOS 13.5 or later on Apple Silicon."
---

# YourBuddy desktop minimum macOS version

English | [中文](guide.zh.md)

## Change

The YourBuddy installer previously checked Darwin and arm64 without checking the macOS version. It now rejects macOS versions below `13.5` with `unsupported_macos`, and the application declares the same minimum. This applies only to the YourBuddy desktop installer and application, not to the `dsh` CLI or other platforms. The bundled Node binary requires this minimum; the old installer check did not establish that older applications worked on older macOS versions. See the [current system requirements](../../../user/product/download.md) for the runtime evidence and verification limits.

## Migration

1. Run `sw_vers -productVersion` on the Apple Silicon Mac you intend to use.
2. If the result is below `13.5`, upgrade macOS before installing or upgrading YourBuddy.
3. Follow the [download](../../../user/product/download.md) or [terminal installation](../../../user/product/installer.md) instructions and retry. Confirm that the installer no longer reports `unsupported_macos`. Passing this OS check does not establish successful download, native startup, model access, or compatibility of optional integrations.
