# Extend Y8

English | [中文](develop.zh.md)

Start with one task you want to improve. Y8 uses DSH's plugin system, so you can adopt an existing extension or develop your own without inventing another plugin format.

For a specialized plugin, start with two questions: what data should the domain analysis engine process and what results should it return? What actions and results should the control panel expose? Extend either or both as needed, reusing the existing DSH runtime. See the [product philosophy](about.md) for this division of responsibilities.

## Choose an approach

| Your need | Start here |
|---|---|
| A capability already included in Y8 | Read [default plugins](plugins/index.md) and their prerequisites |
| A capability someone else maintains | Search the [plugin marketplace](plugins/marketplace.md) and check its README and compatibility |
| A repeatable procedure, prompt, or output standard | Write a [Skill for the workspace](workspace.md); a new runtime plugin is unnecessary for instructions alone |
| Different options or a composition of existing capabilities | Check [settings](settings.md), then [plugin configuration](../develop/basic/config.md) and Bundle guidance |
| An existing external service | Check the service's MCP integration before implementing a new connection |
| A new operation, service, settings card, or interface | Follow the plugin development path below |

<a id="define-a-small-requirement"></a>
## Define a small requirement

Copy this outline into your conversation or project README. Answer what you know; the assistant can inspect the existing project for the rest. Give it sample data rather than credentials.

- Task:
- Inputs and their source:
- Expected output and where I will inspect it:
- Allowed changes and operations that must not run:
- Required accounts, services, and configuration:
- One sample input and its expected result:

For example: read failed jobs from the team's build service, return failure reasons and links, and never trigger reruns. Use a redacted service response as the acceptance example. This describes a possible extension, not a service already integrated in Y8.

## Develop and verify

1. [Develop with Creator](creator.md) to inspect available interfaces and experiment with a narrow requirement.
2. Follow [your first plugin](../develop/basic/index.md) to load editable source. This tutorial requires a prepared DSH source checkout, not only the desktop installer.
3. Add a [tool](../develop/basic/tool.md) or [configuration](../develop/basic/config.md), changing one behavior at a time and checking its visible result.
4. Follow [packaging and installation](../develop/basic/publish.md) to make the source reusable. A temporary dynamic experiment is not an installed package.

For a specialized example, read [how Harbor is developed](plugins/harbor-evolution.md#development-example). Framework, events, and service details live in the [framework guide](../develop/framework/index.md); that deeper reference opens on GitHub where it is not published on this site.

## Share within a team

Share the project or exact package version, supported DSH version, installation steps, configuration names, and an acceptance example. A teammate should supply their own account and directory, then repeat the example. Keep private sessions and credentials out of the shared files. A local checkout link works only on its author's machine; use the packaging guide when handing it to another person.

If a documented step fails, report the step, version, and error through [troubleshooting](troubleshooting.md). This helps distinguish missing guidance from a development capability that needs work.

## Contribute to Y8

Desktop builds and site maintenance are separate contributor tasks. Their GitHub references are the [desktop source guide](../../../apps/desktop-tauri/README.md), [website maintenance guide](../../product-website.md), and [product notices](../../../YOURBUDDY_NOTICES.md).
