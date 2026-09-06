---
description: "Unadopted research on a Y8 plugin development platform, outside the current documentation, website, and Help delivery."
---

# YourBuddy plugin development platform research (unadopted)

English | [中文](deferred-research.zh.md)

This plan helps Y8 product maintainers, plugin authors, and pilot teams organize experiments. It evaluates two complete journeys: users connect a model and accomplish work immediately; when specialized needs arise, users build a plugin with documentation, a development assistant, and local tools, then hand it to another member.

Status: unadopted; no execution or recruitment. Retained as research, not as the current task, available functionality, or a release commitment. All participant counts, timings, and success rates are unverified targets.

The current task follows the [documentation, website, and in-app Help plan](implementation-plan.md). Development instances, templates, converters, and participant studies below are outside this delivery and its acceptance requirements.

## Table of contents

- [Product goals and scope](#scope)
- [Existing foundations and evidence limits](#baseline)
- [Product design to evaluate](#design)
- [Study organization and measurement](#method)
- [Four experiments](#experiments)
- [Delivery sequence and decisions](#delivery)
- [Records and subsequent ownership](#records)

<a id="scope"></a>
## Product goals and scope

Y8 serves users who need a reliable default experience and are willing to develop extensions for specialized needs. The first study focuses on plugin maintainers and plugin consumers in small teams. First-time users need not understand Cordis, Profiles, Presets, or Harbor evaluation concepts; developers can access source, configuration, and the full extension APIs.

DSH supplies customization depth, community plugins supply reusable capabilities, and Y8 owns default composition, development guidance, integration, and delivery experience. Plugin count is not a success metric, and directory inclusion does not establish compatibility. Team sharing first evaluates reuse of plugins and working methods; simultaneous collaborative editing, cloud team permissions, a public marketplace, and additional platform support are outside the initial scope.

Harbor Self Evolving is an independent project developed extensively by the Y8 maintainer and is the complex-project sample for this plan. Small tools, UI plugins, and Harbor all participate so that Python, containers, and evaluation workflows do not become prerequisites for every plugin.

<a id="baseline"></a>
## Existing foundations and evidence limits

The following entry points were checked against repository files when preparing this plan, at source revision f0ac7f6a4f15a5c20f3463430e4f336a3865a0f0. Source and documentation identify reuse candidates; this preparation did not verify the complete development journey in an installer. Each study run must freeze its actual installer, bundled DSH, and plugin versions separately; this table does not substitute for execution evidence.

| Subject checked | Existing basis | Evidence the experiment must add |
|---|---|---|
| Default experience | [Model connection](../../user/product/models.md), [workspaces](../../user/product/workspace.md), and [default plugins](../../user/product/plugins/index.md) | A new user completes and inspects a real artifact, distinguishing installed from ready |
| Native extensions | [Architecture](../../architecture.md) and [plugin settings cards](../../cookbook/adding-a-settings-card.md) | An independent project contributes tools, settings, and UI through public APIs |
| Development assistant | [Creator composition](../../../packages/preset/agent-presets/presets/cordis/agent.cordis.yml) and [plugin development Skill](../../../packages/preset/agent-presets/presets/cordis/skills/cordis-plugin-development/SKILL.md) | Actual runtime API inspection guides implementation and reduces errors |
| Dynamic experiments | [Dynamic plugin tools](../../../packages/extensions/tool-cordis/README.md) | Conversion from a temporary definition to an installable project, followed by fresh validation; an in-memory definition is not a persistent plugin |
| Local integration | [Client modules and development reload](../../subsystems/client-modules.md) | Host, Client, and build feedback form a usable journey in a separate development instance |
| Distribution | [Packaging and installation](../../user/develop/basic/publish.md) | A recipient installs, configures, and verifies restart using the same built artifact |
| Complex project | [Harbor integration](../../user/product/plugins/harbor-evolution.md) | A real change completes cross-component integration and task comparison |

Dynamic definition, diagnostics, and version management are checked against current package documentation and source; restart behavior of in-memory experiments, UI activation, and regular package installation receive separate acceptance checks. Development reload does not establish uninterrupted replacement for arbitrary plugins, and a separate development instance is not automatically a security sandbox for untrusted code.

<a id="design"></a>
## Product design to evaluate

This section defines the experiences and constraints for experimental prototypes. Prototypes use existing DSH APIs; experiment results determine final component ownership.

### Default use

First use covers only necessary model connection, workspace selection, and one real task. The home page presents tasks and outcomes; missing accounts or environments produce specific setup actions. Specialized capabilities such as Harbor receive task-driven guidance without placing every dependency in the basic journey.

### Defining a plugin

The extension entry offers “Find an existing plugin,” “Create a plugin,” and “Import a plugin project.” The development assistant inspects existing capabilities before recommending configuration, a Skill, Preset, Bundle, MCP, or a native Host/Client plugin. This classification selects an implementation; it does not require the user to learn every term first.

The assistant derives a short specification from the request, existing project, and runtime: user entry, inputs and outputs, dependencies and configuration, scope of effect, and acceptance examples. Only user intent and choices that cannot be inferred require questions. Changes to an existing plugin identify its original project and target version instead of generating a similar project that loses the maintenance relationship.

### Documentation and development assistant

Provide runnable templates for tools, UI, and Host + Client plugins, plus guides covering creation, configuration, debugging, and packaging. Tutorials, templates, and the development Skill share version-matched APIs and examples; the assistant reads available runtime services, events, tools, and slots before generating code. Unsupported interfaces produce an explicit explanation rather than guesses about internal methods.

Templates retain ordinary local source, type dependencies, configuration guidance, a build entry, and acceptance examples. External editors and AI edit the same project, and Git records the same changes. The target prerequisite for ordinary plugin development is an installed Y8 plus plugin development dependencies, without building the entire DSH repository or desktop shell; E2 must establish this experience.

### Local development

The Y8 prototype starts a separate development process from the selected project with its own Harness home, Profile, and test directory; it copies only explicitly selected non-sensitive configuration. Service authority and file access still need separate restrictions; changing directories is not security isolation.

The development view presents project and DSH versions, build results, Host status, Client loading and rendering outcomes, dependencies, and error sources together. Reloadable changes use existing development mechanisms; changes needing a build or restart receive explicit guidance and display the effective version. Stopping a plugin verifies registration and resource cleanup; it does not automatically undo files already written or external effects.

Ordinary Y8 features should use public extension APIs available to third parties. A missing API first needs an owner and consumer before a new extension point is selected. The prototype does not introduce implicit privileged interfaces for Y8 plugins, another plugin language or package format, or a complete IDE.

### From experiment to delivery

Temporary experiments use the existing dynamic tools; maintained projects use native DSH packages and Bundles. “Save as plugin project” covers explicitly supported templates only, generating entries, dependencies, and build configuration while adapting execution differences. A dynamic JavaScript function body is not directly a TypeScript/JSX project; unsupported conversions explain why and preserve source for further development.

Distribution carries built artifacts, compatible versions, configuration requirements, and acceptance examples, excluding private sessions, secrets, author-specific absolute paths, and entire Harness homes. Recipients bind their own accounts and directories. The first study verifies delivery with local installation packages; public publication is not a prerequisite.

<a id="method"></a>
## Study organization and measurement

Recruit six professional users from three small teams, including at least three unfamiliar with DSH plugin development; each team includes a maintainer and a consumer. The Harbor author and one non-author collaborator provide separate complex-project observations and do not enter novice success rates. Recruitment has not started; smaller samples report observed counts without population-level extrapolation.

Each round freezes installer checksum, DSH/plugin versions, OS and architecture, model configuration, input materials, acceptance criteria, and documentation version. The first round covers only one platform officially supported by the selected installer; other platforms remain unverified. Prototype and control use the same model and comparable input difficulty; external service failures receive separate causes while remaining in end-to-end failure records.

Compare three conditions: A is the frozen current product and documentation; B adds only guides, templates, and the development Skill; C adds development entry points, a separate instance, and diagnostics to B. Freeze A and rehearse baseline materials before preparing B and C; participant comparisons start once their conditions are available. Use comparable development-task variants and counterbalance order; report remaining learning effects separately rather than attributing familiarity to the prototype.

Elapsed time runs from task start to acceptance. Active time additionally subtracts recorded download, login, and remote waits. Independent completion permits the condition's documentation and AI but no live maintainer guidance; assisted tasks can finish without counting as independent successes. Also record assistance, incorrect API references, build failures, restarts, model requests, and cost availability. Tasks unfinished at the time limit fail; unmeasurable cost is unknown. Targets below determine further investment in the first study, not public performance promises or statistical significance.

<a id="experiments"></a>
## Four experiments

Each experiment freezes its task and acceptance materials before execution, recording, and a continue, revise, or stop decision. Unexecuted items remain not run.

### E0: Default experience

Hypothesis: users can accomplish basic work without developing plugins or understanding the extension architecture. Install the selected release, connect an available model, select a practice directory, turn provided materials into a report, and inspect it; restart and find the artifact and session again. Materials contain an explicit fact checklist, with acceptance covering factual coverage, traceable sources, and file location.

Target: at least five of six users finish independently, with median active time among completers at most fifteen minutes and a forty-five-minute elapsed limit per user. Observe installation, account, workspace, and artifact-inspection obstacles separately. A negative case with missing model configuration must identify what is missing and its setup entry, not present the capability as ready.

If two or more users cannot finish independently, address E0 obstacles before evaluating additional development features; new developer capabilities cannot conceal regressions in the basic journey.

### E1: Documentation and guidance

Hypothesis: verified tutorials, templates, and a runtime-aware development assistant reduce first-plugin effort. Six participants complete comparable read-only tool tasks, such as reading structured materials and returning a summary, under A and B with equivalent inputs, model, and acceptance difficulty.

Target: at least five participants under B independently complete tool registration, a real invocation, and result inspection within forty-five active minutes and a ninety-minute elapsed limit per attempt; median paired active time decreases by at least 25% against A. Pairs unfinished in A or B do not contribute time savings but remain in completion rates; fewer than four comparable pairs cannot establish a speed improvement.

Additional cases cover a request already served by a Skill or configuration and a request naming a nonexistent API. The assistant explains the smaller implementation and the missing API respectively, without inventing methods. Record where participants read documentation, edit code, and request help to separate documentation problems from tool problems.

### E2: Local development and continued modification

Hypothesis: independent project integration and consolidated diagnostics shorten edit, observe, and repair cycles. Compare B and C using a small tool, a configurable UI plugin, and a Host + Client plugin. Select one bounded real Harbor change for separate author and non-author records rather than pooling it with introductory tasks.

Target: all three template types support creation or import, build, trial, modification, and stopping without building the entire Y8/DSH repository. For a small Client template supporting reload, record at least ten effective edits after warm-up, with median save-to-visible-effect time at most fifteen seconds; changes requiring restart are reported separately.

Negative cases include a missing service dependency, invalid configuration, a Client render error, and a failed version update. The UI must distinguish failure stage, target version, and currently effective version; verify again after repair or return to a verified version. Real calls and visible UI establish cleanup of tools, listeners, and views after stopping, rather than checking a status label alone.

Harbor evaluates cross-component integration and installation dependencies; changes affecting Agent outcomes additionally use fixed tasks, model, and evaluator identity for comparison. Harbor evaluation does not replace type checking, builds, UI tests, or lifecycle tests; its product documentation owns detailed usage limits.

### E3: Saving, sharing, and maintenance

Hypothesis: an experiment or local project can become a plugin that a recipient uses independently. Save a supported dynamic tool and UI experiment as projects and package one existing project; give the three artifacts to non-authors for clean-environment acceptance, involving at least two recipients.

Target: all three artifacts complete installation, configuration, invocation or UI inspection, use after restart, version update, and restoration of a verified version. Recipients do not need the author's repository, directory layout, or credentials. Retain a checksum for every artifact so recipients use the same build output that passed verification.

Negative cases cover unsupported experiment conversion, a missing built entry, an incompatible version, and a missing account. The first two prevent a deliverable conclusion; the latter two explain exact prerequisites and preserve any existing usable version. Remove test credentials and inspect artifacts for sensitive information; this check is not a security certification of plugin code.

<a id="delivery"></a>
## Delivery sequence and decisions

Implement prototypes incrementally as below, expanding only when prerequisite evidence supports doing so. Select concrete packages and files during implementation; proposed button or operation names are not existing commands.

| Phase | Minimum delivery | Condition for advancing |
|---|---|---|
| Baseline preparation | Freeze participants, materials, versions, and record template; run A and E0 | Basic obstacles are classified and E0 passes, including a post-fix rerun if needed |
| Development guidance | Three runnable template types, task-based tutorials, and a version-matched development Skill | E1 supports further investment; reduce C if guidance already suffices |
| Development tools | Project import, separate development instance, diagnostics, and explicit reload/restart feedback | E2 produces separate results for small projects and Harbor |
| Team delivery | Bounded experiment-to-project conversion, packaging, recipient installation, and upgrade checks | E3 completes without regressing E0 |

Documentation/template maintainers own guidance and examples; desktop maintainers own development instances and installation; plugin authors own sample changes; non-authors perform recipient acceptance; the study recorder owns timing and conclusions. Assign these roles to people before each round; the proposal itself is not a schedule or staffing commitment.

Implementation selects checks for changed behavior under the [testing policy](../../testing.md); user- or model-visible changes add corresponding real runnable examples and snapshots. Template checks cover valid projects and an invalid project rejected by the executed top-level check. Installation verification consumes packaged artifacts so workspace dependencies cannot hide omissions.

If E1 shows no benefit, inspect request classification, API accuracy, and tutorials first. If E2 time is dominated by external environments, improve environment diagnosis first. If E3 fails, pause expansion of templates and distribution. Data exposure, unintended changes to the daily instance, or an unrecoverable update stop that prototype until the impact is recorded, repaired, and rechecked.

<a id="records"></a>
## Records and subsequent ownership

Copy the [run record template](run-record.md) for each run, recording actual timings, inputs, artifacts, failures, and assistance under anonymous participant identifiers. Keep raw evidence local; redact and check authorization before sharing or committing it, excluding accounts, secrets, original customer materials, and unapproved sessions.

This page retains unexecuted experimental design; its proposal records [why it was not adopted](../../../.agents/notes/rejected/feature/2026-09-06-yourbuddy-plugin-development-experiments.md). The [implementation plan](implementation-plan.md) owns current documentation, website, and Help work and acceptance; [release records](../../releases/README.md) establish publication status.

## Dev Note

Open items: participants, initial installer, model connection path, exact Harbor change, template instances, and execution dates. Freeze platform, cost, network, and documentation version before the first run. This document contains no execution results and cannot establish delivery of the plugin development experience.
