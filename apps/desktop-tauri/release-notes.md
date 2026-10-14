# YourBuddy 0.4.10

Successfully prepared runtime downloads now have their consumed archive and resume sidecar removed on a best-effort basis. Failed installations keep their verified download for retry. This runs automatically in Bootstrap; Offline seeds and already-installed components are unchanged.

运行时组件成功准备后，会尽力删除本次消耗的下载归档及续传侧车文件。安装失败时保留已验证下载以供重试。Bootstrap 自动执行清理；Offline 种子与已安装组件保持不变。

For macOS Apple Silicon. Choose Bootstrap for a smaller installer or Offline with bundled runtime components; the app updater uses the complete Offline archive. Historical-cache cleanup, shared Store/incremental delivery and recovery of the reported 13 GB remain open in #57. The existing long-session benchmark exceeded its input-latency budget; its cause remains unresolved. Apple notarization, installed automatic upgrade and measured disk recovery are not claimed. See the archive for current verification and publication scope.

适用于 macOS Apple Silicon。Bootstrap 安装包更小，Offline 内置运行时组件；应用更新器使用完整 Offline 归档。历史缓存清理、共享 Store/增量交付及所报告 13 GB 的回收仍由 #57 跟进。现有长会话性能基准超过输入耗时预算，原因尚未解决。不声称已通过 Apple 公证、已安装应用的自动升级或实测磁盘回收；当前验证与发布范围见归档。

Verification archive: https://github.com/istarwyh/yourbuddy/tree/yourbuddy-v0.4.10/docs/releases/yourbuddy-v0.4.10
Evidence download: https://github.com/istarwyh/yourbuddy/archive/refs/tags/yourbuddy-v0.4.10.zip (docs/releases/yourbuddy-v0.4.10/ inside; native screenshots are retained by the release workflow).
