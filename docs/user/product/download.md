# Get YourBuddy

English | [中文](download.zh.md)

The desktop targets macOS Apple Silicon. YourBuddy 0.3.15 is the current verified public release: complete-file integrity, the updater signature, App identity, bundled creator-publishing resources, product provenance, and the relocated runtime passed independent checks. Native startup and packaged-WebView interaction remain unverified.

## YourBuddy installer

Download [YourBuddy 0.3.15 for macOS Apple Silicon](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.15/yourbuddy-0.3.15-macos-arm64.dmg). The independently downloaded file is 569,361,235 bytes with SHA-256 `424ef403767624f01ac1e56e6003b0587600d45bf3c6c0e866c81fe8fcd8294b`, matching GitHub's release digest and the published checksum.

Version 0.3.15 bundles video publishing, video-to-article, and WeChat Official Account publisher Skills in Oil Creator. The **内容创作** Preset can prepare drafts for Xiaohongshu, Douyin, Bilibili, WeChat Channels, and the WeChat Official Account draft box; users retain final publication or group-send. It bundles DSH 0.1.5-rc.2, Oil Creator 0.1.0, Better Sidebar 0.19.1, Codex Auth 0.3.2, Harbor Evolution 0.9.8, Plugin Marketplace 0.3.4, and Context Doctor 0.7.2. Product provenance, all generated publisher runtime modules, and the relocated Python 3.12.14 / Harbor 0.21.0 runtime passed independent checks. Native startup, packaged-WebView interaction, an update from an existing installation, real creator accounts, OAuth, and real-model scoring remain unverified.

[View the 0.3.15 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.15), [download its checksums](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.15/SHA256SUMS.txt), read the [verification record](../../releases/yourbuddy-v0.3.15/README.md), [download its verification archive](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.15/yourbuddy-v0.3.15-verification.zip), or follow the [source build instructions](../../../README.md#run-from-source). Older XiaoHui artifacts retain their original names and are not presented as YourBuddy downloads.

## What the desktop carries

Default plugins, the managed Node and pnpm resources, and the Harbor Python runtime are bundled. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Updates and verification

The 0.3.15 release provides the installer, SHA-256 checksums, Tauri updater archive, signature file, and verification record. Stable updater metadata matches the versioned manifest; the updater's prehashed Minisign signature and trusted comment were independently verified with the public key from the tagged release configuration. The DMG and updater App trees are identical, and the packaged creator publisher contains all required generated runtime modules. Existing installations can use **Settings → General → Application lifecycle → Check for updates**; an actual update from an older installed version remains unverified. The updater signature is separate from Apple application signing: the App's strict code-signature check passed with an ad-hoc signature and no TeamIdentifier, while Gatekeeper rejected it. It is not Apple Developer signed or notarized; first launch may require the documented macOS override.

See [release status](releases.md) and [first use](start.md).
