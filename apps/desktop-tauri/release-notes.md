# YourBuddy 0.3.16

## English

YourBuddy 0.3.16 keeps work, creator content, and the active Session coordinated without discarding their state.

- Better Sidebar remains the middle workbench. Creator Content is a native navigation item, so YourBuddy branding and Session controls stay available. Opening Content temporarily uses the same middle seat; closing it, explicitly opening a Better Sidebar resource, or selecting another Session returns to the workbench.
- Conversation and its native right sidebar collapse and restore as one Session region. Pending questions, approvals, completed current-Session turns, and explicit Session selection restore that region; collapsed focused controls move focus to the persistent restore button.
- Background Agent resource opens can update Better Sidebar without replacing visible Content. User file actions remain bound to the Session and pane where they started, including deferred in-place, reveal, new-tab, and side-pane opens.
- Fresh Sessions default to Full access with no approval prompts. Existing Sessions and an explicitly saved user default retain their recorded settings.
- Oil Creator validates the finished video, title, tags, optional covers, originality confirmation, and enabled platforms before preparing drafts. Per-platform successes and blockers are preserved for retry, and optional WeChat Official Account draft creation remains independent.
- Video publishing guards final and scheduled actions during automation, requires complete READY evidence, and verifies that the guard is detached before returning the creator page. Final publication, scheduling, and group-send remain user actions.
- Contributors can run `pnpm release:yourbuddy -- X.Y.Z` from a clean reviewed `master` candidate to rerun release checks and atomically push the branch with its annotated release tag; GitHub Actions still builds and publishes the artifacts.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

Video drafts require Ego Lite and logged-in creator accounts. WeChat Official Account drafts require AppID, AppSecret, and an API IP allowlist. Real-account publication, updater installation from an older version, native packaged startup, and packaged-WebView interaction are recorded as unverified unless the version archive states otherwise.

## 中文

YourBuddy 0.3.16 让工作区、创作者内容和当前 Session 协同切换，同时保留各自状态。

- Better Sidebar 保持为中间工作台。创作者内容改用原生导航入口，因此 YourBuddy 品牌与 Session 控件会持续可用。打开创作者内容时，详情临时使用同一个中间位置；关闭详情、显式打开 Better Sidebar 资源或选择另一个 Session 后，会回到工作台。
- Conversation 与原生右侧栏作为一个 Session 区域一起收起和恢复。待回答问题、待审批、当前 Session 完成一轮以及显式选择 Session 都会恢复该区域；如果收起时焦点位于其中，焦点会移动到持续可见的恢复按钮。
- Agent 后台打开资源时可以更新 Better Sidebar，但不会替换正在显示的内容详情。用户文件操作会继续绑定到发起时的 Session 和 Pane，包括延迟执行的原位打开、定位、新标签和侧栏打开。
- 新建 Session 默认使用 Full access，且不弹出审批提示。已有 Session 与用户显式保存的默认设置保持不变。
- Oil Creator 会在准备草稿前检查成片、标题、标签、可选封面、原创确认和已启用平台。各平台成功结果与阻塞原因会保留以供重试；可选的微信公众号草稿创建保持独立。
- 视频发布自动化期间会保护最终发表与定时操作，要求完整 READY 证据，并在交还创作者页面前验证保护已经解除。最终发表、定时发布和群发仍由用户执行。
- 贡献者可以在经过评审且干净的 `master` 候选上运行 `pnpm release:yourbuddy -- X.Y.Z`，重新执行发布检查，并原子推送分支与 Annotated Release Tag；产物仍由 GitHub Actions 构建和发布。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

视频草稿需要 Ego Lite 与已登录的创作者账号。微信公众号草稿需要 AppID、AppSecret 和 API IP 白名单。除非版本归档另有记录，真实账号发布、从旧版本安装更新、原生安装包启动和安装包 WebView 交互仍标记为未验证。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.16/docs/releases/yourbuddy-v0.3.16)
