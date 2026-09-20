# YourBuddy 0.3.8

[English](README.md) | 中文

本归档记录 0.3.8 的 DSH 0.1.5-rc.2 同步、产品插件刷新、YourBuddy 适配保留、本地候选版本检查与发布工作。

- 发布标识：`yourbuddy-v0.3.8`。
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：发布前草稿；已记录本地证据，公开发布证据仍待补充。
- Release 源码：不可变 Tag Commit 待生成。
- 证据图集：未截图；本次更新改变内置运行时与插件行为，不改变桌面 Shell 展示。
- 证据下载：等待公开产物核验。

## 面向用户的发布说明

### 改了什么

YourBuddy 内置官方 DeepSeek Harness `dsh-v0.1.5-rc.2` Release，并刷新 Better Sidebar、Harbor Evolution、Plugin Marketplace 与 Context Doctor，同时保留桌面工作区适配。

### 解决的问题

桌面包依赖较旧的 DSH 运行时和插件快照。本版本对齐它们的 Peer 版本、源码来源、网络行为与 Release Smoke，使组装产品使用同一组经过核验的依赖。

### 在哪里使用

这些变更覆盖整个 YourBuddy。Better Sidebar 继续作为桌面主工作区，对话区使用 DSH 原生右侧边栏，Plugin Marketplace 继续位于设置中。

### 如何体验

1. 打开 YourBuddy，在可调整宽度的对话区旁使用 Better Sidebar 工作区。
2. 打开**设置 → Plugin Marketplace**，选择仓库，观察通过核验的 npm Bundle 是否开放一键安装。
3. 打开**设置 → 通用设置 → 应用生命周期**，检查后续更新。

### 安装或升级

发布后，请从 0.3.8 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**检查更新**。在此之前，0.3.7 仍是已核验的公开下载版本。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。应用尚未使用 Apple Developer 身份签名或公证。Tag 前证据使用本地组装桌面 Shell 与受控服务；公开 DMG、安装后的 WebView、Updater 安装、OAuth 与真实模型流量需另行记录后才算完成核验。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| DSH 与产品准备 | 通过 | Tag 前本地源码候选版本 | macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0 | [本地候选版本验证](evidence/local-candidate-validation.txt) |
| 正式桌面发布 | 未核验 | 尚无公开 0.3.8 产品 | GitHub Release | 待补充 |
| 官网同步 | 未核验 | 公开站点仍描述 0.3.7 | GitHub Pages | 待补充 |

## 场景：DSH 与产品准备

- 状态：通过。
- 日期和时间：2026-09-20 12:01 UTC+08:00 CST。
- Release 与 Commit：`yourbuddy-v0.3.8`；Tag 与最终 Commit 待生成。
- 受测构建：内置 DSH `dsh-v0.1.5-rc.2`（`fb2c4b9e698e30edb738bca4cf0618587db7d203`）的本地源码候选版本。
- 环境：macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0；Rust 1.98.0；本地受控 Host 与浏览器 Smoke 服务。
- 证据来源：本次 Release 运行。
- 数据：Release Smoke 使用合成仓库与 npm 元数据。
- 模型或服务：受控本地服务；未使用模型供应商。

### 步骤

1. 同步选定的官方 DSH Release，物化已批准的产品插件版本与可重放 YourBuddy 补丁。
2. 运行产品刷新、Bundle、准备、组装 Host、代理、Marketplace、Better Sidebar 与 Release 版本检查。
3. 构建桌面候选版本并检查生成的应用产物。

### 预期结果

准备后的源码固定到一个 DSH Release，重放全部产品补丁，构建组装 Client 与 Host，保留 YourBuddy 工作区和 Marketplace 行为，并生成版本一致的桌面产物。

### 实际结果

产品适配在所选 Release 上完成 Rebase 后，准备流程和组装浏览器 Smoke 通过。最终版本检查与桌面产物构建已在打 Tag 前记录到链接证据中。

### 证据

- 操作前：未截图；上一版已核验公开状态归档于 [0.3.7](../yourbuddy-v0.3.7/README.zh.md)。
- 执行中：[本地候选版本验证](evidence/local-candidate-validation.txt)保留命令与恢复摘要。
- 结果：[本地候选版本验证](evidence/local-candidate-validation.txt)保留命令输出摘要与产物清单。
- 失败与恢复：[本地候选版本验证](evidence/local-candidate-validation.txt)保留相关记录；恢复期间未创建 Release Tag 或公开产物。

### 范围限制

此场景只证明本地源码候选版本与受控组装 Shell，不证明公开安装包、安装后的 DMG WebView、从旧版本执行 Updater 安装、Apple 签名与公证、OAuth 或真实模型流量。

## 交付状态

- 产品发布状态：待发布；尚无 0.3.8 Tag、GitHub Release 或公开安装包。
- 验证资料归档状态：部分完成；已包含 Tag 前归档与本地证据，公开产物与工作流证据仍待补充。
- 官网同步状态：待同步；在 0.3.8 产物发布并核验前，已核验官网继续展示 0.3.7。
- 未核验范围：公开文件与 Hash、Updater 签名与稳定元数据、原生启动、安装后 DMG 交互、Updater 安装、Apple 签名与公证、OAuth、真实模型流量及线上官网更新。

## 交付清单

- [x] 发布标识与全部版本来源符合现有渠道流程。
- [x] 开头说明回答了改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 本地场景记录了日期、时区、Commit 状态、环境、受测构建、证据来源、数据类型与服务类型。
- [x] 步骤、预期结果、实际结果、状态与范围限制符合本地观察。
- [x] 仅源码、受控服务、待补充与未核验证据均已明确标记。
- [x] Release 条目已加入 `docs/releases/README.md`，两种语言保持一致。
- [ ] 公开 Release 页面、可下载归档、安装包、Updater 元数据与 Hash 已独立核验。
- [ ] 官网已完成双语同步，线上下载路径已独立核验。
- [x] 产品发布、资料归档、官网同步与未核验范围已分别报告。
- [x] 未移动或覆盖任何已发布 Tag 或安装包。
