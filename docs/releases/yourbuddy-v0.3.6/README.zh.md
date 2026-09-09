# YourBuddy 0.3.6

[English](README.md) | 中文

本归档目前记录 0.3.6 的企业网络修复、完整本地发布准备与 PR CI。公开桌面产物、Updater 元数据、App 检查、官网部署和可下载验证资料仍待发布后记录。

- 发布标识：`yourbuddy-v0.3.6`。
- 产品渠道：面向 macOS Apple Silicon 的 YourBuddy 桌面应用；npm、Python、SDK 及其他发布渠道不适用。
- 归档状态：候选发布的部分归档；已记录源码、本地合成私有 CA 路径、组装运行时、文档与 PR CI 证据。
- 受测产品 Commit：[`ae00df24539f07479a6d097cf0c06e86b493d86e`](https://github.com/istarwyh/yourbuddy/commit/ae00df24539f07479a6d097cf0c06e86b493d86e)，由 [PR #19](https://github.com/istarwyh/yourbuddy/pull/19) 合并为 [`d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`](https://github.com/istarwyh/yourbuddy/commit/d0b55a7fee27fc240b1ef68ad14d968d4b96c0db)。
- 证据图库：候选阶段不适用；未启动安装包中的应用。
- 证据下载：等待公开产物验证。

## 用户发布说明

### 改动内容

YourBuddy 0.3.6 对原生桌面客户端以及应用启动的 Host、插件、WSL、安装器、预配置流程、Updater 和新内置 Node 进程应用同一套显式企业代理与自定义 CA 规则。本版本还把 Better Sidebar 更新至 0.18.1、Harbor Evolution 更新至 0.9.5。

### 解决的问题

启动环境中的企业 CA 以前可能在托管 Host 启动前丢失，不同进程也可能使用不同的代理或信任设置。因此，设置页测试通过并不能证明新启动的 Host 可以连接。修复后的版本按显式优先级解析唯一 CA 来源，验证完整证书文件，清理冲突的环境代理变量，把解析结果传递给每个托管运行时，并要求原生与新 Node 预检都通过后才持久化或重启。

### 使用位置

当 YourBuddy 需要通过企业代理访问 HTTPS 服务，或需要信任组织提供的根 CA 时，请使用**设置 → 网络代理**。页面分别显示当前 Host、原生草稿和内置 Node 草稿，因此保存前可以直接看到不一致。

### 体验步骤

1. 打开**设置 → 网络代理**，按绝对路径选择当前有效的 `.pem` 或 `.crt` CA 文件，或在已配置 `NODE_EXTRA_CA_CERTS` 的启动环境中启动 YourBuddy。
2. 如有需要，配置企业代理并运行**测试连接**。
3. 确认原生客户端与新内置 Node 测试均通过，再使用**保存并重启**。
4. 重新打开页面，确认显示的 CA 来源符合预期：设置、启动环境或系统信任库。

### 安装或升级

发布后，请从 [0.3.6 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6) 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。候选阶段尚未验证公开产物与真实 Updater 安装。

### 兼容性、迁移与限制

桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。现有应用数据会保留，无需迁移。只有用户在设置中显式选择的 CA 会持久化；继承的 `NODE_EXTRA_CA_CERTS` 仍由启动环境管理。自定义 CA 必须使用绝对、规范化的 `.pem` 或 `.crt` 路径，文件必须是大小受限且可读的普通文件，并且只包含可以解析、当前有效的 X.509 证书。TLS 验证不能关闭。应用尚未使用 Apple Developer 身份签名或公证。合成本地 CA 与 CONNECT 代理证明了实现路径，但不证明真实企业网络行为。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 企业 CA 与代理规则 | 在源码与合成网络范围内通过 | `ae00df245...` 的源码与真实 CLI Host | macOS 15.6.1 arm64；Rust 1.98.0；内置 Node 22.19.0；本地私有 CA、HTTPS Origin 与 CONNECT 代理 | [本地候选记录](evidence/local-candidate-validation.txt) |
| 完整本地发布准备 | 通过 | 本地组装候选，不是安装包 | macOS arm64；pnpm 11.7.0；离线生产依赖重装 | [本地候选记录](evidence/local-candidate-validation.txt) |
| PR CI | 在限定测试同步修复后通过 | `ae00df245...` 的源码 | GitHub 托管 Linux、macOS 与 Windows 矩阵 | [Run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650)；[本地候选记录](evidence/local-candidate-validation.txt) |
| 产品发布与 Updater | 待处理 | 尚无公开 0.3.6 产品文件 | GitHub Release 与稳定更新渠道 | Tag 工作流完成后记录 |
| 公开 App 与迁移运行时 | 待处理 | 尚无公开 0.3.6 App | macOS arm64 | 匿名下载后记录 |
| 产品官网 | 待处理 | 尚无已部署的 0.3.6 官网源码 | 本地站点构建与 GitHub Pages | 发布后记录 |
| 可下载验证资料 | 待处理 | 尚无 0.3.6 证据 ZIP | GitHub Release | 最终归档 Commit 后记录 |
| 安装包原生启动与 WebView 路径 | 未验证 | 未启动安装包中的 0.3.6 App | macOS arm64 | 没有截图或已安装产品声明 |
| 真实企业代理与 CA | 未验证 | 仅使用合成本地网络 | 本地隔离服务 | 未使用组织证书、凭据或外部企业端点 |

## 场景：企业 CA 与代理规则

- 状态：拥有关系的源码行为、原生行为与合成端到端 Host 请求通过；安装包 WebView 与真实企业流量未验证。
- 日期与时间：2026-09-09，Asia/Shanghai，UTC+08:00。
- Release 与 Commit：`yourbuddy-v0.3.6` 候选；受测修复 Commit `ae00df24539f07479a6d097cf0c06e86b493d86e`，合并为 `d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`。
- 受测构建：源码原生测试、受控浏览器组件，以及使用内置 Node 22.19.0 启动的真实 CLI Host；不是 DMG 或已安装 App。
- 环境：macOS 15.6.1 arm64、Rust 1.98.0、Node 22.19.0、本地生成的私有 CA 与叶证书、本地 HTTPS Origin 和本地 HTTP CONNECT 代理。
- 证据来源：本次发布。
- 数据：合成证书材料与回环端点；没有代理凭据、组织证书、账户数据或私有 Session 内容。
- 模型或服务：本地受控服务；没有模型或外部供应商请求。

### 步骤

1. 分别测试显式选择、继承进程环境、继承 macOS `launchctl` 与系统信任的优先级；无效路径、文件类型、大小、证书语法、生效时间和过期状态作为负例。
2. 测试清理环境代理后的传播结果，覆盖原生请求客户端、Host、插件、WSL、安装器、预配置流程与 Updater 输入。
3. 并发运行两份独立真实 Host 测试。每份测试均创建私有 CA HTTPS Origin 与 CONNECT 代理，分别在无 CA 和有 CA 时调用 CLI Host，并等待子进程及服务器完整清理。
4. 测试设置组件，确保当前 Host、原生草稿、内置 Node 草稿、来源诊断与失败行为保持独立。

### 预期

设置中显式选择的 CA 覆盖继承的启动值；否则启动值覆盖系统信任。只有显式选择会持久化。每个托管运行时都会在清理冲突环境代理值后收到相同的代理、CA 和来源元数据。只有原生与新内置 Node 测试都通过时才会保存或重启。TLS 验证始终启用。

### 实际结果

限定范围的原生、产品、组件、WSL、预配置、插件与真实 Host 测试全部通过。两份并发 Host 调用在缺少生成 CA 时失败，配置 CA 后均返回 HTTP 204。无效、不可读、尚未生效和已经过期的证书输入均被拒绝。同一 Host 与 Port 的回环声明统一为 HTTP CONNECT。受控测试中，预检失败会保留已持久化设置与当前运行状态。

### 证据

- 修复前：[Issue #18](https://github.com/istarwyh/yourbuddy/issues/18) 记录 CA 丢失与跨运行时不一致；本归档没有复制凭据或私有证书。
- 过程中：测试套件生成临时证书与代理材料，并在服务器和子进程关闭后删除。
- 结果：准确测试数量与命令见[本地候选记录](evidence/local-candidate-validation.txt)；[PR #19](https://github.com/istarwyh/yourbuddy/pull/19) 包含完成审阅的实现。
- 失败与恢复：真实 Host 测试原本可能在子进程关闭前因超时拒绝。清理逻辑改为等待子进程 `close` 事件和两个服务器关闭，随后两份并发完整调用通过。

### 范围限制

本场景不能证明真实企业代理、组织 CA、代理认证、外部供应商端点、安装包 WebView 控件、已安装应用、Updater 安装或非 macOS 桌面产品。

## 场景：本地发布候选组装

- 状态：完整事务重试后通过。
- 日期与时间：2026-09-09，Asia/Shanghai，UTC+08:00。
- Release 与 Commit：基于合并修复 Commit `d0b55a7fee27fc240b1ef68ad14d968d4b96c0db` 的 `yourbuddy-v0.3.6` 候选。
- 受测构建：本地组装的 Harness、离线 Store、生产依赖、Python 运行时与六个产品插件；不是安装包或公开下载。
- 环境：macOS 15.6.1 arm64、Node 22.19.0、pnpm 11.7.0、Python 3.12.14、Harbor 0.21.0、Harbor Evolution 0.9.5。
- 证据来源：本次发布。
- 数据：合成产品 Smoke 输入与隔离构建目录。
- 模型或服务：受控本地 Host；没有付费或外部模型请求。

### 步骤

1. 在不修改产品树的情况下检查选定的上游 DSH Release。
2. 构建 220 个 Client 产物，打包 Harness 源码，组装生产依赖树并准备离线 Store。
3. 删除全部 587 个生产包，然后从已准备 Store 离线重装，下载数为零。
4. 验证 54 个 Peer Link、Python 与 Harbor 标识、六个组装插件、Host 行为及正常关闭。

### 预期

候选可以从锁定数据重新创建，离线重装生产依赖，以准确 Peer 加载全部配置插件，并在不依赖之前残缺目录的情况下启动及停止 Host。

### 实际结果

完整准备通过。Harness 源码、离线 Store、Store 归档与 Harness Bundle 的 SHA-256 已记录在本地证据文件中。产品包含 Better Sidebar 0.18.1、Harbor Evolution 0.9.5、Python 3.12.14 与 Harbor 0.21.0。

### 证据

- 修复前：第一次事务因为普通 npm 预发布 Peer 匹配不包含 DSH 0.1.2-rc.1 而拒绝 Harbor Evolution 0.9.5，并完成回滚。
- 过程中：为内置 DSH 预发布版本添加准确、限版本的 Harbor Peer Override，并删除过时的 Client Runtime 注入。
- 结果：完整组装、零下载重装、Hash、标识与六插件 Smoke 见[本地候选记录](evidence/local-candidate-validation.txt)。
- 失败与恢复：初次填充外部 Store 时重试过一次网络请求。只有之后的完整事务与零下载重装被用作通过证据。

### 范围限制

这证明本地组装运行时，不证明工作流构建的 DMG、Updater 归档、公开字节、代码签名、App 启动或更新安装。

## 场景：PR CI 与持久化测试恢复

- 状态：修复测试生命周期同步后通过；失败 Run 作为负例保留。
- 日期与时间：2026-09-09 21:25 至 22:41 UTC+08:00，Asia/Shanghai。
- Release 与 Commit：问题修复 Commit `ae00df24539f07479a6d097cf0c06e86b493d86e`；PR #19 合并为 `d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`。
- 受测构建：源码 Checkout 与完整仓库 CI 矩阵；没有发布 Release 产物。
- 环境：GitHub 托管 Linux、macOS 与 Windows Runner，以及仓库声明的 Node、Rust、Python 和 Wine Lane。
- 证据来源：本次发布。
- 数据：仓库 Fixture 与合成测试数据。
- 模型或服务：无 Key 测试服务；不要求真实供应商 E2E。

### 步骤

1. 在初始修复 Commit 运行 PR CI，并保留 Windows Coverage Run 34356938688；它在异步持久写入完成前读取投影缓存文件，因而读到旧值。
2. 确认失败的产品路径未修改且与近期 Windows 成功 Run 逐字节一致，然后只修改测试：读取磁盘前，订阅后端持久化后发出的准确 `domain/changed` 事件。
3. 先运行一次限定文件，再独立顺序运行四次；每次均通过全部 21 个用例。
4. 在 `ae00df245...` 运行完整 CI 矩阵，只在必需 Job 通过后合并。

### 预期

持久化断言应等待拥有方的写入后事件，而不是依赖一秒通用轮询期限，同时保留准确的磁盘序号断言。合并前必须通过完整平台矩阵。

### 实际结果

[Run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650) 的全部必需 Job 通过，包括 Windows Coverage。[Run 34356938688](https://github.com/istarwyh/yourbuddy/actions/runs/34356938688) 仍作为失败证据保留，不计为成功。Cloudflare Pages Preview 使用不可用的 Self-hosted Runner Label，从未运行并被取消，没有计为通过。

### 证据

- 修复前：Windows Coverage 失败的 [Run 34356938688](https://github.com/istarwyh/yourbuddy/actions/runs/34356938688)。
- 过程中：限定 21 用例文件与四次独立顺序调用，记录于[本地候选记录](evidence/local-candidate-validation.txt)。
- 结果：完整成功的 [Run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650) 与已合并的 [PR #19](https://github.com/istarwyh/yourbuddy/pull/19)。
- 失败与恢复：测试现在等待拥有方的持久化事件；没有扩大超时，也没有削弱断言。

### 范围限制

CI 仅证明受测源码与矩阵。它不能证明产品发布、匿名下载、官网部署、原生应用启动或真实企业流量。

## 交付状态

- 产品发布状态：待处理；`yourbuddy-v0.3.6` 尚未创建 Tag 或发布，不声明任何产品附件。
- 验证资料归档状态：部分完成；已记录源码、合成网络、本地候选、失败／恢复与 PR CI 证据。公开产物、Updater、App／运行时、官网与可下载 ZIP 证据待处理。
- 官网同步状态：待处理；不声明任何 0.3.6 官网部署或线上 URL。
- 未验证范围：公开 DMG 与 Updater 字节、校验和、Updater 签名与安装、App 标识与原生启动、安装包 WebView 路径、Apple Developer 签名与公证、真实企业代理或证书、代理认证、官网部署、Intel macOS，以及 Windows 与 Linux 桌面产品。

## 交付清单

- [x] 候选发布标识与版本源均已对齐至 0.3.6。
- [x] 开头说明解释了改动、问题、产品区域与最短可观察路径。
- [x] 已说明安装、兼容性、迁移行为、证书要求与当前限制。
- [x] 源码、本地组装与 CI 场景记录环境、构建类型、数据类型、步骤、预期和实际结果、恢复及范围限制。
- [x] 合成、仅源码、已取消、失败、待处理和未验证观察均有明确标记。
- [x] 凭据、私有证书、账户数据与私有 Session 内容未进入归档。
- [x] 两种语言索引均已添加 Release 条目，并提供双语版本页。
- [ ] 记录公开 Tag、Release Commit、Workflow、文件名、Hash、校验和、Updater Manifest 与签名。
- [ ] 检查匿名下载的公开 App 与迁移运行时。
- [ ] 验证受影响的安装包 WebView 设置路径，或作为明确限制保留。
- [ ] 同步并部署双语产品官网，并检查线上 URL。
- [ ] 从不可变 Commit 创建可下载证据归档，完成上传、匿名下载、比较与解压。
- [x] 分别报告产品发布、验证资料归档、官网同步与未验证范围。
- [x] 未移动或覆盖公开 Tag 和安装包。
