# YourBuddy 0.3.9

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.9 对 Better Sidebar 工作区、GPT Auth 与 macOS 紧凑窗口控制的恢复。

- 发布标识：`yourbuddy-v0.3.9`。
- 产品渠道：适用于 Apple Silicon macOS 的 YourBuddy 桌面应用。
- 归档状态：在声明限制内已完成；产品发布、公开产物核验、官网部署与可下载验证归档均已记录。
- 发布源码：不可变 Tag `yourbuddy-v0.3.9`，Commit 为 `549011d29d7abd1b31e9f0e57047312ef5eb7b7b`。
- 证据图集：最终组装产品 Smoke 生成的[主工作区截图](screenshots/workbench-primary.png)。
- 证据下载：[yourbuddy-v0.3.9-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.9/yourbuddy-v0.3.9-verification.zip)，70,597 字节，SHA-256 为 `d1ea414355bc85edaee249525f7e54c13dba10c6fdff1ee341f99a489f13208a`。

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

从 [0.3.9 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.9) 安装 [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.9/yourbuddy-0.3.9-macos-arm64.dmg)，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。应用使用临时代码签名，尚未使用 Apple Developer 身份签名或公证，首次启动可能需要按文档执行 macOS 放行操作。在公开阶段补充记录之前，真实 OAuth、真实模型流量、原生 GUI 启动、打包 WebView 交互及旧版 Updater 安装仍未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 聚焦源码检查 | passed | 本地源码候选版本 | macOS 15.6.1 arm64；Node 22.22.3 | [本地验证记录](evidence/local-candidate-validation.txt) |
| 组装 Host 与浏览器 Smoke | 在记录的受控范围内通过 | 已准备的本地产品 | 受控本地 Host 与 Chromium；无模型供应商 | [本地验证记录](evidence/local-candidate-validation.txt) |
| 正式桌面发布 | passed | 不可变 Tag `yourbuddy-v0.3.9` | GitHub Actions | [工作流记录](evidence/release-workflows.txt) |
| 公开安装包与 Updater | 在记录范围内通过 | 五个匿名公开下载 | GitHub Release；macOS 15.6.1 arm64 | [产物记录](evidence/public-artifact-stage.json) |
| 公开 App 与迁移运行时 | 在记录范围内通过 | Updater 归档与 DMG | macOS 15.6.1 arm64 | [运行时记录](evidence/public-runtime-stage.json) |
| 官网同步 | passed | 源码 Commit `28b5bda281ff5775b96e8fee63817c1c41540b75` 对应的双语产品官网 | GitHub Pages | [部署记录](evidence/website-deployment.txt) |
| 公开验证归档 | passed | 匿名公开下载 | GitHub Release | [归档记录](evidence/verification-archive.txt) |

## 场景：本地候选版本与组装产品验证

- 状态：在记录的受控范围内通过。
- 日期与时间：2026-09-20 16:50 UTC+08:00 CST。
- 发布版本与 Commit：`yourbuddy-v0.3.9`；最终 Tag Commit 为 `549011d29d7abd1b31e9f0e57047312ef5eb7b7b`。
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

## 场景：正式发布与公开产物

- 状态：在记录范围内通过。
- 发布工作流：[GitHub Actions Run 35501402740](https://github.com/istarwyh/yourbuddy/actions/runs/35501402740)，18 分 28 秒成功完成。
- Release：[YourBuddy 0.3.9](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.9)，发布于 `2026-09-20T09:24:32Z`。
- 证据来源：发布工作流与独立匿名下载。
- 模型或服务：GitHub Actions 与 GitHub Release；未使用模型供应商。

五个版本化产物和稳定 Updater Manifest 全部在未使用 GitHub 认证的情况下下载。三条校验和全部通过，每个摘要都与 GitHub API 一致，稳定 Updater Manifest 与版本化产物字节相同。`minisign-verify` 0.2.5 使用不可变 Tag 中的公钥验证了 Updater 归档的预哈希签名与受信注释。DMG 大小为 568,361,631 字节，SHA-256 为 `fea29a4eedef1417dfb4d66d657c5bf24444da7cab07f387efa505dca00bd7b0`；`hdiutil verify` 通过。

Updater 归档与 DMG 包含字节一致的 YourBuddy 0.3.9 App 树，Bundle Identifier 为 `io.github.istarwyh.yourbuddy`，可执行文件为 arm64。严格代码签名验证通过；Gatekeeper 拒绝 ad-hoc 且未公证的 App。公开资源记录 DSH 0.1.5-rc.2、Better Sidebar 0.19.1、Codex Auth 0.3.2、Harbor Evolution 0.9.7、Plugin Marketplace 0.3.3 与 Context Doctor 0.7.2。将运行时复制到 App 外并让原 Python Home 不可用后，Harbor 报告 0.21.0，`harbor-dsh --help` 通过。

正式工作流通过版本对齐、所选 DSH 检查、Harness 与桌面构建、桌面 Host 与 Shell 测试、迁移运行时测试、校验和、Updater Manifest 生成与发布。详见[工作流记录](evidence/release-workflows.txt)、[产物记录](evidence/public-artifact-stage.json)与[运行时记录](evidence/public-runtime-stage.json)。

## 场景：官网部署与线上下载旅程

- 状态：passed。
- 官网工作流：[GitHub Actions Run 35502991471](https://github.com/istarwyh/yourbuddy/actions/runs/35502991471)，构建与部署 Job 均成功。
- 源码 Commit：`28b5bda281ff5775b96e8fee63817c1c41540b75`。
- 证据来源：部署完成后的独立匿名 HTTP 请求。

中英文首页、下载页、版本状态页、Better Sidebar 页与 Codex Auth 页均返回 HTTP 200，并显示 YourBuddy 0.3.9。中英文发布记录与公开校验和文件也返回 HTTP 200。对公开 DMG 发起的一字节匿名请求跟随 Release 重定向并返回 HTTP 206，在不重复下载完整安装包的前提下核验线上下载旅程。详见[官网部署记录](evidence/website-deployment.txt)。

## 交付状态

- 产品发布状态：已在 [YourBuddy 0.3.9](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.9) 发布并完成独立核验。
- 验证资料归档状态：已完成；公开 ZIP 已匿名下载，与本地源文件一致，通过完整性与解压检查，并记录于源码 Commit `71d78e2cbce71c1fe13b2d5611a8c0beb14f370d`。
- 站点同步状态：已部署并核验；源码 Commit 为 `28b5bda281ff5775b96e8fee63817c1c41540b75`，工作流 Run 为 35502991471。
- 未验证范围：原生 GUI 启动、打包 WebView 交互、从旧版实际执行更新、Apple Developer 签名与公证、OAuth 及真实模型流量。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 本地场景记录日期、时区、环境、受测构建、证据来源、数据类型及服务类型。
- [x] 明确标记仅测源码、合成数据、受控服务、待完成与未验证证据。
- [x] 已在双语发布索引中添加版本条目。
- [x] 已在提交后的候选版本上完成干净工作区准备与截图。
- [x] 已独立核验公开发布页、安装包、Updater 元数据、签名与 Hash。
- [x] 已完成双语官网同步并独立核验线上下载旅程。
- [x] 已创建、上传、解压并核验可下载验证资料归档。
- [x] 已分别报告产品发布状态、验证资料归档状态、站点同步与未验证范围。
- [x] 未移动或覆盖公开 Tag 与安装包；本次修复使用新版本。
