# Agent Note: YourBuddy 继承登录 Shell 环境

Status: implemented

[English](2026-10-01-yourbuddy-login-shell-environment.md) | 中文

## 问题

从 Finder 打开的 macOS 应用会获得精简的 LaunchServices 环境，而不是用户在交互式终端中导出的环境。因此，YourBuddy 无法找到在用户终端中可用的 Homebrew 工具、版本管理器 Shim、代理配置或普通导出凭据。逐个修补插件会产生不同的进程环境，也会让新的子进程所有者重复遇到同一缺陷。

## 决策

YourBuddy 会在 Tauri 启动后台工作或发现 Runtime 之前捕获一次账户的交互式登录 Shell 环境。所选 Shell 会调用当前可执行文件的内部 Emitter 模式，把有界的 NUL 分隔原生环境条目写入仅所有者可访问的临时文件。捕获会保留非 UTF-8 `OsString` 值，使用固定截止时间，超时时终止并等待整个进程组，并在失败时回退到桌面启动环境而不阻止应用启动。

Shell 中的普通导出值会覆盖 GUI 环境并传给私有 Host 与插件子进程。这明确包括用户为终端程序导出的凭据和配置。YourBuddy 不会把这些值返回给 Browser Client，也不会写入日志、诊断或 Telemetry。

应用自有值会在捕获后应用。托管 PATH 前缀、隔离的 `DSH_HOME`、`NODE_ENV`、`NODE_OPTIONS`、最终代理与 CA 变量、内部 Capability、显式工作目录，以及 `YOURBUDDY_*` 或 `DSH_DESKTOP_*` 名称都不能被 Shell 启动文件替换。`PWD`、`OLDPWD` 和 `SHLVL` 等 Shell 账务变量会被移除。全新 macOS 桌面设置使用网络继承模式，其他平台和已有设置未记录网络模式时保留直连行为。

通用设置只公开所选模式、Shell 路径、捕获元数据、常用可执行文件可用性、应用自有名称组和重启要求。预览有界且不会修改运行中的进程。保存只影响下一次启动。

## 考虑过的替代方案

**在每个插件中修补 PATH。** 未采用，因为插件会对可用工具产生不同判断，每个新的子进程所有者也都需要另一套变通处理。

**让每个操作都通过交互式 Shell 启动。** 未采用，因为这会重复执行用户启动副作用，改变参数与信号语义，并削弱显式工作目录和进程生命周期的所有权。

**过滤凭据和其他看似敏感的名称。** 未采用，因为导出配置属于用户要求桌面应用继承的终端环境，按名称过滤会静默破坏任意工具。保密规则改为禁止这些值进入诊断与 Browser IPC。

**允许 Shell 替换所有变量。** 未采用，因为 Runtime 身份、隔离持久化、Node 行为、Loopback Capability 与网络策略必须在应用进程树中保持一致。

## 后果

Finder 与终端启动会共享普通导出工具与配置的发现结果，同时 YourBuddy 保留确定的 Runtime 所有权。交互式 Shell 启动文件会在每次应用启动时执行一次，并可能运行其中配置的副作用。阻塞或格式错误的启动不会阻止应用打开，但在回退前最多会增加一个捕获截止时间。

与精简的 Finder 启动相比，Host 与插件会收到更完整的环境，其中包括导出 Secret。这是有意的第一方进程继承，不是 Browser Capability；插件信任和环境值保密仍是必要要求。真实 LaunchServices、工具链与 TCC 行为以带签名 macOS 验收为准，因为确定性测试无法复现这些操作系统身份。
