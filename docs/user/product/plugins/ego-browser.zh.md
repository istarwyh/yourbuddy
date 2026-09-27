# Ego Browser

[English](ego-browser.md) | 中文

随应用集成的快照版本：`0.8.5`。来源：[Fisfzy/dsh-ego-browser](https://github.com/Fisfzy/dsh-ego-browser)。

## 解决的问题

Agent 可以通过职责明确的 `ego_*` 工具操作真实 Chromium 浏览器，用户能查看当前页面，并在需要时接管操作。

## 使用方式

YourBuddy 已内置 Ego Browser，并使用 Better Sidebar 展示 Agent Browser 标签页。让 Agent 打开或操作网站；第一个浏览器工具启动后，标签页会显示实时浏览器。Better Sidebar 不可用时，插件也可以使用悬浮观察面板。在 macOS 上，内置 Host 会通过原生桌面会话直接启动本机的 Chrome、Chromium、Brave 或 Edge；它不需要 X11、`DISPLAY`、Xvfb 或单独安装 Ego Lite。

## 默认集成的理由

它让工作台可以处理依赖登录态和动态渲染的网站，同时保持浏览器活动可见，便于人工检查与介入。

## 交付方式与取舍

YourBuddy 随应用交付经过检查的 `dsh-ego-browser` 插件快照，而不是在启动时执行 `dsh plugin --profile web add git+https://github.com/Fisfzy/ego-browser.git`。YourBuddy 使用独立的应用主目录而非用户的 `~/.dsh`；启动时通过 Git 安装还会依赖 GitHub 连接、解析可能在两次启动之间发生变化的分支，并在用户机器上执行依赖安装或构建。内置快照固定 Package 版本、Git Commit、归档完整性、Peer Metadata 与离线 Lockfile，使冷启动可以复现，而且不需要访问 npm 或 GitHub。

这种方式增加约 314 KB 的插件压缩载荷，应用级压缩前约为 1.2 MB，其中包含按完整性固定的 SDK Runtime；它不包含 Chromium，也不包含按需下载的可选 FFmpeg。插件更新会随 YourBuddy 发行，而不会立即跟随上游，因此每次升级 Ego Browser 或 Harness 都必须重新执行兼容性检查和浏览器 Smoke。用户自行安装并启用的 `dsh-ego-browser` Web Profile Bundle 会优先于名称唯一的内置 Fallback，从而允许独立更新，但 Package 选择与兼容性也重新由用户负责。

## 限制

浏览器自动化可能遇到登录失效、人机验证、下载限制和站点专用控件。macOS 上要求配置 `DISPLAY` 或 Xvfb 的错误表示正在使用过时或外部提供的 Linux-only Host；应更新 YourBuddy 或停用外部 Bundle，而不是安装 Xvfb。用户接管浏览器不代表 Agent 获得发布、购买或执行其他高影响操作的权限；这些动作仍需用户明确指示。网站与浏览器 Profile 可能包含敏感账号数据，继续前请检查当前页面和账号。
