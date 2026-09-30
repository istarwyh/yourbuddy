# YourBuddy 0.4.0

[English](README.md) | 中文

本归档记录 Bootstrap 发布渠道、发布前检查以及 0.4.0 接受的验证范围限制。

- 发布标识：`yourbuddy-v0.4.0`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选版本；公开制品与网站同步等待 Tag Workflow。
- 证据 Commit：实施 Commit `570f71653d`；Release Tag 固定完整候选版本。
- 证据图集：不适用；没有录制打包后 WebView 交互。
- 证据下载：发布后使用 [YourBuddy 0.4.0 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.0)。

## 面向用户的发布说明

### 改了什么

推荐的 macOS 下载现在是小型 Bootstrap DMG。精确的 Harness、Node、pnpm Store 与 Harbor 组件随同一个 Release 发布，另有独立命名的 Offline DMG 携带同一组组件。设置新增显式的 **安装 Harbor 运行时** 操作，Pomodoro 默认内置，打开 Session 时工作台会自动收起，为会话提供更多空间。

### 解决了什么问题

旧版本会向所有用户传输完整 Node、Store、Harness 与 Python Runtime，即使宿主已经拥有可复用内容。Bootstrap 路径保持签名应用轻量，复用兼容的本地资源，并只在用户明确请求后安装 Harbor。

### 在哪里使用

普通联网安装选择 Bootstrap DMG；首次启动必须离线时选择更大的 Offline DMG。在安装 Python Runtime 之前，Harbor 能力仍可被发现。

### 如何体验

安装 Bootstrap DMG 并打开 YourBuddy。首次启动会解析签名 Harness 组件，尽量复用兼容的 Host Node 与普通 pnpm Store，只在必要时下载固定 Fallback。若要启用 Harbor，请打开**设置 → 通用设置 → 应用生命周期**并选择**安装 Harbor 运行时**。

### 安装或升级

从 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查并更新**。现有设置、凭据、Session、Workspace 数据与组件 Cache 继续位于原有应用数据根目录。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon。Bootstrap 首次启动需要访问对应 GitHub Release，除非所需组件已在 Cache 中；Offline 内嵌固定组件。应用仍未使用 Apple Developer Identity 签名，也未公证。本地检查没有覆盖正式签名的公开 DMG、打包后 WebView Control、组件传输中取消或断网启动 Offline。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Bootstrap 体积与资源分离 | 本地通过 | 使用 0.4.0 组件输入的未签名 0.3.24 开发 Shell | macOS Apple Silicon | Bootstrap DMG 为 10,892,640 字节；通过含 30,000,000 字节上限 |
| 组件与桌面集成 | 通过 | 0.4.0 候选源码 | macOS Apple Silicon、Node 24、pnpm 11.7.0、Rust | 聚焦组件、Updater、Bridge、Personal Workbench、Cargo、Lint、Typecheck 与 21 项文档门禁 |
| 搬移后的 Harbor Runtime | 本地通过 | 生成的 Harbor 组件 | macOS Apple Silicon | 搬移后 `harbor --version` 返回 0.21.0，`harbor-dsh --help` 成功 |
| 正式发布 0.4.0 | 等待 | `yourbuddy-v0.4.0` | GitHub Actions macOS arm64 | 提交候选归档时尚未启动 Tag Workflow |

## 场景：Bootstrap 组件装配

- 状态：在说明的本地范围内通过。
- 日期与时间：2026-10-01 01:30 CST（UTC+08:00）。
- 发布版本与 Commit：包含实施 Commit `570f71653d` 的 `yourbuddy-v0.4.0` 候选版本。
- 受测构建：本地构建的未签名开发 DMG 与生成的 0.4.0 组件 Archive。
- 环境：macOS Apple Silicon、pnpm 11.7.0、本地 Rust 与 Node Toolchain。
- 证据来源：本次发布准备中的聚焦本地构建、组件生成、测试与仓库门禁。
- 数据：生成的应用与 Runtime 文件；不含私有用户数据。
- 模型或服务：确定性本地构建与测试；没有模型调用。

### 操作步骤

1. 构建应用 Shell 与 DMG，执行 30,000,000 字节门槛，生成精确 Runtime 组件 Archive，并检查链接布局。
2. 运行聚焦的 Client、Bridge、Updater、组件管理器、Store 选择、搬移 Harbor、文档、Lint 与 Type Check。

### 预期结果

Bootstrap DMG 不超过硬上限，且不包含 Harness、Node、pnpm Store、Harbor 与 Offline Seed。组件 Metadata 选择精确 Release Asset；普通启动不安装 Harbor；显式设置操作使用同一个原生 Manager。

### 实际结果

本地 Bootstrap DMG 为 10,892,640 字节。组件与 Updater 测试通过，55 个 Personal Workbench 测试通过，Rust 组件与用户 Store 选择测试通过，原生编译通过，搬移后的 Harbor 命令成功，Lint、Typecheck 与全部 21 项快速文档门禁通过。第一次本地应用构建只因 Updater 签名需要 CI 持有的私钥而停止；单独打包 DMG 成功。

### 证据

- 操作前：默认 DMG 内嵌完整 Harness、Node Archive、离线 Store 与 Harbor Python Runtime。
- 执行中：首次组件构建暴露 Node 与 Harbor 内部符号链接；Node 链接被物化，Harbor 只保留组件内部的安全相对链接，随后重新构建通过。
- 结果：发布 Workflow 现在从同一签名组件 Manifest 构建 Bootstrap 与 Offline DMG，发布组件 Archive 与 Hash，并只让 `latest.json` 指向 Bootstrap Updater Archive。
- 失败与恢复：预期内的本地 Updater 签名失败被限定为缺少 Release 私钥；正式签名与发布由 CI 负责。

### 范围限制

公开 Workflow、签名制品、匿名下载、稳定 Updater Metadata、网站页面、打包后首次启动、Offline 无网络路径、传输取消与打包后 Harbor 按钮等待 Tag 后验证。

## 交付状态

- 产品发布状态：等待 `yourbuddy-v0.4.0` Tag Workflow。
- 验证资料归档状态：发布前源码与本地构建证据完整；公开制品证据仍等待验证。
- 站点同步状态：双语下载指南已改变，因此等待同步。
- 未验证范围：正式签名与发布、公开下载与 Hash、稳定 Updater 选择、打包后启动与 WebView Control、Offline 无网络启动、传输取消、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装、升级、兼容性、迁移与已知限制。
- [x] 本地验证场景记录时间、候选 Commit、环境、受测构建、证据来源、数据与服务类型。
- [x] 本地步骤、预期结果、实际结果、状态和范围限制符合实际检查。
- [x] 已明确标记仅测源码与未验证声明。
- [x] 已在双语索引中添加 Release 条目，并确认两种语言内容一致。
- [ ] 公开文件、Hash、Updater Metadata、稳定 Latest Release 目的地与网站页面需要 Tag 后验证。
- [ ] 打包后 WebView Control 与 Offline 无网络行为需要发布后操作。
- [x] 未移动或覆盖任何现有公开 Tag 或安装包。
