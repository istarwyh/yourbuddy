# YourBuddy 0.3.4

## English

YourBuddy 0.3.4 lets you ask about the open Harbor page directly from the ordinary conversation input.

- Captures the active Harbor page and selection when you send. Changing pages while preparation runs does not change that message's context, and explicit Harbor references take priority.
- Shows a compact context attachment with the selected Trial or item count and an expandable readable summary. Your question stays readable in the message bubble; the same frozen context is preserved in the conversation log and model request.
- Keeps an unsent message and its images available when preparation fails while you are writing another message. **Restore to composer** does not send anything or overwrite the new draft; sending the restored message captures the page open at that time.
- Cancels context preparation when you stop an unaccepted send or unload its plugin. A message already recorded by the Host is not restored as a duplicate draft.
- Includes Harbor Evolution `0.9.4` with the matching Python adapter. This update retains the macOS startup authentication fix from `0.3.3`.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.4 支持直接在普通对话输入框中询问当前打开的 Harbor 页面。

- 点击发送时捕获当前 Harbor 页面与选区。准备过程中切换页面不会改变这条消息的上下文，显式 Harbor 引用优先。
- 使用紧凑的上下文附件显示所选 Trial 或条目数量，并可展开查看可读摘要。消息气泡保留清晰的问题原文；同一份冻结上下文同时保存在对话日志与模型请求中。
- 准备失败时，即使已经开始输入下一条消息，也能找回未发送的原文与图片。**恢复到输入框**不会发送消息或覆盖新草稿；再次发送时会捕获当时打开的页面。
- 停止尚未被 Host 接纳的发送或卸载相关插件时，会取消上下文准备。Host 已记录的消息不会作为重复草稿恢复。
- 内置 Harbor Evolution `0.9.4` 与配套 Python Adapter，并保留 `0.3.3` 的 macOS 启动认证修复。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.4/docs/releases/yourbuddy-v0.3.4)
- [Download verification bundle / 下载验证资料包](https://github.com/istarwyh/yourbuddy/releases/download/yourbuddy-v0.3.4/yourbuddy-v0.3.4-verification.zip)
