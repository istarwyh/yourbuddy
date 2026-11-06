# dsh-yourbuddy-design

[English](README.md) | 中文

YourBuddy 通过精确依赖和冻结的 Harness 锁文件内置 2.11.1 版 `dsh-claude-design` 与 `dsh-claude-artifacts`。离线 Store 包含发布包，仓库只保留接入补丁和[来源记录](UPSTREAM.json)。各包的 LICENSE、NOTICE.md 和编辑器第三方声明均保留。混合许可不能统称为 MIT，来源记录也不解决上游声明中来自 Anthropic 且未公开许可的材料问题。

## Use

作品侧边栏在当前工作区新建一条尚未发送的 `/claude-design` 草稿，保留已选 Agent 预设，使用 YourBuddy 配置的默认模型，不覆盖已有草稿。模型在会话工作区内写入 `project/canvas.json` 和 `.dc.html` 文件，然后调用 `yourbuddy_design_open`；从作品列表选择该作品即可在应用内打开编辑器。普通聊天链接仍在系统浏览器打开。

受管 Host Node 为每个规范化作品文件夹启动一个前台编辑器子进程。重复打开复用该进程，其他会话不能接管正在使用的编辑器，外部启动的服务不会被终止。禁用适配器或退出 Host 会停止其子进程；插件加载失败与工作台启动隔离。插件页控制三个产品行。升级随应用发布，不使用上游独立更新器。

Send to Agent 向关联会话排入带上游评论卡片的通知。会话、文件夹、评论线程和发送批次组成稳定标识，重试不会重复排入；只有会话写入器完成持久化后，编辑器才标记已投递。明确取消的投递不会被恢复。未确认的评论保留在 comments.json，编辑器重启时重试。Agent 使用上游 comment-reply 向同一文件夹回复。非评论的页面按钮 Agent 请求暂不支持：接口在接受前返回 HTTP 409；请改用已保存评论的 Send to Agent。

## Configuration and verification

适配器支持 startupTimeoutMs（20000）和 stopTimeoutMs（5000）。服务仅监听 127.0.0.1，由系统分配端口，不通过 shell 启动编辑器，并去除名称包含凭据标记的环境变量。受管编辑器忽略持久化的 LAN 共享设置，并拒绝启用 LAN Share；不会改写已有共享文件。编辑器 iframe 和本地文件导出路径保持上游行为及现有桌面权限。

构建并按冻结锁文件安装 bundled Harness 后，运行 `pnpm --dir apps/desktop-tauri run test:design`。该命令针对已安装包执行 Node 回归测试和生产 AgentLoop/JSONL 专项测试，再通过真实 Web profile 验证 Loader、工具执行、作品接口、删除/撤销/重开及 Chromium Client 启动。如果 Chromium 不在 Playwright 缓存中，可设置 `YOURBUDDY_RELEASE_CHROMIUM_EXECUTABLE`。传入 `--host-only` 会明确跳过浏览器执行。

Linux 验证通过 22 项适配器 Node、2 项 CI 接线、7 项 Vitest 和真实 Host 生命周期测试。故意使用无效设计配置后，Web 文档和实际会话创建仍可用。正常离线 Store 准备流程生成了 Linux seed 压缩包；从压缩包恢复 Store 后，使用与首次启动相同的冻结离线参数，从空安装树安装通过。这是 Linux 证据，不代表 macOS 发行或原生首次启动通过。Linux 上覆盖了原生锁竞争；Windows 命名管道分支尚未在 Windows 上运行。

评论测试中的会话解析器使用测试替身。Bootstrap regression 工作流复用现有 YourBuddy 构建，生成实际 Linux 离线 seed，从压缩包重装后执行 Chromium 验收，涵盖作品入口、未发送草稿、受管 iframe 打开，以及功能启动失败后的工作台启动。不需要模型凭据或发布权限，只保留测试日志。仍需实际 CI 运行成功，接入工作流不等于验收通过。

冷会话恢复、模型生成、macOS arm64 原生 Tauri/WebView、HTML/PDF/PNG 导出及桌面保存仍需验收。云执行环境因 Unix socket 被拒绝而无法启动 Chromium，独立云浏览器也无法访问其回环服务器。Host 测试不能替代 Client 或原生验收。
