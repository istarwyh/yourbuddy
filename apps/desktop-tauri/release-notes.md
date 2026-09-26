# YourBuddy 0.3.17

## English

YourBuddy 0.3.17 fixes desktop startup with the current DSH Web redirect and refreshes the product homepage around a task-shaped personal workbench.

- Native startup now accepts the DSH Web authentication exchange without requiring one exact redirect status or `Location` spelling. The desktop still obtains the session cookie before opening the workbench.
- Desktop WebView navigation and cookie setup trust the first-party DSH runtime instead of applying duplicate URL, cookie-attribute, and post-write checks.
- The product homepage now presents YourBuddy as a task-shaped personal AI workbench and uses a real workbench image with a simpler proof section.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

Updater installation from an older version and Apple Developer signing and notarization remain unverified unless the version archive states otherwise.

## 中文

YourBuddy 0.3.17 修复当前 DSH Web 重定向下的桌面启动，并围绕由任务塑造的个人 AI 工作台更新产品首页。

- 原生启动不再要求 DSH Web 身份认证交换使用唯一的重定向状态码或 `Location` 写法；桌面仍会在打开工作台前取得 Session Cookie。
- 桌面 WebView 导航与 Cookie 设置直接信任第一方 DSH 运行时，不再重复执行 URL、Cookie 属性和写入后校验。
- 产品首页现在把 YourBuddy 表达为由任务塑造的个人 AI 工作台，并用真实工作台图片和更简洁的证明区展示产品。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

除非版本归档另有记录，从旧版本安装更新、Apple Developer 签名与公证仍标记为未验证。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.17/docs/releases/yourbuddy-v0.3.17)
