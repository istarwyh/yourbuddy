# YourBuddy 0.4.2

[English](README.md) | 中文

本归档记录针对 0.4.1 报告的 Better Sidebar 启动热修复，以及本次验证的范围限制。

- 发布标识：`yourbuddy-v0.4.2`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：发布候选；已修复并在发布前检查 Bundle Runtime 回归。
- 证据 Commit：实现 Commit `3d9cd2adae`；Release Tag 固定完整候选版本。
- 证据图集：不适用；本次启动失败以用户报告的 Runtime 错误与确定性的 Bundle 检查作为证据。
- 证据下载：[YourBuddy 0.4.2 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.2)。

## 面向用户的发布说明

### 改了什么

Better Sidebar Bundle 在首个 Session 创建前渲染工作台时，现在会正确调用 Bundle 内的 `clsx` 函数。新增的 Release 快照回归测试会拒绝 0.4.1 中漏入的无效具名导出调用。

### 解决了什么问题

YourBuddy 0.4.1 启动时可能报错 `dsh-better-sidebar: (0, clsx.clsx) is not a function` 并停止。该错误影响新增的无 Session 工作台路径，而 TypeScript 源码本身使用的是正确默认导入。

### 在哪里使用

如果 0.4.1 启动时报告 Better Sidebar `clsx` 错误，请升级。本修复同时适用于 Bootstrap 和 Offline 桌面包。

### 如何体验

安装 0.4.2，在创建 Session 前启动 YourBuddy。工作台卡片应正常显示，不再出现 Better Sidebar 激活错误。

### 安装或升级

从 GitHub Release 安装 Apple Silicon Bootstrap 或 Offline DMG。如果 0.4.1 无法进入设置，直接使用 0.4.2 DMG 覆盖安装；现有设置、Session、工作区、凭据和组件缓存保持不变。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，不需要数据迁移，并保留 0.4.1 的 Bootstrap 组件与工作台行为。发布前验证检查桌面包实际使用的 Bundle，但未手工启动打包应用或操作已安装 WebView。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Better Sidebar Runtime 调用 | 通过 | 桌面打包实际包含的 `lib/client.js` | macOS Apple Silicon、Node | Bundle 语法通过，不再包含无效 `(0, clsx.clsx)(...)` 调用 |
| 产品快照回归 | 通过 | 0.4.2 候选源码 | Node Test Runner | 11 项产品 Bundle 测试全部通过，包含新增 Release 快照断言 |
| 正式发布 | Tag 时待执行 | `yourbuddy-v0.4.2` 候选版本 | GitHub Actions macOS arm64 | 工作流、公开资产、Hash、Updater Metadata 与 DMG 大小需要在 Tag 后核验 |

## 场景：Better Sidebar 启动热修复

- 状态：在所述 Bundle 检查范围内通过。
- 日期与时间：2026-10-01 20:28 CST（UTC+08:00）。
- 发布版本与 Commit：包含实现 Commit `3d9cd2adae` 的 `yourbuddy-v0.4.2` 候选版本。
- 受测构建：桌面打包实际使用的 Better Sidebar Bundle。
- 环境：macOS Apple Silicon 与仓库 Node 工具链。
- 证据来源：本次发布执行的语法、禁止调用、源记录和 Bundle 针对性测试。
- 数据：静态产品资产；不含用户数据。
- 模型或服务：确定性的本地测试；未调用模型。

### 操作步骤

1. 检查实际报错的 Bundle 表达式，并与其他 Bundle `clsx` 调用及 TypeScript 源码比较。
2. 替换无效具名导出表达式，更新产品快照摘要，并运行 Bundle 语法和产品源记录验证。
3. 添加直接拒绝 Release 快照中无效调用的回归测试。

### 预期结果

无 Session 工作台与 Better Sidebar 其他渲染路径一样调用本地 Bundle `clsx` 函数；无效表达式再次出现时，产品快照测试会失败。

### 实际结果

唯一的无效 Bundle 调用已替换为 `clsx(...)`。JavaScript 语法验证、明确的禁止调用扫描、产品源记录摘要和全部 11 项 Bundle 测试均通过。

### 证据

- 操作前：0.4.1 包含 `className: (0, clsx.clsx)(...)`，但 Bundle 只提供本地 `clsx` 函数。
- 执行中：Release 快照及其记录的 Tree 摘要同步更新。
- 结果：候选版本包含 `className: clsx(...)`，并直接对发布 Bundle 增加回归测试。
- 失败与恢复：本次热修复未出现实现或测试失败。

### 范围限制

Tag 前未手工启动打包应用或已安装 WebView。Apple Developer 签名与公证仍不属于此发布渠道。公开资产检查需要等待发布工作流完成。

## 交付状态

- 产品发布状态：Tag 时为发布候选；GitHub Actions 负责资产发布。
- 验证资料归档状态：在所述本地范围内完整，并包含于不可变 Tag。
- 站点同步状态：不适用；下载指南未变化，继续使用稳定 Latest Release 链接。
- 未验证范围：手工打包后启动、已安装 WebView 交互、Apple Developer 签名、公证与发布后资产。

## 交付清单

- [x] 已记录版本源、用户说明、本地证据、限制和双语归档。
- [x] 通过针对性回归测试覆盖实际发布 Bundle 及其产品源记录。
- [x] 产品发布、归档、网站和未验证范围分别报告。
- [ ] 公开工作流、资产、Hash、Updater Metadata 与 DMG 大小需要在发布后核验。
- [ ] 手工打包后启动仍未验证。
- [x] 未移动或覆盖任何现有公开 Tag 与安装包。
