# YourBuddy 0.3.24

## English

YourBuddy 0.3.24 fixes Session history loading in the macOS app.

- Main and subagent Sessions containing Assistant stream history now load consistently across WebKit, Chromium, Gecko, and Node runtimes.
- A history validation failure now ends in a visible error instead of leaving the conversation on **Loading history…**.
- The error state includes **Retry loading**, which opens a fresh history-stream generation without changing persisted Session data.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates**. Existing Session files require no migration. Completely quit and reopen an older running application after updating. The application is not signed or notarized with an Apple Developer identity.

## 中文

YourBuddy 0.3.24 修复 macOS 应用中的 Session 历史加载问题。

- 包含 Assistant Stream 历史的主 Session 与子 Agent Session 现在可以在 WebKit、Chromium、Gecko 和 Node Runtime 中一致加载。
- 历史校验失败时，会进入可见错误状态，不再让对话永久停在**载入历史…**。
- 错误状态提供**重试加载**，可用新的历史 Stream Generation 重试，且不会修改已持久化的 Session 数据。

请从本 Release 安装 Apple Silicon DMG，或使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 Session 文件无需迁移。更新后请完全退出并重新打开旧进程。应用尚未使用 Apple Developer 身份签名或公证。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.24/docs/releases/yourbuddy-v0.3.24
