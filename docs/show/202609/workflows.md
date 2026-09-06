# Typical workflows

English | [中文](workflows.zh.md)

These task paths can become website tutorials. Complete [First use](quickstart.md) beforehand. Example prompts below are demonstration inputs rather than records of successful execution. [Default plugins](plugins.md) owns capability descriptions and limits.

## Organize research: from files to an inspectable summary

Prepare a practice directory containing only shareable text or Markdown and select it as the workspace. Example request: “Read the product research in this directory and create summary.md. Distinguish source facts, your assessments, and unresolved questions, and identify the source files.”

Inspect citations in the conversation and compare sources with the output through Better Sidebar. Explicitly request search when new material is needed, and check its sources. Neither search results nor local documents automatically establish a correct conclusion.

Completion means the summary exists, key assessments have sources, and unverified points are identified. Show source material, the summary, and citation locations on the website. Do not add unverified PDF or Office batch-processing claims to this tutorial.

## Development: from a problem to differences and verification

Prepare a small runnable practice repository and describe the problem, expected behavior, and an executable verification method. Example request: “Fix this input issue in the current project. Inspect the relevant code first, run the existing focused checks after editing, and explain what you actually verified.”

Inspect changes and command results through Better Sidebar. Independent tasks can be delegated to Codex Subagent with a complete task description; it does not automatically inherit all parent-session context. Tasks requiring user input or additional permissions may not complete as unattended subtasks.

Completion means the changes fit the request, check results are readable, and failures and unverified areas are reported. Git commits, remote pushes, and deployment are separate actions whose timing the tutorial must make explicit.

## Context diagnosis: observe before trimming

Choose a session with accumulated project instructions or skills. Example request: “Call context_audit and identify duplicate or shadowed context sources. First recommend what to retain or trim, without editing files.”

Inspect the Context Doctor report, checking paths, identical paragraphs, and skill precedence before choosing a concrete change. Audit again to observe estimate changes, then execute a representative task to check that necessary behavior remains intact.

Completion means each edit has a source and a purpose assessment rather than merely a smaller Token count. Report reduced audit estimates separately from improved model quality.

## Evaluation cold start: learn from completed sessions

In a directory with recent completed business sessions, invoke the Harbor Skill and explain: “I do not have a dataset yet. Help me find improvement opportunities in recent tasks.”

Preview up to ten eligible historical sessions first. Inspect the scope, evaluator, expected requests, and evidence-storage description before confirming execution. Read individual evidence, abstention reasons, and coverage, then identify failures worth retaining.

Completion means an interpretable historical diagnosis rather than a promotable Candidate. Historical records do not regenerate answers and cannot establish that a modified Agent improved. Without usable records, complete business tasks or provide an explicit Query / Dataset.

## Controlled improvement: fix a baseline, then change one factor

Provide explicit tasks, an Agent entry point, scoring criteria, and an optimizer. After confirmation, let the Skill initialize evaluation and check the required environment. Bind a DSH Candidate's model, establish a valid baseline, and select one evidence-backed improvement hypothesis.

Make one controlled change and run regression under comparable conditions. Inspect per-task results, population coverage, regressions, and validity. Formal promotion additionally requires an accepted policy. If the model or evaluator identity changes, establish a new baseline as directed by the tools instead of comparing incompatible results.

Completion means a conclusion supported by comparable evidence, with known regressions and unverified areas. Business deployment remains with existing CI/CD or an explicit deployment operation. Harbor does not publish the application or automatically establish evaluator reliability.

## Demonstration materials

Prioritize two short demonstrations for the first website: first output and historical session diagnosis, covering everyday work and quality improvement. Use the current YourBuddy installer, practice data, and real visible controls. Record version, prerequisites, and actual verification scope for each. Store full release acceptance evidence in [release records](../../releases/README.md) rather than filling promotional pages with internal logs.
