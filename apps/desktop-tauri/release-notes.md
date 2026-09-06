# YourBuddy 0.3.0

## English

- Renames the product to YourBuddy with a new Y8 icon, application ID, private data home, runtime resources, release artifacts, and signed update channel. Existing XiaoHui data is neither imported nor deleted.
- Adds a default **Codex** Agent Preset with the standard workbench tools plus one-shot Codex delegation, so a new installation has an immediately discoverable coding setup.
- Extends **Settings → General → Network proxy** with a `.pem` / `.crt` enterprise CA picker. The selected CA is applied before the private Node Host starts, while native HTTPS keeps the macOS trust store and full certificate verification.
- Separates desktop and current Node Host connection results and reports the active proxy mode, CA source, and sanitized TLS code. This makes stale-host settings and failures such as `UNABLE_TO_VERIFY_LEAF_SIGNATURE` actionable.
- Opens credential-free HTTP/HTTPS links from chat and Plugin Marketplace in the system browser, with a safe copy-link context action, while rejecting privileged and local protocols.
- Adds global restart and signed-update controls, keeps Marketplace installation state attached to the selected package, and bundles Harbor Evolution `0.9.2`, Codex Auth `0.3.2`, Better Sidebar `0.18.0`, Plugin Marketplace `0.3.1`, and Context Doctor `0.7.0` on DSH `0.1.2-rc.1`.

Install the Apple Silicon DMG from this release. This is a breaking product-identity transition: install YourBuddy beside XiaoHui, then configure credentials and settings again if needed. The application is not yet signed or notarized with an Apple Developer identity, and automatic migration from XiaoHui is not provided.

## 中文

- 产品正式更名为 YourBuddy，采用新的 Y8 图标、应用 ID、独立数据目录、运行时资源、发布产物和带签名的更新通道；既不会导入，也不会删除原有 XiaoHui 数据。
- 新增默认 **Codex** Agent 预设，在标准工作台能力之外直接提供一次性 Codex 委派，让新安装用户可以快速找到完整的编码工作方式。
- **设置 → 通用设置 → 网络代理**新增 `.pem` / `.crt` 企业 CA 选择器。选中的证书会在私有 Node Host 启动前注入，桌面原生 HTTPS 同时继续使用 macOS 系统信任库并保持完整证书校验。
- 桌面链路与当前 Node Host 链路会分别显示测试结果，并报告生效的代理模式、CA 来源和脱敏 TLS 错误码，使旧 Host 尚未重启以及 `UNABLE_TO_VERIFY_LEAF_SIGNATURE` 等问题可以被明确诊断。
- 聊天与插件市场中的无凭据 HTTP/HTTPS 链接会在系统浏览器中打开，并提供安全的复制链接上下文操作；特权协议与本地协议仍会被拒绝。
- 新增全局重启与签名更新控制，让插件市场安装状态与用户选择的 Package 保持关联；基于 DSH `0.1.2-rc.1` 内置 Harbor Evolution `0.9.2`、Codex Auth `0.3.2`、Better Sidebar `0.18.0`、Plugin Marketplace `0.3.1` 和 Context Doctor `0.7.0`。

请从本 Release 下载 Apple Silicon DMG。本次是破坏性的产品身份迁移：请将 YourBuddy 与 XiaoHui 分开安装，并按需重新配置凭据与设置。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，也不提供 XiaoHui 数据的自动迁移。
