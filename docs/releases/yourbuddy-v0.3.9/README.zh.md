# YourBuddy 0.3.9

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.9 对 Better Sidebar 工作区、GPT Auth 与 macOS 紧凑窗口控制的恢复。

- 发布标识：`yourbuddy-v0.3.9`。
- 产品渠道：适用于 Apple Silicon macOS 的 YourBuddy 桌面应用。
- 归档状态：发布前候选版本；已记录本地源码与组装产品检查，公开产物与官网部署仍待完成。
- 发布源码：发布后记录不可变 Tag 与 Commit。
- 证据图集：最终组装产品 Smoke 生成的[主工作区截图](screenshots/workbench-primary.png)。
- 证据下载：公开产物核验后附加独立验证资料 ZIP。

## 面向用户的发布说明

### 改了什么

打开会话后，Better Sidebar 会再次占据可伸缩的桌面主工作区，不受此前底部面板折叠状态影响。GPT Auth 状态请求重新挂载到 Web Carrier，macOS 窗口控制按钮则使用展开后的侧边栏标题区，并保留紧凑回退。

### 解决了什么问题

打开会话后，桌面中间区域不再保持空白；GPT Auth 也不再出现 `Cannot read properties of undefined (reading 'get')` 加载失败。

### 在哪里使用

打开任意 YourBuddy 会话即可在中间工作区使用 Better Sidebar。通过**设置 → GPT Auth**查看登录状态，并在侧边栏标题区使用 macOS 原生窗口控制按钮。

### 如何体验

1. 打开已有会话或创建一个空白会话。
2. 确认 Better Sidebar 填满中间工作区，同时对话区仍位于右侧辅助栏。
3. 打开**设置 → GPT Auth**，确认状态页能正常加载且不再出现此前的传输或插件错误。

### 安装或升级

发布后，从 0.3.9 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。应用使用临时代码签名，尚未使用 Apple Developer 身份签名或公证，首次启动可能需要按文档执行 macOS 放行操作。在公开阶段补充记录之前，真实 OAuth、真实模型流量、原生 GUI 启动、打包 WebView 交互及旧版 Updater 安装仍未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 聚焦源码检查 | passed | 本地源码候选版本 | macOS 15.6.1 arm64；Node 22.22.3 | [本地验证记录](evidence/local-candidate-validation.txt) |
| 组装 Host 与浏览器 Smoke | 在记录的受控范围内通过 | 已准备的本地产品 | 受控本地 Host 与 Chromium；无模型供应商 | [本地验证记录](evidence/local-candidate-validation.txt) |
| 正式桌面发布 | not verified | 不可变 Tag | GitHub Actions | 待完成 |
| 公开安装包与 Updater | not verified | 公开 Release 产物 | GitHub Release | 待完成 |
| 官网同步 | not verified | 双语产品官网 | GitHub Pages | 待完成 |

## 场景：本地候选版本与组装产品验证

- 状态：在记录的受控范围内通过。
- 日期与时间：2026-09-20 16:50 UTC+08:00 CST。
- 发布版本与 Commit：`yourbuddy-v0.3.9`；本地证据记录候选 Commit，发布后替换为不可变 Tag Commit。
- 受测构建：本地源码候选版本与已准备的组装 Host/Client 产品。
- 环境：macOS 15.6.1 arm64；Node 22.22.3；pnpm 11.7.0；Rust 1.98.0；uv 0.12.5。
- 证据来源：本次发布实测。
- 数据：合成 Marketplace 元数据与隔离的空白会话。
- 模型或服务：受控本地服务；解析 Codex 模型目录时未发送模型请求。

### 操作步骤

1. 运行 Better Sidebar 展示方式与 Release Smoke 聚焦测试。
2. 准备内置 Harness、离线依赖 Store、受管工具链与 YourBuddy 运行时。
3. 启动组装后的 Host 与浏览器，创建并选择隔离的空白会话，然后执行桌面 Shell 旅程。
4. 验证 Better Sidebar Slot 几何、GPT Auth 状态路由、Codex 模型目录、插件市场、代理、外链与生命周期控制。

### 预期结果

选中的会话会让 Better Sidebar 填满主工作区，即使存储的底部面板处于折叠状态。GPT Auth 状态与 `openai-codex` 的 GPT-5.6 Sol 目录在不发送模型请求的前提下正常解析，同时现有桌面控制继续可用。

### 实际结果

聚焦检查与完整干净工作区 `prepare:release` 已在候选 Commit `0be8a931a2746718a4ca50335d2c9f68b2e45deb` 上通过。组装产品验证观察到 56 个内置运行时 Peer 与 6 个产品 Client 插件；Better Sidebar 填满 Slot，GPT Auth 状态通道与 Codex 目录正常解析，受控外链、插件市场、代理与应用生命周期路径全部通过。生成的 1680×1000 截图 SHA-256 为 `3968de85040592aa5a5ce140a62f7b63b070f3f388ab26a5d2432192072f60de`。

### 证据

- 操作前：用户提供的空白工作区截图来自本地桌面状态，因此不重新分发。
- 执行中：[本地候选验证记录](evidence/local-candidate-validation.txt)记录失败、诊断与恢复。
- 结果：[主工作区截图](screenshots/workbench-primary.png)记录完整干净工作区准备通过后，Better Sidebar 位于主工作区、对话位于辅助栏的布局。
- 失败与恢复：旧 Smoke 在会话创建前查找模型选择器。现在它改为查询与会话无关的 Host 模型目录，创建隔离空白会话、持久化其选择，并在没有模型流量的情况下验证真实 Slot 几何。

### 范围限制

受控浏览器 Smoke 不是打包后的原生 WebView，不能证明真实 OAuth、真实模型流量、Updater 安装、Apple Developer 签名、公证或线上官网交付。

## 交付状态

- 产品发布状态：待发布；尚未创建 `yourbuddy-v0.3.9` Tag、GitHub Release 或安装包。
- 验证资料归档状态：部分完成；已有本地证据，公开产物、运行时、工作流、官网与可下载 ZIP 记录仍待补充。
- 站点同步状态：待同步；在 0.3.9 公开产物完成独立核验前，已核验的 0.3.8 下载仍是官网权威版本。
- 未验证范围：公开安装包与 Updater 字节、Updater 签名、迁移后的打包运行时、原生 GUI 启动、打包 WebView 交互、旧版 Updater 安装、Apple Developer 签名与公证、OAuth、真实模型流量及线上官网部署。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 本地场景记录日期、时区、环境、受测构建、证据来源、数据类型及服务类型。
- [x] 明确标记仅测源码、合成数据、受控服务、待完成与未验证证据。
- [x] 已在双语发布索引中添加版本条目。
- [x] 已在提交后的候选版本上完成干净工作区准备与截图。
- [ ] 已独立核验公开发布页、安装包、Updater 元数据、签名与 Hash。
- [ ] 已完成双语官网同步并独立核验线上下载旅程。
- [ ] 已创建、上传、解压并核验可下载验证资料归档。
- [x] 已分别报告产品发布状态、验证资料归档状态、站点同步与未验证范围。
- [x] 未移动或覆盖公开 Tag 与安装包；本次修复使用新版本。
