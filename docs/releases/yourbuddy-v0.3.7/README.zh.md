# YourBuddy 0.3.7

[English](README.md) | 中文

本归档记录 0.3.7 工作台布局改动、PR CI、正式发布、公开文件完整性、Updater 签名、App 标识、provenance 补丁、迁移运行时与原生启动跳过。官网部署和可下载验证资料包仍待完成。

- 发布标识：`yourbuddy-v0.3.7`。
- 产品渠道：面向 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已发布；官网与可下载资料包待完成。
- 发布源码：不可变 Tag Commit `9f5f194adc7dc514277aae0237a56a646fed99e1`。
- 证据图库：[带标注的组装桌面 Shell](screenshots/workbench-primary.png)。
- 证据下载：Tag 源码已包含本记录；独立验证 ZIP 等待最终收尾。

## 用户发布说明

### 改动内容

Better Sidebar 现在是桌面端可伸缩的主工作区。DSH 对话区移动到右侧并可调整宽度，原有导航区和详情区保持不变。

### 解决的问题

原 Portal 展示方式把 Better Sidebar 覆盖在对话区上方，没有让文件、任务、终端、预览及其他工作面成为桌面产品的中心。新布局让这些插件界面占据主区域，同时不替换 DSH，也不改变 Better Sidebar 的上游默认行为。

### 使用位置

以桌面宽度打开 YourBuddy。工作台位于中部偏左，对话区继续位于右侧。窗口变窄后，对话区仍是主界面，Better Sidebar 使用原有抽屉。

### 体验步骤

1. 打开 YourBuddy，在主工作区使用 Better Sidebar 的文件、任务、终端、预览或其他标签页。
2. 拖动工作区与对话区之间的分隔条。
3. 缩窄窗口，并通过抽屉控件打开 Better Sidebar。

### 安装或升级

请安装 [Apple Silicon DMG](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.7/yourbuddy-0.3.7-macos-arm64.dmg)，文件来自 [0.3.7 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.7)；也可以在旧版本中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。Better Sidebar 保持在 0.18.1，Harbor Evolution 保持在 0.9.5；最新 Harbor Evolution 候选要求比内置 DSH 更新的 skill 包，因此未进入本版本。截图来自真实组装 Client 的桌面 Shell Smoke，不是已启动 DMG 的 WebView。应用尚未使用 Apple Developer 身份签名或公证。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 工作台布局源码行为 | 通过 | Tag Commit `9f5f194adc` | macOS arm64；Node 22.22.2 | [本地验证](evidence/local-candidate-validation.txt) |
| 兼容补丁重放 | 通过 | 干净 DSH 与 Better Sidebar Base | 本地临时 Checkout | [本地验证](evidence/local-candidate-validation.txt) |
| 组装桌面 Shell | 通过 | 本地组装 Client 与 Host | macOS arm64；受控本地 Host | [标注截图](screenshots/workbench-primary.png)与[本地验证](evidence/local-candidate-validation.txt) |
| PR CI | 保留失败后通过 | 功能 PR 源码 | GitHub 托管矩阵 | [工作流记录](evidence/release-workflows.txt) |
| 公开安装包与 Updater | 在记录范围内通过 | 五个公开产物 | GitHub Release；macOS 15.6.1 arm64 | [产物记录](evidence/public-artifact-stage.json) |
| 公开 App 与迁移运行时 | 在记录范围内通过 | 原样公开 App | macOS 15.6.1 arm64 | [运行时记录](evidence/public-runtime-stage.json)与[原生启动跳过](evidence/public-native-startup.txt) |
| 产品官网 | 等待 | 尚未同步 | GitHub Pages | 发布后补充 |

## 场景：工作台布局与兼容补丁重放

- 状态：源码行为、干净补丁重放和组装桌面 Shell 均已通过。
- 日期与时间：2026-09-19，Asia/Shanghai，UTC+08:00。
- Release 与 Commit：`yourbuddy-v0.3.7`；Tag Commit `9f5f194adc7dc514277aae0237a56a646fed99e1`。
- 受测构建：源码 Checkout 与记录上游 Base 的干净临时副本。
- 环境：macOS arm64、Node 22.22.2、pnpm 11.7.0。
- 证据来源：本次发布。
- 数据：合成组件与产品 Fixture。
- 模型或服务：没有模型或外部服务请求。

### 步骤

1. 测试可选 DSH `workbench` Slot 的桌面缩放与窄窗口回退。
2. 测试 Better Sidebar 的默认 Portal 与 YourBuddy Slot 展示方式。
3. 把两个 provenance 补丁应用到记录 Base 的干净副本，并比较所得产品文件和构建 Client 产物。
4. 构建完整 DSH Workspace 并准备组装桌面候选。

### 预期

YourBuddy 使用 Better Sidebar 作为桌面主工作区，保留对话区与插件能力，并能在上游刷新后复现两处本地修改。没有选择 Slot 时，DSH 和 Better Sidebar 保持默认行为。

### 实际结果

限定组件和产品测试通过，完整 DSH 构建通过，两个补丁在干净 Base 上成功重放，记录的补丁与快照哈希一致。组装 Host 加载全部六个产品 Client 插件，渲染四轨工作台布局，并在右侧保留对话区。最新 Harbor Evolution 候选的 DSH skill peer 要求与内置 DSH 版本不兼容，因此没有物化到产品树。

### 证据

- 改动前：布局与 provenance 问题记录在[技术方案](../../tech/202609/workbench-layout-compatibility.zh.md)中。
- 过程中：命令和准确测试数量见[本地候选记录](evidence/local-candidate-validation.txt)。
- 结果：组装界面保存在[带标注的工作台截图](screenshots/workbench-primary.png)中；蓝色和紫色证据边框只由发布 Smoke 添加，用于标识两个真实布局区域。
- 失败与恢复：最新插件 Dry Run 在修改产品树前拒绝 Harbor Evolution 0.9.6，因此本版本保留已评审的 0.9.5 快照。首次截图探针使用了尚未选择 Slot 展示方式的发布 Smoke Overlay；将 Smoke Overlay 与原生产品 Overlay 对齐后，组装布局和截图通过。

### 范围限制

源码和组装 Shell 证据不能证明工作流构建的 DMG、公开 Updater 字节、已安装应用启动、Updater 安装或线上官网部署。

## 场景：PR CI 与发布工作流

- 状态：保留此前 CI 和 Tag 工作流失败作为负面证据后通过。
- 日期与时间：2026-09-19，Asia/Shanghai，UTC+08:00。
- Release 与源码：功能 [PR #25](https://github.com/istarwyh/yourbuddy/pull/25)，合并为 `9f5f194adc7dc514277aae0237a56a646fed99e1` 并标记 `yourbuddy-v0.3.7`。
- 证据：[工作流记录](evidence/release-workflows.txt)。

第一次 PR 运行的两个 Linux Lane 在仓库测试前失败，原因是 Ubuntu Archive 移除了固定的 Bubblewrap 版本；刷新后的 Archive 版本与摘要在本地通过。下一次运行进入新布局测试并保留严格 Lint 失败；测试改为精确实例相等判断。最终 [CI 运行 35428836132](https://github.com/istarwyh/yourbuddy/actions/runs/35428836132) 的 19 个 Job 全部通过。没有配置 Runner 的 Cloudflare Preview 被取消，不计为通过。

首次由 Tag 触发的发布运行在构建前失败，因为线上 Release Channel 选择已经超过 Commit 中的 DSH 快照。随后使用文档规定的同 Tag 恢复路径，只消费不可变 Tag 和已提交 Lock，不刷新 Channel；[发布运行 35430356160](https://github.com/istarwyh/yourbuddy/actions/runs/35430356160) 成功构建并发布全部五个正式产物。

## 场景：独立公开产物核验

- 状态：匿名可用性、完整文件、公开校验和、稳定 Updater 元数据与 Updater 密码学签名均通过。
- 日期与时间：2026-09-19 16:17–16:25 UTC+08:00，Asia/Shanghai。
- Release 与构建：[yourbuddy-v0.3.7](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.7)，不可变 Tag Commit `9f5f194adc7dc514277aae0237a56a646fed99e1`，由[工作流 35430356160](https://github.com/istarwyh/yourbuddy/actions/runs/35430356160)构建。
- 证据：[公开产物记录](evidence/public-artifact-stage.json)。

| 公开产物 | 字节数 | 独立观测 SHA-256 |
|---|---:|---|
| `latest.json` | 4,108 | `edda6bbb3348cef9f861bcf97a79a8fb81d54a74bfa11b35076630aa2567f7f9` |
| `SHA256SUMS.txt` | 312 | `3c1773bc29904012b3e4b247e86068c9452e68fe4664f1d7c7c39913e8b4fedd` |
| `yourbuddy-0.3.7-macos-arm64.app.tar.gz` | 570,846,283 | `13f4d0b622f34c1a53ba7793874667f601ee604d8a5d50c66e3db369e3e4bf8e` |
| `yourbuddy-0.3.7-macos-arm64.app.tar.gz.sig` | 408 | `160672c7ec7b3835809a691b90120f586a4768a22b97712dd0612f7a4f0fbf0b` |
| `yourbuddy-0.3.7-macos-arm64.dmg` | 568,944,326 | `4f79e33fc91b28cfff019a1dbf032a2c732f2b84efe29e155623c2a20f99438b` |

五个产物全部在未使用 GitHub 认证的情况下下载。三条校验和全部通过，每个摘要都与 GitHub API 一致，稳定 Updater Manifest 与版本化产物字节相同。`minisign-verify` 0.2.5 使用不可变 Tag 中的公钥验证了 Updater 归档的预哈希签名与受信注释。

## 场景：公开 App 与迁移运行时

- 状态：DMG 完整性、App 标识、DMG／Updater 一致性、严格 Ad-hoc 签名完整性、provenance 元数据以及迁移 Python／Harbor CLI 与导入通过；原生启动和已安装 WebView 交互已跳过。
- 日期与时间：2026-09-19 16:17–16:25 UTC+08:00，Asia/Shanghai。
- 受测构建：从匿名下载的公开 DMG 原样复制的 App。
- 证据：[公开运行时记录](evidence/public-runtime-stage.json)与[原生启动跳过](evidence/public-native-startup.txt)。

`hdiutil verify` 通过，DMG 与 Updater 归档中的 App 树字节一致。App 报告版本／构建 0.3.7、标识 `io.github.istarwyh.yourbuddy` 和 arm64 可执行文件。`codesign --deep --strict` 以 Ad-hoc 签名通过且无 TeamIdentifier；由于没有 Apple Developer 签名或公证，Gatekeeper 拒绝该 App。

公开 Bundle 记录 DSH 工作台补丁 SHA-256 `76602de5874467f2976c886283a2085d7213030c60abab8b3d0316b9a428b80c` 与 Better Sidebar 补丁 SHA-256 `a48f74a495e7f5575f5325c4a93d8c539356376b5e41028d3f76d3fff1ba8d17`。Better Sidebar 物化树匹配 `f6dbd85556e6586f5dc62b754e41d26dcc82bd5330d623be1db30ebea9a541bf`，包含 Slot 展示方式并保留 Portal 默认值。把记录的构建前缀改为不存在路径后，迁移运行时副本通过 `harbor --version`、`harbor-dsh --help` 与直接导入，报告 Python 3.12.14、Harbor 0.21.0 和 Adapter 0.9.5。

用户自己的 YourBuddy 实例及托管 Host 正在运行，因此没有启动下载的 App。原生启动、Finder 安装、从旧版本更新、安装包 WebView 交互、OAuth 与真实模型流量仍未验证。Release 截图来自真实组装桌面 Shell Smoke，不是已安装 App 截图。

## 交付状态

- 产品发布状态：已发布；五个正式产物均可公开下载，并已在记录范围内完成独立核验。
- 验证资料状态：部分完成；已包含 Tag 证据、公开检查和截图，独立可下载 ZIP 待完成。
- 官网同步状态：等待部署 0.3.7 产品文案。
- 未验证范围：原生启动、已安装 DMG WebView 交互、从旧版本安装 Updater、Apple Developer 签名与公证、OAuth、真实模型流量以及线上 0.3.7 官网。
