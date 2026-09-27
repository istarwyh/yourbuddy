# YourBuddy 0.3.19

[English](README.md) | 中文

本归档记录 Ego Browser 默认集成，以及发布前完成的源码验证。

- 发布标识：`yourbuddy-v0.3.19`。
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选版本；源码验证已完成，Tag CI 负责发布产物。
- 证据 Commit：由 `yourbuddy-v0.3.19` 标记的不可变 Commit。
- 证据图集：未采集；打包后 WebView 交互仍未验证。
- 证据下载：`yourbuddy-v0.3.19` 的不可变源码；公开安装包等待 Tag CI 发布。

## 面向用户的发布说明

### 改了什么

YourBuddy 现在把经过检查的 `dsh-ego-browser` 0.8.5 插件作为离线默认项。本版本也包含 0.3.18 之后加入的 Oil Creator 工作台操作反馈修复和自动化候选版本准备流程。

### 解决了什么问题

全新安装的 YourBuddy 无需另外通过 GitHub 或 npm 安装，即可提供浏览器工具和 Agent Browser 界面。工作台状态变化时，Oil Creator 操作也会保留可靠的可见反馈。

### 在哪里使用

让 Agent 打开或操作网站。Ego Browser 通过 Better Sidebar 显示，并使用本机已安装且兼容的 Chrome、Chromium、Brave 或 Edge。

### 如何体验

新建 Session，让 Agent 打开一个网站。首次执行 `ego_*` 浏览器动作后，后端浏览器会启动并显示实时 Agent Browser 标签页。

### 安装或升级

Tag CI 发布产物后，从 0.3.19 GitHub Release 安装 Apple Silicon DMG；旧版也可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

目标系统仍为 Apple Silicon 上的 macOS 11 或更高版本。现有 YourBuddy 数据无需迁移。Ego Browser 不包含 Chromium 和可选 FFmpeg 下载；浏览器自动化仍可能遇到登录失效、人机验证和站点专用控件。应用尚未使用 Apple Developer 身份签名或公证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 产品集成聚焦验证 | 通过 | 源码候选版本 | macOS 15.6.1 arm64、Node.js 22.19.0、pnpm 11.7.0 | 54 项 Node 测试、6 项 Rust Overlay 测试、13 项离线测试 |
| 文档与 Lint | 通过 | 源码候选版本 | 相同本地环境 | 43 项文档门禁和仓库 Lint 通过 |
| 正式桌面发布 | 等待中 | `yourbuddy-v0.3.19` | GitHub Actions macOS arm64 | Tag CI 负责构建、打包后 Runtime 冒烟、校验和、Updater Metadata 与上传 |

## 场景：Ego Browser 默认源码集成

- 状态：源码层面通过；打包产物验证等待中。
- 日期与时间：`2026-09-27 17:43 +0800 CST`。
- 发布版本与 Commit：`yourbuddy-v0.3.19`；Annotated Tag 指向的 Commit。
- 受测构建：创建 Annotated Tag 前的源码候选版本。
- 环境：macOS 15.6.1 arm64、Node.js 22.19.0、pnpm 11.7.0，以及 `$HOME/.cargo/bin` 中的 Rust Toolchain。
- 证据来源：本次发布过程。
- 数据：合成测试 Fixture 和已提交的产品快照；不含用户数据。
- 模型或服务：未使用模型 Provider；GitHub 分支解析测试使用公开 GitHub API。

### 操作步骤

1. 验证固定的 Ego Browser 来源记录、兼容性 Metadata、Bundle 依赖闭包、Overlay 挂载和组装后的 Client 响应。
2. 运行完整文档同步、仓库 Lint、Rust Overlay 测试与离线准备测试。

### 预期结果

经过检查的 Ego Browser 快照无需 Registry 安装即可解析，只作为默认项挂载一次，在用户启用自行安装的 Bundle 时让其优先，并保持候选版本可离线复现。

### 实际结果

54 项聚焦 Node 测试、6 项 Rust Overlay 测试、13 项离线测试、43 项文档门禁和仓库 Lint 均通过。快照与兼容性 Validator 接受 `dsh-ego-browser` 0.8.5 与随附 DSH 0.1.7-rc.2 Package 的组合。

### 证据

- 操作前：YourBuddy 已内置 Better Sidebar，但没有内置 Ego Browser。
- 执行中：在源码候选版本中检查了快照、不可变来源记录、Peer Override、离线 Lock 条目、Overlay Fallback、重复挂载保护和双语文档。
- 结果：产品聚焦验证、Rust、离线、文档与 Lint 检查均成功完成。
- 失败与恢复：首次 Peer Range 验证拒绝解析预发布 DSH 版本；记录精确版本、经过检查的 Peer Metadata Override 后，兼容性与快照检查通过。

### 范围限制

这些检查不能确认原生 App 启动、打包后 WebView 交互、真实网站登录行为、Updater 安装、Apple Developer 签名、公证或公开 0.3.19 产物可用性。Tag CI 和发布后检查负责记录这些结果。

## 交付状态

- 产品发布状态：等待 Annotated Tag 和 Tag GitHub Actions 工作流。
- 验证资料归档状态：所述范围内的源码证据已完成，并包含在候选 Commit 中。
- 站点同步状态：单次发布不适用；产品指南已经更新，官网使用稳定的最新 Release 链接。
- 未验证范围：原生启动、打包后 WebView 交互、真实网站登录行为、Updater 安装、公开产物下载、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 两种语言均记录用户说明、安装路径、兼容性、迁移与限制。
- [x] 源码检查标明环境、候选版本、数据、服务、结果与限制。
- [x] 两种语言的索引均包含发布条目和不可变归档链接。
- [x] 文档配对、链接、Lint、产品聚焦测试、Rust Overlay 测试与离线测试通过。
- [ ] Tag CI 已发布并独立提供 DMG、Updater 归档、签名、校验和及稳定 Updater Metadata。
- [ ] 已独立下载公开 DMG，并在打包后 WebView 中完成操作。
- [x] 未移动或覆盖任何公开 Tag 或安装包。
