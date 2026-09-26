# YourBuddy 0.3.16

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.16 的产品工作台协同、创作者草稿安全准备与发布收尾脚本。

- 发布标识：`yourbuddy-v0.3.16`。
- 产品渠道：macOS Apple Silicon 版 YourBuddy 桌面应用。
- 归档状态：部分完成；产品发布、公开产物核验、可下载证据与官网检查已经完成，交互录制仍待补。
- 带 Tag 的产品 Commit：`3e3c0da88f1a9a6b080b606d15b363745d32669d`。
- 证据图集：产品工作台交互录制待完成。
- 证据下载：[不可变 Tag 源码](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.16/docs/releases/yourbuddy-v0.3.16)与[可下载验证归档](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.16/yourbuddy-v0.3.16-verification.zip)。

## 面向用户的发布说明

### 改了什么

Better Sidebar 保持为中间工作台，创作者内容会临时使用同一个位置。Conversation 与原生右侧栏组成一个可收起的 Session 区域。Oil Creator 与内置视频发布器会校验草稿输入并保护最终发表操作。新建 Session 默认使用 Full access，文件操作继续绑定到发起时的 Session 与 Pane。

### 解决了什么问题

用户可以在文件、创作者详情与 Conversation 之间切换，同时保留标签、分屏、草稿和 Session 状态。Agent 后台打开不会抢走可见的创作者界面，显式用户导航保持可预测；当最终操作保护仍然生效时，草稿自动化不能提前交还页面。

### 在哪里使用

使用中间 Better Sidebar 工作台、**内容创作** Preset 与 Content 导航、Session 收起控件或普通文件打开操作。贡献者可以运行 `pnpm release:yourbuddy -- 0.3.16` 完成经过评审的桌面候选发布。

### 如何体验

在 Better Sidebar 中打开文件，从 Content 选择一集，关闭详情并回到原有工作台状态，然后收起并恢复 Session 区域。对于已有成片的一集，在确认启用平台和所需权利后选择**准备发布草稿**。

### 安装或升级

请安装 [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.16/yourbuddy-0.3.16-macos-arm64.dmg)，该安装包来自 [0.3.16 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.16)；也可以在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。已有 YourBuddy 数据不需要迁移。

### 兼容性、迁移与限制

桌面目标仍为 Apple Silicon 上的 macOS 11 或更高版本。新建 Session 使用 Full access 和审批策略 `never`；已有 Session 与显式保存的默认设置保持权威。视频草稿需要 Ego Lite 和已登录的创作者账号；微信公众号草稿需要 AppID、AppSecret 与 API IP 白名单。最终发表、定时发布和群发仍由用户执行。公开产物核验前，真实账号平台行为、原生安装包启动、安装包 WebView 交互、更新安装、Apple Developer 签名与公证仍未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 聚焦源码与产品检查 | passed | 已提交的 0.3.16 发布输入 | macOS Apple Silicon、Node.js 22.19 | Typecheck、43 项文档检查、聚焦发布测试套件与完整桌面发布测试套件 |
| 组装 Host 与浏览器工作台 | 在所述范围内通过 | 从源码构建的 Web Client 与准备后的 Host | 本地 Host 与 Chromium | 70 个 peer link、7 个 Client 插件、无密钥刷新与回放通过，3 项浏览器测试通过 |
| 产品工作台交互录制 | pending | 准备后的候选版本 | YourBuddy Web GUI | 待补 |
| 公开桌面产物与 Updater | passed | 公开 0.3.16 产物 | GitHub Release 与稳定 Updater Channel | [产物核验](evidence/public-artifact-verification.txt) |
| 产品官网 | passed | 官网 Commit `151af2c4d8239bbd495c425e72ca5c3fee424791` | 中英文 HTML 与原始 Markdown 路由 | [官网核验](evidence/website-verification.txt) |

## 场景：产品工作台协同

- 状态：源码、准备后的 Host、组装浏览器与发布检查已通过；交互录制仍待补。
- 日期与时间：本地准备与回放时间为 `2026-09-25 23:13` 至 `2026-09-26 00:11 +0800 CST`。
- 发布版本与 Commit：`yourbuddy-v0.3.16`；带 Tag 的 Commit 为 `3e3c0da88f1a9a6b080b606d15b363745d32669d`。
- 受测构建：发布前源码与组装候选版本。
- 环境：macOS Apple Silicon、Node.js 22.19、本地 Host 与内置 Chromium。
- 证据来源：本次发布运行。
- 数据：合成创作者内容与仓库 Fixture。
- 模型或服务：源码与浏览器检查不需要真实模型或创作者账号。

### 操作步骤

1. 运行聚焦的协调器、布局、文件路由、发布器、来源记录、Catalog、文档与版本检查。
2. 准备完整发布输入，并操作核心工作台到 Content 再返回、聚合 Session 收起与恢复、后台与用户打开，以及当前 Session 注意力展开。
3. 录制组装交互，然后发布并独立检查每个公开产物，之后才提升下载或官网声明。

### 预期结果

候选版本保留工作台与 Session 状态，安全恢复焦点，保持后台打开不打扰，阻止不安全的发布器交还，并生成一个 Tag、Updater 元数据、归档和下载链接一致的不可变版本。

### 实际结果

源码、产品、文档、发布脚本、准备后的 Host、组装无密钥浏览器与发布检查已通过。浏览器路径在 Better Sidebar 后台打开期间保留创作者 Content，在显式用户打开与 Session 变化时返回核心工作台，恢复聚合 Session 区域，并能重新打开已选中的一集。精确 Commit 的交互录制仍待补。

### 证据

- 操作前：0.3.16 版本真源、双语归档、产品快照与物化 Patch 来源记录 在发布前保持一致。
- 执行中：`pnpm run typecheck`、`pnpm run doc-sync`、`pnpm --dir apps/desktop-tauri run test:release`、聚焦 Vitest、Oil Creator 源码刷新与 Better Sidebar Patch 回放在 macOS Apple Silicon 和 Node.js 22.19 上通过。
- 结果：`DSH_SNAPSHOT=replay pnpm exec vitest run --config vitest.web.config.ts apps/web/tests/yourbuddy-help.e2e.ts` 的 3 项浏览器测试通过。完整发布准备验证了 70 个 peer link 与 7 个组装 Client 插件。发布工作流、公开校验和、Updater 签名、App 标识、DMG／Updater 文件树对比、产品包与迁移运行时通过检查。GUI 录制与可下载归档仍待补。
- 失败与恢复：组装浏览器最初发现 Oil Creator Typert 未注册、后台触发的自动终端被标成用户导航，以及已选中行无法重新打开隐藏 Content。Fixture 现显式加载产品 Typert 产物，自动终端携带后台意图，已选中行会重新打开 Content，回放通过。发布准备发现双语产品记录陈旧，因此先完成同步再创建 Tag。HTTPS OAuth 凭据缺少 Workflow Scope，原子推送没有改变任何远端 Ref；随后通过已有 SSH 凭据原子推送相同分支与 Tag。

### 范围限制

源码、合成数据与本地组装检查不能证明真实创作者账号行为、最终发表、原生安装后启动、安装包 WebView 交互、Updater 安装、Apple Developer 签名或公证。

## 交付状态

- 产品发布状态：[不可变 Tag 工作流](https://github.com/istarwyh/yourbuddy/actions/runs/36235367585)成功发布。
- 验证资料归档状态：部分完成；源码、执行、公开产物、官网与可下载证据已经记录，交互录制仍待补。
- 站点同步状态：已部署，并在中英文 HTML 与原始 Markdown 线上路由完成核验。
- 未验证范围：真实创作者账号、最终发表操作、原生安装后启动、安装包 WebView 交互、更新安装、签名与公证。

## 交付清单

- [x] 发布标识与桌面版本真源匹配 0.3.16。
- [x] 用户说明覆盖变更、问题、位置、最短体验路径、迁移与限制。
- [x] 聚焦源码、产品、Catalog、文档与发布检查通过并保留日志。
- [x] 完整发布准备与组装 Host／浏览器检查通过。
- [ ] 产品工作台 GUI 路径完成录制并保留。
- [x] 公开文件、校验和、Updater 元数据、签名、App 标识、来源记录与迁移运行时完成独立核验。
- [x] 验证归档已发布并独立解压检查。
- [x] 双语产品官网完成同步与线上检查，且未提升未经验证的文件。
- [x] 公开 Tag 与安装包不会移动或覆盖。
