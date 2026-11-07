# Install and upgrade from the terminal

English | [中文](installer.zh.md)

Install YourBuddy on Apple Silicon macOS without a source checkout, Node, pnpm, or a compiler. Use the desktop conversation to upgrade the application that owns that conversation, or use the terminal when the application is unavailable.

## Choose an entry

For an ordinary first installation, the [Bootstrap DMG](download.md) remains the simplest graphical path. The terminal path requires an official release that includes `install-yourbuddy.sh`. A release without that asset or the native installer protocol must use its DMG; passing installer flags to an older application is not supported.

In a supported YourBuddy conversation, ask to upgrade YourBuddy. The assistant uses `yourbuddy_upgrade`, prepares a separate installer process, records the operation receipt in the current session, and then hands off the restart. Another active or queued task, subagent, or background job blocks the upgrade; finish that work before retrying. The previous conversation remains available after restart, but the assistant does not automatically resume or repeat previous tools.

Terminal installation does not automatically stop a running YourBuddy GUI because an external command cannot confirm that its tasks are idle and its session is saved. Upgrade from the current conversation instead, or finish tasks and quit the selected application before retrying in the terminal. This restriction also applies to installer-capable applications.

## First terminal installation

Check that the [latest official release](https://github.com/istarwyh/yourbuddy/releases/latest) lists `install-yourbuddy.sh`, then run:

```sh
curl --fail --location --retry 3 --output install-yourbuddy.sh \
  https://github.com/istarwyh/yourbuddy/releases/latest/download/install-yourbuddy.sh
bash install-yourbuddy.sh
```

The launcher selects the latest YourBuddy release, downloads its Bootstrap archive and matching signature, and starts the native installer. Native preparation reuses compatible Node, the pnpm Store, and saved proxy settings rather than requiring manual cache changes. Launcher downloads use curl’s network environment or an explicit `--proxy`. `--app` selects an exact application path; without it, an existing copy in `/Applications` or `~/Applications` is used, and multiple copies require an explicit choice. A fresh installation defaults to `/Applications/YourBuddy.app`.

Initial bootstrap trusts the official GitHub HTTPS download or the official archive you supply. The launcher prefers a protocol-capable installed helper when one exists; otherwise it executes the downloaded helper before that helper checks the application archive signature. Native signature checks protect the installation payload, not that first helper execution. Do not substitute archives from an unknown source.

## Proxy, pinned version, and offline files

When GitHub requires a proxy, apply it to both the launcher download and its native installation:

```sh
curl --fail --location --retry 3 --proxy http://127.0.0.1:7890 \
  --output install-yourbuddy.sh \
  https://github.com/istarwyh/yourbuddy/releases/latest/download/install-yourbuddy.sh
bash install-yourbuddy.sh --proxy http://127.0.0.1:7890
```

Use a credential-free proxy endpoint reachable on this Mac. Add `--version X.Y.Z` to select a published installer-capable release, or `--app "$HOME/Applications/YourBuddy.app"` to select a writable destination whose parent directory already exists. A pinned version is not a promise that older application data supports downgrading.

`--offline` alone downloads the larger Offline archive and then prepares components only from its signed seeds and local cache. For a disconnected Mac, download `install-yourbuddy.sh`, the Offline `.app.tar.gz`, and its matching `.sig` from the same official release on a connected machine. Copy them to the Mac, keep the archive and signature together, and use their actual absolute paths:

```sh
bash install-yourbuddy.sh --offline \
  --package "$HOME/Downloads/YourBuddy.app.tar.gz" \
  --signature "$HOME/Downloads/YourBuddy.app.tar.gz.sig"
```

The local-file route does not query GitHub for a release. The archive supplies its version. It does not require copying individual components, unpacking a pnpm Store, or rebuilding the application.

## Read the result

An `accepted` receipt means the operation is saved and an independent installer has started. It does not mean the installation succeeded. Keep its `id`. The durable `phase` becomes `succeeded` only when the target application version, private Host, and frontend are ready; `unchanged` means the selected application already has the target version, so no shutdown or replacement occurred; it does not assert workbench readiness. `failed` and `needsUserAction` are terminal outcomes that require attention.

The installer creates a stable command before returning the receipt, including on a fresh installation. Without changing PATH, wait for the selected application's result:

```sh
"$HOME/Library/Application Support/YourBuddy/bin/yourbuddy" \
  status --app /Applications/YourBuddy.app --wait
```

`--wait` prints the terminal JSON record. Read `phase`: the status command can exit zero even when the recorded operation failed or needs user action. The desktop's **Enable terminal commands** action makes `yourbuddy` available in new terminal sessions. It is separate from installation: the launcher never edits shell profiles. With that command enabled, inspect the latest operation or a specific receipt:

```sh
yourbuddy status --app /Applications/YourBuddy.app
yourbuddy status --operation OPERATION_ID
```

`yourbuddy version` reports the local command executable’s version without network access. `yourbuddy check` queries the available release version without installing. `yourbuddy install` starts another installation request. An explicit `--request-id` makes retries of the same target and options return the same operation; use a new request ID for a new attempt after resolving a terminal failure. Advanced callers using `--defer-stop` must themselves block other work, own the target Host’s busy admission, and save the session receipt before `yourbuddy handoff --operation OPERATION_ID`. A `--session-id` value alone does not establish that ownership. `yourbuddy cancel --operation OPERATION_ID --reason "Cancel before restart"` is accepted only before shutdown starts; cancellation is recorded as `needsUserAction`, not success.

In a desktop conversation, `yourbuddy_upgrade_status` reads the same durable result without replaying the upgrade. Restart restores the saved conversation, not an automatic agent continuation.

## Recover without deleting user data

Read `error` and `userAction` before retrying. Network failures can be retried with a proxy or local files. If another task is active, let it finish. For a terminal upgrade, quit the selected application yourself after completing its tasks, then retry. An older application without the shutdown protocol cannot use conversation handoff. The installer does not forcibly terminate it.

For `needsUserAction`, follow the recorded action yourself. Other permission or launch failures can be reported as `failed`; inspect the error rather than assuming that every macOS authorization issue has a separate classification. YourBuddy is not signed or notarized with an Apple Developer identity, so first launch can require **Privacy & Security → Open Anyway**. The installer does not bypass that decision or silently request administrator access. Use a writable application destination when the selected directory cannot be replaced.

Settings, credentials, and sessions remain outside application replacement. Do not delete application data or component caches to repair an upgrade. See [troubleshooting](troubleshooting.md) and the selected release's [verification archive](../../releases/README.md) for observed platform checks and known limitations.
