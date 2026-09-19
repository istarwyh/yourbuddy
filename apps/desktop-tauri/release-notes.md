# YourBuddy 0.3.7

## English

YourBuddy 0.3.7 promotes Better Sidebar from a floating overlay to the primary desktop workbench while keeping the DSH conversation and every existing plugin capability available.

- Better Sidebar now occupies the flexible main region on desktop, with the conversation on the right and the existing navigation and details regions preserved.
- The divider between the workbench and conversation is resizable. On narrow windows, the conversation remains primary and Better Sidebar opens through its existing drawer interaction.
- Better Sidebar tabs, files, tasks, terminals, previews, floating windows, and bottom workbench remain available; the upstream plugin still defaults to its original portal presentation outside YourBuddy.
- The DSH layout and Better Sidebar compatibility changes are recorded as replayable, hashed product patches. Refreshing either upstream snapshot reapplies the YourBuddy changes instead of silently overwriting them.
- Better Sidebar remains at the reviewed 0.18.1 release and Harbor Evolution remains at 0.9.5. Harbor Evolution 0.9.6 is not included because its DSH skill peer requirement is newer than the DSH release bundled by YourBuddy.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.7 将 Better Sidebar 从浮动覆盖层提升为桌面主工作区，同时保留 DSH 对话区和已有的全部插件能力。

- 在桌面宽度下，Better Sidebar 占据可伸缩的主要区域，对话区位于右侧，原有导航区和详情区继续保留。
- 工作区与对话区之间的分隔条可以拖动调整。窗口较窄时，对话区仍是主界面，Better Sidebar 继续通过原有抽屉交互打开。
- Better Sidebar 的标签页、文件、任务、终端、预览、浮动窗口和底部工作区均继续可用；在 YourBuddy 之外，上游插件仍默认使用原有 Portal 展示方式。
- DSH 布局和 Better Sidebar 的兼容修改已记录为可重放且带哈希的产品补丁。刷新任一上游快照时都会重新应用 YourBuddy 修改，不会被静默覆盖。
- Better Sidebar 保持在已评审的 0.18.1，Harbor Evolution 保持在 0.9.5。Harbor Evolution 0.9.6 要求比 YourBuddy 当前内置 DSH 更新的 skill peer，因此本版本不包含它。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.7/docs/releases/yourbuddy-v0.3.7)
- The downloadable verification bundle is attached after public artifact verification. / 可下载验证资料包会在公开产物核验后附加。
