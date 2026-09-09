# dsh-personal-workbench

English | [中文](README.zh.md)

This first-party YourBuddy product plugin owns three General settings cards. **Settings → General → My Workbench** lets a user replace the sidebar workbench name and Logo, preview the draft, and restore the YourBuddy fallback. **Settings → General → Network proxy** configures one application-wide Direct, macOS system, or custom proxy policy, tests the native draft, a fresh managed Node draft, and the active Node Host against ChatGPT, and persists the selection only after both draft paths pass before restarting YourBuddy. **Settings → General → Application lifecycle** asks the trusted desktop shell to run the signed application updater or restart the complete application after stopping its private Host. A restart loads plugins installed through Plugin Marketplace. Desktop actions remain visible but disabled in standalone `dsh web`; no browser request can choose an arbitrary Tauri command, proxy credentials are not accepted, and the update action never refreshes plugin source on an end-user machine because bundled product plugins advance with the signed application release.

The sidebar footer provides **Help and guides** in expanded and collapsed layouts. Its five destinations cover getting started, default plugins, extending Y8, troubleshooting, and GitHub issues. Chinese locales open the Chinese product site; other locales use English. Desktop requests use the existing external-link bridge, while standalone Web opens a separate browser context. A failed open request leaves the destination visible and copyable; opening help preserves the workbench location. The My Workbench card also links to the usage guide. Online documentation is not cached for offline reading.

In the YourBuddy desktop application, safe external links rendered by assistant Markdown open in the operating system's default browser. The Client handles only absolute, credential-free HTTP and HTTPS anchors that the shared Markdown renderer marked for a new browsing context, while same-origin and relative links keep their existing Web behavior. Hovering exposes the normalized destination, and the custom context menu can open or copy the link. The iframe protocol, shell validator, and Rust command independently reject other schemes and unexpected message fields. Standalone `dsh web` keeps the browser's ordinary link behavior.

The workbench identity is stored in the current DSH Profile under the `personal-workbench` namespace:

```yaml
personal-workbench:
  enabled: true
  name: My Workbench
  logo: data:image/png;base64,...
```

The browser stores an uploaded image as a data URL in the current Profile. Name and Logo customization does not change the browser title, executable name, application icon, theme, or other UI copy.

The network proxy is stored in YourBuddy's native desktop settings, outside the DSH Profile. Direct mode removes inherited proxy variables from the application process tree. System mode reads fixed macOS HTTP and HTTPS proxy endpoints with `/usr/sbin/scutil`; it rejects PAC, automatic discovery, and HTTP-only configurations because translating those settings to Node subprocesses would not preserve their routing behavior. Custom mode requires separate credential-free URLs for HTTP-target and HTTPS-target requests and can add bypass hosts, while YourBuddy always bypasses its own loopback Host; when both fields name the same loopback host and port, an accidental `https://` value in the HTTPS-target field is canonicalized to the plain `http://` CONNECT proxy used by local agents. The DSH CLI installs Undici's environment-proxy Dispatcher after loading the launch environment and before importing Profile boot, so the bundled Node 22.19 Host does not depend on a later Node flag or a configured plugin for global `fetch` routing. YourBuddy enables Node's system CA store, and native reqwest clients use the platform verifier. Additional trust follows one precedence order: a CA explicitly selected in the card, otherwise a valid launch `NODE_EXTRA_CA_CERTS` value inherited from the process or macOS `launchctl`, otherwise system trust alone. YourBuddy canonicalizes the selected or inherited `.pem` or `.crt` path and rejects missing, unreadable, malformed, not-yet-valid, or expired certificates before using it; only an explicitly selected path is persisted. The resolved path and source are then applied consistently to native clients, the updater, the Host, plugin subprocesses, and WSL while certificate verification remains enabled. The settings test labels the native draft, fresh managed Node draft, and running Host outcomes separately and returns only reachability, HTTP status, proxy use, active proxy mode, CA source, and bounded codes such as `UNKNOWN_ISSUER` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; it never returns request errors, proxy URLs, credentials, or the CA path. Save repeats the native and managed Node draft preflight and writes nothing unless both pass. The selected policy becomes active only after the requested application restart, which terminates and waits for the current private Host before relaunch, and then applies to the Host, plugin subprocesses, profile installs, runtime provisioning, and signed application updates.

The default name and Logo are YourBuddy and the bundled Y8 mark. Missing or disabled custom values restore that product identity; uninstalling the plugin restores the upstream shell fallback.

## Model Experience

None, as this package changes browser presentation only; it does not add content to model requests.

#### KV Cache effect

None; changing the workbench identity does not assemble or send a provider request.

## Known Limitations and Deferred Work

- **One Profile owns one custom identity** — the plugin does not select different branding per Workspace or Session.
- **Only the declared brand slots change** — browser title, desktop icon, themes, fonts, wallpapers, and global text remain owned by their existing surfaces.
- **Proxy authentication and PAC are not stored or evaluated** — use credential-free fixed endpoints reachable by the application process; WSL targets must also be reachable from the WSL network namespace.
- **The additional CA must be a currently valid, readable PEM bundle** — `.pem` and `.crt` are accepted file-name extensions, but DER-only, malformed, not-yet-valid, and expired certificates are rejected; a valid launch `NODE_EXTRA_CA_CERTS` is used automatically until an explicit selection overrides it, and system trust stays active alongside the additional roots.
- **Proxy changes are restart-scoped** — Test exercises the native and fresh managed Node draft before comparing the running Host; save itself repeats both draft checks and leaves settings unchanged on failure, while running Host and updater processes retain the previously activated policy until the application restarts.
- **Application lifecycle actions are desktop-only** — the workbench Client can request only the fixed signed-update and restart flows; the shell accepts them only from the active Host iframe at its exact Origin.
- **External-link handling is desktop-only** — only safe HTTP(S) assistant links are delegated to the system browser; local routes and file mentions remain owned by the embedded Web application.
