# YourBuddy 0.3.9

## English

YourBuddy 0.3.9 restores the desktop workbench and GPT Auth paths that could appear unavailable after the 0.3.8 runtime refresh.

- Better Sidebar now fills the primary desktop workbench whenever a Session is open, even when its previous bottom-panel state was collapsed. The resizable conversation remains in the auxiliary right column, and narrow windows retain the drawer presentation.
- GPT Auth status requests are registered on the Web carrier again, eliminating the `Cannot read properties of undefined (reading 'get')` load failure. The packaged release smoke verifies the status channel and resolves GPT-5.6 Sol through the bundled Codex model catalog without sending a model request.
- macOS window controls now occupy the expanded sidebar header, with a compact startup and collapsed-sidebar fallback instead of a permanently empty top rail.
- Existing YourBuddy data remains in place; no migration is required.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.9 修复了 0.3.8 运行时刷新后可能不可用的桌面工作区与 GPT Auth 路径。

- 打开会话后，Better Sidebar 会始终填满桌面主工作区，即使此前底部面板处于折叠状态；可调整宽度的对话区继续位于右侧辅助栏，窄窗口仍使用抽屉展示。
- GPT Auth 状态请求重新注册到 Web Carrier，消除 `Cannot read properties of undefined (reading 'get')` 加载失败。打包发布 Smoke 会验证状态通道，并通过内置 Codex 模型目录解析 GPT-5.6 Sol，全程不发送真实模型请求。
- macOS 窗口控制按钮移入展开后的侧边栏标题区；启动阶段和侧边栏折叠时使用紧凑回退，不再永久占用空白顶栏。
- 现有 YourBuddy 数据会保留，无需迁移。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.9/docs/releases/yourbuddy-v0.3.9)
- The downloadable verification bundle is attached after public artifact verification. / 可下载验证资料包会在公开产物核验后附加。
