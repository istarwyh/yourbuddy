# YourBuddy 0.4.4

[English](README.md) | 中文

本归档记录 Issue #36、#37、#38 的修复、为 Issue #34 保留的实际发布 Bundle 回归门禁，以及取代未发布 0.4.3 尝试的快照元数据修正。

- 发布标识：`yourbuddy-v0.4.4`
- 产品渠道：适用于 macOS Apple Silicon 的 YourBuddy 桌面应用。
- 归档状态：已发布；聚焦源码、Bundle、离线安装、公开产物、Updater 与 Bootstrap DMG 检查在下述限制内通过。
- 证据 Commit：Release Tag Commit `754ed86d56`，包含实现 Commit `dfd0d2308d`、`a9baac94e5`、`4597396e64` 及快照修正 `472c6a4137`。
- 证据图集：不适用；可见路径由确定性的源码、Bundle 与生命周期测试覆盖。
- 证据下载：[YourBuddy 0.4.4 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.4.4)。

## 面向用户的发布说明

### 改了什么

YourBuddy 现在使用聚焦产品定位的启动页，把随产品提供的能力作为 Package + CLI + Skill + UI 整体管理，并通过一个稳定的应用 Gateway 暴露可信第一方桌面操作。Harbor 升级到 0.10.3，运行时缺失时可以直接从错误状态安装。0.4.2 的 Better Sidebar `clsx` 启动修复继续由实际 Bundle 回归测试保护。本版本还修正了阻止 0.4.3 生成任何公开产物的 Harbor Python 来源记录 Hash。

### 解决了什么问题

此前桌面启动页较为通用，内置插件的 CLI 或 Skill 可能与 UI 不同步，Harbor 缺少运行时时用户也会停在死路。长期维护逐条桌面命令白名单还会让普通第一方演进变得脆弱。本次发布把内置能力的各部分视为同一个版本单元，并信任应用自有命令，同时保留操作系统权限、签名以及显式安装或启用插件的要求。

### 在哪里使用

新的启动页会在应用启动时出现。设置中的 Capability Pack 会一起显示 Package、CLI、Skill 与 UI 状态。Harbor 恢复入口位于其 Workbench 错误状态，托管 CLI Path 则从设置中启用。

### 如何体验

启动 YourBuddy，打开设置并查看 Harbor Capability Pack。启用终端命令，重新打开终端后运行 `dsh-harbor --version`；它会报告与内置 Harbor Plugin 相同的版本。如果 Harbor 提示运行时缺失，选择安装操作并重试。

### 安装或升级

从 GitHub Release 安装 Apple Silicon Bootstrap 或 Offline DMG。Bootstrap DMG 继续受严格的 30,000,000 Byte 发布门禁约束。现有设置、Session、工作空间、凭据与组件缓存都会保留。

### 兼容性、迁移与限制

本版本面向 macOS Apple Silicon，不需要数据迁移。Capability Pack Manager 目前优先支持 macOS，并且不会覆盖同名的外部命令。操作系统文件权限、代码签名以及第三方插件的显式安装或启用要求保持不变。本次只把 Harbor 刷新到 0.10.3；无关外部插件快照与已经验证的 0.4.2 DSH 基线有意保持不变。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 启动页与可信桌面 Gateway | 在源码与 Runtime Check 范围内通过 | 0.4.4 候选版本 | macOS Apple Silicon、Node、Rust | 聚焦生命周期与权限测试通过；`cargo check` 通过 |
| Harbor Capability Pack 与运行时恢复 | 通过 | 内置 Harbor 0.10.3 与 Personal Workbench | macOS Apple Silicon、Node | 58 项 Workbench 测试、29 项刷新／兼容性测试及离线安装通过 |
| Better Sidebar 打包回归 | 通过 | 桌面打包实际使用的产品 `lib/client.js` | Node Test Runner | 11 项 Bundle 测试全部通过，包括 `clsx` 断言 |
| Bootstrap 体积与正式发布 | 通过 | `yourbuddy-v0.4.4` 公开 Release | GitHub Actions macOS arm64 与 macOS 匿名下载 | Workflow `37032932136` 通过；发布 14 个产物；Bootstrap DMG 为 10,839,117 Byte；已检查公开 Hash、Updater 元数据／签名与 DMG 完整性 |

## 场景：开放的桌面能力生命周期

- 状态：在声明的本地范围内通过。
- 日期与时间：2026-10-02 21:40 CST（UTC+08:00）。
- 发布版本与 Commit：包含实现 Commit `dfd0d2308d`、`a9baac94e5`、`4597396e64` 及快照修正 `472c6a4137` 的 `yourbuddy-v0.4.4` 候选版本。
- 受测构建：已签入的桌面 Shell、Personal Workbench、Harbor 0.10.3 快照、生成的 Harness Bundle 与离线依赖 Store。
- 环境：macOS Apple Silicon，以及仓库配置的 Node、pnpm 与 Rust Toolchain。
- 证据来源：聚焦 Vitest 与 Node 测试、`cargo check`、Bundle 构建及 Frozen Offline Install。
- 数据：确定性本地 Fixture 与打包源码资源；不含用户数据。
- 模型或服务：未调用模型；GitHub 发布仍待进行。

### 操作步骤

1. 构建 Personal Workbench 与完整 Harness，然后运行桌面生命周期、命令 Gateway、Capability Pack、Harbor 刷新与兼容性测试。
2. 只把 Harbor 刷新到最新稳定的 0.10.3 配套版本，重放已审阅的运行时恢复补丁，重建 Harness Bundle，并从 Frozen Offline Store 安装。
3. 通过打包回归测试检查实际 Better Sidebar Bundle。

### 预期结果

启动页能传达 YourBuddy 可配置工作台定位，内置能力的各部分保持同一版本，第一方桌面操作只经过一个稳定且可信的 Gateway，Harbor 提供直接运行时恢复，同时打包后的 Better Sidebar 调用保持有效。

### 实际结果

聚焦桌面与产品检查均已通过。Capability Pack Suite 通过 58 项测试，刷新与兼容性检查通过 29 项测试，11 项 Bundle 测试全部通过，`cargo check` 通过，Offline Store 也成功安装了包含 549 个包的生产依赖图。

### 证据

- 操作前：启动体验较为通用，能力各部分没有统一生命周期，Harbor 运行时缺失会形成死路，桌面命令演进需要逐条修改权限。
- 执行中：Harbor 独立升级到 0.10.3，避免无关插件更新进入本次发布。
- 结果：候选版本包含新启动页、单一可信第一方 Gateway、同版本 Capability Pack 协调、托管 CLI Path、Harbor 安装并重试，以及实际 Bundle `clsx` 门禁。
- 失败与恢复：全量外部插件刷新发现无关的 Better Sidebar 上游补丁冲突，因此刷新器增加显式单插件选择并只更新 Harbor。首次 0.4.3 Tag Workflow（`37030448092`）随后在干净 Checkout 中发现过期的 Harbor Python 来源记录 Hash，并在发布前停止；0.4.4 修正该记录，没有移动失败的 Tag。

### 范围限制

发布后没有手工操作已安装应用与 WebView Control。601,637,156 Byte 的 Offline DMG 未再次下载并进行第二次本地 `hdiutil` 检查，公开 Harness 组件也未在下载后单独解包；两者的 Workflow 检查、公开 SHA-256 与 GitHub 产物 Digest 已通过。Apple Developer 签名与公证仍不属于本渠道。

## 交付状态

- 产品发布状态：已在不可变 `yourbuddy-v0.4.4` Tag 发布 14 个公开产物；稳定 Latest Release 链接已指向本版本。
- 验证资料归档状态：在声明范围内完整；已检查 Workflow `37032932136`、公开产物元数据、全部公开 Checksum 条目、Updater 元数据／签名、下载后的 Bootstrap SHA-256 与 Bootstrap DMG 完整性。
- 站点同步状态：不适用，因为稳定 GitHub Release 链接与产品指南没有变化。
- 未验证范围：手工安装后启动与 WebView 交互、第二次本地 Offline DMG 完整性检查、下载后单独解包 Harness、Apple Developer 签名与公证。

## 交付清单

- [x] 已记录版本源、用户说明、本地证据、限制与双语归档。
- [x] Issue #36、#37、#38 已由聚焦测试及更新后的打包源码路径覆盖。
- [x] Issue #34 继续由桌面打包实际使用的 Better Sidebar Bundle 回归测试覆盖。
- [x] Frozen 生产依赖图已从准备好的 Offline Store 成功安装。
- [x] 已分别报告产品发布、资料归档、网站与未验证范围。
- [x] 已核验公开 Workflow、14 个产物、Hash、Updater 元数据／签名、稳定 Latest 链接与 30,000,000 Byte Bootstrap 门禁。
- [ ] 手工打包启动与 WebView 交互仍未验证。
- [x] 没有移动或覆盖现有公开 Tag 与安装包。
