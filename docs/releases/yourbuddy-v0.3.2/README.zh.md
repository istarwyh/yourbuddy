# YourBuddy 0.3.2

[English](README.md) | 中文

- 发布标识：`yourbuddy-v0.3.2`
- 产品渠道：YourBuddy 桌面应用
- 归档状态：原始归档已完成；发布后确认的安装应用启动缺陷已记录在下文，但不在不可变的 0.3.2 验证 ZIP 中
- 已验证源码 Commit：[`b1e9d36fca62e064526689a412727f6c5dcbeb06`](https://github.com/istarwyh/yourbuddy/commit/b1e9d36fca62e064526689a412727f6c5dcbeb06)
- 证据图集：[源码 Web 帮助截图](screenshots/)
- 证据下载：[yourbuddy-v0.3.2-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/yourbuddy-v0.3.2-verification.zip)，来源 Commit 为 `62863db240023dcebf2097e7c70d5874a2b5b3b3`

> 发布后发现，2026-09-06 UTC+08:00：安装后的公开 0.3.2 macOS 应用可以通过原生带认证就绪检查，但 WebView 会显示 `dsh web authentication required`。源码 Smoke 使用与 Host 同站点的 Loopback Shell，而打包后的 Tauri Shell 与 Host 跨站，所以原始源码结果没有验收安装启动旅程。0.3.2 仍可下载但包含该缺陷；修复属于后续版本，公开 Tag 与安装包均未被修改。

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.2 在应用内新增帮助菜单，扩充双语产品指南，强化私有 Node Host 的认证启动，改进子进程清理，并将内置 Context Doctor 从 `0.7.0` 更新到兼容版本 `0.7.2`。

### 解决了什么问题

用户现在可以从工作台直接打开正确的入门、插件、扩展开发、故障排查、设置和反馈页面，不会离开当前会话。若系统浏览器无法打开，地址仍会显示并可复制。桌面端会在显示工作台前完成 Host Token 交换，并且不在保存的根地址和日志中保留凭据；但后续安装应用测试发现，macOS WebKit 不会从打包后的跨站 Shell 发送该 Cookie，因此 0.3.2 不能可靠避免未认证首屏。

### 在哪里使用

在 YourBuddy 侧边栏底部打开**帮助**。设置使用指南位于**设置 → 通用设置**。每次 YourBuddy 启动或重启私有 Host 时，认证启动与生命周期改进都会自动生效。

### 如何体验

打开**帮助**并选择任一指南，确认系统浏览器打开页面、工作台中的当前草稿保持不变。若要观察恢复路径，可在系统浏览器不可用时执行同一操作，再复制界面显示的地址。

### 安装或升级

请安装公开 0.3.2 Release 的 Apple Silicon DMG；0.3.2 更新通道发布后，旧版 YourBuddy 也可使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。现有 YourBuddy 数据会保留，无需迁移。应用使用 ad-hoc 签名，但尚未使用 Apple Developer 身份完成签名和公证，因此首次启动可能需要按文档执行 macOS 放行操作。下方发布前源码证据未验证 Windows、macOS Intel、Linux、真实模型供应商调用、真实企业代理/CA 链，以及正式安装 DMG 后的交互式帮助功能。

## 验证摘要

| 场景 | 状态 | 被测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 版本一致性与兼容产品刷新 | passed | 源码候选版 `b1e9d36f...` | macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0 | [本地记录](evidence/local-validation.txt) |
| 中英文应用内帮助流程 | passed | 组装后的源码 Web 脚手架与实际产品 Client | macOS 15.6.1 arm64、Chromium、受控原生外链桥 | [英文恢复状态](screenshots/help-en.png)、[中文恢复状态](screenshots/help-zh.png) |
| Host 认证启动与生命周期 | 源码 Fixture 通过；发布后安装应用失败 | Rust 源码目标与公开 0.3.2 macOS App | macOS 15.6.1 arm64、本地 Loopback Fixture，随后使用真实安装 WebView | [本地记录](evidence/local-validation.txt)与下方发布后场景 |
| 桌面发布辅助测试与 Personal Workbench | passed after dependency-layout recovery | 源码 Checkout | macOS 15.6.1 arm64、合成 Fixture | [本地记录](evidence/local-validation.txt) |
| 文档与产品官网构建 | passed | 源码 Checkout | 本地 Hugo Extended 0.165.0 | [本地记录](evidence/local-validation.txt) |
| 公开 DMG、Updater、校验和与稳定通道 | passed with known signing limitation | 正式公开产品 `yourbuddy-v0.3.2` | GitHub Release，以及 macOS 15.6.1 arm64 上的独立下载、解压与 DMG 挂载 | [公开产物记录](evidence/public-artifacts.txt) |
| 产品官网部署 | passed；真实浏览器未验证 | 官网源码 `0a6f32e70c...` | 本地 Hugo Extended 0.165.0 与 GitHub Pages 构建/部署；Chrome 策略检查不可用 | [官网部署记录](evidence/website-deployment.txt) |

## 场景：已发布 macOS 产物与 Updater

- 状态：passed with known signing limitation
- 日期与时间：2026-09-06 19:10-19:17 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：`yourbuddy-v0.3.2`；Tag Commit `bfd9af598ebf24018f8d699cb83e0be23a8b3a05`
- 被测构建：下载到全新本地目录的正式 GitHub Release 文件
- 环境：GitHub 托管 macOS arm64 发布 Runner；macOS 15.6.1 arm64 独立验证机；GitHub Releases；本地 `hdiutil`、`tar`、`shasum`、`PlistBuddy`、`file`、`codesign` 与 `spctl`
- 证据来源：本次发布运行
- 数据：公开 Release 与本地文件系统元数据；无用户数据
- 模型或服务：GitHub Releases 与 YourBuddy Updater 通道；无模型供应商

### 操作步骤

1. 等待 Tag 触发的发布工作流，确认构建、正式包 Host、搬移后运行时、校验和、Updater 与发布步骤全部完成。
2. 把五个公开产物下载到全新目录，对比 GitHub Digest、`SHA256SUMS.txt` 与本地 SHA-256 计算结果。
3. 分别检查不可变 Release 和 `yourbuddy-updater` 通道的 `latest.json`。
4. 解压 App 包，检查版本、Bundle ID、架构、内置运行时与产品插件版本。
5. 以只读方式挂载下载的 DMG，把 App 复制到全新临时安装目录，验证元数据与 ad-hoc 签名，检查 Gatekeeper，再卸载镜像。

### 预期结果

全部公开文件可下载且哈希一致；带签名的 Updater 通道选择 0.3.2 arm64 包；解压和从 DMG 复制的 App 均标识为 `io.github.istarwyh.yourbuddy` 0.3.2；镜像可以挂载和卸载。没有 Apple Developer 签名和公证时，不能把 Gatekeeper 报告为通过。

### 实际结果

Release 发布了全部五个预期产物。本地 SHA-256 全部一致，稳定 Updater Manifest 返回 0.3.2 且签名非空，App 为包含预期内置版本的 arm64 构建；DMG 通过镜像校验、挂载、复制、代码签名验证与卸载。`spctl` 拒绝 ad-hoc 签名 App，符合未签名和未公证的已知限制。

### 证据

- 操作前：Tag 内归档只包含源码与本地候选版证据。
- 执行中：[工作流 34028686085](https://github.com/istarwyh/yourbuddy/actions/runs/34028686085)在发布前构建并测试 Tag Commit。
- 结果：[公开产物记录](evidence/public-artifacts.txt)列出独立下载后观察到的准确文件、大小、哈希、元数据、内置版本与命令。
- 失败与恢复：未发生发布或校验和失败。Gatekeeper 拒绝作为已知限制保留，未绕过。

### 范围限制

未交互启动复制后的 App。正式安装后的帮助点击、真实浏览器打开、应用内自动更新安装、复制 App 的私有 Host 启动、真实 OAuth/模型调用与企业代理/CA 行为仍未验证。

## 场景：应用内帮助与失败恢复

- 状态：passed
- 日期与时间：2026-09-06 18:38 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.2`；源码 `b1e9d36fca62e064526689a412727f6c5dcbeb06`
- 被测构建：源码构建的 Harness Web 应用与通过真实 Host 脚手架加载的 Personal Workbench Client
- 环境：macOS 15.6.1 arm64、Node 22.22.2、Playwright Chromium、英文浅色主题与中文深色主题
- 证据来源：本次发布运行
- 数据：合成工作区与草稿文本
- 模型或服务：未使用模型；受控桌面外链桥

### 操作步骤

1. 使用实际源码构建的 Web 插件列表与交付的 Personal Workbench Client 启动测试环境。
2. 分别以中英文打开帮助，访问全部五个目的地，并检查键盘导航和侧边栏收起状态。
3. 打开每个目的地时在输入区保留一段草稿。
4. 强制原生打开响应失败，再检查目的地址是否继续显示并可复制。
5. 打开设置并触发使用指南链接。

### 预期结果

每个本地化目的地使用正确的官网语言路径；外部导航不替换工作台或丢失草稿；键盘焦点返回帮助；原生打开失败时提供可恢复地址。

### 实际结果

中英文流程均通过。测试观察到全部预期 URL、保持不变的工作台 URL 与输入草稿、无页面错误、本地化失败提示，以及设置指南请求。

### 证据

- 操作前：没有单独截图；测试在操作前记录菜单的无障碍快照。
- 执行中：源码测试驱动全部指南目的地并保留草稿，参见[本地记录](evidence/local-validation.txt)。
- 结果：[英文浅色主题失败恢复](screenshots/help-en.png)与[中文深色主题失败恢复](screenshots/help-zh.png)。
- 失败与恢复：截图有意展示受控的浏览器打开失败及产品的复制地址恢复，不是未预期的测试失败。

### 范围限制

该场景证明组装后的源码 Web 与受控桌面桥流程，不证明正式安装 DMG 的行为，也不证明某个外部浏览器成功加载每个远端页面。

## 场景：Host 认证启动与生命周期

- 状态：passed after fixture repair
- 日期与时间：2026-09-06 18:34-18:38 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.2`；源码 `b1e9d36fca62e064526689a412727f6c5dcbeb06`
- 被测构建：Rust 源码测试目标与桌面发布辅助测试
- 环境：macOS 15.6.1 arm64、Rust 工具链、回环 HTTP Fixture 与子进程 Fixture
- 证据来源：本次发布运行
- 数据：合成启动 Token 与进程输出
- 模型或服务：受控本地 Host Fixture；无供应商

### 操作步骤

1. 与其他发布检查并行运行完整 `runtime::supervisor::tests` 模块。
2. 观察到测试服务端已接受 Socket 的一次 `WouldBlock` 失败，其余 12 项通过。
3. 按阻塞式 Header Reader 的要求，对已接受 Socket 显式恢复阻塞模式。
4. 使用四个独立 Cargo 进程运行受影响测试，再串行复跑全部 13 项 Supervisor 测试。

### 预期结果

桌面端只接受指定 Host 带 Token 的地址，在就绪前完成认证交换，对失败信息中的 Token 脱敏，持续排空输出并终止自有进程。测试 Fixture 应等待隔离回环流，而不是依赖继承的 Socket 模式。

### 实际结果

四个并发聚焦运行全部通过，随后 13 项 Supervisor 测试全部通过。首次失败与 Fixture 修复保留在本地记录中。

### 证据

- 操作前：[本地记录](evidence/local-validation.txt)记录最初 12 项通过、1 项失败及 `WouldBlock` 错误。
- 执行中：同一记录列出阻塞模式修复与四进程压力运行。
- 结果：最终串行模块结果为 13 passed、0 failed。
- 失败与恢复：修复确定性的 Socket 模式不匹配；未向产品代码添加重试，也未弱化断言。

### 范围限制

这些是本地回环与进程 Fixture，不验证真实安装应用、真实 OAuth 账号、代理、企业 CA、WSL Host 或 Windows 进程树。

## 场景：发布准备与产品刷新

- 状态：passed
- 日期与时间：2026-09-06 18:23-18:34 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.2`；发布准备源码 `08b034a64662753e4474ede6dc2c0f90a093f8e7`，验证源码 `b1e9d36fca62e064526689a412727f6c5dcbeb06`
- 被测构建：隔离源码 Checkout 与本地组装的候选版
- 环境：macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0、Python 3.12.14 运行时包
- 证据来源：本次发布运行
- 数据：公开上游包元数据与合成产品 Fixture
- 模型或服务：公开 npm 与 GitHub 包源；无真实模型

### 操作步骤

1. 在隔离 worktree 中使用冻结根 Lockfile 安装仓库。
2. 运行 `pnpm --dir apps/desktop-tauri run prepare:release`，解析允许的最新产品源码、构建 Harness、组装离线 Store/工具链/Python 运行时并执行产品 Smoke。
3. 审查唯一产品刷新：Context Doctor 从 `0.7.0` 更新到具有不可变上游来源的 `0.7.2`。
4. 把全部桌面版本源与工作流默认值推进到 0.3.2，再运行版本与桌面辅助测试。

### 预期结果

只接受兼容产品更新；不兼容 Peer 或来源信息会让准备失败。全部桌面版本源均为 0.3.2，内置运行时不安装第二份 DSH。

### 实际结果

发布准备检查了 54 个内置运行时 Peer 链接与 6 个组装 Client 插件。Context Doctor 更新到 0.7.2，其他产品版本保持固定。版本验证输出 `yourbuddy-v0.3.2`，全部 88 项桌面辅助测试通过。

### 证据

- 操作前：已合入的帮助源码 `a40da690839b183db93d56871c3c520064f3767a`，Context Doctor 为 0.7.0，桌面版本为 0.3.1。
- 执行中：[本地记录](evidence/local-validation.txt)包含准备摘要与依赖安装观察。
- 结果：源码 Commit `08b034a64662753e4474ede6dc2c0f90a093f8e7` 与 `b1e9d36fca62e064526689a412727f6c5dcbeb06` 包含已审查更新与 Fixture 修复。
- 失败与恢复：Personal Workbench 首次隔离构建缺少被排除快照的 `esbuild` 链接；包内安装随后暴露重复 React。恢复根 React 解析并提供 Lockfile 中的根 `esbuild` 后，类型检查、40 项测试与构建通过。恢复过程未修改源码依赖。

### 范围限制

以上是源码与本地候选版证据。公开产物、带签名 Updater 元数据、正式安装 DMG 行为、Apple 公证及真实供应商均需在发布后验证。

## 场景：文档与产品官网构建

- 状态：passed
- 日期与时间：2026-09-06 18:40-18:42 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.2`；源码 `b1e9d36fca62e064526689a412727f6c5dcbeb06` 及本发布归档
- 被测构建：源码文档与本地渲染的产品官网
- 环境：macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0、官方 Hugo Extended 0.165.0
- 证据来源：本次发布运行
- 数据：仅仓库文档
- 模型或服务：未使用模型；本地静态站点构建

### 操作步骤

1. 记录双语发布页与索引的语言配对数据。
2. 运行全部文档门禁。
3. 运行产品站点测试，投影双语文档，以严格模式构建 Hugo，并检查本地链接、资源、锚点与源码操作。

### 预期结果

两种语言的记录保持配对，全部文档门禁通过，本地产品站点能够构建且内部目的地与资源有效。

### 实际结果

全部 32 项文档门禁及 70 项产品站点/项目站点测试通过。Hugo 投影了 48 个 YourBuddy 源页面，生成 59 个中文页面和 57 个英文页面，验证器接受了 57 个产品 HTML 页面。

### 证据

- 操作前：发布归档与索引尚无 0.3.2 配对记录。
- 执行中：[本地记录](evidence/local-validation.txt)列出准确命令与 Hugo 二进制校验和。
- 结果：32 项文档门禁与完整本地官网检查通过。
- 失败与恢复：默认 `PATH` 中没有 Hugo；对官方 Extended 0.165.0 macOS arm64 包完成校验后，通过文档规定的 `HUGO_BIN` 设置使用该二进制。

### 范围限制

这只验证本地源码输出，不证明 GitHub Pages 工作流已部署，也不证明公开 URL 可访问。

## 场景：发布后的安装应用启动

- 状态：failed；作为已确认的 0.3.2 产品缺陷保留
- 日期与时间：2026-09-06 21:30-22:00 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：公开 `yourbuddy-v0.3.2`；Tag Commit `bfd9af598ebf24018f8d699cb83e0be23a8b3a05`
- 被测构建：安装后的公开 `/Applications/YourBuddy.app` 0.3.2，随后使用相同内置资源进行受控诊断
- 环境：macOS 15.6.1 arm64、原生 Tauri WebView、Loopback 私有 Node Host
- 证据来源：用户报告与本次发布后本地复现；不属于原始验证 ZIP
- 数据：真实安装产品与隔离的诊断应用数据；未记录 OAuth Token 或用户内容
- 模型或服务：未发起模型请求；仅使用本地 Host 认证

### 操作步骤

1. 从等同 Finder 的 GUI 环境启动安装后的 0.3.2 应用，并等待私有 Host 就绪日志。
2. 在原生启动报告 `authenticated readiness passed` 与 `boot complete` 后观察主 WebView。
3. 在浏览器对照中复现 Shell/Host Site 关系：使用 `localhost` 父页面和 Strict `127.0.0.1` Host Cookie 时失败，两个不同 `127.0.0.1` Port 时成功。

### 预期结果

安装应用应交换启动 Token、打开不含凭据的 Host 根地址并渲染 YourBuddy 工作台，同时不把 Token 暴露给 Renderer。

### 实际结果

原生就绪检查通过，但安装后的 WebView 显示 `dsh web authentication required; reopen the URL printed by dsh web.`。打包后的 Tauri Shell 与 Host 跨站，macOS WebKit 因此拒绝发送 Strict Cookie。这推翻了先前仅凭源码得出的“0.3.2 避免未认证首屏”结论。公开安装包与 Tag 保持不变；[同站点修复](../../../.agents/notes/implemented/bug-fix/2026-09-06-yourbuddy-desktop-same-site-authentication.zh.md)等待后续版本发布。

### 范围限制

该失败已在公开 macOS arm64 应用中确认。本次复现没有覆盖 Windows、WSL、Intel macOS、OAuth、模型请求与企业代理/CA 行为。

## 交付状态

- 产品发布状态：已发布但确认存在 macOS 启动缺陷；[YourBuddy 0.3.2](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.2)的文件仍可下载且与记录 Hash 一致，但安装后的 WebView 可能停在需要认证的响应。
- 验证资料归档状态：原始不可变归档仍可下载，并已在源码 Commit `62863db240023dcebf2097e7c70d5874a2b5b3b3` 完成逐字节校验；文件大小为 129,941 字节，SHA-256 为 `e562353aa609e488720cbdbc6a3de2dec48f538b60e4dd949a89fbc21c4bffcc`。它早于发布后安装应用失败，不包含该证据；当前维护的发布页已补记此事，下一版本归档必须继续保留。
- 官网同步状态：已从 `0a6f32e70c9237b1fb245a738d0fa8406ff590fb` 通过[工作流 34030189025](https://github.com/istarwyh/yourbuddy/actions/runs/34030189025)完成部署；本地与 CI 站点检查通过，但浏览器的管理员策略检查连续两次不可用，因此真实浏览器验证待完成。
- 未验证范围：成功完成安装启动后的交互式帮助与真实浏览器打开、应用内自动更新安装、真实 OAuth/模型调用、企业代理/CA、Windows、macOS Intel、Linux、Apple Developer 签名与公证。安装后的私有 Host 启动已确认在 WebView 认证步骤失败；Gatekeeper 拒绝 Ad-hoc 签名构建也已确认。

## 交付清单

- [x] 发布标识与全部版本源符合既有渠道流程。
- [x] 开头说明回答改了什么、解决什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 每个已完成场景均记录日期、时区、Commit、环境、被测构建、证据来源、数据类型与模型或服务类型。
- [x] 步骤、预期、实际、状态与范围限制符合观察结果。
- [x] 保留有价值的失败与恢复状态，未设置截图数量要求。
- [x] 已明确标注源码、合成数据、受控服务、待完成与未验证证据。
- [x] 截图清晰、有说明、使用相对链接，且不含凭据或个人信息。
- [x] 本地候选树上的版本索引、语言配对、文档与产品官网构建已通过；发布前仍会在 Tag Commit 上复核。
- [x] 已从公开页面下载验证资料包，完成逐字节对比、解压与检查。
- [x] 公开 Release 页面已链接不可变证据 Commit、图集与下载。
- [x] 已独立于 CI 检查实际 DMG、Updater、校验和、元数据与复制后的安装包；后续交互启动失败已明确保留。
- [ ] 产品官网内容已同步并部署；浏览器安全策略检查不可用，因此双语在线页面仍未验证。
- [x] 已分别报告产品发布、资料归档、官网与未验证范围。
- [x] 未移动或覆盖任何既有公开 Tag 与安装包。
