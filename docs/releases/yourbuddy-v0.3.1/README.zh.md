# YourBuddy 0.3.1

[English](README.md) | 中文

- 发布标识：`yourbuddy-v0.3.1`
- 产品渠道：YourBuddy 桌面应用
- 归档状态：公开产品与产物验证已完成；不可变证据链接与下载待补
- 证据 Commit：最终发布准备已在 `de17171f970e43bd8c42d84a1cfeb386f5bc17c3` 通过；公开产物记录在发布后提交，并会补充不可变链接，同时不移动 Tag
- 证据图集：不适用；没有声称完成安装包 UI 旅程，也没有制作截图
- 证据下载：检查解压内容后附加 `yourbuddy-v0.3.1-verification.zip`

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.1 启用 YourBuddy 名称与 Y8 图标，把内置 Harness 更新至 DSH `0.1.2-rc.1`，让 Codex 成为容易发现的默认编码预设，并内置 Harbor Evolution `0.9.2`、Codex Auth `0.3.2`、Better Sidebar `0.18.0`、Plugin Marketplace `0.3.1` 和 Context Doctor `0.7.0`。

通用设置现已提供应用全局代理与企业 CA 控制、相互独立的桌面端与 Node Host 连接诊断、应用重启与签名更新操作，以及安全的外链处理。插件市场安装会保留用户当前选择的 Package 状态与可采取行动的 pnpm 错误。0.3.1 替代未公开的 0.3.0 候选版本，并修正经过审查的外部插件字节的可复现存储方式；0.3.0 没有发布可安装产物。

### 解决了什么问题

从 Finder 启动的 macOS 应用可以在私有 Node Host 启动前应用选定的代理与 CA，让 Agent 请求遵循预期网络策略，同时不关闭 TLS 校验。聊天与插件市场的 HTTP/HTTPS 链接会在系统浏览器中打开；安装插件后，用户无需打开终端即可重启应用。

### 在哪里使用

请在**设置 → 通用设置**中使用网络代理与应用生命周期；在**设置 → 插件市场**中查看并安装符合条件的 DSH Bundle。开始编码会话时选择 **Codex** Agent 预设。

### 如何体验

1. 安装 YourBuddy，并配置所需的模型凭据。
2. 在**设置 → 通用设置**中选择系统代理或自定义代理；可以选择 `.pem` 或 `.crt` CA，然后保存并重启。
3. 对比桌面端与当前 Node Host 的连接结果。
4. 在**插件市场**中安装符合条件的 Package，再重启 YourBuddy 以加载插件。
5. 在聊天回复中打开或复制 HTTP/HTTPS 链接。

### 安装或升级

发布后，请从本 GitHub Release 下载 Apple Silicon DMG。YourBuddy 使用新的应用身份与更新通道，因此请将它安装在 XiaoHui 旁边，并按需重新配置凭据与设置。既不会导入，也不会删除已有 XiaoHui 数据。

### 兼容性、迁移与限制

本版本的发布目标是 Apple Silicon macOS。应用带有 ad-hoc 签名，但尚未使用 Apple Developer 身份完成签名与公证，因此 Gatekeeper 会拒绝下载的 App。不提供 XiaoHui 自动迁移，也不提供 macOS Intel、Windows 或 Linux 安装包。Harbor 流程仍需满足文档中的 Docker 与模型提供方前提条件。真实 GPT OAuth 流量、真实企业代理与 CA、带签名的应用内更新安装，以及安装 DMG 后的交互 UI 仍未验证。

## 验证概览

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 0.3.0 发布失败与恢复 | passed | 0.3.0 Tag 与 0.3.1 源码 Commit | GitHub Actions macOS 15 与本地 macOS 15.6.1 arm64 | [0.3.0 归档](../yourbuddy-v0.3.0/README.zh.md)与[本地记录](evidence/local-validation.txt) |
| 0.3.1 发布准备与产品 Smoke | passed | `de17171f970e43bd8c42d84a1cfeb386f5bc17c3` 的源码 Checkout | macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0 | [本地验证记录](evidence/local-validation.txt) |
| 桌面脚本与文档 | passed | 源码 Checkout | macOS 15.6.1 arm64 | [本地验证记录](evidence/local-validation.txt) |
| 公开发布与安装包产物 | passed | `yourbuddy-v0.3.1` 公开 DMG 与 Updater Archive | GitHub Actions macOS 15；独立 macOS 15.6.1 arm64 下载 | [公开产物记录](evidence/public-artifacts.txt) |

## 场景：0.3.0 发布失败与恢复

- 状态：passed
- 日期与时间：2026-09-06 13:43-14:04 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：失败的 `yourbuddy-v0.3.0` 位于 `78c8f97319fe5ce813c161917fcfcac97c53921c`；恢复 Commit 为 `ba1738fe9a03f7d277c95a7dd2b4b42a826815ca`
- 受测构建：失败的 Tag 工作流、修复后的 Worktree，以及从恢复 Commit 导出的干净 Archive
- 环境：GitHub Actions macOS 15 arm64 与 Node 24.20.0；本地 macOS 15.6.1 arm64 与 Node 22.22.2
- 证据来源：本次发布实测
- 数据：经过审查的公开 Package 字节与合成测试 Fixture；不含用户数据
- 模型或服务：GitHub Actions 与 npm 下载；未请求模型提供方

### 操作步骤

1. 跟踪 0.3.0 工作流，直到 App 与 DMG 构建拒绝插件市场目录摘要。
2. 对比刷新 Worktree、已提交 Git Blob 和干净 `git archive`，确认上游 CRLF 文件被存储为 LF。
3. 仅把外部产品快照目录标记为 Git 二进制内容，提交上游字节，再导出新 Commit 并验证其目录摘要。
4. 把应用版本推进到 0.3.1，同时保持 0.3.0 Tag 不变。

### 预期与实际结果

干净导出的插件市场目录应该匹配已审查摘要 `c7555c06744ce9474da97a5048eb019935d4bd3e8b817b4ab0f4d66b22f9bdfa`。实际摘要匹配，`verifyExternalSnapshot` 接受该导出目录；第一方产品文件与 Policy 文件继续使用仓库 LF 规则。

### 证据与范围限制

[0.3.0 归档](../yourbuddy-v0.3.0/README.zh.md)保留失败工作流和实测不匹配摘要；[本地记录](evidence/local-validation.txt)记录恢复后的摘要。本场景只证明源码字节可复现，不证明安装包。

## 场景：0.3.1 发布准备与产品 Smoke

- 状态：passed
- 日期与时间：2026-09-06 13:58-14:18 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.1`，源码 Commit `de17171f970e43bd8c42d84a1cfeb386f5bc17c3`
- 受测构建：源码 Checkout，以及生成的内置 Harness、冻结离线 pnpm Store、受管理工具链与 Python Runtime
- 环境：macOS 15.6.1 arm64；Node 22.22.2；pnpm 11.7.0；DSH 0.1.2-rc.1；CPython 3.12.14
- 证据来源：本次发布实测
- 数据：合成 Fixture 与 Package Metadata；不含用户数据
- 模型或服务：受控的无凭据 Host 与 Client Smoke、npm 下载；未请求真实模型提供方

### 操作步骤

1. 从干净恢复 Commit 运行 `pnpm --dir apps/desktop-tauri run prepare:release`。
2. 重新构建 DSH 与 Web Client，验证外部产品来源，重建冻结 Store 与 Runtime，并运行完整产品 Smoke。
3. 保留 `@openai/codex` 的瞬时下载失败及其有限重试成功状态。

### 预期与实际结果

该操作应该通过之前失败的快照检查，让全部选定产品保持兼容，装配离线 Store，并暴露每项产品与桌面控制。实际以 587 个 Package、54 个内置 Runtime Peer 链接、6 个完整 Client 插件完成；品牌、外链、插件市场、网络代理与应用生命周期检查全部通过。

### 证据与范围限制

[本地验证记录](evidence/local-validation.txt)包含受限命令结果与摘要。该源码级装配不证明公开发布、DMG 安装、真实 OAuth 流量、真实企业证书链或非 macOS 平台。

## 场景：桌面脚本与文档

- 状态：passed
- 日期与时间：2026-09-06 13:49-13:58 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：计划发布 `yourbuddy-v0.3.1`，源码变更最终形成 `ba1738fe9a03f7d277c95a7dd2b4b42a826815ca`
- 受测构建：源码 Checkout 与生成文档
- 环境：macOS 15.6.1 arm64；Node 22.22.2；pnpm 11.7.0
- 证据来源：本次发布实测
- 数据：合成 Fixture；不含用户数据
- 模型或服务：仅使用 Mock 与受控无凭据服务

### 操作步骤

1. 运行全部 7 个桌面脚本 Suite。
2. 对 `yourbuddy-v0.3.1` 运行发布版本验证。
3. 在更新失败记录与 Agent Note 后运行完整文档门禁。

### 预期与实际结果

把当前版本 Fixture 从 0.3.0 推进到 0.3.1 后，全部 88 个桌面脚本测试通过。发布版本命令输出 `verify-release-version: yourbuddy-v0.3.1`，全部 32 项文档门禁通过。本地记录保留当前版本 Fixture 最初的失败及其修正，不把它隐藏为一次即成功。

### 证据与范围限制

请查看[本地验证记录](evidence/local-validation.txt)。这些是源码、Mock 与生成文档检查，不能据此声称安装后 UI 或真实提供方已经通过。

## 场景：公开发布与安装包产物

- 状态：passed
- 日期与时间：2026-09-06 14:20-14:42 UTC+08:00，Asia/Shanghai
- 发布版本与 Commit：`yourbuddy-v0.3.1`，Tag Commit `c4e316253959ddd71cb842775ef44ed5c9b6b292`
- 受测构建：正式发布的 GitHub Release DMG、Updater Archive、签名、校验文件与 Updater Manifest
- 环境：GitHub Actions macOS 15 arm64；独立 macOS 15.6.1 arm64 下载与检查
- 证据来源：本次发布完成后的实测
- 数据：公开发布文件与 Package Metadata；不含用户数据
- 模型或服务：GitHub Releases 与 YourBuddy 更新通道；未请求模型提供方

### 操作步骤

1. 等待[发布工作流 34016228532](https://github.com/istarwyh/yourbuddy/actions/runs/34016228532)完成全部构建、迁移后 Runtime、校验和、Manifest 与发布步骤。
2. 查询公开的 [YourBuddy 0.3.1 Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.1)，再把全部 5 个产物下载到新的临时目录。
3. 验证 `SHA256SUMS.txt` 的 3 个条目，解析 `latest.json`，并与单独下载的稳定通道 Manifest 逐字节比较。
4. 以只读方式挂载下载的 DMG，检查 App 身份，并运行打包的 Harbor 入口。
5. 全新解压 Updater Archive，检查相同的身份与入口，并在执行前验证其原始 ad-hoc 签名。

### 预期与实际结果

公开文件应该携带 0.3.1 版本、匹配校验和、提供带签名的 `darwin-aarch64` Updater 条目、包含 bundle id 为 `io.github.istarwyh.yourbuddy` 的 `YourBuddy.app`，并能运行打包的 Harbor 命令。以上检查全部通过；版本专属与稳定通道 Updater Manifest 完全一致。原始 App 通过严格 ad-hoc 签名验证；由于没有 Apple Developer 身份，Gatekeeper 拒绝该 App，这与已说明的分发限制一致。

### 证据与范围限制

[公开产物记录](evidence/public-artifacts.txt)列出产物大小、SHA-256、App Metadata、命令、失败恢复与观察到的限制。本场景不声称完成安装 DMG 后的交互 UI、带签名的应用内更新安装、真实提供方或企业网络行为、公证、迁移或其他平台验证。

## 交付状态

- 产品发布状态：已发布；Apple Silicon DMG、带签名的 Updater Archive 与签名、校验文件、版本专属 Manifest 和稳定 Updater Manifest 均可公开下载，并已独立验证。
- 验证资料归档状态：公开产物证据已完成；不可变证据固定链接与解压验证后的资料下载待补。
- 未验证范围：安装 DMG 后的交互 UI；带签名的应用内更新安装；真实 GPT OAuth 或模型提供方响应；真实企业代理与 CA；macOS Intel、Windows 与 Linux；Apple Developer 签名与公证；XiaoHui 自动迁移。

## 交付清单

- [x] 已说明面向用户的变化、问题、入口与体验方法。
- [x] 已说明安装、兼容性、迁移与限制。
- [x] 各场景区分源码、工作流与正式发布构建。
- [x] 保留日期、Commit、环境、步骤、预期与实际结果、失败和恢复。
- [x] 证据已脱敏，并使用相对链接或不可变链接。
- [x] 没有声称制作截图或完成完整产品验收。
- [x] 版本索引与双语记录已更新。
- [x] 公开产物已下载并独立验证。
- [ ] 验证 ZIP 已解压检查，并在不替换发布资产的前提下附加。
- [ ] Release 页面已链接不可变证据 Commit 与下载。
