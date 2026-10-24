# YourBuddy 0.4.13

English | [中文](README.zh.md)

This archive separates verified source and prepared Chromium behavior from pending packaged acceptance and public delivery.

- Release identifier: `yourbuddy-v0.4.13`
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: source and prepared-product verification recorded; release workflow and public assets pending.
- Evidence commit: [merged implementation](https://github.com/istarwyh/yourbuddy/commit/e2953b84d40972ffb4c22682248290b032383883).
- Evidence gallery: [prepared Chromium workbench](evidence/workbench.png), synthetic content only; not a native Tauri window.
- Evidence download: [immutable tag source archive](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.13.zip), available after publication; its independent download is pending.

## User release notes

### What changed

PDF, Word, PowerPoint and Excel opened from the middle Files workbench use the existing DSH readers: PDF.js, LibreOffice kit and the Excel viewer. No new viewer dependency is added.

### Problem solved

Office documents reach their existing readers instead of a download-only editor fallback. Files tree state and native document identity are retained. Synchronous background opens preserve a collapsed narrow-screen Session region.

### Where to use it

Use the default middle Files workbench. Opening a document reveals the native reader; return to Files to open another file.

### How to try it

Open a synthetic PDF, DOCX, PPTX or XLSX from Files, inspect its pages or sheets, close the reader and reopen the file. Previewing is read-only and conversion runs locally; separately asking an agent to read a file follows that task’s model and tool settings.

### Install or upgrade

After publication, use the macOS Apple Silicon Bootstrap or Offline DMG from [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest), or the existing signed updater. Availability is not claimed until the public assets are verified.

### Compatibility, migration, and limitations

The selected Harness remains `0.2.0-rc.1`. Existing download-only tabs need closing and reopening. Native queue replay after Session adoption retains upstream visibility behavior. Old DOC/PPT/XLS have routing regression coverage, not these visual fixtures. Editing, OCR, collaboration and formula recalculation are outside this change.

Synthetic macOS native DOCX/PPTX conversions report missing Liberation Sans; earlier Linux WASM checks report missing 宋体. Conversion success does not guarantee Microsoft Office layout parity. The supplemental modern PDF.js Node import fails on Node 22 because Promise.try is absent; Node 26 parser checks and actual Chromium rendering with a Node 22 Host passed.

## Verification summary

| Scenario | Status | Build under test | Evidence |
|---|---|---|---|
| Standard builds, types, lint, docs, hygiene, tests and hooks | Passed | Isolated source before version bump | [Source checks](evidence/source-checks.json) |
| Default 8 Clients then Harbor 9 Clients; four formats and reopen | Passed | Frozen prepared product before version bump | [Prepared result](evidence/prepared-workbench.json) |
| Synthetic PDF/XLSX parsing and native DOCX/PPTX conversion | Passed with font warnings | Node 26 supplemental parser | [Conversion result](evidence/office-conversion.json) |
| Packaged release, public assets and installed updater | Not verified | 0.4.13 release pending | Existing release workflow remains required |

## Prepared-product scenario

On 2026-10-24 UTC, macOS 15.6.1 arm64 used Node 22.22.3, pnpm 11.7.0 and Chromium 149.0.7827.55 against tested head `e0b5fcb241a5b70199e825d9bb8d3c99cada89eb`. The later merge has the same reviewed source. The real Host, Profile and Harbor runtime used isolated data and synthetic files; no real model request was made.

The smoke clicks the middle Files entry, checks PDF page text and painted canvases or Excel sheet content, preserves the Files tab, closes the reader and reopens it. Default and installed-Harbor phases passed, including layout lifecycle and branding persistence/reset. Two earlier verifier orchestration failures were corrected and independently reviewed; content checks were retained.

The screenshot is Chromium bridge evidence. Native Tauri window acceptance was not performed and was explicitly waived by the user. Separate repeated-open/Agent-user deduplication, narrow-screen background and missing-dependency UI scenarios remain unverified; source regressions do not replace them. Windows delivery, real providers, installed updates and data downgrade compatibility are not established.

## Delivery status

- Product publication: pending; creating a tag or starting Actions is not publication.
- Verification archive: source and prepared evidence included; release-run and independent public-download evidence pending.
- Website synchronization: local bilingual product build passed; the existing website workflow owns deployment, and live pages remain to be checked.
- Unverified scope: every source-only, bridge-only, waived, pending and limited scenario above remains separate.

## Rollback

Keep the immutable [0.4.12 release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.12) and its original signed updater manifest available. If withdrawal is needed, restore the previous latest-release designation and stable updater feed; never move public tags or replace published installer bytes. Already updated apps require manual reinstall of the previous DMG because the updater accepts only newer versions. Quit the app and back up application data first; data downgrade compatibility is unverified.

The downloaded [0.4.12 updater baseline](evidence/rollback-updater-0.4.12.json) has SHA-256 `13b23973b8fe9e04123695977602e1ebe2a6fefc49fbebdcfbcf178930f1ff1e`. This is retained rollback evidence, not a rollback already executed.
