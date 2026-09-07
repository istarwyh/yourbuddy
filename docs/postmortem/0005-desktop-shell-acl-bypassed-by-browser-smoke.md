# Post-mortem 0005: Desktop shell ACL was bypassed by the release smoke

English | [中文](0005-desktop-shell-acl-bypassed-by-browser-smoke.zh.md)

Status: resolved

## Executive summary

YourBuddy's remote desktop shell displayed its settings controls but Tauri rejected every application command before the Rust handler ran. The dynamic capability had only copied core and plugin permissions, while the release browser smoke replaced Tauri's invoke function with a successful JavaScript stub and therefore bypassed the missing application permission. An explicit application permission, a command-inventory parity gate, a real Tauri Runtime Authority test, and packaged-WebView release evidence rules make the same omission fail before publication.

## Summary

The application serves its privileged top-level shell from a random loopback HTTP origin so that the embedded Host remains same-site for its strict authentication cookie. Tauri correctly treats that `WebviewUrl::External` document as remote. The shell maps validated iframe messages to literal application commands for network settings, application lifecycle, and external links, but the dynamic capability did not reference an application permission that allowed those commands.

The result was an authorization failure such as `Command test_network_proxy_settings not allowed by ACL`. The request never entered `test_network_proxy_settings`, so proxy configuration, certificate trust, and network reachability were unrelated to this failure. [Issue 13](https://github.com/istarwyh/yourbuddy/issues/13) contains the user-visible reproduction and source-path evidence.

## Impact

The affected installed application rendered controls that could not call their native handlers. Network proxy testing and saving were the reported path; CA selection, update, restart, close preference, and external-link commands crossed the same missing permission and were exposed to the same failure class.

The ACL denied access rather than broadening it, so this was an availability defect rather than a privilege escalation. Users could not rely on the shipped settings journey, and the release evidence overstated what the stubbed browser smoke had proved.

## Timeline

- The same-site authentication fix moved the privileged shell to an application-owned loopback `WebviewUrl::External` origin and added an exact-origin runtime capability.
- The product browser smoke exercised the settings and link controls with a replacement `window.__TAURI__.core.invoke` that returned controlled results. It verified message validation and command selection but never entered Tauri Runtime Authority.
- YourBuddy 0.3.3 shipped the remote shell without an application permission. YourBuddy 0.3.4 retained the same capability structure.
- A user reproduced the ACL rejection from the installed 0.3.3 application, and source inspection confirmed that the command was registered but unauthorized.
- A negative-control parity test failed because no desktop-shell application permission file existed. The permission, updated dynamic capability, real authority test, CI gate, release workflow check, and evidence rules were then added together.

## Root cause

Command registration and command authorization were treated as one condition. `generate_handler!` made the Rust functions available to the IPC dispatcher, but a remote origin also needs a capability that resolves an application permission for each command. Copying `capabilities/default.json` supplied only core and plugin permissions; it could not authorize application commands.

The main release smoke stopped at the JavaScript bridge boundary. Its invoke stub recorded the correct command names and returned success without consulting the generated Tauri manifest, origin, window label, or permission resolver. The existing Rust test asserted only the dynamic capability's remote URL and window fields, so neither test could fail for the reported mechanism.

Release validation recorded authenticated native startup but did not complete visual WebView automation. That limitation was retained as unverified screenshot coverage, yet the controls were still described as exercised because the source browser smoke had clicked them. The evidence classification did not distinguish bridge execution from native authorization.

## Guardrails added

- [`desktop-shell.toml`](../../apps/desktop-tauri/src-tauri/permissions/desktop-shell.toml) defines one named application permission whose allowlist is the complete literal shell-command inventory.
- The dynamic capability carries the existing shell permissions plus that application permission, restricted to the runtime-owned origin and `main` window. The embedded Host, splash window, and other loopback ports remain unauthorized.
- [`desktop-shell-permissions.test.mjs`](../../apps/desktop-tauri/scripts/desktop-shell-permissions.test.mjs) extracts literal shell invokes, parses the permission manifest, checks exact set equality and uniqueness, confirms every name is registered, and runs in ordinary top-level static CI.
- The Rust desktop-shell test loads the generated application manifest into the real Tauri Runtime Authority and resolves every allowed command for the exact origin and window while checking negative origins and windows.
- The [desktop release workflow](../../.github/workflows/desktop-release.yml) runs both the parity gate and authority test against the release source after building the application.
- The [testing policy](../testing.md) and [release evidence rules](../releases/README.md) classify JavaScript invoke stubs as bridge-only and require packaged-WebView evidence for affected controls before an installed-behavior claim is marked passed.

## Lessons

- A registered Tauri command is not an authorized command; tests must enter the resolver with the shipped manifest, origin, and window.
- A fake at the exact boundary under investigation cannot validate that boundary. The browser smoke remains useful for iframe messages and UI behavior, but it cannot carry an ACL claim.
- Application command allowlists need a machine-derived inventory comparison. Reviewing parallel handwritten lists without an equality check invites omissions.
- A declared limitation remains a release limitation. If packaged UI automation is incomplete, source-browser success cannot upgrade the missing installed journey to passed.
