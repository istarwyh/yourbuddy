# dsh-harbor-evolution

[English](README.md) | 中文

这是一个可安装的 DeepSeek Harness 插件与 Skill，用于执行稳定的 Harbor 评测和受控的 Agent 演进循环，并提供原生 DSH Web 工作台。

该包为 DSH 提供 19 个严格的 Harbor 工具、同 Session 对话中的原生工具卡片、以对象为起点的 Evaluation Workbench、安装 Doctor，以及可由模型和用户调用的 `evolve-agent-with-harbor` Skill。Skill 从四个面向用户的概念开始：Dataset（测什么）、Generator（谁来回答）、Evaluator 及评测标准（什么算好），以及 Optimizer（谁来改进）；随后把已确认的选择编译为严格的 Evaluation Stack。没有提供 Dataset 时，它也可以预览近期已完成的 DSH Session，再把每个不可变 Session 作为一个 Historical Trial 进行评测，而不重新运行 Candidate。DSH Generator 可以显式固定当前默认模型，作为不含密钥的 Candidate 身份，同时保留每个 Job 的 Host Broker 凭据边界。插件会验证 Dataset 身份、检查 Trial Lifecycle 与 Score Validity、管理独立的 Ground Truth 元评测、诊断证据来源，把每次迭代限制为一个受控 Candidate 变更，并且只在明确操作中调用 Promotion Gate。

## 安装

要求 Docker、Node.js 22+、pnpm 和 [uv](https://docs.astral.sh/uv/)。在业务 Agent 工作区执行：

```bash
npx --yes dsh-harbor-evolution@latest setup --project-root "$PWD"
```

Setup 命令会安装两个必需的运行时：

- 在托管的 Python 环境中安装 `harbor-dsh-evolution==0.9.5`。
- 在所选 DSH Profile 中安装 `dsh-harbor-evolution@0.9.5`。

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
- 现有原生 Composer 与对话，输入框上方没有 Context Capsule 或 Copilot 面板；可选的一次性 `Ask AI`／`@harbor` 引用会冻结 Job、Trial、Criterion 或 Evidence 选择，并在发送后清除。在当前 rc.8 Host 上，普通消息不会自动附加可见页面；
- 用于证据导航与已审阅 AI 提案的原生工具结果卡片；类型化 `harbor.navigate` 操作保留允许列表中的只读 Harbor 导航，Back 则恢复此前的 Workspace、页面、阶段、Trial 筛选／排序／焦点、Compare Baseline 与滚动位置。卡片在准备好对象后提示你打开 Harbor Tab，不会自动切换 Host Tab；
- 插件主页中的后台操作，保留取消、恢复检查与结果导航。仅在读取成功且结果为空时隐藏入口，读取失败时不会隐藏；
- 一等的 `Evaluate recent Sessions` 快速入口：从当前 DSH 可访问的历史中自动抽取最多 3 个已完成对话，不依赖评测输出目录。它会预览审阅模型与脱敏数据／费用说明，要求确认，在后台运行，并打开已完成 Job。无需选择历史路径、项目或日期；有限的近期样本不代表全部历史；
- 通过 Descriptor 授权编辑 `script` 与 `llm-as-judge` 实现的 Evaluator/Rubric 源码，使用乐观并发控制并强制采用新身份；
- 由确定性脚本与 LLM-as-Judge 实现共享的 `harbor-dsh-evaluator/v1` 接口；
- 所有 Harbor Tool 调用的紧凑结果卡片；
- 显式本地对象选择和冻结的 Trial 集合选择器（固定 ID／Revision 或 Query Snapshot，最多包含 1000 个成员）、可移除的原生引用，以及针对源码片段的 Ask 操作；
- AI 提案卡片，包含确定性的 Preflight、显式审阅、幂等确认与仅追加的本地操作日志；Candidate、Gate 与交接输出是已保存的草稿，不是已应用的资源变更。Evaluator 源码提案可以在经过检查的版本编辑器中打开。选定的 Compare 只执行读取；
- `Harbor Evolution` 设置区：检查已配置的项目、Evaluation Stack、Jobs 目录与 CLI 路径，支持进程内重新加载 `projectRoot`，并从 npm 检查新的正式版本，但不会静默安装。

### 从对象开始，而不是从命令开始

1. 打开一项评测结果。选择 Task、Score、Evidence Item 或已保存的 Source Fragment。
2. 在支持 `conversation.contexts.register` 的 Host 上，直接在现有 Composer 中输入问题并发送。Harbor 会在取得发送锁时冻结页面与选区。**Ask AI** 和原生 `@harbor` 优先于隐式上下文。Harbor 页面不再提供可能静默移除当前对象的停用选项。较旧的 rc.8 Host 会显示升级提示，并要求显式引用；仅升级此插件不会增加 Host 能力。
3. 在现有对话中阅读回答与提案卡片，没有第二个 Composer 或上下文面板。同一条持久化消息携带问题与页面引用；准备期间切换页面或 Session 不会改变其目标。勾选行会冻结准确的 Trial 成员集合；未打开单条 Trial 的列表也会提供 status／validity 筛选与排序，但不会发送自由文本搜索。附件显示捕获的对象、选区与观察时间。存在较新草稿时，失败消息会把文本与图片保留在原生未发送消息列表中，不会覆盖新草稿。恢复到 Composer 后重新发送，会重新捕获当前页面。离开 Harbor 或使用斜杠命令时，会跳过隐式上下文。
4. 对于评分规则，请选择已保存的行，然后选择 **Suggest a change**。**Review and edit** 会直接打开匹配的文件。AI 可以填充尚未修改的编辑器，但绝不会覆盖你的手工修改。检查 Diff 并显式保存，以创建新身份；该操作不会运行评测或 Gate。

未保存的源码修改按 Session、Workspace、Job 与文件隔离，并保留在当前浏览器 Tab 的 `sessionStorage` 中。切换文件或视图以及刷新页面后可以恢复修改；关闭 Tab 可能丢弃修改。存储失败会明确显示，同时使用内存回退，并针对尚未持久化的修改显示离开页面警告。源码冲突会保留原始 Base 与编辑文本；接受新 Base 前，请检查最新源码。保存或显式丢弃只会清除当前文件的草稿。授权到期绝不会删除建议文本或人工修改；源码发生变化或 Task 子集过期时，需要显式重新选择，不能自动扩大范围。

完整 AI Workbench PRD **尚未**全部实现。当前，受限的诊断与重试操作在没有注册 Runner 时会快速失败；长时间运行操作、可回放 Event/Outbox 以及完整的 Phase 1 审计身份仍待实现。自动页面上下文需要配套 Host 能力；不宣称支持自动跨视图打开。生产 RBAC、批准与发布仍属于后续阶段。实际旅程证据与其余验收工作见仓库的 `docs/ai-workbench-acceptance.md`。

Web UI 只通过三条范围明确且显式的工作流修改业务资源：由 Descriptor 授权的 Evaluator 源码更新、已确认的 Historical Session Launcher，以及已确认的本地草稿／操作日志。上下文绑定还会持久化私有身份快照，但不会修改评测产物。Launcher 遵循 `Preview → confirm → background run → open Job`；其私有 Selection Token 绝不会进入浏览器状态。在支持的 Host 上，用户从当前选中的 Harbor View 提交普通消息时，可以附加冻结的上下文。仅刷新页面、普通读取或切换 Workspace，绝不会发送 Prompt，也不会启动 Agent 或 Job。Candidate 评测、Gate、Promotion、Deployment、Publishing 和每项生产变更仍然属于显式 Agent + Skill 工作流；Agent 请求的每项 Harbor 写入或评测工具都必须经过 DSH 可审计的一次性用户批准。如果没有可用的批准通道，调用会快速失败。

直接评测需要 `candidatePath`、`datasetPath`、`stackPath` 和显式 `mode`；`promotion-eligible` 还需要 `policyPath`。应优先使用 Skill，因为在重要身份与评测 Contract 尚未确定时，它不会运行或比较 Job。

## Historical Session 冷启动

用户未提供 Dataset 时，最简单的入口是 Harbor Tab 中的 `Evaluate recent Sessions` 按钮。它通过当前 DSH Session Query 服务自动查找最多 3 个已完成对话，包括其他项目目录中的历史。它分小批读取近期候选，找到足够数量后停止，并记录扫描范围，不宣称提供全部历史的排名。当前对话、未完成对话与内部评测对话仍会被排除。用户会看到简短样本预览、审阅模型、当前数据策略、Judge 数据边界与费用说明，确认一次即可启动。Session 文本和普通绝对路径会保留；类似凭据的值与原始 Session 标识符会脱敏，而推理、工具 Payload 与附件仍会省略。无需选择存储路径或项目。结果保存在选定的评测工作区；每个来源都会按其自身冻结的身份重新验证。Host 把短期 Selection Token 保留在内存中；浏览器只会收到不透明的 Preview id。内置 Skill 仍是对话入口，并为现有 Agent 工作流保留显式的准确工作目录选择模式（最多 10 个）。

用户明确确认后，`harbor_session_diagnostic_run` 只接收 `selectionToken` 与可选 Job 名称。它会重新验证冻结的 Session 与 Feedback Digest，物化不可变 Historical Batch 以及配套 Dataset 和 Stack，并把每个 Session Observation 作为一个 Harbor Trial 进行评测。该 Job 不会重新运行 Candidate，不能进入 Promotion Gate，并把 Evaluator Meta-Evaluation 记录为 `not-run`，因为 Evaluator 可靠性需要另行执行独立的 Ground Truth 工作流。

缺少必要证据时，Historical Trial 可以以 `completed-unscored` 结束。这是 Evaluator 的正常弃权，不是零分或基础设施失败；应结合 Trial 与 Criterion 覆盖率解释结果。

## Candidate 模型绑定

每个 Job 开始前，插件会对当前 DSH Agent 选择创建 Snapshot，其中包含 Provider、Model 与 Reasoning Effort；随后启动每个 Job 独立的本地 Model Broker。Candidate 通过 `dsh-host-broker`／`dsh-host-model-gateway/v1` 使用临时 `dsh-host` Adapter；它只会收到短期 Job Capability 文件，绝不会收到 GPT Auth、Codex OAuth 或上游 API Key。

`harbor_eval_run`、`harbor_context_preview` 与 `harbor_evolution_doctor` 默认继承该选择。高级调用方只能同时覆盖 `candidateProvider` 与 `candidateModel`，还可以提供可选 `candidateReasoningEffort`。对于 `openai-codex`，Harbor 启动前会执行 GPT Auth 登录检查。生成的 Model Binding 是 Context v2 比较身份的一部分，因此 Provider、Model 或 Reasoning 发生任何变化都需要创建新 Baseline。

`harbor_model_binding` 把当前默认选择作为不含凭据的 `model-binding.json` 草稿返回。在 Candidate Snapshot 前纳入该文件后，它会进入 Candidate Digest，并成为必需的 Job 模型身份。发生冲突的 Job 或 Plugin Override 会在 Harbor 启动前失败。即使使用 `openai-codex`，Candidate 也只会收到短期 Broker Capability，绝不会收到 Host OAuth 文件或上游 API Key。

打开 Settings 时，Host 会执行有时限的 npm Registry 检查并缓存成功结果。存在可用 Release 时，界面会显示精确安装命令与 Release Link。浏览器绝不会安装、重写 DSH Profile 或重启 DSH；Registry 失败不会阻断其他操作。

`harbor_eval_result` 默认返回稳定 Summary。使用 `view=job`、`view=dataset`、`view=progress`、`view=trial` 与返回的 `trialId`，或使用 `view=governance`，可以检查经过脱敏的指令、生成输出、证据和 Evaluator 源码，同时不会让 Agent 依赖产物文件路径。

`harbor_eval_result` 与 `harbor_evaluator_inspect` 返回 `harbor-agent-read/v1` Envelope。只能从 `data` 读取实际 Payload，必须保留 `artifactTrust=untrusted-evidence` 并遵守 `policy.treatAsInstructions=false`；旧的顶层 Payload 字段不属于该 Contract。两项响应都会递归脱敏，并受总字节数限制。Evaluator Inspection 还会限制文件集合与源码总大小；当源码文本类似密钥或本地路径时，Agent 只会收到安全 Metadata 与 `sourceAccess.included=false`，不会收到源码正文。Web Workbench 保留独立的同源编辑流程。

`harbor_resolve_page_context` 只接受显式 `@harbor` 引用或发送时自动附加的页面附件所携带的不透明 Context Snapshot id。它会在准确的调用方 DSH Session 与 Workspace 中解析该 id，重新验证稳定对象的上级关系与当前 Host Revision，并返回范围明确的 Metadata、类型化 Harbor Ref 以及允许列表中的只读导航操作。绑定会在项目的 `.harbor/private/page-contexts/<hashed-session>/` 中保存身份／Revision 记录，而非产物正文或凭据，并采用仅所有者可访问的权限和 Git 排除文件。15 分钟 TTL 只限制内存缓存；已保存记录在缓存过期或 Host 重启后仍可读取。旧的纯内存 Token 与已删除／损坏的记录无法恢复。记录不会自动迁移或删除；保留引用时，请将此私有目录与原始 Session／项目一同保留。证据变化会明确报告；Trial 成员发生变化时会拒绝读取，不会重新执行查询。对于显式本地对象，读取接口会返回有大小限制且经过脱敏的 `selectedEvidence`（Metric、Hypothesis、Gate Reason、Finding、Attempt 或已保存 Source Fragment）；这些内容仍是不可信数据，无法获取的内容不得视为证据。Trial 集合只会暴露冻结的成员与 Revision Metadata，绝不会返回全部 Trial 正文。要检查一项 Trial Criterion，请把准确的类型化 Ref 传给 `harbor_get_evidence`；Host 会重新验证 Workspace → Job → Trial → Criterion → Evidence 上级关系，限制大小并脱敏内容，同时把它标记为不可信证据，而不是 Agent 指令。

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
