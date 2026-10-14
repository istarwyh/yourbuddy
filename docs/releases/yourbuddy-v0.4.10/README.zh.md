# YourBuddy 0.4.10

[English](README.md) | 中文

下方注明日期的发布后观察取代候选版本交付状态；先前候选版本证据保留为历史记录。

本归档记录候选版本，并区分源码检查与打包产品验收。

- 发布标识：`yourbuddy-v0.4.10`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：发布前；安装包和公开交付观察仍待完成。
- 证据来源：发布后本版本不可变 Tag 的源码归档；历史检查在下文标明各自提交与运行。
- 证据图集：本次非 UI 清理变更不适用；发布工作流生成原生验收制品。
- 证据下载：发布后 [Tag 源码归档](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.10.zip) 包含本目录；尚未验证其下载。

## 面向用户的发布说明

### 改了什么

下载的运行时组件成功准备后，YourBuddy 会尝试删除本次实际使用的 `.partial` 归档及其续传侧车文件。安装失败时，保留已验证下载以供重试。

### 解决了什么问题

成功的新组件安装不再有意保留本次已消耗的下载归档。清理失败不会把成功安装变成启动失败。

### 在哪里使用

Bootstrap 准备已下载运行时组件时自动执行此变更。不需要新设置或手动清理操作。

### 如何体验

在可丢弃的 Profile 中安装新版 Bootstrap，让缺少的组件完成下载与准备，然后检查 downloads 目录中本次消耗的归档及续传侧车文件是否消失。中断或失败的安装必须保留可续传数据。在下文记录结果前，此正式安装包流程仍未验证。

### 安装或升级

发布后，从 [GitHub Releases](https://github.com/istarwyh/yourbuddy/releases/latest) 选择 Bootstrap 或 Offline DMG。Bootstrap 下载运行时组件；Offline 内置这些组件。应用更新器使用完整 Offline 应用归档。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon。Offline 种子与已安装快速路径保持不变。本次变更不扫描历史下载、不回收已安装旧版本、不提供共享 Store 或增量交付，也未证明可以回收所报告的 13 GB。[Issue #57](https://github.com/istarwyh/yourbuddy/issues/57) 保持打开。[Issue #39](https://github.com/istarwyh/yourbuddy/issues/39) 仍保留更广的恢复验收。本次交付没有 Windows 发布渠道。Apple 公证、已安装应用的自动升级、真实供应商与 OAuth 流程、企业代理和实测物理磁盘回收均未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 版本与首次发布脚本 | 通过 | 本地 0.4.10 候选 | Linux x64；Node 24.19.0；合成 Git/API Fixture | [源码检查记录](evidence/source-checks.json)；18 项测试通过 |
| 清理与集成检查 | 历史；结果混合 | 版本改动前的 PR #58 源码 | GitHub Actions | [CI 运行](https://github.com/istarwyh/yourbuddy/actions/runs/38399100814)；Bootstrap 回归和 Linux 静态、覆盖率、构建、制品检查通过；性能基准与 Windows 覆盖率失败 |
| Prepared 工作台与原生 Offline 启动 | 0.4.10 尚未验证 | 发布安装包待生成 | 需要 macOS arm64 Runner | 首次发布和 Tag 重试均保留两项验收阶段 |
| 公开安装包、校验和及更新 Feed | 未验证 | 待发布 | 不适用 | 独立公开字节与元数据检查待完成 |

## 场景：源码发布检查

- 状态：于 2026-10-14 06:54 UTC（Etc/UTC）通过。
- 发布版本：`yourbuddy-v0.4.10`；候选基于 [PR #58](https://github.com/istarwyh/yourbuddy/pull/58) 的合并。不可变发布 Tag 将标识最终已提交的版本改动。
- 受测构建：本地源码，不是签名 macOS 安装包。
- 环境：Linux x64、Node 24.19.0；合成 API 响应与隔离本地 Git 仓库；未使用真实模型供应商。

1. 运行源码检查记录中列出的四个发布脚本测试文件。
2. 预期验证版本一致、固定仓库/分支/版本/SHA、拒绝已有 Release 或无效输入，以及隔离 Fixture 中的原子 Annotated Tag 发布。
3. 实际结果：18 项通过，零失败、零跳过。这些测试未创建生产 Tag 或 Release。

这些测试不验证 macOS 打包或已安装行为。原生验收、公开交付与实际回收空间需要单独观察。

## 已知工程风险

PR #58 的长会话基准记录了 240 轮流式回复期间输入耗时中位数 1434.883238 ms，超过未修改的 1250 ms 预算。原因尚未确定；不将它视为通过，也不归为偶发失败。清理补丁没有浏览器或 TypeScript 改动，但源码观察不证明工作台性能达标。Windows 覆盖率出现本地 Git/pnpm Fixture 超时；独立 Cloudflare 预览缺少部署 Token。本次发布不修改凭据权限或阈值。

## 交付状态

- 产品发布状态：待完成；本发布前记录不声称已有 0.4.10 公开安装包。
- 验证资料归档状态：部分完成；已记录源码检查与已知风险，macOS 发布运行及独立下载公开制品待完成。
- 站点同步状态：产品指引未变，普通发版不需要站点部署。发布后仍需检查双语稳定下载链接。
- 未验证范围：最终全仓 CI、原生 Bootstrap 清理与恢复、公开安装包安装、已安装更新器、物理空间回收、真实供应商与 OAuth、企业代理及 Apple 公证。

## 交付清单

- [x] 版本源与候选标识一致。
- [x] 用户说明描述清理范围，并保留未完成 Issue。
- [x] 明确标记仅源码与历史证据。
- [ ] 记录最终 macOS 发布验收与独立公开交付。
- [ ] 验证不可变可下载归档与稳定站点链接。

## 发布后观察 — 2026-10-14 UTC

[公开 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.10) 于 07:44:06 UTC 发布，非草稿、非预发布，包含 17 个上传制品。原始附注 Tag 仍指向产品与工作流 Commit `3e4a5cd498bb6fbc677f958eb3a261f8b23306ac`。本独立证据更新不移动 Tag，也不替换安装包。

### 打包验收

[发布运行 67](https://github.com/istarwyh/yourbuddy/actions/runs/38527910226) 的完整发布路径通过，包括类型检查、Harness 构建、组件准备、Bootstrap 大小与资源检查、Offline 原生启动、Harbor 搬迁、校验和及发布。[工作流观察](evidence/release-workflow-2026-10-14.json) 标识各步骤及保留制品。

| 场景 | 状态 | 实际结果 | 证据范围 |
|---|---|---|---|
| Prepared 工作台与可选 Harbor | 通过 | 默认八个 Client；实际安装 Profile 后九个 | [Prepared 结果](evidence/prepared-workbench-2026-10-14.json)；Chromium 中的真实 Host/Profile；桌面 invoke 替身不验证原生控件 |
| Offline 原生安装与冷启动 | 通过 | 三轮均进入已认证原生工作台并干净退出；45,529 / 9,164 / 12,231 ms | [脱敏原生结果](evidence/native-offline-2026-10-14.json)；macOS arm64 上的已签名 Offline 种子与本地拒绝代理；不是 Bootstrap 中断测试 |
| 安装包大小 | 通过 | Bootstrap DMG 11,091,479 字节；Offline DMG 611,145,238 字节 | [归档测量](evidence/installer-sizes.json)；不是安装后大小、实际流量或回收空间 |

原始 prepared 与原生工作流制品于 2026-10-21 到期。这些记录保留限定结果，不包含进程标识或本地端点。原生安装在上传前接受测试；未在 macOS 上执行独立下载的安装包。

### 独立公开交付

截至 07:50 UTC，独立 Linux x64 检查已匿名下载全部 17 个上传制品，均为 HTTP 200：共 1,844,681,028 字节。每个字节数与 GitHub SHA-256 摘要均匹配，16 条 `SHA256SUMS.txt` 记录也全部匹配。两个更新归档与组件清单均使用确切产品源码的公钥通过密码学内容签名及可信注释签名检查。[公开观察](evidence/public-verification.json) 保留文件名、URL、大小、Hash、签名及范围。

稳定 `yourbuddy-updater/latest.json` 下载与 Release 清单字节一致，版本为 0.4.10，选择已签名 Offline 归档。五个已签名组件条目均匹配下载归档；Offline 包含六个匹配种子，包括 debug。两个应用归档均包含匹配清单与版本 0.4.10；Bootstrap 不含运行时/种子目录。首次下载尝试在两个 HTTP 403 响应和执行审批取消后停止；一次原样重试完成，未改变凭据、权限或路线。

[Tag 源码 ZIP](https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.10.zip) 完成匿名下载：55,301,287 字节，SHA-256 为 `b5d6c1c02ed4339aab12c33b410737ea85089592c4bb8967adfe667d0d99533a`，并检查 CRC 完整性及双语候选版本归档。[源码观察](evidence/tag-source-verification.json) 标识其确切内容。发布后观察属于本独立证据 Commit，不属于原始 Tag。

线上[中文](https://istarwyh.github.io/yourbuddy/download/)与[英文](https://istarwyh.github.io/yourbuddy/en/download/)下载页均返回 HTTP 200，并保留稳定最新版本链接，其解析到 0.4.10。产品指引未变，无需编辑或部署站点。

### 工程结果与剩余范围

PR #59 的静态检查、Bootstrap 回归、打包启动页及性能基准通过。240 轮输入耗时中位数为 400.871324 ms，预算仍为 1250 ms；[该结果](evidence/source-benchmark-2026-10-14.json) 不确定 PR #58 先前失败的原因，也不证明原生 macOS 性能。不声称全仓 CI 全部通过；Cloudflare 预览独立于 macOS 发布失败。

产品发布与所述公开字节检查已完成。归档仍对原生 Bootstrap 清理与恢复、原生组件/设置操作、已安装自动升级、物理磁盘回收、真实供应商与 OAuth、企业代理及 Apple 公证保持部分完成状态。[Issue #57](https://github.com/istarwyh/yourbuddy/issues/57) 继续跟进历史清理与共享/增量交付；[Issue #39](https://github.com/istarwyh/yourbuddy/issues/39) 保留更广泛恢复验收。Windows 仍不属于本次发布渠道。
