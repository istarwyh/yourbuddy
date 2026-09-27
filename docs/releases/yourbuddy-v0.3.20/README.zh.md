# YourBuddy 0.3.20

[English](README.md) | 中文

本归档记录 Ego Browser 默认集成，以及修正后的干净 Checkout 产品快照 Hash。

- 发布标识：`yourbuddy-v0.3.20`。
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已发布；发布后观察结果记录在 `master`。
- 证据 Commit：由 `yourbuddy-v0.3.20` 标记的不可变 Commit。
- 证据图集：未采集；打包后 WebView 交互仍未验证。
- 证据下载：[公开 0.3.20 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.20)，包含 5 个产物。

## 面向用户的发布说明

### 改了什么

YourBuddy 现在把经过检查的 `dsh-ego-browser` 0.8.5 插件作为离线默认项。本修正版本记录已提交插件快照的 Hash；0.3.19 干净 Checkout 构建拒绝了一个受本地忽略构建输出污染的 Hash。

### 解决了什么问题

全新安装的 YourBuddy 无需另外通过 GitHub 或 npm 安装，即可提供浏览器工具和 Agent Browser 界面。修正后的来源记录让相同的已提交字节能通过本地与托管发布组装。

### 在哪里使用

让 Agent 打开或操作网站。Ego Browser 通过 Better Sidebar 显示，并使用本机已安装且兼容的 Chrome、Chromium、Brave 或 Edge。

### 如何体验

新建 Session，让 Agent 打开一个网站。首次执行 `ego_*` 浏览器动作后，后端浏览器会启动并显示实时 Agent Browser 标签页。

### 安装或升级

Tag CI 发布产物后，从 0.3.20 GitHub Release 安装 Apple Silicon DMG；旧版也可以使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

目标系统仍为 Apple Silicon 上的 macOS 11 或更高版本。现有 YourBuddy 数据无需迁移。Ego Browser 不包含 Chromium 和可选 FFmpeg 下载；浏览器自动化仍可能遇到登录失效、人机验证和站点专用控件。应用尚未使用 Apple Developer 身份签名或公证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 产品集成聚焦验证 | 通过 | 源码候选版本 | macOS 15.6.1 arm64、Node.js 22.19.0、pnpm 11.7.0 | 54 项 Node 测试、6 项 Rust Overlay 测试、13 项离线测试 |
| 干净快照验证 | 通过 | 已提交源码候选版本 | 本地干净产品目录 | `dsh-ego-browser` 来源记录匹配 `dc8203c572c5a2736653f352b8d971301dfdc8c51e0941a37e104ff5cfb3e928` |
| 文档与 Lint | 通过 | 源码候选版本 | 相同本地环境 | 43 项文档门禁和仓库 Lint 通过 |
| 正式桌面发布 | 通过 | `yourbuddy-v0.3.20` | GitHub Actions macOS arm64 | 工作流 `36311318965` 完成构建、冒烟、校验、签名并上传 5 个产物 |

## 场景：修正后的 Ego Browser 来源集成

- 状态：源码层面通过；打包产物验证等待中。
- 日期与时间：`2026-09-27 17:58 +0800 CST`。
- 发布版本与 Commit：`yourbuddy-v0.3.20`；Annotated Tag 指向的 Commit。
- 受测构建：创建 Annotated Tag 前已提交的源码候选版本。
- 环境：macOS 15.6.1 arm64、Node.js 22.19.0、pnpm 11.7.0，以及 `$HOME/.cargo/bin` 中的 Rust Toolchain。
- 证据来源：本次发布过程与失败的 0.3.19 工作流 `36310499165`。
- 数据：合成测试 Fixture 和已提交的产品快照；不含用户数据。
- 模型或服务：未使用模型 Provider；GitHub 分支解析测试使用公开 GitHub API。

### 操作步骤

1. 删除被忽略的本地 Ego Browser 构建输出，记录已提交快照的 Hash，并针对干净产品目录验证来源记录。
2. 验证兼容性 Metadata、Bundle 依赖闭包、Overlay 挂载、组装后的 Client 响应、文档、Rust Overlay 行为与离线准备。

### 预期结果

经过检查的 Ego Browser 快照无需 Registry 安装即可解析，只作为默认项挂载一次，在用户启用自行安装的 Bundle 时让其优先，并且本地与托管干净 Checkout 得到相同 Hash。

### 实际结果

干净的已提交快照与修正后的来源记录匹配。集成通过 54 项聚焦 Node 测试、6 项 Rust Overlay 测试、13 项离线测试、43 项文档门禁和仓库 Lint。随后工作流 `36311318965` 构建 App 与 DMG，通过迁移 Runtime 冒烟和校验和验证，并发布 5 个产物。后续首次使用报告确认该 Smoke 没有调用浏览器 Host：macOS 路径要求 Linux Xvfb，且干净快照遗漏了被忽略的 SDK Runtime。

### 证据

- 操作前：0.3.19 源码检查所在工作区包含被忽略的 `runtime/ego-browser/dist/` 字节，托管干净 Checkout 在产物发布前拒绝了已记录 Hash。
- 执行中：删除被忽略的构建输出，重新计算并验证已提交 Tree Hash。
- 结果：[工作流 `36311318965`](https://github.com/istarwyh/yourbuddy/actions/runs/36311318965)发布 `latest.json`、`SHA256SUMS.txt`、Updater 归档及签名与 Apple Silicon DMG；稳定 Updater Manifest 报告 0.3.20。
- 失败与恢复：工作流 `36310499165` 没有发布产物，并保留 0.3.19 Tag 而没有移动它；新的 0.3.20 工作流完成发布。

### 范围限制

工作流确认迁移后的 Host 启动与公开产物可用，但没有确认 Ego Browser 启动。该版本的 Agent Browser 在 macOS 上不可用，并由 0.3.21 取代。交互式原生 App 启动、打包后 WebView 交互、真实网站登录行为、Updater 安装、Apple Developer 签名与公证均未确认；发布后也没有独立下载体积较大的 DMG。

## 交付状态

- 产品发布状态：已发布为 `yourbuddy-v0.3.20`，包含 5 个公开产物与稳定 Updater Metadata；其无法使用的 macOS Agent Browser 由 0.3.21 取代。
- 验证资料归档状态：不可变源码包含在 Tag 中；发布后观察结果记录在 `master`。
- 站点同步状态：产品指南已由工作流 `36310499295` 成功部署；中英文插件页面与稳定最新 Release 链接均返回 HTTP 200。
- 未验证范围：独立完整 DMG 下载、交互式原生启动、打包后 WebView 交互、真实网站登录行为、Updater 安装、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 两种语言均记录用户说明、安装路径、兼容性、迁移与限制。
- [x] 已记录失败的不可变 0.3.19 Tag 以及通过新版本完成的恢复。
- [x] 已提交快照 Hash 在没有本地忽略输出时通过来源记录验证。
- [x] 文档、Lint、产品聚焦测试、Rust Overlay 测试与离线测试通过。
- [x] Tag CI 已发布并独立提供 DMG、Updater 归档、签名、校验和及稳定 Updater Metadata。
- [ ] 未独立下载公开 DMG，也未在打包后 WebView 中完成操作。
- [x] 未移动或覆盖任何公开 Tag 或安装包。
