# YourBuddy 0.4.14

[English](README.md) | 中文

本归档区分已测试源码、预准备 Chromium 行为、待完成的原生安装包验收与公开交付。

- 发行标识：`yourbuddy-v0.4.14`
- 产品渠道：macOS Apple Silicon 版 YourBuddy 桌面应用。
- 归档状态：发布前源码证据；发布工作流与公开附件待完成。
- 证据提交：[已合并源码](https://github.com/istarwyh/yourbuddy/commit/5c70f4c24d289cb696898b84b23f26470c750fd7)，树为 `b2f40dd17aacf6b6532e9569aae6e33e919c2e26`。
- 证据画廊：本候选未保留截图；链接的 CI 日志记录预准备浏览器场景。
- 证据下载：[不可变标签源码归档](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.14.zip)，发布后可用；独立解压检查尚未完成。

## 用户发行说明

### 变化内容

YourBuddy 内置 Claude Design 与 Claude Artifacts 2.11.1，并提供应用内托管编辑器（[PR #90](https://github.com/istarwyh/yourbuddy/pull/90)）。本版还包括有界 SDK 快照测试超时诊断（[#87](https://github.com/istarwyh/yourbuddy/pull/87)）、适用于 PATH 的组件目录（[#88](https://github.com/istarwyh/yourbuddy/pull/88)）、等价 Store 的确定性归档（[#89](https://github.com/istarwyh/yourbuddy/pull/89)），以及 idle-watchdog 测试启动竞态修正（[#91](https://github.com/istarwyh/yourbuddy/pull/91)）。

### 解决的问题

设计产物可以在工作台打开，不再只是启动外部页面。在文件权限模式与工具一致时，等价 Store 内容即使输入顺序及时间戳不同也会产生相同归档。仅失败时输出的 SDK 快照测试诊断标明进度阶段，不记录请求内容；组件缓存路径不再向 PATH 引入冒号。测试修正先等待真实 SDK 请求，再推进模拟时钟。

### 使用位置

在选定工作区中使用 Artifacts 侧栏。创建操作打开全新、尚未发送的 `/claude-design` 草稿，保留所选 Agent Preset，并使用 YourBuddy 已配置的默认模型，不改动已有草稿。详细行为与前提见[适配器指南](../../../apps/desktop-tauri/product/claude-design-adapter/README.zh.md)。

### 体验方法

打开 Artifacts，创建设计草稿并在发送前检查。模型写入项目并调用 `yourbuddy_design_open` 后，选择产物打开托管编辑器。已保存的评论支持 Send to Agent；非评论页面按钮请求返回 HTTP 409，请改用已保存评论。预准备 CI 使用合成文件检查草稿与托管编辑器；真实模型生成仍未验收。

### 安装或升级

发布后，可从 [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest) 获取 Apple Silicon Bootstrap 或 Offline DMG，或使用现有签名更新器。仅有标签或源码检查通过不代表公开附件已可用。

### 兼容性、迁移与限制

Harness 版本仍为 `0.2.0-rc.1`。适用于 PATH 的缓存目录将 `:` 编码为 `%3A`；旧目录保留但不再复用。首次规范化 Store 归档可能因签名摘要变化而重新下载，即使内容标识没有变化。本次没有实现共享 CAS 或增量下载。相关议题 [#57](https://github.com/istarwyh/yourbuddy/issues/57)、[#83](https://github.com/istarwyh/yourbuddy/issues/83)、[#85](https://github.com/istarwyh/yourbuddy/issues/85) 与 [#86](https://github.com/istarwyh/yourbuddy/issues/86) 仍未完成。原始 120 秒超时与历史 13 GB 占用的根因仍未确定。本版不包含 [#80](https://github.com/istarwyh/yourbuddy/pull/80) 的 Agent 自升级。

Design 托管编辑器不能启用 LAN Share。真实模型生成、macOS 原生 Tauri/WebView 交互、HTML/PDF/PNG 导出与保存、冷启动 Session/controller 恢复，以及 Windows 编辑器归属仍需验收。预准备 Chromium 与源码测试不能证明这些结果，也不能替代无系统 Node 环境下的完整首次启动验收。

### 来源与许可证

[来源记录](../../../apps/desktop-tauri/product/claude-design-adapter/UPSTREAM.json) 固定上游提交、两个 npm 2.11.1 包的完整性摘要与已审集成补丁。包内 LICENSE、NOTICE.md 与编辑器第三方声明保持原样。它们采用混合条款，并非整体 MIT。上游 NOTICE 指出 Anthropic 来源材料没有已公布许可证；内置与来源记录均不解决或授予这些权利。

## 验证摘要

| 场景 | 状态 | 被测构建 | 证据与限制 |
|---|---|---|---|
| 组合 Design Bootstrap、离线恢复与 Chromium | 通过 | 精确合并产品树 `b2f40dd` | [运行 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573)，4/4 job；合成数据，没有真实模型 |
| 等价 Store 归档与源码回归 | 通过 | #89 树 `fcbb7f85`；已包含在合并源码中 | [运行 42337855050](https://github.com/istarwyh/yourbuddy/actions/runs/42337855050)，16/16 job；[源码记录](evidence/source-checks.json) |
| 发行版本与发布脚本 | 通过 | 本地 0.4.14 元数据候选 | 10 项 Node 测试；[候选检查](evidence/candidate-checks.json) |
| 完整组合主 CI | 归档准备时待完成 | PR #90 组合源码 | [运行 42346920678](https://github.com/istarwyh/yourbuddy/actions/runs/42346920678)；不能由 Bootstrap 推断其成功 |
| 原生安装包与独立公开下载 | 未验证 | 发布工作流尚未运行 | 仍须完成原生及发布检查 |

## 场景：已安装 Design 与离线恢复

2026-11-07，[Bootstrap 运行 42346920573](https://github.com/istarwyh/yourbuddy/actions/runs/42346920573) 从 UTC 06:25:12 执行至 06:32:57。其 CI 合并提交 `86edf476463e21e49206375e8a8df5ce73378624` 与已合并源码 `5c70f4c24d289cb696898b84b23f26470c750fd7` 的树相同，均为 `b2f40dd17aacf6b6532e9569aae6e33e919c2e26`。Linux 预准备 Harness 使用真实 Host/Profile、已安装的 2.11.1 包、合成项目，未使用模型凭据。

该 job 准备离线种子，以零下载恢复 570 个包，运行 31 项 Node 与 25 项 Vitest 回归，并启动真实 Host 生命周期检查。Chromium 加载已安装的 Artifacts Client，创建未发送草稿并打开托管沙箱编辑器。故意设置无效 Design 配置后，工作台与 Session 创建仍可用。四个工作流 job 全部通过。

预期及实际结果都是草稿与编辑器路径可用，且功能失败保持隔离。链接运行保留步骤日志，没有前后截图集。更早的本地 Chromium 尝试曾受 Unix socket 权限阻断；随后精确相同树的 CI 成功运行提供浏览器证据。这仍是 Linux/Chromium 预准备证据，不是 macOS 原生导出、真实模型生成或冷 controller 恢复验收。

## 交付状态

- 产品发布：待完成；现有标签触发的发行工作流保留构建、签名、预准备浏览器及原生 Offline 检查。
- 验证归档：已纳入源码证据与回退基线；公开附件、独立证据解压与发行运行观察尚待完成。
- 网站同步：已更新双语默认插件说明；本地网站检查及现有 master 自动部署与应用发布分开记录。尚未检查线上页面。
- 未验证范围：上述原生、模型、冷恢复与遗留议题限制仍适用；候选准备未替换任何已有安装或用户 Session。

## 回退

保留不可变的 [0.4.13 发行](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.13) 及其原始签名更新清单。撤回时可以恢复旧版 latest 标识与稳定更新源，不移动公开标签、不替换安装包字节。更新器只接受更高版本，因此已升级应用需要手动重装旧 DMG。操作前退出应用并备份数据；数据降级兼容性尚未验证。

独立下载的 [0.4.13 更新清单基线](evidence/rollback-updater-0.4.13.json) 为 1,971 字节，SHA-256 为 `098682e27e293fbca5122b23bf5519b1dde900c0cf1d282f4f2617658ac8947c`。这是回退准备记录，并非已执行回退。

<a id="release-failure-2026-11-07-utc"></a>

## 发布失败 — 2026-11-07 UTC

[正式发行运行](https://github.com/istarwyh/yourbuddy/actions/runs/42348559538) 在 Harness 构建后因必需组件准备测试失败而停止。63 项测试中 61 项通过，两项因能力 fixture 遗漏已声明的 Design 补丁而失败。[失败记录](evidence/release-failure.json) 保留具体测试、原因与结果。打包与发布未执行。

公开标签保持在 `ee6554c3debbfba70549b8319fc35716dfaa6eb9`。没有 0.4.14 GitHub Release、安装包或公开发行附件。latest 发行与稳定更新源仍为 0.4.13；更新清单字节与保留的回退基线一致。[PR #92](https://github.com/istarwyh/yourbuddy/pull/92) 仅修正 fixture，组件测试 63/63 与 native-overlay 渲染器测试 8/8 通过。修复通过 0.4.15 推进，不移动原标签。

已独立下载[源码 ZIP](evidence/source-archive-verification.json)，提取并打开全部 17 个改动的元数据/文档文件，与标签内容逐字节一致。[网站自动部署](evidence/website-live.json) 成功，六个双语线上页面通过检查。这些观察更新此前待完成的源码下载与网站状态，不改变应用发布失败的事实。未执行下载的应用。
