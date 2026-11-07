# YourBuddy 0.4.14

Claude Design and Claude Artifacts 2.11.1 are bundled with an in-app managed editor. Artifacts starts an unsent Design draft using YourBuddy’s configured default model. This release also adds bounded SDK snapshot-test timeout diagnostics, PATH-safe component directories and deterministic equivalent-Store archives, plus a test startup-race correction.

内置 Claude Design 与 Claude Artifacts 2.11.1，并提供应用内托管编辑器。Artifacts 使用 YourBuddy 已配置的默认模型创建未发送的 Design 草稿。本版还加入有界 SDK 快照测试超时诊断、适用于 PATH 的组件目录和等价 Store 确定性归档，并修正测试启动竞态。

Exact combined-source Chromium acceptance passed. Real-model generation, native macOS WebView export/saving and cold Session/controller restoration remain unverified. Managed LAN Share and non-comment page-button agent requests are unsupported. The Store change is not shared CAS or incremental download support; a first canonical archive can require a fresh download. Original timeout and disk-growth causes remain unresolved. Agent self-upgrade is not included.

精确组合源码已通过 Chromium 验收。真实模型生成、macOS 原生 WebView 导出/保存及冷启动 Session/controller 恢复仍未验证。托管 LAN Share 与非评论页面按钮的 Agent 请求不受支持。Store 变更没有实现共享 CAS 或增量下载，首次规范化归档可能需要重新下载。原始超时与磁盘增长根因仍未确定。本版不含 Agent 自升级。

Upstream LICENSE, NOTICE.md and editor third-party notices are preserved. Design has mixed terms, not a collective MIT license; the upstream notice’s unlicensed Anthropic-origin material remains unresolved.

保留上游 LICENSE、NOTICE.md 与编辑器第三方声明。Design 采用混合条款，并非整体 MIT；上游声明中 Anthropic 来源材料的许可缺口仍未解决。

Verification archive / 验证归档: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.14/docs/releases/yourbuddy-v0.4.14
