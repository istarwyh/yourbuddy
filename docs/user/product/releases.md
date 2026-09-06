# Release status

English | [中文](releases.zh.md)

A release means an available artifact and matching user-facing evidence.

## YourBuddy

### 0.3.3 — release candidate

YourBuddy 0.3.3 fixes the installed macOS application's local Host authentication. Native startup completes the one-time exchange before opening a same-site workbench shell, so macOS WebKit can use the strict session cookie without exposing the process token to the renderer. Local source and controlled installed-bundle checks passed; public artifacts, updater metadata, and the formal installer remain pending and are not presented as available.

[Candidate verification record](../../releases/yourbuddy-v0.3.3/README.md) · [download status](download.md)

### 0.3.2 — 2026-09-06

YourBuddy 0.3.2 adds in-app Help and hardens authenticated private-Host startup. Its macOS Apple Silicon files remain publicly available and were independently inspected, but the installed application has since reproduced `dsh web authentication required`; use 0.3.3 after it is published. The app is ad-hoc signed but not signed or notarized with an Apple Developer identity; interactive installed-app Help, real OAuth/model calls, and enterprise proxy/CA paths remain unverified.

[Release and downloads](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2) · [immutable verification record](https://github.com/istarwyh/yourbuddy/tree/27183fd9c14ae5c10fb86694a045358428569756/docs/releases/yourbuddy-v0.3.2) · [download page](download.md)

## What a release entry includes

Each entry explains what users can do, the exact version and artifacts, known limitations, and the installation or workflow verification actually performed. Failed, skipped, and unverified paths remain visible. A successful build alone is not publication.

[GitHub Releases](https://github.com/istarwyh/yourbuddy/releases) holds the downloadable artifacts. The repository's [release records](../../releases/README.md) define the accompanying evidence. Older branded releases remain historical records rather than new-brand availability claims.
