# Why YourBuddy

English | [中文](about.zh.md)

Your models. Your tools. Your way.

YourBuddy assembles DeepSeek Harness and community plugins into a desktop workbench. A model understands and generates; a Harness supplies the tools, context, permissions, sessions, and feedback needed to carry out work.

## Start using, then extend

The default combination covers model access, workspace tasks, and result inspection. When a specialized need appears, [choose an extension approach](develop.md): reuse a plugin, write a Skill, adjust configuration, or develop a DSH plugin. Small teams can share projects and working instructions while each member keeps their own account and workspace.

## Two parts of a specialized workbench

DSH is an AI runtime with a Web UI. Session creation, the model-and-tool execution loop, history, the plugin system, and MCP tool integration are already available. Y8 provides a ready-to-use default composition on that foundation. Customization for a particular domain can focus on two parts:

- **A domain analysis engine**: analyze data using domain rules and produce results people can inspect.
- **A practical control panel**: let users select inputs, start tasks, adjust parameters, and inspect progress and results.

DSH plugins can implement both parts. A plugin can provide analysis capabilities and extend the workbench interface, organizing domain logic and user actions around the same task. The [Harbor development example](plugins/harbor-evolution.md#development-example) shows this approach.

## Choose what fits

Choose models for their capabilities, availability, and cost. Add tools when they help your task. Give the workbench your own name and Logo without having to assemble the application yourself.

## Inspect what happened

Keep the conversation connected to files, command output, and Git differences. A completion message is useful when you can inspect the result behind it.

## Improve with evidence

Context Doctor explains context overhead. Harbor Evolution helps analyze completed work and compare controlled changes. A score needs an explanation, and a successful run is not automatically an improvement.

## Know where work goes

Project files remain in the workspace you select. Sessions and settings are managed locally. Cloud models, search services, and evaluators receive the inputs required for their operations. Local storage does not mean all computation is offline.

The initial desktop target is macOS Apple Silicon. See [downloads](download.md), [plugin ownership](plugins/index.md), and the [roadmap](roadmap.md) for scope and limitations.
