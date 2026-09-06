# YourBuddy 0.3.3

[English](README.md) | 中文

- 发布标识：`yourbuddy-v0.3.3`
- 产品渠道：YourBuddy 桌面应用
- 归档状态：候选发布版本；本地源码、受控安装包与发布形态 macOS Runtime 验证已完成，公开产物待验证
- 已验证源码 Commit：[`6b47dfd95ebd852d922fb5f915a3b00bf1b05aff`](https://github.com/istarwyh/yourbuddy/commit/6b47dfd95ebd852d922fb5f915a3b00bf1b05aff)
- 证据图集：等待正式公开安装包成功启动后补充
- 证据下载：等待发布 `yourbuddy-v0.3.3-verification.zip`

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.3 调整了安装版桌面应用建立本地工作台认证的方式。原生启动流程现在会完成一次性 Host 交换并安装经过校验的会话 Cookie，再由同 Site 桌面 Shell 打开工作台。

### 解决了什么问题

公开 0.3.2 macOS 应用可能已完成私有 Host 启动，却显示 `dsh web authentication required`。0.3.3 保留严格的 Host Cookie，同时允许 macOS WebKit 把它发送给内嵌工作台。

### 在哪里使用

YourBuddy 启动时会自动应用本修复。它不会增加设置项，也不会改变普通 `dsh web` 的浏览器认证策略。

### 如何体验

安装或更新到 0.3.3，从 Finder 启动 YourBuddy 并等待主窗口。界面应显示工作区，而不是需要认证的提示。

### 安装或升级

发布后可从 [YourBuddy 0.3.3 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.3) 安装 Apple Silicon DMG，也可以在旧版本中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有应用数据会保留。

### 兼容性、迁移与限制

本版本面向 Apple Silicon 上的 macOS 11 及以上系统，不需要数据迁移。它继续使用 DSH `0.1.2-rc.1` 与现有经过审查的产品插件版本。应用只进行了 Ad-hoc 签名，尚未使用 Apple Developer 身份签名或公证，因此首次启动可能需要按文档执行 macOS 放行操作。本地认证场景未验证 Windows、Linux、Intel macOS、OAuth、真实模型调用和企业代理/CA 行为。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 公开 0.3.2 失败与修复后的安装包路径 | passed | 公开 0.3.2 资源与本地 Release-mode 修复 | macOS 15.6.1 arm64、原生 WebKit | [本地记录](evidence/local-validation.txt) |
| 0.3.3 发布准备与产品 Smoke | passed | 源码 `07b2440f5d...` | macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0 | [本地记录](evidence/local-validation.txt) |
| 版本、Updater、Rust、桌面、文档与官网检查 | passed | 源码 `07b2440f5d...` | macOS 15.6.1 arm64、Rust 1.98.0、Hugo Extended 0.165.0 | [本地记录](evidence/local-validation.txt) |
| 打包 Runtime 与快照发布阻断项 | 本地 passed；CI 重跑待完成 | 源码 `6b47dfd95e...`、Node 24 macOS 可执行文件与安装后 Wheel | macOS 15.6.1 arm64、Python 3.11.4 | [本地记录](evidence/local-validation.txt) |
| 公开安装包、更新通道、验证 ZIP 与官网 | not verified | 尚未发布 | GitHub Release 与 Pages | 待补充 |

## 场景：安装版桌面认证

- 状态：受控修复包 passed；作为负向对照的公开 0.3.2 failed
- 日期与时间：2026-09-06 21:30-23:05 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：受影响的 `yourbuddy-v0.3.2` 位于 `bfd9af598ebf24018f8d699cb83e0be23a8b3a05`；修复 Commit 为 `be8abfaedeb25f01632f1d50727be54e69d26d7e`
- 受测构建：公开 `/Applications/YourBuddy.app` 0.3.2，随后测试使用相同资源并包含本地 arm64 Release-mode 修复二进制的临时副本
- 环境：macOS 15.6.1 arm64、原生 Tauri WebView、Loopback 私有 Node Host；修复副本使用隔离的应用数据目录
- 证据来源：本次发布排查与本地实测
- 数据：合成本地工作台状态；未保留凭据、账号数据或用户内容
- 模型或服务：未请求模型；仅测试本地 Host 认证

### 操作步骤

1. 启动公开 0.3.2 应用，确认原生就绪检查通过，但 WebView 显示需要认证的响应。
2. 只把受控浏览器 Shell 的主机从 `127.0.0.1` 改为 `localhost`，复现相同的 401，确认严格 Cookie 的跨 Site 失败。
3. 使用 Tauri Custom Protocol Feature 构建修复后的 Rust Release-mode 二进制，把它放入公开应用资源副本，进行 Ad-hoc 签名，再使用隔离应用数据启动。
4. 在真实 macOS WebView 中观察到认证就绪、`boot complete` 与可见的 YourBuddy 工作区。

### 预期结果

安装版应用在不向 Renderer 暴露进程 Token 的情况下完成本地认证，并在不含凭据的 Host 根地址显示工作台。

### 实际结果

公开 0.3.2 复现了用户报告的 401。修复后的应用副本显示工作区，测试结束后 Host 退出。原生代码只保留经过校验的严格 Cookie；Shell 与 Host 共享 HTTP `127.0.0.1` Site，但保持不同 Origin。

### 证据

- 操作前：公开版本的失败文本与原生就绪状态汇总在[本地记录](evidence/local-validation.txt)中；未保留可能含凭据的截图。
- 执行中：负向对照与 Release-mode 构建命令列于[本地记录](evidence/local-validation.txt)。
- 结果：实测期间检查了真实 WebView 结果；临时截图在检查后已删除，不能作为已归档证据。
- 失败与恢复：把复制的 Cookie 改成 `SameSite=None; Secure` 仍未通过 macOS WebKit 的第三方 Cookie 策略；最终同 Site Loopback Shell 在不削弱 Host 认证的情况下通过。

### 范围限制

本场景验证了一个受控 macOS arm64 应用副本，不是最终 GitHub 0.3.3 安装包。它未验证 Windows、WSL、Intel macOS、OAuth、真实模型调用、应用更新或企业代理与 CA 路径。

## 场景：0.3.3 源码与发布准备

- 状态：passed
- 日期与时间：2026-09-06 22:45-23:30 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.3`；源码 `07b2440f5dd4b3c8fb5c02d44d4c52ed983c54a0`
- 受测构建：干净源码 Checkout，生成的发布资源排除在 Git 之外
- 环境：macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0、Rust 1.98.0、本地 Loopback Host 与 Headless Chromium
- 证据来源：本次发布实测
- 数据：合成临时 Profile 与工作区
- 模型或服务：受控本地 Host；未请求外部模型

### 操作步骤

1. 对最终 0.3.3 版本源运行联网兼容产品刷新与完整 `prepare:release` 流程。
2. 运行聚焦 Rust 认证测试、41 项桌面产品测试、版本与 Updater Manifest 测试、Cargo Locked 检查、Lint、双语文档门禁和严格产品官网构建。
3. 确认发布准备没有发现需要提交的兼容 DSH 或产品插件更新。

### 预期结果

所有版本源都指向 0.3.3，离线产品可以复现，同 Site Shell 通过组装浏览器旅程，且没有未经审查的插件版本进入发布。

### 实际结果

版本检查输出 `yourbuddy-v0.3.3`。发布准备报告 54 个内置运行时 Peer 链接、6 个组装 Client 插件，以及外链、插件市场、网络代理和应用生命周期控制通过。选择的 DSH 与产品版本没有变化。

### 证据

- 操作前：每次联网发布准备前，`git status` 都为干净状态。
- 执行中：pnpm 重建了包含 587 个 Package 的离线 Store 与可迁移 Harbor Runtime；操作输出保留了有界的慢速下载警告。
- 结果：准确命令与通过数量记录在[本地记录](evidence/local-validation.txt)。
- 失败与恢复：两个较大的 npm Tarball 最初返回 pnpm 下载错误 23；pnpm 的有界重试完成了下载，最终离线安装与产品 Smoke 通过。第一次官网构建在默认 `PATH` 中没有找到 Hugo；通过 `HUGO_BIN` 使用此前已校验和的官方 Extended 0.165.0 二进制后，重新运行通过。

### 范围限制

这些是源码、生成资源和受控浏览器检查，不能证明 GitHub 已构建或发布最终 DMG 与 Updater 文件。

## 场景：打包 Runtime 与快照发布阻断项

- 状态：本地 passed；跨平台 CI 重跑待完成
- 日期与时间：2026-09-06 23:35-2026-09-07 00:06 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.3`；发布阻断项修复 `6b47dfd95ebd852d922fb5f915a3b00bf1b05aff`
- 受测构建：源码 Profile 遍历、生成的 Node 24.20.0 macOS arm64 单文件可执行程序，以及本地构建后安装到全新虚拟环境的 SDK 与 Runtime Wheel
- 环境：macOS 15.6.1 arm64、构建宿主 Node 22.22.2、pnpm 11.7.0、目标 Node 24.20.0、Python 3.11.4
- 证据来源：Pull Request 11 首轮 CI 与本次发布实测
- 数据：合成快照 Fixture 与临时 Python SDK 工作区
- 模型或服务：录制的无密钥模型响应与本地 Host 进程；未使用真实模型供应商

### 操作步骤

1. 检查首轮 Pull Request CI 失败，把发布形态 Python Runtime 崩溃定位到 pkg 暴露了虚拟依赖路径、但可选 peer manifest 字节并未嵌入的情况。
2. 调整后备遍历：只有读取 manifest 后才记录已解析依赖，同时保持错误元数据为致命失败；更新过期的 PowerShell 策略录制与 ACP 模型配置选项输出。
3. 运行带覆盖率的聚焦 Profile 测试、无密钥快照回放、双语文档门禁、Lint 与 Node 24 macOS 单文件可执行程序构建。
4. 构建 SDK 与 Runtime Wheel，把两者安装进全新虚拟环境，并运行全部安装后 Wheel 无密钥黑盒场景。

### 预期结果

未嵌入 pkg 可执行文件的可选 peer 保持不可用，但不会阻止启动；错误的已安装 manifest 仍会失败；录制的协议输出与当前权限及模型选择事件一致。

### 实际结果

40 项聚焦 Profile 测试全部通过，语句、分支、函数和行覆盖率均为 100%。ACP 回放通过 15 项测试。完整无密钥刷新通过 113 项测试；由于本机没有 `pwsh`，两项 PowerShell 场景跳过，其期望录制依据 Windows CI 输出更新。生成的 macOS arm64 可执行程序为 249.6 MB，随后成功生成可安装 Wheel，`smoke-python-runtime.py --scenario all --installed-wheel` 报告全部通过。

### 证据

- 操作前：首轮 Pull Request CI 的四个打包 Python Runtime 目标都因未嵌入的可选 peer manifest 报 `ENOENT`；Windows 还暴露两项过期 PowerShell 录制。
- 执行中：pkg 构建在构造可执行文件时报告缺少可选 Client peer，实际覆盖了受影响的 Package 发现条件。
- 结果：命令、目标版本、测试数量与安装后 Wheel 输出见[本地记录](evidence/local-validation.txt)。
- 失败与恢复：第一次本地快照运行与覆盖率共享资源，并继承终端代理变量，Undici 警告污染了子进程 stderr；可靠的串行回放只清除了测试进程的终端代理变量。pkg 构建还留下生产形态依赖链接，第一次 Lint 与文档运行停在 pnpm 无 TTY 清理保护；通过 Frozen Lockfile 恢复开发依赖后，两项检查均通过。

### 范围限制

本地打包 Smoke 只覆盖 macOS arm64。Linux x64、Linux arm64、Windows x64 与两项 PowerShell 录制需要由新一轮 CI 验证，不能根据本地结果宣称通过。

## 场景：公开产品交付

- 状态：not verified
- 日期与时间：2026-09-06 23:30 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.3`；Tag Commit 待定
- 受测构建：尚无正式公开的 0.3.3 产品
- 环境：计划使用 GitHub Actions macOS 15 arm64 Runner 与 GitHub Pages
- 证据来源：本次发布实测
- 数据：不适用
- 模型或服务：GitHub Release、更新通道与 Pages；尚未执行

### 操作步骤

1. 通过现有桌面发布工作流发布不可变 Tag。
2. 独立于 CI 下载并检查 DMG、Updater Archive、签名、校验和、Updater Manifest、验证 ZIP 和安装版应用。
3. 发布并打开双语官网页面及其真实下载链接。

### 预期结果

公开产物标识 0.3.3，与 Hash 及签名元数据一致，更新稳定通道，并能启动到已经认证的工作区。

### 实际结果

Tag 发布前尚未验证。本节必须根据观察到的公开产物和安装行为更新，不得移动 Tag 或替换安装包字节。

### 证据

- 操作前：0.3.2 Release 仍然公开，其安装版认证缺陷已记录在持续维护的归档中。
- 执行中：等待桌面发布工作流。
- 结果：等待公开产物与官网记录。
- 失败与恢复：尚不适用。

### 范围限制

本候选版本场景不声明任何公开产品或官网已经可用。

## 交付状态

- 产品发布状态：待发布；尚未验证 `yourbuddy-v0.3.3` Release 或稳定 Updater 条目。
- 验证资料归档状态：部分完成；已有本地认证与发布形态 macOS Runtime 证据，公开产物记录、安装产品截图、验证资料下载与重新解压仍待补充。
- 站点同步状态：待同步；已经准备候选版本与 0.3.2 缺陷说明，但必须在公开产物通过独立验证后才能宣传 0.3.3 可用。
- 未验证范围：最终公开 DMG 安装、Updater 安装、验证 ZIP、线上官网、Windows、WSL、Intel macOS、OAuth、真实模型调用、企业代理/CA、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 说明了安装或升级、兼容性、迁移与已知限制。
- [x] 每个已完成场景记录日期、时区、Commit、环境、受测构建、证据来源、数据类型及模型或服务类型。
- [x] 操作步骤、预期结果、实际结果、状态和范围限制符合实际观察。
- [x] 明确标记仅测源码、受控副本、失败、恢复与未验证证据。
- [x] 发布形态 macOS Runtime 与全新环境安装后 Wheel 黑盒路径已在本地通过；其他目标平台仍由 CI 验证。
- [x] 只跟踪经过脱敏的文本证据；未包含凭据、个人信息、私有内容或敏感原图。
- [x] 已在双语版本索引添加发布条目，并在本地检查相对链接。
- [ ] 已下载、解压并成功打开公开验证 ZIP。
- [ ] 公开发布页固定链接到不可变证据 Commit、图集和下载地址。
- [ ] 已独立于 CI 与临时工作流产物检查真实 0.3.3 产品目的地。
- [ ] 已记录发布文件名、版本、Hash、Updater 元数据和安装后行为。
- [ ] 双语产品官网已经部署并完成线上下载旅程核验。
- [x] 分别报告产品发布、归档、官网与未验证范围。
- [x] 未移动或覆盖现有公开 Tag 与安装包。
