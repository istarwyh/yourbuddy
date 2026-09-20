# YourBuddy 0.3.8

[English](README.md) | 中文

本归档记录 0.3.8 的 DSH 0.1.5-rc.2 同步、产品插件刷新、YourBuddy 适配保留、正式发布与公开产物独立核验。

- 发行标识：`yourbuddy-v0.3.8`。
- 产品通道：面向 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：公开产品已核验；网站部署与可下载验证归档待完成。
- 发行源码：不可变 Tag `yourbuddy-v0.3.8`，Commit 为 `9c99a88d1d1b43c35ab922a90e8c409bdc3de06f`。
- 证据画廊：未采集；本次更新改变内置运行时与插件行为，不改变桌面 Shell 展示。
- 证据下载：等待最终网站核验。

## 用户发行说明

### 变化内容

YourBuddy 内置官方 DeepSeek Harness `dsh-v0.1.5-rc.2`，以及 Better Sidebar 0.19.1、Harbor Evolution 0.9.7、Plugin Marketplace 0.3.3 与 Context Doctor 0.7.2。产品保留可重放且带 Hash 的适配。

### 解决的问题

桌面应用与插件使用同一组版本对齐的依赖。Better Sidebar 使用 DSH 原生右侧栏，同时保留 YourBuddy 主工作区；Marketplace 仅接受明确关联所选代码仓库且声明 DSH Bundle 补丁的唯一 npm 包。

### 使用位置

这些变化作用于整个 YourBuddy。Better Sidebar 仍是桌面主工作区，对话使用 DSH 原生右侧栏，Plugin Marketplace 继续位于设置中。

### 体验方式

1. 打开 YourBuddy，在可调整宽度的对话区旁使用 Better Sidebar 工作区。
2. 打开**设置 → 插件市场**，选择代码仓库，查看经过核验的 npm Bundle 是否启用一键安装。
3. 打开**设置 → 通用设置 → 应用生命周期**，检查后续更新。

### 安装或升级

安装 [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.8/yourbuddy-0.3.8-macos-arm64.dmg)；它由 [0.3.8 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.8) 提供。旧版 YourBuddy 也可使用**检查更新**。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。桌面应用支持 Apple Silicon 上的 macOS 11 或更高版本。应用具有有效的 ad-hoc 签名，但未完成 Apple Developer 签名或公证，因此 Gatekeeper 默认信任评估会拒绝它。原生 GUI 启动、安装包 WebView 交互、从旧版实际执行更新、OAuth 与真实模型流量仍未验证。

## 验证摘要

| 场景 | 状态 | 被测构建 | 环境 | 证据 |
|---|---|---|---|---|
| DSH 与产品准备 | 通过 | 本地源码候选 | macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0 | [本地验证](evidence/local-candidate-validation.txt) |
| 正式桌面发布 | 通过 | 不可变 Tag `yourbuddy-v0.3.8` | GitHub Actions | [工作流记录](evidence/release-workflows.txt) |
| 公开安装包与 Updater | 在记录范围内通过 | 五个匿名公开下载 | GitHub Release；macOS 15.6.1 arm64 | [产物记录](evidence/public-artifact-stage.json) |
| 公开 App 与迁移运行时 | 在记录范围内通过 | Updater 归档与 DMG | macOS 15.6.1 arm64 | [运行时记录](evidence/public-runtime-stage.json) |
| 网站同步 | 待完成 | 源码已更新，线上部署未检查 | GitHub Pages | 待补充 |

## 场景：DSH 与产品准备

- 状态：通过。
- 日期与时间：2026-09-20 12:01 UTC+08:00 CST。
- 发行与 Commit：`yourbuddy-v0.3.8`；最终 Tag Commit 为 `9c99a88d1d1b43c35ab922a90e8c409bdc3de06f`。
- 被测构建：本地源码候选，DSH 为 `dsh-v0.1.5-rc.2`、Commit 为 `fb2c4b9e698e30edb738bca4cf0618587db7d203`。
- 环境：macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0；Rust 1.98.0；受控本地 Host 与浏览器 Smoke 服务。
- 证据来源：本次发行操作。
- 数据：Release Smoke 使用的合成代码仓库与 npm 元数据。
- 模型或服务：受控本地服务；未使用模型供应商。

### 步骤

1. 同步所选官方 DSH Release，物化已确认的产品插件版本与可重放 YourBuddy 补丁。
2. 运行产品刷新、Bundle、准备、组装 Host、代理、Marketplace、Better Sidebar 与发行版本检查。
3. 构建桌面发行候选并检查生成的应用产物。

### 预期

准备后的源码固定一个 DSH Release，重放全部产品补丁，构建组装后的 Client 与 Host，保留 YourBuddy 工作区和 Marketplace 行为，并输出版本一致的桌面产物。

### 实际

产品适配应用到所选 Release 后，准备与组装浏览器 Smoke 通过。标准本地构建执行至 Updater 签名，因为私钥只存在于 GitHub Actions 而停止；关闭 Updater 产物后构建出有效本地 DMG。聚焦代理测试无论在并发负载下还是单独执行都在五秒期限超时；对应包源码未变化，正式发行工作流也不依赖该本地结果。

### 证据与范围限制

[本地候选验证](evidence/local-candidate-validation.txt)记录命令、恢复过程、产物列表与准确的本地限制。本场景不证明公开安装包、安装后 DMG WebView、Updater 实际升级、Apple 签名或公证、OAuth 或真实模型流量。

## 场景：正式发布与公开产物

- 状态：在记录范围内通过。
- 发布工作流：[GitHub Actions Run 35490674447](https://github.com/istarwyh/yourbuddy/actions/runs/35490674447)，18 分 4 秒成功完成。
- Release：[YourBuddy 0.3.8](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.8)，发布于 `2026-09-20T05:20:13Z`。
- 证据来源：发行工作流与独立匿名下载。
- 模型或服务：GitHub Actions 与 GitHub Release；未使用模型供应商。

五个产物全部在未使用 GitHub 认证的情况下下载。三条校验和全部通过，每个摘要都与 GitHub API 一致，稳定 Updater Manifest 与版本化产物字节相同。`minisign-verify` 0.2.5 使用不可变 Tag 中的公钥验证了 Updater 归档的预哈希签名与受信注释。DMG 大小为 568,380,375 字节，SHA-256 为 `fb67f762ce15e86a98b080003729e93bab7b304c940ff90f0fc2d6535e1b8f7d`。

Updater 归档与 DMG 都包含 YourBuddy 0.3.8，Bundle Identifier 为 `io.github.istarwyh.yourbuddy`。严格代码签名验证通过；Gatekeeper 拒绝 ad-hoc 且未公证的 App。公开资源记录 DSH 0.1.5-rc.2、Better Sidebar 0.19.1、Harbor Evolution 0.9.7、Plugin Marketplace 0.3.3 与 Context Doctor 0.7.2。将运行时复制到 App 外并让原 Python Home 不可用后，Harbor 报告 0.21.0，`harbor-dsh --help` 通过。

修正后的 Master CI Run 在打 Tag 前通过所有已观察的托管 Job。Linux 与 Windows 自托管备用 Drill 因没有匹配 Runner 接收而一直排队，因此整体工作流没有完成。正式发行工作流独立通过所选 DSH 检查、构建、桌面 Host 与 Shell 测试、迁移运行时测试、校验和、Updater Manifest 与发布步骤。详见[工作流记录](evidence/release-workflows.txt)、[产物记录](evidence/public-artifact-stage.json)与[运行时记录](evidence/public-runtime-stage.json)。

## 交付状态

- 产品发布状态：已在 [YourBuddy 0.3.8](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.8) 发布并完成独立核验。
- 验证归档状态：部分完成；本地、工作流、公开产物与运行时证据已提交，可下载归档与网站证据待补充。
- 网站同步状态：中英文源码已更新；线上部署与下载路径待核验。
- 未验证范围：原生 GUI 启动、安装包 WebView 交互、从旧版实际执行更新、Apple Developer 签名与公证、OAuth、真实模型流量、自托管备用 CI Drill 与线上网站更新。

## 交付检查清单

- [x] 发行标识与全部版本来源符合现有通道流程。
- [x] 开头说明回答变化内容、解决的问题、使用位置与体验方式。
- [x] 安装或升级、兼容性、迁移与已知限制已经说明。
- [x] 本地与公开场景记录时间、Commit、环境、被测构建、证据来源、数据类型和服务类型。
- [x] 步骤、预期、实际、状态与范围限制符合实际观察。
- [x] 仅源码、受控服务、待完成与未验证证据均有明确标识。
- [x] 发行条目已加入 `docs/releases/README.zh.md`，中英文保持一致。
- [x] 公开 Release 页面、安装包、Updater 元数据、签名与 Hash 已独立核验。
- [ ] 网站已同步中英文，线上下载路径已独立核验。
- [ ] 可下载验证归档已创建、上传并核验。
- [x] 产品发布、归档状态、网站同步与未验证范围分开报告。
- [x] 未移动或覆盖任何已发布 Tag 或安装包。
