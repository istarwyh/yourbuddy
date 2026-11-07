# YourBuddy 0.4.17

This release follows the unpublished 0.4.14, 0.4.15 and 0.4.16 candidates. The 0.4.14 and 0.4.15 checks exposed an incomplete test fixture and a stale product-peer roster. Both are corrected; branding reset acceptance now verifies the committed settings and a separate read, while retaining all rendered and reload checks. The older tags stay unchanged and have no Release or installer.

本版接续未发布的 0.4.14、0.4.15 和 0.4.16 候选。0.4.14 和 0.4.15 的发行检查发现测试 fixture 缺少输入和产品 peer 清单过期，现已修正；品牌重置验收改为检查已提交设置与独立读取结果，同时保留全部渲染及重载检查。旧标签不变，没有 Release 或安装包。

Settings no longer disappears while an onboarding step is loading or silently skipping. A real visible onboarding dialog still takes over normally, including account sign-in.

Settings 不再因引导步骤加载或静默跳过而消失。真正可见的引导弹窗仍会正常接管，包括账号登录。

Claude Design and Claude Artifacts 2.11.1 are bundled with an in-app managed editor. Artifacts starts an unsent Design draft using YourBuddy’s configured default model. This release also adds bounded SDK snapshot-test timeout diagnostics, PATH-safe component directories and deterministic equivalent-Store archives, plus a test startup-race correction.

内置 Claude Design 与 Claude Artifacts 2.11.1，并提供应用内托管编辑器。Artifacts 使用 YourBuddy 已配置的默认模型创建未发送的 Design 草稿。本版还加入有界 SDK 快照测试超时诊断、适用于 PATH 的组件目录和等价 Store 确定性归档，并修正测试启动竞态。

Historical combined-source Chromium acceptance passed on product tree `b2f40dd` in Bootstrap run 42346920573. Real-model generation, native macOS WebView export/saving and cold Session/controller restoration remain unverified. Managed LAN Share and non-comment page-button agent requests are unsupported. The Store change is not shared CAS or incremental download support; a first canonical archive can require a fresh download. Original timeout and disk-growth causes remain unresolved. Agent self-upgrade is not included.

历史组合产品树 `b2f40dd` 已在 Bootstrap 运行 42346920573 中通过 Chromium 验收。真实模型生成、macOS 原生 WebView 导出/保存及冷启动 Session/controller 恢复仍未验证。托管 LAN Share 与非评论页面按钮的 Agent 请求不受支持。Store 变更没有实现共享 CAS 或增量下载，首次规范化归档可能需要重新下载。原始超时与磁盘增长根因仍未确定。本版不含 Agent 自升级。

Upstream LICENSE, NOTICE.md and editor third-party notices are preserved. Design has mixed terms, not a collective MIT license; the upstream notice’s unlicensed Anthropic-origin material remains unresolved.

保留上游 LICENSE、NOTICE.md 与编辑器第三方声明。Design 采用混合条款，并非整体 MIT；上游声明中 Anthropic 来源材料的许可缺口仍未解决。

Verification archive / 验证归档: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.17/docs/releases/yourbuddy-v0.4.17
