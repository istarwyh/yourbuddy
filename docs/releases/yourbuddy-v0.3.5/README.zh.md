# YourBuddy 0.3.5

[English](README.md) | 中文

本归档记录 0.3.5 桌面修复及其发布证据。源码、组装运行时与真实 Tauri Runtime Authority 检查已通过。正式发布、公开文件完整下载、安装包 WebView 操作与真实供应商 Codex 委派只有在实际观察后才会分别记录，目前仍为待验证。

- 发布标识：`yourbuddy-v0.3.5`。
- 产品渠道：macOS Apple Silicon 版 YourBuddy 桌面应用；npm、Python、SDK 与其他发布渠道不适用。
- 归档状态：发布前部分完成。
- 已测试产品 Commit：产品修复为 [`7db4fbfbc11d802ca81768498d0474427c207f97`](https://github.com/istarwyh/yourbuddy/commit/7db4fbfbc11d802ca81768498d0474427c207f97)，Codex 生命周期测试修复为 [`077b96c9e704d45a82048c07fcb165d68a9a338d`](https://github.com/istarwyh/yourbuddy/commit/077b96c9e704d45a82048c07fcb165d68a9a338d)，独立 Windows 资源测试修复为 [`fbe8b947cdfce30275bdf2cb5af68677d060725a`](https://github.com/istarwyh/yourbuddy/commit/fbe8b947cdfce30275bdf2cb5af68677d060725a)。[PR #14](https://github.com/istarwyh/yourbuddy/pull/14) 将其合并为 [`9dcaca57512fb628705a37181792c6861591078e`](https://github.com/istarwyh/yourbuddy/commit/9dcaca57512fb628705a37181792c6861591078e)；最终 Tag 目标与公开证据 Commit 会在发布后补记。
- 证据图集：不适用；本次未成功取得当前安装包的应用截图。
- 证据下载：等待发布并完成解压验证。

## 面向用户的发布说明

### 改了什么

YourBuddy 0.3.5 恢复了被应用权限层拒绝的桌面设置与链接控制项。即使用户的全局 skill 目录中另行安装了 `codexhost-delegation`，Codex Preset 的普通委派也会使用内置、可追踪的 `subagent_codex` 集成。

### 解决了什么问题

网络代理测试、CA 选择、保存并重启、检查更新、重启应用、关闭偏好、外部链接和插件市场链接此前可能已到达桌面 Shell，却在进入 Rust Handler 前被拒绝。Codex 委派还可能错误选择一个要求系统存在 `codexhost` 可执行文件的全局 Skill，并以 exit code 127 失败。修复后的组合只为应用自己持有的准确 Shell Origin 授权已知桌面命令，同时从模型自动路由中移除冲突 Skill，不会删除或改写用户文件。

### 在哪里使用

使用**设置 → 网络代理**、**设置 → 通用设置 → 应用生命周期**下的相关控制项、外部 Markdown 与插件市场链接，以及 Codex Preset 中的普通委派请求。用户明确需要外部集成时，仍可显式输入 `/codexhost-delegation`。

### 如何体验

1. 打开**设置 → 网络代理**，读取或编辑设置，运行两项连通性测试，然后保存并重启。
2. 打开**设置 → 通用设置 → 应用生命周期**，检查更新或重启 YourBuddy。
3. 打开外部 Markdown 或插件市场链接。
4. 在 Codex Preset 会话中要求 Agent 把任务委派给 Codex，但不点名外部 Skill。请求应使用可追踪的原生 Subagent 路径，而不是运行 `codexhost`。

### 安装或升级

只有 [GitHub Release](https://github.com/istarwyh/yourbuddy/releases/tag/yourbuddy-v0.3.5) 含有完整文件，并经过独立下载检查后，才会声明 0.3.5 安装包和 Updater 可用。届时可以安装 Apple Silicon DMG，或从旧版使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。

### 兼容性、迁移与限制

桌面应用面向 Apple Silicon 上的 macOS 11 及以上版本。现有应用数据会保留，无需数据迁移。内置 DSH 与产品插件版本和 0.3.4 相同。应用尚未使用 Apple Developer 身份签名或公证，首次启动可能需要按文档执行 macOS 放行操作。源码与组装运行时检查不能证明安装包 WebView 控制项或真实 OAuth Codex 请求已经通过；这些限制在下文继续明确保留。

## 验证摘要

| 场景 | 状态 | 受测构建 | 环境 | 证据 |
|---|---|---|---|---|
| Skill 路由策略 | 已通过 | 已测试产品 Commit 的源码 | macOS arm64、Node 22.22.2、pnpm 11.7.0 | 34 个聚焦用例；[本地记录](evidence/local-candidate-validation.txt) |
| 组装后的模型可见输出 | 已通过 | 从源码启动的真实 Base Application 组合 | macOS arm64、受控无密钥 Transport | 一个 Expected-output 快照；[本地记录](evidence/local-candidate-validation.txt) |
| 桌面命令清单与浏览器 Bridge | 在源码范围内通过 | 源码与受控浏览器 Smoke | macOS arm64、Node 22.22.2 | 43 个桌面产品用例；[本地记录](evidence/local-candidate-validation.txt) |
| Tauri 命令授权 | 已通过 | 源码生成的真实 Tauri Runtime Authority | macOS 15.6.1 arm64、Rust 1.98.0 | 准确 Origin／窗口授权与负例；[本地记录](evidence/local-candidate-validation.txt) |
| 完整本地发布准备 | 已通过 | 本地组装的 0.3.5 候选版本，不是安装包 | macOS arm64、完整生产依赖树 | 54 条 Peer Link、六个 Client、离线重装、Host Smoke；[本地记录](evidence/local-candidate-validation.txt) |
| 完整 Pull Request CI 与 Windows 失败修复 | 已通过 | `fbe8b947cd...` 源码 | GitHub 托管 Linux、macOS 与 Windows 矩阵 | [CI Run 34149979672](https://github.com/istarwyh/yourbuddy/actions/runs/34149979672)：19/19 Job 通过，包含 Windows Coverage；[本地记录](evidence/local-candidate-validation.txt) |
| 文档检查 | 已通过 | 源码文档 | macOS arm64、Node 22.22.2 | 32 项 `doc-sync` 门禁；[本地记录](evidence/local-candidate-validation.txt) |
| 安装包 WebView 控制项 | 未验证 | 尚无公开 0.3.5 App | 本地原生自动化无法连接 | 无截图；下文保留 `-10005` |
| 真实 Codex OAuth 委派 | 未验证 | 尚无公开 0.3.5 App | 未使用真实账号或供应商请求 | 只验证 Catalog、Loader 与 Bundle 组合 |
| 产品发布与官网 | 未验证 | 尚无公开 0.3.5 文件 | GitHub Release 与 Pages | 等待发布 |

## 场景：Codex 委派路由

- 状态：模型可见 Catalog、Loader 策略、显式调用与组装无密钥输出已通过；真实 OAuth／供应商委派未验证。
- 日期与时间：2026-09-08 00:40–00:41 UTC+08:00，Asia/Shanghai。
- Release 与 Commit：`yourbuddy-v0.3.5` 候选版本，已测试产品 Commit `7db4fbfbc11d802ca81768498d0474427c207f97`。
- 受测构建：源码 Checkout 与真实组装的 Base Application Fixture，不是 DMG 或已安装 App。
- 环境：macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0。
- 证据来源：本次发布实测。已报告的 0.3.4 安装版 Session 只用于识别竞争路由；其私有路径、对话内容、账号数据与凭据均未进入本归档。
- 数据：合成 Skill 定义与消息。
- 模型或服务：受控无密钥 Transport；未发送真实 OpenAI、Codex OAuth 或付费模型请求。

### 操作步骤

1. 注册被保留的 `codexhost-delegation` Skill 和普通 Skill，然后生成模型 Catalog。
2. 尝试从模型侧直接加载被保留 Skill，并执行用户显式 `/codexhost-delegation` 调用。
3. 使用真实 Base Application 与已安装 `dsh-badge` Skill 启动；通过部署配置保留该 Skill，记录 Provider Summary、模型 Catalog 与 Loader 结果。
4. 使用内置原生 Codex Provider 组装完整 YourBuddy Overlay。

### 预期结果

被保留 Skill 不出现在模型自动路由中，模型 Loader 也不能泄露其指令。普通 Skill 仍可用，用户显式调用仍有效，YourBuddy 继续包含内置 `subagent_codex` Provider。

### 实际结果

34 个聚焦包用例全部通过。模型 Catalog 中不存在被保留 Skill 的名称与描述；模型侧加载返回策略错误且不含 Skill Body；普通 Skill 仍存在；显式 `/codexhost-delegation` 注入对应指令。组装 Expected-output 快照通过，完整产品 Smoke 加载了 Overlay 与内置原生 Codex Provider。

### 证据

- 操作前：脱敏诊断确认已安装请求同时暴露 `subagent_codex` 与全局 Skill，并且模型先选择后者后以 exit 127 退出；私有 Session 本身没有归档。
- 执行中：聚焦包测试分别操作自动与显式路径。
- 结果：准确命令和数量见[本地候选记录](evidence/local-candidate-validation.txt)。
- 失败与恢复：两次错误的 Snapshot 命令选择了错误测试配置，其中一次还把环境代理警告写入 stderr。它们均未作为产品证据。更正后的 Expected-output 命令移除环境代理变量，选中的一个测试通过。

### 范围限制

本场景证明配置后的 Catalog 与 Loader 行为以及原生 Provider 的存在。它不证明模型在所有 Prompt 中的选择质量、真实 OAuth 账号下 Child Process 成功、网络可达性、Token 处理或已安装产品旅程。

## 场景：桌面 Shell 授权

- 状态：准确命令配对、浏览器消息至命令选择和真实 Tauri Runtime Authority 解析已通过；安装包 WebView 操作仍未验证。
- 日期与时间：2026-09-07 23:52 至 2026-09-08 00:41 UTC+08:00，Asia/Shanghai。
- Release 与 Commit：`yourbuddy-v0.3.5` 候选版本，已测试产品 Commit `7db4fbfbc11d802ca81768498d0474427c207f97`。
- 受测构建：源码 Rust 应用 Manifest 与受控浏览器 Smoke，不是公开安装包。
- 环境：macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0、rustc／cargo 1.98.0。
- 证据来源：本次发布实测。
- 数据：合成设置与 URL；没有代理凭据、证书内容或个人数据。
- 模型或服务：不适用。

### 操作步骤

1. 提取 Remote Shell 中所有字面 `invoke()` 命令，与应用 Permission Allowlist 比较，并检查每个命令已经注册。
2. 使用受控原生响应运行桌面 Bridge 与产品测试。
3. 把生成的 Tauri Manifest 加载到 Runtime Authority，授予动态 Capability，并在准确运行时 Origin 与 `main` 窗口下解析每个命令。
4. 使用另一个 Loopback 端口和另一个窗口重复解析，作为负例。

### 预期结果

Shell 命令集合与 Permission 集合准确相等。每个命令只允许应用自己持有的 Remote Origin 与 `main` 窗口调用；其他 Origin、端口或窗口应被拒绝。

### 实际结果

静态配对门禁与 43 个桌面产品用例通过。准确 Runtime Authority 测试覆盖九个命令和两类负例并通过。发布工作流现在会在 App 构建后运行两项门禁。

### 证据

- 操作前：Issue 13 与事后分析保留已安装应用的 ACL 拒绝，并说明请求未进入 Rust Handler。
- 执行中：配对与 Authority 测试分别覆盖 Bridge 和授权层。
- 结果：准确命令与退出结果见[本地候选记录](evidence/local-candidate-validation.txt)。
- 失败与恢复：一次错误的 Rust Filter 运行了零个测试，未计入结果；随后准确的完全限定测试运行并通过一个测试。原生窗口自动化连续三次返回 `-10005: codex app-server exited before returning a response`，因此没有生成已安装 App 截图，也没有宣称控制项已在安装包中通过。

### 范围限制

JavaScript Invoke Stub 不能证明原生授权，Runtime Authority 也不能证明可视控制项行为。公开 App 生成后仍须从安装包 WebView 操作受影响控制项；在此之前，已安装 UI 路径属于未验证。

## 场景：本地候选版本组装

- 状态：保留失败与恢复记录后通过。
- 日期与时间：2026-09-08 00:04–00:31 UTC+08:00，Asia/Shanghai。
- Release 与 Commit：发布前 0.3.5 文件树，随后提交为 `7db4fbfbc11d802ca81768498d0474427c207f97`。
- 受测构建：本地组装的产品运行时与 Host Smoke，不是已签名 Updater、DMG 或公开下载。
- 环境：macOS 15.6.1 arm64、Node 22.22.2、pnpm 11.7.0；生产依赖先从发布 Lock 解析，再从离线 Store 重装。
- 证据来源：本次发布实测。
- 数据：合成 Smoke 输入与隔离产品目录。
- 模型或服务：受控本地 Host；未发送真实供应商请求。

### 操作步骤

1. 构建 220 个 Client Artifact，并打包当前 Harness 源码。
2. 准备冻结生产依赖树，然后删除并从离线 Store 重装全部 587 个包，下载数为零。
3. 验证 54 条运行时 Peer Link 与六个组装 Client 插件。
4. 启动 Host，操作外部链接、插件市场、代理、生命周期和组装 Client Smoke 路径，然后正常停止。

### 预期结果

候选版本内部一致；缓存准备完成后可以离线重装；包含配置后的 Codex 路由策略与原生 Provider；可以正常停止。

### 实际结果

完整准备最终通过。本地 Bundle 与 Store Hash 保存在证据文件中。第一次尝试在下载 `@openai/codex` 时被中断，导致内置依赖树不完整；之后 Rust Build 因缺少平台包而正确失败。完整准备重新下载缺少的生产包，并重复离线重装与全部 Smoke，恢复为通过的候选版本。第一次 Pull Request CI 随后暴露 Codex 测试清理预算问题；第二次确认该修复后，又暴露互相独立的 Windows `EACCES` 端口选择和依赖轮询的 Cache Fixture 失败。三个失败观察均保留在记录中。第三次以相同拓扑运行，最终 19/19 Job 全部通过，包含 Windows Coverage。

### 证据

- 操作前：不完整依赖树失败保留在[本地记录](evidence/local-candidate-validation.txt)中。
- 执行中：在线填充缓存，然后执行下载数为零的离线重装。
- 结果：Hash、文件数、Peer Link、Client 数量与 Smoke 结果见[本地记录](evidence/local-candidate-validation.txt)。
- 失败与恢复：被中断的准备和缺少 `@openai/codex-darwin-arm64` 的失败没有隐藏，也没有算作通过；完整重跑才是通过结果。两次文档检查还曾卡在有故障的可选本地 PowerShell 探测；从子进程 `PATH` 排除该可选程序后，32 项文档门禁通过，且没有改变产品代码。CI Run 34144640990 和 34147385017 保留为失败负例，均不会被描述成成功重试。

### 范围限制

本地组装与 Pull Request CI 不能验证 GitHub Release 文件、Updater 元数据或签名、Apple 签名／公证、Finder 安装、从旧 App 升级、可视 WebView 行为、企业代理／CA 流量、OAuth 或真实模型执行。

## 场景：Pull Request 矩阵与合并

- 状态：已通过；最终 Main CI Run 的 19 个 Job 全部成功完成，包含 Windows Coverage。
- 日期与时间：2026-09-08 02:01–02:32 UTC+08:00，Asia/Shanghai；02:33:56 UTC+08:00 完成合并。
- Release 与 Commit：CI 测试 `fbe8b947cdfce30275bdf2cb5af68677d060725a`；[PR #14](https://github.com/istarwyh/yourbuddy/pull/14) 合并为 `9dcaca57512fb628705a37181792c6861591078e`。
- 受测构建：Pull Request 源码与 CI 生成的测试 Artifact，不是公开 DMG 或 Updater。
- 环境：GitHub 托管 Linux、macOS 与 Windows Runner，覆盖仓库定义的矩阵。
- 证据：[CI Run 34149979672](https://github.com/istarwyh/yourbuddy/actions/runs/34149979672)及保留的[本地候选记录](evidence/local-candidate-validation.txt)。

最终 Run 通过 Node 24 Static、Linux 与 Windows 全量 Coverage、Snapshots and Artifacts、Compatibility Lane、Windows Native／Build／Wine／Observational Lane、四个平台的 Release-shaped Python Runtime、Python SDK 及依赖 Landlock 的上游检查。之前失败的 Run 保留为负例，并非原样重跑：每次失败后都先完成限定范围的修复，再进入最终 Run。

Cloudflare Pages Preview Run `34149979539` 因仓库没有任何 Self-hosted Runner，而该 Job 要求 `dsh-ubuntu-24-04-16core`，故被取消。它没有运行，也不计为通过。产品发布与官网部署仍是独立发布阶段。

## 交付状态

- 产品发布状态：尚未发布或独立下载；源码 CI 变绿本身不会改变此状态。
- 验证资料归档状态：已提供部分本地候选记录；公开产物／运行时结果、不可变证据 Commit、可下载 ZIP 与解压检查仍待完成。由于没有完成安装版可视验收，本归档不包含截图。
- 官网同步状态：等待产品发布与公开文件独立验证。
- 未验证范围：安装包 WebView 控制项、真实 Codex OAuth 委派、从旧版升级、Finder 安装、Apple Developer 签名／公证、企业代理／CA 流量、Intel macOS、Windows、Linux，以及公开官网／下载行为。

## 交付清单

- [x] 版本源与准确发布标识均为 0.3.5。
- [x] 用户说明解释了改动、解决的问题、使用位置与体验步骤。
- [x] 已说明兼容性、迁移、安装与已知限制。
- [x] 源码场景记录时区、已测试 Commit、环境、步骤、预期与实际结果、数据与供应商分类、失败、恢复及范围限制。
- [x] 已保留源码、Runtime Authority、组装输出与完整本地准备证据，没有宣称安装产品成功。
- [x] 安装版 Session 的敏感路径、内容、凭据、代理数据与证书数据未进入归档。
- [x] Main CI 已成功完成并记录准确 Run。
- [ ] 公开安装包、Updater 归档／签名、校验和、Manifest、App 标识、迁移运行时与原生启动已独立验证。
- [ ] 安装包 WebView 控制项与真实 Codex OAuth 委派已验证，或在发布后继续明确标记未验证。
- [ ] 可下载验证 ZIP 已附加、下载、解压并检查。
- [ ] 双语官网只在公开文件通过验证后更新，并完成部署与线上检查。
- [ ] Release 页面与版本索引链接不可变证据 Commit，没有移动 Tag 或替换安装包。
