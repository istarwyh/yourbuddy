# YourBuddy 0.4.11

[English](README.md) | 中文

下文注明日期的发布后观察取代候选交付状态。原始 Tag 保留发布前记录；本次后续文档更新不修改 Tag 或已发布字节。

本归档将本地源代码检查、打包产品验收与公开交付分别记录。

- 发布标识：`yourbuddy-v0.4.11`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：发布前；打包与公开交付观察仍待完成。
- 证据来源：发布后使用本版本不可变 Tag 归档；历史检查在下文标明各自运行。
- 证据图库：本仓库诊断无需界面截图；原生验收制品由发布流水线生成。
- 证据下载：发布后的 [Tag 源代码归档](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.11.zip)将包含本目录；尚未验证其下载。

## 用户发布说明

### 有何变化

新增仓库侧只读命令，可报告保留的运行时与组件目录树以及已记录的引用。字节统计区分文件逻辑大小与按硬链接标识去重的总量。发布测试的 fixture（测试前置数据）也能在应用版本变化后保持有效。

### 解决的问题

诊断为排查磁盘占用提供范围明确的证据，帮助后续决定如何回收历史存储。它不会删除数据，也不提供可回收字节估计。

### 使用位置

使用桌面指南[组件清单](../../../apps/desktop-tauri/README.zh.md)章节中的仓库命令。它是维护诊断工具，并非新增的应用内清理控件。

### 如何体验

退出 YourBuddy，并在收集报告期间保持应用数据目录不变。按链接中的命令指定明确的应用数据根目录，再在本地检查相对路径、字节统计、已记录引用与错误。源代码测试使用合成目录；本版本尚未验证对真实已安装 macOS 配置目录的扫描。

### 安装或升级

发布后，从 [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest)选择 Bootstrap 或 Offline DMG。Bootstrap 下载运行时组件；Offline 内置组件。应用更新器使用完整 Offline 应用归档。

### 兼容性、迁移与限制

桌面发布面向 macOS Apple Silicon；仓库诊断支持 macOS 与 Linux。已分配字节不会对 APFS 克隆去重，也不测量独占物理存储。已记录引用不能证明实时使用，并发替换路径可能破坏扫描排除条件。除非确实打算分享目录名称，否则请将报告保留在本地。历史清理、共享 Store/增量交付及所报告 13 GB 的回收仍由 [issue #57](https://github.com/istarwyh/yourbuddy/issues/57) 跟进；[issue #39](https://github.com/istarwyh/yourbuddy/issues/39) 保留更广泛的恢复验收。本次交付没有 Windows 发布渠道。

## 验证摘要

| 场景 | 状态 | 被测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 发布脚本、流水线与存储诊断 | 通过 | 本地 0.4.11 候选 | Linux x64；Node 24.19.0；合成 Git/API 与存储 fixture | [源代码检查记录](evidence/source-checks.json) |
| 最新 master 工程检查 | 历史；结果混合 | 版本修改前的 master | GitHub Actions | [CI 运行](https://github.com/istarwyh/yourbuddy/actions/runs/38670764492)；Linux 串行失败，Windows 串行与 Wine 通过 |
| 准备后的工作台与原生 Offline 启动 | 0.4.11 尚未验证 | 发布包待生成 | 需要 macOS arm64 Runner | 发布流水线保留首次发布及 0.4.9–0.4.11 Tag 重试验收 |
| 公开安装包、校验和与更新 Feed | 尚未验证 | 待发布 | 不适用 | 独立公开字节与元数据检查待完成 |

## 场景：源代码发布检查

- 状态：2026-10-15 12:12 UTC（Etc/UTC）通过。
- 发布：`yourbuddy-v0.4.11`；源代码包含 [PR #61](https://github.com/istarwyh/yourbuddy/pull/61) 与 [PR #62](https://github.com/istarwyh/yourbuddy/pull/62)。不可变发布 Tag 将标识最终提交的版本修改。
- 被测构建：本地源代码，并非已签名的 macOS 包。
- 环境：Linux x64、Node 24.19.0；合成 API 响应、隔离的本地 Git 仓库与临时存储目录树；没有真实模型提供商。

1. 运行源代码检查记录中列出的发布脚本与存储诊断测试。
2. 预期版本来源一致、仓库/分支/版本/SHA 固定检查有效、拒绝已有 Release、隔离环境中原子发布附注 Tag，以及只读存储报告。
3. 实际结果：18 项发布脚本测试、16 项流水线测试及 6 项存储诊断测试通过，没有失败或跳过。这些测试没有创建生产 Tag 或 Release。

源代码测试不能验证 macOS 打包、安装后行为或物理磁盘回收。发布流水线保留类型检查、Harness 构建、组件准备、原生 Offline 验收、Bootstrap 资源/大小检查及公开制品发布检查。

## 已知工程风险

最新 master CI 在 `scripts/persistence-schema.spec.ts:550` 中名为“does not qualify unmarked additions or structurally equal unbound fields”的测试发生 5000 ms 超时。失败表现是超时而非断言不匹配；原因尚未确定。Linux 串行完成了 81 项检查，覆盖率检查失败。Windows 串行与 Wine 通过。这些观察不能证明整仓 CI 全绿或原生 macOS 产品验收通过。本版本没有放宽超时、保护、凭据权限或发布验收检查。

历史长会话证据仍然有通过与失败：PR #58 记录的输入延迟中位数为 1434.883238 ms，超过 1250 ms 预算；后续 [PR #59 源代码性能基准](../yourbuddy-v0.4.10/evidence/source-benchmark-2026-10-14.json)在相同预算下以 400.871324 ms 通过。后续通过不能确定或修复此前失败的原因，两次结果也都不能证明 0.4.11 原生 macOS 性能。

## 交付状态

- 产品发布状态：待发布；本发布前记录不声称存在 0.4.11 公开安装包。
- 验证归档状态：部分完成；已记录源代码证据与已知风险，macOS 发布运行和独立下载的公开制品待验证。
- 网站同步状态：产品指导没有变化；常规发布不需要网站部署。发布后仍需检查双语稳定下载链接。
- 未验证范围：最终整仓 CI、真实已安装配置目录清单、原生 Bootstrap 清理/恢复、原生 Components/Settings 操作、独立下载包的安装、已安装更新器、物理空间回收、真实提供商/OAuth、企业代理与 Apple 公证。

## 交付清单

- [x] 版本来源与候选标识一致。
- [x] 用户说明描述诊断范围，并保留未关闭 Issue。
- [x] 仅源代码与历史证据有明确标签。
- [ ] 已记录最终 macOS 发布验收与独立公开交付。
- [ ] 已验证不可变可下载归档与稳定网站链接。

## 发布后观察 — 2026-10-15 UTC

[公开 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.11) 于 12:50:42 UTC 发布，既非草稿也非预发布，共有 17 个产物。原始附注 Tag 标识的产品与流水线源代码记录在[流水线证据](evidence/release-workflow-2026-10-15.json)中。本次仅文档跟进记录后续观察，不移动该 Tag，也不替换安装包。

### 打包验收

[发布运行 68](https://github.com/istarwyh/yourbuddy/actions/runs/38733761980) 的发布流程通过，包括类型检查、Harness 构建、组件准备、Bootstrap 大小/资源检查、原生 Offline 启动、搬移后的 Harbor、校验和及发布。流水线证据记录各相关步骤与原始产物链接。

| 场景 | 状态 | 观察结果 | 证据范围 |
|---|---|---|---|
| 准备后的工作台与可选 Harbor | 通过 | 默认八个 Client；通过真实 Profile 安装后为九个 | [准备结果](evidence/prepared-workbench-2026-10-15.json)；Chromium 中的真实 Host/Profile；桌面 invoke stub 不验证原生控件 |
| 原生 Offline 安装与冷启动 | 通过 | 三轮均进入已认证原生工作台并正常退出；69,648 / 15,683 / 16,171 ms | [脱敏原生结果](evidence/native-offline-2026-10-15.json)；macOS arm64 上使用带签名 Offline seeds 与本地拒绝代理；不涵盖 Bootstrap 清理/恢复 |
| 安装包大小 | 通过 | Bootstrap DMG 为 11,091,209 字节；Offline DMG 为 611,237,341 字节 | [归档测量](evidence/installer-sizes.json)；不代表安装后大小、实际流量或回收空间 |
| Apple 公证 | 已跳过 | 两种应用构建均明确记录缺少 Apple 公证配置 | [日志警告记录](evidence/release-workflow-2026-10-15.json)；更新器/组件签名不能证明 Apple Developer 签名或公证 |

原始准备与原生流水线产物于 2026-10-22 到期。这些整理后的结果省略进程标识与本地端点。原生安装在上传前测试；独立下载的包没有在 macOS 上执行。

### 独立公开交付

12:56:09 UTC，独立 Linux x64 检查完成全部 29 项检查。17 个产物均通过匿名 HTTP 200 完整下载，总计 1,844,929,416 字节。17 个 GitHub SHA-256 摘要与字节数全部匹配，`SHA256SUMS.txt` 的 16 个条目也全部匹配。两个更新归档与组件 manifest（元数据清单）均针对准确产品源代码中的公钥，通过内容与可信注释的加密签名检查。[公开观察](evidence/public-verification.json)保留规范公开 URL、文件名、大小、Hash 与验证范围。

稳定的 `yourbuddy-updater/latest.json` 与发布 manifest 字节完全相同，报告 0.4.11 并选择带签名的 Offline 归档。五个已签名组件条目均与下载归档匹配。静态检查发现六个匹配的 Offline seed 归档（包括 debug）、匹配的内嵌 manifest/签名，且没有禁止的旧运行时根目录；Bootstrap 不含 seeds。这些字节与归档检查不能证明已安装应用的自动升级。

[Tag 源代码 ZIP](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.11.zip) 通过匿名下载取得：55,337,561 字节，SHA-256 为 `9cb930a2205c4234e2fbdb5d90a11f262d2d69473a3c442fc36ed671646bef5b`。已验证 ZIP 完整性、双语候选归档与源代码检查记录。该不可变 ZIP 保留原始发布前措辞；这些发布后观察属于后续文档提交。

线上[中文下载](https://istarwyh.github.io/yourbuddy/download/)、[英文下载](https://istarwyh.github.io/yourbuddy/en/download/)、[中文发布](https://istarwyh.github.io/yourbuddy/releases/)和[英文发布](https://istarwyh.github.io/yourbuddy/en/releases/)页面均返回 HTTP 200，并保留稳定的最新 Release 链接。最新目标解析为 0.4.11。产品指导没有变化，因此不需要网站修改或部署。

### 工程结果与剩余范围

[带时间戳的工程快照](evidence/engineering-ci-2026-10-15.json)记录准确发布源代码的[整仓 CI](https://github.com/istarwyh/yourbuddy/actions/runs/38733634895)仍在运行，不声称整仓结果全绿。上文此前 Linux schema 超时与两次历史长会话性能基准观察仍然有效；发布流水线成功不能解释它们的原因，也不能证明原生 macOS 性能。

产品发布与所述公开字节检查已完成。验证归档对真实已安装配置目录清单、原生 Bootstrap 清理/恢复、原生 Components/Settings 操作、独立下载包安装、已安装应用自动升级、历史存储删除、物理磁盘回收、真实提供商/OAuth 及企业代理仍不完整。Apple 公证明确跳过。[Issue #57](https://github.com/istarwyh/yourbuddy/issues/57)继续跟进历史清理与共享/增量交付；[issue #39](https://github.com/istarwyh/yourbuddy/issues/39)保留更广泛的恢复验收。Windows 仍不在本次发布渠道内。
