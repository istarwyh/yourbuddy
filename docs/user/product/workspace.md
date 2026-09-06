# Work with files and results

English | [中文](workspace.zh.md)

Keep the conversation beside the work it produces.

## Select the right directory

Add and select a workspace before starting. Agent file operations and Harbor tool requests use the session's working directory. Use a practice folder for unfamiliar tasks and confirm the paths reported by tools.

## Inspect outputs

Better Sidebar provides a file tree, editor, previews, terminals, Git views, and background tasks. Open generated Markdown or code, compare it with your request, and inspect command results. Git operations and real terminals affect your actual workspace.

## Delegate a focused task

The default Codex preset can delegate a self-contained task to Codex Subagent. Include the objective, relevant files, and completion criteria. It shares the working directory but does not inherit the entire parent conversation; native Codex login and permission settings apply. Loading the provider does not start a child process.

## Manage context deliberately

A Skill supplies reusable task instructions; a plugin adds runtime capabilities or UI. Extra instructions and tools can consume context. Use [Context Doctor](plugins/context-doctor.md) before trimming, then verify a representative task after any change.

See [Better Sidebar](plugins/better-sidebar.md) for optional controls and [evaluation](evaluation.md) for checking repeated task quality.
