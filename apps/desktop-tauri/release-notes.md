# YourBuddy 0.3.10

## English

YourBuddy 0.3.10 restores Better Sidebar file opening and makes its embedded Browser render ordinary URLs by default.

- File-tree clicks and **Open in new tab** now target the Session and workspace that own the Files tab, so native Sidebar presentation no longer drops the open request.
- Explorer reveal and Changes-tab file actions use the same explicit Session scope.
- The embedded Browser defaults to unrestricted cross-origin iframe behavior, allowing sites such as Baidu to render without a per-tab sandbox unlock.
- Users who prefer the restricted iframe sandbox can enable it explicitly in Side card settings.
- The source, distributed Better Sidebar bundles, replayable product patches, and product provenance hashes carry the same behavior through future plugin refreshes.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.10 恢复 Better Sidebar 文件打开，并让内嵌浏览器默认正常渲染普通 URL。

- 文件树点击与**在新标签页中打开**会明确使用 Files Tab 所属的 Session 与工作区，原生 Sidebar 展示不再丢弃打开请求。
- Explorer Reveal 与 Changes Tab 文件动作使用相同的显式 Session Scope。
- 内嵌浏览器默认使用不受限的跨源 iframe 行为，无需逐 Tab 解锁沙箱即可渲染百度等网站。
- 偏好受限 iframe 沙箱的用户仍可在 Side Card 设置中显式启用。
- 源码、Better Sidebar 分发 Bundle、可重放产品补丁与产品 Provenance Hash 会在后续插件刷新中保持一致行为。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.10/docs/releases/yourbuddy-v0.3.10)
- [Downloadable verification bundle / 可下载验证资料包](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.10/yourbuddy-v0.3.10-verification.zip) — SHA-256 `19ec2c7df84d4c733a20d8e5663c3ba887aba4dca8c92f7706b9b29cff6d587b`.
