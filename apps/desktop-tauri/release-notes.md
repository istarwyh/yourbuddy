# YourBuddy 0.3.3

## English

YourBuddy 0.3.3 fixes the installed macOS application stopping at `dsh web authentication required` after the private Host starts.

- Completes the one-time Host token exchange in native code and validates the returned authority cookie before creating the main WebView.
- Serves the privileged desktop shell from an application-owned random `127.0.0.1` port. The shell and Host are same-site but remain cross-origin, so macOS WebKit sends the original `HttpOnly; SameSite=Strict` cookie without granting Host plugins native Tauri permissions.
- Keeps the token URL out of renderer state, logs, and the system browser. Startup fails closed if the cookie or loopback shell does not meet the expected security attributes.
- Updates the release smoke to reproduce the installed shell's site relationship and retains the confirmed 0.3.2 failure in that version's verification record.
- Keeps Harbor Evolution `0.9.2`, Codex Auth `0.3.2`, Better Sidebar `0.18.0`, Context Doctor `0.7.2`, and Plugin Marketplace `0.3.1` pinned on DSH `0.1.2-rc.1`; release preparation found no compatible source update to commit.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.3 修复了 macOS 安装版在私有 Host 启动后停留于 `dsh web authentication required` 的问题。

- 在原生代码中完成一次性 Host Token 交换，并在创建主 WebView 前校验返回的 Authority Cookie。
- 通过应用自有的随机 `127.0.0.1` 端口提供特权桌面 Shell。Shell 与 Host 同 Site 但保持跨 Origin，因此 macOS WebKit 可以发送原有的 `HttpOnly; SameSite=Strict` Cookie，同时 Host 插件不会获得 Tauri 原生权限。
- Token URL 不会进入 Renderer 状态、日志或系统浏览器。Cookie 或 Loopback Shell 不符合预期安全属性时，启动会直接失败。
- 发布 Smoke 现在会复现安装版 Shell 的 Site 关系；0.3.2 已确认的失败也保留在该版本验证记录中。
- Harbor Evolution `0.9.2`、Codex Auth `0.3.2`、Better Sidebar `0.18.0`、Context Doctor `0.7.2` 与 Plugin Marketplace `0.3.1` 继续固定在 DSH `0.1.2-rc.1` 上；发布准备未发现需要提交的兼容来源更新。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.3/docs/releases/yourbuddy-v0.3.3)
- [Download verification bundle / 下载验证资料包](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.3/yourbuddy-v0.3.3-verification.zip)
