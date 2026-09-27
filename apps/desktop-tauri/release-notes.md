# YourBuddy 0.3.21

## English

YourBuddy 0.3.21 fixes the bundled Agent Browser on macOS.

- The bundled Ego Browser host now uses the native macOS desktop session instead of requesting Linux `DISPLAY` or Xvfb.
- Standard Chrome, Chromium, Brave, and Edge application paths are discovered automatically.
- The integrity-pinned SDK runtime required by the structured browser tools is now included in clean release builds.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates**. Existing data requires no migration. A compatible local Chromium-family browser is required; a separate Ego Lite installation is not required. The application is not signed or notarized with an Apple Developer identity.

## 中文

YourBuddy 0.3.21 修复 macOS 上的内置 Agent Browser。

- 内置 Ego Browser Host 现在使用 macOS 原生桌面会话，不再要求 Linux `DISPLAY` 或 Xvfb。
- 自动发现标准位置中的 Chrome、Chromium、Brave 与 Edge。
- 干净 Release 构建现在包含结构化浏览器工具所需、按完整性固定的 SDK Runtime。

请从本 Release 安装 Apple Silicon DMG，或使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有数据无需迁移。本机需要兼容的 Chromium 系浏览器，不需要单独安装 Ego Lite。应用尚未使用 Apple Developer 身份签名或公证。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.21/docs/releases/yourbuddy-v0.3.21
