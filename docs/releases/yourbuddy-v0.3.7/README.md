# YourBuddy 0.3.7

English | [中文](README.zh.md)

This archive records the 0.3.7 workbench layout change and its release evidence. Public artifact, updater, website, and downloadable-archive results are added after publication.

- Release identifier: `yourbuddy-v0.3.7`.
- Product channel: YourBuddy desktop for macOS Apple Silicon.
- Archive state: release candidate.
- Evidence commit: pending merge and immutable tag.
- Evidence gallery: [annotated assembled desktop shell](screenshots/workbench-primary.png).
- Evidence download: pending public verification.

## User release notes

### What changed

Better Sidebar is now the flexible primary workbench on desktop. The DSH conversation moves to the right, remains resizable, and keeps the existing navigation and details regions.

### Problem solved

The former portal presentation placed Better Sidebar above the conversation rather than making its files, tasks, terminals, previews, and other work surfaces the center of the desktop product. The new layout gives these plugin surfaces the primary area without replacing DSH or forking Better Sidebar's default behavior.

### Where to use it

Open YourBuddy at desktop width. The workbench occupies the center-left area and the conversation remains available on the right. At narrow width, the conversation remains primary and Better Sidebar uses its existing drawer.

### How to try it

1. Open YourBuddy and use the Files, Tasks, terminal, preview, or other Better Sidebar tabs in the primary workbench.
2. Drag the divider between the workbench and conversation.
3. Narrow the window and open Better Sidebar through its drawer control.

### Install or upgrade

Install the Apple Silicon DMG from the 0.3.7 GitHub Release after publication, or use **Settings → General → Application lifecycle → Check for updates** from an earlier version.

### Compatibility, migration, and limitations

Existing application data is retained and no migration is required. The desktop supports macOS 11 or later on Apple Silicon. Better Sidebar remains at 0.18.1 and Harbor Evolution at 0.9.5; the latest Harbor Evolution candidate was rejected because it requires a newer DSH skill package than the bundled DSH release. The screenshot is from the real assembled Client inside the desktop shell smoke, not a launched DMG WebView. The application is not Apple Developer signed or notarized.

## Verification summary

| Scenario | Status | Build under test | Environment | Evidence |
|---|---|---|---|---|
| Workbench layout source behavior | passed | source commit pending merge | macOS arm64; Node 22.22.2 | [local validation](evidence/local-candidate-validation.txt) |
| Compatibility patch replay | passed | clean DSH and Better Sidebar bases | local temporary checkouts | [local validation](evidence/local-candidate-validation.txt) |
| Assembled desktop shell | passed | local assembled Client and Host | macOS arm64; controlled local Host | [annotated screenshot](screenshots/workbench-primary.png) and [local validation](evidence/local-candidate-validation.txt) |
| Public installer and updater | pending | not yet published | GitHub Release | added after publication |
| Product website | pending | not yet synchronized | GitHub Pages | added after publication |

## Scenario: Workbench layout and compatibility replay

- Status: passed for source behavior, clean patch replay, and the assembled desktop shell.
- Date and time: 2026-09-19, Asia/Shanghai, UTC+08:00.
- Release and commit: `yourbuddy-v0.3.7` candidate; merge commit pending.
- Build under test: source checkout and clean temporary copies of the recorded upstream bases.
- Environment: macOS arm64, Node 22.22.2, pnpm 11.7.0.
- Evidence origin: this release run.
- Data: synthetic component and product fixtures.
- Model or service: no model or external service request.

### Steps

1. Exercised the optional DSH `workbench` slot with desktop resizing and narrow-window fallback.
2. Exercised Better Sidebar's default portal and YourBuddy slot presentations.
3. Applied both provenance patches to clean recorded bases and compared the resulting product files and built Client artifacts.
4. Built the complete DSH workspace and prepared the assembled desktop candidate.

### Expected

YourBuddy uses Better Sidebar as the desktop primary workbench, preserves the conversation and plugin capabilities, and can reproduce both local changes after an upstream refresh. DSH and Better Sidebar retain their default behavior when the slot is not selected.

### Actual

Focused component and product tests passed, the complete DSH build passed, both patches replayed cleanly, and the recorded patch and snapshot hashes matched. The assembled Host loaded all six product Client plugins, rendered the four-track workbench layout, and retained the conversation in the right region. The latest Harbor Evolution candidate was intentionally not materialized because its DSH skill peer requirement is incompatible with the bundled DSH version.

### Evidence

- Before: the layout and provenance problem is recorded in the [technical design](../../tech/202609/workbench-layout-compatibility.md).
- In progress: commands and exact test counts are in the [local candidate record](evidence/local-candidate-validation.txt).
- Result: the assembled interface is retained in the [annotated workbench screenshot](screenshots/workbench-primary.png); the blue and purple evidence outlines are added only by the release smoke to identify the two real layout regions.
- Failure and recovery: the latest-plugin dry run rejected Harbor Evolution 0.9.6 before modifying the product tree, so the release retains the reviewed 0.9.5 snapshot. The first screenshot probe used the unmodified release-smoke overlay and did not select slot presentation; the smoke overlay was aligned with the native product overlay, after which the assembled layout and screenshot passed.

### Scope limits

Source and assembled-shell evidence does not prove the workflow-built DMG, public updater bytes, installed application startup, updater installation, or live website deployment.

## Delivery status

- Product publication status: pending.
- Verification archive status: partial; local evidence and screenshot are included before tagging.
- Website synchronization status: pending public artifact verification.
- Unverified scope: workflow-built and public artifacts, updater installation, installed DMG WebView, and live website.
