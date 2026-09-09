# First use: complete an inspectable task

English | [中文](quickstart.zh.md)

This tutorial helps a new user complete a task in an explicit working directory and locate its actual output. It targets the macOS Apple Silicon desktop release of YourBuddy. Before publishing the page, follow these steps with the corresponding installer and add screenshots.

## 1. Install and launch

Choose an installer from [YourBuddy Releases](https://github.com/istarwyh/yourbuddy/releases) that explicitly supports your system, mount the DMG, and install the application. The download page also shows the version, architecture, checksums, and known limitations. Do not derive an availability promise from the source version when the corresponding artifact does not exist.

The desktop package carries default plugins, required managed runtimes, and offline dependency resources. Ordinary desktop users do not need to clone and build the repository first. Wait for runtime preparation to finish at startup; preserve startup diagnostics and consult troubleshooting if it fails. Apple application signing and notarization remain deferred, so release pages must explain system blocking messages according to the actual release state. Tauri update signatures are a separate mechanism.

## 2. Connect a usable model

Choose a path that fits your setup, then check the model selected for the current session:

| Path | Action | Success signal and limits |
|---|---|---|
| Existing Codex / ChatGPT usage | Open GPT Auth in Settings, inspect login state, and follow the login flow | The account is available and the model selector offers a usable Codex route; this is unofficial access provided by a community plugin |
| Model service API | Open Settings → Model and add a provider or save credentials for a service such as DeepSeek | The provider can be selected and a simple text request succeeds; its own credentials and quota apply |
| Company gateway or self-hosted compatible service | Add a custom provider with its protocol, base address, and model | Requests succeed against the actual endpoint; declared modalities and tools must match the service |

See [Default plugins](plugins.md) for GPT Auth prerequisites and limits, and the [model configuration guide](../../user/guide/providers.md) for APIs and custom models. Do not paste full credentials or login files into a conversation. Credentials configured in a separate DSH environment do not establish that YourBuddy is configured.

## 3. Select a working directory

Add and select a dedicated practice folder through the workspace selector, then create a session. The workspace determines where the Agent works with files; the input is unavailable until a workspace is selected. Use a practice directory that you explicitly want the Agent to read and write for the first task.

## 4. Create and inspect the first output

Send the following example in the conversation. It is a usage demonstration, not a performance or quality benchmark.

> Create hello-yourbuddy.md in the current working directory, with three things to complete this week and acceptance criteria for each. When finished, tell me the file location and summarize what you wrote.

Respond to any operation approvals shown by the interface. When the task ends, open the file through Better Sidebar and verify that the three tasks and their acceptance criteria exist. If the workspace is a Git repository, inspect the difference as well. An assistant completion message alone does not establish that the file was written.

## 5. Find common controls

| Entry point | First interaction |
|---|---|
| Better Sidebar | Browse the practice directory, open the new Markdown file, and inspect the terminal or Git panel |
| Context Doctor beside an existing session's input | Expand the context audit and inspect estimated instruction, skill, and tool usage |
| Settings → General → My workbench | Change the name or Logo, preview and save, then reopen to check persistence |
| Settings → Plugin Marketplace | Inspect a plugin's purpose, source, and installation eligibility; installing more plugins is optional |

## 6. Configure networking and updates when needed

If networking is restricted, open Settings → General → Network proxy and choose direct, system, or custom fixed proxy settings. Check the native draft, fresh managed Node draft, and running Host separately; save leaves settings unchanged after a failed native or managed Node preflight, then restart and test again to confirm activation. Custom proxy settings require addresses for HTTP-target and HTTPS-target requests; PAC and proxy credential storage are not supported. A valid launch `NODE_EXTRA_CA_CERTS` is adopted automatically, while the settings card's PEM control explicitly overrides it for enterprise certificate issues.

Use Settings → General → Application lifecycle to check for updates or restart. After installing a plugin through the marketplace, restart here so its new Client can be discovered. Default bundled plugins update with YourBuddy application releases; an upstream update notification on a plugin page does not mean the local installation has updated.

## Troubleshooting

| Symptom | Next action |
|---|---|
| Input is unavailable | Confirm that a workspace is selected |
| A model is unavailable or a request fails | Check the selected model, account or credentials, quota, and network tests; a failure is not necessarily an application startup problem |
| The new file cannot be found | Check the current working directory, tool results, and actual write location |
| A newly installed plugin has no interface | Confirm installation into YourBuddy's Web Profile, restart, and check whether the plugin loaded |
| Context Doctor is absent | Establish an existing session first; a new session without an identifier has no session-level control |
| Harbor has no history to diagnose | Complete business sessions in that directory first, or explicitly provide a Query / Dataset |

## Data and further learning

The macOS application data root is `~/Library/Application Support/YourBuddy`; its `dsh-home` manages application sessions, configuration, and credentials. Project files remain in the working directories selected by the user. Codex Auth reuses native Codex login storage. Remove credentials and sensitive task content from shared troubleshooting materials.

Next, choose a [typical workflow](workflows.md). Task environments and cost prerequisites for advanced features such as Harbor are explained in those flows rather than being prerequisites for a first ordinary task.

## Evidence

See the [desktop documentation](../../../apps/desktop-tauri/README.md) for installation and updates, the [existing getting-started guide](../../user/guide/index.md) for workspace behavior, and [Personal Workbench](../../../apps/desktop-tauri/product/personal-workbench/README.md) for settings entry points.
