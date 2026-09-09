# YourBuddy 0.3.6

[English](README.md) | 中文

本归档记录 0.3.6 企业网络修复、完整本地发布准备、PR CI、正式发布、公开文件完整性、Updater 签名、App 标识、迁移运行时、已部署双语产品官网、证据收尾 CI 与可下载验证资料。原生启动、安装包 WebView 操作及官网浏览器可视渲染仍未验证。

- 发布标识：`yourbuddy-v0.3.6`。
- 产品渠道：面向 macOS Apple Silicon 的 YourBuddy 桌面应用；npm、Python、SDK 及其他发布渠道不适用。
- 归档状态：在声明范围内完成；已记录公开产品、官网、保留的 CI 失败与恢复，以及可下载证据 ZIP。
- 受测产品 Commit：[`ae00df24539f07479a6d097cf0c06e86b493d86e`](https://github.com/istarwyh/yourbuddy/commit/ae00df24539f07479a6d097cf0c06e86b493d86e)，由 [PR #19](https://github.com/istarwyh/yourbuddy/pull/19) 合并为 [`d0b55a7fee27fc240b1ef68ad14d968d4b96c0db`](https://github.com/istarwyh/yourbuddy/commit/d0b55a7fee27fc240b1ef68ad14d968d4b96c0db)；终端修正 [`2b409de193d9aad1da24ebbc46cbd277186ab623`](https://github.com/istarwyh/yourbuddy/commit/2b409de193d9aad1da24ebbc46cbd277186ab623)，由 [PR #20](https://github.com/istarwyh/yourbuddy/pull/20) 合并为不可变发布 Commit [`2c523beca5965e057d9ea536d648b3f1458ee7ef`](https://github.com/istarwyh/yourbuddy/commit/2c523beca5965e057d9ea536d648b3f1458ee7ef)。
- 证据图库：不适用；本次没有捕获当前安装版应用截图。
- 证据下载：[`yourbuddy-v0.3.6-verification.zip`](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.6/yourbuddy-v0.3.6-verification.zip)，34,762 字节，SHA-256 `380e4d7b3d5b11696bc6824f83f75aa86b23977fdb7b36ee684857b150d64373`。

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

请从 [0.3.6 GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6) 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。公开文件与 Updater 签名已独立核验；实际执行 Updater 安装仍未验证。

### 兼容性、迁移与限制

桌面应用支持 Apple Silicon 上的 macOS 11 及以上版本。现有应用数据会保留，无需迁移。只有用户在设置中显式选择的 CA 会持久化；继承的 `NODE_EXTRA_CA_CERTS` 仍由启动环境管理。自定义 CA 必须使用绝对、规范化的 `.pem` 或 `.crt` 路径，文件必须是大小受限且可读的普通文件，并且只包含可以解析、当前有效的 X.509 证书。TLS 验证不能关闭。应用尚未使用 Apple Developer 身份签名或公证。合成本地 CA 与 CONNECT 代理证明了实现路径，但不证明真实企业网络行为。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| 企业 CA 与代理规则 | 在源码与合成网络范围内通过 | `ae00df245...` 的源码与真实 CLI Host | macOS 15.6.1 arm64；Rust 1.98.0；内置 Node 22.19.0；本地私有 CA、HTTPS Origin 与 CONNECT 代理 | [本地候选记录](evidence/local-candidate-validation.txt) |
| 完整本地发布准备 | 通过 | 本地组装候选，不是安装包 | macOS arm64；pnpm 11.7.0；离线生产依赖重装 | [本地候选记录](evidence/local-candidate-validation.txt) |
| PR CI | 在限定测试同步修复后通过 | `ae00df245...` 的源码 | GitHub 托管 Linux、macOS 与 Windows 矩阵 | [Run 34361867650](https://github.com/istarwyh/yourbuddy/actions/runs/34361867650)；[本地候选记录](evidence/local-candidate-validation.txt) |
| 发布 PR 修正 | 保留首次 Run 与原生测试首次 Attempt 失败后通过 | `2b409de193...` 的发布源码 | GitHub 托管 Linux、macOS 与 Windows 矩阵 | [Run 34375335129](https://github.com/istarwyh/yourbuddy/actions/runs/34375335129)；[本地候选记录](evidence/local-candidate-validation.txt) |
| 产品发布与 Updater | 通过 | 五个匿名下载的 Release 附件 | GitHub Release 与稳定更新渠道 | 3/3 校验和、五个 API 摘要、字节相同的 Manifest 与 Minisign 验证；[产物记录](evidence/public-artifact-stage.json) |
| 公开 App 与迁移运行时 | 在记录范围内通过 | 公开 DMG 中原样 App | macOS 15.6.1 arm64 | DMG／Updater 树相同；标识、严格 ad-hoc 签名、CLI 与导入通过；[运行时记录](evidence/public-runtime-stage.json) |
| 产品官网 | 在记录的部署与 HTTP 范围内通过 | `5fa67b477...` 的公开部署 | GitHub Pages 与匿名 HTTP | 构建和部署通过；六个双语页面及其发布相关目标均返回 200；[本地记录](evidence/website-local-validation.txt)与[部署记录](evidence/website-deployment.txt) |
| 证据收尾 CI | 保留两次失败并完成限定测试修正后通过 | `9ffaa3e98e...` 源码，合并为 `6376122238...` | GitHub 托管 Linux、macOS 与 Windows 矩阵 | [Run 34398269274](https://github.com/istarwyh/yourbuddy/actions/runs/34398269274) 的 23 个实际检查全部通过；[收尾记录](evidence/verification-finalization-ci.txt) |
| 可下载验证资料 | 通过 | 不可变来源 Commit `6376122238...` 的文档 | GitHub Release 与匿名 HTTPS | 上传元数据、SHA-256、全新下载、逐字节比较与解压均通过；[归档记录](evidence/verification-archive.txt) |
| 安装包原生启动与 WebView 路径 | 未验证 | 未启动公开 0.3.6 App | 已有用户持有的 YourBuddy 实例，无法隔离 | 没有截图或已安装产品声明；[跳过记录](evidence/public-native-startup.txt) |
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

## 场景：发布 PR 终端输出恢复

- 状态：拥有方修正后通过；首次 Run 与 Windows 原生测试首次 Attempt 失败均保留为负例。
- 日期与时间：2026-09-09 23:01 至 2026-09-10 00:45 UTC+08:00，Asia/Shanghai。
- Release 与 Commit：PR #20 发布准备 Commit `6b457268ac6c0b2251babcf9fbed29ec4810fa05`、修正 `2b409de193d9aad1da24ebbc46cbd277186ab623`，合并为发布 Commit `2c523beca5965e057d9ea536d648b3f1458ee7ef`。
- 受测构建：源码 Checkout 与本地组装候选；没有安装包或公开产品字节。
- 环境：失败 CI Run 使用 GitHub 托管 Linux 与 Windows Runner；修正使用 macOS 15.6.1 arm64、Node 22.22.2 与 pnpm 11.7.0。
- 证据来源：本次发布。
- 数据：仓库 Fixture 与合成终端状态。
- 模型或服务：无 Key 测试；没有供应商请求。

### 步骤

1. 保留失败的发布 PR [Run 34367447468](https://github.com/istarwyh/yourbuddy/actions/runs/34367447468)：16,461 个测试通过后，Linux Coverage 中一个持久 PowerShell shell 断言收到了空 viewport；Windows Coverage 与其他所有已完成 Job 均通过。
2. 确认失败测试与终端会话源码相较成功的问题修复 CI 未发生变化，然后定位到空结果的原因：shell 进程组在 node-pty 投递命令最终输出 callback 之前，已重新进入内核 stdin 等待。
3. 将 Linux 精确 stdin 等待就绪限制为不同的前台子进程组。已记住的 shell 进程组现在必须等待自有受控提示符或有界 fallback，因此结算不会丢弃延迟的命令输出。
4. 运行限定的 51 用例会话套件与完整 terminal-bash 包套件：89 个通过；由于故障本地 PowerShell 可执行文件被有意排除在 `PATH` 之外，三个可选真实 pwsh 用例跳过。
5. 确认两个 Harbor 快照的唯一漂移来自已审阅的双语 README 同步后，重录其哈希，验证全部六个外部快照，检查最新产品通道，并以 587 个包零下载重装及六个组装 Client 插件通过完整发布准备。
6. Run 34375335129 的 Attempt 1 中，Windows 原生测试的 Vitest Worker 在报告测试结果前退出；保留该观察，仅重跑失败 Job。Attempt 2 通过受影响的 Worker-thread 包、全部 67 个原生测试用例及完整 19 Job 汇总。

### 预期

shell 自身的输入等待不得在受控提示符与最终输出到达前结算 operation。前台子进程组仍可通过精确 stdin 等待证据结算。PR #20 合并前必须通过替代的完整 CI 矩阵。

### 实际结果

确定性会话测试现在会在 shell 进程组等待 stdin 时保持未结算，随后在受控提示符到达后返回延迟输出。前台进程组发生变化的用例仍在精确探测阈值结算。完整本地发布准备通过，Harness SHA-256 为 `5c765be554a75a8a3810281e8364d21b11792e83eb443366c05e10744794aed0`，Store SHA-256 为 `c4c733da80b6027aa6cd946b7a047db98338d82625cee72b72ad928e5379fe09`，Store 归档 SHA-256 为 `262405620e237043ad157e66f5a95b199920686df6f78bb244e11409b21d77e8`，完整 Bundle SHA-256 为 `078ca9f07b7f46e8a5160bb7bafe2c5a41a8d8c86cb7f7fd376684cf7930f78e`。[Run 34375335129](https://github.com/istarwyh/yourbuddy/actions/runs/34375335129) 的 Attempt 2 在 PR #20 合并前成功完成全部 19 个 Job。首次 Attempt 的 Windows 原生 Lane 选择 Node 24.20.0，并在套件报告测试前失败；通过的重试选择 24.19.0，因此不能根据重试推断 24.20.0 已通过。

### 证据

- 修复前：失败的发布 PR [Run 34367447468](https://github.com/istarwyh/yourbuddy/actions/runs/34367447468)，保留且没有原样重跑。
- 过程中：限定测试、包测试结果与最终组装哈希见[本地候选记录](evidence/local-candidate-validation.txt)。
- 结果：本地修正、完整组装与替代 CI 均在合并前通过。
- 失败与恢复：修复运行时就绪拥有方；没有扩大超时或削弱输出断言。Run 34367447468 与 Run 34375335129 的 Attempt 1 均作为负例保留，不描述为通过。

### 范围限制

本地测试与 CI 不能替代公开安装包验证、Updater 安装、App 启动或官网部署。成功重试也不能证明 Node 24.20.0 兼容性。

## 场景：独立公开产物验证

- 状态：匿名可用性、完整文件、公开校验和、稳定 Updater 元数据与更新包密码学签名通过。
- 日期与时间：2026-09-10 01:08–01:18 UTC+08:00，Asia/Shanghai。
- Release 与构建：[`yourbuddy-v0.3.6`](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6)，不可变 Tag Commit `2c523beca5965e057d9ea536d648b3f1458ee7ef`，由 [Workflow 34379057672](https://github.com/istarwyh/yourbuddy/actions/runs/34379057672)构建。
- 方法：不使用 GitHub 身份验证下载全部五个附件；对照公开 GitHub API 检查字节数与 SHA-256；检查 `SHA256SUMS.txt` 中全部三条记录；比较稳定与版本化 Updater Manifest。
- 密码学检查：`minisign-verify` 0.2.5 使用不可变 Tag 配置中的公钥，验证更新包的预哈希签名与受信注释。
- 证据：[公开产物记录](evidence/public-artifact-stage.json)。

| 公开附件 | 字节 | 独立观察的 SHA-256 |
|---|---|---|
| `latest.json` | 4,615 | `ad806fec61e87a2c2ac95bec14a50aedba6c3a10103037ca7b18d8f315ef440a` |
| `SHA256SUMS.txt` | 312 | `a4a2081c9df8be6e67128fa27430232400f8af6618c44f00db8fdb351342c29e` |
| `yourbuddy-0.3.6-macos-arm64.app.tar.gz` | 570,784,766 | `8db651f6cf45e935503b551b1dcc04061c2fa438132a45cfddfd5d8452349e56` |
| `yourbuddy-0.3.6-macos-arm64.app.tar.gz.sig` | 408 | `f7c0cc86e0f2f584c0a950555b1f67c37e37dc18d31b40cb453f16afde670e5b` |
| `yourbuddy-0.3.6-macos-arm64.dmg` | 568,866,355 | `ae1d459166dde9d54a4e8a48d88d546c9497aac19254a1808f25f838e8617a98` |

首次签名审计命令把 Tauri 以 base64 编码的 `.sig` 附件直接当作 Minisign 文本，返回 `InvalidEncoding`；该结果作为审计设置错误弃用。先解码附件后，实际验证通过。本检查不能证明原生启动、Updater 安装、Apple 公证、安装包 WebView 行为或真实企业流量。

## 场景：公开 App 与迁移运行时

- 状态：DMG 完整性、App 标识、DMG／Updater 相等、严格 ad-hoc 代码签名完整性、内置企业 CA 元数据及迁移 Python／Harbor CLI 与导入通过；原生启动与可视交互跳过。
- 日期与时间：2026-09-10 01:10–01:18 UTC+08:00，Asia/Shanghai。
- 受测构建：从匿名下载的公开 DMG 原样复制的 App；没有编辑标识、可执行文件、资源或签名字节。
- 环境：macOS 15.6.1 arm64；隔离运行时副本；没有 OAuth Token、Profile、模型请求、代理凭据、组织证书或私有 Session 数据。
- 证据：[公开运行时记录](evidence/public-runtime-stage.json)与[原生启动跳过记录](evidence/public-native-startup.txt)。

`hdiutil verify`、只读挂载、复制与卸载通过。DMG 与 Updater 归档包含字节相同的 App 树。App 报告版本／构建号 0.3.6、标识 `io.github.istarwyh.yourbuddy` 与 arm64 可执行文件。`codesign --deep --strict` 退出 0，但签名为 ad-hoc、没有 TeamIdentifier；Gatekeeper 退出 3 并拒绝。它未使用 Apple Developer 身份签名或公证。

公开 Bundle 包含 DSH 0.1.2-rc.1、Better Sidebar 0.18.1、Harbor Evolution 0.9.5、其余四个已记录产品插件、Node 22.19.0 与 pnpm 11.7.0。原生二进制包含 CA 来源元数据 Key，以及 selected、inherited、system 三个来源值。在迁移副本中把记录的构建前缀改为不存在路径后，`harbor --version`、`harbor-dsh --help` 及使用 Launcher 相同内置 `PYTHONHOME` 的 Python 直接导入均通过；运行时报告 Python 3.12.14、Harbor 0.21.0 与 Adapter 0.9.5。

电脑上已有用户持有的 YourBuddy 进程与托管 Host 运行。启动公开副本可能与全局 Single-instance 拥有方交互，因此没有停止现有进程，也没有启动下载的 App。原生就绪、Finder 安装、从旧版升级、安装包 WebView 网络设置、截图、OAuth 与真实企业流量仍未验证。

## 场景：公开产品官网

- 状态：官网部署、双语静态渲染、0.3.6 文案及公开 Release／下载链接可用性通过；浏览器可视渲染仍未验证。
- 日期与时间：2026-09-10 02:30–02:40 UTC+08:00，Asia/Shanghai。
- Release 与 Commit：`yourbuddy-v0.3.6`；官网来源为 [`5fa67b4771cc715736e10868b0884fa77a62bed3`](https://github.com/istarwyh/yourbuddy/commit/5fa67b4771cc715736e10868b0884fa77a62bed3)，来自 [PR #21](https://github.com/istarwyh/yourbuddy/pull/21)。
- 受测构建：公开 GitHub Pages 部署，不是源码 Preview 或桌面安装包。
- 环境：GitHub Pages、GitHub Releases，以及 macOS 15.6.1 arm64 上的匿名 HTTP。
- 证据：[官网本地记录](evidence/website-local-validation.txt)、[部署与线上检查记录](evidence/website-deployment.txt)及 [Workflow 34389210312](https://github.com/istarwyh/yourbuddy/actions/runs/34389210312)。

官网 Workflow 的 Build 与 Deploy Job 通过，GitHub Deployment `6356638242` 对准确来源 Commit 报告成功。中英文首页、下载页与发行页均返回 HTTP 200，声明预期语言与标题，并包含 0.3.6 发布文案。两个下载页的 DOM 均链接到准确 DMG、校验和文件、GitHub Release、对应语言验证记录与 Raw Markdown；这些目标及六个 Raw Markdown 路由均返回 HTTP 200。本阶段没有再次下载 DMG，因为此前匿名下载完整文件并检查 Hash 的步骤已经通过。

PR CI [Run 34384125128](https://github.com/istarwyh/yourbuddy/actions/runs/34384125128) 保留了一次 Snapshot / Artifacts 初始化失败：Google apt 的 `Packages.gz` Hash 不匹配，仓库测试尚未执行。仅重跑该失败 Lane；Attempt 2 通过实际 Gate 与最终汇总。Cloudflare Preview 没有匹配 Runner，已取消且未计为通过。两次规定的 web-access CDP 尝试都因等待宿主 Chrome 授权超时，因此不声明像素级或交互式浏览器通过。部署元数据、公开 HTTP 与静态 DOM 检查证明记录的官网范围，但不能验证桌面 App、安装、WebView 行为、Updater 安装或真实企业流量。

## 场景：证据收尾 CI

- 状态：保留两次平台失败，并且只修正无效测试同步与挂起保护后通过。
- 日期与时间：2026-09-10，Asia/Shanghai，UTC+08:00。
- Release 与 Commit：`yourbuddy-v0.3.6`；收尾源码 [`9ffaa3e98ef18be52cd1092c2f66c53d945ac10a`](https://github.com/istarwyh/yourbuddy/commit/9ffaa3e98ef18be52cd1092c2f66c53d945ac10a)，由 [PR #22](https://github.com/istarwyh/yourbuddy/pull/22) 合并为 [`6376122238c32376b90dee4dc9442eeccccdfa48`](https://github.com/istarwyh/yourbuddy/commit/6376122238c32376b90dee4dc9442eeccccdfa48)。
- 受测构建：仓库源码与完整 CI 矩阵；已发布产品字节未变化。
- 环境：GitHub 托管 Linux、macOS 与 Windows Runner；没有 Runner 的 Cloudflare Preview 已取消且未计为成功。
- 证据：[收尾 CI 记录](evidence/verification-finalization-ci.txt)与成功的 [Run 34398269274](https://github.com/istarwyh/yourbuddy/actions/runs/34398269274)。

首次 Run 在 16,461 个测试通过后保留 Linux PowerShell 输出归属失败。测试现在轮询其拥有的持久 Session 输出以查找预期命令结果，并单独证明 Secret 不存在。第二次 Run 通过 Linux Coverage，但在 15,499 个测试通过后保留 Windows Coverage 失败，原因是 10 秒 npm Resolution 测试挂起保护在 Coverage 负载下到期。三个行为测试现在使用 30 秒保护；正式 Benchmark 独立的 300 秒默认值与显式性能阈值均未改变。每次修正后的限定测试与 Typecheck 均通过。替代 Run 的 23 个实际检查全部通过，包括 Linux 与 Windows Coverage、Snapshot、产物、静态 Gate、原生测试、Python SDK 与发布形态运行时 Job。

## 场景：可下载验证资料

- 状态：公开可用性、完整性、字节相等与解压通过。
- 日期与时间：2026-09-10 04:26–04:28 UTC+08:00，Asia/Shanghai。
- Release 与来源：[`yourbuddy-v0.3.6`](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.6)；文档来自不可变 Commit [`6376122238c32376b90dee4dc9442eeccccdfa48`](https://github.com/istarwyh/yourbuddy/commit/6376122238c32376b90dee4dc9442eeccccdfa48)。
- 受测构建：独立文档 ZIP，不是产品安装包或 Updater Payload。
- 环境：GitHub Release、匿名 HTTPS、`git archive`，以及 macOS 15.6.1 arm64 上的 Info-ZIP unzip 6.00。
- 证据：[归档记录](evidence/verification-archive.txt)与[公开 ZIP](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.6/yourbuddy-v0.3.6-verification.zip)。

Release API 报告附件 ID `553517076`、大小 34,762 字节与 Digest `sha256:380e4d7b3d5b11696bc6824f83f75aa86b23977fdb7b36ee684857b150d64373`。全新匿名下载与上传内容逐字节相等，通过 `unzip -t`，并包含来源 Commit 中的中英文发布页面、配对记录与证据文件。该归档是第六个、仅含文档的 Release 附件；五个产品文件、Release Tag 与 Updater Channel 均未被替换或移动。

## 交付状态

- 产品发布状态：已通过；`yourbuddy-v0.3.6` 是 Latest 正式 GitHub Release，五个产品附件均已独立下载核验。原生启动与 Updater 安装仍未验证。
- 验证资料归档状态：在声明范围内完成；已记录源码、合成网络、本地候选、CI、公开产物、Updater 签名、App／运行时、官网、失败／恢复、原生启动跳过，以及已独立下载核验的证据 ZIP。
- 官网同步状态：在记录的 HTTP 范围内完成部署与核验；Commit [`5fa67b4771cc715736e10868b0884fa77a62bed3`](https://github.com/istarwyh/yourbuddy/commit/5fa67b4771cc715736e10868b0884fa77a62bed3) 通过 [Workflow 34389210312](https://github.com/istarwyh/yourbuddy/actions/runs/34389210312) 部署，六个双语发布相关页面及其公开目标均通过。由于 CDP 授权超时，浏览器可视渲染仍未验证。
- 未验证范围：原生 App 启动、Updater 安装、安装包 WebView 路径、Apple Developer 签名与公证、真实企业代理或证书、代理认证、Node 24.20.0 兼容性、官网浏览器可视渲染、Intel macOS，以及 Windows 与 Linux 桌面产品。

## 交付清单

- [x] 候选发布标识与版本源均已对齐至 0.3.6。
- [x] 开头说明解释了改动、问题、产品区域与最短可观察路径。
- [x] 已说明安装、兼容性、迁移行为、证书要求与当前限制。
- [x] 源码、本地组装与 CI 场景记录环境、构建类型、数据类型、步骤、预期和实际结果、恢复及范围限制。
- [x] 合成、仅源码、已取消、失败、待处理和未验证观察均有明确标记。
- [x] 凭据、私有证书、账户数据与私有 Session 内容未进入归档。
- [x] 两种语言索引均已添加 Release 条目，并提供双语版本页。
- [x] 记录公开 Tag、Release Commit、Workflow、文件名、Hash、校验和、Updater Manifest 与签名。
- [x] 检查匿名下载的公开 App 与迁移运行时。
- [x] 由于无法安全完成隔离启动，受影响的安装包 WebView 设置路径作为明确限制保留。
- [x] 在记录的 HTTP 范围内同步、部署双语产品官网，并检查线上 URL。
- [x] 从不可变 Commit 创建可下载证据归档，完成上传、匿名下载、比较与解压。
- [x] 分别报告产品发布、验证资料归档、官网同步与未验证范围。
- [x] 未移动或覆盖公开 Tag 和安装包。
