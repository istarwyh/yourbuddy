# Better Sidebar

English | [中文](better-sidebar.zh.md)

Application snapshot version: `0.18.1`. Source: [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar).

## Problem addressed

Users can inspect a file tree, editor, image and Markdown previews, real terminals, Git differences, background tasks, and other plugin pages in the primary workbench beside the conversation instead of relying entirely on the assistant's description.

## Usage

At desktop width, use the main workbench to the left of the DSH conversation. Drag the divider to resize the two regions, open files and previews in tabs, and use terminals or Git views to review code changes. On a narrow window, the conversation remains primary and Better Sidebar opens through its drawer. Floating windows and the bottom workbench remain available.

## Reason for default inclusion

It completes the path from requesting work to producing results and human inspection, while giving other plugins a stable primary region for pages and file viewers.

## Limits

Real terminal operations affect the actual working directory; a panel is not an isolation guarantee. Model-facing `terminal_*` and `sidebar_open` tools default to off and require explicit activation. Embedded pages remain subject to their sites' iframe policies and browser rules; some websites cannot be embedded. Side conversations remain a Beta capability. YourBuddy maintains the workbench placement as replayable product patches while Better Sidebar keeps its upstream Portal presentation by default outside YourBuddy.
