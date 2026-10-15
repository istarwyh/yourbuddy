# YourBuddy 0.4.11

[English](README.md) | 中文

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
