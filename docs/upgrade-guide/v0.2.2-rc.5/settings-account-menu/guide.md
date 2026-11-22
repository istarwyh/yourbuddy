---
kind: upgrade-guide
description: "Web workbenches with the account UI open Settings through Account menu instead of a direct Settings button."
---

# Open Settings through Account menu

English | [中文](guide.zh.md)

## Change

In Web profiles that load the account UI, the sidebar's direct Settings button is replaced by **Account menu → Settings**. This includes YourBuddy's Web-backed workbench. The change extends the account menu to Web clients; it does not change the menu's Settings action. Profiles without the account UI keep the direct Settings fallback.

## Migration

1. Open the sidebar's **Account menu**, then choose **Settings**. Do not look for a separate Settings button while the account menu is active.
2. Confirm that the settings dialog opens, then select the required section. See [workbench settings](../../../user/product/settings.md) for the current controls.
3. Update browser automation that targets the direct sidebar button to open the account menu and select its Settings item instead. Keep checking that the real settings dialog appears; detecting the menu alone does not confirm Settings reachability. This navigation change requires no settings-file edits.
