# Oil Creator

English | [中文](oil-creator.zh.md)

Application snapshot version: `0.1.0`. Source: [oil-oil/dsh-oil-creator](https://github.com/oil-oil/dsh-oil-creator).

## Problem addressed

Video and article production creates related scripts, recordings, subtitles, covers, publication packages, and performance records. Oil Creator keeps each project anchored to one ordinary local folder instead of hiding its content in a private database.

## Usage

Select the **内容创作** Agent Preset, open the **Library** tab, and ask the Agent to inspect and configure the content workbench. Confirm the proposed library folder before saving it. Create a topic and script first, then bind recording, subtitle, cover, or article workflows as needed. When the video, publish package, and selected covers are ready, open the episode and choose **Prepare drafts**. Oil Creator validates the local inputs before opening any creator page, prepares the enabled video-platform drafts, and reports each platform separately. The optional WeChat Official Account draft remains a separate checkbox.

## Reason for default inclusion

A personal AI workbench should support finished media and articles as well as code and documents. The dedicated Preset supplies a content-production persona while the plugin keeps files, stage status, tools, and human review points together.

## Limits

The core local library and script workflow work without optional integrations. Recording and editing remain human actions. Video draft preparation requires Ego Lite and logged-in creator accounts; Oil Creator supplies the publisher configuration from the enabled-platform profile without changing the standalone publisher configuration. WeChat Official Account drafts require AppID, AppSecret, and an API IP allowlist. A run may leave some platforms ready and others blocked; the workbench preserves each result for review or retry. Draft preparation releases retained pages to the user but never clicks final publication, scheduling, or group-send controls. Review paths, generated copy, subtitles, titles, and platform matches before accepting or uploading them.
