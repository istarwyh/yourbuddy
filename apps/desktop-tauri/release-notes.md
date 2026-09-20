# YourBuddy 0.3.8

## English

YourBuddy 0.3.8 synchronizes the desktop runtime with DeepSeek Harness 0.1.5-rc.2 and refreshes the bundled workbench plugins without changing the existing YourBuddy data directory.

- The bundled DeepSeek Harness source and package graph are pinned to the official `dsh-v0.1.5-rc.2` release.
- Better Sidebar 0.19.1 keeps the primary YourBuddy workbench layout while using the DSH native right sidebar for the conversation. Its width, narrow-window drawer, bottom workbench, terminal, media preview, and desktop external-link behavior remain available.
- Plugin Marketplace 0.3.3 enables one-click installation only after an npm package links to the selected GitHub repository and declares `dsh.bundle.patch`; missing, ambiguous, and registry-error states direct users to the repository instructions instead.
- Harbor Evolution 0.9.7, Context Doctor 0.7.2, and the refreshed product plugin set are included with peer versions aligned to the bundled DSH release.
- Desktop proxy routing, additional certificate authorities, native system helpers, and release smoke checks follow the current DSH runtime.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.8 将桌面运行时同步到 DeepSeek Harness 0.1.5-rc.2，并刷新内置工作区插件，不改变现有 YourBuddy 数据目录。

- 内置 DeepSeek Harness 源码与依赖图固定到官方 `dsh-v0.1.5-rc.2` Release。
- Better Sidebar 0.19.1 保留 YourBuddy 主工作区布局，并使用 DSH 原生右侧边栏承载对话区；宽度调整、窄窗口抽屉、底部工作区、终端、媒体预览和桌面外链行为继续可用。
- Plugin Marketplace 0.3.3 仅在 npm Package 关联所选 GitHub 仓库并声明 `dsh.bundle.patch` 后开放一键安装；缺失、歧义或注册表错误状态会引导用户改用仓库说明。
- 内置 Harbor Evolution 0.9.7、Context Doctor 0.7.2 与刷新后的产品插件集合，Peer 版本均与内置 DSH Release 对齐。
- 桌面代理路由、附加证书机构、原生系统辅助能力与 Release Smoke 已适配当前 DSH 运行时。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.8/docs/releases/yourbuddy-v0.3.8)
- The downloadable verification bundle is attached after public artifact verification. / 可下载验证资料包会在公开产物核验后附加。
