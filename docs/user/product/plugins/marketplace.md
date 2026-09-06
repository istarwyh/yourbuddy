# Plugin Marketplace

English | [中文](marketplace.zh.md)

Application snapshot version: `0.2.8`. Source: [Scorp1o117/dsh-plugin-marketplace](https://github.com/Scorp1o117/dsh-plugin-marketplace).

## Problem addressed

Users can discover community plugins in Settings, inspect their README, source, and installation method, and add capabilities when needed.

## Usage

Open Settings → Plugin Marketplace, search, and inspect a plugin. Eligible packages expose an installation confirmation. Check the resulting status and restart YourHarness through Application lifecycle. The AI explanation feature uses the configured default model.

## Reason for default inclusion

The default composition is a starting point. Discovery lets users keep choosing tools while understanding their purpose and source before installation.

## Limits

GitHub topics and stars support discovery rather than security review or compatibility certification. One-click installation additionally requires valid npm DSH Bundle metadata and a repository association; ambiguous metadata leaves it unavailable. Search requires external networking and may be rate-limited. Installed code has the same Host authority as manually installed DSH plugins. Membership in the same Enhancement Suite does not mean that its memory, persona, or vision plugins are also installed by default.
