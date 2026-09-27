# YourBuddy 0.3.18

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.18 更短的桌面发布路径。

- 发布标识：`yourbuddy-v0.3.18`。
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：候选发布版本；公开产物结果将在发布后记录。
- 产品 Tag Commit：由 `yourbuddy-v0.3.18` 引用的不可变 Commit。
- 证据图集：本次发布流程变更不适用。
- 证据下载：发布后的不可变 Tag 源码。

## 面向用户的发布说明

### 改了什么

本地发布命令不再重复测试、产品准备、文档检查或官网构建。Tag CI 不再解析上游 Channel，也不再重复源码级 Host、Shell、Oil Publisher、Node 与 Rust 测试。

### 解决了什么问题

经过评审的版本在推送 Tag 前后不再等待同一批检查重复执行。

### 在哪里使用

贡献者通过 `pnpm release:yourbuddy -- 0.3.18` 使用更快的路径。用户仍会获得相同格式的 macOS Apple Silicon DMG 与带签名更新包。

### 如何体验

发布已提交候选版本，等待 Tag 工作流构建 App 与 DMG，然后下载 GitHub Release 产物。

### 安装或升级

发布后，从 0.3.18 GitHub Release 安装 Apple Silicon DMG，或在旧版应用中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

目标仍为 Apple Silicon 上的 macOS 11 或更高版本。现有 YourBuddy 数据不需要迁移。Apple Developer 签名与公证仍不可用。源码级发布检查现在依赖贡献者推送前运行，Tag CI 不再重复执行。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 聚焦发布脚本测试 | passed | 源码候选版本 | macOS Apple Silicon、Node.js 22.19.0 | 3 项测试通过 |
| 文档快速检查 | passed | 源码候选版本 | macOS Apple Silicon、Node.js 22.19.0 | 21 项门禁通过 |
| 正式桌面发布 | not verified | `yourbuddy-v0.3.18` 候选版本 | GitHub Actions macOS arm64 | 等待 Tag 工作流 |

## 场景：缩短发布路径

- 状态：源码检查通过；正式发布待完成。
- 日期与时间：`2026-09-27 14:39 +0800 CST`。
- 发布版本与 Commit：`yourbuddy-v0.3.18`；Tag Commit 为不可变 Tag 引用的 Commit。
- 受测构建：正式发布前的源码候选版本。
- 环境：macOS Apple Silicon、Node.js 22.19.0、pnpm 11.7.0。
- 证据来源：本次发布准备。
- 数据：合成发布元数据；不包含用户数据。
- 模型或服务：GitHub Actions 与 GitHub Releases；不使用模型供应商。

### 操作步骤

1. 更新全部桌面版本源，并创建双语发布归档。
2. 使用轻量发布命令推送 Annotated Tag。
3. 由 Tag CI 构建、冒烟检查打包后 Runtime、计算校验和并上传产物。

### 预期结果

发布命令不重复本地测试即可推送 Tag，Tag CI 不运行源码级校验套件即可进入产物发布。

### 实际结果

聚焦发布脚本测试和文档快速门禁已经通过。正式发布等待 Tag 工作流。

### 证据

- 操作前：此前的命令和工作流会重复本地及源码级检查。
- 执行中：发布命令和工作流现在只保留身份、构建、打包后 Runtime、校验和、Manifest 与上传工作。
- 结果：等待公开的 0.3.18 GitHub Release。
- 失败与恢复：发布前不适用。

### 范围限制

本源码证据不能证明工作流耗时、公开产物可用性、原生 App 启动、Updater 安装、Apple Developer 签名或公证。

## 交付状态

- 产品发布状态：等待 `yourbuddy-v0.3.18` Tag 工作流。
- 验证资料归档状态：源码候选已包含在 Tag 中；公开下载尚未创建。
- 站点同步状态：待同步；现有官网继续展示最近一次已核验版本。
- 未验证范围：工作流耗时、公开文件、原生启动、打包后 WebView 交互、Updater 安装、签名与公证。

## 交付清单

- [x] 发布标识与桌面版本源均为 0.3.18。
- [x] 用户说明与已知限制已使用双语记录。
- [x] 打 Tag 前的聚焦发布脚本测试和文档快速检查已通过。
- [ ] 公开文件与稳定 Updater 元数据可用。
- [ ] 已记录公开产物检查与实测工作流耗时。
- [ ] 产品官网只展示已核验文件。
- [x] 不会移动或覆盖已发布 Tag 与安装包。
