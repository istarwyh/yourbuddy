---
description: "Scope, page changes, existing integration points, and acceptance for Y8 documentation, website navigation, and in-app Help."
---

# YourBuddy documentation, website, and in-app Help plan

English | [中文](implementation-plan.zh.md)

## Summary

This plan helps users complete work with Y8, find an appropriate extension when a specialized need arises, and develop plugins using existing DSH capabilities. The delivery consists of usage guidance, website navigation, and in-app Help. Y8 remains a customizable AI workbench.

Status: documentation, website navigation, and Help are implemented in source; see the [implementation record](verification.md) for verification. Prepared on 2026-09-06. This document retains the agreed scope; installer acceptance and public deployment are recorded separately.

## Table of Contents

- [Concrete changes](#changes)
- [Documentation: from use to extension](#docs)
- [Website: make both paths discoverable](#website)
- [Application: add Help and guides](#help)
- [DSH and Y8 responsibilities](#responsibilities)
- [Implementation order and acceptance](#acceptance)
- [Further development](#future)
- [Dev Note](#dev-note)

<a id="changes"></a>
## Concrete changes

| Location | Proposed change | User outcome |
|---|---|---|
| Product documentation | Organize basic use, default plugins, extension choices, plugin development, and the Harbor example | Understand how to start, why existing capabilities are included, and where to begin a specialized extension |
| Website | Expose “Start using” and “Extend Y8” through the existing homepage, navigation, and documentation index | Reach complete guidance from the website without first browsing the source tree |
| Y8 application | Add a “Help and guides” menu at the bottom of the sidebar | Open getting started, default plugins, development guidance, troubleshooting, and feedback while working |

This delivery excludes a plugin project manager, separate development instances, a build-watching platform, template generators, dynamic-code conversion, automated packaging and upgrades, another plugin marketplace, and a new SDK. It does not modify the DSH Agent Loop. Those tooling designs remain in the [unadopted research proposal](deferred-research.md), outside the current task and its acceptance prerequisites.

<a id="docs"></a>
## Documentation: from use to extension

Use [product documentation](../../user/product/index.md) as the prose source. Basic guidance first teaches users to complete a task; the development entry then introduces configuration, Skills, and plugins progressively, linking interface details to existing tutorials and package documentation.

### Basic use and default plugins

| Existing page | Proposed revision |
|---|---|
| [Product philosophy](../../user/product/about.md) | Explain the default composition, user-selected models and working directories, and specialized work through DSH plugins; describe sharing methods and extensions in small teams without promising cloud collaboration |
| [Getting started](../../user/product/start.md) | Retain “connect a model → choose a workspace → generate hello-yourbuddy.md → open and inspect”; add common blockers and troubleshooting links without including development or evaluation setup in first use |
| [Default plugin overview](../../user/product/plugins/index.md) and child pages | State each plugin's problem, inclusion rationale, entry point, additional prerequisites, and source; distinguish installed, configured, and usable |
| [Settings](../../user/product/settings.md) and [troubleshooting](../../user/product/troubleshooting.md) | Match actual application setting names; connect account, workspace, plugin prerequisite, and external-link issues to actionable recovery |
| [Documentation index](../../user/product/index.md) | Group entries under “Start using”, “Available capabilities”, and “Extend as needed”, each with a short purpose |

Retain the five existing external default plugins: Codex Auth for account access, Better Sidebar for inspecting files and changes, Context Doctor for context diagnosis, Plugin Marketplace for discovering and installing extensions, and Harbor Evolution for evaluation and improvement. Their pages continue to own exact versions and operations; the homepage does not maintain another version inventory.

The [Harbor page](../../user/product/plugins/harbor-evolution.md) will identify Harbor Self Evolving as an independent project developed extensively by the Y8 maintainer. Add a short development case explaining its combination of plugin, Skill, and Python Adapter, and where users inspect results, configure dependencies, and diagnose failures, based on verified project documentation. It demonstrates specialized extension possibilities; the first-plugin tutorial uses a smaller example.

### Rewrite the developer entry

Rename the [developer entry](../../user/product/develop.md) to “Extend Y8” while retaining its path. Answer users' needs before linking technical material; place desktop source builds and website maintenance in contributor links at the end.

| User question | Guidance on the page | Further reading |
|---|---|---|
| Can existing capabilities meet the need? | Check default plugins, the marketplace, and existing settings first; explain appropriate cases | Default plugin and settings pages |
| I want a repeatable way of working | Use a Skill to describe the procedure, materials, and output standard; introduce Presets/Bundles when composition is needed | Workspace guidance and verified related documentation |
| I need a new service, operation, or interface | Check whether existing MCP access or configuration is sufficient, then introduce native plugin development | [First plugin](../../user/develop/basic/index.md), [tools](../../user/develop/basic/tool.md), and [configuration](../../user/develop/basic/config.md) |
| How can AI help me develop? | Describe a small need with an acceptance example; guide Creator to query actual interfaces before editing source | Creator usage guide and development Skill |
| How do I save and share it with colleagues? | Follow existing project and packaging guidance to prepare source, configuration, dependencies, and instructions; verify separately as a recipient | [Packaging and publishing](../../user/develop/basic/publish.md) and the project README |

Provide a copyable requirement description covering the task, inputs and sources, expected output, permitted changes, required accounts/configuration, and one acceptance example. An example is “Read failed jobs from the team's build service, return failure reasons and links, and never trigger reruns; verify results with a redacted response.” This illustrates defining a need, not an integration already present in Y8.

### Connect existing development tutorials

Keep [the first-plugin page](../../user/develop/basic/index.md) as the technical tutorial source; verify and complete preparation, loading, editing, observing results, stopping, and next steps. It currently requires a prepared source checkout. State that starting point explicitly rather than describing a workflow requiring only an installed Y8 application.

Publish the existing first-plugin, tool, configuration, and packaging pages on the product site at the proposed routes `docs/develop/first-plugin`, `docs/develop/tool`, `docs/develop/config`, and `docs/develop/publish`. Reuse their Markdown instead of copying a second Y8 tutorial set. Framework, events, services, and complex UI material remain available through explicit further-reading links.

Add a short Creator usage guide, proposed at `docs/user/product/creator.md` with its Chinese pair and the site route `docs/develop/creator`. Cover appropriate needs, the actual entry point and prerequisites, describing requirements, querying current interfaces, experimenting and checking results, saving source, and further reading. Verify the entry in the target installed Y8 version first. If unavailable, state the verified DSH source-based path without adding a product runtime.

The [Creator composition](../../../packages/preset/agent-presets/presets/cordis/agent.cordis.yml) and [development Skill](../../../packages/preset/agent-presets/presets/cordis/skills/cordis-plugin-development/SKILL.md) are existing integration points. Explain the difference between temporary dynamic experiments and persistent source, linking the [dynamic tool documentation](../../../packages/extensions/tool-cordis/README.md). This delivery adds no “save as plugin project” button and does not treat a successful temporary experiment as a distributable plugin.

<a id="website"></a>
## Website: make both paths discoverable

Retain the existing OINK site and visual style, concentrating changes on information organization and links. Keep the primary homepage entry “Start with your first task”; use “Extend it for your needs” for the extension entry, linking to the developer page with a concrete explanation: use existing plugins or develop your own capabilities with DSH.

| Owner | Proposed change |
|---|---|
| [Chinese homepage data](../../user/product/home-data/zh.json) and [English data](../../user/product/home-data/en.json) | Adjust the existing secondary action and plugin-section copy to point to use and extension, without adding generic promotional cards |
| [Site configuration](../../../website/product/hugo.yaml) | Add “Extend Y8” to navigation at `docs/develop`, with matching localized labels and routes |
| [Page manifest](../../../website/product-pages.json) | Make `docs/develop` a section (`section: true`), register the Creator guide and four existing introductory tutorials, and preserve bilingual pages, anchors, and navigation |
| [Product documentation index](../../user/product/index.md) and [roadmap](../../user/product/roadmap.md) | Expose basic-use and extension paths; describe guidance, examples, and observed problems on the roadmap without committing to a development platform |

Keep prose under `docs/`; theme templates own presentation only. Readers follow basic tutorials within the product site; contributor or reference links that require GitHub identify that destination. Website pages, search results, and Markdown exports use the same prose.

Follow the [website maintenance guide](../../product-website.md) for building and publishing. Verify localized navigation and Help destinations with the actual GitHub Pages subpath; never embed the local development port in an installer. Source availability alone does not establish installer or plugin availability before publication.

<a id="help"></a>
## Application: add Help and guides

Add a persistent help entry at the bottom of the sidebar. Show “Help and guides” when expanded; use an icon with the same tooltip and accessible name when collapsed. The first version uses a short menu without adding a main workbench page or requiring a session or model connection to read help.

| Menu item | Content | Destination (relative path on the Chinese site) |
|---|---|---|
| Getting started | Model, workspace, first task | `docs/start/` |
| Default plugins | Included capabilities, reasons, and prerequisites | `plugins/` |
| Extend Y8 | Extension choices, requirements, development, and Creator tutorials | `docs/develop/` |
| Troubleshooting | Common problems and recovery | `docs/troubleshooting/` |
| Report a problem | User-authored issue description | Project GitHub Issues |

Resolve Chinese paths against the actual site base; use the corresponding `en/` paths for English. Help includes the short notice “Guides open in your browser”; the local menu does not depend on a documentation-server response. Opening a link must preserve the workbench session page. Offline or unreachable external pages have no promised offline copy. If the application's open request fails, show a message and allow copying the address without adding background connectivity probes.

### Code locations

Reuse the first-party [Personal Workbench client entry](../../../apps/desktop-tauri/product/personal-workbench/src/client/index.tsx), registering Help through the existing `sidebar.footer.action` slot. The [public sidebar types](../../../packages/client/ui-sidebar/src/client/contract/slots.ts) define the slot and expanded state; this plan needs no changes to DSH sidebar internals.

Propose `HelpMenu.tsx` for the menu and open-failure message, and `help-links.ts` for the site base and destinations, both under Personal Workbench's `src/client/`. Put copy in the existing [locale dictionary](../../../apps/desktop-tauri/product/personal-workbench/src/client/locales.ts) and reuse existing components. Update the [style file](../../../apps/desktop-tauri/product/personal-workbench/src/client/styles.ts) only for visual rules actually needed.

Reuse URL validation and `requestDesktopExternalLinkOpen` from the [desktop external-link module](../../../apps/desktop-tauri/product/personal-workbench/src/client/desktop-external-links.ts). Its current click interception targets Markdown external links, so Help must call the request explicitly instead of assuming ordinary anchors enter the desktop bridge. Retain existing source validation and HTTP(S) restrictions; add no Rust commands or authentication changes for Help.

Limit contextual help in the first version to Y8-owned settings cards: add “View usage guide” where useful, pointing to the appropriate settings section. Global Help supplies guidance for external snapshots such as the marketplace without editing every external plugin to add a link. Feedback only opens the issue page and never uploads sessions or configuration automatically.

<a id="responsibilities"></a>
## DSH and Y8 responsibilities

DSH continues to own plugin execution, public services/events/UI slots, Creator, dynamic experimentation, and native composition. Y8 owns the default selection, understandable capability descriptions, discoverable help, and verification of guides against the actual product. Professional users continue developing plugins through ordinary source projects, existing tools, and their own editors.

For Creator's development Skill, first check consistency with the tutorials and correct only actual errors or missing references. Keep Y8-specific installation guidance in product documentation rather than adding product-specific procedures to the generic DSH Skill or loading full development guidance into ordinary sessions. If a tutorial exposes missing independently obtainable dependencies or public interfaces, record the exact blocker and affected step and scope its repair separately; do not conceal it through promises in prose.

<a id="acceptance"></a>
## Implementation order and acceptance

| Order | Deliverable | Completion evidence |
|---|---|---|
| 1. Documentation | Revise product pages, rewrite the extension entry, add the Creator guide, and verify existing tutorials and Skill | A reader uninvolved in implementation can find the first step; a maintainer executes tutorials in the stated environment and records outputs, prerequisites, and failure corrections |
| 2. Website | Update homepage entries, navigation, and page mappings | Both localized paths support continuous reading; search, anchors, Markdown, and subpath links work; destinations are ready before Help uses them |
| 3. In-app Help | Register the menu, centralized links, localization, failure messages, and limited contextual help | Open every destination from actual Y8; keyboard use and collapsed navigation work; the session remains intact after opening help |
| 4. Integration and release preparation | Verify the default task remains usable; update affected guidance and release records | Record documentation checks, website checks, application acceptance, and unverified scope separately; use the existing synchronization process when publishing |

Run `pnpm run test:docs`, `pnpm run doc-sync`, and applicable `pnpm run lint` for documentation; run `pnpm run website:check` for website-input changes. Run the SDK site's corresponding checks if its mapping changes. Execution results belong in the implementation record.

Help implementation follows the [testing policy](../../testing.md): add a keyless snapshot assembled through a real runnable example for localized menus and open failure; verify valid destinations, rejected invalid URLs, and locale routing. Browser/desktop acceptance covers keyboard opening and closing, expanded and collapsed navigation, light and dark themes, external-link success and failure, and returning to the original session. A successful build does not substitute for these visible outcomes.

Acceptance does not depend on page counts, plugin counts, or a predetermined speedup percentage. Three outcomes matter: a newcomer follows the guide to complete a real task; a professional chooses an extension approach and runs a small plugin in the stated environment; an application user finds the relevant help directly. Harbor remains an advanced example and does not require every newcomer to prepare its evaluation environment.

<a id="future"></a>
## Further development

First deliver the documentation, website, and Help described here. Then add examples or interface guidance based on specific steps that block actual development. Discuss a targeted tool only for reproducible, recurring problems that guidance cannot solve; do not pre-schedule a complete plugin development platform. Team reuse first covers sharing projects, configuration, and usage instructions; collaborative product capabilities need their own scope.

<a id="dev-note"></a>
## Dev Note

This document retains the agreed implementation scope; the [decision record](../../../.agents/notes/implemented/feature/2026-09-06-yourbuddy-docs-and-help.md) owns trade-offs. The [implementation record](verification.md) states executed results and remaining verification. This task does not include product publication.
