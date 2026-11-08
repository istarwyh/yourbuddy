# YourBuddy 0.4.18

[English](README.md) | 中文

- **发布标识** `yourbuddy-v0.4.18`
- **产品渠道** 适用于 Apple Silicon Mac 的 YourBuddy 桌面应用。
- **归档状态** 发布前验证记录。
- **发布源码** [标签对应的源码树](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.18)。
- **验收画面** [PR #110 的工作台演示](https://github.com/istarwyh/yourbuddy/pull/110)。
- **证据下载** [标签源码 ZIP](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.18.zip)包含本目录。

## 用户发布说明

### 变更内容

自媒体工作台 2.6.1 和上下文洞察 0.82.2 可直接从 YourBuddy 工作台侧栏打开。自媒体工作台用于管理灵感、内容和发布排期。上下文洞察可跨会话查看上下文组成与用量。Context Doctor 仍可用于诊断上下文开销和被遮蔽的 Skill。

YourBuddy 提供终端安装程序和 Agent 升级工具，可升级当前会话所属的应用。Agent 在交接重启前记录操作回执。[Agent 升级与终端安装](https://github.com/istarwyh/yourbuddy/pull/80)。

本版包含 DeepSeek Harness 0.2.0-rc.2 和 Codex Auth 0.3.3-rc.4，并修复了计划预览在所属会话中的打开流程。[Harness 与 Codex Auth](https://github.com/istarwyh/yourbuddy/pull/97)、[计划预览](https://github.com/istarwyh/yourbuddy/pull/104)、[侧栏启动](https://github.com/istarwyh/yourbuddy/pull/106)。

### 使用入口

在工作台侧栏打开**自媒体工作台**或**上下文洞察**。新建 Profile 默认包含这两个插件。已有 Profile 启用同名插件时，YourBuddy 使用该 Profile 中的版本。

### 安装或升级

Apple Silicon Mac 可下载 Bootstrap DMG。首次启动需要离线时可选 Offline DMG。已有安装可打开**设置 → 通用设置 → 应用生命周期 → 检查更新**。[下载 YourBuddy](../../user/product/download.zh.md)、[终端安装](../../user/product/installer.zh.md)。

## 验证汇总

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 默认工作台和可选 Harbor | 通过 | PR #110 预打包产物 | GitHub Actions macOS arm64 与 Chromium | [预打包验收](https://github.com/istarwyh/yourbuddy/actions/runs/42445630994/job/128623840539) |
| Agent 升级会话回放 | 通过 | PR #107 无密钥回放 | GitHub Actions Linux 与 Node 24 | [快照任务](https://github.com/istarwyh/yourbuddy/actions/runs/42431113368/job/128579987714) |

## 预打包默认工作台

- **状态** 通过。
- **日期和时间** 2026-11-08 04:26 UTC。
- **受测构建** PR #110 提交 `cc1e2c7a76b0890dac849574d17649af8c11e812`。
- **证据来源** 打标签前的 GitHub Actions 预打包验收。
- **数据与服务** 隔离的 Profile、合成工作区和真实的本地 Host。此项检查打开两个插件页面，无需发起模型请求。

1. 使用冻结的生产依赖 Store 启动预打包 Host，并在 Chromium 打开工作台。
2. 检查两个插件 Client URL 并从侧栏打开两个页面。
3. 通过真实 Profile 安装可选的 Harbor，再验证组装后的工作台。

验收确认 551 个锁定的注册表依赖齐全，Codex 和 Claude SDK 的原生可执行文件也已就绪。默认工作台成功打开两个页面。Harbor 阶段报告 102 条匹配的核心 peer 依赖链接、12 个组装后的 Client，以及已就绪的 Harbor Python 运行时。[任务结果](https://github.com/istarwyh/yourbuddy/actions/runs/42445630994/job/128623840539)。

## 交付状态

- **产品发布** 等待标签触发的 macOS 发布流程和公开下载检查。
- **验证归档** 已记录发布前结果。原生应用、公开资产哈希和签名、稳定更新源以及源码 ZIP 解压结果待发布后核对。
- **网站同步** 稳定下载链接跟随 GitHub 最新发行版。确认新安装包可下载后更新双语默认插件清单。
- **未验证范围** 新插件的真实模型请求、账号登录，以及在已有安装上由 Agent 发起原地升级、原生重启并恢复会话的完整流程。

## 交付清单

- [x] 核对版本来源，记录双语发布说明和索引条目。
- [x] 记录预打包工作台结果和无密钥升级回放的验证范围。
- [ ] 核对标签工作流的原生启动结果、公开安装包、签名和稳定更新源。
- [ ] 检查公开源码 ZIP，核对线上双语插件页和最新发行版链接。
