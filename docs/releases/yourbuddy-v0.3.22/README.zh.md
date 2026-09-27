# YourBuddy 0.3.22

[English](README.md) | 中文

本归档记录 0.3.22 延续的 Agent Browser 独立打包验证与发布维护加固。

- 发布标识：`yourbuddy-v0.3.22`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选版本；源码与前序打包产物检查已完成，Tag CI 负责发布 0.3.22 产物。
- 证据 Commit：`bf8b15beebe1785e74fabea286a6cf8a407b8c55`
- 证据图集：不适用；有界命令输出与 Package Digest 是本次有效证据。
- 证据下载：`yourbuddy-v0.3.22` 中的不可变源码；公开安装包等待 Tag CI 发布。

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.22 延续 macOS Agent Browser 修正，补充对可下载 Package 的独立验证，修复 DSH 预发布版本的产品插件刷新检查，并把桌面发布工作流迁移到兼容 Node.js 24 的 Actions。

### 解决了什么问题

Agent Browser 修正已在 0.3.21 发布，但首版归档没有独立下载并操作公开 DMG。后续检查确认打包 SDK 与真实有界面浏览器导航可用。发布维护还会拒绝兼容的预发布 Peer Range，并产生 Node.js 20 Action 警告；本版本已修正这两条维护路径。

### 在哪里使用

在侧栏使用 **Agent Browser** 标签页，并让 Agent 打开、检查或操作网站。Release 维护者也可以对当前 Harbor 与 Oil Creator 候选运行可用的 Dry-run 兼容性检查。

### 如何体验

升级后新建 Session，然后输入：“使用 Agent Browser 打开 `https://example.com`，并告诉我页面标题。”浏览器应在没有 `DISPLAY` 或 Xvfb 错误的情况下打开，并返回 `Example Domain`。

### 安装或升级

从 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有数据无需迁移。更新后请完全退出并重新打开旧进程，让新 Session 加载新的内置 Runtime。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，需要本机安装 Chrome、Chromium、Brave 或 Edge。它不需要 X11、Xvfb 或单独安装 Ego Lite。已操作 Google Chrome、全新浏览器 Profile、本地页面与无需登录的公开页面。打包后 Tauri WebView 交互、真实网站登录、验证码与下载流程、非 Chrome 浏览器、Updater 安装、Apple Developer 签名与公证仍不在已观察范围内。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 独立下载的 Agent Browser Package | 通过 | 已发布且携带相同 Runtime 快照的 0.3.21 DMG | macOS Apple Silicon、Google Chrome、全新与正常 Profile | DMG 校验和、SDK Digest、有界面本地页面与公开页面导航 |
| 产品刷新兼容性 | 通过 | `bf8b15beeb` 的源码 | 本地 Node 22/pnpm Workspace 与当前上游 Metadata | 27 项聚焦测试与实时 Dry-run 候选 |
| Node.js 24 发布 Actions | 源码检查通过 | 0.3.22 Workflow 定义 | 官方 Action Metadata 与仓库 Lint | cache v5、setup-uv v7、pnpm setup v4.4.0 |
| 正式发布 0.3.22 | 等待中 | `yourbuddy-v0.3.22` | GitHub Actions macOS arm64 | Tag CI 负责构建、打包后 Runtime Smoke、校验和、Updater Metadata 与上传 |

## 场景：打包 Agent Browser 与发布维护

- 状态：在说明的发布前范围内通过。
- 日期与时间：2026-09-27 22:20 CST（UTC+08:00）。
- 发布版本与 Commit：来自 `bf8b15beebe1785e74fabea286a6cf8a407b8c55` 的 `yourbuddy-v0.3.22` 候选版本。
- 受测构建：已提交的 0.3.22 源码，以及携带相同 Ego Browser Runtime 字节的独立下载 0.3.21 Package。
- 环境：macOS Apple Silicon，Google Chrome 位于标准应用路径。
- 证据来源：公开 GitHub Release 产物、挂载的应用资源、源码 Checkout 与当前上游 Metadata。
- 数据：生成的本地 HTML 与公开的 `https://example.com`，不含账号或私有数据。
- 模型或服务：确定性浏览器 CLI 与 Release Script；未调用模型。

### 操作步骤

1. 下载公开 DMG，比较 SHA-256，以只读方式挂载，并把其中的 SDK Digest 与已记录源码产物进行比较。
2. 使用全新浏览器 Profile 运行打包 Host 并打开本地页面，再使用正常 Profile 打开 `https://example.com`。
3. 运行产品兼容性测试、实时产品刷新 Dry-run、文档门禁、仓库 Lint 与 Release Version 检查。

### 预期结果

Package 必须匹配校验和、包含固定 SDK、在没有 Xvfb 的情况下以有界面模式启动原生 Chrome，并通过结构化浏览器 Facade 完成导航。兼容的预发布 Peer Range 必须通过，较旧的预发布版本仍必须被拒绝；当前刷新候选必须在不修改已提交快照的情况下通过静态检查；Release Workflow 必须使用兼容 Node.js 24 的 Actions。

### 实际结果

687,617,324 字节的 DMG 匹配 SHA-256 `022efb08fdda09afde12058a62f13bff34c84ddec79dea9d5b57698e2f7b55d9` 并以只读方式挂载。其中的 SDK 匹配 SHA-256 `2d11d9110828253f7dec63ba58d60b4e6dcbb5a6caa3c0650562f305fe640751`。打包 Host 以有界面模式启动 Google Chrome，通过全新隔离 Profile 导航到 `Published Fresh Profile`，并通过正常 Profile 导航到标题为 `Example Domain` 的 `https://example.com/`。27 项聚焦兼容性与刷新测试以及 21 项快速文档门禁全部通过；仓库 Lint 通过。实时 Dry-run 接受 Harbor 0.10.3 与当前 Oil Creator Commit，且没有修改已提交快照。

### 证据

- 操作前：0.3.21 Package 有托管构建证据，但尚未被独立下载和操作；刷新兼容性会从有效下限 Peer Range 中排除较新的预发布版本；桌面发布产生 3 个 Node.js 20 Action 警告。
- 执行中：检查 DMG 与 SDK Digest，通过全新与现有 Profile 操作挂载 Host，使用会拒绝较旧预发布版本的测试修正 SemVer 比较，并只更新受影响的桌面 Actions。
- 结果：可下载浏览器 Package 在受测 macOS Host 上可用，当前刷新候选通过静态检查，0.3.22 发布路径使用兼容 Node.js 24 的 Action Runtime。
- 失败与恢复：人为设置的临时 `HOME` 导致 Chrome 导航停滞；在真实 macOS Home 下隔离产品数据后重新执行全新 Profile 检查并通过，这与应用部署方式一致。首次通过 HTTPS 推送 Workflow 修改时缺少 GitHub `workflow` Scope；随后使用已认证 SSH 推送同一经过检查的 Commit，未重写历史。

### 范围限制

独立操作的 Package 是 0.3.21，其 Ego Browser Runtime 字节在 0.3.22 候选版本中没有变化。Tag CI 仍需构建并发布新版本。打包后 Tauri WebView 交互、真实网站登录、验证码与下载流程、非 Chrome 浏览器、Updater 安装、Apple Developer 签名与公证仍未验证。

## 交付状态

- 产品发布状态：等待 Annotated Tag 与 Tag GitHub Actions 工作流。
- 验证资料归档状态：源码、独立前序 DMG 操作、聚焦回归、刷新 Dry-run、文档与 Lint 证据在说明范围内已完成。
- 站点同步状态：发布前不适用；本维护版本除 Release 归档外不改变产品指南。
- 未验证范围：0.3.22 产物、打包后 Tauri WebView 交互、真实网站登录、验证码与下载流程、非 Chrome 浏览器、Updater 安装、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 验证场景记录日期、时区、Commit、环境、受测构建、证据来源、数据类型与服务类型。
- [x] 操作步骤、预期结果、实际结果、状态与范围限制符合实际观察。
- [x] 按价值保留操作前、执行中、结果、失败与恢复状态，不设置截图数量指标。
- [x] 明确标记仅测源码与未验证证据。
- [x] 本次不需要截图；有界命令结果、Hash 与来源记录可追溯。
- [x] 只跟踪脱敏副本；凭据、个人信息、私有内容与敏感原图均未进入归档。
- [x] 已在 `docs/releases/README.zh.md` 中添加版本条目，并确认两种语言内容一致。
- [x] 相对链接可以渲染，引用的每个本地文件都存在。
- [ ] Tag CI 已发布并独立提供 0.3.22 DMG、Updater 归档、签名、校验和及稳定 Updater Metadata。
- [ ] 公开发布页已链接本不可变归档。
- [ ] 已独立于 CI 与临时产物检查 0.3.22 公开目的地。
- [x] 未修改桌面 Shell Origin、Capability、Permission 或 Command；打包后 WebView 交互明确保留为未验证。
- [ ] 已记录发布后的文件名、版本、Hash、Updater Metadata 与安装后行为。
- [ ] 发布后稳定最新 Release 链接指向 0.3.22；网站同步仍不适用。
- [x] 分别报告产品发布状态、归档状态、网站状态与未验证范围。
- [x] 未移动或覆盖公开 Tag 与安装包；本次发布使用新版本。
