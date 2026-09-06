# YourBuddy 0.3.2

## English

YourBuddy 0.3.2 adds an in-app Help menu and hardens authenticated startup of the private Node Host.

- Adds **Help** to the sidebar with direct links to the getting-started, plugin, extension-development, troubleshooting, and feedback pages. General settings also links to its usage guide.
- Opens help destinations in the system browser without navigating the workbench away from the active session. If opening fails, the address remains visible and copyable.
- Completes the Host's token exchange before showing the workbench, keeps credentials out of the stored root URL and logs, and continues draining Host output after readiness. This avoids blank or unauthorized startup states while preserving the authenticated first navigation.
- Improves subprocess lifecycle handling, including WSL process discovery and shutdown, and runs the full supervisor test module in the desktop release workflow.
- Expands the bilingual YourBuddy website with current product, configuration, tool, plugin, creator, development, troubleshooting, and roadmap guides.
- Refreshes the bundled Context Doctor from `0.7.0` to compatible version `0.7.2`; Harbor Evolution `0.9.2`, Codex Auth `0.3.2`, Better Sidebar `0.18.0`, and Plugin Marketplace `0.3.1` remain pinned on DSH `0.1.2-rc.1`.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.2 新增应用内帮助菜单，并强化私有 Node Host 的认证启动流程。

- 侧边栏新增**帮助**入口，可直接打开入门、插件、扩展开发、故障排查和反馈页面；通用设置也提供对应的使用指南链接。
- 帮助页面通过系统浏览器打开，不会让工作台离开当前会话。若打开失败，界面会保留可选择、可复制的地址。
- 工作台显示前会先完成 Host Token 交换；保存的根地址与日志不含凭据，同时就绪后继续排空 Host 输出。这样既保留首次认证导航，也避免空白或未授权的启动状态。
- 改进子进程生命周期处理，包括 WSL 进程发现与终止，并在桌面发布工作流中运行完整 Supervisor 测试模块。
- 扩充双语 YourBuddy 官网，覆盖当前产品、配置、工具、插件、创作者、扩展开发、故障排查和路线图指南。
- 将内置 Context Doctor 从 `0.7.0` 更新到兼容版本 `0.7.2`；Harbor Evolution `0.9.2`、Codex Auth `0.3.2`、Better Sidebar `0.18.0` 与 Plugin Marketplace `0.3.1` 继续固定在 DSH `0.1.2-rc.1` 上。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification archive / Tag 内验证归档](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.2/docs/releases/yourbuddy-v0.3.2)
- [Download verification bundle / 下载验证资料包](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.2/yourbuddy-v0.3.2-verification.zip)
