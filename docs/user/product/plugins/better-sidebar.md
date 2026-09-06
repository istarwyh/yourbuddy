# Better Sidebar

English | [中文](better-sidebar.zh.md)

Application snapshot version: `0.18.0`. Source: [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar).

## Problem addressed

Users can inspect a file tree, editor, image and Markdown previews, real terminals, Git differences, and background tasks beside the conversation instead of relying entirely on the assistant's description.

## Usage

Open the right sidebar or bottom panel in a session workspace and inspect Agent-produced files. For code tasks, use terminals and Git views to review changes. Sidebar cards can be adjusted in Settings.

## Reason for default inclusion

It completes the path from requesting work to producing results and human inspection, while giving other plugins a place to register pages and file viewers.

## Limits

Real terminal operations affect the actual working directory; a panel is not an isolation guarantee. Model-facing `terminal_*` and `sidebar_open` tools default to off and require explicit activation. Embedded pages remain subject to their sites' iframe policies and browser rules; some websites cannot be embedded. Side conversations remain a Beta capability.
