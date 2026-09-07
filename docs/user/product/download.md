# Get YourBuddy

English | [中文](download.zh.md)

The desktop targets macOS Apple Silicon. YourBuddy 0.3.5 is the current verified public release: complete-file integrity, the updater signature, App identity, and the relocated runtime passed independent checks. Native startup was not repeated because a user-owned older instance was running.

## YourBuddy installer

Download [YourBuddy 0.3.5 for macOS Apple Silicon](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.5/yourbuddy-0.3.5-macos-arm64.dmg). The independently downloaded file is 568,339,607 bytes with SHA-256 `609a26786c301794ae2464723a3338438e8086627c3919a94b476ede8181fca7`, matching GitHub's release digest and the published checksum.

Version 0.3.5 restores network, lifecycle, update, external-link, and Marketplace controls rejected by the desktop permission layer. Codex Preset delegation now keeps the conflicting `codexhost-delegation` skill out of automatic model routing and retains the bundled `subagent_codex` path. The public App contains DSH 0.1.2-rc.1 and Harbor adapter 0.9.4; its relocated Python 3.12.14 / Harbor 0.21.0 runtime passed CLI/import checks. Native startup, packaged-WebView interaction, an update from an existing installation, OAuth, and real model traffic remain unverified.

[View the 0.3.5 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.5), [download its checksums](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.5/SHA256SUMS.txt), read the [verification record](../../releases/yourbuddy-v0.3.5/README.md), or follow the [source build instructions](../../../README.md#run-from-source). Older XiaoHui artifacts retain their original names and are not presented as YourBuddy downloads.

## What the desktop carries

Default plugins, the managed Node and pnpm resources, and the Harbor Python runtime are bundled. You still need model access, networking for online services, and Docker for evaluation flows that require it. Windows, Linux, and Intel Mac installers are not currently supported.

## Updates and verification

The 0.3.5 release provides the installer, SHA-256 checksums, Tauri updater archive, signature file, and verification record. Stable updater metadata matches the versioned manifest; the updater's prehashed Minisign signature and trusted comment were independently verified with the public key from the tagged release configuration. Existing installations can use **Settings → General → Application lifecycle → Check for updates**; an actual update from an older installed version remains unverified. The updater signature is separate from Apple application signing: the App's strict code-signature check passed with an ad-hoc signature and no TeamIdentifier, while Gatekeeper rejected it. It is not Apple Developer signed or notarized; first launch may require the documented macOS override.

See [release status](releases.md) and [first use](start.md).
