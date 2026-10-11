# YourBuddy 0.4.9

Startup now keeps download progress and errors visible, retries transient download failures, and resumes matching partial component downloads. If preparation or startup fails, use Retry startup to try the current release again, or Copy diagnostics to save the displayed details. A component set becomes active only after the Host is ready; interrupted installations are retried instead of being treated as complete.

启动页现在持续显示下载进度与错误，自动重试瞬时下载故障，并续传匹配的组件分片。准备或启动失败时，可用“重试启动”再次尝试当前版本，或用“复制诊断信息”保存显示的详情。组件仅在 Host 就绪后激活；中断的安装会重新准备，不再被误判为完成。

For macOS Apple Silicon. Choose the Bootstrap DMG for a smaller download or the Offline DMG with bundled runtime components; the app updater uses the complete Offline archive. Recovery targets the current release and does not provide older-version compatibility or Last Known Good fallback. Apple notarization is not claimed. Final candidate CI and published-package installation and update checks remain pending; see the verification archive for the evidence scope.

适用于 macOS Apple Silicon。Bootstrap DMG 下载更小，Offline DMG 内置运行时组件；应用更新器使用完整 Offline 归档。恢复流程只针对当前版本，不提供旧版本兼容或 Last Known Good 回退。不声称已通过 Apple 公证；最终候选 CI 和正式安装包的安装与更新检查待完成，证据范围见验证归档。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.9/docs/releases/yourbuddy-v0.4.9
