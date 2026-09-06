# The default plugin composition

English | [中文](index.zh.md)

A considered starting point, with each project's contribution kept visible.

| Plugin | Why it is included |
|---|---|
| [Codex Auth](codex-auth.md) | Connect existing accounts to models, search, and images |
| [Better Sidebar](better-sidebar.md) | Inspect files, commands, differences, and background tasks |
| [Context Doctor](context-doctor.md) | Understand context costs, duplicates, and shadowed skills |
| [Plugin Marketplace](marketplace.md) | Discover and assess extensions before installing |
| [Harbor Evolution](harbor-evolution.md) | Ground diagnosis and controlled improvement in task evidence |

These are independent external projects selected by YourHarness, not the official default DeepSeek Harness distribution. Harbor has related maintainership but remains an independent project. Preinstallation does not establish login, service availability, or activation of every optional feature.

## First-party and upstream contributions

YourHarness's Personal Workbench supplies [branding, networking, updates, and restart settings](../settings.md). The in-repository Codex Subagent provider supplies [focused delegation](../workspace.md), distinct from Codex Auth's main-model connection. Harbor's Skill and Python Adapter are companion components, not additional products to install.

## Updates and authority

Bundled snapshots update with YourHarness releases. User-added packages are maintained separately. A marketplace topic or star count is not security review; installed code has Host authority. Consult each plugin's prerequisites and [product notices](../../../../YOURHARNESS_NOTICES.md).
