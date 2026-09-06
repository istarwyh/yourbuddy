# Get YourBuddy

English | [中文](download.zh.md)

The desktop targets macOS Apple Silicon. YourBuddy 0.3.3 is the current verified public release and replaces the startup-defective 0.3.2 build.

## YourBuddy installer

Download [YourBuddy 0.3.3 for macOS Apple Silicon](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.3/yourbuddy-0.3.3-macos-arm64.dmg). The published file is 568,343,774 bytes with SHA-256 `9a8aca090f1ef78c414b51dcf5d61125fd0f26c03972c8e168480281529e2d11`.

Version 0.3.3 fixes the installed 0.3.2 application's confirmed `dsh web authentication required` startup failure. The public 0.3.3 application completed authenticated Host readiness and boot in an isolated local launch; visual window capture, OAuth, and real model traffic remain unverified.

[View the 0.3.3 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.3), [download its checksums](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.3/SHA256SUMS.txt), read the [verification record](../../releases/yourbuddy-v0.3.3/README.md), or follow the [source build instructions](../../../README.md#run-from-source). Older XiaoHui artifacts retain their original names and are not presented as YourBuddy downloads.

## What the desktop carries

Default plugins, the managed Node and pnpm resources, and the Harbor Python runtime are bundled. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Updates and verification

The 0.3.3 release provides the exact installer, SHA-256 checksums, signed Tauri updater archive, and verification record. Existing installations can use **Settings → General → Application lifecycle → Check for updates**; this signed-update journey from an older installed version was not exercised during publication verification. The updater signature is separate from Apple application signing: these builds are ad-hoc signed but not signed or notarized with an Apple Developer identity, so Gatekeeper rejects them and first launch may require the documented macOS override.

See [release status](releases.md) and [first use](start.md).
