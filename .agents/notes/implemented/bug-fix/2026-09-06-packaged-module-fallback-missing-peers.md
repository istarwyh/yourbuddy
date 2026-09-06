# Agent Note: Omit unavailable peer manifests from packaged module fallback

Status: implemented

English | [中文](2026-09-06-packaged-module-fallback-missing-peers.zh.md)

## Problem

A pkg executable can expose a dependency candidate under `/snapshot/node_modules` even when the optional peer's `package.json` bytes are absent from the executable. The profile fallback traversal treated the visible candidate path as readable and failed startup with `ENOENT`. Release-shaped Python Runtime artifacts therefore failed before the runtime could serve a profile.

## Decision

Dependency traversal reads each resolved candidate manifest before recording the package in the fallback generation. An `ENOENT` at this optional read means the peer is unavailable and traversal continues. The installation root and explicit bundle anchors remain required, while malformed or unreadable manifests still fail startup.

## Verification

- The focused app-boot profile tests cover ordinary fallback resolution and failure of malformed package metadata.
- Release-shaped Python Runtime smoke executes the packaged binary and confirms that exposed-but-unembedded optional peers no longer prevent startup.

## Alternatives considered

**Catch every manifest error.** Rejected because malformed metadata and permission failures must remain visible.

**Remove peer dependencies from traversal.** Rejected because installed Service Definition peers must remain loader-visible to external plugins.

## Consequences

Packaged runtimes omit only dependencies whose candidate manifest bytes are absent. Available peers retain nearest-wins traversal, and invalid installed manifests still stop boot.
