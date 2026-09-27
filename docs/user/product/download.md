# Get YourBuddy

English | [中文](download.zh.md)

YourBuddy currently targets macOS 11 or later on Apple Silicon.

## Download the latest release

Open the [latest YourBuddy release](https://github.com/istarwyh/yourbuddy/releases/latest) and download the macOS Apple Silicon DMG listed under **Assets**. GitHub keeps this URL pointed at the newest published Release, so this page does not need a version-specific edit after each release.

Older installations can instead use **Settings → General → Application lifecycle → Check for updates**. Existing YourBuddy data is retained during an ordinary upgrade.

## What the desktop carries

Default plugins, the managed Node and pnpm resources, and the Harbor Python runtime are bundled. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Installation limits

YourBuddy uses a signed Tauri updater, but the macOS application is not signed or notarized with an Apple Developer identity. First launch may require **Privacy & Security → Open Anyway**. Consult the selected GitHub Release and its immutable [release archive](../../releases/README.md) for version-specific notes, checksums, evidence, and known limitations.

See [release status](releases.md), [all GitHub Releases](https://github.com/istarwyh/yourbuddy/releases), and [first use](start.md).
