# YourBuddy 0.3.6

## English

YourBuddy 0.3.6 makes enterprise proxy and custom CA settings consistent across the desktop application and every managed runtime it launches.

- On macOS, YourBuddy inherits `NODE_EXTRA_CA_CERTS` from its launch environment, including a value provided through `launchctl`, on the first launch. A CA selected in **Settings → Network proxy** takes precedence, and only that explicit selection is persisted.
- Custom CA files must be absolute, canonical `.pem` or `.crt` files containing currently valid X.509 certificates. Invalid, unreadable, not-yet-valid, and expired certificates are rejected with a specific error.
- **Test connection** and **Save and restart** now test both the native client and a fresh bundled Node process before settings are saved or the application restarts. A failure leaves the previous settings and running application unchanged.
- The selected proxy and CA are propagated to the Host, plugins, WSL, installers, provisioning, and updater after conflicting ambient proxy variables are removed. Diagnostics identify whether the CA came from Settings, the launch environment, or the system trust store; TLS verification remains enabled.
- Mixed `http://` and `https://` declarations for the same loopback proxy endpoint are normalized to HTTP CONNECT so local enterprise proxy helpers work consistently.
- The bundled product plugins are updated to Better Sidebar 0.18.1 and Harbor Evolution 0.9.5.

Install the Apple Silicon DMG from this release, or use **Settings → General → Application lifecycle → Check for updates** from an earlier YourBuddy installation. Existing YourBuddy data is retained and no migration is required. macOS 11 or later on Apple Silicon is supported. The application is not yet signed or notarized with an Apple Developer identity; first launch may require the documented macOS override.

## 中文

YourBuddy 0.3.6 让企业代理与自定义 CA 设置在桌面应用及其启动的所有托管运行时中保持一致。

- 在 macOS 上，YourBuddy 首次启动时会继承启动环境中的 `NODE_EXTRA_CA_CERTS`，包括通过 `launchctl` 设置的值。用户在**设置 → 网络代理**中选择的 CA 优先级更高，且只有该显式选择会写入持久化设置。
- 自定义 CA 必须是绝对、规范化路径下的 `.pem` 或 `.crt` 文件，并包含当前有效的 X.509 证书。无效、不可读、尚未生效或已经过期的证书会返回明确错误。
- **测试连接**和**保存并重启**会在写入设置或重启应用前，同时测试原生客户端与新启动的内置 Node 进程。任何一项失败都会保留原设置和当前运行状态。
- 选定的代理与 CA 会在清理冲突的环境代理变量后传递给 Host、插件、WSL、安装器、预配置流程和更新器。诊断信息会区分 CA 来自设置、启动环境还是系统信任库；TLS 验证始终保持启用。
- 同一回环代理端点上的 `http://` 与 `https://` 混合声明会统一为 HTTP CONNECT，让本地企业代理辅助程序保持一致行为。
- 内置产品插件更新为 Better Sidebar 0.18.1 与 Harbor Evolution 0.9.5。

请从本 Release 安装 Apple Silicon DMG，或在旧版 YourBuddy 中使用**设置 → 通用设置 → 应用生命周期 → 检查更新**。现有 YourBuddy 数据会保留，无需迁移。支持 Apple Silicon 上的 macOS 11 及以上版本。当前应用尚未使用 Apple Developer 身份完成代码签名与公证，首次启动可能需要按文档执行 macOS 放行操作。

## Verification / 验证资料

- [Tagged verification record / Tag 内验证记录](https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.3.6/docs/releases/yourbuddy-v0.3.6)
- The downloadable verification bundle is attached after public artifact verification. / 可下载验证资料包会在公开产物核验后附加。
