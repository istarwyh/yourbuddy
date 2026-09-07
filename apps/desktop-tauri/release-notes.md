# YourBuddy 0.3.5

## English

YourBuddy 0.3.5 restores desktop controls rejected by the application permission layer and repairs Codex preset delegation when a conflicting global skill is installed.

- Network proxy test, CA selection, save-and-restart, update checks, application restart, close preference, external links, and Plugin Marketplace links can reach their registered native commands from the YourBuddy workbench.
- Codex preset requests now use the bundled, tracked `subagent_codex` route even when `codexhost-delegation` exists in the user's global skill directory, avoiding the misleading `codexhost: command not found` failure. Explicit `/codexhost-delegation` invocation remains available for users who intentionally want that external route.
- The release workflow checks the literal workbench command list against the Tauri permission file and resolves every allowed command through the real Tauri Runtime Authority for the exact desktop origin and window.
- The bundled DSH and product-plugin versions are unchanged from 0.3.4.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.5 修复了桌面控制项被应用权限层拒绝的问题，也修复了安装冲突全局 skill 时 Codex Preset 无法委派的问题。

- 网络代理测试、CA 选择、保存并重启、检查更新、重启应用、关闭偏好、外部链接和插件市场链接现在可以从 YourBuddy 工作台调用其已注册的原生命令。
- 即使用户的全局 skill 目录中存在 `codexhost-delegation`，Codex Preset 的普通委派现在也会使用内置、可追踪的 `subagent_codex` 路径，不再误报 `codexhost: command not found`。用户仍可显式输入 `/codexhost-delegation` 来选择该外部路径。
- 发布流程会对照 Tauri 权限文件检查工作台中的字面命令清单，并通过真实 Tauri Runtime Authority 验证准确桌面 Origin 与窗口下的每一条允许命令。
- 内置 DSH 与产品插件版本和 0.3.4 相同。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.5/docs/releases/yourbuddy-v0.3.5)
- The downloadable verification bundle is attached after public artifact verification. / 可下载验证资料包会在公开产物核验后附加。
