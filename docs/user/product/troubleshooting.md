# Troubleshooting

English | [中文](troubleshooting.zh.md)

Start with the failing operation and keep its diagnostic message.

| Symptom | Check next |
|---|---|
| Input is unavailable | Select a workspace before starting a session |
| Model request fails | Check the selected model, login or credentials, quota, and network status |
| A generated file is missing | Inspect the session directory and actual tool result, not only the assistant summary |
| Context Doctor is absent | Create an existing session; a new session without an identifier has no session-level audit control |
| A plugin installs but has no UI | Confirm the YourBuddy Web Profile was targeted, then restart through Application lifecycle |
| Marketplace install is disabled | The npm package may lack unambiguous Bundle metadata; a GitHub topic alone is insufficient |
| A proxy test succeeds but requests still fail | Inspect both desktop and Host results; save, restart, and retest changed settings |
| Harbor has no history | Use the exact directory containing completed business sessions, or supply explicit tasks |
| An evaluation is unscored | Read evidence and coverage; insufficient evidence can cause legitimate abstention |
| A help page does not open | Copy the address from Help and open it in a browser; check networking, since Help has no offline guide copy |
| A development tutorial cannot find the plugin | Use the tutorial's absolute path and run the command from a prepared DSH source checkout |

## Startup and system prompts

Preserve startup diagnostics when runtime preparation fails. Do not delete the application data directory as a first troubleshooting step. Apple signing and notarization are separate from Tauri update signatures; consult the actual release's system-opening instructions.

## Share useful evidence

Include application version, operating system and architecture, the failed operation, and the visible error. Remove credentials, private task text, and sensitive file paths. The macOS application root is `~/Library/Application Support/YourBuddy`; project outputs remain in the selected workspace.

Use [model setup](models.md), [settings](settings.md), or the relevant [plugin page](plugins/index.md) for detailed prerequisites. [Report an issue](https://github.com/istarwyh/yourbuddy/issues).
