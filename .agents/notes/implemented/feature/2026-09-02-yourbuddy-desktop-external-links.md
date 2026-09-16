# Agent Note: YourBuddy desktop external links

Status: implemented

English | [中文](2026-09-02-yourbuddy-desktop-external-links.zh.md)

## Problem

The shared Markdown renderer creates safe HTTP(S) anchors with a new browsing context, which works in an ordinary browser. YourBuddy embeds the same Client in a cross-origin Tauri iframe, where a new WebView window is not the user's system browser and may not open at all. Treating every iframe navigation as external would also break Host routes and local file interactions.

## Decision

The first-party Personal Workbench Client owns desktop external-link presentation for anchors. It recognizes only anchors marked `target="_blank"` and `rel="noopener"`, then requires an absolute, credential-free HTTP or HTTPS URL whose origin differs from the active Host. A primary click sends that normalized URL through a dedicated versioned parent-message channel. Hover adds the URL as the anchor title, while a custom context menu offers Open link and Copy link address. Better Sidebar sends every explicit HTTP(S) external-open action through one shared helper: recommended-plugin destinations, the embedded browser toolbar and blocked-page action, and terminal plain-text and OSC 8 links. These controls do not enter the anchor handler. Both integrations fall back to ordinary new tabs in standalone `dsh web`.

The Tauri shell accepts only the exact request fields from the active Host iframe at its exact origin. It independently checks the request id, maximum URL length, HTTP(S) scheme, host, and absence of credentials before invoking one literal `open_external_url` command. Rust repeats the URL checks and delegates to Tauri's cross-platform opener. The Client cannot choose a command or executable, and `javascript:`, `file:`, `data:`, `mailto:`, relative, same-origin, download, and credential-bearing links do not reach the native command.

The existing Marketplace channel remains separate and narrower because it accepts only GitHub repository and npm destinations. General assistant links do not broaden that installation-related protocol.

## Alternatives considered

**Rely on the WebView's `_blank` behavior.** Rejected because the embedded Tauri WebView does not reliably hand a new browsing context to the system browser, which is the defect this decision closes.

**Expose Tauri's JavaScript opener directly to the Host iframe.** Rejected because the cross-origin application Client should not receive a general native capability. The parent shell and Rust command keep command selection and URL validation outside the Host document.

**Treat every HTTP(S) anchor as an external link.** Rejected because same-origin application routes and anchors without the shared renderer's safe new-context markers must preserve their existing navigation behavior.

## Consequences

Safe assistant Markdown links and Better Sidebar's explicit HTTP(S) external-open actions open in the operating system's default browser on macOS, Windows, and Linux through Tauri's supported opener. Right-click users can open or copy an anchor destination, and hover exposes its normalized URL. Internal routes, embedded navigation, file downloads, and local links retain their existing behavior. Browser-bridge, bundled-client, and Rust tests cover correlated messages, every Better Sidebar caller, standalone fallback, and rejected protocols; the assembled product smoke exercises hover, context-menu copy, the recommended-plugin action, and the literal native open command through the real cross-origin shell.
