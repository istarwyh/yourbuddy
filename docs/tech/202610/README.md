---
description: "October implementation-plan entry for terminal-environment inheritance and visible macOS permission status in YourBuddy."
---

# YourBuddy desktop environment integration plan

English | [中文](README.zh.md)

This directory defines how YourBuddy inherits the user's login-shell exports by default, then applies a small set of application-owned overrides and accurately presents macOS permissions that affect features.

## Current proposal

Read the [terminal environment and macOS permission plan](terminal-environment-and-permissions.md) for fixed decisions, startup order, variable precedence, network migration, permission ownership, data types, protocol, recovery, tests, and staged delivery.

| Area | Proposed outcome |
|---|---|
| Shell environment | Finder launch captures interactive login-shell exports before runtime discovery |
| Application overrides | YourBuddy owns managed runtime, isolated DSH home, internal endpoints, and effective network policy |
| External tools | Host/plugins discover shell-PATH tools while YourBuddy's managed shims stay first |
| Permissions | Settings reports reliable status and identifies permissions that are not globally queryable or belong to another process |
| Diagnostics | Report sources, status, and overridden names without recording environment values |

Status: implementation proposal only; source and installers do not yet provide these behaviors.
