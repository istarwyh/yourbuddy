# Agent Note：YourBuddy Codex 委派路由

状态：已实现

[English](2026-09-07-yourbuddy-codex-delegation-routing.md) | 中文

## 问题

YourBuddy 的 Codex Agent Preset 会暴露原生 `subagent_codex` 工具；其 Provider 会启动应用内随附的 Codex Runtime，并创建可追踪的子会话。用户级 `codexhost-delegation` skill 也可能宣传通用 Codex 委派。当两者同时对模型可见时，委派请求可能先匹配到该 skill。它的指令随后要求模型运行与产品无关的 `codexhost` 可执行文件，而 YourBuddy 并不携带这个命令，因此请求会以退出码 127 失败，且从未调用 `subagent_codex`。

产品 Bundle 与 Provider 实际都存在。故障来自应用自有工具与独立安装的全局 skill 对同一意图形成了含糊的模型路由界面。

## 决策

`@deepseek-ai/dsh-tool-skill` 接受 `modelExcludedSkills`，用于配置不允许模型自主路由的精确 skill 名称，并在加载时校验。保留的 skill 不会出现在持久模型目录中；模型通过 `skill` 工具直接加载时，也会在提供方正文被读取前遭到拒绝。用户显式 `/name` 路径保持独立：只要该 skill 自身允许用户调用，用户直接点名保留 skill 时仍会注入它。

YourBuddy 桌面 Overlay 将 `codexhost-delegation` 设为保留名称。因此 Codex Preset 的普通委派只有一条模型可见路径，即 `subagent_codex`；`/codexhost-delegation` 则继续作为用户主动选择外部集成的入口。目录 Digest 变化后，会在下一个请求边界替换旧的 Session 目录，因此已有 Session 不会继续保留冲突的自动路由。

## 验证

Package 回归测试同时注册一个保留的 `codexhost-delegation` skill 与一个普通 skill。测试证明：保留名称和描述不会进入模型目录，模型直接调用工具会失败且不会泄露 skill 正文，普通 skill 仍然可见，用户显式发送 `/codexhost-delegation` 仍会注入保留指令。另有用例要求格式错误或重复的排除名称在插件加载时失败。一份无密钥的组装 Expected-output 快照会使用已经安装 `dsh-badge` skill 的正式 Base 应用启动，并固定部署配置保留该 skill 后的模型可见结果：Provider 发现仍可找到它，目录为空，模型加载工具返回策略错误。

桌面 Rust 与 JavaScript 测试要求安装 Overlay 和装配发布 Smoke Overlay 包含相同的排除配置。发布准备会使用该 Overlay 与内置原生 Codex Provider 启动完整产品。报告中已安装 Session 的证据只用于识别互相竞争的路由；其私有路径、会话内容和 Session 归档不会复制进仓库。

第一次 Pull Request Windows Coverage 还在真实 Codex app-server 断言通过后暴露了另一个测试生命周期缺陷：虽然 Coverage 命令已传入该 Lane 的 90 秒 Hook Budget，但本文件的 `afterEach` 在等待 Context Dispose、Fixture Close、子进程退出与 Windows Handle 释放时仍使用 Vitest 的 10 秒默认值。真实产品生命周期 Hook 现在显式采用与持有进程的用例相同的 60 秒 Budget，并继续等待系统静止；原始失败保留为负例，同一 Windows Coverage 拓扑必须在合并前通过。

## 考虑过的替代方案

**删除或改写用户级 skill。** 该 skill 安装在 YourBuddy 之外，并且可能对其他环境有效。产品启动流程不应为了处理应用装配冲突而修改用户自有的 Agent 配置。

**在应用中携带 `codexhost` 可执行文件。** 这会让误选路径得以启动，但仍会绕过 Preset 的原生 Provider 与可追踪子会话生命周期；它还会增加第二套 Codex 集成，而不是消除含糊路由。

**用提示词要求模型优先选择 `subagent_codex`。** 提示偏好仍然暴露两种竞争操作，并依赖模型的选择行为。模型侧目录与加载工具应只暴露产品能够为自动委派提供支持的路径。

## 影响

部署方无需修改或删除用户自有 skill，也不需要改变它的全局 Metadata，就能解决意图冲突。配置按名称精确匹配，并在名称无效或重复时失败。它本身不决定哪个应用工具更权威；每个部署都必须为排除项配套一条有文档说明的模型侧路径，并同时测试被阻止的自动路径与保留的显式路径。

YourBuddy 的发布说明与桌面文档必须同时说明原生 Codex 委派路径和显式外部选择。任何修改 Preset、原生工具名称或该排除项的产品发布，都必须重跑 skill 路由回归与完整产品 Smoke。
