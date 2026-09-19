# YourBuddy 0.3.7

[English](README.md) | 中文

本归档记录 0.3.7 工作台布局改动及其发布证据。公开产物、Updater、官网和可下载归档结果会在正式发布后补充。

- 发布标识：`yourbuddy-v0.3.7`。
- 产品渠道：面向 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：发布候选。
- 证据 Commit：等待合并与不可变 Tag。
- 证据图库：[带标注的组装桌面 Shell](screenshots/workbench-primary.png)。
- 证据下载：等待公开核验。

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

正式发布后，请从 0.3.7 GitHub Release 安装 Apple Silicon DMG，或在旧版本中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

现有应用数据会保留，无需迁移。桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。Better Sidebar 保持在 0.18.1，Harbor Evolution 保持在 0.9.5；最新 Harbor Evolution 候选要求比内置 DSH 更新的 skill 包，因此未进入本版本。截图来自真实组装 Client 的桌面 Shell Smoke，不是已启动 DMG 的 WebView。应用尚未使用 Apple Developer 身份签名或公证。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 工作台布局源码行为 | 通过 | 等待合并的源码 Commit | macOS arm64；Node 22.22.2 | [本地验证](evidence/local-candidate-validation.txt) |
| 兼容补丁重放 | 通过 | 干净 DSH 与 Better Sidebar Base | 本地临时 Checkout | [本地验证](evidence/local-candidate-validation.txt) |
| 组装桌面 Shell | 通过 | 本地组装 Client 与 Host | macOS arm64；受控本地 Host | [标注截图](screenshots/workbench-primary.png)与[本地验证](evidence/local-candidate-validation.txt) |
| 公开安装包与 Updater | 等待 | 尚未发布 | GitHub Release | 发布后补充 |
| 产品官网 | 等待 | 尚未同步 | GitHub Pages | 发布后补充 |

## 场景：工作台布局与兼容补丁重放

- 状态：源码行为、干净补丁重放和组装桌面 Shell 均已通过。
- 日期与时间：2026-09-19，Asia/Shanghai，UTC+08:00。
- Release 与 Commit：`yourbuddy-v0.3.7` 候选；等待合并 Commit。
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

## 交付状态

- 产品发布状态：等待发布。
- 验证资料状态：部分完成；Tag 前已包含本地证据和截图。
- 官网同步状态：等待公开产物核验。
- 未验证范围：工作流构建和公开产物、Updater 安装、已安装 DMG WebView 与线上官网。
