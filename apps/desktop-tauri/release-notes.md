# YourBuddy 0.3.18

## English

YourBuddy 0.3.18 shortens the desktop release path so reviewed local checks are not repeated after tagging.

- The release command now validates the version archive and Git state, then pushes the annotated tag without rebuilding or rerunning the release suite.
- Tagged CI now builds and publishes committed inputs without resolving upstream channels or repeating source-level Host, shell, Oil Publisher, Node, and Rust tests.
- The packaged-runtime smoke, updater signature, checksums, manifest generation, and GitHub Release upload remain in the artifact path.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.18 缩短桌面发布路径，不再在打 Tag 后重复已经完成的本地检查。

- 发布命令现在只校验版本归档与 Git 状态，随后推送 Annotated Tag，不再重新构建或重复运行发布测试。
- Tag CI 直接构建并发布已提交输入，不再解析上游 Channel，也不重复源码级 Host、Shell、Oil Publisher、Node 与 Rust 测试。
- 打包后 Runtime 冒烟测试、Updater 签名、校验和、Manifest 生成与 GitHub Release 上传继续保留在产物路径中。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.18/docs/releases/yourbuddy-v0.3.18)
