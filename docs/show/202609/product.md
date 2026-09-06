# Product philosophy and homepage copy

English | [中文](product.zh.md)

This page defines the website's product explanation and proposed copy. See [First use](quickstart.md) for operations and the [Roadmap](roadmap.md) for future directions.

## Product definition

YourBuddy is an AI workbench for choosing models, composing tools, and checking task results. It assembles DeepSeek Harness plugins into a desktop application, letting users work in their own directories, inspect generated files, command output, and evaluation evidence, and gradually develop a workflow that fits their needs.

The initial audience is developers, technical creators, and practitioners who repeatedly assess Agent work quality on macOS Apple Silicon. Entry-level documentation assumes users can select a local folder and complete model login or credential setup. Plugin development, evaluator authoring, and runtime assembly belong in advanced sections.

## Core principles

### Choose models for the task

Users can connect Codex login state through GPT Auth or configure other providers and compatible endpoints in model settings. Tasks, available capabilities, accounts, and cost should guide model selection. The website shows supported configuration paths and explains that tool and image capabilities vary by model.

### Make tools serve the work

The default composition covers starting tasks, inspecting outputs, understanding context, discovering extensions, and evaluating results. Plugin count is not a value metric. Each additional default plugin should explain which operation it removes, which decision it helps users make, and which dependencies or limitations it introduces.

### Make results inspectable

Files, terminals, Git differences, and evaluation reports should connect to the conversation. Users can check what the Agent changed, whether commands succeeded, and what supports a conclusion. Completion statements should correspond to observable results.

### Ground improvement in evidence

Context Doctor helps identify context overhead, while Harbor Evolution helps analyze completed sessions or run controlled evaluations. Improvement can begin with one concrete failure and gradually produce stable regression cases. Diagnostic suggestions, evaluation scores, and business quality each need evidence; a successful execution is not automatically a capability improvement.

### Let users make the workbench their own

Users can replace the workbench name and Logo and choose directories, models, and extensions. A custom name is a visible entry point to this principle; configurable workflows and clear data locations also matter. Describe personalization within the current settings rather than advertising an unimplemented complete theme system.

## Proposed homepage copy

**Product name:** YourBuddy

**Headline:** An AI workbench that works your way

**English tagline:** Your models. Your tools. Your way.

**Introduction:** Choose a model for your task, work with files in your own directory, run tools, and inspect results. Default plugins bring everyday tasks, context diagnosis, and evaluation-driven improvement into one workbench.

**Primary actions:** Download for macOS; Get started. Show the download action only when the corresponding YourBuddy installer is actually available.

**Three feature cards:** Choose your models; Inspect each result; Improve your workflow with evidence. Link each card to a real usage page and accompany it with a screenshot from the current release.

**Ecosystem statement:** Built on DeepSeek Harness and community plugins, with desktop assembly, default experience, and release verification provided by YourBuddy. Plugin pages retain their project names, author sources, and licenses.

## Limits to communicate

| Possible reader interpretation | Accurate website wording |
|---|---|
| A local workbench means all computation stays local | Sessions and settings are managed in the application's local directory; cloud models, search, and evaluators receive the inputs needed for their operations |
| Installing the application gives free access to every model | A usable account, quota, or provider credentials are required; integration does not change provider pricing or availability |
| Every plugin was created by YourBuddy | Distinguish upstream foundations, external integrations, and first-party plugins |
| Self-evolution means automatically editing and publishing itself | Existing capabilities are explicitly initiated diagnosis, evaluation, and controlled optimization; production deployment remains a separate workflow |
| Default plugins provide a complete office suite | Initial examples focus on code, text materials, and verifiable Agent tasks; describe other formats according to actual plugin support |

## Evidence

See the [desktop documentation](../../../apps/desktop-tauri/README.md) for assembly and local operation, [model configuration](../../user/guide/providers.md) for model entry points, [Personal Workbench](../../../apps/desktop-tauri/product/personal-workbench/README.md) for name and Logo scope, and [product notices](../../../YOURBUDDY_NOTICES.md) for upstream attribution.
