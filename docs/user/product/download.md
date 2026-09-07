# Get YourBuddy

English | [中文](download.zh.md)

The desktop targets macOS Apple Silicon. YourBuddy 0.3.4 is the current verified public release: complete-file integrity, the updater signature, and isolated native startup passed independent checks.

## YourBuddy installer

Download [YourBuddy 0.3.4 for macOS Apple Silicon](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.4/yourbuddy-0.3.4-macos-arm64.dmg). The independently downloaded file is 568,345,182 bytes with SHA-256 `3a8eeaf70602836280a48fe09f587f7ebf50c19366f9b209c0ede7054f0b4270`, matching GitHub's release digest and the published checksum.

Version 0.3.4 adds ordinary-message page attachments and recoverable unsent messages. The public App contains paired Harbor JavaScript/Python adapter 0.9.4, and its relocated Python 3.12.14 / Harbor 0.21.0 runtime passed CLI/import checks. An unchanged copy of the public DMG's App completed authenticated Host readiness and boot with isolated data. Visual window inspection/capture, an update from an existing installation, OAuth, and real model traffic remain unverified.

[View the 0.3.4 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.4), [download its checksums](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.4/SHA256SUMS.txt), read the [verification record](../../releases/yourbuddy-v0.3.4/README.md), or follow the [source build instructions](../../../README.md#run-from-source). Older XiaoHui artifacts retain their original names and are not presented as YourBuddy downloads.

## What the desktop carries

Default plugins, the managed Node and pnpm resources, and the Harbor Python runtime are bundled. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Updates and verification

The 0.3.4 release provides the installer, SHA-256 checksums, Tauri updater archive, signature file, and verification record. Stable updater metadata matches the versioned manifest; the updater's prehashed Minisign signature and trusted comment were independently verified with the public key from the tagged release configuration. Existing installations can use **Settings → General → Application lifecycle → Check for updates**; an actual update from an older installed version remains unverified. The updater signature is separate from Apple application signing: the App's strict code-signature check passed with an ad-hoc signature and no TeamIdentifier, while Gatekeeper rejected it. It is not Apple Developer signed or notarized; first launch may require the documented macOS override.

See [release status](releases.md) and [first use](start.md).
