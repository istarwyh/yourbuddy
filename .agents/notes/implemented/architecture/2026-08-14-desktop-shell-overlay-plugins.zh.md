# Agent Note: 桌面壳标题栏与 overlay 插件

Status: implemented

[English](2026-08-14-desktop-shell-overlay-plugins.md) | 中文

## 问题

桌面 fork 必须提供窗口标题栏、托盘、签名更新和任务完成提醒，同时不能修改上游 Harness 包。后续同步应原样拉取 `packages/`、`apps/cli` 和 `apps/web`。必须观察 Host session 事件的功能不能只放在 WebView 里，因为那会改已发布的 web 客户端。

## 决策

上游终端模拟器负责光标查询应答及其异步完成。桌面分支移除固定坐标应答，使每次查询只获得一个响应，且就绪判定等待响应完成。

**内容使用独立的原生 WebView。** 跨站 iframe 无法保留 Host 的 `SameSite=Strict` 登录 cookie。监督器只从子进程 stdout 接收预期回环来源及单个非空令牌，验证 cookie 交换重定向但不跟随，再把地址交给内容 WebView，且不记入日志。本地标题栏保留自己的 WebView 和权限，远程内容不获得原生窗口权限。关闭对话框暂时隐藏内容，防止内容遮住对话框。原生和 WSL 命令均把启动器 patch 参数放在 `--no-open` 等 Web 参数之前。Tauri 的 `unstable` 特性启用现有多 WebView API；平台打包和真实窗口启动仍是必要验证。

**原生标题栏留在 `apps/desktop-tauri`。** 主窗口无边框。本地 `shell.html` 标题栏承载鱼形标志、标题和最小化/最大化/关闭。启动页是紧贴内容的透明窗口，中间一块无描边的径向毛玻璃（中心不透明、四周淡出），使用 `design-platform.css` 的深色 token（官方鱼形标志、DeepSeek 字标、HARNESS 铭牌和进度条）。第一次关闭在 `shell.html` 里打开与 web 客户端浅色 `Modal` 一致的页内对话框（遮罩、圆角 24 的卡片、胶囊描边/主按钮），并把选择写入 `%APPDATA%/DeepSeek Harness/desktop-settings.json` 的 `closeAction`。之后的关闭按该文件执行。托盘可切换「关闭时最小化到托盘 / 关闭时退出程序 / 下次关闭时再询问」，不会立刻退出；「重启」紧挨「退出」。隐藏最后一个窗口不会结束进程：在托盘「退出」、托盘「重启」、已保存的退出选择或更新器重启之前，`ExitRequested` 会被取消。这些路径会标记退出、结束 Host 的 Node 进程树，再调用 `app.exit` 或 `app.restart`（`app.restart` 不跑 `Drop`，所以必须先 stop）。Windows 把该树放进带 `KILL_ON_JOB_CLOSE` 的 Job，即使析构不跑也会回收孙进程。再次启动时，若 `host.pid` 记录的 Node 镜像仍匹配，会回收上次残留的进程。点击托盘显示窗口。单实例仍聚焦已有窗口。Windows 把这些按钮放在右侧；macOS 放在左侧；Linux 解析窗口管理器按钮布局（`gsettings` / XFCE，可用 `DSH_DESKTOP_BUTTON_LAYOUT` 覆盖），并允许左右分置。

**与 Host 的协作是 overlay 插件，不是改包。** 外壳把 `overlay/desktop-notify/index.mjs` 复制到 `$DSH_HOME/desktop-overlay`，写入插件 `name` 为 `file://` URL 的 `--patch` 列表，再启动 `dsh web --patch <该文件>`。Windows 盘符路径（如 `C:/...`）不是合法 ESM specifier——Node 会把 `C:` 当成 URL scheme——因此 overlay 必须写成 `file:///C:/...`（空格做百分号编码）。插件监听 `session/event` 中 `turn/end` 且 `reason.kind === 'completed'`，并向 `DSH_DESKTOP_NOTIFY_URL` 给出的本机通知 URL 发送 POST。Rust 监听端只在主窗口不在前台时弹出系统通知并播放 `sounds/complete.wav`。

**更新仍使用带签名的 Tauri updater。** 签名检查在主窗口打开之后再跑，避免网络失败或超时拖住启动页。托盘「检查更新」按需运行同一套签名检查。

这是对[跨平台桌面源码预配](../feature/2026-08-14-cross-platform-desktop-source-provisioning.zh.md)的延伸，并不把桌面行为移进 `packages/`。

## 曾考虑的替代方案

**改 `apps/web` 或某个 `packages/*` 插件。** 不采用：每次同步上游都要重做或丢失桌面行为。overlay 改用文档中的 `--patch` 层。

**直接写 `$DSH_HOME/cordis.patch.yml`。** 不采用：该文件是用户的 home 级 patch 层。生成独立的 `--patch` 文件，把 home 文件留给用户。

**把标题栏注入 React DOM。** 不采用：这会让标题栏耦合 web 客户端标记，且仍无法拥有托盘、更新或操作系统通知。

**标题栏关闭按钮一律退出。** 不采用：编码会话不应因误点关闭而结束；第一次关闭会询问，之后由已保存偏好和托盘负责进程生命周期。

**关闭一律隐藏且不再询问。** 不采用：有人希望关闭即退出；托盘缺失时隐藏看起来像崩溃。

## 后果

上游框架目录不再包含仅桌面使用的插件行。缺少 overlay 文件时 Host 启动会明确失败。用户已有的 home `cordis.patch.yml` 保持不动。窗口在前台时的 turn 不弹通知、不播放完成音。读不到按钮布局的 Linux 主机使用 Windows 风格的右侧控件。`apps/desktop-tauri/screenshots/` 中的截图用于说明外壳外观，不是从实况会话录制。
