---
description: "YourBuddy 默认继承登录 Shell 环境、保留应用自有覆盖并展示 macOS 权限状态的实施级技术方案。"
---

# YourBuddy 终端环境与 macOS 权限方案

[English](terminal-environment-and-permissions.md) | 中文

## 摘要

YourBuddy 默认使用当前账户交互式登录 Shell 导出的环境启动 macOS 桌面会话，再覆盖少量必须由应用管理的值，使托管 Node、pnpm、Harness、隔离 DSH 主目录、Loopback 服务和网络策略在同一进程树内保持一致。通用设置展示能够可靠查询的 macOS 权限；对于 macOS 不提供全局状态或实际属于外部进程的权限，界面明确说明限制，并且只在用户显式操作后请求权限。

状态：2026 年 10 月实施提案。当前应用尚未捕获登录 Shell 环境，也没有统一的 macOS 权限服务。

## 目录

- [已确定的产品决策](#decisions)
- [目标与边界](#goals)
- [当前差距](#current)
- [目标架构与启动顺序](#architecture)
- [环境优先级](#precedence)
- [网络与 CA](#network)
- [macOS 权限模型](#permissions)
- [数据模型与协议](#model)
- [设置与诊断](#settings)
- [失败处理](#failures)
- [实施位置与依赖](#implementation)
- [测试与验收](#testing)
- [交付顺序](#delivery)
- [开发备注](#dev-note)

<a id="decisions"></a>
## 已确定的产品决策

| 决策 | 结论 |
|---|---|
| 默认环境 | macOS GUI 默认捕获账户的交互式登录 Shell 环境 |
| 回退模式 | 捕获失败不阻止启动，回退到 GUI 环境与 YourBuddy 托管 PATH |
| 合并规则 | Shell 值覆盖 GUI 值，应用自有值最后覆盖 |
| Secret | 除应用自有变量外，导出的凭据和配置原样传给 Host 与插件；不得写入日志、Telemetry 或 Browser Client |
| DSH 主目录 | 原生产品始终使用应用数据中的隔离 `dsh-home`，不采用 Shell 中的 `DSH_HOME` |
| 网络默认 | 全新安装默认继承 Shell 代理与 CA；既有显式网络选择保持不变 |
| 权限请求 | 启动与后台刷新从不弹窗，只有直接点击才能请求权限 |
| 权限归属 | UI 显示责任进程，不能把 FFmpeg、Screen Studio 或 Terminal.app 的权限算作 YourBuddy 权限 |
| 不确定状态 | 没有可靠 API 时显示 `unknown`，不得用启发式结果声称已授权 |

实施前增加持久架构决策记录，确认“默认继承会扩大 Host 与插件可见的配置和 Secret 范围”。本方案负责实施细节，不代替该决策记录。

<a id="goals"></a>
## 目标与边界

成功结果是：Finder 与终端启动为同一账户解析相同导出工具链；全部应用自有子进程使用同一已解析环境；应用自有 Runtime 与网络值保持确定；用户能区分权限缺失和工具、插件、凭据或设置缺失。

“完整终端环境”指新的交互式登录 Shell 导出的环境变量。它不包括 Alias、未导出的变量/函数、终端当前目录、历史、Job、真实 TTY，也不包括授予终端应用的 TCC 权限。

本方案不会让所有 Agent 命令经由交互式 Shell 执行，不读取 TCC 数据库，不绕过 macOS 授权，也不在首次启动时请求全部权限。

首个实现仅针对已签名 macOS arm64 YourBuddy。Windows 保留用户/系统持久环境发现，WSL 保留独立 Linux 环境和 Windows 到 WSL 转换。

<a id="current"></a>
## 当前差距

[`runtime/env_path.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/env_path.rs) 在非 Windows 平台只使用 GUI 进程 PATH；[`runtime/path_bridge.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/path_bridge.rs) 再前置托管 `dsh`、Node、pnpm 和配套工具。Finder 启动因此可能看不到 Homebrew、版本管理器或 Shell 导出变量。

[`runtime/supervisor.rs`](../../../apps/desktop-tauri/src-tauri/src/runtime/supervisor.rs) 已覆盖隔离 `DSH_HOME`、最终 `PATH`、`NODE_ENV=production`、工作目录和网络值，其余变量由 Host 与插件继承。这一顺序应保留。

[`network_proxy.rs`](../../../apps/desktop-tauri/src-tauri/src/network_proxy.rs) 当前默认直连，会删除环境代理、`NODE_OPTIONS` 和 CA 变量，再应用直连、系统或自定义策略。它尚未把登录 Shell 作为网络来源。

权限行为分散：可选 Voice Input 请求麦克风；Pomodoro 读取 Browser Notification；原生通知无法可靠读取 macOS 授权；Ego Browser 的 FFmpeg Backend 由外部 FFmpeg 进程触发屏幕录制权限。原生端没有统一状态服务。

Desktop Shell 源码 Bridge 与已有构建产物/聚焦测试不一致，Tauri 源码配置也没有麦克风 Usage Description。新协议实施前必须先恢复这一基线。

<a id="architecture"></a>
## 目标架构与启动顺序

捕获入口位于 `run()` 的 component-helper 与 CLI-shim 提前退出之后、Tauri 创建后台工作之前。真实终端调用 CLI 不重复执行登录 Shell，也不会递归。

启动顺序固定为：

1. 读取环境设置，解析 macOS 账户记录中的登录 Shell；无可用值时使用 `/bin/zsh`。
2. 创建仅当前用户可读写的临时文件，以登录和交互模式启动 Shell，stdin 为空。
3. Shell 执行当前 YourBuddy 二进制的内部环境输出模式；输出器将 NUL 分隔环境写入临时文件，Shell Banner 留在普通 stdout/stderr。
4. 在限定时间内解析 `OsString` 键值；超时后终止并回收完整进程组。
5. Shell 环境覆盖 GUI 环境，删除 `PWD`、`OLDPWD`、`SHLVL`、`_` 等记账项。
6. 解析网络来源、Runtime 与 PATH，再应用应用自有覆盖。
7. 组件下载、Overlay、Host、Updater 和插件子进程使用同一已解析环境。

实现不得自行 Source 或解析 `.zshrc`。zsh/bash 兼容 Shell 与 fish 使用固定调用形式；未知 Shell 先尝试 POSIX 形式，失败后回退。

捕获每个应用进程只运行一次。“刷新预览”可以再次启动 Shell，但不得修改正在运行的 Host；保存后必须重启。

<a id="precedence"></a>
## 环境优先级

| 优先级 | 来源 | 作用 |
|---|---|---|
| 1 | GUI 进程环境 | 保留 LaunchServices、父进程、Locale、Home 与临时目录信息 |
| 2 | 交互式登录 Shell | 覆盖 PATH、工具链、凭据、代理候选和其他导出偏好 |
| 3 | 桌面设置 | 应用网络、CA 与环境模式 |
| 4 | 托管 Runtime | 前置托管 Shim 与 Node/pnpm，固定隔离 DSH 主目录和生产身份 |
| 5 | 单个子进程 | 添加通知 URL、Loopback Capability、端口或操作凭据 |

| 名称 | 最终规则 |
|---|---|
| `PATH` | 托管 `bin`、选定 Node/pnpm 和必要配套目录位于 Shell PATH 之前；稳定去重 |
| `DSH_HOME` | 固定为应用数据隔离目录；WSL 种子复制继续使用独立 Windows 用户目录解析 |
| `NODE_ENV` | Host 固定为 `production` |
| `NODE_OPTIONS` | 由应用设置网络信任选项，不继承会修改托管 Host 的 Preload/Runtime Flag |
| 代理与 CA | 最终网络模式决定大小写代理变量、`NODE_USE_ENV_PROXY` 与 `NODE_EXTRA_CA_CERTS` |
| `YOURBUDDY_*` 与内部 Capability | 由应用创建，不接受 Shell 替换 |
| 工作目录 | 每个 Command 显式设置，不依赖继承 `PWD` |

能力检查与真实启动必须使用同一最终 PATH。插件级 Homebrew Workaround 只有在已签名应用证明共享 PATH 覆盖该插件后才能删除。

<a id="network"></a>
## 网络与 CA

新增 `inherit` 模式并作为全新安装默认值：读取 Shell 代理与 CA 候选，补全 Loopback 绕过项，再通过现有原生/Node 策略统一应用。

| 模式 | 行为 |
|---|---|
| 继承终端环境 | 使用捕获的代理和合格 CA 候选 |
| 系统 | 使用 macOS System Configuration 固定 HTTP/HTTPS 端点与绕过项 |
| 自定义 | 使用保存的 URL、绕过列表与可选 CA 文件 |
| 直连 | 删除继承代理，保留系统信任与显式 CA |

既有系统、自定义或直连选择不迁移为继承。设置格式增加版本：既有安装缺少字段时保持原直连结果，全新安装使用继承。

只有继承模式且没有显式 CA 时，Shell 的 `NODE_EXTRA_CA_CERTS` 才能成为候选。保存前继续执行原生与全新托管 Node Preflight；运行中的 Host 必须重启。

<a id="permissions"></a>
## macOS 权限模型

统一状态为 `granted`、`denied`、`notDetermined`、`restricted`、`notApplicable`、`unknown`。每项同时返回责任进程和操作类型。

| 能力 | 实施规则 |
|---|---|
| 辅助功能 | 仅对声明依赖的功能显示；刷新不弹窗，点击后才提示 |
| 屏幕录制 | 只有 YourBuddy 自身捕获时使用系统 Preflight；当前外部 FFmpeg 根据实际失败提供恢复，不能使用 YourBuddy 状态代替 |
| 完全磁盘访问 | 显示无法可靠 Preflight 的 `unknown`，提供系统设置入口与路径错误说明 |
| 自动化 | 按 Apple Events 目标展示，不提供伪造全局状态 |
| 文件与文件夹 | 以真实文件操作、目录选择与 Security-scoped 访问为准 |
| 麦克风 | Voice Input 启用时结合原生状态与 `getUserMedia` 错误；先补齐 Usage Description、WKWebView/Iframe Policy 与责任进程 |
| 通知 | 原生通知使用 UserNotifications；Pomodoro 保留 Browser Notification 并明确区分 |
| 摄像头 | 当前不声明、不展示、不请求 |

启动和后台刷新只执行不弹窗检查。请求必须由直接点击触发。现有 HTTP(S) External Link 不扩展为任意 Scheme；打开系统设置使用固定第一方操作。

中央卡片负责状态与恢复入口，功能本地负责即时错误和重试。外部 FFmpeg、Screen Studio 与 Terminal.app 权限不得归因给 YourBuddy。

<a id="model"></a>
## 数据模型与协议

持久设置只保存选择，不保存环境 Snapshot：

| 类型 | 字段 |
|---|---|
| `ShellEnvironmentSettings` | `version`、模式 `inherit` 或 `desktopOnly`、可选 `shellPath` |
| `NetworkProxySettings` | 新增 `inherit` Mode 与迁移版本 |
| `DesktopSettings` | 环境、网络和既有生命周期设置 |

| 状态类型 | 必需字段 |
|---|---|
| `ShellEnvironmentStatus` | 状态、来源、Shell 路径、耗时、变量数、PATH 数、待重启、覆盖变量名、工具结果、错误代码 |
| `MacPermissionStatus` | Permission Identifier、状态、责任进程、操作类型、本地化 Key |
| `EnvironmentPermissionSnapshot` | 环境状态、适用权限列表、Snapshot Revision |

继续复用唯一 `run_first_party_command` Gateway：

| 操作 | 副作用 |
|---|---|
| `get_environment_status` | 无；读取当前 Host 与保存设置 |
| `preview_shell_environment` | 运行一次受限捕获，不改变 Host |
| `save_environment_settings` | 保存选择并返回待重启 |
| `get_macos_permissions` | 无弹窗查询适用权限 |
| `request_macos_permission` | 只请求 Allowlist 中可直接请求的权限 |
| `open_macos_permission_settings` | 只打开 Allowlist 中的系统设置页面 |

Browser-to-Shell 消息保持版本、Request ID、严格来源校验、Accepted/Response 两阶段和固定 Action Union。不得把完整环境加入协议。

<a id="settings"></a>
## 设置与诊断

在通用设置中、应用生命周期之前增加“环境与权限”卡片。展示模式、登录 Shell、捕获状态、待重启、PATH 数量、覆盖变量名，以及 `git`、`python3`、`ffmpeg`、`ffprobe` 解析结果。

操作包括“刷新预览”“使用终端环境”“仅使用桌面环境”“保存并重启”。权限区域展示状态、责任进程和一个恢复操作。刷新失败保留上次成功数据并显示行内提示；瞬时结果使用现有 Toast。

`boot.log` 只记录 Shell 路径、状态、耗时、变量数、回退错误代码、PATH 数量、网络来源和覆盖变量名。不得记录变量值、完整 PATH、代理凭据、证书或 Token。

<a id="failures"></a>
## 失败处理

Shell 缺失、非零退出、不可读/过大结果、异常条目或超时均回退到仅桌面环境，不阻止设置或已预配 Runtime。超时终止完整进程组，并说明 Shell 初始化可能等待交互输入。

交互式登录 Shell 可能执行用户配置的副作用。设置必须说明；每进程只捕获一次，预览只在点击后运行。

缺少可选工具只禁用对应能力。权限查询失败返回 `unknown`；拒绝不影响无关功能。功能错误返回同一 Permission Identifier，使设置提供唯一恢复操作。

<a id="implementation"></a>
## 实施位置与依赖

| 位置 | 职责 |
|---|---|
| `src-tauri/src/shell_environment.rs` | Shell 解析、捕获、NUL 解析、合并、回退与脱敏状态 |
| `src-tauri/src/lib.rs` | 早期捕获与第一方环境/权限操作分发 |
| `runtime/env_path.rs`、`path_bridge.rs` | 消费已解析环境并生成唯一最终 PATH |
| `runtime/supervisor.rs` 与 Command Owner | 应用统一映射、单进程值和显式工作目录 |
| `network_proxy.rs` | 继承模式、迁移和原生/Node 一致策略 |
| `macos_permissions.rs` | macOS 状态、请求与系统设置 Allowlist |
| `tauri.conf.json` 与 Bundle 配置 | 统一产品身份，只为真实功能增加 Usage Description |
| `shell.html` 与 Bridge 测试 | 先恢复严格来源校验与固定协议 |
| Personal Workbench Client | 新卡片、严格协议类型和双语文案 |

关键路径：Bridge/产品配置基线 → Shell 捕获 → Runtime/PATH → 网络迁移 → 环境 UI → 权限服务/功能接线 → 已签名验收。后置阶段不得绕过前置验收。

<a id="testing"></a>
## 测试与验收

自动化覆盖登录 Shell 解析、NUL 中换行/等号、非 UTF-8 策略、重复项、优先级、PATH 去重、大小限制、超时/进程组回收、CLI 旁路、迁移、脱敏、应用自有变量、网络四模式和 Windows/WSL 不回归。

Fake Shell 固定登录/交互参数、空 stdin、Banner 隔离、非零退出和超时。进程 Fixture 导出工具目录并尝试覆盖应用变量；托管 Node 必须观察到普通导出、托管 PATH、隔离 DSH 主目录和最终网络值。

权限映射和请求路由使用注入 Adapter；真实 TCC 不作为确定性 CI 输入。Client 测试覆盖协议、状态渲染、待重启、Shell 不可用、失败保留数据和本地化操作。

已签名 macOS 验收证明：Finder 看到 Shell 专属工具；Host 与 Oil Creator 共享 `ffmpeg`/`ffprobe`；应用覆盖优先；捕获可回退；权限只在点击后请求；完全磁盘访问不误报；外部权限不归因；通知来源明确；主题、键盘、窄窗口和双语可用。

执行聚焦 Rust/Client 测试、已组装产品 Smoke、GUI 演示、`pnpm run test:docs`、`pnpm run doc-sync`、适用 Lint/Typecheck 与 `git diff --check`。Release 归档分别记录环境继承、应用覆盖和真实权限行为。

<a id="delivery"></a>
## 交付顺序

| 阶段 | 交付 | 完成证据 |
|---|---|---|
| 0 | Desktop Shell Bridge 与产品配置基线 | 现有 Lifecycle/Gateway 测试通过，源码与 Bundle 身份一致 |
| 1 | 已解析环境与 Shell 捕获 | Fixture 固定捕获、回退、优先级、CLI 旁路和脱敏 |
| 2 | Runtime、PATH、网络 | 原生和托管 Node 观察同一环境，既有网络选择不变 |
| 3 | 环境状态 UI | 展示来源、待重启、工具解析与覆盖变量名 |
| 4 | macOS 权限与功能接线 | 状态、显式请求、系统设置、麦克风配置和外部进程归属通过测试 |
| 5 | 已签名验收与 Release 记录 | Finder、真实 TCC、产品 Smoke、GUI 证据与限制分别记录 |

当 Finder 与终端解析相同导出工具链、应用值确定、捕获可回退、网络一致，而且权限状态不超过 macOS API 与责任进程的确定性时，可以交付。

<a id="dev-note"></a>
## 开发备注

本文档是实施方案，不代表当前产品行为。完整环境只存在于原生进程内存和子进程环境；任何新增日志、IPC、诊断或 Telemetry 都必须保持“不输出值”。
