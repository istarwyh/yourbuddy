# 默认插件：用途、选择理由与边界

[English](plugins.md) | 中文

YourHarness 的默认体验由上游能力、独立插件项目和自有产品插件共同组成。本页按 2026-09-06 工作区内实际打包清单编写；“默认集成”指安装包携带并通过桌面配置装配，不等于用户已经登录、服务已经可用或所有可选功能都已开启。

## 外部插件快照

| 插件 | 本次快照版本 | 来源 | 选择理由 |
|---|---|---|---|
| Codex Auth | 0.3.1 | [suntianc/dsh-codex-auth](https://github.com/suntianc/dsh-codex-auth) | 为已有 Codex 用户提供集中登录、模型、搜索与图片能力入口 |
| Better Sidebar | 0.17.1 | [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 让对话产生的文件、命令和 Git 变化可以在工作台内检查 |
| Context Doctor | 0.6.1 | [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor) | 帮助用户理解增加指令、技能和工具后的上下文成本 |
| Plugin Marketplace | 0.2.8 | [Scorp1o117/dsh-plugin-marketplace](https://github.com/Scorp1o117/dsh-plugin-marketplace) | 为用户继续扩展工作台提供发现、了解和安装入口 |
| Harbor Evolution | 0.8.1 | [istarwyh/harbor-self-evolving](https://github.com/istarwyh/harbor-self-evolving) | 用已有会话或固定评测任务，为 Agent 改进提供证据 |

这些项目不属于 DeepSeek Harness 官方默认发行组合。Harbor 与 YourHarness 的维护者有关联，但仍是独立上游项目。版本来自本地快照，不代表在线最新版本；其中 Context Doctor 固定到具体 Git Commit。选择理由是本次产品梳理，不冒充各插件作者的设计声明。

## Codex Auth：让已有账号进入工作流

**解决的问题。** 把 Codex 登录状态、可用模型、网页搜索和图片生成集中到一个设置区，降低用户在多个能力之间重复配置的成本。

**使用方式。** 打开设置 → GPT Auth，完成登录并检查账号状态，选择可用 Codex 模型后开始任务。桌面默认装配还注册了搜索与图片能力：搜索通过标准 `web_search` 使用，图片由 `generate_image` 生成或编辑，并作为会话附件保存。图片工具是否出现取决于模型声明、登录、账户与插件开关。

**默认集成的理由。** 它让已有 Codex 使用者可以从熟悉的账号开始，同时为资料检索与图文任务提供同一套认证入口；用户仍可配置其他提供方。

**限制。** 这是社区提供的非官方账号接口，插件上游明确将其限定为个人开发用途；接口、额度和账户可用性可能变化。不能宣传为 OpenAI 官方授权集成、无限额度或生产服务保证。它复用原生 Codex 认证文件，只有系统钥匙串而无可用文件凭据时可能需要调整原生登录存储。图片在会话中持久化，当前插件没有工作区图片导出操作；长上下文开关也不保证后端扩大容量。

**官网演示。** 登录状态页 → 选择模型 → 发起一次带来源的搜索；图片案例单独标明实际可用账户与模型。演示不得出现登录文件或 token。

## Better Sidebar：让任务产物可见

**解决的问题。** 用户不必只依据助手描述判断完成情况，可以在对话旁查看文件树、编辑器、图片与 Markdown 等预览、真实终端、Git 差异和后台任务。

**使用方式。** 在会话工作区打开右侧栏或底部面板，查看 Agent 产生的文件；代码任务配合终端与 Git 面板检查变化。各类侧边卡片可以在设置中调整。

**默认集成的理由。** 它补全“提出任务 → 产生结果 → 人工检查”的最后一步，也为其他插件注册页面和文件预览器提供位置。

**限制。** 真实终端操作会影响实际工作目录；面板不是隔离环境的保证。面向模型的 `terminal_*` 与 `sidebar_open` 工具默认关闭，需要用户显式开启。内嵌网页受到目标站点 iframe 策略与浏览器规则限制，不能宣传为任意网站都可嵌入；侧边对话仍属 Beta 能力。

**官网演示。** 同一个任务的对话、生成文件与 Git 差异同时出现。首屏展示少量有用面板，完整卡片目录留在插件详情页。

## Context Doctor：理解上下文成本

**解决的问题。** 当项目指令、技能与 MCP 工具逐渐增加时，用户需要知道哪些内容占用上下文、哪些指令重复、哪些同名技能发生遮蔽。

**使用方式。** 在已有会话的输入区展开 Context Doctor，或请 Agent 调用 `context_audit`，查看指令链、技能目录、工具 schema 与 MCP 分组报告。先检查建议指向的文件和来源，再决定是否修改。

**默认集成的理由。** 一个鼓励用户组合插件的工作台，也需要帮助用户观察组合的代价。审计可以辅助做出保留、精简和按需加载的选择。

**限制。** 审计本身只读，Token 数是估算值，不是账单。重复检测主要识别相同文本，不能保证找出语义冲突，也不能证明某项内容毫无价值。用户随后要求 Agent 执行修改是另一个操作；分享报告时应检查路径与摘录是否包含敏感信息。

**官网演示。** 一份可定位的重复指令报告，以及由人确认后修改的文件差异；只有实际测量过才展示前后用量变化，不给固定节省比例。

## Plugin Marketplace：继续扩展工作台

**解决的问题。** 用户可以从设置中发现社区插件，查看 README、来源、安装方式，并按需要增加能力。

**使用方式。** 打开设置 → 插件市场，搜索插件并查看详情。符合条件的包提供确认安装入口；确认后查看安装状态，再通过应用生命周期入口重启 YourHarness。AI 解释功能使用当前配置的默认模型。

**默认集成的理由。** 默认组合只是起点。发现入口让用户能够继续选择工具，并在安装前理解它的来源和用途。

**限制。** GitHub Topic 和 Star 仅帮助发现项目，不等于安全审查或兼容性认证。一键安装还要求 npm 包具有有效的 DSH Bundle 元数据和仓库关联，元数据不明确时入口不可用。搜索依赖外部网络并可能限流；安装代码具有与手动安装 DSH 插件相同的 Host 权限。不要因为插件属于同一套 Enhancement Suite，就把其中的记忆、人格或视觉插件也写成默认安装。

**官网演示。** 展示一个可安装包的来源、确认与完成状态，再展示一个因元数据不满足而无法一键安装的正常状态。

## Harbor Evolution：为改进建立证据

**解决的问题。** 面对不稳定的 Agent 结果，用户可以从已完成会话寻找问题，也可以用固定任务比较一次受控修改前后的表现。

**使用方式。** 从对话调用 `evolve-agent-with-harbor` Skill。没有提供数据集时，先预览当前工作目录中近期已完成会话，确认后再评测；已有明确任务时，说明评测集、生成器、评测器及标准、优化器四项信息。工作台用于查看结果、证据、覆盖率和比较信息，运行评测通过显式的 Agent／Skill 流程发起。

**默认集成的理由。** 它使“按你的方式工作”可以延伸为“根据你的任务判断什么有效”。用户可以从实际失败逐步形成回归样例，而非只凭单次演示判断模型或提示词好坏。

**配套内容。** 桌面同时携带 Harbor Skill、配套的 `harbor-dsh-evolution` Python Adapter 和托管 Python 运行时，普通桌面用户不应再照搬独立插件 README 的 `npx ... setup` 安装流程。Candidate 任务所需的 Docker 环境、模型服务和网络仍需准备，并由 Doctor 检查。

**限制。** 历史会话诊断观察已有记录，不重新运行 Candidate，不能作为晋级比较基线；缺少证据时允许不评分。单 Query 快速诊断主要检查执行链路，其草拟标准不等于已执行的质量评测。正式比较要求固定任务、模型与评测身份；评测器可靠性还需要独立的 Ground Truth 元评测。插件不会自动部署 Candidate 或替换生产 Agent。评测可能产生额外模型请求、容器运行与磁盘开销。

**凭据说明。** 评测中的 Candidate 可通过 Job 级临时能力调用已冻结的 Host 模型；可复用的 Codex OAuth 或上游 API 密钥不会复制进 Candidate。这不表示模型请求不经过网络。

**官网演示。** 优先展示“预览历史会话 → 确认 → 阅读证据与缺失项”；正式基线比较作为独立进阶教程，不能用历史诊断截图替代。

## YourHarness 自有与上游配套能力

| 能力 | 归属 | 使用与选择理由 | 限制 |
|---|---|---|---|
| Personal Workbench `0.1.0` | YourHarness 自有插件 | 通用设置中的名称／Logo、全局代理、更新和重启；给桌面用户一个集中的产品设置入口 | 自定义身份按 Profile 保存；不修改桌面图标或完整主题；原生生命周期能力仅在桌面有效 |
| Codex Subagent | 仓库内的 `@deepseek-ai/dsh-subagent-codex` | 默认 Codex Agent Preset 可把自包含任务委派给官方 Codex 运行时，在同一工作目录中返回结果 | 与 Codex Auth 的主模型接入不同；不继承完整父会话，权限与登录遵循原生 Codex 配置；加载插件不会立即启动子进程 |
| Harbor Python Adapter 与 Skill | Harbor 的配套组成 | 连接桌面工具、评测任务与结果呈现，无需把它们作为两个额外产品介绍 | 版本需与 Harbor 插件匹配；托管运行时不等于已安装 Docker 或已获得模型额度 |

## 默认组合的维护原则

官网先呈现用户要完成的工作，再说明各插件的贡献。默认集合保持有明确用途和可验证入口；实验能力以其实际成熟度描述。用户安装的额外包与应用内置快照区分维护，内置插件随 YourHarness 发布更新，不把上游版本提示当成应用已更新。

## 实现与来源记录

装配依据为[打包脚本](../../../apps/desktop-tauri/scripts/bundle-harness-source.mjs)和[桌面配置](../../../apps/desktop-tauri/src-tauri/src/overlay.rs)。以下本地记录是版本与功能核对入口；外部 README 可能包含独立安装或旧版内容，官网以桌面装配后的行为为准。

| 组件 | 功能依据 | 快照依据 |
|---|---|---|
| Codex Auth | [随包说明](../../../apps/desktop-tauri/product/dsh-codex-auth/README.zh.md) | [来源记录](../../../apps/desktop-tauri/product/dsh-codex-auth/YOURHARNESS_UPSTREAM.json) |
| Better Sidebar | [随包实现](../../../apps/desktop-tauri/product/dsh-better-sidebar/src/index.ts)；[默认开关](../../../apps/desktop-tauri/product/dsh-better-sidebar/src/config.ts) | [来源记录](../../../apps/desktop-tauri/product/dsh-better-sidebar/YOURHARNESS_UPSTREAM.json) |
| Context Doctor | [随包实现](../../../apps/desktop-tauri/product/context-doctor/lib/index.js) | [来源记录](../../../apps/desktop-tauri/product/context-doctor/YOURHARNESS_UPSTREAM.json) |
| Plugin Marketplace | [随包说明](../../../apps/desktop-tauri/product/plugin-marketplace/README.zh.md) | [来源记录](../../../apps/desktop-tauri/product/plugin-marketplace/YOURHARNESS_UPSTREAM.json) |
| Harbor Evolution | [随包说明](../../../apps/desktop-tauri/product/harbor-evolution/README.zh.md) | [来源记录](../../../apps/desktop-tauri/product/harbor-evolution/YOURHARNESS_UPSTREAM.json) |
| Personal Workbench | [产品说明](../../../apps/desktop-tauri/product/personal-workbench/README.zh.md) | [包版本](../../../apps/desktop-tauri/product/personal-workbench/package.json) |
| Codex Subagent | [包说明](../../../packages/subagent/subagent-codex/README.zh.md) | [包版本](../../../packages/subagent/subagent-codex/package.json) |
