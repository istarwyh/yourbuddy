# Documentation map

English | [中文](README.zh.md)

## Summary

Choose the path that matches your task. Product guidance, Harness usage, extension tutorials, architecture, package contracts, generated references, and historical records have separate owners; this page links those owners without repeating their content.

## Table of Contents

- [Use YourBuddy](#use-yourbuddy)
- [Use DeepSeek Harness](#use-deepseek-harness)
- [Develop extensions](#develop-extensions)
- [Maintain the repository](#maintain-the-repository)
- [Understand the architecture](#understand-the-architecture)
- [Look up generated references](#look-up-generated-references)
- [Documentation ownership](#documentation-ownership)
- [Dev Note](#dev-note)

-----

<a id="use-yourbuddy"></a>
## Use YourBuddy

Start with the [YourBuddy product guide](user/product/index.md) for installation, models, workspaces, settings, bundled plugins, evaluation, and troubleshooting.

<a id="use-deepseek-harness"></a>
## Use DeepSeek Harness

Start with the [Web UI guide](user/guide/index.md). Continue to [provider configuration](user/guide/providers.md), the [Python SDK](user/guide/python-sdk.md), or the [`dsh` launcher reference](../apps/cli/README.md) for another application profile.

<a id="develop-extensions"></a>
## Develop extensions

Follow the [extension basics](user/develop/basic/index.md) for configuration and first-package tutorials. Use the [framework guides](user/develop/framework/index.md) for Cordis services and events, then the [extension cookbook](cookbook/extension-cookbook.md) for repository-maintainer procedures.

<a id="maintain-the-repository"></a>
## Maintain the repository

Use [development.md](development.md) for setup and daily workflow, [testing.md](testing.md) for evidence selection, and the root [AGENTS.md](../AGENTS.md) plus subtree instructions for standing implementation rules. Package groups and their owners are indexed in [`packages/README.md`](../packages/README.md).

<a id="understand-the-architecture"></a>
## Understand the architecture

Read [architecture.md](architecture.md) for the ordered runtime map, then open the relevant [subsystem reference](subsystems/README.md) for types and service semantics. The [graph atlas](graph-atlas.md) links dependency, composition, event, lifecycle, and tool-flow diagrams.

<a id="look-up-generated-references"></a>
## Look up generated references

Generated lookup pages include the [module graph](module-graph.md), [configuration catalog](config-catalog.md), [tool catalog](tool-catalog.md), [persistence catalog](persistence-catalog.md), and [Cordis API](cordis-api/context.md). Their source comments name the owning generator and regeneration command.

<a id="documentation-ownership"></a>
## Documentation ownership

Current product and task guidance lives under `user/`; cross-package behavior under `architecture.md` and `subsystems/`; per-package configuration and limitations in package READMEs; procedures under `cookbook/`; decisions in Agent Notes; incidents under `postmortem/`; release evidence under `releases/`. The [documentation standard](AGENTS.md) defines the complete placement rules.

<a id="dev-note"></a>
## Dev Note

None.
