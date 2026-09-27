# Agent Note: YourBuddy 快速发布流水线

Status: implemented

[English](2026-08-23-fast-yourbuddy-release-pipeline.md) | 中文

## Problem

macOS 标签流水线会在变更已经通过针对性开发检查和 Pull Request 检查后，再次运行 Node、Python 与 Rust 测试套件。它还会构建两次 App Bundle，并把约一 GB 的发布资产从 macOS 构建 Job 经由 GitHub Artifact Storage 中转到独立的 Ubuntu 发布 Job。这些步骤延迟了日常产品交付，却没有增加对最终可下载产物的验证强度。

## Decision

格式严格为 `yourbuddy-vX.Y.Z` 的 Tag 仍是发布源码入口，流水线从该 Tag 构建 macOS arm64 产物。产品刷新与已提交的 `stable-else-rc` DeepSeek Harness 选择属于发布前职责；Tag CI 只消费已提交的来源记录和冻结 Lockfile，不再解析 Channel。手工 Dispatch 可以在失败后重试尚未发布的已有 Tag。若 Tag 已存在 GitHub Release，流水线会拒绝继续。流水线保留版本与 Tag 一致性校验、冻结依赖安装、完整 Harness 构建、Tauri App 与 DMG 构建、Tauri Updater 签名、针对从更新归档解压出的 Runtime 的冒烟测试、SHA-256 校验、Updater Manifest 生成，以及向 GitHub Release 直接发布。

Node、Python 与 Rust 测试套件属于发布前职责，不再在标签流水线重复运行。本地发布准备会解析 DSH 策略、验证选中 Tag 的 Commit、在干净 Worktree 中准备未提交的上游 Merge、重新绑定经过批准的产品 Peer Metadata、刷新外部产品，并要求完整 Host 与 Client 兼容性冒烟测试通过。Peer 修正与旧 Runtime Peer 或 Client 注入项的移除只适用于一个精确的外部产品版本和选中的 DSH Release。移除项第一次应用时必须精确匹配一项声明；后续同版本准备只有在已验证快照的来源记录包含该精确移除项时才接受目标已经不存在，新版本或未记录的候选仍会失败。后续步骤失败时，流程会中止自己创建的 DSH Merge、还原受管理的产品输入，并在恢复阶段把不存在的生成 Bundle 视为已经清理。Tauri App 只构建一次；DMG 基于该 App 封装，Updater 归档直接用于迁移后 Runtime 验证，因此删除第三次 App 重打包。Release Profile 使用 ThinLTO 与 8 个 Codegen Unit，不再使用 Fat LTO 与单一串行 Unit。Cargo Registry 与 Git 数据，以及 Host 和 Target 两侧的 Fingerprint、Build Script 与依赖对象，会按精确 Rust Toolchain 和 Cargo 输入缓存。绑定校验和的压缩离线 pnpm Store 则按冻结的产品 Lockfile 独立缓存；复用前会验证 Metadata 与归档 Digest，未命中时仍执行完整抓取和打包路径。发布直接在 macOS 构建 Job 中完成，大型 DMG 与 Updater 归档不再经过 Workflow Artifact Storage 往返传输。版本专属资产只创建一次；发布新版本时只会替换稳定更新通道的 Manifest。

仓库级交接包含两个命令。在干净的 `master` 上，`release:yourbuddy:prepare` 不联网地更新桌面版本源，并创建双语归档、索引条目、配对记录与发布说明草稿；自动生成的 `TODO` 会阻止贡献者补充实际说明前误发布。针对性检查与评审完成后，`release:yourbuddy` 不重复测试或构建，只校验已提交的发布归档与 Git 状态，拒绝脏 Worktree、分支分叉或远端已有 Tag 的候选，并原子推送分支与 Annotated Tag。产物构建和发布仍由 GitHub Actions 负责。

## Alternatives considered

**在 Tag 上保留全部测试。** 这会提供最多的重复信号，但同一份源码已经在打 Tag 前完成检查，仍会额外增加数分钟。

**保留独立发布 Job。** 这样可以隔离发布权限并只重试发布阶段，但大型资产需要传输两次，常见的成功路径会更慢。

**直接提升此前构建的产物，不再重新构建。** 这是最快的 Tag 路径，但需要仓库目前还没有的、以提交 SHA 寻址且带证明的持久预构建流水线。

**跟随最新预发布版或 `master`。** 这样可以缩短上游开发与 YourBuddy 采用之间的延迟，但会让 Alpha API 与未打 Tag 的变更成为日常发布输入。正式版优先、RC 回退的 Channel 保留范围明确的预览路径，同时不采用 Alpha 或分支 Head。

**在 Tag 构建中解析并合并 DSH。** 这样能在执行时使用最新上游，但 Tag 将无法标识全部源码输入，旧 Release 也不能独立于 GitHub 的后续状态重新构建。发布准备负责修改源码；Tag CI 验证新 Tag，失败且尚未发布的 Tag 可以从已提交输入重试。

## Consequences

Tag 推送后的关键路径只包含依赖安装、Harness 与 Tauri 构建、打包后 Runtime 冒烟测试、校验和、Manifest 生成与上传。在同一台本地 Apple Silicon 主机上分别使用冷 Target 目录时，Rust Release 构建从 Fat LTO 与单个 Codegen Unit 的 141.52 秒降至 ThinLTO 与 8 个 Unit 的 67.04 秒；Strip 后的可执行文件从 11,582,896 字节增加到 15,328,368 字节。公开 DMG 达数百 MB，因此接受这一编译耗时取舍；Tag 工作流实测仍是发布路径指标。正确性会明确依赖打 Tag 前的针对性检查与经过评审的 DSH Merge，而发布物专属校验仍保留在标签流水线。准备完成后出现的新上游版本不会使已提交候选失效；不兼容候选会阻断下一次准备，而不是当前 Tag 构建。在 GitHub Release 创建前，发布失败可以针对同一 Tag 重新构建；一旦正式发布，字节发生变化就必须使用新版本。Apple 代码签名与公证仍不属于本次优化范围。
