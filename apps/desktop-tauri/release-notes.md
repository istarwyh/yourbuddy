# YourBuddy 0.4.19

## 中文

- **任务面板开关保留你的选择。** 修复自动打开后台任务和子代理面板的设置被应用默认配置覆盖、关闭后立即回弹的问题。
- **恢复插件市场设置入口。** 打开**插件 → 随应用提供的插件设置 → 插件市场**。恢复配置入口不会把用户插件标记为已安装或已启用。
- 更新 DeepSeek Harness **0.2.2-rc.5**、Cordis **4.1.0**、Better Sidebar **0.32.1**、Codex Auth **0.3.4-rc.2**、Plugin Marketplace **0.5.10**、Media Desk **2.7.2** 和 Context Insights **0.87.0**。托管运行工具为 Node.js **24.22.3** / pnpm **11.28.5**；复用系统 Node.js 至少需要 **24.9**。

**系统要求：macOS 13.5 及以上、Apple Silicon。** 必需 Node 二进制声明的最低系统为 13.5，本版不再宣称支持 macOS 11、12 或 13.0–13.4；完整 13.5 与可选工具兼容矩阵尚未验证。可选择较小的 Bootstrap DMG，首次启动按需下载组件，或包含组件种子的 Offline DMG。已有安装可通过**设置 → 通用设置 → 应用生命周期 → 检查更新**更新。

验证范围和限制见归档。真实模型、账户登录、旧版原地升级与会话恢复未作保证；实验性 Codex 原生能力仍受上游限制。Codex Auth 是限个人开发使用的非官方社区接口。Tauri 更新签名不等于 Apple Developer 签名或公证。

## English

- **Task-panel switches keep your choice.** Fixes application defaults overriding automatic opening of background-job and subagent panels, which caused disabled switches to rebound immediately.
- **Plugin Marketplace settings are available again.** Open **Plugins → Included app plugin settings → Plugin marketplace**. Restoring this entry does not mark user plugins installed or enabled.
- Updates DeepSeek Harness **0.2.2-rc.5**, Cordis **4.1.0**, Better Sidebar **0.32.1**, Codex Auth **0.3.4-rc.2**, Plugin Marketplace **0.5.10**, Media Desk **2.7.2**, and Context Insights **0.87.0**. Managed tools are Node.js **24.22.3** / pnpm **11.28.5**; reusing system Node.js requires **24.9** or later.

**Requirements: macOS 13.5 or later on Apple Silicon.** The required Node binary declares a 13.5 minimum, so this release does not claim support for macOS 11, 12, or 13.0–13.4. The full 13.5 and optional-tool compatibility matrix remains unverified. Choose the smaller Bootstrap DMG for component downloads on first launch, or the Offline DMG with component seeds. Existing installations can use **Settings → General → Application lifecycle → Check for updates**.

See the archive for verification scope and limits. Real-model calls, account sign-in, and old-version in-place upgrade/conversation restoration are not guaranteed by these checks; experimental native Codex capabilities retain upstream restrictions. Codex Auth is an unofficial community interface limited to personal development. Tauri updater signing is not Apple Developer signing or notarization.

[Verification archive / 验证归档](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.19/docs/releases/yourbuddy-v0.4.19)
