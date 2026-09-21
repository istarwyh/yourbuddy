# YourBuddy 0.3.11

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.11 的 Oil Creator 内容工作台与**内容创作** Agent Preset。

- 发布标识：`yourbuddy-v0.3.11`。
- 产品渠道：面向 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：除最终网站部署与线上下载页检查外，发布后验证已完成；本地、CI、公开产物、App 标识、Provenance、迁移运行时与可下载归档验证均已记录。
- 发布源码：不可变 Tag Commit `f96261582bf11a90274d705fad54c93698298304`；候选 Commit `6d134ec46dd499efddc4866df58bfedb871e47ff`；Oil Creator 功能 Commit `cf96ee6e1cdb04a8b925e8a59d817b1bd3cc8f61`。
- 证据图库：未捕获；组装后的 Headless 产品旅程记录为命令证据，而不是已安装 YourBuddy 截图。
- 证据下载：[yourbuddy-v0.3.11-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.11/yourbuddy-v0.3.11-verification.zip)，15,814 字节，SHA-256 `999ebbb88511528dbc32a77414cc52dda9b5a7649c2bd5b90408eb479088e727`；已匿名下载、解压并检查。

## 用户发行说明

### 变化

YourBuddy 默认内置 Oil Creator，并新增可选的**内容创作** Agent Preset。Sidebar 通过 **Library** 视图展示本地内容项目，同时保留 YourBuddy 品牌与桌面控件。

### 解决的问题

视频与图文生产可能把脚本、录屏、字幕、封面、文章、发布材料与状态分散到不同工具中。内容工作台让每个项目保持为一个普通本地文件夹，并为 Agent 提供面向生产的组成，而不隐藏文件。

### 使用位置

从 Agent Preset 菜单选择**内容创作**，再使用 Sidebar 的 **Library** Tab 与**设置 → 插件 → 内容工作台**。

### 体验方式

1. 选择**内容创作** Agent Preset。
2. 请 Agent 检查和配置内容工作台，然后确认建议的本地片库目录。
3. 创建选题与脚本，并在 **Library** 中检查生成的普通项目文件夹。
4. 只在需要时添加录制、字幕、封面、图文、发布或数据集成。

### 安装或升级

从 [0.3.11 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.11) 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。匿名公开下载、Checksum、Updater 元数据、签名、App 标识、Provenance 与迁移运行时均已完成独立核验。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。本版本使用最新可用的 DSH Release `0.1.5-rc.2` 与 Oil Creator `0.1.0`。核心本地片库和脚本工作流无需可选集成。录制与剪辑仍由人完成；字幕、封面、图文、发布与数据功能需要各自文档指定的外部工具或凭据，并会停在最终发表动作之前。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本，仍使用 ad-hoc 签名，未完成 Apple Developer 签名或公证。原生 GUI 启动、安装包 WebView 交互、通过旧版 Updater 安装、OAuth、可选创作集成与真实模型流量仍未验证。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Bundle、刷新、文档、Rust 与源码策略专项检查 | passed | 本地源码候选 | macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0 | [本地验证](evidence/local-candidate-validation.txt) |
| 最新 DSH 选择与组装产品准备 | 在记录的受控范围内 passed | 本地准备的产品 | 隔离构建环境与受控本地 Host/Chromium；无模型 Provider | [本地验证](evidence/local-candidate-validation.txt) |
| 正式桌面发布 | passed | 不可变 Tag `yourbuddy-v0.3.11` | GitHub Actions macOS 15 arm64 | [Workflow](https://github.com/istarwyh/yourbuddy/actions/runs/35610547936) |
| 公开安装包、Updater、App 标识、Provenance 与迁移运行时 | 在记录范围内 passed | 匿名下载的公开 Release 文件 | GitHub Release 与 macOS 15.6.1 arm64 | [产物记录](evidence/public-artifact-stage.json)、[运行时记录](evidence/public-runtime-stage.json) |
| 可下载验证归档 | passed | 匿名公开归档下载 | GitHub Release 与 macOS 15.6.1 arm64 | 15,814 字节；SHA-256 `999ebbb88511528dbc32a77414cc52dda9b5a7649c2bd5b90408eb479088e727`；解压与 JSON 检查通过 |
| 产品网站 | 等待最终同步 | 公开部署 | GitHub Pages | 候选网站部署通过；已核验 0.3.11 下载页待完成 |

## 场景：本地候选与组装产品验证

- 状态：在记录的受控范围内 passed。
- 日期与时间：2026-09-21 21:46 UTC+08:00 CST。
- 发布版本与 Commit：`yourbuddy-v0.3.11`；不可变 Tag Commit `f96261582bf11a90274d705fad54c93698298304`；候选 Commit `6d134ec46dd499efddc4866df58bfedb871e47ff`；Oil Creator 功能 Commit `cf96ee6e1cdb04a8b925e8a59d817b1bd3cc8f61`。
- 受测构建：本地源码候选与准备后的 Host/Client 组装产品。
- 环境：macOS 15.6.1 arm64；Node 22.19.0；pnpm 11.7.0；Rust 1.98.0；uv 0.12.5。
- 证据来源：本次发布运行。
- 数据：合成 Profile、Session、内容片库与文件路径。
- 模型或服务：受控本地服务；没有模型 Provider 或可选创作集成。

### 步骤

1. 检查官方 DSH Release 策略并预览全部外部产品候选。
2. 运行 Bundle、产品刷新、离线、Rust、文档、源码策略与兼容性专项检查。
3. 运行干净工作树的 `prepare:release`，重建 Harness、冻结产品 Lock、创建离线 Store 与便携运行时，并启动组装后的 Host 与 Client。
4. 打开 Agent Preset 菜单、找到**内容创作**、加载 Oil Creator **Library**，并执行 Personal Workbench 品牌持久化旅程。

### 预期

发布策略选择最新可用 DSH 版本。Oil Creator 从经过检查的不可变来源安装，不引入第二份 DSH Runtime；离线生产安装成功，**内容创作**可选，**Library** 完成挂载，并保留 YourBuddy 品牌与控件。

### 实际结果

DSH 策略选中 `dsh-v0.1.5-rc.2`，未发现更新的合格候选。专项检查通过。干净发布准备完成 Harness 构建、冻结 Lock 再生成、离线 Store 安装与组装产品 Smoke，共验证 68 个内置 Runtime Peer Link 与七个 Client 插件。Smoke 观察到**内容创作**、Oil Creator **Library**，以及 Personal Workbench 默认、自定义与恢复品牌状态。

### 证据

- 之前：未捕获；此前已核验的公开版本仍为 0.3.10。
- 进行中：[本地候选验证](evidence/local-candidate-validation.txt)记录命令与有界结果。
- 结果：源码检查与干净的组装产品准备通过。
- 失败与恢复：初始功能集成暴露已移除的 Settings Helper 与预构建 Package 的 `prepare` Lifecycle；提交的经检查兼容补丁修复两者，并保留当前 Sidebar 品牌 Slot。最终干净发布准备通过。

### 范围限制

Headless 组装旅程不是安装包原生 WebView。本阶段不能证明原生 GUI 启动、Updater 安装、Apple Developer 签名或公证、OAuth、可选外部创作工作流、真实模型流量、公开下载、稳定 Updater 元数据或网站部署。

## 场景：公开 Release 核验

- 状态：在记录范围内 passed。
- 日期与时间：2026-09-21 22:53 UTC+08:00 CST。
- 受测构建：从已发布 `yourbuddy-v0.3.11` GitHub Release 匿名下载的文件。
- 环境：macOS 15.6.1 arm64；无模型 Provider 或可选创作集成。
- 实际结果：Release Workflow 用时 34 分 38 秒并通过。五个文件均在无认证情况下下载并与 GitHub Digest 一致；三条 Checksum 全部通过；稳定与版本化 Updater Manifest 字节相同；Minisign 签名、`hdiutil verify`、严格 ad-hoc 代码签名校验、App 标识、Oil Creator Provenance、**内容创作** Preset、Updater/DMG App 文件树一致性与迁移 Harbor 命令全部通过。Gatekeeper 因 App 未使用 Apple Developer 签名或公证而拒绝。
- 证据：[产物记录](evidence/public-artifact-stage.json)与[运行时记录](evidence/public-runtime-stage.json)。

## 交付状态

- 产品发布状态：`yourbuddy-v0.3.11` 是最新正式 GitHub Release，且 Release Workflow 已通过。
- 验证归档状态：公开产物与运行时已记录；可下载归档经匿名下载后匹配 SHA-256 `999ebbb88511528dbc32a77414cc52dda9b5a7649c2bd5b90408eb479088e727`，并完成解压与检查。
- 网站同步状态：双语 Oil Creator 候选页面已上线；已核验的 0.3.11 下载旅程仍待发布。
- 未验证范围：原生 GUI 启动、安装包 WebView 交互、从旧安装更新、Apple Developer 签名和公证、OAuth、可选创作集成与真实模型流量。

## 交付检查表

- [x] 发布标识与桌面版本源已为 0.3.11 准备完成。
- [x] 开头说明回答了变化、解决的问题、使用位置与体验方式。
- [x] 已说明安装、兼容性、迁移与已知限制。
- [x] 本地场景记录日期、时区、环境、受测构建、证据来源、数据类型与服务类型。
- [x] 源码限定、受控服务、待定与未验证证据都已明确标注。
- [x] 双语发布索引已包含本版本。
- [x] 最终候选 Commit 与不可变 Release Tag 已记录。
- [x] 公开 Release 页、安装包、Updater 元数据、签名、Hash、App 标识、Provenance 与迁移运行时已独立核验。
- [ ] 网站已完成双语同步，并独立核验线上下载旅程。
- [x] 可下载验证归档已经创建、上传、解压与检查。
- [x] 产品发布、归档状态、网站同步与未验证范围分别报告。
- [x] 未移动或覆盖任何公开 Tag 或安装包；本次使用新版本。
