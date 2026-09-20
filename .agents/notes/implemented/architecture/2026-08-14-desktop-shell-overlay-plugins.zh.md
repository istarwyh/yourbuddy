# Agent Note: 桌面壳标题栏与 overlay 插件

Status: implemented

[English](2026-08-14-desktop-shell-overlay-plugins.md) | 中文

## 问题

桌面 fork 必须提供窗口外观、托盘、签名更新和任务完成提醒，同时不能把原生权限放进 Harness Package。任何通用 Client 组合改动都必须作为可评审、可在上游刷新时重放的产品补丁记录。必须观察 Host Session 事件的功能不能只放在 WebView 里，因为那会改已发布的 Web 客户端。

## 决策

**原生窗口外观的权限留在 `apps/desktop-tauri`。** 主窗口无边框。`shell.html` 持有真正的最小化、最大化、关闭与拖动操作。Personal Workbench 通过固定版本的 `postMessage` 协议，把这些操作的呈现投影到展开态的 `sidebar.header.action` 席位，并紧邻折叠按钮左侧；Shell 会先校验当前 iframe Source、精确 Host Origin、消息字段与允许的固定动作，再调用 Tauri。macOS 渲染一组不带分隔线的横排红黄绿按钮，Windows 与 Linux 则保留 `window_layout.rs` 解析出的操作顺序。启动、iframe 重载和侧栏收起时，Shell 保留一个小型浮动回退入口，因此不需要整条纵向控制栏或独立标题行。Host iframe 不会获得 Tauri API 权限。

启动页是紧贴内容的透明窗口，中间一块无描边的径向毛玻璃（中心不透明、四周淡出），使用 `design-platform.css` 的深色 token（官方鱼形标志、DeepSeek 字标、HARNESS 铭牌和进度条）。第一次关闭在 `shell.html` 里打开与 Web 客户端浅色 `Modal` 一致的页内对话框（遮罩、圆角 24 的卡片、胶囊描边/主按钮），并把选择写入 `%APPDATA%/DeepSeek Harness/desktop-settings.json` 的 `closeAction`。之后的关闭按该文件执行。托盘可切换「关闭时最小化到托盘 / 关闭时退出程序 / 下次关闭时再询问」，不会立刻退出；「重启」紧挨「退出」。隐藏最后一个窗口不会结束进程：在托盘「退出」、托盘「重启」、已保存的退出选择或更新器重启之前，`ExitRequested` 会被取消。这些路径会标记退出、结束 Host 的 Node 进程树，再调用 `app.exit` 或 `app.restart`（`app.restart` 不跑 `Drop`，所以必须先 stop）。Windows 把该树放进带 `KILL_ON_JOB_CLOSE` 的 Job，即使析构不跑也会回收孙进程。再次启动时，若 `host.pid` 记录的 Node 镜像仍匹配，会回收上次残留的进程。点击托盘显示窗口。单实例仍聚焦已有窗口。

**与 Host 的协作是 overlay 插件，不是改包。** 外壳把 `overlay/desktop-notify/index.mjs` 复制到 `$DSH_HOME/desktop-overlay`，写入插件 `name` 为 `file://` URL 的 `--patch` 列表，再启动 `dsh web --patch <该文件>`。Windows 盘符路径（如 `C:/...`）不是合法 ESM specifier——Node 会把 `C:` 当成 URL scheme——因此 overlay 必须写成 `file:///C:/...`（空格做百分号编码）。插件监听 `session/event` 中 `turn/end` 且 `reason.kind === 'completed'`，并向 `DSH_DESKTOP_NOTIFY_URL` 给出的本机通知 URL 发送 POST。Rust 监听端只在主窗口不在前台时弹出系统通知并播放 `sounds/complete.wav`。

[YourBuddy 产品化 AI 工作台发行](../feature/2026-08-22-yourbuddy-product-workbench.zh.md)在同一份原生 Overlay Patch 中加入必需的 Harbor 插件节点与可执行路径，不把产品行为移入 Harness Package。

**更新仍使用带签名的 Tauri updater。** 签名检查在主窗口打开之后再跑，避免网络失败或超时拖住启动页。托盘「检查更新」按需运行同一套签名检查。

这是对[跨平台桌面源码预配](../feature/2026-08-14-cross-platform-desktop-source-provisioning.zh.md)的延伸，并不把桌面行为移进 `packages/`。

## 曾考虑的替代方案

**改 `apps/web` 或某个 `packages/*` 插件。** 不采用：每次同步上游都要重做或丢失桌面行为。overlay 改用文档中的 `--patch` 层。

**直接写 `$DSH_HOME/cordis.patch.yml`。** 不采用：该文件是用户的 home 级 patch 层。生成独立的 `--patch` 文件，把 home 文件留给用户。

**让 React 标题栏直接持有原生权限。** 不采用：这会把特权行为耦合到 Web 客户端标记，并向 Host 插件暴露 Tauri 操作。当前标题行占位方只负责呈现，也只能请求 Shell 的固定动作集合。

**标题栏关闭按钮一律退出。** 不采用：编码会话不应因误点关闭而结束；第一次关闭会询问，之后由已保存偏好和托盘负责进程生命周期。

**关闭一律隐藏且不再询问。** 不采用：有人希望关闭即退出；托盘缺失时隐藏看起来像崩溃。

## 后果

桌面专属窗口行为留在 `apps/desktop-tauri`；通用侧栏标题操作席位记录在 YourBuddy 的 DSH 来源补丁中，不含任何原生动作代码。缺少 overlay 文件时 Host 启动会明确失败。用户已有的 home `cordis.patch.yml` 保持不动。窗口在前台时的 turn 不弹通知、不播放完成音。读不到按钮布局的 Linux 主机使用 Windows 风格的控件顺序。`apps/desktop-tauri/screenshots/` 中的截图用于说明外壳外观，不是从实况会话录制。
