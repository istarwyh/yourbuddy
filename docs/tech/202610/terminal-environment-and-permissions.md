---
description: "Implementation-level plan for default login-shell inheritance, application-owned overrides, and visible macOS permission status in YourBuddy."
---

# YourBuddy terminal environment and macOS permission plan

English | [中文](terminal-environment-and-permissions.zh.md)

## Summary

YourBuddy will start macOS desktop sessions with the environment exported by the account's interactive login shell, then override only values the application must own so managed Node, pnpm, Harness, the isolated DSH home, loopback services, and network policy remain consistent across one process tree. General settings will show permissions macOS can report reliably. Where no global status exists or another executable owns the permission, the UI will state that limitation and request access only after an explicit user action.

Status: October 2026 implementation proposal. The current application does not capture a login-shell environment or provide a unified macOS permission service.

## Table of Contents

- [Fixed product decisions](#decisions)
- [Goals and limits](#goals)
- [Current gaps](#current)
- [Target architecture and startup order](#architecture)
- [Environment precedence](#precedence)
- [Network and CA](#network)
- [macOS permission model](#permissions)
- [Data model and protocol](#model)
- [Settings and diagnostics](#settings)
- [Failure handling](#failures)
- [Implementation locations and dependencies](#implementation)
- [Testing and acceptance](#testing)
- [Delivery order](#delivery)
- [Dev Note](#dev-note)

<a id="decisions"></a>
## Fixed product decisions

| Decision | Result |
|---|---|
| Default environment | A macOS GUI launch captures the account's interactive login-shell environment |
| Recovery | Capture failure does not block startup; use GUI environment plus YourBuddy's managed PATH |
| Merge | Shell values override GUI values; application-owned values apply last |
| Secrets | Except for application-owned names, exported credentials/configuration pass to Host and plugins; never log them or send them to telemetry or the Browser Client |
| DSH home | Native YourBuddy always uses isolated application-data `dsh-home`, not shell `DSH_HOME` |
| Network default | Fresh installs inherit shell proxy/CA; existing explicit network choices remain unchanged |
| Permission prompts | Startup/background refresh never prompts; only a direct click can request access |
| Permission owner | UI names the responsible process and never attributes FFmpeg, Screen Studio, or Terminal.app permissions to YourBuddy |
| Uncertain status | Without a reliable API, show `unknown`; never claim a heuristic grant |

Before implementation, add a durable architecture decision accepting that default inheritance expands the configuration and secrets visible to Host and plugins. This plan owns implementation detail, not that decision.

<a id="goals"></a>
## Goals and limits

Success means Finder and terminal launches resolve the same exported toolchain for one account; every application-owned child uses one resolved environment; managed runtime/network values stay deterministic; and users distinguish permission failures from missing tools, plugins, credentials, or settings.

“Complete terminal environment” means variables exported by a fresh interactive login shell. It excludes aliases, unexported variables/functions, current directory, history, jobs, a real TTY, and TCC permissions granted to a terminal application.

The plan does not execute every Agent command through an interactive shell, inspect the TCC database, bypass macOS consent, or request all permissions on first launch.

The first implementation targets signed macOS arm64 YourBuddy. Windows retains durable user/machine discovery, and WSL retains its independent Linux environment and Windows-to-WSL translation.

<a id="current"></a>
## Current gaps

[`runtime/env_path.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/env_path.rs) uses only GUI-process PATH outside Windows; [`runtime/path_bridge.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/path_bridge.rs) then prepends managed `dsh`, Node, pnpm, and companion tools. Finder launch can therefore miss Homebrew, version managers, and shell exports.

[`runtime/supervisor.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/supervisor.rs) already overrides isolated `DSH_HOME`, final `PATH`, `NODE_ENV=production`, working directory, and network values; Host/plugins inherit everything else. Preserve this order.

[`network_proxy.rs`](../../../apps/desktop-tauri/src-tauri/src/network_proxy.rs) defaults to Direct, removing ambient proxy, `NODE_OPTIONS`, and CA variables before applying Direct, System, or Custom. It does not expose login shell as a network source.

Permission behavior is fragmented: optional Voice Input requests microphone; Pomodoro reads Browser Notification; native notification cannot reliably read macOS authorization; Ego Browser's FFmpeg backend triggers Screen recording access in external FFmpeg. There is no unified native status service.

The Desktop Shell source bridge disagrees with its built artifact/focused tests, and source Tauri config has no microphone usage description. Restore this baseline before adding protocol operations.

<a id="architecture"></a>
## Target architecture and startup order

Capture belongs in `run()` after component-helper and CLI-shim early exits but before Tauri starts background work. Real-terminal CLI invocation does not rerun login shell or recurse.

Startup order is fixed:

1. Load environment settings and resolve the macOS account login shell; fall back to `/bin/zsh`.
2. Create an owner-only temporary file; start the shell in login+interactive mode with null stdin.
3. The shell invokes the current YourBuddy binary in internal emitter mode; the emitter writes NUL-delimited entries while shell banners remain on stdout/stderr.
4. Parse `OsString` pairs within a deadline; terminate and reap the full process group on timeout.
5. Overlay shell on GUI environment and remove `PWD`, `OLDPWD`, `SHLVL`, `_`, and other bookkeeping.
6. Resolve network source, runtime, and PATH, then apply application-owned overrides.
7. Component download, overlay, Host, updater, and plugin subprocesses use the same map.

Do not source or parse `.zshrc` in YourBuddy. Use fixed forms for zsh/bash-compatible shells and fish; try POSIX form for unknown shells and fall back on failure.

Capture runs once per application process. Refresh preview may start another shell but cannot mutate the running Host; save requires restart.

<a id="precedence"></a>
## Environment precedence

| Priority | Source | Role |
|---|---|---|
| 1 | GUI process | Preserve LaunchServices, parent, locale, home, and temporary-directory facts |
| 2 | Interactive login shell | Override PATH, toolchains, credentials, proxy candidates, and other exports |
| 3 | Desktop settings | Apply network, CA, and environment mode |
| 4 | Managed runtime | Prepend managed shims and Node/pnpm; freeze isolated DSH home and production identity |
| 5 | Per-child values | Add notification URL, loopback capability, port, or operation credential |

| Name | Final rule |
|---|---|
| `PATH` | Managed `bin`, selected Node/pnpm, and required companions precede shell PATH; stable de-duplication |
| `DSH_HOME` | Fixed isolated application-data directory; WSL seeding keeps separate Windows-user-home resolution |
| `NODE_ENV` | Host receives `production` |
| `NODE_OPTIONS` | Application supplies network-trust options; inherited preloads/runtime flags cannot alter Host |
| Proxy and CA | Effective mode determines upper/lower proxy variables, `NODE_USE_ENV_PROXY`, and `NODE_EXTRA_CA_CERTS` |
| `YOURBUDDY_*` and internal capabilities | Application-created; shell replacements are ignored |
| Working directory | Explicit on each command, never inferred from captured `PWD` |

Capability checks and real launches must use the same final PATH. Remove plugin Homebrew workarounds only after signed-app evidence establishes shared-PATH coverage.

<a id="network"></a>
## Network and CA

Add `inherit` as the fresh-install default: read shell proxy/CA candidates, add loopback bypasses, then apply one existing native/Node policy.

| Mode | Behavior |
|---|---|
| Inherit terminal environment | Use captured proxy and eligible CA candidates |
| System | Use fixed macOS System Configuration HTTP/HTTPS endpoints and bypasses |
| Custom | Use saved URLs, bypass list, and optional CA file |
| Direct | Remove inherited proxies while retaining system trust and explicit CA |

Do not migrate existing System, Custom, or Direct choices to Inherit. Version settings: existing installs without a field retain old Direct behavior; fresh installs use Inherit.

Captured `NODE_EXTRA_CA_CERTS` is eligible only in Inherit without explicit CA. Keep native and fresh managed-Node preflight before save; running Host requires restart.

<a id="permissions"></a>
## macOS permission model

Use `granted`, `denied`, `notDetermined`, `restricted`, `notApplicable`, and `unknown`. Each result includes responsible process and action kind.

| Capability | Implementation rule |
|---|---|
| Accessibility | Show only for a declared dependency; non-prompting refresh and click-only prompt |
| Screen recording | Use system preflight only for capture owned by YourBuddy; current external FFmpeg uses actual failure recovery, not YourBuddy status |
| Full Disk Access | Show `unknown`, explain reliable preflight is unavailable, and offer settings/path guidance |
| Automation | Report per Apple Events target, never a false global status |
| Files and folders | Use actual operations, folder selection, and security-scoped access |
| Microphone | When Voice Input is enabled, combine native status with `getUserMedia` failure; first add usage description, WKWebView/iframe policy, and owner identity |
| Notifications | Use UserNotifications for native status; retain and distinguish Pomodoro Browser Notification state |
| Camera | Do not declare, show, or request today |

Startup/background refresh never prompts. Requests require a direct click. Do not widen the HTTP(S)-only external-link operation to arbitrary schemes; open System Settings through a fixed first-party operation.

The central card owns status/recovery while feature UI owns immediate error and retry. Never attribute external FFmpeg, Screen Studio, or Terminal.app permissions to YourBuddy.

<a id="model"></a>
## Data model and protocol

Persist choices, never the environment snapshot:

| Type | Fields |
|---|---|
| `ShellEnvironmentSettings` | `version`, mode `inherit` or `desktopOnly`, optional `shellPath` |
| `NetworkProxySettings` | New `inherit` mode and migration version |
| `DesktopSettings` | Environment, network, and existing lifecycle settings |

| Status type | Required fields |
|---|---|
| `ShellEnvironmentStatus` | Status, source, shell path, duration, variable count, PATH count, restart-needed, overridden names, tool results, error code |
| `MacPermissionStatus` | Permission identifier, status, responsible process, action kind, localization key |
| `EnvironmentPermissionSnapshot` | Environment status, applicable permission list, snapshot revision |

Continue using the single `run_first_party_command` gateway:

| Operation | Side effect |
|---|---|
| `get_environment_status` | None; read running Host and saved settings |
| `preview_shell_environment` | Run one bounded capture without changing Host |
| `save_environment_settings` | Persist selection and report restart-required |
| `get_macos_permissions` | Non-prompting applicable-permission query |
| `request_macos_permission` | Request only allowlisted directly requestable permission |
| `open_macos_permission_settings` | Open only allowlisted System Settings destination |

Browser-to-Shell messages retain version, request ID, strict source validation, Accepted/Response phases, and fixed action union. Never add the complete environment to the protocol.

<a id="settings"></a>
## Settings and diagnostics

Add “Environment and permissions” before Application lifecycle in General settings. Show mode, login shell, capture status, restart-needed, PATH count, overridden names, and executable results for `git`, `python3`, `ffmpeg`, and `ffprobe`.

Actions are Refresh preview, Use terminal environment, Use desktop environment only, and Save and restart. Permission rows show status, responsible process, and one recovery action. Refresh failure retains prior data with an in-place notice; transient outcomes use the existing toast.

`boot.log` records shell path, status, duration, variable count, fallback error code, PATH count, network source, and overridden names. It excludes values, full PATH, proxy credentials, certificates, and tokens.

<a id="failures"></a>
## Failure handling

Missing shell, nonzero exit, unreadable/oversized output, malformed entry, or timeout falls back to desktop-only mode without blocking settings or provisioned runtime. Timeout terminates the full process group and explains that shell initialization may await interactive input.

Interactive login startup may execute user-configured side effects. Settings must say so; capture runs once per process and preview only after a click.

Missing optional tools disable only their capability. Permission-query failure yields `unknown`; denial does not stop unrelated features. Feature errors return the same permission identifier so settings provides one recovery action.

<a id="implementation"></a>
## Implementation locations and dependencies

| Location | Responsibility |
|---|---|
| `src-tauri/src/shell_environment.rs` | Shell resolution, capture, NUL parsing, merge, fallback, redacted status |
| `src-tauri/src/lib.rs` | Early capture and first-party environment/permission dispatch |
| `runtime/env_path.rs`, `path_bridge.rs` | Consume resolved environment and create one final PATH |
| `runtime/supervisor.rs` and command owners | Apply shared map, per-child values, explicit working directory |
| `network_proxy.rs` | Inherit mode, migration, native/Node parity |
| `macos_permissions.rs` | macOS status, requests, and System Settings allowlist |
| `tauri.conf.json` and bundle config | Reconcile product identity; add usage descriptions only for real features |
| `shell.html` and bridge tests | Restore strict source validation and fixed protocols first |
| Personal Workbench Client | New card, strict protocol types, bilingual copy |

Critical path: bridge/product-config baseline → shell capture → runtime/PATH → network migration → environment UI → permission service/feature wiring → signed acceptance. Later phases cannot bypass predecessor acceptance.

<a id="testing"></a>
## Testing and acceptance

Automation covers login-shell resolution; NUL newlines/equal signs; non-UTF-8 policy; duplicates; precedence; PATH de-duplication; size limits; timeout/group teardown; CLI bypass; migration; redaction; owned names; four network modes; Windows/WSL regression.

Fake shells establish login/interactive arguments, null stdin, banner isolation, nonzero exit, and timeout. A process fixture exports a tool directory and attempts to replace owned names; managed Node must observe ordinary exports, managed PATH, isolated DSH home, and final network values.

Permission mapping/routing uses injected adapters; real TCC is not deterministic CI input. Client tests cover protocol, rendering, restart-needed, unavailable shell, retained data after error, and localized actions.

Signed macOS acceptance establishes: Finder sees a shell-only tool; Host and Oil Creator share `ffmpeg`/`ffprobe`; application overrides win; fallback recovers; permissions prompt only after click; Full Disk Access is not misreported; external permissions are not attributed; notification source is clear; themes, keyboard, narrow windows, and locales work.

Run focused Rust/Client tests, assembled product smoke, GUI demonstration, `pnpm run test:docs`, `pnpm run doc-sync`, applicable lint/typecheck, and `git diff --check`. Release records environment inheritance, application overrides, and real permission behavior separately.

<a id="delivery"></a>
## Delivery order

| Phase | Deliverable | Completion evidence |
|---|---|---|
| 0 | Desktop Shell bridge and product-config baseline | Existing lifecycle/gateway tests pass; source and bundle identity agree |
| 1 | Resolved environment and shell capture | Fixtures establish capture, fallback, precedence, CLI bypass, redaction |
| 2 | Runtime, PATH, network | Native and managed Node observe one environment; existing network choices remain unchanged |
| 3 | Environment status UI | Source, restart-needed, tool resolution, and overridden names are visible |
| 4 | macOS permissions and feature wiring | Status, explicit request, settings destinations, microphone config, and external ownership pass tests |
| 5 | Signed acceptance and release record | Finder, real TCC, product smoke, GUI evidence, and limitations recorded separately |

Ship when Finder and terminal resolve the same exported toolchain, application values are deterministic, capture recovers, network is consistent, and permission status claims no more certainty than macOS APIs and responsible processes provide.

<a id="dev-note"></a>
## Dev Note

This is an implementation plan, not current behavior. The complete environment exists only in native process memory and child environments; every future log, IPC, diagnostic, or telemetry addition must preserve the no-values rule.
