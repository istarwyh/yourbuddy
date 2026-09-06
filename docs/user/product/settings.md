# Workbench settings

English | [中文](settings.zh.md)

Personalize the interface and manage the desktop from one place.

## Name and Logo

Open Settings → General → My workbench. Preview and save a new name or image, or restore YourBuddy defaults. Identity is stored per Profile and survives reloads. It does not change the desktop icon, application name, or complete theme.

## Networking

Open Settings → General → Network proxy. Choose direct, system, or a custom fixed proxy. Custom mode requires HTTP and HTTPS addresses without embedded credentials. PAC and automatic proxy discovery are unsupported. A readable PEM certificate bundle can supplement system trust for enterprise networks; certificate verification remains enabled.

Test the desktop draft route and running Host route separately. Save and restart to activate a changed policy, then test again. Existing processes keep the previous policy until restart.

## Updates and restart

Use Settings → General → Application lifecycle to check for updates or restart. Restart after installing a new plugin so its Client can be discovered. Bundled plugins update with YourBuddy releases, while upstream version notices do not install anything automatically.

These controls come from the first-party Personal Workbench plugin. Native restart, proxy, and updater operations require the desktop shell and are unavailable in standalone DSH Web.

See [downloads](download.md) for release availability and [troubleshooting](troubleshooting.md) for failures.

## Help and guides

The bottom of the sidebar offers getting started, default plugins, Extend Y8, troubleshooting, and feedback. A question-mark icon remains when the sidebar is collapsed. Guides open in an external browser while the session stays in place. If opening fails, copy the displayed address; guide content requires network access.
