# dsh-harbor-evolution

[English](README.md) | 中文

这是一个可安装的 DeepSeek Harness 插件与 Skill，用于执行稳定的 Harbor 评测和受控的 Agent 演进循环，并提供原生 DSH Web 工作台。

该包为 DSH 提供 19 个严格的 Harbor 工具、专用 Tool Card、以对象为起点的 Evaluation Workbench、同 Session Copilot Dock、安装 Doctor，以及可由模型和用户调用的 `evolve-agent-with-harbor` Skill。Skill 从四个面向用户的概念开始：Dataset（测什么）、Generator（谁来回答）、Evaluator 及评测标准（什么算好），以及 Optimizer（谁来改进）；随后把已确认的选择编译为严格的 Evaluation Stack。没有提供 Dataset 时，它也可以预览近期已完成的 DSH Session，再把每个不可变 Session 作为一个 Historical Trial 进行评测，而不重新运行 Candidate。DSH Generator 可以显式固定当前默认模型，作为不含密钥的 Candidate 身份，同时保留每个 Job 的 Host Broker 凭据边界。插件会验证 Dataset 身份、检查 Trial Lifecycle 与 Score Validity、管理独立的 Ground Truth 元评测、诊断证据来源，把每次迭代限制为一个受控 Candidate 变更，并且只在明确操作中调用 Promotion Gate。

## 安装

要求 Docker、Node.js 22+、pnpm 和 [uv](https://docs.astral.sh/uv/)。在业务 Agent 工作区执行：

```bash
npx --yes dsh-harbor-evolution@latest setup --project-root "$PWD"
```

Setup 命令会安装两个必需的运行时：

- 在托管的 Python 环境中安装 `harbor-dsh-evolution==0.9.2`。
- 在所选 DSH Profile 中安装 `dsh-harbor-evolution@0.9.2`。

随后，它会把 Harbor 可执行文件的绝对路径与一个回退 `projectRoot` 写入 Profile 的 `harbor-evolution` 配置块，并验证集成。Agent Tool 每次调用都会以调用 Session 的绝对工作目录作为项目根目录；配置值仍供 Web Workbench 和非 Agent 场景回退使用。无关的现有 Profile 条目会被保留；重复执行 Setup 只会更新同一个配置块。

Setup 成功要求 `harbor plugins list` 同时发现用于 Candidate Job 的 `dsh-evolution`，以及用于观测已有 Session Job 的 `dsh-historical-evaluation`。

默认 Profile 是 `web`。只有实际运行该 Profile 时才使用 `--profile headless`。通过以下命令查看全部选项：

```bash
npx --yes dsh-harbor-evolution@latest setup --help
```

停止所有旧 DSH 进程，并执行 Setup 输出的精确重启命令。然后调用：

```text
/evolve-agent-with-harbor
Inspect this workspace and help me clarify and initialize a stable Harbor self-evolution loop.
```

用户可以提供一条 Query 或 Dataset 路径、Generator curl 或本地 Agent 路径、Evaluator curl／路径或自然语言评测标准，以及 Codex 或 Claude Code 等可选 Optimizer。Skill 会先检查工作区，默认使用当前 Agent 作为 Optimizer，并在写入文件前展示一张确认卡。Evaluation Stack 角色、id、版本、Judge 配置、Contract 和 Policy 保留在高级配置中，除非它们会实质影响决策。

插件注册：

- `harbor_candidate_snapshot`
- `harbor_model_binding`
- `harbor_evolution_init`
- `harbor_evolution_doctor`
- `harbor_quick_diagnostic_init`
- `harbor_session_diagnostic_preview`
- `harbor_session_diagnostic_run`
- `harbor_dataset_validate`
- `harbor_context_preview`（在返回预览前，经过一次性批准刷新 `candidate-manifest.json`）
- `harbor_eval_run`
- `harbor_eval_result`
- `harbor_resolve_page_context`
- `harbor_get_evidence`
- `harbor_propose_action`（只提供提案；绝不确认或执行变更）
- `harbor_evaluator_inspect`
- `harbor_evaluator_update`
- `harbor_ground_truth_init`
- `harbor_evaluator_meta_evaluate`
- `harbor_candidate_compare`

在 `web` Profile 中，同一个包还会注册：

- 本地化且以对象为起点的 Workbench（Summary、Trials、Pipeline、Optimization、Compare/Gate、Evaluator/Rubric、Artifacts、Audit），直接展示固定的实验身份、Agent 可见的 Dataset 查询与指令、安全的业务产物预览、Ground Truth 元评测、分页的逐 Trial 证据与建议、Population 有效性与覆盖率、受控优化假设，以及 Baseline/Gate 差异；原始 JSON 保留在审计抽屉中；
- Composer Context Capsule：只有用户明确执行 `Ask AI`／`Ask about this` 操作或选择 `@harbor` 后，才会冻结 Job、Trial、Criterion 或 Evidence 选择；普通发送绝不继承当前可见的 Harbor 页面，一次性引用会在该 Turn 发送后清除；
- 同 Session Harbor Copilot Dock：无需复制对话历史，即可渲染真实 Chat Session 的运行状态、Tool 进度、最终回答、失败与 Stop 操作；仅当对象、页面 Session 与 Generation 前提仍然匹配时，类型化 `harbor.navigate` 结果才会执行允许列表中的只读 Harbor 位置变更，Back 则恢复此前的 Workspace、页面、阶段、Trial 筛选／排序／焦点、Compare Baseline 与滚动位置；
- 一等的 `Evaluate recent Sessions` 操作：预览最多 10 条安全 Session 记录，显示冻结的 Evaluator/Judge 与诊断边界，要求显式确认，在后台运行，并打开已完成 Job；
- 通过 Descriptor 授权编辑 `script` 与 `llm-as-judge` 实现的 Evaluator/Rubric 源码，使用乐观并发控制并强制采用新身份；
- 由确定性脚本与 LLM-as-Judge 实现共享的 `harbor-dsh-evaluator/v1` 接口；
- 所有 Harbor Tool 调用的紧凑结果卡片；
- 显式本地对象选择和冻结的 Trial 集合选择器（固定 ID／Revision 或 Query Snapshot，最多包含 1000 个成员）、可以独立移除的 Context Chip，以及针对源码片段的 Ask 操作；
- AI 提案卡片，包含确定性的 Preflight、显式审阅、幂等确认与仅追加的本地操作日志；Candidate、Gate 与交接输出是已保存的草稿，不是已应用的资源变更。Evaluator 源码提案可以在经过检查的版本编辑器中打开。选定的 Compare 只执行读取；
- `Harbor Evolution` 设置区：检查已配置的项目、Evaluation Stack、Jobs 目录与 CLI 路径，支持进程内重新加载 `projectRoot`，并从 npm 检查新的正式版本，但不会静默安装。

### 从对象开始，而不是从命令开始

1. 打开一项评测结果。选择 Task、Score、Evidence Item 或已保存的 Source Fragment。
2. 选择 **Ask AI** 或建议问题。Harbor 会在现有 Composer 中准备一条可见引用；检查它，补充问题，然后发送。
3. 在同一个 Session 中继续对话。Copilot 会显示普通的后续问题与近期讨论历史。普通回答不会继承旧回答的证据有效性标记。需要新证据或修改时，请重新附加原始对象。
4. 对于评分规则，请选择已保存的行，然后选择 **Suggest a change**。**Review and edit** 会直接打开匹配的文件。AI 可以填充尚未修改的编辑器，但绝不会覆盖你的手工修改。检查 Diff 并显式保存，以创建新身份；该操作不会运行评测或 Gate。

未保存的源码修改按 Session、Workspace、Job 与文件隔离，并保留在当前浏览器 Tab 的 `sessionStorage` 中。切换文件或视图以及刷新页面后可以恢复修改；关闭 Tab 可能丢弃修改。存储失败会明确显示，同时使用内存回退，并针对尚未持久化的修改显示离开页面警告。源码冲突会保留原始 Base 与编辑文本；接受新 Base 前，请检查最新源码。保存或显式丢弃只会清除当前文件的草稿。授权到期绝不会删除建议文本或人工修改；源码发生变化或 Task 子集过期时，需要显式重新选择，不能自动扩大范围。

完整 AI Workbench PRD **尚未**全部实现。当前，受限的诊断与重试操作在没有注册 Runner 时会快速失败；长时间运行操作、可回放 Event/Outbox 以及完整的 Phase 1 审计身份仍待实现。消息范围内的自动 Context 与跨视图打开需要公开 DSH Contract；生产 RBAC、批准与发布仍属于后续阶段。实际旅程证据与其余验收工作见仓库的 `docs/ai-workbench-acceptance.md`。

Web UI 只通过三条范围明确且显式的工作流写入：由 Descriptor 授权的 Evaluator 源码更新、已确认的 Historical Session Launcher，以及已确认的本地草稿／操作日志。Launcher 遵循 `Preview → confirm → background run → open Job`；其私有 Selection Token 绝不会进入浏览器状态。只有用户显式绑定对象并发送消息后，AI 原生问题才会调用同一个 Chat Session。刷新页面、普通发送、普通读取与切换 Workspace 绝不会自动附加 Harbor Context、自动发送 Prompt，也不会启动 Agent 或 Job。Candidate 评测、Gate、Promotion、Deployment、Publishing 和每项生产变更仍然属于显式 Agent + Skill 工作流；Agent 请求的每项 Harbor 写入或评测工具都必须经过 DSH 可审计的一次性用户批准。如果没有可用的批准通道，调用会快速失败。

直接评测需要 `candidatePath`、`datasetPath`、`stackPath` 和显式 `mode`；`promotion-eligible` 还需要 `policyPath`。应优先使用 Skill，因为在重要身份与评测 Contract 尚未确定时，它不会运行或比较 Job。

## Historical Session 冷启动

用户未提供 Dataset 时，最简单的入口是 Harbor Tab 中的 `Evaluate recent Sessions` 按钮。它会预览最多 10 个近期已完成的业务 Session，只显示安全 Metadata，以及 Evaluator、Judge、同模型耦合、预计请求数、过期时间和本地保留边界；在用户确认前不会启动任何操作。Host 把短期 Selection Token 保留在内存中；浏览器只会收到不透明的 Preview id。内置 Skill 仍是对话入口，并在 Agent 的准确工作目录中使用同一组 Preview/Run Service。

用户明确确认后，`harbor_session_diagnostic_run` 只接收 `selectionToken` 与可选 Job 名称。它会重新验证冻结的 Session 与 Feedback Digest，物化不可变 Historical Batch 以及配套 Dataset 和 Stack，并把每个 Session Observation 作为一个 Harbor Trial 进行评测。该 Job 不会重新运行 Candidate，不能进入 Promotion Gate，并把 Evaluator Meta-Evaluation 记录为 `not-run`，因为 Evaluator 可靠性需要另行执行独立的 Ground Truth 工作流。

缺少必要证据时，Historical Trial 可以以 `completed-unscored` 结束。这是 Evaluator 的正常弃权，不是零分或基础设施失败；应结合 Trial 与 Criterion 覆盖率解释结果。

## Candidate 模型绑定

每个 Job 开始前，插件会对当前 DSH Agent 选择创建 Snapshot，其中包含 Provider、Model 与 Reasoning Effort；随后启动每个 Job 独立的本地 Model Broker。Candidate 通过 `dsh-host-broker`／`dsh-host-model-gateway/v1` 使用临时 `dsh-host` Adapter；它只会收到短期 Job Capability 文件，绝不会收到 GPT Auth、Codex OAuth 或上游 API Key。

`harbor_eval_run`、`harbor_context_preview` 与 `harbor_evolution_doctor` 默认继承该选择。高级调用方只能同时覆盖 `candidateProvider` 与 `candidateModel`，还可以提供可选 `candidateReasoningEffort`。对于 `openai-codex`，Harbor 启动前会执行 GPT Auth 登录检查。生成的 Model Binding 是 Context v2 比较身份的一部分，因此 Provider、Model 或 Reasoning 发生任何变化都需要创建新 Baseline。

`harbor_model_binding` 把当前默认选择作为不含凭据的 `model-binding.json` 草稿返回。在 Candidate Snapshot 前纳入该文件后，它会进入 Candidate Digest，并成为必需的 Job 模型身份。发生冲突的 Job 或 Plugin Override 会在 Harbor 启动前失败。即使使用 `openai-codex`，Candidate 也只会收到短期 Broker Capability，绝不会收到 Host OAuth 文件或上游 API Key。

打开 Settings 时，Host 会执行有时限的 npm Registry 检查并缓存成功结果。存在可用 Release 时，界面会显示精确安装命令与 Release Link。浏览器绝不会安装、重写 DSH Profile 或重启 DSH；Registry 失败不会阻断其他操作。

`harbor_eval_result` 默认返回稳定 Summary。使用 `view=job`、`view=dataset`、`view=progress`、`view=trial` 与返回的 `trialId`，或使用 `view=governance`，可以检查经过脱敏的指令、生成输出、证据和 Evaluator 源码，同时不会让 Agent 依赖产物文件路径。

`harbor_eval_result` 与 `harbor_evaluator_inspect` 返回 `harbor-agent-read/v1` Envelope。只能从 `data` 读取实际 Payload，必须保留 `artifactTrust=untrusted-evidence` 并遵守 `policy.treatAsInstructions=false`；旧的顶层 Payload 字段不属于该 Contract。两项响应都会递归脱敏，并受总字节数限制。Evaluator Inspection 还会限制文件集合与源码总大小；当源码文本类似密钥或本地路径时，Agent 只会收到安全 Metadata 与 `sourceAccess.included=false`，不会收到源码正文。Web Workbench 保留独立的同源编辑流程。

`harbor_resolve_page_context` 只接受显式 `@harbor` 引用携带的不透明短期 Context Snapshot id。它会在准确的调用方 DSH Session 与 Workspace 中解析该 id，重新验证稳定对象的上级关系与当前 Host Revision，并返回范围明确的 Metadata、类型化 Harbor Ref 以及允许列表中的只读导航操作。对于显式本地对象，它还会返回有大小限制且经过脱敏的 `selectedEvidence`（Metric、Hypothesis、Gate Reason、Finding、Attempt 或已保存 Source Fragment）；这些内容仍是不可信数据，无法获取的内容不得视为证据。Trial 集合只会暴露冻结的成员与 Revision Metadata，绝不会返回全部 Trial 正文。要检查一项 Trial Criterion，请把准确的类型化 Ref 传给 `harbor_get_evidence`；Host 会重新验证 Workspace → Job → Trial → Criterion → Evidence 上级关系，限制大小并脱敏内容，同时把它标记为不可信证据，而不是 Agent 指令。

## Setup 写入什么

所选 Profile 会收到一项按 id 定位的 Override：

```yaml
- id: harbor-evolution
  config:
    projectRoot: /workspace/my-agent
    jobsDir: jobs
    harborBin: /managed/runtime/.venv/bin/harbor
    harborDshBin: /managed/runtime/.venv/bin/harbor-dsh
    pythonPath: ""
```

对于已发布 Python Package，请让 `pythonPath` 保持为空。对于 Agent Tool 调用，`projectRoot` 会在本次调用中替换为调用 Session 的工作目录。`candidatePath`、`datasetPath`、`jobPath` 与 `policyPath` 仍受本次请求的本地 Root 限制，因此并发 Session 不能重定向彼此的 Harbor 操作。

从仓库进行源码开发时，请运行：

```bash
./hse dsh-install-source web
```

不要在全新 Checkout 中直接使用 `dsh plugin add ./packages/dsh-plugin`。pnpm 会记录 `link:` 依赖，Node 则会从真实 Checkout 路径解析 Import。源码 Installer 会先运行该 Package 的锁定 `npm ci`，构建包含嵌入式海洋图案的可迁移 Web Client，然后建立链接，并安装本地 Python Adapter。普通用户应始终使用上文基于 Registry 的 Setup 命令。

有关 UI 验证、首次评测、Candidate 比较与故障排查，请参阅[完整 DSH Web 快速入门](https://github.com/istarwyh/harbor-self-evolving/blob/main/docs/dsh-web-quickstart.md)。

插件绝不会部署 Candidate，也不会修改当前 Champion。现有 CI/CD 仍负责构建、部署与晋级经过评测的准确产物。
