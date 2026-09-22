# YourBuddy 0.3.15

## English

YourBuddy 0.3.15 makes creator publishing available from the built-in Content Creation preset.

- Oil Creator now bundles the maintained video-publisher, video-to-article, and WeChat Official Account publisher Skills instead of requiring separate Skill installation.
- The new `oil_prepare_publish` tool prepares drafts for enabled Xiaohongshu, Douyin, Bilibili, and WeChat Channels accounts and can upload an existing article to the WeChat Official Account draft box.
- Video drafts remain open in Ego Browser for review. The WeChat API flow creates a draft only; final publication or group-send remains a user action.
- Ego Browser discovery resolves the installed executable directly, improving launches when the desktop environment has a restricted `PATH`.
- Product snapshots now retain the video publisher's generated runtime modules and use portable path and mode hashing. The 0.3.13 and 0.3.14 tags produced no public artifacts; 0.3.15 is their corrected successor.
- Video publishing still requires Ego Lite with logged-in creator accounts. WeChat Official Account drafts require AppID, AppSecret, and an API IP allowlist. Real account publication was not exercised before tagging.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.15 在内置的“内容创作”Preset 中提供创作者发布能力。

- Oil Creator 内置维护中的视频发布、视频转文章和微信公众号发布 Skills，不再要求用户单独安装这些 Skills。
- 新增 `oil_prepare_publish` 工具，可为已启用的小红书、抖音、B站和视频号账号准备草稿，也可把已有文章上传到微信公众号草稿箱。
- 视频草稿会保留在 Ego Browser 中供用户检查；微信公众号 API 流程只创建草稿，最终发表或群发仍由用户操作。
- Ego Browser 探测会直接解析已安装的可执行文件，减少桌面环境 `PATH` 受限导致的启动失败。
- 产品快照现会保留视频发布器生成的运行时模块，并使用可移植的路径与权限哈希。0.3.13 和 0.3.14 Tag 均未产生公开产物；0.3.15 是其修正版。
- 视频发布仍需安装 Ego Lite 并登录创作者账号；微信公众号草稿需要 AppID、AppSecret 与 API IP 白名单。Tag 前未使用真实账号执行发布。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.15/docs/releases/yourbuddy-v0.3.15)
