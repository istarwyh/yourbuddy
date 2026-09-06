# Get YourBuddy

English | [中文](download.zh.md)

The desktop targets macOS Apple Silicon. YourBuddy 0.3.2 is the current independently verified release.

## YourBuddy installer

Download [YourBuddy 0.3.2 for macOS Apple Silicon](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/yourbuddy-0.3.2-macos-arm64.dmg). The published file is 567,479,032 bytes with SHA-256 `a00e9ed9b0f8ae0702692cb69b3ba773eb5f622a0f05c95df522f3d1c8dd466c`.

[View the 0.3.2 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2), [download its checksums](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/SHA256SUMS.txt), read the [immutable verification record](https://github.com/istarwyh/yourbuddy/tree/27183fd9c14ae5c10fb86694a045358428569756/docs/releases/yourbuddy-v0.3.2), or follow the [source build instructions](../../../README.md#run-from-source). Older XiaoHui artifacts retain their original names and are not presented as YourBuddy downloads.

## What the desktop carries

Default plugins, the managed Node and pnpm resources, and the Harbor Python runtime are bundled. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Updates and verification

The 0.3.2 release provides the exact installer, SHA-256 checksums, signed Tauri updater archive, and verification record. Existing installations can check through **Settings → General → Application lifecycle → Check for updates**. The updater signature is separate from Apple application signing: this build is ad-hoc signed but not signed or notarized with an Apple Developer identity, so Gatekeeper rejects it and first launch may require the documented macOS override.

See [release status](releases.md) and [first use](start.md).
