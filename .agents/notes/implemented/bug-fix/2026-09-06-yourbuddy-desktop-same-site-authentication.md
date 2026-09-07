# Agent Note: YourBuddy desktop same-site authentication

Status: implemented

English | [中文](2026-09-06-yourbuddy-desktop-same-site-authentication.zh.md)

## Problem

YourBuddy 0.3.2 completed the private Host's launch-token exchange before opening its window, but the installed macOS application still displayed `dsh web authentication required`. The Tauri shell used a local application URL while the embedded Host used `http://127.0.0.1:<port>`, so WebKit treated the Host iframe as cross-site and withheld the Host's `SameSite=Strict` cookie. The release smoke served its shell from another `127.0.0.1` port and was accidentally same-site with the Host, so it did not reproduce the installed application.

Changing the WebView copy to `SameSite=None; Secure` did not fix the installed application because macOS WebKit still blocked that third-party cookie. Weakening the shared Host cookie would also change ordinary `dsh web` browser authentication without addressing WebKit's storage policy.

Serving the privileged shell through `WebviewUrl::External` also makes it a remote Tauri origin. Registering an application command in `generate_handler!` does not authorize that origin: the runtime capability must reference an application permission that allows the command, while the embedded Host origin must remain unauthorized.

## Decision

Native startup completes the token exchange, validates the returned cookie name, value bounds, expiry, `Path=/`, `HttpOnly`, and `SameSite=Strict` attributes, and retains only that cookie until the main WebView is created. The token URL is discarded before renderer creation and never enters an initialization script.

The privileged desktop shell is served by a minimal application-owned HTTP server on a random `127.0.0.1` port. Tauri receives a runtime capability restricted to that exact origin and the `main` window. The capability carries the existing shell permissions plus the `allow-desktop-shell-commands` application permission; that permission's command list exactly matches the literal invokes in `shell.html` and contains no plugin-supplied or computed command. The server requires the exact loopback `Host`, accepts only bounded `GET` requests, serves the embedded shell, locale script, and icon with no-store and restrictive response headers, and stops before application quit or restart.

The shell and Host now share the HTTP `127.0.0.1` site while retaining different origins because their ports differ. Native code installs the validated strict Host cookie, confirms the stored value and attributes, and only then lets the shell open the credential-free Host root in its iframe. Same-site cookie delivery therefore works without third-party-cookie exceptions. The Host iframe cannot read the shell document and does not match the shell's exact Tauri capability origin, so product Client code still receives only the existing allowlisted `postMessage` bridge.

## Verification

A negative control changed only the release-smoke parent from `127.0.0.1` to `localhost`; the assembled product then stopped at the same 401 response reported by the installed application. Unit tests cover the token exchange's cookie extraction, strict attribute validation, exact loopback shell URL, exact-origin runtime capability, and bounded HTTP header reader. A top-level static gate extracts every literal shell invoke, requires an exact match with the application permission, and confirms each name is registered. A Rust test loads the generated application manifest into Tauri Runtime Authority, grants the dynamic capability, resolves every allowed command for the exact remote origin and `main` window, and rejects another origin and window. The macOS release workflow runs both checks after building the application. The product browser smoke clears prior cookies, installs the exchanged strict cookie, serves the shell and Host from separate loopback ports, loads the clean Host root, exercises the product Clients and desktop bridges, and requires normal Host shutdown; its JavaScript invoke stub is bridge evidence, not ACL evidence.

On 2026-09-06 UTC+08:00, the public 0.3.2 application was launched from `/Applications` and reproduced the 401. A release-mode arm64 binary containing this change was then placed in a copy of the same 0.3.2 application resources, ad-hoc signed, launched with an isolated application-data directory, and observed in the real macOS WebView. The private Host reached authenticated readiness and the visible window rendered the YourBuddy workspace instead of the authentication error. This installed-bundle test did not exercise Windows, WSL, Intel macOS, OAuth, or a real model request.

## Alternatives considered

**Change the Host cookie globally to `SameSite=None; Secure`.** Ordinary `dsh web` serves loopback HTTP and intentionally uses a strict host-only cookie. The trial did not pass macOS WebKit's third-party-cookie policy and would weaken a shared security setting for every browser consumer.

**Give the Host page top-level Tauri access.** Loading the product Host directly could make its cookie first-party, but community Client plugins would then execute in the privileged document. The separate-origin shell keeps native commands behind fixed validators.

**Navigate the WebView through the token URL.** This exposes a process credential to the renderer and still leaves a cross-site iframe after redirect. Native exchange plus cookie handoff keeps the token outside renderer state.

**Proxy the Host through a custom protocol.** The Web application also needs streaming and WebSocket behavior. A partial native proxy would duplicate Host transport behavior and create another authentication surface.

## Consequences

The desktop process owns one additional ephemeral loopback listener and one exact-origin runtime capability while its main window exists. Failure to bind, authorize, or serve that shell fails startup instead of falling back to an unauthenticated Host page. Adding a shell application command requires one literal invoke, one registered handler, and one explicit permission entry; their mismatch fails the ordinary static CI gate, while the release workflow also exercises Tauri's resolver. The existing Host cookie remains strict, HTTP loopback remains unencrypted as previously documented, and the credential-free Host URL remains the only renderer-visible Host address.

Source browser smoke is required to model the installed shell's same-site relationship explicitly. A same-site or stubbed-invoke smoke result alone is not installed-product evidence, so release verification still launches the packaged application and exercises affected controls on each claimed desktop platform.
