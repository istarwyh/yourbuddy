# YourBuddy 0.3.24

[English](README.md) | 中文

本归档记录 0.3.24 的跨引擎 Session 历史修复及本次发布接受的验证限制。

- 发布标识：`yourbuddy-v0.3.24`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已发布；已在所述限制内独立检查源码行为与公开产物。
- 证据 Commit：始于 `66456d4eb8` 的功能 Commit 系列；Release Tag 固定完整候选版本。
- 证据图集：不适用；未录制打包后 WebView 交互。
- 证据下载：[YourBuddy 0.3.24 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.24)。

## 面向用户的发布说明

### 改了什么

无损 JSON 容器检查现在使用 Prototype 结构和自洽的 Constructor 关系，不再依赖由引擎决定的原生函数源码文本。Session 历史打开会把全部校验或 Client 异常转换为可见错误状态，Chat 还提供**重试加载**以创建新的 Stream Generation。

### 解决了什么问题

macOS WebKit 对原生函数采用与 V8 不同的文本格式，因此有效的 Assistant Stream 历史可能在打开主 Session 或子 Agent Session 时校验失败。随后本地异常直接逃逸，没有替换 `openState: "loading"`，使对话永久停在**载入历史…**。

### 在哪里使用

该修复适用于 YourBuddy 打开现有主 Session 或子 Agent 历史的路径，包括 Issue #34 描述的**任务管理**对话视图。

### 如何体验

打开**任务管理**，选择一个已经产生模型输出的子 Agent，其历史应能加载。如果出现其他校验或协议错误，请在显示的错误状态中使用**重试加载**。

### 安装或升级

请从 GitHub Release 安装 Apple Silicon DMG，或从旧版 YourBuddy 使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 Session 数据无需迁移。更新后请完全退出并重新打开旧进程。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，并保留应用未经 Apple Developer 签名和公证的限制。源码测试覆盖了结构化 Cross-realm 容器、本地历史打开失败、旧 Generation 防回写及重试操作。Tag 前未操作 JavaScriptCore/WebKit 打包应用，因此原生复现属于发布后的手工检查，而不是已通过项。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 跨引擎 JSON 与 Session 打开行为 | 通过 | 始于 `66456d4eb8` 的功能 Commit 系列 | macOS Apple Silicon、Node 22.22.3、pnpm 11.7.0 | 5 个聚焦文件、252 个测试；公开重试动词后再通过含 62 个测试的 Session 文件 |
| Client 契约集成 | 通过 | 0.3.24 候选版本 | 本地 macOS 工作区 | `npm run typecheck:contracts-ready` |
| 0.3.24 正式发布 | 通过 | `f993f80739` 的 `yourbuddy-v0.3.24` | GitHub Actions macOS arm64 | 工作流 `36723446378` 构建应用、检查迁移运行时、验证 Checksum，并发布 5 个产物 |
| 文档与生成目录 | 重新生成后通过 | 0.3.24 候选版本 | 本地 macOS 工作区 | 42 项文档检查及修正后的 Client Catalog 检查 |
| 打包后 WebKit 复现 | 未验证 | 0.3.24 候选版本 | macOS Tauri WebView | Tag 前未运行打包应用 |

## 场景：源码历史可移植性与失败恢复

- 状态：在所述仅测源码范围内通过。
- 日期与时间：2026-09-30 21:24 CST（UTC+08:00）。
- 发布版本与 Commit：包含功能 Commit `66456d4eb8` 的 `yourbuddy-v0.3.24` 候选版本。
- 受测构建：已提交的源码 Checkout 与生成的 Client/Workflow Catalog；不包含正式 0.3.24 安装包。
- 环境：macOS Apple Silicon、Node.js 22.22.3、pnpm 11.7.0。
- 证据来源：本次发布准备中的本地聚焦运行、文档检查与 Pre-commit 检查。
- 数据：合成的 Cross-realm JSON 容器、Session Page 与 Assistant Baseline 失败；不含私有数据。
- 模型或服务：确定性 Unit 与 Client Rendering 测试；未调用模型。

### 操作步骤

1. 运行拥有受影响路径的 JSON/Session/Schema/PTC 测试文件，以及 Session Controller 与 Chat View 测试。
2. 重新生成 Workflow Guest 与 Client Slot Catalog，检查其新鲜度，运行文档同步，并通过 Staged Lint 与双语配对检查创建 Commit。

### 预期结果

Plain JSON 容器不得依赖 `Function.prototype.toString()` 的格式。任何首次历史异常都必须离开 `loading`，保留可展示诊断，清理其 Stream，并允许显式重试；旧工作不能回写新的 Generation。

### 实际结果

5 个聚焦文件通过 252 个测试。`retryOpen()` 成为正式 `SessionFace` 动词后，含 62 个测试的 Session 文件通过，Client 契约类型检查也完成。测试接受结构自洽的 Cross-realm 容器，拒绝 Subclass 和异常容器，把历史打开期间的普通 `TypeError` 转换为 `openState: "error"`，重新打开新的 Stream Generation，并调用本地化重试操作。文档同步通过 42 项检查，并发现新增 `retryOpen` 后 Client Slot Catalog 过期；重新生成后，该目录的聚焦新鲜度检查通过。创建修复 Commit 时，Staged Lint 与双语配对检查通过。Tag 工作流 `36723446378` 在 22 分 5 秒后成功完成并发布 5 个文件。DMG、Updater Archive、签名、Checksum 列表与 Updater Manifest 均通过匿名下载；3 个 Payload Hash 全部通过下载所得 Checksum 列表，Archive 目录可以打开，`hdiutil verify` 也确认 DMG 有效。稳定 Updater Manifest 标明 0.3.24 及其公开 Updater URL。

### 证据

- 操作前：4 条 JSON 路径比较原生函数的精确源码文本，本地打开异常直接逃逸，而 Session 保持 `loading`。
- 执行中：共享 Helper 替换 3 个副本，免依赖的 PTC Bootstrap 使用同一结构检查，Session 打开增加单一失败归一化路径。
- 结果：源码测试确认无需引擎文本的容器识别、错误终态、Stream 清理及显式重试操作。公开 Release 包含 `latest.json`、`SHA256SUMS.txt`、Updater Archive 与签名以及 DMG；它们发布的 SHA-256 Digest 依次为 `26524db70fa1eaf0bc9d12e5585aef16f880892c61d40b1fa9509ca75a69efba`、`aa2aab4b6ce9dcd367180c6475f52a61c29f68ddfbae6f0af5d2949a1cbff184`、`eee907be174303fdbb0408219713e2b09dd57dc795e77a520b8bf288812a74b3`、`fbc0f1f009ace0dc12343a722eacc57f2b247c8e2ff306424e616c2482506365` 与 `ec6870673a47996244aa3758d03cecd96e0106832b783d0b35050de459641d46`。
- 失败与恢复：新增 `retryOpen` 后，文档同步发现预期的 Client Slot Catalog 过期；仅重新生成该目录后，其聚焦检查通过。

### 范围限制

发布后未在 JavaScriptCore 或打包后的 Tauri WebView 中运行应用。独立下载的 DMG 已通过验证，但未挂载或启动；已读取 Updater Archive 目录，但未解压或启动应用。未尝试 Updater 安装，仍未进行 Apple Developer 签名与公证。

## 交付状态

- 产品发布状态：已通过工作流 `36723446378` 发布；公开 Release 包含 Apple Silicon DMG、Updater Archive、签名、Checksum 与 Updater Manifest，稳定 Updater Manifest 标明 0.3.24。
- 验证资料归档状态：在所述限制内完整；已记录源码证据、工作流结论、公开文件名、独立下载、Hash、Updater Metadata、Archive 目录、DMG 完整性与稳定 Latest Release 目的地。
- 站点同步状态：不适用；本版本修改应用行为与发布说明，但不修改产品指南页面。
- 未验证范围：打包后的 WebKit 复现、应用解压或启动、Updater 安装、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 验证场景记录日期、时区、Commit、环境、受测构建、证据来源、数据类型及服务类型。
- [x] 操作步骤、预期结果、实际结果、状态和范围限制符合实际观察。
- [x] 按价值保留操作前、执行中、结果、失败和恢复状态，不设置截图数量指标。
- [x] 明确标记仅测源码、合成数据、失败和未验证证据。
- [x] 因未操作打包后交互而没有保留截图；源码引用受限并可追溯。
- [x] 只跟踪脱敏证据；不包含凭据、个人信息、私有内容和敏感原图。
- [x] 已在 `docs/releases/README.zh.md` 中添加版本条目，并确认两种语言内容一致。
- [x] 相对链接可以渲染，引用的每个本地文件都存在。
- [x] Updater Archive 已独立下载并打开目录；DMG 已独立下载并通过 `hdiutil verify`。
- [x] 已记录不可变 Tag 归档与 Release URL；本次不适用图集。
- [x] 公开 Release 页面与全部 5 个可下载产物均已存在。
- [x] 未修改桌面 Shell Origin、Capability、Permission 或 Command；打包后 WebView 交互仍明确标为未验证。
- [x] 已记录发布文件名、GitHub Digest、下载所得 Checksum 内容、Updater 版本、签名与 Archive URL。
- [x] 稳定 Latest Release Manifest 解析为 0.3.24；因未修改产品指南，站点同步不适用。
- [x] 已分别报告产品发布状态、归档状态、站点状态与未验证范围。
- [x] 未移动或覆盖已有公开 Tag 与安装包；本 Release 使用新版本。
