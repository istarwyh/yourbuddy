# YourBuddy 0.4.8

[English](README.md) | 中文

本归档记录 Agent Browser 样式修复、左侧片库与本地资源支持。

- 发布标识：`yourbuddy-v0.4.8`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选版本；尚未发布公共产物。
- 证据提交：发布后由 `yourbuddy-v0.4.8` 指定的候选提交。
- 证据图库：[组装后的工作台](screenshots/assembled-workbench.png)，使用 Chromium 和模拟原生桥接捕获。
- 证据下载：[发布页面](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.8)将在发布后可用。

## 用户发布说明

### 变更内容

Agent Browser 在其他插件加载或卸载后保留自己的 CSS。Oil Creator 在展开的左侧栏中，将片库显示在 Workspace 与 Session 列表下方；选择内容后，中间工作台显示详情。桌面 Host 允许本地 HTTP 媒体，Better Sidebar 可以访问所选工作目录以外的宿主路径。

### 解决的问题

模块加载器不再把已有的 effect 样式归到无关插件。空闲 Agent Browser 预览清理不再启动捕获 Worker。片库不再占用主面板，本地媒体与文件浏览不再受到此前的桌面限制。

### 使用位置

在 Agent Browser、左侧 Library 片库、Oil Creator 内容详情，以及 Better Sidebar 文件和媒体页签中使用。

### 体验步骤

打开 Agent Browser 并重新加载另一个插件，其工具栏应保持原有布局。展开左侧栏，在 Library 中选择内容，并在中间工作台查看详情。通过 Better Sidebar 打开本地视频，或打开所选工作目录以外的文件。

### 安装或升级

发布后使用应用更新功能，或从 GitHub Releases 下载 Bootstrap 或 Offline DMG。自动更新继续使用 0.4.7 引入的完整 Offline 应用归档。

### 兼容性、迁移与限制

目标平台为 macOS Apple Silicon，不需要迁移 Session 数据。候选准备阶段尚未验证公共下载、更新器元数据、打包后的原生启动、原生 WebView 交互、签名或公证。

## 验证摘要

| 场景 | 状态 | 被测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Workspace 与模块生命周期 | 通过 | 源码 | macOS arm64、Node 22 | 四个所属 Vitest 文件中的 221 项测试 |
| 产品 overlay 与兼容性 | 通过 | 源码与已提交插件 Bundle | macOS arm64、Node 22 | 29 项 overlay/兼容性测试、20 项产品刷新测试和 19 项清理/发布冒烟测试 |
| 原生 overlay 组合 | 通过 | 本地 Rust 测试构建 | macOS arm64 | 六项 overlay 测试 |
| Host 与 Client 编译 | 通过 | 本地构建 | macOS arm64 | `DSH_CLIENT_TITLE=YourBuddy pnpm run build` 完成 |
| 仓库 lint | 通过 | 源码 | macOS arm64 | `pnpm run lint:contracts-ready` |
| 产品网站 | 通过 | 本地 HTML 构建 | macOS arm64 | 检查 59 个产品页面 |
| 组合产品 | 通过 | 生成的离线 Harness Bundle | macOS arm64、Chromium 与模拟原生桥接 | 81 个 Runtime Peer Link、九个 Client 插件、片库详情、外链、市场、代理、生命周期与品牌设置 |

## 证据范围

这些检查于 2026-10-05 在 Asia/Shanghai 时区的本次候选准备中执行。首次 Client 编译发现测试参数缺少类型；修正测试适配器后，Client 编译通过。此前，Agent Browser 修复也使用构建后的加载器和实际集成的 Ego Browser Bundle 通过了冒烟检查。现有用户应用进程保持运行。生成的离线 Store 已在无网络访问的条件下恢复并安装，组合产品冒烟检查通过。原生桥接使用模拟实现；原生应用行为与公共交付仍未验证。
