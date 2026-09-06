---
description: "September implementation entry for Y8 documentation, website, and in-app Help, with the status of unadopted research."
---

# YourBuddy usage and extension guidance plan

English | [中文](README.zh.md)

The current task has one goal: users can first complete work with Y8, then find or develop a plugin when they need specialized capabilities. Y8 provides the default experience and guidance; DSH provides extension mechanisms.

## Current plan

Read the [documentation, website, and in-app Help plan](implementation-plan.md) for specific page changes, application entry points, code locations, existing capabilities to reuse, and acceptance.

| Area | Deliverable |
|---|---|
| Documentation | Basic use, default plugins and their reasons, extension choices, existing development tutorials, a Creator guide, and the Harbor example |
| Website | Connect “Start using” and “Extend Y8” within the existing visual style and publish continuously readable guidance |
| In-app Help | A sidebar “Help and guides” menu leading to getting started, default plugins, extension, troubleshooting, and feedback |

Status: documentation, website navigation, and in-app Help are implemented. See the [implementation record](verification.md) for executed checks and unverified scope. The [decision record](../../../.agents/notes/implemented/feature/2026-09-06-yourbuddy-docs-and-help.md) owns trade-offs; source implementation does not establish installer publication or website deployment.

## Unadopted research

The [plugin development platform research](deferred-research.md) retains the broader experimental design; its [record template](run-record.md) retains unexecuted evidence fields. Neither is current implementation scope, an automatic future commitment, or a prerequisite for delivering documentation, the website, and Help.

Separate development instances, project management, template generation, automatic conversion, and packaging tools require evidence of specific usage problems before reconsideration. The [old proposal's verdict](../../../.agents/notes/rejected/feature/2026-09-06-yourbuddy-plugin-development-experiments.md) explains why that research is rejected as the current implementation task.
