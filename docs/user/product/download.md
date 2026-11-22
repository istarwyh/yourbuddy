# Get YourBuddy

English | [中文](download.zh.md)

YourBuddy requires macOS 13.5 or later on Apple Silicon. Check your macOS version before installing or upgrading.

The bundled Node `24.22.3` binary declares macOS `13.5` as its Mach-O minimum OS version. This sets the runtime minimum; it is not evidence of full application testing on macOS 13.5 or a guarantee that every optional integration supports that OS. Optional tools retain their own prerequisites.

## Download the latest release

Open the [latest YourBuddy release](https://github.com/istarwyh/yourbuddy/releases/latest). Choose `yourbuddy-<version>-bootstrap-macos-arm64.dmg` for the recommended small installer. Choose the larger `yourbuddy-<version>-offline-macos-arm64.dmg` when first launch must work without outbound network access. Both install the same application identity and component versions.

Older installations can instead use **Settings → General → Application lifecycle → Check for updates**. Automatic updates use the signed Offline application archive, not the Bootstrap DMG. Existing YourBuddy data is retained during an ordinary upgrade.

For terminal installation, proxy/offline files, or upgrading from the current conversation, see [install and upgrade](installer.md).

## What the desktop carries

The Bootstrap DMG carries the application shell, default-plugin manifest, and fixed pnpm package. On first launch it reuses a compatible Host Node and complete user pnpm Store, then downloads only missing signed release components. Harbor remains visible but its Python runtime is installed only after an explicit Harbor installation action. The Offline DMG contains seeds for the same components. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Installation limits

YourBuddy uses a signed Tauri updater, but the macOS application is not signed or notarized with an Apple Developer identity. First launch may require **Privacy & Security → Open Anyway**. Consult the selected GitHub Release and its immutable [release archive](../../releases/README.md) for version-specific notes, checksums, evidence, and known limitations.

See [release status](releases.md), [all GitHub Releases](https://github.com/istarwyh/yourbuddy/releases), and [first use](start.md).
