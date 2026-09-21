# YourBuddy 0.3.12

[English](README.md) | 中文

本归档记录 YourBuddy 0.3.12 对 Harbor Historical Session Host 路径的修复。

- 发布标识：`yourbuddy-v0.3.12`。
- 产品渠道：macOS Apple Silicon 版 YourBuddy 桌面应用。
- 归档状态：已发布，并在声明范围内完成独立核验。
- 证据 Commit：`87da6d81c6e25c5e3b47f62e8c8e67ba6e14cc46`；产品 Tag Commit `1c1803ff553e2bfe9fab5b8973d78750f3cff081`。
- 证据图集：不适用；本版本修改 Adapter 执行而非 UI。
- 证据下载：[yourbuddy-v0.3.12-verification.zip](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.12/yourbuddy-v0.3.12-verification.zip)。

## 面向用户的发布说明

### 改了什么

YourBuddy 内置 Harbor Evolution 0.9.8。Host 执行会保留已经解析的 Trial 路径，Historical Session Observation Adapter 可以读取冻结输入并写入 Artifact。

### 解决了什么问题

Historical Session 评测可能因为 Host 命令转换器重复添加 Trial Root，让全部 Trial 在 Adapter 阶段以基础设施错误停止。修正后的 Runtime 只转换每个 Harbor 逻辑路径一次，不会削弱分数有效性要求。

### 在哪里使用

在 YourBuddy 中打开 Harbor，并从最近完成的 Session 启动 Historical Session 诊断。

### 如何体验

升级后预览最近 Session，确认新的 Historical Job，再打开完成结果。Adapter、Renderer、Judge 与 Criterion Coverage 必须完成，且不再出现重复路径基础设施异常。

### 安装或升级

发布后，从 0.3.12 GitHub Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

本版本保留 DSH 0.1.5-rc.2、现有 Session 数据、Evaluator 标准、Judge 选择、Promotion 边界与 macOS Apple Silicon 目标。失败的 Historical Job 继续作为不可变证据，不会重写。源码与安装包 Adapter 回归不能证明完整的 Renderer 与 Judge 路径。全新的端到端 Historical Job 需要安装后启动 0.3.12，不属于本归档范围。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 根因恢复与上游 Adapter 回归 | passed | Harbor Evolution 0.9.8 源码与公开包 | macOS 15.6.1 arm64、Python 3.12、Harbor 0.21.0 | [根因记录](evidence/root-cause.txt) |
| YourBuddy 产品刷新与内置 Adapter Smoke | passed | 公开 0.3.12 迁移运行时 | macOS 15.6.1 arm64、Python 3.12.14 | [运行时记录](evidence/public-runtime-stage.json) |
| 全新 Historical Session Job | not run | 正式发布的 0.3.12 产品 | macOS Apple Silicon、真实 Host Judge | 需要安装并重启 0.3.12 |
| 公开桌面产物与 Updater | passed | 匿名公开下载 | GitHub Release 与稳定 Updater 渠道 | [产物记录](evidence/public-artifact-stage.json) |
| 产品网站 | passed | 公开 GitHub Pages 部署 | 英文与中文路由 | [部署记录](evidence/website-deployment.txt) |

## 场景：根因恢复与上游 Adapter 回归

- 状态：`passed`。
- 日期与时间：2026-09-21 UTC+08:00 CST。
- 发布版本与 Commit：Harbor Evolution `v0.9.8`，Tag Commit `47b4f4b7f87cc037ed11db9cebd1230ce350d12a`；YourBuddy 0.3.12 Tag Commit `1c1803ff553e2bfe9fab5b8973d78750f3cff081`。
- 受测构建：Harbor 源码与公开 npm/PyPI 0.9.8 包。
- 环境：macOS 15.6.1 arm64、Python 3.12、Node.js 22、Harbor 0.21.0。
- 证据来源：本次发布实测。
- 数据：合成 Session Observation 与经过脱敏的基础设施异常。
- 模型或服务：专项回归不调用模型。

### 操作步骤

1. 检查不可变的失败 Job，并从 Trial 文件恢复完整 Adapter 异常。
2. 运行 HostEnvironment 与 SessionObservationAgent 专项测试，再运行完整 Harbor Package 检查。
3. 发布 Harbor Evolution 0.9.8，并逐字节比较公开 npm/PyPI 文件与 Workflow Artifact。

### 预期结果

已解析 Host 路径在命令转换中保持不变，SessionObservationAgent 校验 Observation Digest 并写入 Artifact。

### 实际结果

专项测试 5 项通过。完整上游测试中 321 项 Python 与 596 项 Node 测试通过，Tag CI 通过，公开 npm/PyPI 文件与 Workflow Artifact 逐字节相同。YourBuddy 发布准备通过 68 个运行时 Peer Link 与七个组装 Client Plugin 检查。69 项 Product Refresh 测试、锁定 Rust 检查与精确发布版本检查通过；准备完成并匿名下载的迁移运行时随后执行已安装的 0.9.8 HostEnvironment 与 SessionObservationAgent，并匹配 Observation 与 Artifact Digest。五个公开产物均匹配 GitHub Digest，三条 Checksum 通过，稳定 Updater Manifest 逐字节相同，Minisign 签名与 DMG 通过验证，DMG 与 Updater App 文件树一致。

### 证据

- 操作前：[经过脱敏的重复路径异常](evidence/root-cause.txt)。
- 执行中：[Harbor Tag CI](https://github.com/istarwyh/harbor-self-evolving/actions/runs/35620472947)。
- 结果：[Harbor 0.9.8 Release](https://github.com/istarwyh/harbor-self-evolving/releases/tag/v0.9.8)与[公开 YourBuddy 运行时与 Adapter 记录](evidence/public-runtime-stage.json)。
- 失败与恢复：原 Job 保持不变；需要创建新的 Job。

### 范围限制

本场景证明源码、公开 Harbor 包与匿名下载的 YourBuddy 迁移运行时中的 Adapter 路径已修正，不证明原生 GUI 启动、Renderer、Judge、真实模型评分或业务质量。

## 交付状态

- 产品发布状态：[YourBuddy 0.3.12](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.12) 已公开，Release Workflow 通过。
- 验证资料归档状态：公开产物与安装包 Adapter 已独立核验；最终证据 Commit 完成后发布可下载 ZIP。
- 站点同步状态：双语源码、CI 构建、部署与六个公开路由均通过核验。
- 未验证范围：安装包原生启动、安装包 WebView 交互、从旧版本更新、OAuth、可选集成与业务质量评分仍未验证，除非后续场景另有记录。

## 交付清单

- [x] 发布标识与桌面版本源匹配 0.3.12。
- [x] 面向用户的说明描述改动、问题、位置与最短操作旅程。
- [x] 兼容性、不可变性与源码测试限制明确。
- [x] 根因与上游回归证据不包含私有 Session 内容。
- [x] YourBuddy 发布检查与正式发布通过。
- [ ] 新的打包版 Historical Job 完成且没有基础设施错误。
- [x] 公开文件、Checksum、Updater 元数据与签名通过核验。
- [x] 验证资料归档已发布并独立解压。
- [x] 双语产品网站已同步并在线检查。
- [x] 公开 Tag 与已发布 Artifact 永不移动或覆盖。
