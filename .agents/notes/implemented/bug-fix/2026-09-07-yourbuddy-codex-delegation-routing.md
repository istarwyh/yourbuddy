# Agent Note: YourBuddy Codex delegation routing

Status: implemented

English | [中文](2026-09-07-yourbuddy-codex-delegation-routing.zh.md)

## Problem

The YourBuddy Codex Agent Preset exposes the native `subagent_codex` tool, whose provider starts the bundled package-local Codex runtime and creates a tracked child session. A user-level `codexhost-delegation` skill can also advertise generic Codex delegation. When both were visible to the model, a delegation request could match the skill first. Its instructions then asked the model to run the unrelated `codexhost` executable, which is not part of the YourBuddy application, so the request failed with exit code 127 without ever calling `subagent_codex`.

The product bundle and provider were present. The failure was an ambiguous model-routing surface created by composing an application-owned tool with an independently installed global skill for the same intent.

## Decision

`@deepseek-ai/dsh-tool-skill` accepts `modelExcludedSkills`, a validated list of exact skill names reserved from autonomous model routing. Reserved skills are absent from the durable model catalog and rejected by the model-facing `skill` loader before provider content is loaded. The user-explicit `/name` path remains independent: a reserved skill is still injected when the user names it directly and its own policy permits user invocation.

The YourBuddy desktop overlay reserves `codexhost-delegation`. Generic delegation in the Codex Preset therefore has one model-visible route, `subagent_codex`, while `/codexhost-delegation` remains an intentional opt-in to the user's external integration. A changed catalog digest replaces any earlier session catalog at the next request boundary, so existing sessions do not retain the conflicting automatic route.

## Verification

The package regression registers both a reserved `codexhost-delegation` skill and an ordinary skill. It proves the reserved name and description are absent from the model catalog, a direct model tool load fails without disclosing the skill body, the ordinary skill remains visible, and an explicit user `/codexhost-delegation` message still injects the reserved instructions. Separate cases require malformed and repeated exclusion names to fail during plugin load. A keyless assembled expected-output snapshot boots the shipped base application with an installed `dsh-badge` skill, then fixes the model-visible result when deployment configuration reserves that skill: provider discovery still finds it, the catalog is empty, and the model loader returns the policy error.

Desktop Rust and JavaScript tests require both the installed overlay and the assembled release-smoke overlay to contain the same exclusion. Release preparation boots the complete product with that overlay and the bundled native Codex provider. Evidence from the reported installed session was used only to identify the competing routes; its private paths, conversation content, and session archive are not copied into the repository.

## Alternatives considered

**Remove or rewrite the user-level skill.** The skill is installed outside YourBuddy and may be valid for another environment. Product startup must not mutate user-owned agent configuration to resolve an application composition conflict.

**Bundle a `codexhost` executable.** This would make the unintended path start, but it would still bypass the preset's native provider and tracked child-session lifecycle. It also adds a second Codex integration instead of removing the ambiguous route.

**Tell the model to prefer `subagent_codex`.** A prompt preference leaves both competing actions available and depends on model selection behavior. The model-facing catalog and loader must expose only the route the product can support for autonomous delegation.

## Consequences

Deployments can resolve intent collisions without modifying or deleting a user-owned skill and without changing that skill's global metadata. The configuration is name-exact and fails on invalid or duplicate entries. It does not decide which application tool is authoritative; each deployment must pair an exclusion with a documented model-facing route and test both the blocked automatic path and preserved explicit path.

YourBuddy's release notes and desktop documentation must describe the native Codex delegation route and the explicit external opt-in together. A product release that changes either the preset, the native tool name, or this exclusion must rerun the skill-routing regression and assembled product smoke.
