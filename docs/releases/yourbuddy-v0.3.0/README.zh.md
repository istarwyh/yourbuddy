# YourBuddy 0.3.0

[English](README.md) | 中文

- 发布标识：`yourbuddy-v0.3.0`
- 产品渠道：YourBuddy 桌面应用
- 归档状态：发布前验证已完成；公开产物验证待完成
- 证据 Commit：源码验证在 `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae` 上执行；发布后的 Commit 固定链接将在不移动 Tag 的前提下补充
- 证据图集：不适用；本次执行未声称完成安装包 UI 旅程，也未制作截图
- 证据下载：公开产物验证完成后，将附加独立的 `yourbuddy-v0.3.0-verification.zip`

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.0 启用 YourBuddy 名称和 Y8 图标，把内置 Harness 更新至 DSH `0.1.2-rc.1`，让 Codex 成为容易发现的默认编码预设，并把内置产品刷新为 Harbor Evolution `0.9.2`、Codex Auth `0.3.2`、Better Sidebar `0.18.0`、Plugin Marketplace `0.3.1` 和 Context Doctor `0.7.0`。

通用设置现已提供应用全局代理与企业 CA 控制、相互独立的桌面端与 Node Host 连接诊断、应用重启与签名更新操作，以及安全的外链处理。插件市场会让安装状态与可以采取行动的 pnpm 错误保留在用户选择的 Package 上；安装新插件后，可以通过应用重启控制加载插件。

### 解决了什么问题

从 Finder 启动的 macOS 应用现在可以在启动私有 Node Host 前应用已配置的代理与 CA。因此，Agent 请求与桌面诊断会使用同一项预期网络策略，同时不会停用 TLS 校验。聊天和插件市场链接可以通过 HTTP/HTTPS 允许列表在系统浏览器中打开；安装插件后也可以重启产品，无需使用终端。

### 在哪里使用

请在**设置 → 通用设置**中使用网络代理与应用生命周期功能；在**设置 → 插件市场**中查看并安装符合条件的 DSH Bundle。开始编码会话时选择 **Codex** Agent 预设；Markdown 链接会显示在助手消息与插件市场详情面板中。

### 如何体验

1. 安装并打开 YourBuddy，然后配置所需的模型凭据。
2. 在**设置 → 通用设置**中选择系统代理或自定义代理；可以选择 `.pem` 或 `.crt` CA，然后保存并重启。
3. 对比桌面端与当前 Node Host 的连接结果。
4. 打开**插件市场**，安装符合条件的 Package，再通过**重启 YourBuddy**加载插件。
5. 在聊天回复中打开 HTTP/HTTPS 链接；需要时通过上下文菜单复制地址。

### 安装或升级

发布完成后，请从 GitHub Release 下载 Apple Silicon DMG。本版本会把产品身份从 XiaoHui 切换至 YourBuddy：请把 YourBuddy 安装在 XiaoHui 旁边，并按需重新配置凭据与设置。带签名的更新通道从 YourBuddy 开始，不会迁移已有 XiaoHui 安装。

### 兼容性、迁移与限制

本版本的发布目标是 Apple Silicon macOS。YourBuddy 使用独立的应用 ID、数据目录、运行时资源、发布资产与更新通道；既不会导入，也不会删除已有 XiaoHui 数据。应用尚未使用 Apple Developer 身份完成签名与公证。不提供 XiaoHui 数据自动迁移、macOS Intel、Windows 或 Linux 安装包。Harbor 流程需要满足其文档中的 Docker 与模型提供方前提条件。发布前源码验证没有实测真实 GPT OAuth 流量、真实企业代理或 CA，也没有验证正式安装的 DMG。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 发布准备与完整产品 Smoke | passed | `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae` 的源码 Checkout | macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0 | [本地验证记录](evidence/local-validation.txt) |
| 静态、脚本与原生检查 | passed | 源码 Checkout | macOS 15.6.1 arm64、Rust 1.98.0 | [本地验证记录](evidence/local-validation.txt) |
| GitHub Release 与安装后产物 | not verified | 正式发布产品 | GitHub Release 与干净的 macOS 安装环境 | 等待 Tag 流水线和独立下载 |

## 场景：发布准备与完整产品 Smoke

- 状态：passed
- 日期与时间：2026-09-06 13:15-13:20 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：`yourbuddy-v0.3.0`、版本 `0.3.0`、源码 Commit `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae`
- 受测构建：源码 Checkout，以及本地生成的内置 Harness、冻结离线 pnpm Store、受管理工具链与 Python Runtime
- 环境：macOS 15.6.1 arm64；Node 22.22.2；pnpm 11.7.0；DSH 0.1.2-rc.1；为产品 Runtime 生成的 CPython 3.12.14；可访问 GitHub 和 npm
- 证据来源：本次发布实测
- 数据：合成测试 Fixture 与 Package Metadata；不含用户数据
- 模型或服务：受控的无凭据 Host/Client Smoke；未请求真实模型提供方

### 操作步骤

1. 在干净的隔离发布 Worktree 中运行 `pnpm --dir apps/desktop-tauri run prepare:release`。
2. 让命令解析当前 DSH 与产品来源、构建 DSH、重新生成冻结产品 Lockfile 与离线 Store、装配 Python Runtime，并运行产品 Smoke。
3. 提交重新生成的 Lockfile，并针对 `yourbuddy-v0.3.0` 重新运行发布版本检查。

### 预期结果

最新且符合条件的 DSH 与产品输入保持兼容；冻结离线安装成功；完整 Host 与 Client 暴露全部内置产品和桌面控制；版本源与目标 Tag 一致。

### 实际结果

命令选择 DSH `0.1.2-rc.1`，保留文档记录的产品版本，生成覆盖 587 个 Package 的 Store，并通过品牌与发布 Smoke。最终发布 Smoke 报告 54 个内置 Runtime Peer 链接、6 个完整 Client 插件、外链、插件市场、网络代理和应用生命周期控制全部通过。Tag 与版本检查输出 `verify-release-version: yourbuddy-v0.3.0`。

### 证据

- 操作前：发布分支在源码 Commit 上保持干净；已提交的 DSH 来源记录选择 `dsh-v0.1.2-rc.1`。
- 执行中：[本地验证记录](evidence/local-validation.txt)记录构建、冻结 Store 与 Runtime 准备摘要。
- 结果：[本地验证记录](evidence/local-validation.txt)记录最终产品 Smoke 摘要与退出状态。
- 失败与恢复：不适用于本场景；最终执行中的发布准备步骤没有失败。

### 范围限制

该源码级完整 Smoke 不能证明带签名 Updater 下载、DMG 安装、真实 GPT OAuth 请求、真实企业证书链或非 macOS 平台。

## 场景：静态、脚本与原生检查

- 状态：passed
- 日期与时间：2026-09-06 13:20-13:26 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：`yourbuddy-v0.3.0`、版本 `0.3.0`、源码 Commit `b48af1c4378e03bf0fe90e4d7bcaddb7f2e612ae`
- 受测构建：源码 Checkout 与本地构建的 TypeScript/Rust 测试产物
- 环境：macOS 15.6.1 arm64；Node 22.22.2；pnpm 11.7.0；rustc 与 cargo 1.98.0
- 证据来源：本次发布实测
- 数据：合成 Fixture；不含用户数据
- 模型或服务：仅使用 Mock 与受控的无凭据服务

### 操作步骤

1. 运行 7 个桌面脚本 Suite，覆盖 Updater Manifest、发布版本、源码 Bundle、产品刷新、发布准备、离线装配与 Overlay 行为。
2. 运行 `pnpm run typecheck`、`pnpm run lint` 与 `pnpm run hygiene`。
3. 运行 `cargo test --locked --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml`。

### 预期结果

每项选定门禁都以零状态退出，桌面原生测试继续覆盖代理、企业 CA、链接策略、生命周期、Updater、预配与产品身份行为。

### 实际结果

全部 88 个桌面脚本测试通过。类型检查与 lint 以零状态退出。Hygiene 最初发现生成的桌面 Bundle 与经过检查的外部产品快照被当作 DSH 源码扫描；发布分支增加范围明确的排除项，同时保留对第一方 Personal Workbench 的覆盖。此后 14 个针对性门禁测试和全部 15 项 Hygiene Leaf 均通过。全部 114 个 Rust 测试通过；编译器告警得到保留，但没有导致 Suite 失败。

### 证据

- 操作前：[本地验证记录](evidence/local-validation.txt)保留 Hygiene 最初两项失败及其影响类别。
- 执行中：源码门禁排除范围仅包含生成的 Bundle 和具名外部产品快照；针对性测试证明第一方产品可执行文件仍会接受检查。
- 结果：[本地验证记录](evidence/local-validation.txt)记录零退出状态与测试数量。
- 失败与恢复：相同记录保留最初的 `application entrypoints` 与 `vendor rescope` 失败，以及范围明确的修复完成后的成功重跑。

### 范围限制

这些检查验证源码与本地构建的测试产物，不构成安装包 UI 验收、正式安装程序验证、Apple 公证检查或真实提供方与网络测试。

## 场景：公开发布与安装后产物

- 状态：not verified
- 日期与时间：2026-09-06 13:26 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：`yourbuddy-v0.3.0`、版本 `0.3.0`；Tag Commit 待产生
- 受测构建：尚无正式发布产品
- 环境：计划使用 GitHub Release macOS 15 arm64 工作流；独立下载环境待验证
- 证据来源：本次发布执行，等待正式发布
- 数据：不适用
- 模型或服务：GitHub Releases 与 YourBuddy 更新通道；发布后尚未查询

### 操作步骤

1. 提交归档与发布前门禁后，发布准确的 `yourbuddy-v0.3.0` 注释 Tag。
2. 等待 macOS 工作流发布 DMG、Updater 归档、签名、校验和与稳定更新 Manifest。
3. 独立下载公开资产，验证校验和与 Manifest URL，检查 App 版本，并运行迁移后的 Harbor 入口。

### 预期结果

每个有记录的资产均可以公开下载，校验和匹配，Updater Metadata 选择 0.3.0，并且解压后 Runtime 可以执行 Harbor 入口。

### 实际结果

打 Tag 前尚未验证。本节会在后续 Commit 中更新，同时不移动公开 Tag，也不替换版本专属资产。

### 证据

- 操作前：源码与本地发布准备证据已记录在上文。
- 执行中：等待 Tag 工作流。
- 结果：等待公开下载与检查。
- 失败与恢复：目前不适用。

### 范围限制

本打 Tag 前记录不声称产品已经发布。

## 交付状态

- 产品发布状态：尚未发布；本地候选发布版本的准备与检查已通过。
- 验证资料归档状态：部分完成；发布前证据已提交，仍需补充不可变证据 Commit 固定链接、公开产物证据与可下载验证资料包。
- 未验证范围：正式安装 DMG 后的 UI 旅程；真实 GPT OAuth 或模型提供方响应；真实企业代理与 CA；macOS Intel、Windows 与 Linux；Apple Developer 签名与公证；XiaoHui 自动迁移。

## 交付清单

- [x] 发布标识与全部版本源符合现有渠道流程。
- [x] 开头说明回答改了什么、解决了什么问题、在哪里使用以及如何体验。
- [x] 适用时说明安装或升级、兼容性、迁移与已知限制。
- [x] 每个已完成场景记录日期、时区、Commit、环境、受测构建、证据来源、数据类型及模型或服务类型。
- [x] 操作步骤、预期结果、实际结果、状态和范围限制符合实际观察。
- [x] 按价值保留操作前、执行中、结果、失败和恢复状态，不设置截图数量指标。
- [x] 明确标记仅测源码、合成数据、Mock、跳过、失败和未验证证据。
- [x] 未声称存在截图；日志与源码引用受限并可追溯。
- [x] 只跟踪脱敏证据；不含凭据、个人信息、私有内容、代理地址或私有 Workspace 路径。
- [x] 已在 `docs/releases/README.zh.md` 中添加版本条目，并确认两种语言内容一致。
- [x] 相对链接可以渲染，引用的每个本地文件都存在。
- [ ] 已解压可下载的验证资料归档，并成功打开文档列出的内容。
- [ ] 公开发布页固定链接到证据 Commit 与下载地址，不依赖移动分支。
- [ ] 已独立于 CI 和临时 Workflow 产物检查真实产品目的地。
- [ ] 已记录发布文件名、版本、Hash、Updater Metadata 与安装后行为。
- [x] 分别报告产品发布状态、验证资料归档状态与未验证范围。
- [x] 未移动或覆盖公开 Tag 与安装包；修正内容必须使用新版本。
