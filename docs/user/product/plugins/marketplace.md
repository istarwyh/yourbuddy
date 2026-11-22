# Plugin Marketplace

English | [中文](marketplace.zh.md)

Application snapshot version: `0.5.10`. Source: [Scorp1o117/dsh-plugin-marketplace](https://github.com/Scorp1o117/dsh-plugin-marketplace).

## Problem addressed

Users can discover community plugins from the Plugins page, inspect their README, source, and installation method, and add capabilities when needed.

## Usage

1. Open **Plugins → Included app plugin settings → Plugin marketplace**.
2. Confirm that the detail page shows **Plugin management · web** and the **Search plugins…** field, then search and inspect a plugin.

A package exposes an installation confirmation only when one npm package unambiguously links to the selected repository and declares a DSH Bundle patch. Check the resulting status and restart YourBuddy through Application lifecycle. The AI explanation feature uses the configured default model.

## Entry point after upgrading

With the bundled Marketplace `0.5.10`, **Settings → Plugin Marketplace** is replaced by the Plugins-page entry above. This is a change to the third-party plugin included in YourBuddy, not a separate DSH core release. If you used the old Settings entry, follow the usage steps to reach the search page.

## Reason for default inclusion

The default composition is a starting point. Discovery lets users keep choosing tools while understanding their purpose and source before installation.

## Limits

GitHub topics and stars support discovery rather than security review or compatibility certification. One-click installation additionally requires valid npm DSH Bundle metadata and a repository association; ambiguous metadata leaves it unavailable. Search requires external networking and may be rate-limited. Installed code has the same Host authority as manually installed DSH plugins. Membership in the same Enhancement Suite does not mean that its memory, persona, or vision plugins are also installed by default.
