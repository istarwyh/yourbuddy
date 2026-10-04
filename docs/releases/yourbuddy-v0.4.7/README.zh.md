# YourBuddy 0.4.7

[English](README.md) | 中文

本归档记录 Offline 自动更新 Payload，确保应用更新后仍可取得该 Release 的全部组件。

- 发布标识：`yourbuddy-v0.4.7`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已发布，并在以下范围内完成独立检查。
- 证据 Commit：由 `yourbuddy-v0.4.7` 标识的候选版本 Commit。
- 证据图集：不适用；本版本修改打包与更新行为，没有新增可视流程。
- 证据下载：已发布的 [YourBuddy 0.4.7 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.7)。

## 面向用户的发布说明

### 改了什么

YourBuddy 自动更新现在安装已签名的 Offline 应用 Archive。应用重启前，该 Archive 已包含与 Release 匹配的 Harness、Node、pnpm Store 和 Harbor Seed。

### 解决了什么问题

此前更新频道安装较小的 Bootstrap 应用 Archive。如果所需 Harness 发生变化，并且应用更新后网络不可用，新应用将无法下载该 Harness，也无法完成启动。

### 在哪里使用

已安装版本检查 YourBuddy 稳定更新频道并发现新版本时，会自动使用这项改动。

### 如何体验

通过 YourBuddy 的普通更新操作安装或升级到 0.4.7。更新完成后，后续启动可以在没有网络时使用应用内的组件 Seed。

### 安装或升级

现有用户可以使用自动更新。新用户仍可选择体积较小的 Bootstrap DMG 完成在线首次启动，或使用 Offline DMG 在无网络环境中安装。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，不需要数据迁移。由于包含全部 Release 组件 Seed，自动更新下载体积会增加。源码检查与发布 Workflow 已通过；安装后的 Updater 行为、打包应用离线启动、Apple Developer 签名和公证仍未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Offline Updater 选择与发布打包 | 在源码范围内通过 | 0.4.7 源码候选版本 | macOS 15.6.1 arm64、Node 22.19.0、pnpm 11.7.0 | Desktop Release Suite、43 项文档检查、Workflow YAML 解析和 Patch 检查通过 |
| 正式桌面制品 | 在声明范围内通过 | `yourbuddy-v0.4.7` 发布 | GitHub Actions 与公开 GitHub Release | Workflow 37172836595 通过；已检查 16 个公开制品、Checksum、Offline Updater 元数据和稳定 Latest Link |

## 场景：选择完整的 Offline Updater Payload

- 状态：在声明的源码范围内通过。
- 日期与时间：2026-10-04 10:53 CST（UTC+08:00）。
- 发布版本与 Commit：`yourbuddy-v0.4.7` 候选版本；不可变 Commit 为 Tag 指向的候选版本 Commit。
- 受测构建：已检入的 Updater Manifest 生成器、macOS 发布 Workflow、测试与发布文档。
- 环境：macOS 15.6.1 arm64、Node 22.19.0、pnpm 11.7.0；当前验证 Shell 中没有 Rust。
- 证据来源：本地 Desktop Release 测试、文档检查、YAML 解析和 Git Patch 检查。
- 数据：确定性本地 Fixture；不含用户数据。
- 模型或服务：未调用模型；GitHub Actions 与公开 GitHub Release 提供发布证据。

### 操作步骤

1. 从 Release 制品生成 Updater 元数据，并要求存在带版本的 Offline 应用 Archive 与签名。
2. 创建候选版本前运行 Desktop Release Suite、文档同步、Workflow YAML 解析和 Patch 检查。

### 预期结果

`latest.json` 选择已签名的 Offline 应用 Archive；如果 Offline Updater Archive 缺少任一 Release 组件 Seed，发布 Workflow 必须失败。

### 实际结果

Updater Manifest 测试选择了 `yourbuddy-0.4.7-offline-macos-arm64.app.tar.gz`。Desktop Release Suite、43 项文档检查、Workflow YAML 解析和 Patch 检查通过。GitHub Workflow 37172836595 随后构建并发布 16 个制品；稳定更新频道提供 0.4.7，并指向 609,197,958 字节的 Offline 应用 Archive。

### 证据

- 操作前：稳定频道选择不含 Runtime 组件 Seed 的 Bootstrap 应用 Archive。
- 执行中：发布 Workflow 分别暂存 Bootstrap 与 Offline 应用 Archive，并检查 Offline Archive 是否包含每个已生成 Seed。
- 结果：Updater 元数据只选择已签名 Offline 应用 Archive；其公开签名与元数据 Hash 匹配 `SHA256SUMS.txt`，对 Archive 的字节范围请求成功。
- 失败与恢复：首次发布命令在远端 `master` 前进时安全停止；候选版本完成 Rebase 与重新验证后发布，没有移动现有 Tag。

### 范围限制

Workflow 已检查 Offline Archive 是否包含每个已生成 Seed，但本次验证没有完整下载并解压 609 MB 公开 Archive，也没有通过 Tauri 安装它。因此，安装后的自动更新与离线重启行为仍未验证。

## 交付状态

- 产品发布状态：已发布为 [YourBuddy 0.4.7](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.7)；稳定 Latest Release URL 已指向该版本。
- 验证资料归档状态：已完整记录源码检查、Workflow 37172836595、16 个公开制品、选定 Hash、稳定 Updater 元数据与公开字节范围访问。
- 站点同步状态：不适用；稳定 Latest Release URL 已自动更新，且产品指南没有变化。
- 未验证范围：完整独立下载并解压 609 MB Updater Archive、已签名 Updater 安装、打包应用离线启动、Apple Developer 签名和公证。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 已说明安装或升级、兼容性、迁移与已知限制。
- [x] 场景记录日期、时区、候选版本身份、环境、证据来源、数据类型及服务类型。
- [x] 操作步骤、预期结果、实际结果、状态和源码范围限制符合实际观察。
- [x] 明确标记失败与未验证证据。
- [x] 两份 Release Index 都包含该版本，双语归档已配对。
- [x] 分别报告产品发布状态、验证资料归档、站点同步与未验证范围。
- [x] 已检查公开 Workflow、16 个 Release 制品、选定 Checksum、Offline Updater 元数据、Archive 字节范围访问与稳定 Latest Link。
- [ ] 完整 Updater 下载、已安装 Updater 行为与打包应用离线启动尚未验证。
- [x] 不移动公开 Tag 与安装包；修正内容使用新版本。
