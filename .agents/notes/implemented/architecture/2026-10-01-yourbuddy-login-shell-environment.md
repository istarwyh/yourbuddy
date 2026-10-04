# Agent Note: YourBuddy inherits the login Shell environment

Status: implemented

English | [中文](2026-10-01-yourbuddy-login-shell-environment.zh.md)

## Problem

A macOS application opened from Finder receives a sparse LaunchServices environment rather than the environment a user exports from an interactive terminal. YourBuddy therefore could not find Homebrew tools, version-manager shims, proxy configuration, or ordinary exported credentials that worked in the user's terminal. Fixing each plugin independently would create different process environments and leave new subprocess owners vulnerable to the same defect.

## Decision

YourBuddy captures the account's interactive login Shell environment once, before Tauri starts background work or runtime discovery. The selected Shell invokes the current executable in an internal emitter mode that writes bounded NUL-delimited native environment entries to an owner-only temporary file. Capture preserves non-UTF-8 `OsString` values, has a fixed deadline, terminates and waits for the process group on timeout, and falls back to the desktop launch environment without blocking startup.

Ordinary exported values from the Shell override the GUI environment and pass to the private Host and plugin subprocesses. This deliberately includes credentials and configuration the user exported for terminal programs. YourBuddy never returns those values to the Browser Client and never writes them to logs, diagnostics, or telemetry.

Application-owned values apply after capture. The managed PATH prefix, isolated `DSH_HOME`, `NODE_ENV`, `NODE_OPTIONS`, effective proxy and CA variables, internal capabilities, explicit working directories, and `YOURBUDDY_*` or `DSH_DESKTOP_*` names cannot be replaced by Shell startup files. Shell bookkeeping such as `PWD`, `OLDPWD`, and `SHLVL` is removed. Fresh macOS desktop settings use network Inherit mode, while other platforms and existing settings without a recorded network mode retain Direct behavior.

General settings expose only the selected mode, Shell path, capture metadata, common executable availability, application-owned name groups, and restart requirement. Preview is bounded and does not mutate the running process. Saving changes the next launch only.

## Alternatives considered

**Patch PATH in each plugin.** Rejected because plugins would disagree about available tools and every new subprocess owner would need another workaround.

**Launch every operation through an interactive Shell.** Rejected because it repeats user startup side effects, changes argument and signal semantics, and weakens explicit working-directory and process-lifecycle ownership.

**Filter credentials and other sensitive-looking names.** Rejected because exported configuration is part of the terminal environment the user asked the desktop application to inherit, and name-based filtering would silently break arbitrary tools. The confidentiality rule instead prohibits values from diagnostics and Browser IPC.

**Let the Shell replace every variable.** Rejected because runtime identity, isolated persistence, Node behavior, loopback capabilities, and network policy must remain consistent across the application process tree.

## Consequences

Finder and terminal launches share ordinary exported tool and configuration discovery while YourBuddy retains deterministic runtime ownership. Interactive Shell startup files run once per application launch and may execute their configured side effects. A blocking or malformed startup cannot prevent the application from opening, but it may add up to the capture deadline before fallback.

Host and plugins receive a broader environment, including exported secrets, than they received from a sparse Finder launch. This is intentional first-party process inheritance, not a Browser capability; plugin trust and environment-value confidentiality remain required. Signed macOS acceptance is the authority for real LaunchServices, toolchain, and TCC behavior because deterministic tests cannot reproduce those operating-system identities.
