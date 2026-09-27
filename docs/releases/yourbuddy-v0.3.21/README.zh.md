# YourBuddy 0.3.21

[English](README.md) | 中文

本归档记录 macOS Ego Browser Runtime 修正与 Tag 发布前可用的验证证据。

- 发布标识：`yourbuddy-v0.3.21`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选版本；源码与有界面浏览器检查已完成，Tag CI 负责发布产物。
- 证据 Commit：`208375672c9cdb14e37e4802d49632c788d5c0dc`
- 证据图集：不适用；本次 Runtime 修正使用有界命令输出而非截图。
- 证据下载：`yourbuddy-v0.3.21` 中的不可变源码；公开安装包等待 Tag CI 发布。

## 面向用户的发布说明

### 改了什么

YourBuddy 现在会通过 macOS 原生桌面会话启动内置 Ego Browser Host，发现标准位置中的 Chrome、Chromium、Brave 与 Edge，并包含浏览器工具所需的固定 SDK Runtime。

### 解决了什么问题

在 0.3.20 中，Agent Browser 标签页可以加载，但 Host 会在 macOS 上选择 Linux-only 显示路径并要求配置 `DISPLAY` 或 Xvfb。干净 Release 还遗漏了浏览器启动后必需的被忽略 SDK 构建文件。修正后的快照会在 macOS 上绕过 X11/Xvfb，并把 SDK 作为经过检查的发布输入进行跟踪。

### 在哪里使用

在侧栏使用 **Agent Browser** 标签页，并让 Agent 打开、检查或操作网站。不需要单独安装 Ego Lite；本机需要一个兼容的 Chromium 系浏览器。

### 如何体验

升级后新建 Session，然后输入：“使用 Agent Browser 打开 `https://example.com`，并告诉我页面标题。”浏览器应在没有 `DISPLAY` 或 Xvfb 错误的情况下打开，Agent Browser 标签页应显示实时页面。

### 安装或升级

从 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有数据无需迁移。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，需要本机安装 Chrome、Chromium、Brave 或 Edge。它不需要 X11、Xvfb 或单独安装 Ego Lite。本地有界面 Smoke 使用 Google Chrome 与无需登录的公开页面；真实网站登录、验证码、下载、其他浏览器品牌、Updater 安装、Apple Developer 签名与公证不在已观察范围内。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| macOS 有界面 Ego Browser 启动与导航 | 通过 | 已提交的 `dsh-ego-browser` 0.8.5 快照及经过评审的兼容补丁 | macOS Apple Silicon、Google Chrome | `--open`、`--status` 与 `nodejs` 导航输出 |
| 产品快照与文档回归 | 通过 | `208375672c` 的源码 | 本地 Node 22/pnpm Workspace | 54 项聚焦 Node 测试、43 项文档门禁与仓库 Lint |
| 正式桌面发布 | 等待中 | `yourbuddy-v0.3.21` | GitHub Actions macOS arm64 | Tag CI 负责打包后 Runtime 冒烟、校验和、Updater Metadata 与上传 |

## 场景：macOS 有界面 Ego Browser Runtime

- 状态：通过。
- 日期与时间：2026-09-27 21:18 CST（UTC+08:00）。
- 发布版本与 Commit：来自 `208375672c9cdb14e37e4802d49632c788d5c0dc` 的 `yourbuddy-v0.3.21` 候选版本。
- 受测构建：已提交的 Ego Browser 快照、实体化兼容补丁与固定的 `ego-browser-v2@0.1.1` SDK Runtime。
- 环境：macOS Apple Silicon，Google Chrome 位于标准应用路径。
- 证据来源：本地源码 Checkout 与真实有界面浏览器进程。
- 数据：公开的 `https://example.com` 页面，不含账号或私有数据。
- 模型或服务：确定性浏览器 CLI；未调用模型。

### 操作步骤

1. 在原始 0.8.5 快照上重放实体化补丁，并把生成的 Tree Hash 与已提交来源记录进行比较。
2. 通过 `--open` 运行内置 CLI，确认 `--status` 报告 `headless: false`，再使用其结构化 `taskSpaces`、`browser` 与 `page` Facade 导航到 `https://example.com`，最后停止浏览器。
3. 运行聚焦的 Bundle、产品刷新、Release Smoke、文档与 Lint 检查。

### 预期结果

补丁必须精确重放，SDK Runtime 必须被 Git 跟踪并固定 Digest，macOS 不得进入 Xvfb 路径，真实浏览器必须以有界面模式打开，结构化工具 Facade 必须返回预期 URL 与标题。

### 实际结果

补丁重放得到 Tree SHA-256 `cb66f8c0013a62f494c4e9e3f2e66c43c76311e7181448c0aefad3dc711c01d9`。有界面 Runtime 报告 Google Chrome 且 `headless: false`；导航返回 `https://example.com/` 与标题 `Example Domain`。10 项 Bundle 测试及相邻刷新与 Release Suite 通过，聚焦组共计 54 项 Node 测试通过，43 项文档门禁全部通过，仓库 Lint 通过。实时上游刷新检查未计为通过，因为一个无关的最新 Harbor 候选暴露了现有的预发布 Peer Range 比较失败。

### 证据

- 操作前：0.3.20 在 macOS 上选择 Linux X 显示路径，并可能报告缺少 `DISPLAY` 与 Xvfb。
- 执行中：干净快照显示 `runtime/ego-browser/dist/out/index.js` 被忽略且缺失；经过检查的 npm 产物提供按完整性固定的 SDK Runtime。
- 结果：实体化补丁可以干净重放，标准 macOS 浏览器路径可被发现，原生桌面绕过 X11/Xvfb，有界面导航通过。
- 失败与恢复：最初尝试使用已安装的原生 Ego Lite CLI；确认其当前 `taskSpace` API 与 stderr 结果流不兼容插件的 `taskSpaces` Facade 后放弃。最终修正保留插件自带 Host，并将该 Host 移植到 macOS。

### 范围限制

这些检查确认本机上的已提交 Runtime、真实有界面浏览器启动与公开页面导航。它们不能确认 Tag DMG、打包后 Tauri WebView 交互、真实网站认证、验证码处理、下载、其他浏览器品牌、Updater 安装、Apple Developer 签名或公证。

## 交付状态

- 产品发布状态：等待 Annotated Tag 和 Tag GitHub Actions 工作流。
- 验证资料归档状态：源码、干净补丁重放、聚焦回归与真实有界面浏览器证据在说明范围内已完成。
- 站点同步状态：产品指南已变化，需要同步；等待推送 Master 后部署。
- 未验证范围：Tag 产物、打包后 Tauri WebView 交互、真实网站登录、验证码与下载流程、非 Chrome 浏览器、Updater 安装、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 适用时说明安装或升级、兼容性、迁移与已知限制。
- [x] 每个场景记录日期、时区、Commit、环境、受测构建、证据来源、数据类型及模型或服务类型。
- [x] 操作步骤、预期结果、实际结果、状态和范围限制符合实际观察。
- [x] 按价值保留操作前、执行中、结果、失败和恢复状态，不设置截图数量指标。
- [x] 明确标记仅测源码、仅有历史资料、合成数据、Mock、跳过、失败和未验证证据。
- [x] 本次不需要截图；有界命令结果与来源记录可追溯。
- [x] 只跟踪或上传脱敏副本；凭据、个人信息、私有内容和敏感原图均未进入归档。
- [x] 已在 `docs/releases/README.zh.md` 中添加版本条目，并确认两种语言内容一致。
- [x] 相对链接可以渲染，引用的每个本地文件都存在。
- [ ] Tag CI 已发布并独立提供 DMG、Updater 归档、签名、校验和及稳定 Updater Metadata。
- [ ] 公开发布页已链接不可变验证资料归档。
- [ ] 已独立于 CI 和临时工作流产物检查真实公开产品目的地。
- [x] 未修改桌面 Shell Origin、Capability、Permission 或 Command；打包后 WebView 交互明确保留为未验证。
- [ ] 已记录发布后的文件名、版本、Hash、Updater Metadata 与安装后行为。
- [ ] 发布后稳定最新 Release 链接与部署的双语产品指南均可访问。
- [x] 分别报告产品发布状态、验证资料归档状态、站点同步与未验证范围。
- [x] 未移动或覆盖公开 Tag 与安装包；本次修正使用新版本。
