# YourBuddy 0.4.18

English | [中文](README.zh.md)

- **Release identifier** `yourbuddy-v0.4.18`
- **Product channel** YourBuddy desktop for macOS on Apple Silicon.
- **Archive state** Published and verified within the scope below.
- **Release source** [Tagged source tree](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.18).
- **Evidence gallery** [Workbench recording in PR #110](https://github.com/istarwyh/yourbuddy/pull/110).
- **Evidence download** [Tag source ZIP](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.18.zip) contains the prepublication archive. The public verification results are recorded below.

## User release notes

### What changed

Media Desk 2.6.1 and Context Insights 0.82.2 open directly from the YourBuddy workbench sidebar. Media Desk organizes ideas, content, and publishing dates. Context Insights shows context composition and usage across sessions. Context Doctor remains available for diagnosing context costs and shadowed skills.

YourBuddy ships a terminal installer and an Agent tool for upgrading the application that owns the current conversation. The Agent records an operation receipt before handing off the restart. [Agent upgrade and terminal installation](https://github.com/istarwyh/yourbuddy/pull/80).

The release includes DeepSeek Harness 0.2.0-rc.2, Codex Auth 0.3.3-rc.4, and fixes for opening a plan preview in its own Session. [Harness and Codex Auth](https://github.com/istarwyh/yourbuddy/pull/97), [Plan preview](https://github.com/istarwyh/yourbuddy/pull/104), [Sidebar startup](https://github.com/istarwyh/yourbuddy/pull/106).

### Where to use it

Open **Media Desk** or **Context Insights** in the workbench sidebar. A fresh Profile includes both. When a Profile already has an active copy of either package, YourBuddy uses that copy.

### Install or upgrade

On Apple Silicon Macs, download the Bootstrap DMG or choose the Offline DMG for a first start without network access. In an existing installation, open **Settings → General → Application lifecycle → Check for updates**. See [Get YourBuddy](../../user/product/download.md) and [terminal installation](../../user/product/installer.md).

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Default workbench and optional Harbor | Passed | PR #110 prepared product | GitHub Actions macOS arm64 and Chromium | [Prepared acceptance](https://github.com/istarwyh/yourbuddy/actions/runs/42445630994/job/128623840539) |
| Agent upgrade conversation replay | Passed | PR #107 keyless replay | GitHub Actions Linux with Node 24 | [Snapshot job](https://github.com/istarwyh/yourbuddy/actions/runs/42431113368/job/128579987714) |

## Prepared default workbench

- **Status** Passed.
- **Date and time** 2026-11-08 04:26 UTC.
- **Build under test** PR #110 head `cc1e2c7a76b0890dac849574d17649af8c11e812`.
- **Evidence origin** GitHub Actions prepared acceptance before tagging.
- **Data and services** Isolated Profile, synthetic workspace, and real local Host. The two plugin pages do not require a model round for this check.

1. Start the prepared Host from the frozen production Store and open the workbench in Chromium.
2. Check both plugin Client URLs and open both pages from the sidebar.
3. Install optional Harbor through the real Profile and verify the assembled workbench again.

The verifier found all 551 locked registry inputs and the native Codex and Claude SDK executables. The core workbench opened both default pages. The Harbor phase reported 102 matching core peer links, 12 assembled Clients, and a ready Harbor Python runtime. [Job result](https://github.com/istarwyh/yourbuddy/actions/runs/42445630994/job/128623840539).

## Published release verification

The tagged macOS arm64 build passed prepared Chromium acceptance. The signed Offline package reached the native workbench on all three starts and shut down cleanly with its Host. The public Offline executable and signed component manifest match those checked by CI. [Release workflow](https://github.com/istarwyh/yourbuddy/actions/runs/42447121497), [native and prepared results](evidence/release-workflow.json).

All 18 public assets were downloaded and checked against the release SHA-256 manifest and available GitHub digests. Both updater archives and the component manifest passed signature verification. Both DMGs passed image integrity checks. The stable updater points to the signed 0.4.18 Offline archive. The public source ZIP contains the tagged bilingual notes and version metadata. [Public download evidence](evidence/public-verification.json).

## Delivery status

- **Product publication** Published on GitHub at 2026-11-08T04:55:26Z with Bootstrap and Offline DMGs, the terminal launcher, and signed update assets. [GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.18).
- **Verification archive** Complete for the recorded acceptance scope. The tagged source ZIP retains the prepublication evidence. The final verification records are in this directory.
- **Website synchronization** Deployed and verified on GitHub Pages. Both languages list the new plugins, and the stable download link resolves to 0.4.18. [Live website evidence](evidence/website-live.json).
- **Unverified scope** Live model calls through the new plugins, account sign-in, native WebView interaction with the two plugin pages, managed Node startup without system Node, and an in-place Agent upgrade with restart and conversation restoration.

## Delivery checklist

- [x] Verify the version sources and record the bilingual release notes and index entry.
- [x] Record the prepared workbench result and scope of the keyless upgrade replay.
- [x] Verify the tagged workflow's native startup, public installer bytes, signatures, and stable updater.
- [x] Inspect the public source ZIP and verify the live bilingual plugin pages and latest-release link.
