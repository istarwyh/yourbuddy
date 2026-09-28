# YourBuddy 0.3.23

[English](README.md) | 中文

本归档记录 0.3.23 的 Better Sidebar 工作台终端及本次发布接受的验证限制。

- 发布标识：`yourbuddy-v0.3.23`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选版本；源码检查已完成，制品发布由 Tag 触发的 CI 负责。
- 证据 Commit：功能合并 Commit `a7cb99406c180d4eef1adca66ccf8eaf5bd5e6be`；Release Tag Commit 将包含本归档。
- 证据图集：不适用；未录制打包后 WebView 交互。
- 证据下载：`yourbuddy-v0.3.23` 中的不可变源码；公开安装包等待 Tag CI。

## 面向用户的发布说明

### 改了什么

Better Sidebar 工作台现在提供**新建终端**。每个标签复用 YourBuddy 现有的终端渲染器和 PTY 生命周期，在缓存 Session 之间切换时保持可用，并在关闭时释放进程。

### 解决了什么问题

用户可以在当前对话旁边打开 Shell，不必切换到单独的原生右侧边栏。原生右侧边栏终端保持不变。

### 在哪里使用

打开 Better Sidebar，使用工作台的添加控件，然后选择**新建终端**。终端会作为当前 Session 的工作台标签出现。

### 如何体验

创建终端标签，运行 `pwd` 等无副作用命令，切换到另一个已缓存 Session，再切换回来。原终端标签和进程应仍然存在；关闭标签后应释放进程。

### 安装或升级

请从 GitHub Release 安装 Apple Silicon DMG，或从旧版 YourBuddy 使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有数据无需迁移。更新后请完全退出并重新打开旧进程。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，并保留应用未经 Apple Developer 签名和公证的限制。源码检查与浏览器 Replay 覆盖了终端 Adapter 和保留 PTY 的生命周期，但 Tag 前未操作打包后的 Tauri WebView 与原生终端进程。根据用户明确要求删除了 11 个失败的 Web 用例及其专属 Fixture；这些 Journey 属于未验证范围，而不是已通过。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Better Sidebar 终端生命周期 | 通过 | `a7cb99406c` 的源码 | macOS 15.6.1 arm64、Node 22.19.0、pnpm 11.7.0 | 51 个聚焦测试、9,252 个 GUI 测试、20 个保留 Web Replay |
| 文档与桌面发布检查 | 通过 | `a7cb99406c` 的源码 | 本地 macOS 工作区 | Typecheck、Lint、43 项文档检查、桌面发布测试 |
| Pull Request CI | 部分完成 | PR #33 Head `2c43a92ec1` | GitHub Actions Linux 与 Windows Matrix | Compatibility、Benchmark、Windows Build/Native、Package 与 Runtime Job 通过；下文记录仓库基线失败 |
| 打包后的工作台终端 | 未验证 | 等待发布的 0.3.23 应用 | macOS Apple Silicon | 无打包后 WebView 录屏或原生交互运行 |

## 场景：源码终端集成与发布预检

- 状态：在所述仅测源码范围内通过。
- 日期与时间：2026-09-28 23:14 CST（UTC+08:00）。
- 发布版本与 Commit：合并 Commit `a7cb99406c180d4eef1adca66ccf8eaf5bd5e6be` 的 `yourbuddy-v0.3.23` 候选版本。
- 受测构建：已提交的源码 Checkout 与构建后的 Client Package；不包含正式 0.3.23 安装包。
- 环境：macOS 15.6.1 Apple Silicon、Node.js 22.19.0、pnpm 11.7.0，以及 GitHub Actions Linux 与 Windows Runner。
- 证据来源：本次发布的本地运行与 PR #33 检查。
- 数据：合成终端标签、Session 与浏览器 Replay Fixture；不含私有数据。
- 模型或服务：确定性源码测试与浏览器 Replay；未调用模型。

### 操作步骤

1. 运行终端 Controller、Factory、Better Sidebar Adapter、延迟 Bundle 与受管 Patch 聚焦检查，再运行完整 GUI Suite 和保留的浏览器 Replay。
2. 运行 Typecheck、文档同步、Lint、桌面发布测试及 PR 的跨平台 CI Matrix。
3. 复核明确删除的 Web 用例，并将其原有 Journey 分类为未验证。

### 预期结果

Better Sidebar 应通过共享 Factory 创建终端标签，在缓存 Session 之间切换时保留 PTY，在关闭时释放 PTY，使 xterm 不进入启动 Bundle，并保持原生右侧边栏不变。验证记录必须区分已通过的源码行为、已删除的覆盖和未操作的打包后行为。

### 实际结果

51 个聚焦终端测试通过。GUI Suite 通过 9,252 个测试并跳过 1 个，5 个保留 Web 文件通过 20 个 Replay。Typecheck、43 项文档检查、Lint 和 272 项桌面发布测试断言通过。PR 的 Compatibility、Benchmark、Windows Build/Native、Package 与 Release-shaped Runtime Job 通过。Static CI 停在 `origin/master` 已有的 5 项 Client Domain Graph 违规；Snapshot/Artifact CI 停在 `origin/master` 已有的一组重复测试 Helper。Issue Policy 错误指向上游仓库，Weighted Approval 还需要其他 Reviewer。发布过程先修复了 Application Entrypoint 与私有 Desktop Package 分类问题，随后才触发这些已有阻塞项。

### 证据

- 操作前：Better Sidebar 没有 Terminal Descriptor；终端仅由原生右侧边栏持有。
- 执行中：PR #33 记录功能 Commit、按要求删除的测试、延迟加载修正、聚焦运行与 CI 诊断。
- 结果：源码检查确认共享终端 Factory、保留 PTY 生命周期、关闭释放、原生过滤与 xterm 延迟 Bundle。
- 失败与恢复：静态 Import 最初使 xterm 进入启动 Bundle，现已替换为 Lazy Wrapper。两个干净 Checkout CI 分类错误已修复。其余 CI 阻塞来自同步基线中的未改文件，因此保留为发布限制，不报告为通过。

### 范围限制

Tag 前未操作正式 0.3.23 安装包、打包后的 Tauri WebView、原生终端进程、Updater 安装、Apple Developer 签名或公证。已删除的 11 个 Web 用例不再为 Help、Page Context、HMR、Document Preview、Message Action、Present 与 Onboarding Journey 提供回归覆盖。无法针对打包后的原生 Shell 录制 GUI 演示 GIF，因此本归档不包含该录屏。

## 交付状态

- 产品发布状态：等待 Tag 触发的 GitHub Actions 发布 Apple Silicon DMG、Updater Archive、签名、Checksum 与 Updater Manifest。
- 验证资料归档状态：源码证据在所述范围内完整；公开制品证据仍待补充。
- 站点同步状态：不适用；本版本修改应用行为与发布说明，但不修改产品指南页面。
- 未验证范围：正式 0.3.23 制品、打包后 WebView 终端交互、安装应用中的原生 PTY 行为、Updater 安装、11 个已删除 Web Journey、Apple Developer 签名与公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 验证场景记录日期、时区、Commit、环境、受测构建、证据来源、数据类型及服务类型。
- [x] 操作步骤、预期结果、实际结果、状态和范围限制符合实际观察。
- [x] 按价值保留操作前、执行中、结果、失败和恢复状态，不设置截图数量指标。
- [x] 明确标记仅测源码、失败、已删除和未验证证据。
- [x] 因未操作打包后交互而没有保留截图；源码与 CI 引用受限并可追溯。
- [x] 只跟踪脱敏证据；不包含凭据、个人信息、私有内容和敏感原图。
- [x] 已在 `docs/releases/README.zh.md` 中添加版本条目，并确认两种语言内容一致。
- [x] 相对链接可以渲染，引用的每个本地文件都存在。
- [ ] Tag CI 尚未生成可下载并解压检查的归档。
- [ ] 发布前无法检查公开 Release 页面。
- [ ] 发布前无法检查真实产品目的地。
- [x] 未修改桌面 Shell Origin、Capability、Permission 或 Command；打包后 WebView 交互仍明确标为未验证。
- [ ] 已发布文件名、版本、Hash 与 Updater 元数据仍等待 Tag CI。
- [ ] 稳定的 Latest Release 链接仍等待发布；站点同步不适用。
- [x] 已分别报告产品发布状态、归档状态、站点状态与未验证范围。
- [x] 未移动或覆盖已有公开 Tag 与安装包；本次发布使用新版本。
